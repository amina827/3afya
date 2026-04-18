"""Generate a printable ArUco marker (DICT_4X4_50, id=0) as PNG."""
import cv2

MARKER_ID = 0
MARKER_PIXELS = 800  # resolution of the PNG

aruco_dict = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)
img = cv2.aruco.generateImageMarker(aruco_dict, MARKER_ID, MARKER_PIXELS)
cv2.imwrite("aruco_marker_id0.png", img)
print("Saved aruco_marker_id0.png — print at a known physical size, e.g. 50 mm.")
