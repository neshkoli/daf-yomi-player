#!/usr/bin/env bash
set -uo pipefail

# Directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Ensure .env is loaded if present
if [ -f ".env" ]; then
    set -a
    source .env
    set +a
fi

# Ensure ia.ini exists if keys are in .env
if [ ! -f "$HOME/.config/ia.ini" ] && [ -n "${ARCHIVE_S3_ACCESS_KEY:-}" ] && [ -n "${ARCHIVE_S3_SECRET_KEY:-}" ]; then
    mkdir -p "$HOME/.config"
    cat <<EOF > "$HOME/.config/ia.ini"
[s3]
access = $ARCHIVE_S3_ACCESS_KEY
secret = $ARCHIVE_S3_SECRET_KEY
EOF
    chmod 600 "$HOME/.config/ia.ini"
fi

# Target masechet or "all"
TARGET="${1:-}"

if [ -z "$TARGET" ]; then
    echo "Usage: $0 <MasechetName | all>"
    echo "Examples:"
    echo "  $0 Berakhot"
    echo "  $0 all"
    echo ""
    echo "Available Masechtot in content/:"
    for dir in content/*/; do
        if [ -d "$dir" ]; then
            basename "$dir"
        fi
    done
    exit 1
fi

wait_for_queue() {
    while true; do
        local queued
        # Exclude dafyomi-audio-berakhot tasks which are waiting on storage node ia600701 maintenance
        queued=$( (ia tasks -l 2>/dev/null || true) | (grep -v "dafyomi-audio-berakhot" || true) | wc -l )
        queued=$(echo "$queued" | tr -dc '0-9')
        queued=${queued:-0}
        if [ "$queued" -ge 20 ]; then
            echo "Queue has $queued active tasks pending on Archive.org. Waiting 60s for cluster workers to drain..."
            sleep 60
        else
            echo "Archive.org active queue check OK ($queued active pending tasks)."
            break
        fi
    done
}

upload_masechet() {
    local masechet="$1"
    local dir="content/$masechet"
    
    if [ ! -d "$dir" ]; then
        echo "Error: Directory '$dir' not found!"
        return 1
    fi
    
    # Generate unique lowercase item identifier
    local lower_name
    lower_name=$(echo "$masechet" | tr '[:upper:]' '[:lower:]')
    local item_id="dafyomi-audio-${lower_name}"
    
    echo "=========================================================="
    echo "Uploading Masechet: $masechet"
    echo "Archive.org Item:   $item_id"
    echo "Source folder:      $dir"
    echo "=========================================================="
    
    # Check queue pressure before starting upload
    wait_for_queue
    
    # Collect all mp3 files
    local files=()
    while IFS= read -r -d '' file; do
        files+=("$file")
    done < <(find "$dir" -maxdepth 1 -name "*.mp3" -print0 | sort -z)
    
    local total_files=${#files[@]}
    if [ "$total_files" -eq 0 ]; then
        echo "No .mp3 files found in $dir"
        return 0
    fi
    
    echo "Found $total_files MP3 files."
    
    # Check if already fully uploaded to Archive.org
    local existing_count
    existing_count=$(curl -s "https://archive.org/metadata/${item_id}/files_count" | grep -o '[0-9]\+' | head -n 1 || true)
    existing_count=${existing_count:-0}
    if [ "$existing_count" -ge "$total_files" ]; then
        echo "Masechet $masechet already has $existing_count files on Archive.org. Skipping."
        echo ""
        return 0
    fi

    # Prepare upload list including cover.jpg for album art
    local upload_files=("${files[@]}")
    if [ -f "cover.jpg" ]; then
        upload_files+=("cover.jpg")
    fi

    # Upload with ia cli in a resilient retry loop
    local attempt=1
    local max_attempts=20
    while [ "$attempt" -le "$max_attempts" ]; do
        echo "Upload attempt $attempt of $max_attempts for $masechet..."
        if ia upload "$item_id" "${upload_files[@]}" \
            -m "mediatype:audio" \
            -m "collection:opensource_audio" \
            -m "title:Daf Yomi - $masechet" \
            -m "creator:R. Darren Platzky" \
            -m "language:heb" \
            -m "description:Daf Yomi audio shiurim by R. Darren Platzky for Masechet $masechet" \
            -c -n -R 5; then
            echo "Successfully uploaded $masechet ($total_files files) to $item_id."
            break
        else
            echo "Upload paused (Archive.org rate limit or network error). Waiting 90s before retry..."
            sleep 90
            ((attempt++))
        fi
    done
    
    echo ""
}

if [ "$TARGET" = "all" ]; then
    echo "Starting upload for ALL masechtot in content/..."
    for dir in content/*/; do
        if [ -d "$dir" ]; then
            masechet_name=$(basename "$dir")
            # Berakhot is already uploaded to S3 (staged in queue on ia600701)
            if [ "$masechet_name" = "Berakhot" ]; then
                echo "Skipping Berakhot (already 100% uploaded to S3, waiting in cluster catalog queue)."
                continue
            fi
            upload_masechet "$masechet_name"
        fi
    done
    echo "All masechtot upload process finished!"
else
    upload_masechet "$TARGET"
fi
