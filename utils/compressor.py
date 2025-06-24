#!/usr/bin/env python3
"""
Crystal Clear Audio Compressor
A standalone script for compressing speech audio with crystal clear quality.

Based on the optimal settings found during comprehensive testing:
- Variable bitrate (q:a 3) for high quality
- 22050 Hz sample rate for speech optimization
- Highpass filter to remove low-frequency noise
- Spectral noise reduction (afftdn)
- EQ boost for speech clarity at 2.5kHz

Usage:
    python3 crystal_clear_compressor.py input.wav output.mp3
    python3 crystal_clear_compressor.py --help
    python3 crystal_clear_compressor.py --bulk-compress  # Process all MP3 files
"""

import sys
import os
import subprocess
import time
import json
import argparse
import re
import glob
from pathlib import Path
from typing import Dict, Optional, Tuple, List
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

class CrystalClearCompressor:
    """
    Audio compressor using crystal clear variable bitrate settings optimized for speech.
    """
    
    def __init__(self):
        self.ffmpeg_options = [
            '-ac', '1',                    # Convert to mono
            '-q:a', '3',                   # Variable bitrate, high quality (3 = ~170-210 kbps range)
            '-ar', '22050',                # Sample rate optimized for speech
            '-af', 'highpass=f=80,afftdn=nf=-25,equalizer=f=2500:t=h:w=800:g=2'
        ]
        
        # Thread lock for thread-safe printing
        self.print_lock = threading.Lock()
        
        # Explanation of filters:
        # highpass=f=80     : Remove low-frequency noise below 80Hz (rumble, AC noise)
        # afftdn=nf=-25     : Spectral noise reduction with -25dB noise floor
        # equalizer=f=2500:t=h:w=800:g=2 : Boost 2.5kHz frequency (speech clarity) by 2dB with 800Hz width
    
    def extract_base_name(self, filename: str) -> str:
        """
        Extract the base name from a filename by removing the number and extension.
        Example: 'BavaBatra46.mp3' -> 'BavaBatra'
        """
        # Remove the .mp3 extension
        name_without_ext = filename.replace('.mp3', '').replace('.m4a', '')
        
        # Use regex to find the text before the number
        match = re.match(r'([A-Za-z]+)', name_without_ext)
        if match:
            return match.group(1)
        
        # Fallback: just remove numbers from the end
        return re.sub(r'\d+$', '', name_without_ext)
    
    def check_ffmpeg(self) -> bool:
        """Check if ffmpeg is available"""
        try:
            result = subprocess.run(['ffmpeg', '-version'], 
                                  capture_output=True, text=True, check=True)
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            return False
    
    def get_audio_info(self, file_path: str) -> Optional[Dict]:
        """Get audio file information using ffprobe"""
        try:
            cmd = [
                'ffprobe', '-v', 'quiet', '-print_format', 'json',
                '-show_format', '-show_streams', file_path
            ]
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            return json.loads(result.stdout)
        except (subprocess.CalledProcessError, json.JSONDecodeError):
            return None
    
    def format_duration(self, seconds: float) -> str:
        """Format duration in human readable format"""
        if seconds < 60:
            return f"{seconds:.1f}s"
        elif seconds < 3600:
            minutes = int(seconds // 60)
            secs = seconds % 60
            return f"{minutes}m {secs:.1f}s"
        else:
            hours = int(seconds // 3600)
            minutes = int((seconds % 3600) // 60)
            secs = seconds % 60
            return f"{hours}h {minutes}m {secs:.1f}s"
    
    def format_file_size(self, bytes_size: int) -> str:
        """Format file size in human readable format"""
        if bytes_size < 1024:
            return f"{bytes_size} B"
        elif bytes_size < 1024 * 1024:
            return f"{bytes_size / 1024:.1f} KB"
        elif bytes_size < 1024 * 1024 * 1024:
            return f"{bytes_size / (1024 * 1024):.1f} MB"
        else:
            return f"{bytes_size / (1024 * 1024 * 1024):.1f} GB"
    
    def compress_audio(self, input_file: str, output_file: str, verbose: bool = True, delete_source: bool = True) -> Tuple[bool, Dict]:
        """
        Compress audio file using crystal clear settings
        
        Args:
            input_file: Path to input audio file
            output_file: Path to output MP3 file
            verbose: Whether to print progress information
            delete_source: Whether to delete the source file after successful compression
            
        Returns:
            Tuple of (success: bool, info: dict with processing details)
        """
        
        # Validate input file
        if not os.path.exists(input_file):
            return False, {"error": f"Input file not found: {input_file}"}
        
        # Check file size
        input_size = os.path.getsize(input_file)
        if input_size == 0:
            return False, {"error": f"Input file is empty (0 bytes): {input_file}", "skip": True}
        
        # Get input file info
        input_info = self.get_audio_info(input_file)
        
        if verbose:
            print("🎵 Crystal Clear Audio Compressor")
            print("=" * 50)
            print(f"Input file: {input_file}")
            print(f"Output file: {output_file}")
            print(f"Input size: {self.format_file_size(input_size)}")
            
            if input_info and 'streams' in input_info:
                stream = input_info['streams'][0]
                print(f"Input format: {stream.get('codec_name', 'unknown')}")
                print(f"Sample rate: {stream.get('sample_rate', 'unknown')} Hz")
                print(f"Channels: {stream.get('channels', 'unknown')}")
                if 'format' in input_info:
                    duration = input_info['format'].get('duration', 'unknown')
                    if duration != 'unknown':
                        print(f"Duration: {self.format_duration(float(duration))}")
            print()
        
        # Create output directory if it doesn't exist
        output_path = Path(output_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Build ffmpeg command
        cmd = ['ffmpeg', '-y', '-i', input_file] + self.ffmpeg_options + [output_file]
        
        if verbose:
            print("🔧 Processing with crystal clear settings:")
            print("   • Converting to mono")
            print("   • Variable bitrate (q:a 3) for high quality")
            print("   • 22050 Hz sample rate (speech optimized)")
            print("   • High-pass filter (removes low-frequency noise)")
            print("   • Spectral noise reduction")
            print("   • EQ boost at 2.5kHz for speech clarity")
            print()
            print("⚙️  Running ffmpeg...")
        
        # Execute compression
        start_time = time.time()
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            processing_time = time.time() - start_time
            
            # Get output file info
            if os.path.exists(output_file):
                output_size = os.path.getsize(output_file)
                output_info = self.get_audio_info(output_file)
                compression_ratio = input_size / output_size if output_size > 0 else 0
                
                info = {
                    "success": True,
                    "input_size": input_size,
                    "output_size": output_size,
                    "compression_ratio": compression_ratio,
                    "processing_time": processing_time,
                    "output_info": output_info
                }
                
                if verbose:
                    print("✅ Compression completed successfully!")
                    print()
                    print("📊 Results:")
                    print(f"   Output size: {self.format_file_size(output_size)}")
                    print(f"   Compression ratio: {compression_ratio:.1f}x")
                    print(f"   Processing time: {self.format_duration(processing_time)}")
                    print(f"   Size reduction: {((input_size - output_size) / input_size * 100):.1f}%")
                    
                    if output_info and 'streams' in output_info:
                        stream = output_info['streams'][0]
                        actual_bitrate = stream.get('bit_rate', 'unknown')
                        if actual_bitrate != 'unknown':
                            print(f"   Actual bitrate: {int(actual_bitrate) // 1000}k")
                    
                    print(f"   Output saved to: {output_file}")
                
                # Delete the source file after successful compression
                if delete_source:
                    try:
                        if os.path.exists(input_file):
                            os.remove(input_file)
                            if verbose:
                                print(f"   🗑️  Deleted source file: {input_file}")
                        else:
                            if verbose:
                                print(f"   ⚠️  Warning: Source file no longer exists: {input_file}")
                    except OSError as e:
                        if verbose:
                            print(f"   ⚠️  Warning: Could not delete source file '{input_file}': {e}")
                
                return True, info
            else:
                return False, {"error": "Output file was not created"}
                
        except subprocess.CalledProcessError as e:
            processing_time = time.time() - start_time
            error_msg = e.stderr if e.stderr else str(e)
            
            if verbose:
                print("❌ Compression failed!")
                print(f"Error: {error_msg}")
            
            return False, {
                "error": error_msg,
                "processing_time": processing_time
            }
    
    def process_single_file(self, file_info: Tuple[str, str, str, int, int]) -> Dict:
        """
        Process a single file for parallel execution.
        
        Args:
            file_info: Tuple of (input_file, output_file, filename, file_index, total_files)
            
        Returns:
            Dictionary with processing results
        """
        input_file, output_file, filename, file_index, total_files = file_info
        base_name = self.extract_base_name(filename)
        
        # Check if output file already exists
        if os.path.exists(output_file):
            with self.print_lock:
                print(f"[{file_index}/{total_files}] {filename}")
                print(f"   Base name: {base_name}")
                print(f"   Output: {base_name}/{os.path.basename(output_file)}")
                print(f"   ⏭️  Skipped (already exists)")
                print()
            return {"status": "skipped", "file": filename}
        
        # Check if input file exists and has valid size
        if not os.path.exists(input_file):
            with self.print_lock:
                print(f"[{file_index}/{total_files}] {filename}")
                print(f"   Base name: {base_name}")
                print(f"   ❌ Skipped: Input file not found")
                print()
            return {"status": "skipped", "file": filename, "error": "Input file not found"}
        
        input_size = os.path.getsize(input_file)
        if input_size == 0:
            with self.print_lock:
                print(f"[{file_index}/{total_files}] {filename}")
                print(f"   Base name: {base_name}")
                print(f"   ⏭️  Skipped: Empty file (0 bytes)")
                print()
            return {"status": "skipped", "file": filename, "error": "Empty file"}
        
        # Compress the file
        success, info = self.compress_audio(input_file, output_file, verbose=False, delete_source=False)
        
        with self.print_lock:
            print(f"[{file_index}/{total_files}] {filename}")
            print(f"   Base name: {base_name}")
            print(f"   Output: {base_name}/{os.path.basename(output_file)}")
            
            if success:
                print(f"   ✅ Compressed successfully!")
                print(f"   Size: {self.format_file_size(info['input_size'])} → {self.format_file_size(info['output_size'])}")
                print(f"   Compression: {info['compression_ratio']:.1f}x")
                
                # Delete the source file after successful compression
                try:
                    if os.path.exists(input_file):
                        os.remove(input_file)
                        print(f"   🗑️  Deleted source file")
                    else:
                        print(f"   ⚠️  Warning: Source file no longer exists")
                except OSError as e:
                    print(f"   ⚠️  Warning: Could not delete source file '{input_file}': {e}")
                
                print()
                return {"status": "success", "file": filename, "info": info}
            else:
                # Check if this is a skippable error (empty file)
                if info.get("skip", False):
                    print(f"   ⏭️  Skipped: {info.get('error', 'Unknown error')}")
                    print()
                    return {"status": "skipped", "file": filename, "error": info.get('error', 'Unknown error')}
                else:
                    print(f"   ❌ Failed: {info.get('error', 'Unknown error')}")
                    print(f"   ⏭️  Continuing with next file...")
                    print()
                    return {"status": "failed", "file": filename, "error": info.get('error', 'Unknown error')}
    
    def bulk_compress(self, source_directory: str = None, verbose: bool = True, max_workers: int = 4) -> Dict:
        """
        Process all MP3/M4A files in the source directory and organize them into folders.
        Uses parallel processing for faster compression.
        
        Args:
            source_directory: Directory containing MP3 files (defaults to current directory)
            verbose: Whether to print progress information
            max_workers: Number of parallel workers (default: 4)
            
        Returns:
            Dictionary with processing results
        """
        if source_directory is None:
            source_directory = os.getcwd()
        
        # Get all audio files
        audio_files = self.get_mp3_files(source_directory)
        
        if not audio_files:
            return {"error": "No MP3 or M4A files found in the directory"}
        
        results = {
            "total_files": len(audio_files),
            "processed": 0,
            "skipped": 0,
            "failed": 0,
            "errors": []
        }
        
        if verbose:
            print("🎵 Crystal Clear Bulk Audio Compressor (Parallel Processing)")
            print("=" * 60)
            print(f"Source directory: {source_directory}")
            print(f"Found {len(audio_files)} audio files to process")
            print(f"Using {max_workers} parallel workers")
            print()
        
        # Prepare file info for parallel processing
        file_tasks = []
        for i, input_file in enumerate(audio_files, 1):
            filename = os.path.basename(input_file)
            base_name = self.extract_base_name(filename)
            
            # Create output directory path
            output_dir = os.path.join(source_directory, base_name)
            output_file = os.path.join(output_dir, filename.replace('.m4a', '.mp3'))
            
            file_tasks.append((input_file, output_file, filename, i, len(audio_files)))
        
        # Process files in parallel
        start_time = time.time()
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Submit all tasks
            future_to_file = {executor.submit(self.process_single_file, task): task for task in file_tasks}
            
            # Process completed tasks
            for future in as_completed(future_to_file):
                try:
                    result = future.result()
                    
                    if result["status"] == "success":
                        results["processed"] += 1
                    elif result["status"] == "skipped":
                        results["skipped"] += 1
                    elif result["status"] == "failed":
                        results["failed"] += 1
                        results["errors"].append({"file": result["file"], "error": result["error"]})
                except Exception as e:
                    # Handle any unexpected errors in the worker thread
                    task = future_to_file[future]
                    filename = task[2]  # filename is at index 2 in the tuple
                    results["failed"] += 1
                    results["errors"].append({"file": filename, "error": f"Unexpected error: {str(e)}"})
                    if verbose:
                        with self.print_lock:
                            print(f"   ❌ Unexpected error processing {filename}: {e}")
                            print(f"   ⏭️  Continuing with next file...")
        
        processing_time = time.time() - start_time
        
        if verbose:
            print("🏁 Bulk compression completed!")
            print("=" * 60)
            print(f"Total files: {results['total_files']}")
            print(f"Processed: {results['processed']}")
            print(f"Skipped: {results['skipped']}")
            print(f"Failed: {results['failed']}")
            print(f"Total processing time: {self.format_duration(processing_time)}")
            print(f"Average time per file: {processing_time / len(audio_files):.1f}s")
            
            if results["errors"]:
                print("\n❌ Errors:")
                for error in results["errors"]:
                    print(f"   {error['file']}: {error['error']}")
        
        return results
    
    def get_mp3_files(self, directory: str) -> List[str]:
        """Get all MP3 and M4A files in the directory"""
        mp3_files = glob.glob(os.path.join(directory, "*.mp3"))
        m4a_files = glob.glob(os.path.join(directory, "*.m4a"))
        return mp3_files + m4a_files

def main():
    """Main function with command line interface"""
    parser = argparse.ArgumentParser(
        description="Crystal Clear Audio Compressor - Optimize speech audio with high quality variable bitrate encoding",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python3 crystal_clear_compressor.py input.wav output.mp3
  python3 crystal_clear_compressor.py recording.m4a compressed.mp3
  python3 crystal_clear_compressor.py --quiet input.wav output.mp3
  python3 crystal_clear_compressor.py --bulk-compress

Audio Processing Details:
  • Variable bitrate encoding (q:a 3) for optimal quality
  • Mono conversion for speech optimization
  • 22050 Hz sample rate (ideal for voice)
  • High-pass filter removes low-frequency noise
  • Spectral noise reduction for cleaner audio
  • EQ boost at 2.5kHz enhances speech clarity

Bulk Processing:
  • Processes all MP3/M4A files in current directory
  • Uses parallel processing (4 workers by default)
  • Organizes output into folders based on base name
  • Example: BavaBatra46.mp3 → BavaBatra/BavaBatra46.mp3
  • Skips files that already exist in output folders
  • Use --workers N to control parallel processing (1-8 workers)

Typical Results:
  • File size reduction: 80-90%
  • Quality: Excellent for speech
  • Processing time: Very fast
        """)
    
    parser.add_argument('input_file', nargs='?', help='Input audio file path')
    parser.add_argument('output_file', nargs='?', help='Output MP3 file path')
    parser.add_argument('-q', '--quiet', action='store_true', 
                       help='Quiet mode - minimal output')
    parser.add_argument('--bulk-compress', action='store_true',
                       help='Process all MP3/M4A files in current directory')
    parser.add_argument('--source-dir', default=None,
                       help='Source directory for bulk compression (defaults to current directory)')
    parser.add_argument('--workers', type=int, default=4,
                       help='Number of parallel workers for bulk compression (default: 4)')
    parser.add_argument('--version', action='version', version='Crystal Clear Compressor 1.0')
    
    args = parser.parse_args()
    
    # Initialize compressor
    compressor = CrystalClearCompressor()
    
    # Check ffmpeg availability
    if not compressor.check_ffmpeg():
        print("❌ Error: ffmpeg not found!")
        print("Please install ffmpeg first:")
        print("  macOS: brew install ffmpeg")
        print("  Ubuntu: sudo apt install ffmpeg")
        print("  Windows: Download from https://ffmpeg.org/")
        sys.exit(1)
    
    # Handle bulk compression
    if args.bulk_compress:
        source_dir = args.source_dir if args.source_dir else os.getcwd()
        verbose = not args.quiet
        max_workers = args.workers
        
        if max_workers < 1 or max_workers > 8:
            print("❌ Error: Number of workers must be between 1 and 8")
            sys.exit(1)
        
        results = compressor.bulk_compress(source_dir, verbose, max_workers)
        
        if "error" in results:
            print(f"❌ Error: {results['error']}")
            sys.exit(1)
        # Note: Removed the exit on failed files - script continues even with failures
        
        sys.exit(0)
    
    # Handle single file compression
    if not args.input_file or not args.output_file:
        print("❌ Error: Both input_file and output_file are required for single file compression")
        print("Use --bulk-compress for processing all files, or provide both input and output files")
        sys.exit(1)
    
    # Validate arguments
    input_file = args.input_file
    output_file = args.output_file
    verbose = not args.quiet
    
    if not os.path.exists(input_file):
        print(f"❌ Error: Input file '{input_file}' not found!")
        sys.exit(1)
    
    # Ensure output has .mp3 extension
    if not output_file.lower().endswith('.mp3'):
        print("⚠️  Warning: Output file should have .mp3 extension")
        response = input("Continue anyway? (y/N): ")
        if response.lower() != 'y':
            sys.exit(0)
    
    # Perform compression
    success, info = compressor.compress_audio(input_file, output_file, verbose)
    
    if success:
        if not verbose:
            print(f"✅ Compressed: {input_file} → {output_file}")
            print(f"   Size: {compressor.format_file_size(info['input_size'])} → {compressor.format_file_size(info['output_size'])} ({info['compression_ratio']:.1f}x compression)")
            
            # Delete the source file after successful compression
            try:
                if os.path.exists(input_file):
                    os.remove(input_file)
                    print(f"   🗑️  Deleted source file: {input_file}")
                else:
                    print(f"   ⚠️  Warning: Source file no longer exists: {input_file}")
            except OSError as e:
                print(f"   ⚠️  Warning: Could not delete source file '{input_file}': {e}")
        
        sys.exit(0)
    else:
        print(f"❌ Compression failed: {info.get('error', 'Unknown error')}")
        sys.exit(1)

if __name__ == "__main__":
    main()
