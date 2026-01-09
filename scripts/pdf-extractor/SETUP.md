# Setup Guide for PDF Question Extractor

## 🎯 Overview

This guide walks you through setting up the automated PDF question extraction system for your IGCSE exam papers.

## ⚡ Quick Setup (5 minutes)

### 1. Install Python Dependencies

```bash
cd scripts/pdf-extractor
pip install -r requirements.txt
```

### 2. Get OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new API key
3. Copy the key (starts with `sk-`)

### 3. Configure Environment

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` and add your API key:
```bash
OPENAI_API_KEY=sk-your-actual-api-key-here
```

### 4. Test the Setup

```bash
# Test with a sample PDF (if you have one)
python extract_and_upload.py --pdf test.pdf --output test.json

# Or test the web interface
# Go to: Admin → Past Papers → [Select Paper] → Questions → "AI Extract (PDF)"
```

## 🔧 Complete Setup (For Database Upload)

To enable direct database uploads:

### 1. Get Supabase Credentials

1. Go to your Supabase Dashboard
2. Select your project
3. Go to **Project Settings → API**
4. Copy:
   - **Project URL** (e.g., `https://your-project.supabase.co`)
   - **service_role** key (not the anon key)

### 2. Update .env File

```bash
OPENAI_API_KEY=sk-your-openai-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJ...your-service-role-key
```

### 3. Test Database Connection

```bash
python extract_and_upload.py --pdf test.pdf --paper-id "your-paper-uuid" --upload
```

## 📋 Required Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | ✅ Yes | OpenAI API key for AI extraction |
| `SUPABASE_URL` | ⚠️ For upload | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | ⚠️ For upload | Supabase service role key |

## 🔍 Troubleshooting

### Common Issues

**"No PDF library available"**
```bash
pip install pdfplumber PyMuPDF
```

**"OpenAI API key not found"**
- Check that `.env` file exists in `scripts/pdf-extractor/`
- Verify API key is correct and starts with `sk-`

**"Supabase credentials not found"**
- Ensure you're using the `service_role` key, not `anon` key
- Check that URL includes `https://`

**"RLS policy violation"**
- Make sure you're using the service role key
- Check that the `paper_questions` table exists

### Debug Mode

Add debug output to see what's happening:
```bash
python extract_and_upload.py --pdf test.pdf --output test.json --verbose
```

## 🚀 Next Steps

1. **Test with a real PDF**: Try extracting from an actual exam paper
2. **Set up batch processing**: Use `batch_process.py` for multiple files
3. **Organize your PDFs**: Follow the folder structure in README.md
4. **Automate**: Set up scheduled runs for regular updates

## 📞 Support

If you encounter issues:

1. Check the error messages above
2. Verify all environment variables are set
3. Ensure you have the correct API keys
4. Check that your Supabase permissions allow writes to `paper_questions`

## 🎉 You're Ready!

Once setup is complete, you can:
- Extract questions from any PDF exam paper
- Upload directly to your database
- Process hundreds of papers automatically
- Use the web interface for quick extractions
