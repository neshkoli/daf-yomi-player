#!/bin/bash

# Helper script to run GCP upload utilities from project root
# Usage examples:
#   ./run-utils.sh check-env.py
#   ./run-utils.sh upload-to-gcs.py --dry-run
#   ./run-utils.sh test-setup.py

# Activate virtual environment
source venv/bin/activate

# Change to project directory
cd "$(dirname "$0")"

# Run the specified utility
if [ $# -eq 0 ]; then
    echo "Usage: $0 <script-name> [args...]"
    echo ""
    echo "Available GCP upload scripts:"
    echo "  check-env.py        - Validate environment configuration"
    echo "  upload-to-gcs.py    - Upload content to Google Cloud Storage"
    echo "  test-setup.py       - Test and verify setup"
    echo "  test-single-upload.py - Test single file upload"
    echo "  configure-public-access.py - Configure bucket public access"
    echo ""
    echo "Examples:"
    echo "  $0 check-env.py"
    echo "  $0 upload-to-gcs.py --dry-run"
    echo "  $0 test-setup.py"
    exit 1
fi

script_name=$1
shift  # Remove first argument, keep the rest

# Check if script exists
if [ ! -f "gcp-upload/$script_name" ]; then
    echo "Error: Script 'gcp-upload/$script_name' not found"
    echo "Available scripts in gcp-upload/:"
    ls gcp-upload/*.py 2>/dev/null || echo "No Python scripts found in gcp-upload/"
    exit 1
fi

# Run the script with remaining arguments
python3 "gcp-upload/$script_name" "$@"
