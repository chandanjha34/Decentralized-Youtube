#!/bin/bash

# Cross-Browser Testing Execution Script
# Requirements: 1.2, 11.1, 11.2

echo "🌐 Cross-Browser Testing Suite"
echo "=============================="
echo ""

# Check if Playwright is installed
if ! command -v npx &> /dev/null; then
    echo "❌ Error: npx not found. Please install Node.js"
    exit 1
fi

# Check if browsers are installed
echo "📦 Checking browser installation..."
if ! npx playwright --version &> /dev/null; then
    echo "⚠️  Playwright browsers not installed"
    echo "Installing browsers..."
    npx playwright install
fi

echo ""
echo "🚀 Starting tests..."
echo ""

# Run tests with different configurations based on argument
case "$1" in
  "chrome")
    echo "Testing on Chrome only..."
    npx playwright test --project=chromium
    ;;
  "firefox")
    echo "Testing on Firefox only..."
    npx playwright test --project=firefox
    ;;
  "safari")
    echo "Testing on Safari (WebKit) only..."
    npx playwright test --project=webkit
    ;;
  "mobile")
    echo "Testing on mobile browsers..."
    npx playwright test --project="Mobile Chrome" --project="Mobile Safari"
    ;;
  "ui")
    echo "Opening interactive UI mode..."
    npx playwright test --ui
    ;;
  "debug")
    echo "Running in debug mode..."
    npx playwright test --debug
    ;;
  "report")
    echo "Opening test report..."
    npx playwright show-report
    ;;
  *)
    echo "Running all browser tests..."
    npx playwright test
    ;;
esac

EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ All tests passed!"
    echo ""
    echo "📊 View detailed report:"
    echo "   npm run test:browser:report"
else
    echo "❌ Some tests failed"
    echo ""
    echo "🔍 Debug options:"
    echo "   npm run test:browser:ui      # Interactive mode"
    echo "   ./scripts/run-browser-tests.sh debug  # Debug mode"
    echo ""
    echo "📋 Manual testing:"
    echo "   See tests/CROSS_BROWSER_CHECKLIST.md"
fi

echo ""
echo "📚 Documentation: tests/README.md"

exit $EXIT_CODE
