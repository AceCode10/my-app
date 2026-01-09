#!/usr/bin/env python3
"""
Comprehensive test script for multi-exam-board PDF extraction.
Tests the improved parser and GPT prompts across different exam board formats.
"""

import json
import os
import sys
from pathlib import Path
from typing import Dict, List, Tuple

# Add the current directory to Python path for imports
sys.path.insert(0, str(Path(__file__).parent))

try:
    from enhanced_pdf_parser_v2 import extract_to_dict, clean_pdf_artifacts_optimized, normalize_question_markers_optimized
    PARSER_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Could not import enhanced_pdf_parser_v2: {e}")
    PARSER_AVAILABLE = False

try:
    from extract_and_upload import detect_document_type, detect_exam_board, extract_questions_with_ai, extract_text_from_pdf
    AI_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Could not import extract_and_upload: {e}")
    AI_AVAILABLE = False


# Sample PDFs for testing different exam boards
SAMPLE_PDFS = {
    "cambridge_qp": "Sample Questions and Mark Schemes/0417_s23_qp_13.pdf",
    "cambridge_ms": "Sample Questions and Mark Schemes/0417_s23_ms_13.pdf",
    "edexcel_qp": "Sample Questions and Mark Schemes/9bn0-02-que-20240615.pdf",
    "edexcel_ms": "Sample Questions and Mark Schemes/9bn0-02-rms-20240815.pdf",
    "aqa_qp": "Sample Questions and Mark Schemes/AQA-71323-QP-JUN24.PDF",
    "ocr_qp": "Sample Questions and Mark Schemes/Specimen-QP-02-biological-diversity-A-Level-OCR-Biology.pdf",
    "ap_frq": "Sample Questions and Mark Schemes/ap23-frq-biology.pdf",
    "cambridge_cs": "Sample Questions and Mark Schemes/9626_m25_qp_12.pdf",
}


def test_pdf_parsing() -> List[Tuple[str, bool, str]]:
    """Test PDF text extraction and cleaning for all sample PDFs."""
    results = []
    
    if not PARSER_AVAILABLE:
        results.append(("PDF Parser Import", False, "enhanced_pdf_parser_v2 not available"))
        return results
    
    print("\n" + "="*60)
    print("TESTING PDF PARSING")
    print("="*60)
    
    for name, pdf_path in SAMPLE_PDFS.items():
        if not Path(pdf_path).exists():
            results.append((f"Parse {name}", False, f"File not found: {pdf_path}"))
            continue
        
        try:
            result = extract_to_dict(pdf_path)
            
            # Validate extraction
            cleaned_text = result.get('cleaned_text', '')
            metadata = result.get('metadata', {})
            
            # Check for artifacts that should have been removed
            artifact_checks = [
                ('CID encoding', '(cid:' not in cleaned_text),
                ('Reversed margin', 'NIGRAM SIHT' not in cleaned_text),
                ('Unicode boxes', '\uf0a2' not in cleaned_text),
                ('Edexcel markers', '*P74457' not in cleaned_text),
            ]
            
            failed_checks = [check for check, passed in artifact_checks if not passed]
            
            if failed_checks:
                results.append((f"Parse {name}", False, f"Artifacts not removed: {failed_checks}"))
            else:
                # Check for question markers
                has_questions = '[QUESTION:' in cleaned_text or '[PART:' in cleaned_text or '[MARKS:' in cleaned_text
                char_count = len(cleaned_text)
                compression = metadata.get('compression_ratio', 0)
                
                results.append((
                    f"Parse {name}", 
                    True, 
                    f"✓ {char_count} chars, {compression:.0%} compression, markers={has_questions}"
                ))
                
        except Exception as e:
            results.append((f"Parse {name}", False, f"Error: {str(e)[:50]}"))
    
    return results


def test_document_detection() -> List[Tuple[str, bool, str]]:
    """Test document type and exam board detection."""
    results = []
    
    if not AI_AVAILABLE:
        results.append(("Document Detection Import", False, "extract_and_upload not available"))
        return results
    
    print("\n" + "="*60)
    print("TESTING DOCUMENT DETECTION")
    print("="*60)
    
    # Expected detection results
    expected = {
        "cambridge_qp": ("question_paper", "cambridge"),
        "cambridge_ms": ("mark_scheme", "cambridge"),
        "edexcel_qp": ("question_paper", "edexcel"),
        "edexcel_ms": ("mark_scheme", "edexcel"),
        "aqa_qp": ("question_paper", "aqa"),
        "ocr_qp": ("question_paper", "ocr"),
        "ap_frq": ("question_paper", "ap"),
        "cambridge_cs": ("question_paper", "cambridge"),
    }
    
    for name, pdf_path in SAMPLE_PDFS.items():
        if not Path(pdf_path).exists():
            continue
        
        try:
            text = extract_text_from_pdf(pdf_path)
            
            doc_type = detect_document_type(text)
            exam_board = detect_exam_board(text)
            
            expected_type, expected_board = expected.get(name, (None, None))
            
            type_match = doc_type == expected_type if expected_type else True
            board_match = exam_board == expected_board if expected_board else True
            
            if type_match and board_match:
                results.append((
                    f"Detect {name}", 
                    True, 
                    f"✓ Type={doc_type}, Board={exam_board}"
                ))
            else:
                results.append((
                    f"Detect {name}", 
                    False, 
                    f"Expected ({expected_type}, {expected_board}), got ({doc_type}, {exam_board})"
                ))
                
        except Exception as e:
            results.append((f"Detect {name}", False, f"Error: {str(e)[:50]}"))
    
    return results


