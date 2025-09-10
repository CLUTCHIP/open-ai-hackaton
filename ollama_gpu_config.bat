@echo off
echo Setting up Ollama for maximum GPU usage...

REM Stop any running Ollama processes
taskkill /f /im ollama.exe 2>nul

REM Set environment variables for maximum GPU usage
set CUDA_VISIBLE_DEVICES=0
set OLLAMA_NUM_GPU=1
set OLLAMA_GPU_LAYERS=999
set OLLAMA_HOST=0.0.0.0:11434
set OLLAMA_MAX_LOADED_MODELS=1

echo Starting Ollama with GPU optimization...
ollama serve

pause
