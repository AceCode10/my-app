"""
The v2 document extractor: PDF bytes in, one canonical ParsedDocument out.

This is the only place in the system that touches PDF bytes. Everything
downstream — segmentation, classification, validation, persistence — works from
this JSON envelope, which keeps the TypeScript side free of PDF concerns and
makes every later stage unit-testable against a fixture.
"""

from __future__ import annotations

import io
import re
from typing import Any, Dict, List, Optional

import pdfplumber

from figure_extractor import extract_page_figures
from text_layer import (
    extract_tables,
    group_words_into_lines,
    page_text,
    page_words,
)

# Mark tags in every convention we support: [4], (4), (4 marks), (2 points).
MARK_TAG_RES = [
    re.compile(r"^\[(\d{1,2})\]$"),
    re.compile(r"^\((\d{1,2})\)$"),
]
MARK_PHRASE_RE = re.compile(r"\((\d{1,2})\s*(?:marks?|points?)\)", re.I)

QUESTION_TOKEN_RE = re.compile(r"^(\d{1,2})\.?$")
PART_TOKEN_RE = re.compile(r"^\(([a-z])\)$", re.I)
SUBPART_TOKEN_RE = re.compile(r"^\(([ivxlcdm]+)\)$", re.I)


def _detect_mark_tags(page_index: int, words: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Locate every mark tag with its geometry.

    Verified on the 0417 corpus: the sum of these tags equals the paper's own
    stated total on 37 of 37 question papers.
    """
    tags: List[Dict[str, Any]] = []
    for word in words:
        text = word["text"].strip()
        for pattern in MARK_TAG_RES:
            match = pattern.match(text)
            if match:
                tags.append(
                    {
                        "marks": int(match.group(1)),
                        "page": page_index,
                        "bbox": [word["x0"], word["top"], word["x1"], word["bottom"]],
                    }
                )
                break
    return tags


def _detect_anchors(
    page_index: int, lines: List[Dict[str, Any]], bands: Optional[Dict[str, List[float]]]
) -> List[Dict[str, Any]]:
    """
    Question / part / sub-part starts, identified by the FIRST token of a line
    plus that line's left edge.

    Geometry is used to assign a hierarchy level, never to discard content: the
    question number at x~55 and the closing "]" of "[4]" at x~535 both survive.
    """
    anchors: List[Dict[str, Any]] = []

    def in_band(x: float, band: Optional[List[float]]) -> bool:
        if not band:
            return True
        return band[0] <= x <= band[1]

    q_band = (bands or {}).get("question")
    p_band = (bands or {}).get("part")
    s_band = (bands or {}).get("subpart")

    for line in lines:
        words = line.get("words") or []
        if not words:
            continue
        first = words[0]["text"].strip()
        x0 = words[0]["x0"]

        kind: Optional[str] = None
        text = first

        if QUESTION_TOKEN_RE.match(first) and in_band(x0, q_band):
            kind = "question"
            text = QUESTION_TOKEN_RE.match(first).group(1)
        elif PART_TOKEN_RE.match(first) and in_band(x0, p_band):
            kind = "part"
            text = PART_TOKEN_RE.match(first).group(1).lower()
        elif SUBPART_TOKEN_RE.match(first) and in_band(x0, s_band):
            kind = "subpart"
            text = SUBPART_TOKEN_RE.match(first).group(1).lower()

        if kind:
            anchors.append(
                {
                    "kind": kind,
                    "text": text,
                    "page": page_index,
                    "bbox": [line["x0"], line["top"], line["x1"], line["bottom"]],
                }
            )

    return anchors


def extract_document(
    pdf_bytes: bytes,
    *,
    indent_bands: Optional[Dict[str, List[float]]] = None,
    with_figures: bool = True,
    render_figures: bool = False,
    caption_pattern: Optional[str] = None,
    max_pages: Optional[int] = None,
) -> Dict[str, Any]:
    """Build the canonical ParsedDocument envelope."""
    pages: List[Dict[str, Any]] = []
    mark_tags: List[Dict[str, Any]] = []
    anchors: List[Dict[str, Any]] = []
    warnings: List[str] = []

    figure_pages: Dict[int, Dict[str, Any]] = {}
    if with_figures:
        try:
            import fitz

            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            try:
                for index, page in enumerate(doc):
                    if max_pages is not None and index >= max_pages:
                        break
                    figure_pages[index] = extract_page_figures(
                        page, render=render_figures, caption_pattern=caption_pattern
                    )
            finally:
                doc.close()
        except Exception as exc:
            warnings.append(f"Figure extraction unavailable: {exc}")

    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        page_count = len(pdf.pages)

        for index, page in enumerate(pdf.pages):
            if max_pages is not None and index >= max_pages:
                break

            words = page_words(page)
            lines = group_words_into_lines(words)
            text = page_text(page)

            mark_tags.extend(_detect_mark_tags(index, words))
            anchors.extend(_detect_anchors(index, lines, indent_bands))

            figures = figure_pages.get(index, {})

            pages.append(
                {
                    "index": index,
                    "width": round(float(page.width), 2),
                    "height": round(float(page.height), 2),
                    "text": text,
                    # `words` are dropped from the line payload to keep the
                    # envelope small; callers that need them use /v2/words.
                    "lines": [
                        {k: v for k, v in line.items() if k != "words"} for line in lines
                    ],
                    "tables": extract_tables(page),
                    "figures": figures.get("figures", []),
                    "tableRegions": figures.get("tables", []),
                }
            )

        header_text = "\n".join(p["text"] for p in pages[:2])

    # Phrase-form mark tags ("(4 marks)") are found in the flat text, since they
    # span several words and would not survive tokenisation.
    for page in pages:
        for match in MARK_PHRASE_RE.finditer(page["text"]):
            mark_tags.append(
                {"marks": int(match.group(1)), "page": page["index"], "bbox": None}
            )

    if not any(p["text"].strip() for p in pages):
        warnings.append(
            "No text layer found on any page; this document needs the vision fallback."
        )

    return {
        "pageCount": page_count,
        "pages": pages,
        "markers": {"markTags": mark_tags, "anchors": anchors},
        "headerText": header_text,
        "extractionMethod": "python_v2",
        "warnings": warnings,
    }
