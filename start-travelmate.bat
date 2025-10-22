@echo off
title TravelMate - All-in-One Virtual Travel Guide

echo ================================================
echo    TravelMate - AI Travel Guide
echo ================================================
echo.
echo Starting services...
echo.

REM Check if Redis is running
echo [1/4] Checking Redis...
docker ps | findstr redis-travelmate > nul
if %errorlevel% neq 0 (
    echo Redis container not running. Starting Redis...
    docker start redis-travelmate > nul 2>&1
    if %errorlevel% neq 0 (
        echo Warning: Redis not available. Backend will use in-memory storage.
    ) else (
        echo Redis started successfully!
    )
) else (
    echo Redis is already running!
)
echo.

REM Start Backend Server
echo [2/4] Starting Backend Server...
start "TravelMate Backend" cmd /k "cd /d %~dp0backend && .venv\Scripts\activate && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"
echo Backend server starting at http://localhost:8000
echo.

REM Wait for backend to initialize
echo [3/4] Waiting for backend to initialize...
timeout /t 5 /nobreak > nul
echo.

REM Start Frontend Web App
echo [4/4] Starting Frontend Web App...
start "TravelMate Frontend" cmd /k "cd /d %~dp0 && npm run dev"
echo Frontend app starting at http://localhost:5173
echo.

echo ================================================
echo    Services Started Successfully!
echo ================================================
echo.
echo Backend API: http://localhost:8000
echo Backend Docs: http://localhost:8000/docs
echo Frontend App: http://localhost:5173
echo.
echo Press any key to open the app in your browser...
pause > nul

REM Open browser
start http://localhost:5173

echo.
echo TravelMate is now running!
echo Close the terminal windows to stop the services.
echo.
pause
