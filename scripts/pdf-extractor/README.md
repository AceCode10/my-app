# PDF Question Extractor & Uploader

Automated tools for extracting questions from PDF exam papers using AI and uploading them directly to the database.

## 🚀 Quick Start (Recommended: Web Interface)

The easiest way to extract questions is through the **Admin Interface**:

1. Go to **Admin → Past Papers → [Select Paper] → Questions**
2. Click the **"AI Extract (PDF)"** button
3. Open your PDF, copy all text (Ctrl+A, Ctrl+C)
4. Paste into the text area
5. Click **"Extract Questions"** - AI does the rest!

This uses GPT-3.5-turbo (10x cheaper than GPT-4) to automatically:
- Identify all questions and sub-parts
- Detect question types (MCQ, short answer, structured, essay)
- Extract marks for each question
- Structure MCQ options correctly
- Import directly to the database

## 🐍 Python Script (For Batch Processing)

For processing multiple PDFs or automating the workflow:

### 1. Install Dependencies

```bash
cd scripts/pdf-extractor
pip install -r requirements.txt
```

### 2. Set Environment Variables

Create a `.env` file in the `scripts/pdf-extractor` folder:

```bash
OPENAI_API_KEY=your-openai-api-key
SUPABASE_URL=your-supabase-project-url
SUPABASE_SERVICE_KEY=your-supabase-service-role-key
```

### 3. Usage Examples

**Extract and save to JSON:**
```bash
python extract_and_upload.py --pdf "chemistry_2023_mj_p1.pdf" --output "questions.json"
```

**Extract and upload directly to a paper:**
```bash
python extract_and_upload.py --pdf "chemistry_2023_mj_p1.pdf" --paper-id "uuid-of-paper" --upload
```

**Batch process a folder with auto paper creation:**
```bash
python extract_and_upload.py --input-dir "./pdfs/chemistry" --subject-id "uuid" --upload
```

**Replace existing questions:**
```bash
python extract_and_upload.py --pdf "paper.pdf" --paper-id "uuid" --upload --replace
```

## 📁 Organizing PDF Files

For batch processing, organize PDFs by subject:

```
pdfs/
├── chemistry/
│   ├── 0620_s23_qp_12.pdf
│   ├── 0620_w23_qp_22.pdf
│   └── ...
├── physics/
│   └── ...
└── biology/
    └── ...
```

The script extracts metadata from filenames:
- **Year**: `2023`, `23` → 2023
- **Session**: `mj`, `s`, `may` → May/June; `on`, `w`, `nov` → Oct/Nov
- **Paper**: `p1`, `paper1`, `qp_12` → Paper 1

## 📋 Import to Application (Manual JSON Import)

If you prefer manual JSON import:

1. Go to Admin Dashboard → **Past Papers → [Paper] → Questions**
2. Click **"Bulk Import"**
3. Paste your JSON
4. Click **"Import Questions"**

## 📦 Batch Processing (For Large Volumes)

For processing hundreds of PDFs across multiple subjects:

### 1. Create Configuration

```bash
python batch_process.py --create-config
```

This creates `batch_config.json` - edit it with your subject IDs and PDF directories.

### 2. Run Batch Processing

```bash
python batch_process.py --config batch_config.json
```

### 3. Review Results

Results are saved to `batch_results.json` with:
- Total PDFs processed
- Questions extracted per subject
- Any errors encountered

## 📁 Organizing Your PDF Files

For efficient processing, organize your PDFs like this:

```
pdfs/
├── cambridge/
│   ├── igcse/
│   │   ├── chemistry/
│   │   │   ├── topical/
│   │   │   │   ├── Topic1_Atoms.pdf
│   │   │   │   ├── Topic2_Bonding.pdf
│   │   │   │   └── ...
│   │   │   └── papers/
│   │   │       ├── 2023_MJ_Paper1.pdf
│   │   │       ├── 2023_ON_Paper2.pdf
│   │   │       └── ...
│   │   ├── physics/
│   │   │   └── ...
│   │   └── ...
│   └── as-level/
│       └── ...
├── edexcel/
│   └── ...
└── ib/
    └── ...
```

## JSON Format

The extractor outputs questions in this format:

