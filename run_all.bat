@echo off
echo Starting SARATHI Multi-Domain Intelligence Platform...
start "SARATHI Backend (Port 4000)" cmd /c "node server/src/index.js"
start "SARATHI Frontend (Port 5173)" cmd /c "npm run dev"
echo Backend running on http://localhost:4000
echo Frontend running on http://localhost:5173
