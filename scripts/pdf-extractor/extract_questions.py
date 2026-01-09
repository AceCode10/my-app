#!/usr/bin/env python3
"""
PDF Question Extractor Script

This script extracts questions from PDF files and converts them to JSON format
for bulk import into the IGCSE Simplified application.

Requirements:
    pip install pdfplumber PyMuPDF openai python-dotenv

Usage:
    python extract_questions.py --input <pdf_file> --output <json_file>
    python extract_questions.py --input-dir <folder> --output-dir <folder>
    python extract_questions.py --input <pdf_file> --ai-extract  # Uses AI for better extraction

Features:
    - Extract text from PDF files
    - Parse question structures automatically
    - AI-powered extraction using OpenAI/Claude (optional)
    - Batch processing of multiple PDFs
    - Support for MCQ, short answer, structured, and essay questions
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict

# Try to import PDF libraries
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
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass


@dataclass
class MCQOption:
    label: str
    text: str
    is_correct: bool = False


@dataclass
class ExtractedQuestion:
    question_number: str
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


def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract text from a PDF file using available library."""
    
    if HAS_PDFPLUMBER:
        with pdfplumber.open(pdf_path) as pdf:
            text = ""
            for page in pdf.pages:
                text += page.extract_text() or ""
                text += "\n\n"
            return text
    
    if HAS_PYMUPDF:
        doc = fitz.open(pdf_path)
        text = ""
        for page in doc:
            text += page.get_text()
            text += "\n\n"
        doc.close()
        return text
    
    raise ImportError("No PDF library available. Install pdfplumber or PyMuPDF: pip install pdfplumber PyMuPDF")


def parse_questions_from_text(text: str) -> List[ExtractedQuestion]:
    """
    Parse questions from extracted PDF text using regex patterns.
    This is a heuristic-based approach that works for common exam formats.
    """
    questions = []
    
    # Common patterns for question detection
    # Pattern 1: "1. Question text" or "1) Question text"
    # Pattern 2: "Question 1:" or "Q1."
    patterns = [
        r'(?:^|\n)\s*(\d+)\s*[.)]\s*(.+?)(?=(?:\n\s*\d+\s*[.)])|$)',
        r'(?:^|\n)\s*(?:Question|Q)\s*(\d+)[.:]\s*(.+?)(?=(?:\n\s*(?:Question|Q)\s*\d+)|$)',
    ]
    
    # Marks pattern: [2 marks] or (2 marks) or [2]
    marks_pattern = re.compile(r'[\[(](\d+)\s*(?:marks?|pts?|points?)?[\])]', re.IGNORECASE)
    
    # MCQ options pattern: A) text or A. text
    mcq_pattern = re.compile(r'^([A-D])\s*[.)]\s*(.+)$', re.MULTILINE)
    
    # Section pattern: Section A, Section B
    section_pattern = re.compile(r'Section\s+([A-Z])', re.IGNORECASE)
    
    current_section = ""
    
    # Try to find section markers
    section_matches = list(section_pattern.finditer(text))
    
    # Process text to find questions
    for pattern in patterns:
        matches = re.finditer(pattern, text, re.MULTILINE | re.DOTALL)
        
        for match in matches:
            q_num = match.group(1)
            q_text = match.group(2).strip()
            
            # Extract marks
            marks = 1
            marks_match = marks_pattern.search(q_text)
            if marks_match:
                marks = int(marks_match.group(1))
                q_text = marks_pattern.sub('', q_text).strip()
            
            # Check for MCQ options
            options = []
            mcq_matches = list(mcq_pattern.finditer(q_text))
            if len(mcq_matches) >= 2:
                # This is likely an MCQ
                for mcq_match in mcq_matches:
                    options.append({
                        "label": mcq_match.group(1),
                        "text": mcq_match.group(2).strip(),
                        "is_correct": False
                    })
                # Remove options from question text
                q_text = mcq_pattern.sub('', q_text).strip()
            
            # Determine question type
            q_type = "mcq" if options else "short_answer"
            if marks >= 6:
                q_type = "essay" if not options else "mcq"
            elif marks >= 3:
                q_type = "structured" if not options else "mcq"
            
            # Check for part labels (a), (b), etc.
            part_match = re.match(r'^\(([a-z])\)\s*', q_text)
            part_label = ""
            if part_match:
                part_label = part_match.group(1)
                q_text = q_text[part_match.end():].strip()
            
            # Determine current section
            for sec_match in section_matches:
                if sec_match.start() < match.start():
                    current_section = f"Section {sec_match.group(1)}"
            
            question = ExtractedQuestion(
                question_number=q_num,
                question_text=q_text,
                question_type=q_type,
                marks=marks,
                options=options if options else None,
                section_name=current_section,
                part_label=part_label
            )
            questions.append(question)
        
        if questions:
            break  # Use first pattern that finds questions
    
    return questions


