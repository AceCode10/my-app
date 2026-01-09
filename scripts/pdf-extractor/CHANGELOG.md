# Changelog

All notable changes to the PDF Question Extractor will be documented in this file.

## [2.0.0] - 2025-01-03

### 🎉 Major New Features
- **AI-Powered Extraction**: Integrated OpenAI GPT-4 for intelligent question extraction
- **Direct Database Upload**: Added Supabase integration for direct uploads to paper_questions table
- **Web Interface**: Added PDF upload dialog in admin panel with AI extraction
- **Batch Processing**: New batch_process.py for processing hundreds of PDFs automatically
- **Auto Paper Creation**: Automatically create papers from filename metadata

### ✨ Improvements
- Better question type detection (MCQ, structured, essay, calculation, true_false)
- Automatic marks extraction from question text
- Support for sub-parts (a, b, c) and sections
- Improved error handling and validation
- Progress indicators and status updates

### 🐛 Fixes
- Fixed undefined `isAuthenticated` variable in SubjectsGrid component
- Fixed Next.js params Promise unwrapping in dynamic routes
- Fixed RLS policies for public access to subjects, topics, and questions

### 📚 Documentation
- Complete README rewrite with clear usage examples
- Added QUICK_START.md for rapid onboarding
- Added SETUP.md with detailed configuration guide
- Added test_extraction.py for validation

### 🔧 Technical Changes
- Added OpenAI API integration
- Added Supabase client integration
- Created API route `/api/papers/[id]/extract-questions`
- Enhanced admin UI with PDF upload functionality
- Improved JSON validation and error messages

---

## [1.0.0] - 2024-12-XX

### 🎉 Initial Release
- Basic PDF text extraction using pdfplumber and PyMuPDF
- Regex-based question parsing
- JSON output for bulk import
- Command-line interface
- Support for multiple PDF formats

### ✨ Features
- Extract text from PDF files
- Parse question structures using regex patterns
- Support for MCQ, short answer, and structured questions
- Batch processing of multiple PDFs
- JSON output compatible with bulk import

### 📚 Documentation
- Basic README with installation instructions
- Usage examples for command-line interface
