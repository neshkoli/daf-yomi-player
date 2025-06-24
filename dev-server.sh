#!/bin/bash

# Development server script for Daf Yomi Player
# This script builds the data and starts a local server for testing

echo "🚀 Starting Daf Yomi Player Development Server"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js to continue."
    echo "   Download from: https://nodejs.org/"
    exit 1
fi

# Build the data structure
echo "📊 Building audio data structure..."
node build.js

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please check your content folder structure."
    exit 1
fi

echo ""
echo "✅ Build completed successfully!"
echo ""

# Check if http-server is available
if ! command -v npx &> /dev/null; then
    echo "❌ npx is not available. Please install Node.js with npm."
    exit 1
fi

# Start the development server
echo "🌐 Starting local development server..."
echo "📱 Your Daf Yomi Player will be available at:"
echo "   👉 http://localhost:8080"
echo ""
echo "🔧 Development Tips:"
echo "   • Press Ctrl+C to stop the server"
echo "   • Refresh browser to see changes"
echo "   • Check browser console (F12) for any errors"
echo ""

# Start HTTP server with cache disabled for development
npx http-server -p 8080 -c-1 --cors
