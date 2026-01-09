#!/usr/bin/env python3
"""
Cleanup Script for PDF Question Extractor

This script helps clean up temporary files, old outputs, and logs
to keep the extraction system organized.
"""

import os
import sys
import json
import shutil
from pathlib import Path
from datetime import datetime, timedelta
from typing import List, Dict, Any

def clean_output_files(output_dir: str = "./output", days_old: int = 30):
    """Clean old output files."""
    print(f"🧹 Cleaning output files older than {days_old} days...")
    
    output_path = Path(output_dir)
    if not output_path.exists():
        print("✅ Output directory doesn't exist")
        return
    
    cutoff_date = datetime.now() - timedelta(days=days_old)
    cleaned_count = 0
    
    for file_path in output_path.rglob("*"):
        if file_path.is_file():
            file_time = datetime.fromtimestamp(file_path.stat().st_mtime)
            if file_time < cutoff_date:
                try:
                    file_path.unlink()
                    cleaned_count += 1
                    print(f"  🗑️  Deleted: {file_path.name}")
                except Exception as e:
                    print(f"  ❌ Failed to delete {file_path.name}: {e}")
    
    print(f"✅ Cleaned {cleaned_count} old output files")

def clean_temp_files():
    """Clean temporary files."""
    print("🧹 Cleaning temporary files...")
    
    temp_patterns = [
        "*.tmp",
        "*.temp",
        "*~",
        ".DS_Store",
        "Thumbs.db"
    ]
    
    cleaned_count = 0
    current_dir = Path.cwd()
    
    for pattern in temp_patterns:
        for file_path in current_dir.glob(pattern):
            try:
                file_path.unlink()
                cleaned_count += 1
                print(f"  🗑️  Deleted: {file_path.name}")
            except Exception as e:
                print(f"  ❌ Failed to delete {file_path.name}: {e}")
    
    # Clean Python cache
    cache_dirs = ["__pycache__", ".pytest_cache"]
    for cache_dir in cache_dirs:
        cache_path = current_dir / cache_dir
        if cache_path.exists():
            try:
                shutil.rmtree(cache_path)
                cleaned_count += 1
                print(f"  🗑️  Deleted directory: {cache_dir}")
            except Exception as e:
                print(f"  ❌ Failed to delete {cache_dir}: {e}")
    
    print(f"✅ Cleaned {cleaned_count} temporary files")

def clean_old_logs(days_old: int = 7):
    """Clean old log files."""
    print(f"🧹 Cleaning log files older than {days_old} days...")
    
    log_patterns = [
        "*.log",
        "logs/*.log",
        "*.out"
    ]
    
    cleaned_count = 0
    cutoff_date = datetime.now() - timedelta(days=days_old)
    
    for pattern in log_patterns:
        for file_path in Path.cwd().glob(pattern):
            if file_path.is_file():
                file_time = datetime.fromtimestamp(file_path.stat().st_mtime)
                if file_time < cutoff_date:
                    try:
                        file_path.unlink()
                        cleaned_count += 1
                        print(f"  🗑️  Deleted: {file_path.name}")
                    except Exception as e:
                        print(f"  ❌ Failed to delete {file_path.name}: {e}")
    
    print(f"✅ Cleaned {cleaned_count} old log files")

def reset_processed_log():
    """Reset the processed files log."""
    print("🧹 Resetting processed files log...")
    
    log_files = ["processed_files.json", "batch_results.json", "test_report.json"]
    
    for log_file in log_files:
        file_path = Path(log_file)
        if file_path.exists():
            try:
                file_path.unlink()
                print(f"  🗑️  Deleted: {log_file}")
            except Exception as e:
                print(f"  ❌ Failed to delete {log_file}: {e}")
    
    print("✅ Reset processed files log")

def clean_empty_dirs():
    """Remove empty directories."""
    print("🧹 Removing empty directories...")
    
    cleaned_count = 0
    current_dir = Path.cwd()
    
    # Walk from bottom to top to remove nested empty dirs
    for root, dirs, files in os.walk(current_dir, topdown=False):
        for dir_name in dirs:
            dir_path = Path(root) / dir_name
            try:
                if not any(dir_path.iterdir()):  # Directory is empty
                    dir_path.rmdir()
                    cleaned_count += 1
                    print(f"  🗑️  Removed empty directory: {dir_path.relative_to(current_dir)}")
            except OSError:
                # Directory not empty or permission denied
                pass
    
    print(f"✅ Removed {cleaned_count} empty directories")

def show_disk_usage():
    """Show disk usage statistics."""
    print("💾 Disk Usage Statistics")
    print("-" * 40)
    
    current_dir = Path.cwd()
    total_size = 0
    
    # Calculate sizes of different file types
    file_types = {
        "PDF files": "*.pdf",
        "JSON files": "*.json",
        "Log files": "*.log",
        "Python files": "*.py",
        "Output files": "output/**/*"
    }
    
    for type_name, pattern in file_types.items():
        size = 0
        count = 0
        for file_path in current_dir.glob(pattern):
            if file_path.is_file():
                size += file_path.stat().st_size
                count += 1
        total_size += size
        
        size_mb = size / (1024 * 1024)
        print(f"  {type_name}: {count} files, {size_mb:.2f} MB")
    
    total_mb = total_size / (1024 * 1024)
    print(f"\n  Total: {total_mb:.2f} MB")

def main():
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Clean up temporary files and old outputs",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Clean all temporary files
  python cleanup.py --temp
  
  # Clean outputs older than 30 days
  python cleanup.py --output --days 30
  
  # Clean everything
  python cleanup.py --all
  
  # Show disk usage
  python cleanup.py --usage
        """
    )
    
    parser.add_argument("--temp", action="store_true", help="Clean temporary files")
    parser.add_argument("--output", action="store_true", help="Clean old output files")
    parser.add_argument("--logs", action="store_true", help="Clean old log files")
    parser.add_argument("--reset", action="store_true", help="Reset processed files log")
    parser.add_argument("--empty-dirs", action="store_true", help="Remove empty directories")
    parser.add_argument("--all", action="store_true", help="Clean everything")
    parser.add_argument("--days", type=int, default=30, help="Age threshold in days")
    parser.add_argument("--usage", action="store_true", help="Show disk usage")
    
    args = parser.parse_args()
    
    print("🧹 PDF Question Extractor - Cleanup Utility")
    print("=" * 50)
    
    if args.usage:
        show_disk_usage()
        return
    
    # If no specific option, show help
    if not any([args.temp, args.output, args.logs, args.reset, args.empty_dirs, args.all]):
        parser.print_help()
        return
    
    # Run cleanup operations
    if args.all or args.temp:
        clean_temp_files()
    
    if args.all or args.output:
        clean_output_files(days_old=args.days)
    
    if args.all or args.logs:
        clean_old_logs(days_old=args.days)
    
    if args.all or args.reset:
        reset_processed_log()
    
    if args.all or args.empty_dirs:
        clean_empty_dirs()
    
    print("\n✅ Cleanup complete!")
    
    if not args.usage:
        print("\n💾 Current disk usage:")
        show_disk_usage()


if __name__ == "__main__":
    main()
