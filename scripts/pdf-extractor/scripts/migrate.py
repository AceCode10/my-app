#!/usr/bin/env python3
"""
Migration Script for PDF Question Extractor

This script helps migrate from the old extraction system to the new AI-powered system.
It can convert old JSON formats, update configurations, and validate data.
"""

import sys
import json
import os
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

try:
    from extract_and_upload import ExtractedQuestion, MCQOption
except ImportError as e:
    print(f"Error: Could not import extract_and_upload module: {e}")
    sys.exit(1)


class DataMigrator:
    """Handles migration of data between different formats."""
    
    def __init__(self):
        self.conversion_stats = {
            "total_questions": 0,
            "converted": 0,
            "errors": 0,
            "warnings": 0
        }
    
    def convert_old_json_to_new(self, input_file: str, output_file: str) -> bool:
        """Convert old JSON format to new ExtractedQuestion format."""
        print(f"🔄 Converting {input_file} to new format...")
        
        try:
            with open(input_file, 'r', encoding='utf-8') as f:
                old_data = json.load(f)
            
            new_questions = []
            
            for i, old_q in enumerate(old_data):
                try:
                    new_q = self._convert_single_question(old_q, i + 1)
                    if new_q:
                        new_questions.append(new_q)
                        self.conversion_stats["converted"] += 1
                    else:
                        self.conversion_stats["errors"] += 1
                except Exception as e:
                    print(f"  ❌ Error converting question {i+1}: {e}")
                    self.conversion_stats["errors"] += 1
            
            self.conversion_stats["total_questions"] = len(old_data)
            
            # Save converted data
            with open(output_file, 'w', encoding='utf-8') as f:
                questions_dict = []
                for q in new_questions:
                    d = q.__dict__.copy()
                    if d.get("options") is None:
                        del d["options"]
                    if d.get("topic_tags") is None:
                        del d["topic_tags"]
                    questions_dict.append(d)
                json.dump(questions_dict, f, indent=2, ensure_ascii=False)
            
            print(f"✅ Converted {len(new_questions)} questions")
            print(f"📊 Stats: {self.conversion_stats['converted']} converted, {self.conversion_stats['errors']} errors")
            return True
            
        except Exception as e:
            print(f"❌ Failed to convert {input_file}: {e}")
            return False
    
    def _convert_single_question(self, old_q: Dict[str, Any], question_number: int) -> Optional[ExtractedQuestion]:
        """Convert a single old question to new format."""
        try:
            # Basic fields
            new_q = ExtractedQuestion(
                question_number=old_q.get("question_number", question_number),
                question_text=old_q.get("question_text", ""),
                question_type=old_q.get("question_type", "short_answer"),
                marks=old_q.get("marks", 1),
                difficulty=old_q.get("difficulty", "medium"),
                correct_answer=old_q.get("correct_answer", ""),
                mark_scheme=old_q.get("mark_scheme", ""),
                examiner_tips=old_q.get("examiner_tips", ""),
                section_name=old_q.get("section_name", ""),
                part_label=old_q.get("part_label", ""),
                image_url=old_q.get("image_url", ""),
                topic_tags=old_q.get("topic_tags", [])
            )
            
            # Convert MCQ options
            if old_q.get("question_type") == "mcq" and "options" in old_q:
                options = []
                for opt in old_q["options"]:
                    mcq_opt = MCQOption(
                        label=opt.get("label", ""),
                        text=opt.get("text", ""),
                        is_correct=opt.get("is_correct", False)
                    )
                    options.append(mcq_opt)
                new_q.options = options
            
            return new_q
            
        except Exception as e:
            print(f"  ⚠️  Warning: Could not convert question: {e}")
            self.conversion_stats["warnings"] += 1
            return None
    
    def validate_json_file(self, file_path: str) -> Dict[str, Any]:
        """Validate a JSON file for correct format."""
        print(f"🔍 Validating {file_path}...")
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            if not isinstance(data, list):
                return {"valid": False, "error": "Root element must be an array"}
            
            validation_results = {
                "valid": True,
                "total_questions": len(data),
                "issues": [],
                "warnings": []
            }
            
            required_fields = ["question_text"]
            optional_fields = [
                "question_number", "question_type", "marks", "difficulty",
                "correct_answer", "mark_scheme", "examiner_tips",
                "section_name", "part_label", "image_url", "topic_tags", "options"
            ]
            
            for i, q in enumerate(data):
                # Check required fields
                for field in required_fields:
                    if field not in q or not q[field]:
                        validation_results["issues"].append(f"Question {i+1}: Missing required field '{field}'")
                
                # Check question type
                if "question_type" in q:
                    valid_types = ["mcq", "short_answer", "structured", "essay", "calculation", "true_false"]
                    if q["question_type"] not in valid_types:
                        validation_results["warnings"].append(
                            f"Question {i+1}: Unknown question type '{q['question_type']}'"
                        )
                
                # Check MCQ options
                if q.get("question_type") == "mcq":
                    if "options" not in q or not q["options"]:
                        validation_results["issues"].append(f"Question {i+1}: MCQ missing options")
                    else:
                        correct_count = sum(1 for opt in q["options"] if opt.get("is_correct"))
                        if correct_count != 1:
                            validation_results["warnings"].append(
                                f"Question {i+1}: MCQ should have exactly 1 correct answer (found {correct_count})"
                            )
            
            if validation_results["issues"]:
                validation_results["valid"] = False
            
            print(f"✅ Validation complete: {len(validation_results['issues'])} issues, {len(validation_results['warnings'])} warnings")
            
            return validation_results
            
        except json.JSONDecodeError as e:
            return {"valid": False, "error": f"Invalid JSON: {e}"}
        except Exception as e:
            return {"valid": False, "error": f"Error reading file: {e}"}
    
    def update_config_file(self, config_file: str, add_new_settings: bool = True) -> bool:
        """Update configuration file with new settings."""
        print(f"🔄 Updating configuration file {config_file}...")
        
        try:
            with open(config_file, 'r') as f:
                config = json.load(f)
            
            # Add new settings if requested
            if add_new_settings:
                if "settings" not in config:
                    config["settings"] = {}
                
                # Add new default settings
                new_settings = {
                    "upload_to_database": True,
                    "replace_existing": False,
                    "save_json": True,
                    "json_output_dir": "./output/json",
                    "use_ai_extraction": True
                }
                
                for key, value in new_settings.items():
                    if key not in config["settings"]:
                        config["settings"][key] = value
                        print(f"  ➕ Added setting: {key} = {value}")
            
            # Save updated config
            with open(config_file, 'w') as f:
                json.dump(config, f, indent=2)
            
            print("✅ Configuration file updated")
            return True
            
        except Exception as e:
            print(f"❌ Failed to update configuration: {e}")
            return False
    
    def create_backup(self, file_path: str) -> bool:
        """Create a backup of a file."""
        backup_path = f"{file_path}.backup.{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        try:
            import shutil
            shutil.copy2(file_path, backup_path)
            print(f"✅ Created backup: {backup_path}")
            return True
        except Exception as e:
            print(f"❌ Failed to create backup: {e}")
            return False


