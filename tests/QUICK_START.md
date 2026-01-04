# Cross-Browser Testing - Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Install Browsers
```bash
npx playwright install
```

This installs Chrome, Firefox, and Safari (WebKit) browsers for testing.

### Step 2: Run Tests
```bash
npm run test:browser
```

This runs all automated tests across all browsers.

### Step 3: View Results
```bash
npm run test:browser:report
```

This opens an HTML report showing test results.

## 📋 What Gets Tested

### ✅ Font Loading (Requirement 1.2)
- Inter font for body text
- Instrument Serif for headings
- No flash of unstyled text

### ✅ Animations (Requirement 11.1)
- Button hover transitions
- Card hover effects
- Progress bar animations
- Dashboard carousel

### ✅ Page Transitions (Requirement 11.2)
- Smooth navigation
- No layout shifts
- Loading states

## 🎯 Test Specific Browser

```bash
# Chrome only
npx playwright test --project=chromium

# Firefox only
npx playwright test --project=firefox

# Safari only
npx playwright test --project=webkit
```

## 🔍 Interactive Testing

```bash
npm run test:browser:ui
```

Opens a UI where you can:
- Watch tests run in real-time
- Debug failures step-by-step
- Inspect DOM and network
- Replay test execution

## 📱 Mobile Testing

```bash
npx playwright test --project="Mobile Chrome" --project="Mobile Safari"
```

## 📖 Full Documentation

- **Setup Guide:** `tests/README.md`
- **Manual Checklist:** `tests/CROSS_BROWSER_CHECKLIST.md`
- **Implementation Details:** `tests/IMPLEMENTATION_SUMMARY.md`
- **Validation Report:** `tests/VALIDATION_REPORT.md`

## 🐛 Debugging Failed Tests

```bash
# Run in debug mode
npx playwright test --debug

# Run specific test
npx playwright test -g "should load Inter font"
```

## ✅ Manual Testing

For visual verification:
1. Start dev server: `npm run dev`
2. Open `tests/CROSS_BROWSER_CHECKLIST.md`
3. Test in Chrome, Firefox, Safari
4. Check off items as you verify them

## 🎨 What to Look For

### Fonts
- Text should use Inter font
- Headings should use Instrument Serif
- No font loading flicker

### Animations
- Smooth hover effects on buttons
- Smooth transitions on cards
- Progress bars animate smoothly

### Transitions
- Page navigation is smooth
- No content jumping
- Loading states appear

## 💡 Tips

- Run tests before committing code
- Use interactive mode for debugging
- Check manual checklist for visual issues
- Update tests when adding features

## 🆘 Troubleshooting

**Tests timing out?**
- Check if dev server is running
- Increase timeout in `playwright.config.ts`

**Fonts not loading?**
- Check network tab in UI mode
- Verify font files are accessible

**Animations not working?**
- Check CSS transition properties
- Verify JavaScript animations aren't disabled

## 📞 Need Help?

1. Check `tests/README.md` for detailed docs
2. Review Playwright docs: https://playwright.dev
3. Check browser compatibility: https://caniuse.com

---

**Ready to test?** Run `npm run test:browser` to get started! 🎉
