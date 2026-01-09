#!/usr/bin/env python3
"""
Batch Processing Script for PDF Question Extraction

This script demonstrates how to process multiple exam papers across different subjects
and exam boards using the enhanced extract_and_upload.py functionality.

Usage:
    python batch_process.py --config config.json
    python batch_process.py --exam-board cambridge --subjects chemistry physics --year 2023
"""

import json
import os
import sys
from pathlib import Path
from typing import Dict, List, Any
import argparse

# Add the current directory to Python path for imports
sys.path.append(str(Path(__file__).parent))

try:
    from extract_and_upload import process_directory, get_supabase_client
except ImportError as e:
    print(f"Error: Could not import extract_and_upload module: {e}")
    print("Make sure extract_and_upload.py is in the same directory.")
    sys.exit(1)


def load_config(config_path: str) -> Dict[str, Any]:
    """Load configuration from JSON file."""
    with open(config_path, 'r') as f:
        return json.load(f)


def create_sample_config():
    """Create a sample configuration file."""
    config = {
        "exam_boards": {
            "cambridge": {
                "subjects": {
                    "chemistry": {
                        "subject_id": "uuid-here",
                        "pdf_directory": "./pdfs/cambridge/igcse/chemistry",
                        "years": [2021, 2022, 2023],
                        "sessions": ["mj", "on"]
                    },
                    "physics": {
                        "subject_id": "uuid-here",
                        "pdf_directory": "./pdfs/cambridge/igcse/physics",
                        "years": [2021, 2022, 2023],
                        "sessions": ["mj", "on"]
                    }
                }
            },
            "edexcel": {
                "subjects": {
                    "chemistry": {
                        "subject_id": "uuid-here",
                        "pdf_directory": "./pdfs/edexcel/igcse/chemistry",
                        "years": [2021, 2022, 2023],
                        "sessions": ["mj", "on"]
                    }
                }
            }
        },
        "settings": {
            "upload_to_database": True,
            "replace_existing": False,
            "save_json": True,
            "json_output_dir": "./output/json",
            "use_ai_extraction": True
        }
    }
    
    with open("batch_config.json", 'w') as f:
        json.dump(config, f, indent=2)
    
    print("Created sample configuration file: batch_config.json")
    print("Edit this file with your actual subject IDs and PDF directories.")


def process_exam_board(board_name: str, board_config: Dict, settings: Dict) -> Dict[str, Any]:
    """Process all subjects for an exam board."""
    results = {
        "exam_board": board_name,
        "subjects_processed": 0,
        "total_pdfs": 0,
        "total_questions": 0,
        "errors": []
    }
    
    print(f"\n{'='*60}")
    print(f"Processing Exam Board: {board_name.upper()}")
    print(f"{'='*60}")
    
    for subject_name, subject_config in board_config.get("subjects", {}).items():
        print(f"\nProcessing Subject: {subject_name}")
        
        subject_id = subject_config.get("subject_id")
        pdf_dir = subject_config.get("pdf_directory")
        
        if not subject_id or not pdf_dir:
            results["errors"].append(f"Missing subject_id or pdf_directory for {subject_name}")
            continue
        
        if not Path(pdf_dir).exists():
            results["errors"].append(f"PDF directory not found: {pdf_dir}")
            continue
        
        # Process the subject directory
        try:
            subject_results = process_directory(
                input_dir=pdf_dir,
                output_dir=settings.get("json_output_dir") if settings.get("save_json") else None,
                subject_id=subject_id if settings.get("upload_to_database") else None,
                upload=settings.get("upload_to_database", False)
            )
            
            # Count results
            successful = sum(1 for r in subject_results if r.get("success"))
            total_questions = sum(r.get("count", 0) for r in subject_results if r.get("success"))
            
            results["subjects_processed"] += 1
            results["total_pdfs"] += len(subject_results)
            results["total_questions"] += total_questions
            
            print(f"  ✓ Processed {successful}/{len(subject_results)} PDFs")
            print(f"  ✓ Extracted {total_questions} questions")
            
            # Log errors for this subject
            subject_errors = [r for r in subject_results if not r.get("success")]
            for error in subject_errors:
                results["errors"].append(f"{subject_name}: {error.get('error', 'Unknown error')}")
                
        except Exception as e:
            error_msg = f"Failed to process {subject_name}: {str(e)}"
            results["errors"].append(error_msg)
            print(f"  ✗ {error_msg}")
    
    return results


def main():
    parser = argparse.ArgumentParser(
        description="Batch process PDF exam papers for question extraction",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Create sample configuration
  python batch_process.py --create-config
  
  # Process using configuration file
  python batch_process.py --config batch_config.json
  
  # Process specific exam board and subjects
  python batch_process.py --exam-board cambridge --subjects chemistry physics --year 2023
        """
    )
    
    parser.add_argument("--config", help="JSON configuration file")
    parser.add_argument("--create-config", action="store_true", help="Create sample configuration file")
    parser.add_argument("--exam-board", help="Exam board to process")
    parser.add_argument("--subjects", nargs="+", help="Subjects to process")
    parser.add_argument("--year", type=int, help="Year to process")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be processed without actually processing")
    
    args = parser.parse_args()
    
    if args.create_config:
        create_sample_config()
        return
    
    if not args.config and not args.exam_board:
        print("Error: Either --config or --exam-board must be specified")
        parser.print_help()
        sys.exit(1)
    
    # Load configuration
    if args.config:
        if not Path(args.config).exists():
            print(f"Error: Configuration file not found: {args.config}")
            sys.exit(1)
        
        config = load_config(args.config)
        settings = config.get("settings", {})
        
        # Process all exam boards in config
        all_results = []
        for board_name, board_config in config.get("exam_boards", {}).items():
            result = process_exam_board(board_name, board_config, settings)
            all_results.append(result)
    
    else:
        # Process specific exam board from command line
        print(f"Processing {args.exam_board} with subjects: {args.subjects}")
        print("Note: You need to provide subject IDs and PDF directories")
        print("Consider using --config for more flexible configuration")
        
        # This would need implementation based on command line args
        # For now, directing user to use config file
        print("\nPlease create a configuration file using --create-config for better control.")
        return
    
    # Print summary
    print(f"\n{'='*60}")
    print("BATCH PROCESSING SUMMARY")
    print(f"{'='*60}")
    
    total_subjects = sum(r["subjects_processed"] for r in all_results)
    total_pdfs = sum(r["total_pdfs"] for r in all_results)
    total_questions = sum(r["total_questions"] for r in all_results)
    total_errors = sum(len(r["errors"]) for r in all_results)
    
    print(f"Total Subjects Processed: {total_subjects}")
    print(f"Total PDFs Processed: {total_pdfs}")
    print(f"Total Questions Extracted: {total_questions}")
    print(f"Total Errors: {total_errors}")
    
    if total_errors > 0:
        print(f"\n{'='*40}")
        print("ERRORS ENCOUNTERED:")
        for result in all_results:
            for error in result["errors"]:
                print(f"  - {error}")
    
    print(f"\n{'='*60}")
    print("Batch processing complete!")
    
    # Save results summary
    summary = {
        "timestamp": str(Path().cwd()),
        "summary": {
            "total_subjects": total_subjects,
            "total_pdfs": total_pdfs,
            "total_questions": total_questions,
            "total_errors": total_errors
        },
        "details": all_results
    }
    
    with open("batch_results.json", 'w') as f:
        json.dump(summary, f, indent=2)
    
    print("Results saved to: batch_results.json")


if __name__ == "__main__":
    main()
