"""
Deterministic figure detection and cropping.

No vision model is involved in deciding WHERE a figure is: the PDF already
carries exact image bounding boxes and vector drawing rects, and the caption
("Fig. 12.1") sits in a text block immediately below.

The subtle part is telling a diagram from a table. Cambridge tick-grid questions
("Tick whether the following statements refer to Backing storage, RAM or ROM")
are drawn as ~25 vector rects with no raster image at all. Cropping one to PNG
would destroy content that should be rendered as a real HTML table, so grid-like
clusters are classified as tables and handed back separately.
"""

from __future__ import annotations

import base64
import re
from typing import Any, Dict, List, Optional, Tuple

import fitz  # PyMuPDF

Rect = Tuple[float, float, float, float]

# Crop padding, PDF points.
CROP_PADDING = 6.0
# 2x scale ~= 144 DPI; legible without bloating storage.
RENDER_SCALE = 2.0

# Vector clusters need a high bar because page furniture (rules, borders, boxes)
# is drawn with vectors. Embedded RASTER images are almost always real content
# in an exam paper, so they get a much lower bar -- a 94x94pt barcode image is
# only 1.8% of an A4 page but is the entire subject of its question.
MIN_AREA_FRACTION = 0.02
MIN_RASTER_AREA_FRACTION = 0.003
# Absolute floor in points, to keep bullets, ticks and logos out.
MIN_RASTER_SIDE = 28.0
# Larger than this and it is a full-page scan or a background, not a figure.
MAX_AREA_FRACTION = 0.85

HEADER_BAND = 60.0
FOOTER_BAND = 60.0

# A diagram is never a wide flat band. Cover-page rules, title underlines and
# barcode boxes clear the area threshold but have extreme aspect ratios.
MAX_ASPECT_RATIO = 8.0
MIN_FIGURE_HEIGHT = 25.0

DEFAULT_CAPTION_RE = re.compile(r"\b(Fig|Figure|Table|Diagram|Graph)\.?\s*\d+(\.\d+)?\b", re.I)
CAPTION_SEARCH_DISTANCE = 40.0


def _area(r: Rect) -> float:
    return max(0.0, r[2] - r[0]) * max(0.0, r[3] - r[1])


def _union(a: Rect, b: Rect) -> Rect:
    return (min(a[0], b[0]), min(a[1], b[1]), max(a[2], b[2]), max(a[3], b[3]))


def _overlaps(a: Rect, b: Rect, slack: float = 6.0) -> bool:
    return not (
        a[2] + slack < b[0]
        or b[2] + slack < a[0]
        or a[3] + slack < b[1]
        or b[3] + slack < a[1]
    )


def _dedupe(rects: List[Rect], tolerance: float = 1.0) -> List[Rect]:
    """`get_image_rects()` returns the same rect once per xref reference."""
    out: List[Rect] = []
    for r in rects:
        if not any(all(abs(r[i] - s[i]) <= tolerance for i in range(4)) for s in out):
            out.append(r)
    return out


def raster_candidates(page: "fitz.Page") -> List[Rect]:
    page_area = _area((0, 0, page.rect.width, page.rect.height)) or 1.0
    found: List[Rect] = []

    for info in page.get_images(full=True):
        xref = info[0]
        try:
            rects = page.get_image_rects(xref)
        except Exception:
            continue
        for r in rects:
            rect: Rect = (r.x0, r.y0, r.x1, r.y1)
            frac = _area(rect) / page_area
            if frac < MIN_RASTER_AREA_FRACTION or frac > MAX_AREA_FRACTION:
                continue
            if (rect[2] - rect[0]) < MIN_RASTER_SIDE or (rect[3] - rect[1]) < MIN_RASTER_SIDE:
                continue
            if rect[3] < HEADER_BAND or rect[1] > page.rect.height - FOOTER_BAND:
                continue
            if _is_banner(rect, page.rect.width, page.rect.height):
                continue
            found.append(rect)

    return _dedupe(found)


