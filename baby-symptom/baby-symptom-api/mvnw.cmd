@echo off
rem 第一次執行會自動下載 Maven 3.9.11，之後直接使用
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0mvnw.ps1" %*
exit /b %ERRORLEVEL%
