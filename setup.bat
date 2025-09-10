@echo off
echo 🧠 Intelligent Digital Twin Setup Script
echo gpt-oss Hackathon Entry
echo ==============================================

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    python3 --version >nul 2>&1
    if errorlevel 1 (
        echo ❌ Python is not installed. Please install Python first.
        pause
        exit /b 1
    )
)

echo ✅ Prerequisites check passed

REM Install Node.js dependencies
echo 📦 Installing frontend dependencies...
call npm install

REM Install Python dependencies
echo 🐍 Installing AI backend dependencies...
cd ai_backend
call pip install -r requirements.txt
cd ..

echo ✅ Dependencies installed successfully!

echo.
echo 🧠 Optional: Install gpt-oss for enhanced offline capabilities
echo Visit: https://ollama.ai/ and run:
echo   ollama pull gpt-oss-20b
echo   # or for more power:
echo   ollama pull gpt-oss-120b
echo.

echo 🎯 READY TO RUN!
echo ==================
echo.
echo Terminal 1 - Frontend:
echo   npm run dev
echo   → http://localhost:5173
echo.
echo Terminal 2 - AI Backend:
echo   cd ai_backend ^&^& python app.py
echo   → http://localhost:5000
echo.
echo Terminal 3 - gpt-oss (Optional):
echo   ollama serve
echo   → http://localhost:11434
echo.
echo 🎪 Demo ready! Open http://localhost:5173 in your browser
echo 💬 Try asking: 'What's the temperature trend for CNC Mill 3?'

pause