def _looks_like_grid(rects: List[Rect]) -> bool:
    """
    Reject table-shaped vector clusters.

    Two independent signals, either of which is enough:
      * three or more rects share both x0 and x1 and have equal heights
        (identical stacked cells - a column of table rows), or
      * two or more distinct x0 values each repeat three or more times
        (a genuine column grid).
    """
    if len(rects) < 3:
        return False

    def key(v: float) -> int:
        return int(round(v))

    shape_counts: Dict[Tuple[int, int, int], int] = {}
    x0_counts: Dict[int, int] = {}

    for r in rects:
        height = key(r[3] - r[1])
        shape_counts[(key(r[0]), key(r[2]), height)] = (
            shape_counts.get((key(r[0]), key(r[2]), height), 0) + 1
        )
        x0_counts[key(r[0])] = x0_counts.get(key(r[0]), 0) + 1

    if any(count >= 3 for count in shape_counts.values()):
        return True

    repeated_columns = sum(1 for count in x0_counts.values() if count >= 3)
    return repeated_columns >= 2


def _is_banner(r: Rect, page_width: float = 0.0, page_height: float = 0.0) -> bool:
    """
    Page decoration rather than content.

    Catches both orientations: wide flat rules and title underlines, and the
    tall thin margin strips on 2024+ Cambridge papers (a ~21x865pt band running
    the full page height at the left or right edge, which is the "DO NOT WRITE
    IN THIS MARGIN" decoration).
    """
    width, height = r[2] - r[0], r[3] - r[1]
    if width <= 0 or height <= 0:
        return True
    if height < MIN_FIGURE_HEIGHT:
        return True
    if max(width, height) / min(width, height) > MAX_ASPECT_RATIO:
        return True
    # Spans essentially the whole page in one axis: a border, not a figure.
    if page_height and height >= page_height * 0.9:
        return True
    if page_width and width >= page_width * 0.95:
        return True
    return False


def _is_tick_box(r: Rect) -> bool:
    w, h = r[2] - r[0], r[3] - r[1]
    return 10.0 <= w <= 16.0 and 10.0 <= h <= 16.0 and abs(w - h) <= 3.0


def vector_clusters(page: "fitz.Page") -> Tuple[List[Rect], List[Rect]]:
    """Returns (figure_clusters, table_clusters)."""
    page_area = _area((0, 0, page.rect.width, page.rect.height)) or 1.0

    raw: List[Rect] = []
    for drawing in page.get_drawings():
        r = drawing.get("rect")
        if r is None:
            continue
        rect: Rect = (r.x0, r.y0, r.x1, r.y1)
        # Answer lines and rules: long and flat.
        if rect[3] - rect[1] < 3.0:
            continue
        if _is_tick_box(rect):
            continue
        raw.append(rect)

    if not raw:
        return [], []

    # Union overlapping / near-touching rects into clusters, tracking members so
    # the grid test can inspect the original shapes.
    clusters: List[Dict[str, Any]] = []
    for rect in raw:
        merged = False
        for cluster in clusters:
            if _overlaps(cluster["bbox"], rect):
                cluster["bbox"] = _union(cluster["bbox"], rect)
                cluster["members"].append(rect)
                merged = True
                break
        if not merged:
            clusters.append({"bbox": rect, "members": [rect]})

    # A second pass merges clusters that only became adjacent after growing.
    changed = True
    while changed:
        changed = False
        for i in range(len(clusters)):
            for j in range(i + 1, len(clusters)):
                if _overlaps(clusters[i]["bbox"], clusters[j]["bbox"]):
                    clusters[i]["bbox"] = _union(clusters[i]["bbox"], clusters[j]["bbox"])
                    clusters[i]["members"].extend(clusters[j]["members"])
                    del clusters[j]
                    changed = True
                    break
            if changed:
                break

    figures: List[Rect] = []
    tables: List[Rect] = []
    for cluster in clusters:
        bbox = cluster["bbox"]
        frac = _area(bbox) / page_area
        if frac < MIN_AREA_FRACTION or frac > MAX_AREA_FRACTION:
            continue
        if bbox[3] < HEADER_BAND or bbox[1] > page.rect.height - FOOTER_BAND:
            continue
        if _looks_like_grid(cluster["members"]):
            tables.append(bbox)
        elif _is_banner(bbox, page.rect.width, page.rect.height):
            continue
        else:
            figures.append(bbox)

    return figures, tables


