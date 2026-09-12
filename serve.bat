@echo off
REM ---------------------------------------------------------------------------
REM  Starts a local web server for this website and opens it in your browser.
REM
REM  Why this is needed: opening blog.html by double-clicking it gives the page
REM  a "file://" address, and browsers refuse to let such pages load outside
REM  content - which is where your blog posts now live. Serving the folder
REM  over http:// fixes that.
REM
REM  Leave this window open while you browse. Close it to stop the server.
REM ---------------------------------------------------------------------------

cd /d "%~dp0"

echo.
echo   Serving %cd%
echo   at http://localhost:4321
echo.
echo   Leave this window open. Press Ctrl+C or close it to stop.
echo.

REM Open the browser a moment later, once the server has had time to bind.
start /b "" cmd /c "ping -n 3 127.0.0.1 >nul & explorer http://localhost:4321/blog.html"

REM --bind 127.0.0.1 keeps this reachable only from this computer. Without it,
REM Python serves to every device on your network, which is not what you want
REM when the folder being served is your own files.
python -m http.server 4321 --bind 127.0.0.1

echo.
echo   Server stopped.
echo   If you saw "address already in use", another server is on port 4321.
echo   Find and stop it with:  netstat -ano ^| findstr :4321
echo.
pause
