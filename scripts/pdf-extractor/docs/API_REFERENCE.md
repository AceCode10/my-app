# API Reference

## extract_and_upload.py

### Functions

#### `extract_text_from_pdf(pdf_path: str) -> str`
Extracts text from a PDF file using available PDF libraries.

**Parameters:**
- `pdf_path` (str): Path to the PDF file

**Returns:**
- `str`: Extracted text content

**Raises:**
- `ImportError`: If no PDF library is installed

**Example:**
```python
text = extract_text_from_pdf("exam_paper.pdf")
```

#### `extract_questions_with_ai(text: str, api_key: Optional[str] = None) -> List[ExtractedQuestion]`
Uses OpenAI GPT-4 to extract questions from exam paper text.

**Parameters:**
- `text` (str): The text content from the PDF
- `api_key` (str, optional): OpenAI API key (defaults to environment variable)

**Returns:**
- `List[ExtractedQuestion]`: List of extracted question objects

**Raises:**
- `ImportError`: If OpenAI library is not installed
- `ValueError`: If API key is not found

**Example:**
```python
questions = extract_questions_with_ai(pdf_text)
```

#### `process_pdf(pdf_path: str, paper_id: Optional[str] = None, ...) -> Dict[str, Any]`
Processes a single PDF file: extracts text, uses AI to extract questions, optionally uploads to database.

**Parameters:**
- `pdf_path` (str): Path to PDF file
- `paper_id` (str, optional): Paper ID for database upload
- `subject_id` (str, optional): Subject ID for auto-creating papers
- `api_key` (str, optional): OpenAI API key
- `upload` (bool): Whether to upload to database
- `replace_existing` (bool): Whether to replace existing questions

**Returns:**
- `Dict[str, Any]`: Result dictionary with success status and extracted questions

**Example:**
```python
result = process_pdf("paper.pdf", paper_id="uuid", upload=True)
```

#### `process_directory(input_dir: str, output_dir: Optional[str] = None, ...) -> List[Dict[str, Any]]`
Processes all PDF files in a directory.

**Parameters:**
- `input_dir` (str): Directory containing PDF files
- `output_dir` (str, optional): Directory to save JSON outputs
- `subject_id` (str, optional): Subject ID for auto-creating papers
- `api_key` (str, optional): OpenAI API key
- `upload` (bool): Whether to upload to database

**Returns:**
- `List[Dict[str, Any]]`: List of results for each PDF

**Example:**
```python
results = process_directory("./pdfs", upload=True, subject_id="uuid")
```

### Data Classes

#### `ExtractedQuestion`
Represents a single extracted question.

**Fields:**
- `question_number` (int): Question number
- `question_text` (str): Full question text
- `question_type` (str): Type of question (mcq, short_answer, etc.)
- `marks` (int): Number of marks
- `difficulty` (str): Difficulty level (easy, medium, hard)
- `correct_answer` (str): Correct answer or model answer
- `mark_scheme` (str): Marking criteria
- `examiner_tips` (str): Tips for students
- `options` (List[Dict]): MCQ options (for MCQ questions)
- `section_name` (str): Section name (e.g., "Section A")
- `part_label` (str): Part label (e.g., "a", "b")
- `image_url` (str): URL to question image
- `topic_tags` (List[str]): Topic tags

#### `MCQOption`
Represents a multiple choice option.

**Fields:**
- `label` (str): Option label (A, B, C, D)
- `text` (str): Option text
- `is_correct` (bool): Whether this is the correct answer

## batch_process.py

### Functions

#### `load_config(config_path: str) -> Dict[str, Any]`
Loads configuration from JSON file.

#### `create_sample_config()`
Creates a sample configuration file.

#### `process_exam_board(board_name: str, board_config: Dict, settings: Dict) -> Dict[str, Any]`
Processes all subjects for an exam board.

## test_extraction.py

### Functions

#### `test_ai_extraction() -> bool`
Tests AI extraction with sample text.

#### `test_pdf_reading(pdf_path: str) -> bool`
Tests PDF text extraction.

#### `test_database_connection() -> bool`
Tests Supabase database connection.

## API Routes

### POST `/api/papers/[id]/extract-questions`
Extracts questions from PDF text and uploads to database.

**Request Body:**
- `text` (string): PDF text content
- `replace` (string): "true" to replace existing questions

**Response:**
```json
{
  "success": true,
  "message": "Successfully extracted and imported X questions",
  "count": X,
  "questions": [...]
}
```

**Example:**
```javascript
const formData = new FormData();
formData.append('text', pdfText);
formData.append('replace', 'false');

const response = await fetch(`/api/papers/${paperId}/extract-questions`, {
  method: 'POST',
  body: formData
});
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | ✅ Yes | OpenAI API key for AI extraction |
| `SUPABASE_URL` | ⚠️ For upload | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | ⚠️ For upload | Supabase service role key |

## Error Codes

| Code | Description |
|------|-------------|
| `NO_PDF_LIBRARY` | No PDF library installed |
| `NO_API_KEY` | OpenAI API key not found |
| `NO_TEXT_EXTRACTED` | No text extracted from PDF |
| `NO_QUESTIONS_FOUND` | No questions extracted |
| `DATABASE_ERROR` | Database operation failed |
| `INVALID_JSON` | Invalid JSON format |
| `UPLOAD_FAILED` | Failed to upload to database |
