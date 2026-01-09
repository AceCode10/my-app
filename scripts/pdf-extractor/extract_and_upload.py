#!/usr/bin/env python3
"""
PDF Question Extractor & Uploader

Automated workflow for extracting questions from PDF exam papers using AI
and uploading them directly to the Supabase database.

Requirements:
    pip install pdfplumber PyMuPDF openai python-dotenv supabase

Usage:
    # Extract and upload to a specific paper
    python extract_and_upload.py --pdf "chemistry_paper1_2023.pdf" --paper-id "uuid-of-paper"
    
    # Extract and save to JSON (no upload)
    python extract_and_upload.py --pdf "chemistry_paper1_2023.pdf" --output "questions.json"
    
    # Batch process a folder
    python extract_and_upload.py --input-dir "./pdfs" --subject-id "uuid" --auto-create-papers

Environment Variables:
    OPENAI_API_KEY - Your OpenAI API key
    SUPABASE_URL - Your Supabase project URL
    SUPABASE_SERVICE_KEY - Your Supabase service role key (for direct DB access)
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict
from datetime import datetime

# Try to import required libraries
try:
    import pdfplumber
    HAS_PDFPLUMBER = True
except ImportError:
    HAS_PDFPLUMBER = False

try:
    import fitz  # PyMuPDF
    HAS_PYMUPDF = True
except ImportError:
    HAS_PYMUPDF = False

try:
    from openai import OpenAI
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False

try:
    from supabase import create_client, Client
    HAS_SUPABASE = True
except ImportError:
    HAS_SUPABASE = False

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass


# ============================================
# Data Classes
# ============================================

@dataclass
class MCQOption:
    label: str
    text: str
    is_correct: bool = False


@dataclass
class ExtractedQuestion:
    question_number: int
    question_text: str
    question_type: str = "short_answer"
    marks: int = 1
    difficulty: str = "medium"
    correct_answer: str = ""
    mark_scheme: str = ""
    examiner_tips: str = ""
    options: Optional[List[Dict]] = None
    section_name: str = ""
    part_label: str = ""
    image_url: str = ""
    topic_tags: Optional[List[str]] = None


# ============================================
# PDF Text Extraction
# ============================================

def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract text from a PDF file using available library."""
    
    if HAS_PDFPLUMBER:
        with pdfplumber.open(pdf_path) as pdf:
            text = ""
            for page in pdf.pages:
                page_text = page.extract_text() or ""
                text += page_text + "\n\n"
            return text
    
    if HAS_PYMUPDF:
        doc = fitz.open(pdf_path)
        text = ""
        for page in doc:
            text += page.get_text() + "\n\n"
        doc.close()
        return text
    
    raise ImportError("No PDF library available. Install: pip install pdfplumber PyMuPDF")


# ============================================
# AI-Powered Question Extraction
# ============================================

def detect_document_type(text: str) -> str:
    """
    Detect if the document is a question paper or mark scheme.
    """
    text_lower = text.lower()
    
    # Mark scheme indicators
    ms_indicators = [
        'mark scheme', 'marking scheme', 'acceptable answers',
        'award 1 mark', 'award marks', 'max marks', 'owtte',
        'accept any', 'do not accept', 'reject', 'allow',
        'indicative content', 'guidance', 'examiner'
    ]
    
    # Question paper indicators
    qp_indicators = [
        'answer all questions', 'write your answer', 'time allowed',
        'answer in the spaces', 'show your working', 'calculator',
        'write your name', 'candidate number'
    ]
    
    ms_score = sum(1 for ind in ms_indicators if ind in text_lower)
    qp_score = sum(1 for ind in qp_indicators if ind in text_lower)
    
    if ms_score > qp_score + 2:
        return "mark_scheme"
    return "question_paper"


def detect_exam_board(text: str) -> str:
    """
    Detect the exam board from the document text.
    Order matters - check more specific patterns first.
    """
    text_lower = text.lower()
    
    # Check OCR first (before Cambridge, as OCR is part of Cambridge Assessment)
    # Look for specific OCR identifiers
    if 'ocr.org.uk' in text_lower or ('ocr' in text_lower and 'oxford' in text_lower):
        return "ocr"
    # Check for OCR specimen/paper codes (H420, H432, etc.)
    if 'h420' in text_lower or 'h432' in text_lower or 'h446' in text_lower:
        return "ocr"
    
    # Check Edexcel/Pearson  
    if 'edexcel' in text_lower or 'pearson' in text_lower:
        return "edexcel"
    
    # Check AQA
    if 'aqa' in text_lower or 'aqa.org.uk' in text_lower:
        return "aqa"
    
    # Check AP/College Board
    if 'college board' in text_lower or 'ap®' in text_lower or 'ap exam' in text_lower:
        return "ap"
    
    # Check IB
    if 'ib' in text_lower and 'diploma' in text_lower:
        return "ib"
    
    # Check Cambridge/IGCSE (check last as many boards mention Cambridge Assessment)
    if 'cambridge' in text_lower or 'ucles' in text_lower or 'igcse' in text_lower:
        return "cambridge"
    
    return "unknown"


