# Google Cloud Storage Migration Guide

This guide will help you migrate your Daf Yomi audio content from local files to Google Cloud Storage (GCS) for better performance, scalability, and reliability.

## Prerequisites

1. **Google Cloud Account**: You need a Google Cloud account with billing enabled
2. **Python 3**: Required for the upload script
3. **gcloud CLI**: Google Cloud command-line tool

## Setup Steps

### 1. Install Dependencies

Run the setup script to install required dependencies:

```bash
./gcp-upload/setup-gcs.sh
```

Or manually install:

```bash
pip3 install google-cloud-storage
```

### 2. Set up Google Cloud

1. **Create a new Google Cloud Project** (or use existing):
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one

2. **Enable Cloud Storage API**:
   - In the Console, go to "APIs & Services" → "Library"
   - Search for "Cloud Storage API" and enable it

3. **Install and authenticate gcloud CLI**:
   ```bash
   # Install gcloud CLI (if not already installed)
   # Follow instructions at: https://cloud.google.com/sdk/docs/install
   
   # Authenticate
   gcloud auth application-default login
   
   # Set your project
   gcloud config set project YOUR_PROJECT_ID
   ```

### 3. Configure the Upload Script

Edit `gcp-upload/upload-to-gcs.py` and update the configuration:

```python
BUCKET_NAME = "your-unique-bucket-name"  # Change this to your desired bucket name
```

**Important**: Bucket names must be globally unique across all of Google Cloud Storage.

### 4. Upload Your Content

1. **Test the upload first** (dry run):
   ```bash
   python3 gcp-upload/upload-to-gcs.py --dry-run
   ```

2. **Upload your content**:
   ```bash
   python3 gcp-upload/upload-to-gcs.py
   ```

The script will:
- Create a new GCS bucket (if it doesn't exist)
- Upload all MP3 files from your `content/` folder
- Make all files publicly accessible
- Update your `data.json` file with GCS URLs

## What Happens During Upload

### Bucket Structure
Your files will be organized in GCS as:
```
your-bucket-name/
├── content/
│   ├── Berakhot/
│   │   ├── Berakhot2.mp3
│   │   ├── Berakhot3.mp3
│   │   └── ...
│   ├── BavaBatra/
│   │   ├── BavaBatra10.mp3
│   │   └── ...
│   └── ...
```

### Updated Data Structure
Your `data.json` will be updated from:
```json
{
  "Berakhot": ["2", "3", "4", ...]
}
```

To:
```json
{
  "Berakhot": {
    "dafs": ["2", "3", "4", ...],
    "urls": {
      "2": "https://storage.googleapis.com/your-bucket/content/Berakhot/Berakhot2.mp3",
      "3": "https://storage.googleapis.com/your-bucket/content/Berakhot/Berakhot3.mp3",
      ...
    }
  }
}
```

## Code Changes

Your audio player has been automatically updated to:
- Support both old (local files) and new (GCS URLs) data formats
- Seamlessly switch between local and GCS sources
- Maintain backward compatibility

## Benefits of Using GCS

1. **Performance**: Global CDN ensures fast loading from anywhere
2. **Reliability**: 99.999999999% (11 9's) durability
3. **Scalability**: No storage limits
4. **Cost-effective**: Pay only for what you use
5. **Global accessibility**: Users worldwide get optimal performance

## Cost Estimation

For a typical Daf Yomi collection:
- **Storage**: ~$0.02 per GB per month
- **Network egress**: ~$0.12 per GB (first 1 GB free per month)
- **Operations**: Negligible for typical usage

Example: 10 GB of audio content with 1000 plays per month ≈ $2-5/month

## Security & Access

By default, the script makes all files publicly accessible. This is required for web playback. If you need to restrict access, you can:

1. Use signed URLs for temporary access
2. Implement authentication in your web app
3. Use Cloud CDN with custom domains

## Troubleshooting

### Authentication Issues
```bash
# Re-authenticate if needed
gcloud auth application-default login

# Check your authentication
gcloud auth list
```

### Bucket Name Conflicts
If you get a "bucket already exists" error, the bucket name is taken globally. Choose a different name.

### Upload Failures
- Check your internet connection
- Verify file permissions
- Ensure sufficient GCS quotas

### CORS Issues (if accessing from different domains)
Configure CORS for your bucket:
```bash
gsutil cors set cors.json gs://your-bucket-name
```

## Monitoring and Management

- **View usage**: Google Cloud Console → Storage
- **Monitor costs**: Google Cloud Console → Billing
- **Set up alerts**: Create budget alerts to monitor spending

## Rollback Plan

If you need to rollback to local files:
1. Keep your original `content/` folder
2. Restore the original `data.json` format
3. The player will automatically use local files

Your player code supports both formats, so you can switch back and forth as needed.

## Next Steps

After successful upload:
1. Test your audio player thoroughly
2. Monitor performance and costs
3. Consider setting up monitoring and alerting
4. Optionally remove local content files to save space

## Support

For issues:
1. Check Google Cloud Storage documentation
2. Review the upload script logs
3. Test with a small subset of files first