def extract_with_ai(text: str, api_key: Optional[str] = None) -> List[ExtractedQuestion]:
    """
    Use AI (OpenAI GPT-4) to extract questions from text.
    This provides much better results than regex-based parsing.
    """
    if not HAS_OPENAI:
        raise ImportError("OpenAI library not installed. Run: pip install openai")
    
    api_key = api_key or os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OpenAI API key not found. Set OPENAI_API_KEY environment variable.")
    
    client = OpenAI(api_key=api_key)
    
    prompt = f"""Extract all questions from the following exam paper text. 
For each question, provide:
- question_number: The question number (e.g., "1", "2a", "3(i)")
- question_text: The full question text
- question_type: One of "mcq", "short_answer", "structured", "essay", "true_false", "numeric"
- marks: The number of marks (default 1 if not specified)
- difficulty: One of "easy", "medium", "hard" (estimate based on marks and complexity)
- options: For MCQ questions, an array of {{label, text, is_correct}} objects
- section_name: If questions are grouped into sections (e.g., "Section A")
- part_label: For multi-part questions (e.g., "a", "b", "i", "ii")

Return a valid JSON array of question objects. Do not include any other text.

Text to extract:
---
{text[:15000]}
---"""

    response = client.chat.completions.create(
        model="gpt-4-turbo-preview",
        messages=[
            {"role": "system", "content": "You are an expert at extracting structured data from exam papers. Return only valid JSON."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.1,
        max_tokens=4000
    )
    
    response_text = response.choices[0].message.content.strip()
    
    # Clean up response - remove markdown code blocks if present
    if response_text.startswith("```"):
        response_text = re.sub(r'^```(?:json)?\n?', '', response_text)
        response_text = re.sub(r'\n?```$', '', response_text)
    
    questions_data = json.loads(response_text)
    
    questions = []
    for item in questions_data:
        q = ExtractedQuestion(
            question_number=str(item.get("question_number", "")),
            question_text=item.get("question_text", ""),
            question_type=item.get("question_type", "short_answer"),
            marks=int(item.get("marks", 1)),
            difficulty=item.get("difficulty", "medium"),
            correct_answer=item.get("correct_answer", ""),
            options=item.get("options"),
            section_name=item.get("section_name", ""),
            part_label=item.get("part_label", "")
        )
        questions.append(q)
    
    return questions


def process_pdf(pdf_path: str, use_ai: bool = False, api_key: Optional[str] = None) -> List[Dict]:
    """
    Process a single PDF file and extract questions.
    """
    print(f"Processing: {pdf_path}")
    
    # Extract text from PDF
    text = extract_text_from_pdf(pdf_path)
    
    if not text.strip():
        print(f"  Warning: No text extracted from {pdf_path}")
        return []
    
    # Extract questions
    if use_ai:
        questions = extract_with_ai(text, api_key)
    else:
        questions = parse_questions_from_text(text)
    
    print(f"  Found {len(questions)} questions")
    
    # Convert to dict format
    result = []
    for q in questions:
        d = asdict(q)
        if d.get("options") is None:
            del d["options"]
        result.append(d)
    
    return result


def process_directory(input_dir: str, output_dir: str, use_ai: bool = False, api_key: Optional[str] = None):
    """
    Process all PDF files in a directory.
    """
    input_path = Path(input_dir)
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    pdf_files = list(input_path.glob("**/*.pdf"))
    print(f"Found {len(pdf_files)} PDF files")
    
    for pdf_file in pdf_files:
        try:
            questions = process_pdf(str(pdf_file), use_ai, api_key)
            
            # Create output file with same relative path structure
            relative = pdf_file.relative_to(input_path)
            output_file = output_path / relative.with_suffix(".json")
            output_file.parent.mkdir(parents=True, exist_ok=True)
            
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(questions, f, indent=2, ensure_ascii=False)
            
            print(f"  Saved to: {output_file}")
        except Exception as e:
            print(f"  Error processing {pdf_file}: {e}")


def main():
    parser = argparse.ArgumentParser(description="Extract questions from PDF files")
    parser.add_argument("--input", "-i", help="Input PDF file")
    parser.add_argument("--output", "-o", help="Output JSON file")
    parser.add_argument("--input-dir", help="Input directory containing PDFs")
    parser.add_argument("--output-dir", help="Output directory for JSON files")
    parser.add_argument("--ai-extract", action="store_true", help="Use AI for better extraction")
    parser.add_argument("--api-key", help="OpenAI API key (or set OPENAI_API_KEY env var)")
    
    args = parser.parse_args()
    
    # Check dependencies
    if not HAS_PDFPLUMBER and not HAS_PYMUPDF:
        print("Error: No PDF library available.")
        print("Install one of: pip install pdfplumber PyMuPDF")
        sys.exit(1)
    
    if args.ai_extract and not HAS_OPENAI:
        print("Error: OpenAI library not installed. Run: pip install openai")
        sys.exit(1)
    
    # Process based on mode
    if args.input_dir and args.output_dir:
        process_directory(args.input_dir, args.output_dir, args.ai_extract, args.api_key)
    elif args.input:
        questions = process_pdf(args.input, args.ai_extract, args.api_key)
        
        output_file = args.output or Path(args.input).with_suffix(".json")
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(questions, f, indent=2, ensure_ascii=False)
        
        print(f"Saved {len(questions)} questions to: {output_file}")
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
