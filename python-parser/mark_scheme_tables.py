"""
Deterministic mark-scheme parsing.

Cambridge mark schemes publish answers as `Question | Answer | Marks` tables.
Measured across all 36 IGCSE ICT 0417 mark schemes in the corpus, a table parse
recovers every question id and the marks sum agrees with the question paper on
33 of 36 papers; the three misses are table-detection gaps, not format changes.
So on Cambridge NO language model is needed to extract answers.

Other boards publish no such table — Edexcel leads with "General Marking
Guidance", OCR with "Annotation | Meaning", AP with an unlabelled layout — so
those fall through to the LLM strategy in TypeScript. This module reports what
it found and how confident it is; the caller decides whether to escalate.

Two structural traps, both handled here:
  * Header labels are offset from their data. The label "Question" can sit one
    column right of the value "1", so rows are read positionally (first
    non-empty cell = id, last bare integer = marks) and never by header index.
  * An answer spilling across a page break repeats the header and continues the
    row, so entries are merged by id in document order.
"""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional

import pdfplumber

from text_layer import clean_text, extract_tables, page_text

# Matches "1", "2(a)", "11(b)(i)" — the canonical id shape.
DEFAULT_QID_RE = re.compile(r"^\d{1,2}\s*(\([a-z]\))?\s*(\([ivxlcdm]+\))?$", re.I)
DEFAULT_HEADER_RE = re.compile(r"Question.*(Answer|Mark)", re.I)

MAX_MARK_RE = re.compile(r"Maximum Mark:\s*(\d+)", re.I)

# "Four from:", "Three matched pairs from:", "Two from:", "One from:"
LEAD_IN_RE = re.compile(
    r"^\s*((?:one|two|three|four|five|six|seven|eight|nine|ten|\d+)"
    r"(?:\s+matched\s+pairs?|\s+marks?)?\s+from\s*:?)\s*",
    re.I,
)

# Wingdings tick used to mark the correct cell in tick-grid answers.
TICK_CHARS = ("", "✓", "✔", "☑")

# Cells that are literally the table's own column labels. This must be an
# ANCHORED match against the label alone -- searching for the header PATTERN
# inside a cell wrongly discards real answers, because answer prose routinely
# contains both words, e.g. "the system that displays questions for the user to
# answer" matches /Question.*Answer/.
HEADER_LABEL_RE = re.compile(r"^\s*(question|answer|marks?|guidance)\s*$", re.I)

# Boilerplate that appears in table form but carries no answers.
BOILERPLATE_RE = re.compile(
    r"Generic\s+Marking\s+Principle|Annotations?\s+guidance|Mark\s+scheme\s+Abbreviations",
    re.I,
)


def _is_tick(cell: str) -> bool:
    return any(t in cell for t in TICK_CHARS)


def _split_points(answer: str) -> List[str]:
    """
    Split an answer cell into individual acceptable-answer points.

    Cambridge writes a lead-in ("Four from:") followed by one point per line.
    The lead-in is dropped; the points are kept in order.
    """
    body = LEAD_IN_RE.sub("", answer or "").strip()
    points = [
        re.sub(r"^[•\-–—*]\s*", "", line).strip()
        for line in body.split("\n")
    ]
    return [p for p in points if p]


def _looks_like_answer_table(rows: List[List[str]], header_re: re.Pattern) -> bool:
    if not rows:
        return False
    # The header can be on any of the first few rows.
    for row in rows[:3]:
        joined = " ".join(row)
        if header_re.search(joined):
            return True
    return False


def _grid_answer_map(rows: List[List[str]]) -> Optional[Dict[str, str]]:
    """
    For tick-grid answers, map each row label to the column header whose cell
    carries a tick. Verified against Nov 2021 P13 Q1 and Q4.
    """
    if len(rows) < 2:
        return None
    header = rows[0]
    if not any(h for h in header[1:]):
        return None

    mapping: Dict[str, str] = {}
    for row in rows[1:]:
        label = (row[0] or "").strip()
        if not label:
            continue
        for idx in range(1, min(len(row), len(header))):
            if _is_tick(row[idx] or ""):
                column = (header[idx] or "").strip()
                if column:
                    mapping[label] = column
                break

    return mapping or None


