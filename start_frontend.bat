@echo off
echo 🌐 Starting Frontend Development Server...
echo.
echo Changing to project directory...
cd /d "C:\Users\HP\Desktop\3D DASHBOARD DIGITAL TWIN - Copie - Copie"

echo Installing/updating dependencies...
npm install

echo.
echo Starting the development server...
echo Frontend will be available at http://localhost:5173 or similar
echo.
npm run dev

pause
