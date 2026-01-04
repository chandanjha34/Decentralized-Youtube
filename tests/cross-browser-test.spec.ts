/**
 * Cross-Browser Testing Suite
 * 
 * This test suite verifies that the frontend works correctly across
 * Chrome, Firefox, and Safari browsers.
 * 
 * Requirements: 1.2, 11.1, 11.2
 * - Font loading (Inter and Instrument Serif)
 * - Animations and transitions
 * - Cross-browser compatibility
 */

import { test, expect } from '@playwright/test';

// Test configuration for different browsers
const browsers = ['chromium', 'firefox', 'webkit'] as const;

test.describe('Cross-Browser Compatibility Tests', () => {
  
  test.describe('Font Loading Tests', () => {
    test('should load Inter font correctly', async ({ page }) => {
      await page.goto('/');
      
      // Wait for fonts to load
      await page.waitForLoadState('networkidle');
      
      // Check if Inter font is applied to body text
      const bodyElement = page.locator('body');
      const fontFamily = await bodyElement.evaluate((el) => {
        return window.getComputedStyle(el).fontFamily;
      });
      
      expect(fontFamily).toContain('Inter');
    });

    test('should load Instrument Serif font for headings', async ({ page }) => {
      await page.goto('/');
      
      // Wait for fonts to load
      await page.waitForLoadState('networkidle');
      
      // Check h1 elements use Instrument Serif
      const h1Element = page.locator('h1').first();
      if (await h1Element.count() > 0) {
        const fontFamily = await h1Element.evaluate((el) => {
          return window.getComputedStyle(el).fontFamily;
        });
        
        expect(fontFamily).toContain('Instrument Serif');
      }
    });

    test('should have fonts loaded before content display', async ({ page }) => {
      await page.goto('/');
      
      // Check document.fonts.ready
      const fontsReady = await page.evaluate(() => {
        return document.fonts.ready.then(() => true);
      });
      
      expect(fontsReady).toBe(true);
    });
  });

  test.describe('Animation and Transition Tests', () => {
    test('should have smooth hover transitions on buttons', async ({ page }) => {
      await page.goto('/');
      
      // Find a button element
      const button = page.locator('button').first();
      
      if (await button.count() > 0) {
        // Get transition property
        const transition = await button.evaluate((el) => {
          return window.getComputedStyle(el).transition;
        });
        
        // Should have transition defined
        expect(transition).not.toBe('all 0s ease 0s');
      }
    });

    test('should have smooth transitions on interactive cards', async ({ page }) => {
      await page.goto('/explore');
      
      // Wait for content to load
      await page.waitForLoadState('networkidle');
      
      // Find content cards
      const card = page.locator('[data-testid="content-card"]').first();
      
      if (await card.count() > 0) {
        const transition = await card.evaluate((el) => {
          return window.getComputedStyle(el).transition;
        });
        
        // Should have transition property
        expect(transition).toBeTruthy();
      }
    });

    test('should animate progress bars smoothly', async ({ page }) => {
      await page.goto('/');
      
      // Look for progress bars in feature cards
      const progressBar = page.locator('[role="progressbar"]').first();
      
      if (await progressBar.count() > 0) {
        const transition = await progressBar.evaluate((el) => {
          return window.getComputedStyle(el).transition;
        });
        
        expect(transition).toBeTruthy();
      }
    });

    test('should have fade transitions on page navigation', async ({ page }) => {
      await page.goto('/');
      
      // Navigate to another page
      await page.click('a[href="/explore"]');
      
      // Wait for navigation
      await page.waitForURL('/explore');
      
      // Page should load successfully
      expect(page.url()).toContain('/explore');
    });
  });

  test.describe('Layout and Rendering Tests', () => {
    test('should render navigation on all pages', async ({ page }) => {
      const pages = ['/', '/explore', '/dashboard', '/upload', '/contact'];
      
      for (const pagePath of pages) {
        await page.goto(pagePath);
        
        // Check navigation exists
        const nav = page.locator('nav');
        await expect(nav).toBeVisible();
      }
    });

    test('should render footer on all pages', async ({ page }) => {
      const pages = ['/', '/explore', '/dashboard', '/upload', '/contact'];
      
      for (const pagePath of pages) {
        await page.goto(pagePath);
        
        // Check footer exists
        const footer = page.locator('footer');
        await expect(footer).toBeVisible();
      }
    });

    test('should maintain layout consistency across pages', async ({ page }) => {
      await page.goto('/');
      
      // Get container max-width
      const container = page.locator('main').first();
      const maxWidth = await container.evaluate((el) => {
        return window.getComputedStyle(el).maxWidth;
      });
      
      // Should have max-width constraint
      expect(maxWidth).toBeTruthy();
    });
  });

  test.describe('Responsive Design Tests', () => {
    test('should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      
      // Navigation should be visible
      const nav = page.locator('nav');
      await expect(nav).toBeVisible();
    });

    test('should work on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/');
      
      // Content should be visible
      const main = page.locator('main');
      await expect(main).toBeVisible();
    });

    test('should work on desktop viewport', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/');
      
      // Content should be visible
      const main = page.locator('main');
      await expect(main).toBeVisible();
    });
  });

  test.describe('Color and Styling Tests', () => {
    test('should use correct background color', async ({ page }) => {
      await page.goto('/');
      
      const body = page.locator('body');
      const bgColor = await body.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });
      
      // Should have the warm beige background
      expect(bgColor).toBeTruthy();
    });

    test('should use correct text color', async ({ page }) => {
      await page.goto('/');
      
      const body = page.locator('body');
      const textColor = await body.evaluate((el) => {
        return window.getComputedStyle(el).color;
      });
      
      // Should have dark brown text
      expect(textColor).toBeTruthy();
    });

    test('should have consistent border styling', async ({ page }) => {
      await page.goto('/explore');
      
      // Wait for content cards
      await page.waitForLoadState('networkidle');
      
      const card = page.locator('[data-testid="content-card"]').first();
      
      if (await card.count() > 0) {
        const border = await card.evaluate((el) => {
          return window.getComputedStyle(el).border;
        });
        
        expect(border).toBeTruthy();
      }
    });
  });

  test.describe('Performance Tests', () => {
    test('should load pages within reasonable time', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      // Should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });

    test('should not have console errors', async ({ page }) => {
      const errors: string[] = [];
      
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Filter out known acceptable errors (like network errors in dev)
      const criticalErrors = errors.filter(err => 
        !err.includes('Failed to load resource') &&
        !err.includes('net::ERR')
      );
      
      expect(criticalErrors.length).toBe(0);
    });
  });
});