def parse_mark_scheme(
    pdf_bytes: bytes,
    *,
    qid_pattern: Optional[str] = None,
    header_pattern: Optional[str] = None,
) -> Dict[str, Any]:
    """Extract every answer entry from a mark-scheme PDF."""
    qid_re = re.compile(qid_pattern, re.I) if qid_pattern else DEFAULT_QID_RE
    header_re = re.compile(header_pattern, re.I) if header_pattern else DEFAULT_HEADER_RE

    entries: Dict[str, Dict[str, Any]] = {}
    order: List[str] = []
    warnings: List[str] = []
    stated_max: Optional[int] = None
    answer_tables = 0

    import io

    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        if pdf.pages:
            cover = page_text(pdf.pages[0])
            match = MAX_MARK_RE.search(cover)
            if match:
                stated_max = int(match.group(1))

        for page_index, page in enumerate(pdf.pages):
            tables = extract_tables(page)

            # A tick-grid answer is a nested table sitting inside the answer
            # cell of the row above it; keep them to attach to the previous id.
            pending_grid: Optional[Dict[str, str]] = None

            for table in tables:
                rows = table["rows"]
                joined_all = " ".join(" ".join(r) for r in rows)

                if BOILERPLATE_RE.search(joined_all):
                    continue

                if not _looks_like_answer_table(rows, header_re):
                    grid = _grid_answer_map(rows)
                    if grid:
                        pending_grid = grid
                    continue

                answer_tables += 1

                for row in rows:
                    cells = [c for c in row if c and c.strip()]
                    if not cells:
                        continue

                    raw_id = cells[0].strip()
                    if not qid_re.match(raw_id):
                        continue

                    qid = re.sub(r"\s+", "", raw_id).lower()

                    marks: Optional[int] = None
                    for cell in reversed(cells[1:]):
                        if re.fullmatch(r"\d{1,2}", cell.strip()):
                            marks = int(cell.strip())
                            break

                    answer_cells = [
                        c
                        for c in cells[1:]
                        if not re.fullmatch(r"\d{1,2}", c.strip())
                        and not HEADER_LABEL_RE.match(c)
                    ]
                    answer = clean_text("\n".join(answer_cells)).strip()

                    if qid in entries:
                        # Continuation after a page break: append, keep first marks.
                        existing = entries[qid]
                        if answer and answer not in existing["answerText"]:
                            existing["answerText"] = f"{existing['answerText']}\n{answer}".strip()
                            existing["points"] = _split_points(existing["answerText"])
                        if existing["marks"] is None:
                            existing["marks"] = marks
                        continue

                    entries[qid] = {
                        "ref": qid,
                        "answerText": answer,
                        "marks": marks,
                        "points": _split_points(answer),
                        "answerMap": None,
                        "sourcePage": page_index,
                    }
                    order.append(qid)

                    if pending_grid:
                        entries[qid]["answerMap"] = pending_grid
                        pending_grid = None

            # A grid found after its row (common: the nested table is emitted
            # second) attaches to the most recent entry on this page.
            if pending_grid and order:
                last = entries[order[-1]]
                if last["answerMap"] is None and not last["answerText"]:
                    last["answerMap"] = pending_grid

    total = sum(e["marks"] for e in entries.values() if e["marks"])

    if not entries:
        warnings.append("No answer table rows found; escalate to the LLM strategy.")
    if stated_max is not None and total != stated_max:
        # Recorded, never fatal: Cambridge itself gets this wrong (Nov 2023 P11
        # states 100 on a paper that totals 80).
        warnings.append(
            f"Mark total {total} does not match stated Maximum Mark {stated_max} "
            "(soft signal only; the question paper is authoritative)."
        )

    return {
        "entries": [entries[qid] for qid in order],
        "statedMaxMarks": stated_max,
        "totalMarks": total,
        "answerTableCount": answer_tables,
        "strategy": "plumber_table_qam",
        "warnings": warnings,
    }