def extract_questions_with_ai(text: str, api_key: Optional[str] = None) -> List[ExtractedQuestion]:
    """
    Use OpenAI GPT-3.5-turbo to extract questions from exam paper text.
    This replicates the NotebookLM workflow but fully automated.
    Supports multiple exam boards: Cambridge, Edexcel, AQA, OCR, AP.
    """
    if not HAS_OPENAI:
        raise ImportError("OpenAI library not installed. Run: pip install openai")
    
    api_key = api_key or os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OpenAI API key not found. Set OPENAI_API_KEY environment variable.")
    
    client = OpenAI(api_key=api_key)
    
    # Detect document type and exam board for better extraction
    doc_type = detect_document_type(text)
    exam_board = detect_exam_board(text)
    
    # Optimized prompt for exam question extraction with exam board awareness
    system_prompt = f"""You are an expert at extracting structured data from {exam_board.upper()} examination papers.
Document type detected: {doc_type.replace('_', ' ').upper()}

Your task is to extract ALL questions from the provided exam paper text and return them as a JSON array.

For each question, extract:
- question_number: Integer number of the question (e.g., 1, 2, 3)
- question_text: The full question text. Include any context, data tables, or figure descriptions. Do NOT include answer lines or mark indicators.
- question_type: One of "mcq", "short_answer", "structured", "essay", "calculation", "true_false"
- marks: Number of marks. Look for patterns like [2], (3 marks), [MARKS:4], or estimate if not specified.
- difficulty: Estimate as "easy", "medium", or "hard" based on marks and complexity
- correct_answer: The correct answer if this is a mark scheme, otherwise leave empty
- mark_scheme: If this is a mark scheme document, include the marking criteria/acceptable answers
- options: For MCQ questions, array of {{"label": "A", "text": "option text", "is_correct": false}} objects
- section_name: Section label if present (e.g., "Section A", "Part 1")
- part_label: For sub-questions use lowercase letters or roman numerals (e.g., "a", "b", "i", "ii")

EXAM BOARD SPECIFIC RULES:
- Cambridge/IGCSE: Questions often have parts (a), (b) and subparts (i), (ii). Marks in [X] format at end.
- Edexcel/Pearson: Look for "(Total for Question X = Y marks)" to confirm question boundaries.
- AQA: Questions may use "0 1", "0 2" numbering format. Marks in [X] at end.
- OCR: Similar to Cambridge. May have dotted answer lines.
- AP/College Board: Long-form free response questions with parts (a), (b), (c), (d).

CRITICAL RULES:
1. Extract EVERY question including ALL sub-parts (a, b, c, i, ii, iii)
2. Each sub-part should be a SEPARATE entry in the array
3. Preserve mathematical notation (use LaTeX format like $x^2$ or \\frac{{a}}{{b}})
4. Preserve chemical formulas (e.g., H₂O, CO₂, CaCO₃)
5. Include data tables and figure descriptions verbatim in question_text
6. Do NOT include "[ANSWER_LINE]" or similar markers in question_text
7. For mark schemes: extract acceptable answers in mark_scheme field
8. Return ONLY valid JSON - no markdown, no explanations
9. If you cannot determine marks, estimate: MCQ=1, short_answer=2-3, structured=4-6, essay=8-12"""

    user_prompt = f"""Extract all questions from this {doc_type.replace('_', ' ')} and return as JSON array.

DETECTED INFO:
- Exam Board: {exam_board.upper()}
- Document Type: {doc_type.replace('_', ' ').upper()}

---
{text[:30000]}
---

Return ONLY a valid JSON array of question objects. Format: {{"questions": [...]}}`"""

    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.1,
            max_tokens=4096,
            response_format={"type": "json_object"}
        )
        
        response_text = response.choices[0].message.content.strip()
        
        # Parse JSON response
        data = json.loads(response_text)
        
        # Handle both {"questions": [...]} and direct array formats
        if isinstance(data, dict):
            questions_data = data.get("questions", data.get("data", []))
        else:
            questions_data = data
        
        if not isinstance(questions_data, list):
            questions_data = [questions_data]
        
        # Convert to ExtractedQuestion objects
        questions = []
        for item in questions_data:
            if not item.get("question_text"):
                continue
                
            q = ExtractedQuestion(
                question_number=int(item.get("question_number", len(questions) + 1)),
                question_text=item.get("question_text", ""),
                question_type=normalize_question_type(item.get("question_type", "short_answer")),
                marks=int(item.get("marks", 1)),
                difficulty=item.get("difficulty", "medium"),
                correct_answer=item.get("correct_answer", ""),
                mark_scheme=item.get("mark_scheme", ""),
                examiner_tips=item.get("examiner_tips", ""),
                options=item.get("options"),
                section_name=item.get("section_name", ""),
                part_label=item.get("part_label", ""),
                image_url=item.get("image_url", ""),
                topic_tags=item.get("topic_tags")
            )
            questions.append(q)
        
        return questions
        
    except json.JSONDecodeError as e:
        print(f"Error parsing AI response as JSON: {e}")
        print(f"Response was: {response_text[:500]}...")
        return []
    except Exception as e:
        print(f"Error during AI extraction: {e}")
        raise


