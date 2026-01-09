#!/usr/bin/env python3
"""
Benchmark Script for PDF Question Extractor

This script runs performance benchmarks on the extraction system
to measure speed, accuracy, and resource usage.
"""

import sys
import time
import json
import psutil
import statistics
from pathlib import Path
from typing import Dict, List, Any, Tuple
from datetime import datetime

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

try:
    from extract_and_upload import extract_questions_with_ai, extract_text_from_pdf, process_pdf
except ImportError as e:
    print(f"Error: Could not import extract_and_upload module: {e}")
    sys.exit(1)


class BenchmarkSuite:
    """Runs benchmarks on the extraction system."""
    
    def __init__(self):
        self.results = {
            "timestamp": datetime.now().isoformat(),
            "system_info": self.get_system_info(),
            "benchmarks": {}
        }
    
    def get_system_info(self) -> Dict[str, Any]:
        """Get system information for benchmark context."""
        return {
            "python_version": sys.version,
            "cpu_count": psutil.cpu_count(),
            "memory_total": psutil.virtual_memory().total,
            "memory_available": psutil.virtual_memory().available
        }
    
    def benchmark_pdf_extraction(self, pdf_path: str, iterations: int = 3) -> Dict[str, Any]:
        """Benchmark PDF text extraction speed."""
        print(f"📄 Benchmarking PDF extraction: {pdf_path}")
        print(f"🔄 Running {iterations} iterations...")
        
        times = []
        file_sizes = []
        
        for i in range(iterations):
            print(f"  Iteration {i+1}/{iterations}...")
            
            start_time = time.time()
            start_memory = psutil.Process().memory_info().rss
            
            try:
                text = extract_text_from_pdf(pdf_path)
                
                end_time = time.time()
                end_memory = psutil.Process().memory_info().rss
                
                extraction_time = end_time - start_time
                memory_used = end_memory - start_memory
                file_size = Path(pdf_path).stat().st_size
                text_length = len(text)
                
                times.append(extraction_time)
                file_sizes.append(file_size)
                
                print(f"    ⏱️  Time: {extraction_time:.2f}s")
                print(f"    📝 Text: {text_length:,} characters")
                print(f"    💾 Memory: {memory_used / 1024 / 1024:.2f} MB")
                
            except Exception as e:
                print(f"    ❌ Error: {e}")
                continue
        
        if not times:
            return {"error": "All iterations failed"}
        
        # Calculate statistics
        avg_time = statistics.mean(times)
        min_time = min(times)
        max_time = max(times)
        
        avg_file_size = statistics.mean(file_sizes)
        
        # Calculate throughput
        chars_per_second = len(text) / avg_time if times else 0
        
        return {
            "iterations": len(times),
            "avg_time_seconds": avg_time,
            "min_time_seconds": min_time,
            "max_time_seconds": max_time,
            "avg_file_size_bytes": avg_file_size,
            "chars_per_second": chars_per_second,
            "text_length": len(text) if times else 0
        }
    
    def benchmark_ai_extraction(self, text: str, iterations: int = 3) -> Dict[str, Any]:
        """Benchmark AI question extraction speed and accuracy."""
        print(f"🤖 Benchmarking AI extraction")
        print(f"🔄 Running {iterations} iterations...")
        print(f"📝 Text length: {len(text):,} characters")
        
        times = []
        question_counts = []
        error_count = 0
        
        for i in range(iterations):
            print(f"  Iteration {i+1}/{iterations}...")
            
            start_time = time.time()
            start_memory = psutil.Process().memory_info().rss
            
            try:
                questions = extract_questions_with_ai(text)
                
                end_time = time.time()
                end_memory = psutil.Process().memory_info().rss
                
                extraction_time = end_time - start_time
                memory_used = end_memory - start_memory
                
                times.append(extraction_time)
                question_counts.append(len(questions))
                
                print(f"    ⏱️  Time: {extraction_time:.2f}s")
                print(f"    ❓ Questions: {len(questions)}")
                print(f"    💾 Memory: {memory_used / 1024 / 1024:.2f} MB")
                
            except Exception as e:
                print(f"    ❌ Error: {e}")
                error_count += 1
                continue
        
        if not times:
            return {"error": "All iterations failed", "error_count": error_count}
        
        # Calculate statistics
        avg_time = statistics.mean(times)
        min_time = min(times)
        max_time = max(times)
        avg_questions = statistics.mean(question_counts)
        
        # Calculate throughput
        chars_per_second = len(text) / avg_time
        questions_per_second = avg_questions / avg_time
        
        return {
            "iterations": len(times),
            "error_count": error_count,
            "avg_time_seconds": avg_time,
            "min_time_seconds": min_time,
            "max_time_seconds": max_time,
            "avg_questions_extracted": avg_questions,
            "chars_per_second": chars_per_second,
            "questions_per_second": questions_per_second,
            "text_length": len(text)
        }
    
    def benchmark_end_to_end(self, pdf_path: str, iterations: int = 2) -> Dict[str, Any]:
        """Benchmark the complete end-to-end process."""
        print(f"🔄 Benchmarking end-to-end process: {pdf_path}")
        print(f"🔄 Running {iterations} iterations...")
        
        times = []
        total_questions = []
        
        for i in range(iterations):
            print(f"  Iteration {i+1}/{iterations}...")
            
            start_time = time.time()
            
            try:
                result = process_pdf(pdf_path)
                
                end_time = time.time()
                extraction_time = end_time - start_time
                
                if result.get("success"):
                    times.append(extraction_time)
                    total_questions.append(result.get("count", 0))
                    
                    print(f"    ⏱️  Total time: {extraction_time:.2f}s")
                    print(f"    ❓ Questions: {result.get('count', 0)}")
                else:
                    print(f"    ❌ Failed: {result.get('error', 'Unknown error')}")
                
            except Exception as e:
                print(f"    ❌ Error: {e}")
                continue
        
        if not times:
            return {"error": "All iterations failed"}
        
        return {
            "iterations": len(times),
            "avg_time_seconds": statistics.mean(times),
            "min_time_seconds": min(times),
            "max_time_seconds": max(times),
            "avg_questions_extracted": statistics.mean(total_questions),
            "questions_per_second": statistics.mean(total_questions) / statistics.mean(times)
        }
    
    def run_stress_test(self, pdf_paths: List[str]) -> Dict[str, Any]:
        """Run stress test with multiple PDFs."""
        print(f"💪 Running stress test with {len(pdf_paths)} PDFs...")
        
        start_time = time.time()
        start_memory = psutil.Process().memory_info().rss
        
        results = []
        total_questions = 0
        failed_count = 0
        
        for i, pdf_path in enumerate(pdf_paths):
            print(f"  Processing {i+1}/{len(pdf_paths)}: {Path(pdf_path).name}")
            
            try:
                result = process_pdf(pdf_path)
                if result.get("success"):
                    results.append(result)
                    total_questions += result.get("count", 0)
                else:
                    failed_count += 1
                    print(f"    ❌ Failed: {result.get('error')}")
            except Exception as e:
                failed_count += 1
                print(f"    ❌ Error: {e}")
        
        end_time = time.time()
        end_memory = psutil.Process().memory_info().rss
        
        total_time = end_time - start_time
        memory_used = end_memory - start_memory
        
        return {
            "total_files": len(pdf_paths),
            "successful_files": len(results),
            "failed_files": failed_count,
            "total_time_seconds": total_time,
            "avg_time_per_file": total_time / len(pdf_paths),
            "total_questions_extracted": total_questions,
            "avg_questions_per_file": total_questions / len(results) if results else 0,
            "memory_used_mb": memory_used / 1024 / 1024,
            "files_per_second": len(pdf_paths) / total_time
        }
    
    def save_results(self, output_file: str = "benchmark_results.json"):
        """Save benchmark results to file."""
        with open(output_file, 'w') as f:
            json.dump(self.results, f, indent=2)
        print(f"📊 Results saved to: {output_file}")
    
    def print_summary(self):
        """Print a summary of all benchmark results."""
        print("\n" + "=" * 60)
        print("📊 BENCHMARK SUMMARY")
        print("=" * 60)
        
        for name, result in self.results["benchmarks"].items():
            print(f"\n🔍 {name.upper()}:")
            
            if "error" in result:
                print(f"  ❌ Error: {result['error']}")
                continue
            
            if "avg_time_seconds" in result:
                print(f"  ⏱️  Average time: {result['avg_time_seconds']:.2f}s")
            
            if "avg_questions_extracted" in result:
                print(f"  ❓ Average questions: {result['avg_questions_extracted']:.1f}")
            
            if "chars_per_second" in result:
                print(f"  📝 Throughput: {result['chars_per_second']:.0f} chars/sec")
            
            if "questions_per_second" in result:
                print(f"  🚀 Question rate: {result['questions_per_second']:.2f} questions/sec")


