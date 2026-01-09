#!/usr/bin/env python3
"""
Monitor Script for PDF Question Extraction

This script monitors a directory for new PDF files and automatically
processes them using the extraction system.
"""

import os
import sys
import time
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any
import argparse

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

try:
    from extract_and_upload import process_pdf, process_directory
except ImportError as e:
    print(f"Error: Could not import extract_and_upload module: {e}")
    sys.exit(1)


class PDFMonitor:
    """Monitors a directory for new PDF files and processes them."""
    
    def __init__(self, watch_dir: str, output_dir: str = "./output", 
                 processed_log: str = "./processed_files.json"):
        self.watch_dir = Path(watch_dir)
        self.output_dir = Path(output_dir)
        self.processed_log = Path(processed_log)
        self.processed_files = self.load_processed_log()
        
        # Create directories if they don't exist
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.processed_log.parent.mkdir(parents=True, exist_ok=True)
    
    def load_processed_log(self) -> Dict[str, Any]:
        """Load the log of processed files."""
        if self.processed_log.exists():
            with open(self.processed_log, 'r') as f:
                return json.load(f)
        return {"processed": {}, "failed": {}}
    
    def save_processed_log(self):
        """Save the log of processed files."""
        with open(self.processed_log, 'w') as f:
            json.dump(self.processed_files, f, indent=2)
    
    def is_processed(self, file_path: Path) -> bool:
        """Check if a file has already been processed."""
        file_key = str(file_path.relative_to(self.watch_dir))
        return file_key in self.processed_files["processed"]
    
    def mark_processed(self, file_path: Path, result: Dict[str, Any]):
        """Mark a file as processed."""
        file_key = str(file_path.relative_to(self.watch_dir))
        self.processed_files["processed"][file_key] = {
            "timestamp": datetime.now().isoformat(),
            "result": result
        }
        self.save_processed_log()
    
    def mark_failed(self, file_path: Path, error: str):
        """Mark a file as failed."""
        file_key = str(file_path.relative_to(self.watch_dir))
        self.processed_files["failed"][file_key] = {
            "timestamp": datetime.now().isoformat(),
            "error": error
        }
        self.save_processed_log()
    
    def find_new_pdfs(self) -> List[Path]:
        """Find all PDF files that haven't been processed."""
        pdf_files = list(self.watch_dir.rglob("*.pdf"))
        new_files = [f for f in pdf_files if not self.is_processed(f)]
        return new_files
    
    def process_file(self, file_path: Path, **kwargs) -> bool:
        """Process a single PDF file."""
        print(f"\n📄 Processing: {file_path.name}")
        print("-" * 50)
        
        try:
            # Process the PDF
            result = process_pdf(str(file_path), **kwargs)
            
            if result.get("success"):
                print(f"✅ Success: Extracted {result.get('count', 0)} questions")
                
                # Save output if specified
                if "output_dir" in kwargs and result.get("questions"):
                    output_file = self.output_dir / f"{file_path.stem}_questions.json"
                    questions_dict = []
                    for q in result["questions"]:
                        d = q.__dict__.copy()
                        if d.get("options") is None:
                            del d["options"]
                        if d.get("topic_tags") is None:
                            del d["topic_tags"]
                        questions_dict.append(d)
                    
                    with open(output_file, 'w', encoding='utf-8') as f:
                        json.dump(questions_dict, f, indent=2, ensure_ascii=False)
                    print(f"💾 Saved to: {output_file}")
                
                # Mark as processed
                self.mark_processed(file_path, result)
                return True
            else:
                error = result.get("error", "Unknown error")
                print(f"❌ Failed: {error}")
                self.mark_failed(file_path, error)
                return False
                
        except Exception as e:
            error = str(e)
            print(f"❌ Error: {error}")
            self.mark_failed(file_path, error)
            return False
    
    def process_all(self, **kwargs):
        """Process all unprocessed PDF files."""
        new_files = self.find_new_pdfs()
        
        if not new_files:
            print("📭 No new PDF files found")
            return
        
        print(f"🔍 Found {len(new_files)} new PDF files")
        
        success_count = 0
        for file_path in new_files:
            if self.process_file(file_path, **kwargs):
                success_count += 1
        
        print(f"\n📊 Summary: {success_count}/{len(new_files)} files processed successfully")
    
    def watch(self, interval: int = 30, **kwargs):
        """Watch directory for new files and process them automatically."""
        print(f"👀 Watching directory: {self.watch_dir}")
        print(f"⏱️  Check interval: {interval} seconds")
        print("Press Ctrl+C to stop")
        
        try:
            while True:
                self.process_all(**kwargs)
                print(f"\n⏳ Waiting {interval} seconds...")
                time.sleep(interval)
        except KeyboardInterrupt:
            print("\n👋 Stopping monitor...")
    
    def status(self):
        """Show status of processed and failed files."""
        print("\n📊 Processing Status")
        print("=" * 50)
        
        processed_count = len(self.processed_files["processed"])
        failed_count = len(self.processed_files["failed"])
        
        print(f"✅ Successfully processed: {processed_count} files")
        print(f"❌ Failed: {failed_count} files")
        
        if failed_count > 0:
            print("\nFailed files:")
            for file_key, info in self.processed_files["failed"].items():
                print(f"  - {file_key}: {info['error']}")
        
        total_questions = sum(
            result.get("result", {}).get("count", 0) 
            for result in self.processed_files["processed"].values()
        )
        print(f"\n📝 Total questions extracted: {total_questions}")


