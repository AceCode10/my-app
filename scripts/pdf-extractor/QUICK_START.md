# 🚀 Quick Start Guide

Get your PDF question extraction system running in under 5 minutes!

## ⚡ Option 1: Web Interface (Easiest)

1. **Go to Admin Dashboard**
   - Navigate to: `Admin → Past Papers → [Select Paper] → Questions`

2. **Click "AI Extract (PDF)"**
   - Purple/blue button with sparkles icon

3. **Copy & Paste**
   - Open your PDF exam paper
   - Select all text (Ctrl+A)
   - Copy (Ctrl+C)
   - Paste into the text area

4. **Extract!**
   - Click "Extract Questions"
   - AI does everything automatically

## 🐍 Option 2: Python Script (For Automation)

### 1. Install Dependencies
```bash
cd scripts/pdf-extractor
pip install -r requirements.txt
```

### 2. Set API Key
```bash
# Create .env file
echo "OPENAI_API_KEY=sk-your-key-here" > .env
```

### 3. Extract Questions
```bash
# Extract to JSON
python extract_and_upload.py --pdf exam.pdf --output questions.json

# Extract and upload to database
python extract_and_upload.py --pdf exam.pdf --paper-id "uuid" --upload
```

## 📦 Option 3: Batch Processing (For Many PDFs)

### 1. Create Configuration
```bash
python batch_process.py --create-config
```

### 2. Edit Configuration
Edit `batch_config.json` with your subject IDs and PDF folders.

### 3. Run Batch
```bash
python batch_process.py --config batch_config.json
```

## 🔧 Test Your Setup

```bash
# Test everything is working
python test_extraction.py

# Test with your PDF
python test_extraction.py your_exam_paper.pdf
```

## 📁 Organize PDFs Like This

```
pdfs/
├── cambridge/
│   ├── igcse/
│   │   ├── chemistry/
│   │   │   ├── 0620_s23_qp_12.pdf
│   │   │   └── 0620_w23_qp_22.pdf
│   │   ├── physics/
│   │   └── biology/
│   └── a-level/
└── edexcel/
    └── igcse/
```

## ✅ What You Need

- **OpenAI API Key**: Required for AI extraction (uses affordable GPT-3.5-turbo)
- **Supabase Credentials**: Only if uploading directly to database
- **PDF Exam Papers**: Your actual exam papers

## 💰 Cost Info

Uses **GPT-3.5-turbo** at just $0.50/1M tokens:
- ~$0.01-0.05 per exam paper
- ~100 papers for $1-5
- 10x cheaper than GPT-4

## 🎯 What It Does

✅ Extracts ALL questions from PDFs  
✅ Identifies question types (MCQ, structured, essay)  
✅ Extracts marks for each question  
✅ Handles sub-parts (a, b, c)  
✅ Detects sections (Section A, Section B)  
✅ Uploads directly to database  
✅ Processes hundreds of PDFs automatically  

## 🚨 Common Issues

**"No API key"** → Set `OPENAI_API_KEY` in `.env`  
**"Can't read PDF"** → Install: `pip install pdfplumber PyMuPDF`  
**"Database error"** → Check Supabase credentials and permissions  

## 🎉 You're Ready!

Choose the option that works best for you and start extracting questions from your exam papers!
