#!/bin/bash

# 🧠 Intelligent Digital Twin Setup Script
# gpt-oss Hackathon Entry

echo "🚀 Setting up Intelligent Digital Twin with LSTM Memory..."
echo "=============================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if Python is installed
if ! command -v python &> /dev/null && ! command -v python3 &> /dev/null; then
    echo "❌ Python is not installed. Please install Python first."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Install Node.js dependencies
echo "📦 Installing frontend dependencies..."
npm install

# Install Python dependencies
echo "🐍 Installing AI backend dependencies..."
cd ai_backend
pip install -r requirements.txt
cd ..

echo "✅ Dependencies installed successfully!"

echo ""
echo "🧠 Optional: Install gpt-oss for enhanced offline capabilities"
echo "Visit: https://ollama.ai/ and run:"
echo "  ollama pull gpt-oss-20b"
echo "  # or for more power:"
echo "  ollama pull gpt-oss-120b"
echo ""

echo "🎯 READY TO RUN!"
echo "=================="
echo ""
echo "Terminal 1 - Frontend:"
echo "  npm run dev"
echo "  → http://localhost:5173"
echo ""
echo "Terminal 2 - AI Backend:"
echo "  cd ai_backend && python app.py"
echo "  → http://localhost:5000"
echo ""
echo "Terminal 3 - gpt-oss (Optional):"
echo "  ollama serve"
echo "  → http://localhost:11434"
echo ""
echo "🎪 Demo ready! Open http://localhost:5173 in your browser"
echo "💬 Try asking: 'What's the temperature trend for CNC Mill 3?'"