def main():
    parser = argparse.ArgumentParser(
        description="Monitor directory for PDF files and auto-extract questions",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Process all files once
  python monitor.py --dir ./pdfs --process-once
  
  # Watch directory continuously
  python monitor.py --dir ./pdfs --watch --interval 60
  
  # Process and upload to database
  python monitor.py --dir ./pdfs --upload --subject-id "uuid"
  
  # Show status
  python monitor.py --dir ./pdfs --status
        """
    )
    
    parser.add_argument("--dir", required=True, help="Directory to monitor")
    parser.add_argument("--output", default="./output", help="Output directory")
    parser.add_argument("--log", default="./processed_files.json", help="Processed files log")
    
    # Processing options
    parser.add_argument("--process-once", action="store_true", help="Process all files once and exit")
    parser.add_argument("--watch", action="store_true", help="Watch directory continuously")
    parser.add_argument("--interval", type=int, default=30, help="Watch interval in seconds")
    
    # Extraction options
    parser.add_argument("--upload", action="store_true", help="Upload to database")
    parser.add_argument("--subject-id", help="Subject ID for auto-creating papers")
    parser.add_argument("--replace", action="store_true", help="Replace existing questions")
    
    # Other options
    parser.add_argument("--status", action="store_true", help="Show processing status")
    parser.add_argument("--reset", action="store_true", help="Reset processed files log")
    
    args = parser.parse_args()
    
    # Initialize monitor
    monitor = PDFMonitor(args.dir, args.output, args.log)
    
    # Reset log if requested
    if args.reset:
        monitor.processed_files = {"processed": {}, "failed": {}}
        monitor.save_processed_log()
        print("✅ Reset processed files log")
        return
    
    # Show status if requested
    if args.status:
        monitor.status()
        return
    
    # Prepare processing options
    process_kwargs = {}
    if args.upload:
        process_kwargs["upload"] = True
        if args.subject_id:
            process_kwargs["subject_id"] = args.subject_id
        process_kwargs["replace_existing"] = args.replace
    
    # Run appropriate mode
    if args.process_once:
        monitor.process_all(**process_kwargs)
    elif args.watch:
        monitor.watch(args.interval, **process_kwargs)
    else:
        print("Please specify either --process-once or --watch")
        parser.print_help()


if __name__ == "__main__":
    main()