def normalize_question_type(qtype: str) -> str:
    """Normalize question type to valid database values."""
    qtype = qtype.lower().strip()
    
    type_map = {
        'multiple_choice': 'mcq',
        'multiplechoice': 'mcq',
        'multiple-choice': 'mcq',
        'mc': 'mcq',
        'numeric': 'calculation',
        'number': 'calculation',
        'calc': 'calculation',
        'math': 'calculation',
        'long_answer': 'essay',
        'extended': 'essay',
        'extended_response': 'essay',
        'free_response': 'essay',
        'tf': 'true_false',
        'truefalse': 'true_false',
        'true-false': 'true_false',
        'struct': 'structured',
        'text': 'short_answer',
    }
    
    if qtype in type_map:
        return type_map[qtype]
    
    valid_types = ['mcq', 'short_answer', 'essay', 'calculation', 'true_false', 'structured']
    return qtype if qtype in valid_types else 'short_answer'


# ============================================
# Supabase Integration
# ============================================

def get_supabase_client() -> Client:
    """Create and return Supabase client."""
    if not HAS_SUPABASE:
        raise ImportError("Supabase library not installed. Run: pip install supabase")
    
    url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY")
    
    if not url or not key:
        raise ValueError(
            "Supabase credentials not found. Set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables."
        )
    
    return create_client(url, key)


def upload_questions_to_paper(
    supabase: Client,
    paper_id: str,
    questions: List[ExtractedQuestion],
    replace_existing: bool = False
) -> Dict[str, Any]:
    """Upload extracted questions directly to the paper_questions table."""
    
    if replace_existing:
        # Delete existing questions for this paper
        supabase.table("paper_questions").delete().eq("paper_id", paper_id).execute()
    
    # Prepare questions for insertion
    questions_data = []
    for q in questions:
        question_dict = {
            "paper_id": paper_id,
            "question_number": q.question_number,
            "question_text": q.question_text,
            "question_type": q.question_type,
            "marks": q.marks,
            "difficulty": q.difficulty if q.difficulty in ['easy', 'medium', 'hard'] else None,
            "correct_answer": q.correct_answer or None,
            "mark_scheme": q.mark_scheme or None,
            "examiner_tips": q.examiner_tips or None,
            "options": q.options,
            "section_name": q.section_name or None,
            "part_label": q.part_label or None,
            "image_url": q.image_url or None,
        }
        questions_data.append(question_dict)
    
    # Bulk insert
    result = supabase.table("paper_questions").insert(questions_data).execute()
    
    return {
        "success": True,
        "count": len(result.data) if result.data else 0,
        "paper_id": paper_id
    }


def get_or_create_paper(
    supabase: Client,
    subject_id: str,
    year: int,
    session: str = "mj",
    paper_number: str = "1",
    exam_board_id: Optional[str] = None,
    title: Optional[str] = None
) -> str:
    """Get existing paper or create a new one. Returns paper ID."""
    
    # Try to find existing paper
    query = supabase.table("past_papers").select("id")
    query = query.eq("subject_id", subject_id)
    query = query.eq("year", year)
    query = query.eq("session", session)
    query = query.eq("paper_number", paper_number)
    
    result = query.execute()
    
    if result.data and len(result.data) > 0:
        return result.data[0]["id"]
    
    # Create new paper
    paper_data = {
        "subject_id": subject_id,
        "year": year,
        "session": session,
        "paper_number": paper_number,
        "title": title or f"{year} {session.upper()} Paper {paper_number}",
        "status": "draft",
    }
    
    if exam_board_id:
        paper_data["exam_board_id"] = exam_board_id
    
    result = supabase.table("past_papers").insert(paper_data).execute()
    return result.data[0]["id"]


