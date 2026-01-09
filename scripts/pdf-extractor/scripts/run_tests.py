#!/usr/bin/env python3
"""
Test Runner Script

Runs all tests and provides a comprehensive health check
for the PDF Question Extractor system.
"""

import sys
import os
from pathlib import Path
import subprocess
import json

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

def run_command(cmd, description):
    """Run a command and return success status."""
    print(f"\n🔍 {description}")
    print("-" * 50)
    
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✅ PASSED")
            if result.stdout:
                print(f"Output: {result.stdout.strip()}")
            return True
        else:
            print("❌ FAILED")
            if result.stderr:
                print(f"Error: {result.stderr.strip()}")
            return False
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False

def check_environment():
    """Check environment variables and dependencies."""
    print("\n🌍 Environment Check")
    print("=" * 50)
    
    # Check required environment variables
    required_vars = {
        "OPENAI_API_KEY": "OpenAI API Key",
    }
    
    optional_vars = {
        "SUPABASE_URL": "Supabase URL",
        "SUPABASE_SERVICE_KEY": "Supabase Service Key"
    }
    
    all_good = True
    
    print("\nRequired Variables:")
    for var, name in required_vars.items():
        if os.getenv(var):
            print(f"✅ {name}: Set")
        else:
            print(f"❌ {name}: Missing (Required)")
            all_good = False
    
    print("\nOptional Variables:")
    for var, name in optional_vars.items():
        if os.getenv(var):
            print(f"✅ {name}: Set")
        else:
            print(f"⚠️  {name}: Not set (Optional)")
    
    return all_good

def check_libraries():
    """Check if required libraries are installed."""
    libraries = [
        ("pdfplumber", "PDF text extraction"),
        ("fitz", "Alternative PDF extraction (PyMuPDF)"),
        ("openai", "AI-powered extraction"),
        ("supabase", "Database upload"),
        ("dotenv", "Environment variables")
    ]
    
    print("\n📚 Library Check")
    print("=" * 50)
    
    all_installed = True
    
    for lib, description in libraries:
        try:
            __import__(lib)
            print(f"✅ {lib}: Installed ({description})")
        except ImportError:
            print(f"❌ {lib}: Not installed ({description})")
            all_installed = False
    
    return all_installed

def run_unit_tests():
    """Run unit tests for the extraction system."""
    print("\n🧪 Unit Tests")
    print("=" * 50)
    
    test_file = Path(__file__).parent.parent / "test_extraction.py"
    
    if test_file.exists():
        return run_command(f"python {test_file}", "Running extraction tests")
    else:
        print("❌ test_extraction.py not found")
        return False

def check_file_structure():
    """Check if all required files are present."""
    print("\n📁 File Structure Check")
    print("=" * 50)
    
    base_dir = Path(__file__).parent.parent
    required_files = [
        "extract_and_upload.py",
        "batch_process.py",
        "test_extraction.py",
        "requirements.txt",
        "README.md",
        ".env.example"
    ]
    
    all_present = True
    
    for file in required_files:
        file_path = base_dir / file
        if file_path.exists():
            print(f"✅ {file}: Present")
        else:
            print(f"❌ {file}: Missing")
            all_present = False
    
    # Check directories
    required_dirs = ["examples", "docs", "scripts"]
    for dir in required_dirs:
        dir_path = base_dir / dir
        if dir_path.exists():
            print(f"✅ {dir}/: Present")
        else:
            print(f"❌ {dir}/: Missing")
            all_present = False
    
    return all_present

def test_api_connection():
    """Test API connections (OpenAI and Supabase)."""
    print("\n🌐 API Connection Test")
    print("=" * 50)
    
    # Test OpenAI API
    if os.getenv("OPENAI_API_KEY"):
        try:
            from openai import OpenAI
            client = OpenAI()
            # Simple test - list models (should work with valid key)
            models = client.models.list()
            print("✅ OpenAI API: Connected")
            openai_ok = True
        except Exception as e:
            print(f"❌ OpenAI API: Failed ({str(e)[:50]}...)")
            openai_ok = False
    else:
        print("⚠️  OpenAI API: Skipped (no API key)")
        openai_ok = None
    
    # Test Supabase connection
    if os.getenv("SUPABASE_URL") and os.getenv("SUPABASE_SERVICE_KEY"):
        try:
            from extract_and_upload import get_supabase_client
            client = get_supabase_client()
            # Simple test - try to query paper_questions
            result = client.table("paper_questions").select("id").limit(1).execute()
            print("✅ Supabase: Connected")
            supabase_ok = True
        except Exception as e:
            print(f"❌ Supabase: Failed ({str(e)[:50]}...)")
            supabase_ok = False
    else:
        print("⚠️  Supabase: Skipped (no credentials)")
        supabase_ok = None
    
    return (openai_ok is not False) and (supabase_ok is not False)

def generate_report(results):
    """Generate a test report."""
    print("\n" + "=" * 60)
    print("📊 TEST REPORT SUMMARY")
    print("=" * 60)
    
    total_tests = len(results)
    passed_tests = sum(1 for r in results.values() if r is True)
    failed_tests = sum(1 for r in results.values() if r is False)
    skipped_tests = sum(1 for r in results.values() if r is None)
    
    print(f"\nTotal Tests: {total_tests}")
    print(f"✅ Passed: {passed_tests}")
    print(f"❌ Failed: {failed_tests}")
    print(f"⚠️  Skipped: {skipped_tests}")
    
    print(f"\nSuccess Rate: {(passed_tests/total_tests)*100:.1f}%")
    
    # Detailed results
    print("\nDetailed Results:")
    for test_name, result in results.items():
        if result is True:
            status = "✅ PASSED"
        elif result is False:
            status = "❌ FAILED"
        else:
            status = "⚠️  SKIPPED"
        print(f"  {status}: {test_name}")
    
    # Recommendations
    print("\n📋 Recommendations:")
    if not results.get("Environment Check"):
        print("- Set up your environment variables in .env file")
    if not results.get("Library Check"):
        print("- Install missing dependencies: pip install -r requirements.txt")
    if not results.get("File Structure"):
        print("- Ensure all required files are present")
    if not results.get("Unit Tests"):
        print("- Fix issues in test_extraction.py")
    if not results.get("API Connection"):
        print("- Check your API keys and network connection")
    
    # Save report
    report = {
        "timestamp": str(Path.cwd()),
        "summary": {
            "total": total_tests,
            "passed": passed_tests,
            "failed": failed_tests,
            "skipped": skipped_tests,
            "success_rate": (passed_tests/total_tests)*100
        },
        "details": results
    }
    
    with open("test_report.json", "w") as f:
        json.dump(report, f, indent=2)
    
    print(f"\n📄 Detailed report saved to: test_report.json")
    
    return failed_tests == 0

def main():
    print("🚀 PDF Question Extractor - Test Suite")
    print("=" * 60)
    
    # Run all tests
    results = {}
    
    results["Environment Check"] = check_environment()
    results["Library Check"] = check_libraries()
    results["File Structure"] = check_file_structure()
    results["Unit Tests"] = run_unit_tests()
    results["API Connection"] = test_api_connection()
    
    # Generate report
    success = generate_report(results)
    
    if success:
        print("\n🎉 All tests passed! Your system is ready to use.")
        sys.exit(0)
    else:
        print("\n⚠️  Some tests failed. Please check the recommendations above.")
        sys.exit(1)

if __name__ == "__main__":
    main()