def test_question_marker_normalization() -> List[Tuple[str, bool, str]]:
    """Test question marker normalization for different formats."""
    results = []
    
    if not PARSER_AVAILABLE:
        results.append(("Marker Normalization Import", False, "Parser not available"))
        return results
    
    print("\n" + "="*60)
    print("TESTING QUESTION MARKER NORMALIZATION")
    print("="*60)
    
    test_cases = [
        # Cambridge format
        ("Cambridge Q1", "\n1\nWhat is the formula for water?", "[QUESTION:1]"),
        ("Cambridge Part", "(a) Describe the process", "[PART:a]"),
        ("Cambridge Subpart", "(i) First subpart", "[SUBPART:i]"),
        ("Cambridge Marks", "Explain this [2]", "[MARKS:2]"),
        
        # AQA format
        ("AQA Q1", "\n0 1 Analyse how", "[QUESTION:1]"),
        ("AQA Q2", "\n0 2 Describe the", "[QUESTION:2]"),
        
        # Edexcel format
        ("Edexcel Total", "(Total for Question 5 = 13 marks)", "[TOTAL_MARKS:Q5=13]"),
        
        # Answer lines
        ("Dotted line", "Answer: .............", "[ANSWER_LINE]"),
        ("Underscore", "Name: ________", "[ANSWER_LINE]"),
    ]
    
    for test_name, input_text, expected_marker in test_cases:
        try:
            normalized = normalize_question_markers_optimized(input_text)
            
            if expected_marker in normalized:
                results.append((test_name, True, f"✓ Found {expected_marker}"))
            else:
                results.append((test_name, False, f"Missing {expected_marker} in: {normalized[:50]}..."))
                
        except Exception as e:
            results.append((test_name, False, f"Error: {str(e)[:50]}"))
    
    return results


def test_ai_extraction(max_tests: int = 2) -> List[Tuple[str, bool, str]]:
    """Test AI-powered question extraction (requires API key)."""
    results = []
    
    if not AI_AVAILABLE:
        results.append(("AI Extraction Import", False, "extract_and_upload not available"))
        return results
    
    if not os.getenv("OPENAI_API_KEY"):
        results.append(("AI Extraction", False, "OPENAI_API_KEY not set - skipping AI tests"))
        return results
    
    print("\n" + "="*60)
    print("TESTING AI EXTRACTION (Limited)")
    print("="*60)
    
    # Test with a couple of samples
    test_samples = ["cambridge_qp", "edexcel_qp"][:max_tests]
    
    for name in test_samples:
        pdf_path = SAMPLE_PDFS.get(name)
        if not pdf_path or not Path(pdf_path).exists():
            continue
        
        try:
            text = extract_text_from_pdf(pdf_path)
            questions = extract_questions_with_ai(text[:15000])  # Limit text for faster test
            
            if questions and len(questions) > 0:
                q_count = len(questions)
                has_marks = any(q.marks > 0 for q in questions)
                has_parts = any(q.part_label for q in questions)
                
                results.append((
                    f"AI Extract {name}", 
                    True, 
                    f"✓ {q_count} questions, marks={has_marks}, parts={has_parts}"
                ))
            else:
                results.append((f"AI Extract {name}", False, "No questions extracted"))
                
        except Exception as e:
            results.append((f"AI Extract {name}", False, f"Error: {str(e)[:50]}"))
    
    return results


def print_results(results: List[Tuple[str, bool, str]]) -> Tuple[int, int]:
    """Print test results and return pass/fail counts."""
    passed = 0
    failed = 0
    
    for test_name, success, message in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"  {status}: {test_name}")
        print(f"         {message}")
        
        if success:
            passed += 1
        else:
            failed += 1
    
    return passed, failed


def main():
    print("="*60)
    print("PDF EXTRACTOR - MULTI-BOARD TEST SUITE")
    print("="*60)
    print(f"Working directory: {os.getcwd()}")
    print(f"Parser available: {PARSER_AVAILABLE}")
    print(f"AI module available: {AI_AVAILABLE}")
    print(f"OpenAI API key: {'Set' if os.getenv('OPENAI_API_KEY') else 'Not set'}")
    
    all_results = []
    
    # Run all test suites
    all_results.extend(test_pdf_parsing())
    all_results.extend(test_document_detection())
    all_results.extend(test_question_marker_normalization())
    
    # Only run AI tests if API key is available
    if os.getenv("OPENAI_API_KEY"):
        all_results.extend(test_ai_extraction(max_tests=1))
    
    # Print final summary
    print("\n" + "="*60)
    print("FINAL RESULTS")
    print("="*60)
    
    passed, failed = print_results(all_results)
    
    print("\n" + "="*60)
    print(f"SUMMARY: {passed} passed, {failed} failed, {len(all_results)} total")
    print("="*60)
    
    # Return exit code based on results
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