def parse_paper_info_from_filename(filename: str) -> Dict[str, Any]:
    """
    Extract paper metadata from filename.
    Expected formats:
    - chemistry_2023_mj_paper1.pdf
    - 0620_s23_qp_12.pdf (Cambridge format)
    - physics_oct_nov_2022_p2.pdf
    """
    info = {
        "year": None,
        "session": "mj",
        "paper_number": "1",
        "subject_code": None
    }
    
    filename = filename.lower().replace(".pdf", "")
    
    # Extract year (4 digits)
    year_match = re.search(r'20\d{2}', filename)
    if year_match:
        info["year"] = int(year_match.group())
    
    # Extract session
    session_patterns = {
        'mj': ['mj', 'may', 'june', 'm/j', 'may_june', 'may-june', 's'],
        'on': ['on', 'oct', 'nov', 'o/n', 'oct_nov', 'oct-nov', 'w'],
        'fm': ['fm', 'feb', 'mar', 'f/m', 'feb_mar', 'feb-mar', 'm']
    }
    
    for session, patterns in session_patterns.items():
        for pattern in patterns:
            if pattern in filename:
                info["session"] = session
                break
    
    # Extract paper number
    paper_match = re.search(r'(?:paper|p|qp[_\s]?)(\d+)', filename)
    if paper_match:
        info["paper_number"] = paper_match.group(1)
    
    # Extract subject code (Cambridge format: 0620, 9701, etc.)
    code_match = re.search(r'\b(\d{4})\b', filename)
    if code_match and code_match.group(1) != str(info["year"]):
        info["subject_code"] = code_match.group(1)
    
    return info


# ============================================
# Main Processing Functions
# ============================================

def process_pdf(
    pdf_path: str,
    paper_id: Optional[str] = None,
    subject_id: Optional[str] = None,
    api_key: Optional[str] = None,
    upload: bool = False,
    replace_existing: bool = False
) -> Dict[str, Any]:
    """
    Process a single PDF file:
    1. Extract text from PDF
    2. Use AI to extract questions
    3. Optionally upload to database
    """
    print(f"\n{'='*60}")
    print(f"Processing: {pdf_path}")
    print(f"{'='*60}")
    
    # Extract text
    print("Step 1: Extracting text from PDF...")
    text = extract_text_from_pdf(pdf_path)
    
    if not text.strip():
        return {"success": False, "error": "No text extracted from PDF"}
    
    print(f"  - Extracted {len(text)} characters")
    
    # Extract questions with AI
    print("Step 2: Extracting questions with AI...")
    questions = extract_questions_with_ai(text, api_key)
    print(f"  - Found {len(questions)} questions")
    
    if not questions:
        return {"success": False, "error": "No questions extracted"}
    
    # Convert to dict format
    questions_dict = []
    for q in questions:
        d = asdict(q)
        if d.get("options") is None:
            del d["options"]
        if d.get("topic_tags") is None:
            del d["topic_tags"]
        questions_dict.append(d)
    
    result = {
        "success": True,
        "questions": questions_dict,
        "count": len(questions_dict),
        "pdf_path": pdf_path
    }
    
    # Upload if requested
    if upload and paper_id:
        print("Step 3: Uploading to database...")
        supabase = get_supabase_client()
        upload_result = upload_questions_to_paper(
            supabase, paper_id, questions, replace_existing
        )
        result["upload"] = upload_result
        print(f"  - Uploaded {upload_result['count']} questions to paper {paper_id}")
    elif upload and subject_id:
        # Auto-create paper from filename
        print("Step 3: Creating paper and uploading...")
        filename = Path(pdf_path).name
        paper_info = parse_paper_info_from_filename(filename)
        
        if paper_info["year"]:
            supabase = get_supabase_client()
            paper_id = get_or_create_paper(
                supabase,
                subject_id,
                paper_info["year"],
                paper_info["session"],
                paper_info["paper_number"]
            )
            
            upload_result = upload_questions_to_paper(
                supabase, paper_id, questions, replace_existing
            )
            result["upload"] = upload_result
            result["paper_id"] = paper_id
            print(f"  - Created/found paper {paper_id}")
            print(f"  - Uploaded {upload_result['count']} questions")
        else:
            print("  - Could not determine year from filename, skipping upload")
    
    return result


