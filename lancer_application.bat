@echo off
title Secretariat - Messagerie et archivage
cd /d "%~dp0"

rem ==========================================================
rem  Lancement de l'application sur ce PC
rem  - Si Python est disponible : petit serveur local 8080
rem  - Sinon : ouverture directe du fichier HTML
rem ==========================================================

python --version >nul 2>&1
if not errorlevel 1 goto withpython

py --version >nul 2>&1
if not errorlevel 1 goto withpy

echo [!] Python introuvable - ouverture directe dans le navigateur.
start "" "index.html"
timeout /t 3 >nul
exit /b 0

:withpy
echo [i] Demarrage du serveur local sur http://localhost:8080 ...
start "" http://localhost:8080/
py -m http.server 8080
goto end

:withpython
echo [i] Demarrage du serveur local sur http://localhost:8080 ...
start "" http://localhost:8080/
python -m http.server 8080
goto end

:end
echo.
echo Serveur arrete. Vous pouvez fermer cette fenetre.
pause >nul
