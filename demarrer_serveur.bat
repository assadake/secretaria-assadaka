@echo off
title Secretariat - Archive partagee
cd /d "%~dp0"

python --version >nul 2>&1
if not errorlevel 1 goto runpy
py --version >nul 2>&1
if not errorlevel 1 goto runpy2
echo [!] Python n'est pas installe sur ce PC.
echo     Installez-le depuis https://www.python.org/downloads/  ^(cochez "Add Python to PATH"^)
pause
exit /b 1

:runpy2
py server.py
goto end
:runpy
python server.py
goto end

:end
pause