def main():
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Run benchmarks on PDF Question Extractor",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Benchmark single PDF
  python benchmark.py --pdf exam_paper.pdf
  
  # Run stress test on directory
  python benchmark.py --stress ./pdfs/
  
  # Custom iterations
  python benchmark.py --pdf paper.pdf --iterations 5
        """
    )
    
    parser.add_argument("--pdf", metavar="FILE", help="PDF file to benchmark")
    parser.add_argument("--stress", metavar="DIR", help="Run stress test on PDF directory")
    parser.add_argument("--iterations", type=int, default=3, help="Number of iterations")
    parser.add_argument("--output", default="benchmark_results.json", help="Output file")
    
    args = parser.parse_args()
    
    if not args.pdf and not args.stress:
        print("❌ Please specify --pdf or --stress")
        parser.print_help()
        sys.exit(1)
    
    print("🚀 PDF Question Extractor - Benchmark Suite")
    print("=" * 60)
    
    suite = BenchmarkSuite()
    
    if args.pdf:
        # Single PDF benchmarks
        if not Path(args.pdf).exists():
            print(f"❌ PDF file not found: {args.pdf}")
            sys.exit(1)
        
        # PDF extraction benchmark
        suite.results["benchmarks"]["pdf_extraction"] = suite.benchmark_pdf_extraction(
            args.pdf, args.iterations
        )
        
        # AI extraction benchmark
        text = extract_text_from_pdf(args.pdf)
        if text:
            suite.results["benchmarks"]["ai_extraction"] = suite.benchmark_ai_extraction(
                text, args.iterations
            )
        
        # End-to-end benchmark
        suite.results["benchmarks"]["end_to_end"] = suite.benchmark_end_to_end(
            args.pdf, max(1, args.iterations - 1)
        )
    
    elif args.stress:
        # Stress test
        pdf_dir = Path(args.stress)
        if not pdf_dir.exists():
            print(f"❌ Directory not found: {args.stress}")
            sys.exit(1)
        
        pdf_files = list(pdf_dir.rglob("*.pdf"))
        if not pdf_files:
            print("❌ No PDF files found in directory")
            sys.exit(1)
        
        suite.results["benchmarks"]["stress_test"] = suite.run_stress_test(
            [str(f) for f in pdf_files[:10]]  # Limit to 10 files for stress test
        )
    
    # Save and display results
    suite.save_results(args.output)
    suite.print_summary()


if __name__ == "__main__":
    main()
