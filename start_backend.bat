@echo off
echo 🚀 Starting Hybrid AI Backend...
echo.
echo Changing to backend directory...
cd /d "C:\Users\HP\Desktop\3D DASHBOARD DIGITAL TWIN - Copie - Copie\ai_backend"

echo Installing/updating Python dependencies...
pip install -r requirements.txt

echo.
echo Starting the backend server...
echo Backend will be available at http://localhost:5000
echo.
python hybrid_backend.py

pause
