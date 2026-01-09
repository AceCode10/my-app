#!/usr/bin/env python3
"""
Test script for PDF question extraction

This script helps you test the extraction functionality with sample data
before processing your actual exam papers.
"""

import json
import os
import sys
from pathlib import Path

# Add the current directory to Python path for imports
sys.path.append(str(Path(__file__).parent))

try:
    from extract_and_upload import extract_questions_with_ai, extract_text_from_pdf
except ImportError as e:
    print(f"Error: Could not import extract_and_upload module: {e}")
    print("Make sure extract_and_upload.py is in the same directory.")
    sys.exit(1)


# Sample exam paper text for testing
SAMPLE_PAPER_TEXT = """
IGCSE Chemistry - Paper 1 Multiple Choice
May/June 2023 - 45 minutes

1. Which of the following is the chemical formula for water?
   A) H2O
   B) CO2
   C) NaCl
   D) O2

2. What is the atomic number of carbon?
   A) 6
   B) 8
   C) 12
   D) 14

3. Balance the equation: Fe + O2 → Fe2O3
   [2 marks]

4. Describe the process of photosynthesis. Include the balanced chemical equation.
   [4 marks]

5. Calculate the molar mass of CaCO3.
   [3 marks]
   (Relative atomic masses: Ca = 40, C = 12, O = 16)

Section B - Structured Questions

6a) Define the term 'element'. [1 mark]
6b) Explain why the periodic table is arranged in the way it is. [3 marks]

7. An experiment was conducted to test the pH of various solutions:
   - Solution A: pH 2
   - Solution B: pH 7
   - Solution C: pH 13
   
   a) Which solution is acidic? [1 mark]
   b) Which solution is neutral? [1 mark]
   c) Which solution is alkaline? [1 mark]
"""


def test_ai_extraction():
    """Test AI extraction with sample text."""
    print("Testing AI Question Extraction")
    print("=" * 50)
    
    try:
        # Check if OpenAI API key is set
        if not os.getenv("OPENAI_API_KEY"):
            print("❌ OPENAI_API_KEY not found in environment variables")
            print("Please set it in your .env file")
            return False
        
        print("✅ OpenAI API key found")
        
        # Extract questions
        print("\nExtracting questions from sample text...")
        questions = extract_questions_with_ai(SAMPLE_PAPER_TEXT)
        
        if not questions:
            print("❌ No questions extracted")
            return False
        
        print(f"✅ Successfully extracted {len(questions)} questions")
        
        # Display results
        print("\nExtracted Questions:")
        print("-" * 30)
        
        for i, q in enumerate(questions, 1):
            print(f"\nQuestion {i}:")
            print(f"  Number: {q.question_number}")
            print(f"  Type: {q.question_type}")
            print(f"  Marks: {q.marks}")
            print(f"  Text: {q.question_text[:100]}...")
            
            if q.options:
                print(f"  Options: {len(q.options)} choices")
            
            if q.section_name:
                print(f"  Section: {q.section_name}")
        
        # Save to file
        output_file = "test_questions_output.json"
        questions_dict = []
        for q in questions:
            d = q.__dict__.copy()
            if d.get("options") is None:
                del d["options"]
            if d.get("topic_tags") is None:
                del d["topic_tags"]
            questions_dict.append(d)
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(questions_dict, f, indent=2, ensure_ascii=False)
        
        print(f"\n✅ Results saved to: {output_file}")
        return True
        
    except Exception as e:
        print(f"❌ Error during extraction: {e}")
        return False


def test_pdf_reading(pdf_path: str):
    """Test PDF text extraction."""
    print(f"\nTesting PDF Text Extraction")
    print("=" * 50)
    
    if not Path(pdf_path).exists():
        print(f"❌ PDF file not found: {pdf_path}")
        return False
    
    try:
        text = extract_text_from_pdf(pdf_path)
        
        if not text.strip():
            print("❌ No text extracted from PDF")
            return False
        
        print(f"✅ Successfully extracted {len(text)} characters")
        print(f"First 200 characters: {text[:200]}...")
        
        return True
        
    except Exception as e:
        print(f"❌ Error reading PDF: {e}")
        return False


def test_database_connection():
    """Test Supabase database connection."""
    print(f"\nTesting Database Connection")
    print("=" * 50)
    
    try:
        from extract_and_upload import get_supabase_client
        
        # Check environment variables
        if not os.getenv("SUPABASE_URL"):
            print("❌ SUPABASE_URL not found in environment variables")
            return False
        
        if not os.getenv("SUPABASE_SERVICE_KEY"):
            print("❌ SUPABASE_SERVICE_KEY not found in environment variables")
            return False
        
        print("✅ Supabase credentials found")
        
        # Test connection
        supabase = get_supabase_client()
        
        # Try to query the paper_questions table
        result = supabase.table("paper_questions").select("id").limit(1).execute()
        
        print("✅ Database connection successful")
        print(f"✅ paper_questions table accessible")
        
        return True
        
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False


def main():
    print("PDF Question Extractor - Test Suite")
    print("=" * 50)
    
    # Check environment
    print("\nChecking Environment...")
    print("-" * 30)
    
    env_vars = {
        "OPENAI_API_KEY": "OpenAI API Key",
        "SUPABASE_URL": "Supabase URL",
        "SUPABASE_SERVICE_KEY": "Supabase Service Key"
    }
    
    all_env_set = True
    for var, name in env_vars.items():
        if os.getenv(var):
            print(f"✅ {name}: Set")
        else:
            print(f"⚠️  {name}: Not set (optional for some features)")
            if var == "OPENAI_API_KEY":
                all_env_set = False
    
    # Run tests
    print("\n" + "=" * 50)
    print("Running Tests...")
    print("=" * 50)
    
    # Test 1: AI extraction
    ai_success = test_ai_extraction()
    
    # Test 2: Database connection (if credentials available)
    db_success = test_database_connection() if os.getenv("SUPABASE_URL") else None
    
    # Test 3: PDF reading (if PDF provided)
    pdf_success = None
    if len(sys.argv) > 1:
        pdf_path = sys.argv[1]
        if Path(pdf_path).exists() and pdf_path.endswith('.pdf'):
            pdf_success = test_pdf_reading(pdf_path)
    
    # Summary
    print("\n" + "=" * 50)
    print("Test Summary")
    print("=" * 50)
    
    results = [
        ("AI Extraction", ai_success),
        ("Database Connection", db_success),
        ("PDF Reading", pdf_success)
    ]
    
    for test_name, success in results:
        if success is True:
            print(f"✅ {test_name}: PASSED")
        elif success is False:
            print(f"❌ {test_name}: FAILED")
        else:
            print(f"⏭️  {test_name}: SKIPPED")
    
    print("\nNext steps:")
    if ai_success:
        print("- ✅ AI extraction is working")
        print("- You can now process your actual PDFs")
    else:
        print("- Set up your OpenAI API key in .env file")
    
    if db_success:
        print("- ✅ Database connection is working")
        print("- You can upload directly to the database")
    elif db_success is False:
        print("- Check your Supabase credentials")
        print("- Ensure you're using the service_role key")
    
    if pdf_success is False:
        print("- Install PDF libraries: pip install pdfplumber PyMuPDF")


if __name__ == "__main__":
    main()
