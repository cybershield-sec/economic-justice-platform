#!/bin/bash

# Test script for C++ ASM Browser/Editor/Server

echo "🧪 Testing C++ ASM Server Compilation..."

# Check if make is available
if ! command -v make &> /dev/null; then
    echo "❌ Make is not installed. Please install build-essential package."
    echo "   sudo apt-get install build-essential"
    exit 1
fi

# Check if g++ is available
if ! command -v g++ &> /dev/null; then
    echo "❌ g++ compiler is not installed. Please install build-essential package."
    echo "   sudo apt-get install build-essential"
    exit 1
fi

# Test compilation
echo "🔧 Testing compilation..."
if make test-compile; then
    echo "✅ Compilation test passed"
else
    echo "❌ Compilation test failed"
    exit 1
fi

# Build the server
echo "🔧 Building server..."
if make; then
    echo "✅ Build successful"

    # Check if the binary was created
    if [ -f "cpp-server" ]; then
        echo "✅ Binary created: cpp-server"
        echo "📋 File size: $(du -h cpp-server | cut -f1)"
        echo "🏗️  Architecture: $(file cpp-server | cut -d: -f2)"
    else
        echo "❌ Binary not found"
        exit 1
    fi
else
    echo "❌ Build failed"
    exit 1
fi

echo ""
echo "🎉 C++ ASM Server is ready!"
echo ""
echo "To run the server:"
echo "  npm run cpp:run"
echo "  or"
echo "  ./cpp-server"
echo ""
echo "To access the editor:"
echo "  Open http://localhost:8000/edit in your browser"
echo ""
echo "Available npm commands:"
echo "  npm run cpp:build    - Build the server"
echo "  npm run cpp:run      - Build and run the server"
echo "  npm run cpp:clean    - Clean build artifacts"
echo "  npm run cpp:server   - Run the compiled server"
echo "  npm run cpp:edit     - Show editor access instructions"