def process_directory(
    input_dir: str,
    output_dir: Optional[str] = None,
    subject_id: Optional[str] = None,
    api_key: Optional[str] = None,
    upload: bool = False
) -> List[Dict[str, Any]]:
    """Process all PDF files in a directory."""
    
    input_path = Path(input_dir)
    pdf_files = list(input_path.glob("**/*.pdf"))
    
    print(f"\nFound {len(pdf_files)} PDF files in {input_dir}")
    
    results = []
    
    for pdf_file in pdf_files:
        try:
            result = process_pdf(
                str(pdf_file),
                subject_id=subject_id,
                api_key=api_key,
                upload=upload
            )
            
            # Save JSON output if output_dir specified
            if output_dir and result.get("questions"):
                output_path = Path(output_dir)
                output_path.mkdir(parents=True, exist_ok=True)
                
                relative = pdf_file.relative_to(input_path)
                output_file = output_path / relative.with_suffix(".json")
                output_file.parent.mkdir(parents=True, exist_ok=True)
                
                with open(output_file, 'w', encoding='utf-8') as f:
                    json.dump(result["questions"], f, indent=2, ensure_ascii=False)
                
                result["output_file"] = str(output_file)
            
            results.append(result)
            
        except Exception as e:
            print(f"Error processing {pdf_file}: {e}")
            results.append({
                "success": False,
                "pdf_path": str(pdf_file),
                "error": str(e)
            })
    
    return results


# ============================================
# CLI
# ============================================

def main():
    parser = argparse.ArgumentParser(
        description="Extract questions from PDF exam papers and upload to database",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Extract questions and save to JSON
  python extract_and_upload.py --pdf paper.pdf --output questions.json

  # Extract and upload directly to a paper
  python extract_and_upload.py --pdf paper.pdf --paper-id "uuid" --upload

  # Batch process a folder
  python extract_and_upload.py --input-dir ./pdfs --output-dir ./json

  # Batch process and upload with auto paper creation
  python extract_and_upload.py --input-dir ./pdfs --subject-id "uuid" --upload
        """
    )
    
    # Input options
    input_group = parser.add_mutually_exclusive_group(required=True)
    input_group.add_argument("--pdf", help="Single PDF file to process")
    input_group.add_argument("--input-dir", help="Directory of PDF files to process")
    
    # Output options
    parser.add_argument("--output", "-o", help="Output JSON file (for single PDF)")
    parser.add_argument("--output-dir", help="Output directory for JSON files")
    
    # Database options
    parser.add_argument("--paper-id", help="Paper ID to upload questions to")
    parser.add_argument("--subject-id", help="Subject ID for auto-creating papers")
    parser.add_argument("--upload", action="store_true", help="Upload directly to database")
    parser.add_argument("--replace", action="store_true", help="Replace existing questions")
    
    # API options
    parser.add_argument("--api-key", help="OpenAI API key (or use OPENAI_API_KEY env var)")
    
    args = parser.parse_args()
    
    # Check dependencies
    if not HAS_PDFPLUMBER and not HAS_PYMUPDF:
        print("Error: No PDF library installed.")
        print("Install with: pip install pdfplumber PyMuPDF")
        sys.exit(1)
    
    if not HAS_OPENAI:
        print("Error: OpenAI library not installed.")
        print("Install with: pip install openai")
        sys.exit(1)
    
    if args.upload and not HAS_SUPABASE:
        print("Error: Supabase library not installed.")
        print("Install with: pip install supabase")
        sys.exit(1)
    
    # Process
    if args.pdf:
        result = process_pdf(
            args.pdf,
            paper_id=args.paper_id,
            subject_id=args.subject_id,
            api_key=args.api_key,
            upload=args.upload,
            replace_existing=args.replace
        )
        
        if result.get("questions"):
            output_file = args.output or Path(args.pdf).with_suffix(".json")
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(result["questions"], f, indent=2, ensure_ascii=False)
            print(f"\nSaved {len(result['questions'])} questions to: {output_file}")
        
        if not result["success"]:
            print(f"\nError: {result.get('error', 'Unknown error')}")
            sys.exit(1)
            
    else:
        results = process_directory(
            args.input_dir,
            output_dir=args.output_dir,
            subject_id=args.subject_id,
            api_key=args.api_key,
            upload=args.upload
        )
        
        # Summary
        success = sum(1 for r in results if r["success"])
        total = len(results)
        print(f"\n{'='*60}")
        print(f"SUMMARY: {success}/{total} PDFs processed successfully")
        print(f"{'='*60}")


if __name__ == "__main__":
    main()
