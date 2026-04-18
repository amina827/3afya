"""
Bottle Profile Extraction Pipeline
===================================

Converts a photo of the Afia 1.5 L bottle into a Width(y) function in
millimetres, then validates it against the engineering drawing.

Core idea
---------
Don't "understand" the image. Reduce the bottle to a mathematical function:

    y (mm)  ->  width (mm)

Steps
-----
1. ArUco marker detection          -> pixels-per-mm calibration
2. Bottle silhouette extraction    -> contour + binary mask
3. Left / right edge sampling      -> width per scanline
4. Handle removal                  -> left-half mirroring (symmetric envelope)
5. Output                          -> CSV, plot, validation report

Usage
-----
    python bottle_profile.py --image bottle.jpg --marker-size 50
    python bottle_profile.py --image bottle.jpg --marker-size 50 --show

Drawing nominal values (Afia 1500 cc, SIPA, 38 mm neck)
--------------------------------------------------------
    Total height          : 301   mm  (+- 1.2)
    Neck OD               :  37.3 mm  (+- 0.5)
    Shoulder width        :  52.5 mm
    Max body width        :  78.1 mm
    Base skirt height     :  16   mm
"""

from __future__ import annotations

import argparse
import csv
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional, Tuple

import cv2
import numpy as np


# ---------------------------------------------------------------------------
# Nominal dimensions from the engineering drawing (SIPA Afia 1500 cc)
# All values in millimetres, measured from the bottle BASE (y = 0) upward.
# ---------------------------------------------------------------------------
NOMINAL = {
    "total_height_mm":     (301.0, 1.2),   # (value, tolerance)
    "neck_od_mm":          (37.3,  0.5),
    "shoulder_width_mm":   (52.5,  1.0),
    "max_body_width_mm":   (78.1,  1.0),
    "base_skirt_height_mm": (16.0, 0.5),
}

# Heights (from base) at which to sample the profile for validation
SAMPLE_HEIGHTS_MM = {
    "base":      5.0,
    "mid_body":  100.0,
    "shoulder":  275.0,
    "neck":      295.0,
}


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------
@dataclass
class Calibration:
    mm_per_pixel: float
    marker_center_px: Tuple[int, int]

    def px_to_mm(self, px: float) -> float:
        return px * self.mm_per_pixel


@dataclass
class Profile:
    y_mm: np.ndarray          # height from base, mm
    width_mm: np.ndarray      # bottle width at that height, mm
    left_edge_px: np.ndarray  # for debug overlay
    right_edge_px: np.ndarray
    bbox_px: Tuple[int, int, int, int]  # x, y, w, h


# ---------------------------------------------------------------------------
# 1. Calibration via ArUco marker
# ---------------------------------------------------------------------------
def calibrate_with_aruco(img: np.ndarray, marker_size_mm: float) -> Calibration:
    """Detect a single ArUco marker and compute mm-per-pixel ratio."""
    if not hasattr(cv2, "aruco"):
        raise RuntimeError(
            "cv2.aruco is missing. Install opencv-contrib-python "
            "(NOT plain opencv-python)."
        )

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    aruco_dict = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)

    # API changed between OpenCV 4.6 and 4.7+ — support both.
    if hasattr(cv2.aruco, "ArucoDetector"):
        detector = cv2.aruco.ArucoDetector(aruco_dict, cv2.aruco.DetectorParameters())
        corners, ids, _ = detector.detectMarkers(gray)
    else:
        corners, ids, _ = cv2.aruco.detectMarkers(
            gray, aruco_dict, parameters=cv2.aruco.DetectorParameters_create()
        )

    if ids is None or len(corners) == 0:
        raise RuntimeError(
            "No ArUco marker detected. Print a DICT_4X4_50 marker and place "
            "it flat next to the bottle, fully visible in frame."
        )

    pts = corners[0][0]  # 4 x 2
    side_px = float(np.mean([
        np.linalg.norm(pts[0] - pts[1]),
        np.linalg.norm(pts[1] - pts[2]),
        np.linalg.norm(pts[2] - pts[3]),
        np.linalg.norm(pts[3] - pts[0]),
    ]))
    if side_px < 10:
        raise RuntimeError("Marker detected but too small. Move camera closer.")

    center = pts.mean(axis=0)
    return Calibration(
        mm_per_pixel=marker_size_mm / side_px,
        marker_center_px=(int(center[0]), int(center[1])),
    )


