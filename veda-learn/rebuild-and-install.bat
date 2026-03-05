@echo off
echo ==========================================
echo    REBUILD AND INSTALL VEDA LEARN EXTENSION
echo ==========================================

echo.
echo 🔄 STEP 1: COMPILING UPDATED SOURCE CODE...
call npm run compile
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Compilation failed
    pause
    exit /b 1
)

echo.
echo ✅ COMPILATION SUCCESSFUL!
echo.
echo 📦 STEP 2: CREATING NEW VSIX PACKAGE...
call vsce package --allow-star-activation
if %ERRORLEVEL% neq 0 (
    echo [ERROR] VSIX packaging failed
    pause
    exit /b 1
)

echo.
echo ✅ NEW VSIX PACKAGE CREATED!
echo.
echo 🔧 STEP 3: INSTALLATION OPTIONS
echo.
echo Choose your installation method:
echo.
echo A) INSTALL VIA VS CODE UI (Recommended)
echo    1. Open VS Code
echo    2. Go to Extensions (Ctrl+Shift+X)
echo    3. Click "..." menu → "Install from VSIX..."
echo    4. Select the new veda-learn-0.0.1.vsix file
echo    5. Reload VS Code when prompted
echo.
echo B) INSTALL VIA COMMAND LINE
echo    code --install-extension veda-learn-0.0.1.vsix
echo.
echo 📋 FILES CREATED:
for %%f in (*.vsix) do echo    - %%f
echo.
echo 🎯 AFTER INSTALLATION:
echo    1. Reload VS Code window (Ctrl+Shift+P → "Developer: Reload Window")
echo    2. Look for "Veda Learn" in Activity Bar
echo    3. Open Developer Console (F12) for debugging
echo    4. Test the OAuth flow
echo.
echo ⚠️  IMPORTANT: 
echo    - Uninstall the old version first if you have one installed
echo    - The new VSIX contains all the OAuth fixes
echo    - Check console logs for detailed debugging info
echo.

set /p choice="Press A for UI installation, B for command line, or any key to continue: "

if /i "%choice%"=="A" (
    echo.
    echo 🎯 OPENING VS CODE FOR MANUAL INSTALLATION...
    echo Please follow the UI installation steps above.
    code .
) else if /i "%choice%"=="B" (
    echo.
    echo 🔧 INSTALLING VIA COMMAND LINE...
    for %%f in (*.vsix) do (
        echo Installing %%f...
        code --install-extension %%f
        if %ERRORLEVEL% equ 0 (
            echo ✅ Extension installed successfully!
            echo Please reload VS Code to activate the extension.
        ) else (
            echo ❌ Installation failed. Try manual installation.
        )
    )
)

echo.
echo 🚀 INSTALLATION COMPLETE!
echo.
echo Next steps:
echo 1. Reload VS Code (Ctrl+Shift+P → "Developer: Reload Window")
echo 2. Open Veda Learn from Activity Bar
echo 3. Test GitHub OAuth flow
echo 4. Check console logs (F12) for debugging
echo.
pause