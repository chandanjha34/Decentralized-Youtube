@echo off
REM Cross-Browser Testing Execution Script (Windows)
REM Requirements: 1.2, 11.1, 11.2

echo.
echo 🌐 Cross-Browser Testing Suite
echo ==============================
echo.

REM Check if Playwright is installed
where npx >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Error: npx not found. Please install Node.js
    exit /b 1
)

REM Check if browsers are installed
echo 📦 Checking browser installation...
npx playwright --version >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ⚠️  Playwright browsers not installed
    echo Installing browsers...
    npx playwright install
)

echo.
echo 🚀 Starting tests...
echo.

REM Run tests based on argument
if "%1"=="chrome" (
    echo Testing on Chrome only...
    npx playwright test --project=chromium
) else if "%1"=="firefox" (
    echo Testing on Firefox only...
    npx playwright test --project=firefox
) else if "%1"=="safari" (
    echo Testing on Safari ^(WebKit^) only...
    npx playwright test --project=webkit
) else if "%1"=="mobile" (
    echo Testing on mobile browsers...
    npx playwright test --project="Mobile Chrome" --project="Mobile Safari"
) else if "%1"=="ui" (
    echo Opening interactive UI mode...
    npx playwright test --ui
) else if "%1"=="debug" (
    echo Running in debug mode...
    npx playwright test --debug
) else if "%1"=="report" (
    echo Opening test report...
    npx playwright show-report
) else (
    echo Running all browser tests...
    npx playwright test
)

set EXIT_CODE=%ERRORLEVEL%

echo.
if %EXIT_CODE% EQU 0 (
    echo ✅ All tests passed!
    echo.
    echo 📊 View detailed report:
    echo    npm run test:browser:report
) else (
    echo ❌ Some tests failed
    echo.
    echo 🔍 Debug options:
    echo    npm run test:browser:ui           # Interactive mode
    echo    scripts\run-browser-tests.bat debug  # Debug mode
    echo.
    echo 📋 Manual testing:
    echo    See tests\CROSS_BROWSER_CHECKLIST.md
)

echo.
echo 📚 Documentation: tests\README.md

exit /b %EXIT_CODE%