def main():
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Migrate data and configurations for PDF Question Extractor",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Convert old JSON to new format
  python migrate.py --convert old_questions.json new_questions.json
  
  # Validate JSON file
  python migrate.py --validate questions.json
  
  # Update configuration file
  python migrate.py --update-config batch_config.json
  
  # Full migration
  python migrate.py --migrate --input old_data/ --output new_data/
        """
    )
    
    parser.add_argument("--convert", nargs=2, metavar=("INPUT", "OUTPUT"), 
                       help="Convert old JSON format to new format")
    parser.add_argument("--validate", metavar="FILE", help="Validate JSON file format")
    parser.add_argument("--update-config", metavar="FILE", help="Update configuration file")
    parser.add_argument("--migrate", action="store_true", help="Run full migration")
    parser.add_argument("--input", metavar="DIR", help="Input directory for migration")
    parser.add_argument("--output", metavar="DIR", help="Output directory for migration")
    parser.add_argument("--backup", action="store_true", help="Create backups before modifying")
    
    args = parser.parse_args()
    
    print("🔄 PDF Question Extractor - Migration Tool")
    print("=" * 50)
    
    migrator = DataMigrator()
    
    if args.convert:
        input_file, output_file = args.convert
        
        if args.backup:
            migrator.create_backup(input_file)
        
        success = migrator.convert_old_json_to_new(input_file, output_file)
        sys.exit(0 if success else 1)
    
    elif args.validate:
        result = migrator.validate_json_file(args.validate)
        
        if result["valid"]:
            print("✅ File is valid")
            sys.exit(0)
        else:
            print("❌ File has issues:")
            if "error" in result:
                print(f"  {result['error']}")
            else:
                for issue in result["issues"]:
                    print(f"  - {issue}")
            sys.exit(1)
    
    elif args.update_config:
        if args.backup:
            migrator.create_backup(args.update_config)
        
        success = migrator.update_config_file(args.update_config)
        sys.exit(0 if success else 1)
    
    elif args.migrate:
        if not args.input or not args.output:
            print("❌ --input and --output directories required for migration")
            sys.exit(1)
        
        input_dir = Path(args.input)
        output_dir = Path(args.output)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        print(f"🔄 Migrating from {input_dir} to {output_dir}")
        
        # Find all JSON files
        json_files = list(input_dir.glob("*.json"))
        
        if not json_files:
            print("❌ No JSON files found in input directory")
            sys.exit(1)
        
        print(f"📁 Found {len(json_files)} JSON files")
        
        success_count = 0
        for json_file in json_files:
            output_file = output_dir / f"converted_{json_file.name}"
            
            if migrator.convert_old_json_to_new(str(json_file), str(output_file)):
                success_count += 1
        
        print(f"\n📊 Migration complete: {success_count}/{len(json_files)} files converted")
        sys.exit(0 if success_count == len(json_files) else 1)
    
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
