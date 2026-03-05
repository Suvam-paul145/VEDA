@echo off
echo ==========================================
echo    VEDA LEARN - CLOUDWATCH LOGS MONITOR
echo ==========================================

echo.
echo This script helps you monitor CloudWatch logs for debugging.
echo.

echo Available Lambda functions:
echo 1. authCallback
echo 2. analyze  
echo 3. lesson
echo 4. lessonDeep
echo 5. quiz
echo 6. progressGet
echo 7. progressUpdate
echo 8. wsConnect
echo 9. wsDisconnect
echo.

set /p FUNCTION_CHOICE="Enter function number to monitor (1-9): "

if "%FUNCTION_CHOICE%"=="1" set FUNCTION_NAME=authCallback
if "%FUNCTION_CHOICE%"=="2" set FUNCTION_NAME=analyze
if "%FUNCTION_CHOICE%"=="3" set FUNCTION_NAME=lesson
if "%FUNCTION_CHOICE%"=="4" set FUNCTION_NAME=lessonDeep
if "%FUNCTION_CHOICE%"=="5" set FUNCTION_NAME=quiz
if "%FUNCTION_CHOICE%"=="6" set FUNCTION_NAME=progressGet
if "%FUNCTION_CHOICE%"=="7" set FUNCTION_NAME=progressUpdate
if "%FUNCTION_CHOICE%"=="8" set FUNCTION_NAME=wsConnect
if "%FUNCTION_CHOICE%"=="9" set FUNCTION_NAME=wsDisconnect

if "%FUNCTION_NAME%"=="" (
    echo Invalid choice. Please run the script again.
    pause
    exit /b 1
)

set LOG_GROUP=/aws/lambda/veda-learn-api-dev-%FUNCTION_NAME%

echo.
echo 📊 Monitoring logs for: %FUNCTION_NAME%
echo Log Group: %LOG_GROUP%
echo.
echo Press Ctrl+C to stop monitoring...
echo.

aws logs tail %LOG_GROUP% --follow

pause