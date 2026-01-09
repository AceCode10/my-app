# Examples Directory

This directory contains example files to help you get started with the PDF Question Extractor.

## Files

### `sample_config.json`
Example configuration file for batch processing. Shows how to:
- Structure exam boards and subjects
- Define PDF directories
- Set processing options

**Usage:**
```bash
cp sample_config.json ../batch_config.json
# Edit the file with your actual subject IDs and paths
python batch_process.py --config batch_config.json
```

### `sample_output.json`
Example output from the AI extraction system. Shows:
- Proper JSON structure
- Question types (MCQ, structured, calculation, short_answer)
- MCQ options with correct answers
- Section and part labels
- Marks and difficulty levels

**Usage:**
- Use as reference for manual JSON creation
- Test the bulk import functionality
- Understand the expected output format

## Quick Test

1. **Test AI Extraction:**
   ```bash
   cd ..
   python test_extraction.py
   ```

2. **Test Bulk Import:**
   - Go to Admin → Past Papers → [Paper] → Questions
   - Copy `sample_output.json` content
   - Click "Bulk Import" and paste

3. **Test Batch Processing:**
   ```bash
   cp examples/sample_config.json batch_config.json
   # Edit with your actual data
   python batch_process.py --config batch_config.json
   ```

## Tips

- Replace `00000000-0000-0000-0000-000000000000` with actual subject UUIDs
- Update PDF directory paths to match your folder structure
- Adjust years and sessions as needed
- Set `upload_to_database: false` for testing without database changes
