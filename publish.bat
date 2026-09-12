@echo off
REM ---------------------------------------------------------------------------
REM  Builds a clean "publish" folder containing ONLY the files that belong on
REM  your web host.
REM
REM  This matters: the studio\ folder is the Sanity editor, not part of the
REM  website, and it contains hundreds of megabytes of node_modules. Uploading
REM  the whole Website folder by mistake would be slow and pointless.
REM
REM  Run this, then upload (or commit) the contents of the publish folder.
REM ---------------------------------------------------------------------------

cd /d "%~dp0"

if exist "publish" rmdir /s /q "publish"
mkdir "publish"

echo.
echo   Collecting site files...

robocopy "."        "publish"         *.html /njh /njs /ndl /nc /ns >nul
robocopy "css"      "publish\css"     /e /njh /njs /ndl /nc /ns >nul
robocopy "js"       "publish\js"      /e /njh /njs /ndl /nc /ns >nul
robocopy "images"   "publish\images"  /e /njh /njs /ndl /nc /ns >nul
robocopy "content"  "publish\content" /e /njh /njs /ndl /nc /ns >nul

REM .nojekyll stops GitHub Pages running the site through Jekyll, which can
REM silently skip files. Harmless on every other host.
if exist ".nojekyll" copy /y ".nojekyll" "publish\.nojekyll" >nul

REM CNAME tells GitHub Pages which custom domain to answer on.
if exist "CNAME" copy /y "CNAME" "publish\CNAME" >nul

echo.
echo   Done. Upload the CONTENTS of this folder:
echo   %cd%\publish
echo.
echo   Files included:
dir /b "publish"
echo.
pause