# ---------------------------------------------------------------------------
# 2. Silhouette extraction
# ---------------------------------------------------------------------------
def extract_bottle_contour(
    img: np.ndarray,
    exclude_point: Optional[Tuple[int, int]] = None,
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Return the bottle contour and a filled binary mask.

    Strategy:
      1. CLAHE + bilateral filter
      2. Otsu threshold -> initial mask
      3. Morphological close to fill gaps
      4. Pick largest connected component (optionally excluding the ArUco)
    """
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(gray)
    gray = cv2.bilateralFilter(gray, 9, 75, 75)

    # Assume bottle is darker than background (backlit / light backdrop).
    # THRESH_BINARY_INV + Otsu gives foreground = bottle.
    _, mask = cv2.threshold(
        gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU
    )

    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=2)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=1)

    # Connected components — pick the largest one that is not the ArUco marker.
    n, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    if n <= 1:
        raise RuntimeError("No foreground found. Check lighting / background.")

    candidates = []
    for i in range(1, n):
        x, y, w, h, area = stats[i]
        if exclude_point is not None:
            ex, ey = exclude_point
            if x <= ex <= x + w and y <= ey <= y + h:
                continue  # skip the ArUco component
        candidates.append((area, i, (x, y, w, h)))

    if not candidates:
        raise RuntimeError("Only the ArUco marker was found — no bottle.")
    candidates.sort(reverse=True)
    _, best_label, _ = candidates[0]

    bottle_mask = np.where(labels == best_label, 255, 0).astype(np.uint8)

    contours, _ = cv2.findContours(
        bottle_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE
    )
    contour = max(contours, key=cv2.contourArea)
    return contour, bottle_mask


# ---------------------------------------------------------------------------
# 3. Width(y) sampling  +  handle rejection
# ---------------------------------------------------------------------------
def compute_width_profile(
    mask: np.ndarray,
    calib: Calibration,
    reject_handle: bool = True,
) -> Profile:
    """
    For every image row containing the bottle, find the left and right edges.
    The handle sits on the RIGHT side of the bottle in the drawing, so we
    measure the LEFT half (from the central axis) and mirror it, producing
    the symmetric body envelope only.
    """
    ys, xs = np.where(mask > 0)
    if ys.size == 0:
        raise RuntimeError("Empty bottle mask.")

    y0, y1 = int(ys.min()), int(ys.max())
    x0, x1 = int(xs.min()), int(xs.max())
    bbox = (x0, y0, x1 - x0, y1 - y0)

    # Axis of symmetry — leftmost edge is reliable (handle protrudes right).
    # Use the left edge's x-position over the upper 40% of the bottle (away
    # from the handle and the base wobble) to locate the axis.
    upper_band = mask[y0 : y0 + int(0.4 * (y1 - y0)), :]
    upper_lefts = []
    for row in upper_band:
        col = np.where(row > 0)[0]
        if col.size:
            upper_lefts.append(col[0])
    if not upper_lefts:
        raise RuntimeError("Could not locate bottle axis.")
    left_ref_px = int(np.median(upper_lefts))

    # Axis is half the neck width to the right of the left edge.
    # (For neck rows, left and right edges are close -> half-width is small.)
    neck_row = mask[y0 + 2, :]
    neck_xs = np.where(neck_row > 0)[0]
    if neck_xs.size < 2:
        # Fallback: use top 5 rows average
        top_rows = mask[y0 : y0 + 5, :]
        neck_xs = np.where(top_rows > 0)[1]
    axis_px = int((neck_xs.min() + neck_xs.max()) / 2)

    rows = np.arange(y0, y1 + 1)
    left_edges = np.full(rows.size, np.nan)
    right_edges = np.full(rows.size, np.nan)

    for i, r in enumerate(rows):
        col = np.where(mask[r, :] > 0)[0]
        if col.size < 2:
            continue
        left_edges[i] = col[0]
        right_edges[i] = col[-1]

    if reject_handle:
        # Use LEFT edge (handle-free) and mirror across the axis.
        half_width_px = axis_px - left_edges
        width_px = 2.0 * half_width_px
    else:
        width_px = right_edges - left_edges

    # Drop NaNs
    valid = ~np.isnan(width_px)
    rows = rows[valid]
    width_px = width_px[valid]
    left_edges = left_edges[valid]
    right_edges = right_edges[valid]

    # Convert: image y grows DOWN, but we want y = 0 at the BASE.
    base_row = rows.max()
    y_mm = (base_row - rows) * calib.mm_per_pixel
    width_mm = width_px * calib.mm_per_pixel

    # Sort by height ascending (base -> top)
    order = np.argsort(y_mm)
    return Profile(
        y_mm=y_mm[order],
        width_mm=width_mm[order],
        left_edge_px=left_edges[order],
        right_edge_px=right_edges[order],
        bbox_px=bbox,
    )


# ---------------------------------------------------------------------------
# 4. Validation against the drawing
# ---------------------------------------------------------------------------
def sample_width_at(profile: Profile, y_mm: float) -> float:
    """Linear interpolation of width at a given height."""
    return float(np.interp(y_mm, profile.y_mm, profile.width_mm))


def validate(profile: Profile) -> List[Tuple[str, float, float, float, bool]]:
    """
    Returns rows: (label, measured, nominal, tolerance, pass?)
    """
    measured_height = float(profile.y_mm.max() - profile.y_mm.min())
    results = [
        ("total_height_mm", measured_height,
         *NOMINAL["total_height_mm"],
         abs(measured_height - NOMINAL["total_height_mm"][0]) <= NOMINAL["total_height_mm"][1]),
    ]

    checks = [
        ("max_body_width_mm",  SAMPLE_HEIGHTS_MM["mid_body"]),
        ("shoulder_width_mm",  SAMPLE_HEIGHTS_MM["shoulder"]),
        ("neck_od_mm",         SAMPLE_HEIGHTS_MM["neck"]),
    ]
    for key, h in checks:
        measured = sample_width_at(profile, h)
        nominal, tol = NOMINAL[key]
        results.append((key, measured, nominal, tol, abs(measured - nominal) <= tol))
    return results


def print_report(results) -> None:
    print("\n" + "=" * 72)
    print(f"{'Metric':<24}{'Measured':>12}{'Nominal':>12}{'Tol':>8}{'Status':>12}")
    print("-" * 72)
    for label, measured, nominal, tol, ok in results:
        status = "PASS" if ok else "FAIL"
        print(f"{label:<24}{measured:>12.2f}{nominal:>12.2f}{tol:>8.2f}{status:>12}")
    print("=" * 72)


# ---------------------------------------------------------------------------
# 5. I/O helpers
# ---------------------------------------------------------------------------
def save_csv(profile: Profile, path: Path) -> None:
    with path.open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["y_mm", "width_mm"])
        for y, width in zip(profile.y_mm, profile.width_mm):
            w.writerow([f"{y:.3f}", f"{width:.3f}"])


def render_overlay(
    img: np.ndarray,
    profile: Profile,
    calib: Calibration,
    out_path: Path,
) -> None:
    overlay = img.copy()

    # Draw calibration marker centre
    cx, cy = calib.marker_center_px
    cv2.circle(overlay, (cx, cy), 8, (0, 255, 255), 2)
    cv2.putText(
        overlay, f"{calib.mm_per_pixel:.4f} mm/px",
        (cx + 15, cy), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2,
    )

    # Draw left / right edges (sampled every 10 rows)
    for i in range(0, len(profile.left_edge_px), 10):
        lx = int(profile.left_edge_px[i])
        rx = int(profile.right_edge_px[i])
        # image row: base_row - y_mm/mm_per_px
        y_mm = profile.y_mm[i]
        base_row = profile.bbox_px[1] + profile.bbox_px[3]
        row = int(base_row - y_mm / calib.mm_per_pixel)
        cv2.circle(overlay, (lx, row), 2, (0, 255, 0), -1)   # left: green
        cv2.circle(overlay, (rx, row), 2, (0, 0, 255), -1)   # right: red

    # Label sampled heights
    for name, h in SAMPLE_HEIGHTS_MM.items():
        w_mm = sample_width_at(profile, h)
        base_row = profile.bbox_px[1] + profile.bbox_px[3]
        row = int(base_row - h / calib.mm_per_pixel)
        x_center = profile.bbox_px[0] + profile.bbox_px[2] // 2
        cv2.line(overlay,
                 (profile.bbox_px[0], row),
                 (profile.bbox_px[0] + profile.bbox_px[2], row),
                 (255, 200, 0), 1)
        cv2.putText(
            overlay, f"{name}: y={h:.0f} w={w_mm:.1f}mm",
            (x_center + 10, row - 4),
            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 200, 0), 1,
        )

    cv2.imwrite(str(out_path), overlay)


def maybe_plot(profile: Profile, path: Path) -> None:
    try:
        import matplotlib.pyplot as plt
    except ImportError:
        return
    fig, ax = plt.subplots(figsize=(5, 8))
    ax.plot(profile.width_mm, profile.y_mm, "b-", linewidth=1.5)
    ax.set_xlabel("Width (mm)")
    ax.set_ylabel("Height from base (mm)")
    ax.set_title("Bottle Width Profile")
    ax.grid(True, alpha=0.3)
    ax.axhline(SAMPLE_HEIGHTS_MM["mid_body"], color="gray", linestyle="--", alpha=0.4)
    ax.axhline(SAMPLE_HEIGHTS_MM["shoulder"], color="gray", linestyle="--", alpha=0.4)
    ax.axhline(SAMPLE_HEIGHTS_MM["neck"], color="gray", linestyle="--", alpha=0.4)
    fig.tight_layout()
    fig.savefig(path, dpi=120)
    plt.close(fig)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
def run(args: argparse.Namespace) -> int:
    img = cv2.imread(args.image)
    if img is None:
        print(f"ERROR: cannot read image {args.image}", file=sys.stderr)
        return 2

    calib = calibrate_with_aruco(img, args.marker_size)
    print(f"[calib] {calib.mm_per_pixel:.5f} mm/px "
          f"(marker {args.marker_size} mm at {calib.marker_center_px})")

    contour, mask = extract_bottle_contour(img, exclude_point=calib.marker_center_px)
    print(f"[mask ] bottle area = {int(cv2.contourArea(contour))} px^2")

    profile = compute_width_profile(mask, calib, reject_handle=not args.keep_handle)
    print(f"[prof ] {len(profile.y_mm)} scanlines, "
          f"height = {profile.y_mm.max() - profile.y_mm.min():.2f} mm")

    results = validate(profile)
    print_report(results)

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    save_csv(profile, out_dir / "profile.csv")
    render_overlay(img, profile, calib, out_dir / "overlay.png")
    maybe_plot(profile, out_dir / "profile.png")
    print(f"[out  ] wrote {out_dir}/profile.csv, overlay.png, profile.png")

    if args.show:
        cv2.imshow("overlay", cv2.imread(str(out_dir / "overlay.png")))
        cv2.waitKey(0)
        cv2.destroyAllWindows()

    all_pass = all(row[4] for row in results)
    return 0 if all_pass else 1


def main() -> int:
    p = argparse.ArgumentParser(description="Bottle Width(y) extractor")
    p.add_argument("--image", required=True, help="Path to bottle photo")
    p.add_argument("--marker-size", type=float, required=True,
                   help="Physical size of the ArUco marker in mm (side length)")
    p.add_argument("--out-dir", default="out", help="Output directory")
    p.add_argument("--keep-handle", action="store_true",
                   help="Do not mirror left edge — include the handle side")
    p.add_argument("--show", action="store_true", help="Display overlay window")
    return run(p.parse_args())


if __name__ == "__main__":
    sys.exit(main())
