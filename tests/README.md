# Cross-Browser Testing Guide

This directory contains automated and manual tests for cross-browser compatibility.

## Requirements Validated

- **1.2**: Font loading (Inter and Instrument Serif)
- **11.1**: Hover transitions and animations
- **11.2**: Page transitions

## Setup

### Install Dependencies

```bash
npm install
```

### Install Playwright Browsers

```bash
npx playwright install
```

This will install Chromium, Firefox, and WebKit (Safari) browsers.

## Running Tests

### Run All Cross-Browser Tests

```bash
npm run test:browser
```

This runs tests across Chrome, Firefox, and Safari (WebKit).

### Run Tests for Specific Browser

```bash
# Chrome only
npx playwright test --project=chromium

# Firefox only
npx playwright test --project=firefox

# Safari only
npx playwright test --project=webkit
```

### Run Tests in UI Mode (Interactive)

```bash
npm run test:browser:ui
```

This opens an interactive UI where you can:
- See tests running in real-time
- Debug failing tests
- Inspect DOM and network requests
- Step through test execution

### View Test Report

After running tests, view the HTML report:

```bash
npm run test:browser:report
```

## Test Structure

### Automated Tests (`cross-browser-test.spec.ts`)

The automated test suite covers:

1. **Font Loading Tests**
   - Verifies Inter font loads for body text
   - Verifies Instrument Serif loads for headings
   - Checks fonts are ready before content display

2. **Animation and Transition Tests**
   - Button hover transitions
   - Card hover effects
   - Progress bar animations
   - Page navigation transitions

3. **Layout and Rendering Tests**
   - Navigation presence on all pages
   - Footer presence on all pages
   - Layout consistency

4. **Responsive Design Tests**
   - Mobile viewport (375px)
   - Tablet viewport (768px)
   - Desktop viewport (1920px)

5. **Color and Styling Tests**
   - Background colors
   - Text colors
   - Border styling

6. **Performance Tests**
   - Page load times
   - Console error checking

### Manual Testing Checklist (`CROSS_BROWSER_CHECKLIST.md`)

Use this checklist for manual verification of:
- Visual appearance across browsers
- Animation smoothness
- Font rendering quality
- Browser-specific issues

## Debugging Failed Tests

### Take Screenshots

Playwright automatically takes screenshots on failure. Find them in:
```
test-results/
```

### Run Tests in Debug Mode

```bash
npx playwright test --debug
```

This opens the Playwright Inspector for step-by-step debugging.

### Run Specific Test

```bash
npx playwright test -g "should load Inter font correctly"
```

## Browser-Specific Notes

### Chrome (Chromium)
- Best support for modern CSS features
- Font rendering uses system settings
- Hardware acceleration enabled by default

### Firefox
- Excellent standards compliance
- May render fonts slightly differently
- Good performance for animations

### Safari (WebKit)
- iOS/macOS default browser
- May have different behavior for backdrop-blur
- Font rendering optimized for Apple devices

## CI/CD Integration

To run tests in CI/CD:

```bash
# Install dependencies
npm ci

# Install browsers
npx playwright install --with-deps

# Run tests
npm run test:browser
```

## Troubleshooting

### Fonts Not Loading

If fonts fail to load in tests:
1. Check network tab in Playwright UI mode
2. Verify font files are accessible
3. Check CORS headers if fonts are from CDN

### Animations Not Working

If animations don't work in tests:
1. Ensure `prefers-reduced-motion` is not set
2. Check CSS transition properties
3. Verify JavaScript animations are not disabled

### Tests Timing Out

If tests timeout:
1. Increase timeout in `playwright.config.ts`
2. Check if dev server is running
3. Verify network connectivity

## Best Practices

1. **Run tests locally before committing**
   - Catch issues early
   - Verify across all browsers

2. **Use data-testid attributes**
   - Makes tests more reliable
   - Easier to maintain

3. **Keep tests focused**
   - One concept per test
   - Clear test names

4. **Update manual checklist**
   - Document browser-specific issues
   - Track visual regressions

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Cross-Browser Testing Best Practices](https://playwright.dev/docs/best-practices)
- [Browser Compatibility](https://caniuse.com)