```json
[
  {
    "question_number": "1",
    "question_text": "What is the chemical formula for water?",
    "question_type": "short_answer",
    "marks": 2,
    "difficulty": "easy",
    "correct_answer": "H2O",
    "mark_scheme": "Award 1 mark for correct formula.",
    "examiner_tips": "Common mistakes: H2O2"
  },
  {
    "question_number": "2",
    "question_text": "Which of the following is a noble gas?",
    "question_type": "mcq",
    "marks": 1,
    "options": [
      { "label": "A", "text": "Oxygen", "is_correct": false },
      { "label": "B", "text": "Argon", "is_correct": true },
      { "label": "C", "text": "Nitrogen", "is_correct": false },
      { "label": "D", "text": "Carbon", "is_correct": false }
    ],
    "correct_answer": "B"
  }
]
```

## Supported Question Types

| Type | Description | Example |
|------|-------------|---------|
| `mcq` | Multiple choice | A/B/C/D options |
| `short_answer` | Brief written response | 1-2 sentence answers |
| `structured` | Multi-part questions | (a), (b), (c) parts |
| `essay` | Extended response | 6+ mark questions |
| `true_false` | True/False questions | Boolean answers |
| `numeric` | Calculation questions | Numerical answers |

## Workflow Automation

### Option 1: Manual Process

1. Extract text from PDF using this script
2. Review and edit the JSON output
3. Add correct answers and mark schemes manually
4. Import via the Bulk Import page

### Option 2: AI-Assisted (Recommended)

1. Run extraction with `--ai-extract` flag
2. AI will attempt to identify question types, marks, and structure
3. Review the output for accuracy
4. Import via the Bulk Import page

### Option 3: Batch Processing Script

Create a batch script for your specific folder structure:

```bash
#!/bin/bash
# process_all.sh

SUBJECTS=("chemistry" "physics" "biology" "mathematics")

for subject in "${SUBJECTS[@]}"; do
    echo "Processing $subject..."
    python extract_questions.py \
        --input-dir "./pdfs/cambridge/igcse/$subject/topical" \
        --output-dir "./json/cambridge/igcse/$subject/topical" \
        --ai-extract
done

echo "Done! Check the ./json folder for output files."
```

## Tips for Best Results

### PDF Quality
- Use clear, text-based PDFs (not scanned images)
- OCR scanned PDFs first using Adobe Acrobat or similar

### AI Extraction
- Works best for standard exam paper formats
- May struggle with complex diagrams or tables
- Always review and verify the output

### Manual Cleanup
- Add correct answers from mark schemes
- Verify marks are correct
- Add examiner tips from examiner reports

### Importing
- Import topic-by-topic for easier management
- Use validation to catch errors before import
- Keep original PDFs as reference

## Troubleshooting

**No text extracted from PDF:**
- PDF might be scanned/image-based
- Try OCR software first

**Questions not detected:**
- Check if PDF uses non-standard numbering
- Try AI-powered extraction with `--ai-extract` flag

**Import fails:**
- Check JSON syntax is valid
- Ensure all required fields are present
- Check database constraints

## 💰 Cost Comparison

Since you're extracting text from PDFs (not scanning images), you can use the most affordable model:

| Model | Cost per 1M tokens | Typical cost per exam paper |
|-------|-------------------|---------------------------|
| **GPT-3.5-turbo** (recommended) | $0.50 | ~$0.01-0.05 |
| GPT-4 | $5.00 | ~$0.10-0.50 |
| GPT-4-turbo | $10.00 | ~$0.20-1.00 |

**Why GPT-3.5-turbo is perfect for this use case:**
- ✅ Excellent at text extraction and structuring
- ✅ 10x cheaper than GPT-4
- ✅ Faster response times
- ✅ Perfect for exam paper text (no images to analyze)

**Estimated monthly costs:**
- 100 exam papers: ~$1-5
- 500 exam papers: ~$5-25
- 1000 exam papers: ~$10-50

## Environment Variables

```bash
# For AI extraction
OPENAI_API_KEY=your-openai-api-key

# Optional: Custom model (defaults to gpt-3.5-turbo for affordability)
OPENAI_MODEL=gpt-3.5-turbo
```

## Support

For issues or feature requests, contact the development team.
