"""
The correct text-extraction primitive for exam PDFs.

Two defects in the previous implementation silently corrupted every Cambridge
paper the app ingested:

1. `page.extract_text()` was called with pdfplumber's defaults. Cambridge PDFs
   emit no space glyphs for some font runs, so bold/italic runs collapsed into
   "INFORMATIONANDCOMMUNICATIONTECHNOLOGY". The fix is an explicit
   `x_tolerance` low enough that pdfplumber infers a space from the inter-glyph
   gap. Measured on the 0417 corpus: 1.2 recovers spacing on every page.

2. 2024+ Cambridge papers interleave rotated margin text ("DO NOT WRITE IN THIS
   MARGIN", laid out bottom-to-top so it extracts reversed as "NIGRAM SIHT NI
   ETIRW TON OD") and `(cid:NNN)` barcode glyphs with the real question text.
   Dropping non-upright characters removes the former; a regex removes the
   latter.

Deliberately NOT done: filtering by x-position. An x-band filter clips the
question number at x~55 and the closing "]" of "[4]" at x~535, which are exactly
the two tokens the segmenter depends on.
"""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional

import pdfplumber

# Tuned against the 0417 corpus; see module docstring.
X_TOLERANCE = 1.2
Y_TOLERANCE = 2.0

CID_RE = re.compile(r"\(cid:\d+\)")

# Reversed fragments of "DO NOT WRITE IN THIS MARGIN" that survive when a page
# renders the margin text as upright glyphs in reverse order.
REVERSED_MARGIN_RE = re.compile(
    r"^\s*(NIGRAM|SIHT|ETIRW|TON|OD|NI|AERA|EDISTUO)\s*$"
)


def _upright_only(obj: Dict[str, Any]) -> bool:
    """Keep every non-char object; keep chars only when upright."""
    if obj.get("object_type") != "char":
        return True
    return bool(obj.get("upright", True))


def clean_text(text: Optional[str]) -> str:
    """Strip barcode CID artefacts and reversed margin furniture."""
    if not text:
        return ""
    text = CID_RE.sub("", text)
    lines = [ln for ln in text.split("\n") if not REVERSED_MARGIN_RE.match(ln)]
    # Collapse the runs of spaces left behind by removed glyphs, but preserve
    # line structure — the segmenter needs newlines.
    return "\n".join(re.sub(r"[ \t]{2,}", "  ", ln).rstrip() for ln in lines)


def page_text(page: "pdfplumber.page.Page", *, filter_upright: bool = True) -> str:
    """Extract one page's text with the corrected settings."""
    target = page.filter(_upright_only) if filter_upright else page
    try:
        raw = target.extract_text(x_tolerance=X_TOLERANCE, y_tolerance=Y_TOLERANCE)
    except Exception:
        # A malformed page should not abort the document.
        raw = page.extract_text() if page else ""
    return clean_text(raw)


def page_words(page: "pdfplumber.page.Page", *, filter_upright: bool = True) -> List[Dict[str, Any]]:
    """Words with geometry, used for anchor and mark-tag detection."""
    target = page.filter(_upright_only) if filter_upright else page
    words = target.extract_words(
        x_tolerance=X_TOLERANCE,
        y_tolerance=Y_TOLERANCE,
        keep_blank_chars=False,
        use_text_flow=False,
    )
    out: List[Dict[str, Any]] = []
    for w in words:
        text = CID_RE.sub("", w.get("text", ""))
        if not text.strip():
            continue
        out.append(
            {
                "text": text,
                "x0": round(float(w["x0"]), 2),
                "x1": round(float(w["x1"]), 2),
                "top": round(float(w["top"]), 2),
                "bottom": round(float(w["bottom"]), 2),
            }
        )
    return out


def group_words_into_lines(words: List[Dict[str, Any]], tolerance: float = 3.0) -> List[Dict[str, Any]]:
    """
    Cluster words into lines by vertical position.

    Line geometry is what replaces the old regex-over-a-flattened-blob approach:
    a question start is identified by its leading token AND its x0 falling in the
    profile's level-1 indent band, which is far more robust than pattern-matching
    a string that has had its newlines thrown away.
    """
    if not words:
        return []

    ordered = sorted(words, key=lambda w: (w["top"], w["x0"]))
    lines: List[List[Dict[str, Any]]] = []
    current: List[Dict[str, Any]] = [ordered[0]]

    for word in ordered[1:]:
        if abs(word["top"] - current[0]["top"]) <= tolerance:
            current.append(word)
        else:
            lines.append(current)
            current = [word]
    lines.append(current)

    result: List[Dict[str, Any]] = []
    for group in lines:
        group.sort(key=lambda w: w["x0"])
        text = clean_text(" ".join(w["text"] for w in group)).strip()
        if not text:
            continue
        result.append(
            {
                "text": text,
                "x0": round(min(w["x0"] for w in group), 2),
                "x1": round(max(w["x1"] for w in group), 2),
                "top": round(min(w["top"] for w in group), 2),
                "bottom": round(max(w["bottom"] for w in group), 2),
                "words": group,
            }
        )
    return result


def collapse_empty_columns(rows: List[List[Optional[str]]]) -> List[List[str]]:
    """
    Cambridge mark-scheme tables carry empty spacer columns, e.g.
    ['1', '', '', 'B Format check', '', '', '1', '', ''] with a header row of
    ['', 'Question', '', '', 'Answer', '', '', 'Marks', ''].

    Removing the columns that are empty in EVERY row cuts the noise roughly in
    half. It does not align the header with its data: note above that the label
    "Question" sits one column right of the value "1". Callers must therefore
    read data rows positionally — first non-empty cell is the question id, last
    bare-integer cell is the mark count, everything between is the answer — and
    never by looking up a header's column index.
    """
    if not rows:
        return []

    width = max(len(r) for r in rows)
    padded = [list(r) + [None] * (width - len(r)) for r in rows]

    keep = [
        idx
        for idx in range(width)
        if any((row[idx] or "").strip() for row in padded)
    ]
    return [[(row[idx] or "").strip() for idx in keep] for row in padded]


def extract_tables(page: "pdfplumber.page.Page") -> List[Dict[str, Any]]:
    """Tables with spacer columns collapsed and geometry attached."""
    out: List[Dict[str, Any]] = []
    try:
        found = page.find_tables()
    except Exception:
        return out

    for table in found:
        try:
            rows = table.extract()
        except Exception:
            continue
        cleaned = collapse_empty_columns(
            [[clean_text(cell) if cell else "" for cell in row] for row in rows]
        )
        if not cleaned or not any(any(c for c in row) for row in cleaned):
            continue
        bbox = table.bbox
        out.append(
            {
                "bbox": [round(float(v), 2) for v in bbox],
                "rows": cleaned,
            }
        )
    return out


def document_header_text(pdf: "pdfplumber.PDF", pages: int = 2) -> str:
    """First page or two, for board detection and the metadata header probe."""
    chunks = []
    for i in range(min(pages, len(pdf.pages))):
        chunks.append(page_text(pdf.pages[i]))
    return "\n".join(chunks)
