@echo off
REM Import CSV/Excel Keywords Script
REM This batch file runs the Node.js script to import keywords from CSV/Excel files

echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║           CSV/Excel Keyword Import Tool                       ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0.."

REM Default values
set "DEFAULT_DIR=C:\Users\Jeetk\Documents\Question keywords vidiq"
set "DEFAULT_USER=default-user"

REM Use defaults or command line arguments
set "DIR_PATH=%~1"
set "USER_ID=%~2"

if "%DIR_PATH%"=="" set "DIR_PATH=%DEFAULT_DIR%"
if "%USER_ID%"=="" set "USER_ID=%DEFAULT_USER%"

echo Running import script...
echo.

node scripts\import-csv-keywords.js "%DIR_PATH%" "%USER_ID%"

echo.
pause