def find_caption(
    page: "fitz.Page", bbox: Rect, caption_re: Optional[Any] = None
) -> Optional[Dict[str, Any]]:
    """Nearest caption text block below the cluster, within CAPTION_SEARCH_DISTANCE."""
    pattern = caption_re or DEFAULT_CAPTION_RE
    best: Optional[Dict[str, Any]] = None

    for block in page.get_text("blocks"):
        x0, y0, x1, y1, text = block[0], block[1], block[2], block[3], block[4]
        label = (text or "").strip()
        if not label or not pattern.search(label):
            continue
        # Must sit below the figure and horizontally overlap it.
        gap = y0 - bbox[3]
        if gap < -4.0 or gap > CAPTION_SEARCH_DISTANCE:
            continue
        if x1 < bbox[0] - 20 or x0 > bbox[2] + 20:
            continue
        if best is None or gap < best["gap"]:
            best = {"gap": gap, "bbox": (x0, y0, x1, y1), "label": label.split("\n")[0].strip()}

    return best


def crop_png(page: "fitz.Page", bbox: Rect, scale: float = RENDER_SCALE) -> str:
    clip = fitz.Rect(
        max(0.0, bbox[0] - CROP_PADDING),
        max(0.0, bbox[1] - CROP_PADDING),
        min(page.rect.width, bbox[2] + CROP_PADDING),
        min(page.rect.height, bbox[3] + CROP_PADDING),
    )
    pix = page.get_pixmap(clip=clip, matrix=fitz.Matrix(scale, scale))
    return base64.b64encode(pix.tobytes("png")).decode("ascii")


def extract_page_figures(
    page: "fitz.Page",
    *,
    render: bool = True,
    caption_pattern: Optional[str] = None,
) -> Dict[str, List[Dict[str, Any]]]:
    """Detect figures and table regions on one page; optionally render crops."""
    caption_re = re.compile(caption_pattern, re.I) if caption_pattern else DEFAULT_CAPTION_RE

    rasters = raster_candidates(page)
    vec_figures, vec_tables = vector_clusters(page)

    # Merge a vector cluster into an overlapping raster (annotated photographs).
    merged: List[Dict[str, Any]] = [{"bbox": r, "kind": "raster"} for r in rasters]
    for vf in vec_figures:
        hit = next((m for m in merged if _overlaps(m["bbox"], vf)), None)
        if hit:
            hit["bbox"] = _union(hit["bbox"], vf)
            hit["kind"] = "merged"
        else:
            merged.append({"bbox": vf, "kind": "vector"})

    figures: List[Dict[str, Any]] = []
    for item in merged:
        bbox = item["bbox"]
        caption = find_caption(page, bbox, caption_re)
        if caption:
            bbox = _union(bbox, caption["bbox"])

        entry: Dict[str, Any] = {
            "bbox": [round(v, 2) for v in bbox],
            "kind": item["kind"],
            "label": caption["label"] if caption else None,
        }
        if render:
            try:
                entry["png"] = crop_png(page, bbox)
            except Exception as exc:  # pragma: no cover - render failures are non-fatal
                entry["error"] = str(exc)
        figures.append(entry)

    figures.sort(key=lambda f: (f["bbox"][1], f["bbox"][0]))

    return {
        "figures": figures,
        "tables": [{"bbox": [round(v, 2) for v in t], "kind": "vector"} for t in vec_tables],
    }


def extract_document_figures(
    pdf_bytes: bytes, *, render: bool = True, caption_pattern: Optional[str] = None
) -> List[Dict[str, Any]]:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        pages: List[Dict[str, Any]] = []
        for index, page in enumerate(doc):
            result = extract_page_figures(page, render=render, caption_pattern=caption_pattern)
            pages.append(
                {
                    "index": index,
                    "figures": result["figures"],
                    "tableRegions": result["tables"],
                }
            )
        return pages
    finally:
        doc.close()
