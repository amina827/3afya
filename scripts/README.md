# Bottle Profile Pipeline

Turns a photo of the Afia 1.5 L bottle into a `Width(y)` function in millimetres and compares it to the engineering drawing (SIPA, 38 mm neck, 301 mm total, 1500 cc).

## 1. Install

```bash
pip install -r requirements.txt
```

> Must be `opencv-contrib-python` (includes `cv2.aruco`), **not** plain `opencv-python`.

## 2. Make a calibration marker

```bash
python generate_marker.py
```

Print `aruco_marker_id0.png` at a **known physical size**, e.g. exactly 50 mm × 50 mm. Measure the printed side with calipers — that number is what you pass to `--marker-size`.

## 3. Capture the photo

- Place the bottle on a flat surface against a **plain, contrasting background** (white paper works).
- Stick the marker flat on the same surface, next to the bottle, fully visible.
- Camera perpendicular to the bottle, ~1–1.5 m away, long focal length if possible (reduces perspective).
- Diffuse light, no specular highlights.
- Handle must be on the **right side** of the frame (or pass `--keep-handle` and accept the error).

## 4. Run

```bash
python bottle_profile.py --image bottle.jpg --marker-size 50
```

Output in `out/`:
- `profile.csv` — two columns: `y_mm, width_mm` (y = 0 at base, growing upward)
- `overlay.png` — original photo with left/right edges, marker and validation lines drawn
- `profile.png` — matplotlib plot of Width(y)

Console prints a validation table vs the drawing:

```
Metric                 Measured     Nominal     Tol      Status
total_height_mm          301.15      301.00     1.20       PASS
max_body_width_mm         77.82       78.10     1.00       PASS
shoulder_width_mm         52.31       52.50     1.00       PASS
neck_od_mm                37.08       37.30     0.50       PASS
```

Exit code `0` = all passed, `1` = at least one fail.

## 5. Flags

| Flag | Meaning |
|------|---------|
| `--image PATH` | input photo (required) |
| `--marker-size MM` | printed side length of the ArUco marker in mm (required) |
| `--out-dir DIR` | output directory, default `out/` |
| `--keep-handle` | don't mirror left edge — width includes the handle (debug only) |
| `--show` | display the overlay window |

## 6. Why the detection was wrong before

1. **No pixel→mm calibration.** Without a marker in frame, every measurement is guessed scale.
2. **Handle on the right** was inflating width. This script measures the left edge and mirrors it.
3. **Single-view perspective.** This script fixes scale but not perspective — for full 360° shape use 12 views (every 30°) + visual-hull / ICP.

## 7. Next step: 360° reconstruction

Capture 12 views on a turntable, run this script on each view, then fuse the silhouettes into a visual hull and register to the CAD model via ICP. Exclude the handle region from ICP — fit it as a separate feature.
