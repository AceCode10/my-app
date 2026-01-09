# Troubleshooting Guide

## Common Issues and Solutions

### Installation & Setup

#### "No PDF library available"
**Error:** `ImportError: No PDF library available. Install pdfplumber or PyMuPDF`

**Solution:**
```bash
pip install pdfplumber PyMuPDF
```

#### "OpenAI library not installed"
**Error:** `ImportError: OpenAI library not installed`

**Solution:**
```bash
pip install openai
```

#### "Supabase library not installed"
**Error:** `ImportError: Supabase library not installed`

**Solution:**
```bash
pip install supabase
```

### API Keys & Authentication

#### "OpenAI API key not found"
**Error:** `ValueError: OpenAI API key not found`

**Solutions:**
1. Create `.env` file in `scripts/pdf-extractor/` directory
2. Add your API key: `OPENAI_API_KEY=sk-your-key-here`
3. Ensure the key starts with `sk-`
4. Check that the `.env` file is not ignored by git

#### "Supabase credentials not found"
**Error:** `ValueError: Supabase credentials not found`

**Solutions:**
1. Get credentials from Supabase Dashboard → Project Settings → API
2. Add to `.env` file:
   ```bash
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_KEY=eyJ...your-service-role-key
   ```
3. Use the `service_role` key, not the `anon` key

### PDF Processing

#### "No text extracted from PDF"
**Error:** Extracted text is empty

**Solutions:**
1. Check if PDF is scanned (image-based) - need OCR
2. Try different PDF library:
   ```bash
   pip install pdfplumber  # or PyMuPDF
   ```
3. Open PDF manually and verify it contains selectable text
4. Try copying text manually from PDF

#### "PDF file not found"
**Error:** File path is incorrect

**Solutions:**
1. Use absolute paths
2. Check file extension is `.pdf`
3. Verify file exists:
   ```bash
   ls -la /path/to/your/file.pdf
   ```

### AI Extraction

#### "No questions extracted"
**Error:** AI returns empty array

**Solutions:**
1. Check if text contains actual questions
2. Ensure text is in English
3. Try with shorter text (under 25,000 characters)
4. Check OpenAI API credits
5. Verify API key is valid and active

#### "Invalid JSON format"
**Error:** AI response cannot be parsed as JSON

**Solutions:**
1. This is usually temporary - try again
2. Check OpenAI API status
3. Try with cleaner text input
4. Report if issue persists

### Database Upload

#### "RLS policy violation"
**Error:** `new row violates row-level security policy`

**Solutions:**
1. Use `service_role` key, not `anon` key
2. Check if `paper_questions` table exists
3. Verify you have admin permissions
4. Run the migration if table doesn't exist

#### "Table does not exist"
**Error:** `relation "paper_questions" does not exist`

**Solutions:**
1. Run the migration: `supabase db push`
2. Or run SQL manually from migration files
3. Check table exists in Supabase Dashboard

#### "Foreign key violation"
**Error:** `insert or update on table violates foreign key constraint`

**Solutions:**
1. Verify `paper_id` exists in `past_papers` table
2. Check `subject_id` is valid if using auto-creation
3. Ensure UUIDs are properly formatted

### Web Interface

#### "Extraction Failed" in UI
**Error:** AI extraction fails in web interface

**Solutions:**
1. Check browser console for errors
2. Verify `OPENAI_API_KEY` is set in environment
3. Check Next.js API route is working
4. Try with smaller text content

#### "Upload failed" error
**Error:** Cannot upload extracted questions

**Solutions:**
1. Check Supabase credentials in environment
2. Verify `SUPABASE_SERVICE_KEY` is set
3. Check network connection
4. Look at server logs for detailed error

### Performance Issues

#### Slow extraction
**Problem:** AI extraction takes too long

**Solutions:**
1. Limit text to under 25,000 characters
2. Process PDFs in batches
3. Use faster model (gpt-3.5-turbo) for testing
4. Check internet connection

#### Memory errors
**Problem:** Script runs out of memory

**Solutions:**
1. Process one PDF at a time
2. Increase system RAM
3. Use streaming for large files
4. Clear cache between files

### Debug Mode

Enable verbose logging to troubleshoot:

```bash
# Python script with debug output
python extract_and_upload.py --pdf test.pdf --output test.json --verbose

# Check API response
python test_extraction.py

# Test database connection
python -c "from extract_and_upload import get_supabase_client; print(get_supabase_client())"
```

### Getting Help

1. **Check logs:** Look at error messages carefully
2. **Test components:** Use `test_extraction.py` to isolate issues
3. **Verify environment:** Check all environment variables
4. **Start simple:** Test with a small PDF first
5. **Check documentation:** Review API reference and setup guide

### Common Mistakes

1. **Using anon key instead of service role key**
2. **Missing .env file or wrong directory**
3. **PDF is scanned (image-based)**
4. **Text exceeds 25,000 character limit**
5. **Forgot to install dependencies**
6. **Wrong file paths or permissions**
7. **Invalid UUID format for paper_id/subject_id**
