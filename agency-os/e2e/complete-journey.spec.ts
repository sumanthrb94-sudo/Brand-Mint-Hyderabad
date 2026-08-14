import { test, expect } from '@playwright/test';

const SCREENSHOTS_DIR = 'e2e/screenshots';

test.describe('Brand Mint Studios - Complete Journey Simulation', () => {
  test('01. Load home page and explore UI', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Capture home page screenshot
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/01-home-page.png`, fullPage: true });

    expect(page.url()).toContain('localhost');
  });

  test('02. Scroll and check services section', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Scroll down to see services
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(1000);

    await page.screenshot({ path: `${SCREENSHOTS_DIR}/02-services-section.png`, fullPage: true });
  });

  test('03. Check admin navigation and accessible pages', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1500);

    // Look for admin/login links
    const links = await page.locator('a, button').allTextContents();
    console.log('Available links:', links.slice(0, 10));

    await page.screenshot({ path: `${SCREENSHOTS_DIR}/03-navigation.png`, fullPage: true });
  });

  test('04. Take viewport screenshot (mobile-like)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.waitForTimeout(1500);

    await page.screenshot({ path: `${SCREENSHOTS_DIR}/04-mobile-viewport.png`, fullPage: true });
  });

  test('05. Take full desktop screenshot', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: `${SCREENSHOTS_DIR}/05-desktop-full.png`, fullPage: true });
  });

  test('06. Inspect page structure and elements', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1500);

    // Get all visible buttons and links
    const buttons = await page.locator('button').allTextContents();
    const links = await page.locator('a').allTextContents();

    console.log('\n=== PAGE ANALYSIS ===');
    console.log('Buttons found:', buttons.filter(b => b.trim().length > 0).slice(0, 15));
    console.log('Links found:', links.filter(l => l.trim().length > 0).slice(0, 15));

    await page.screenshot({ path: `${SCREENSHOTS_DIR}/06-page-analysis.png`, fullPage: true });
  });

  test('07. Test form inputs if present', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Try to find and interact with form fields
    const inputs = await page.locator('input').count();
    const textareas = await page.locator('textarea').count();

    console.log(`Form inputs found: ${inputs}, Textareas: ${textareas}`);

    if (inputs > 0) {
      const firstInput = page.locator('input').first();
      const placeholder = await firstInput.getAttribute('placeholder');
      console.log('First input placeholder:', placeholder);

      // Try to fill it
      if (placeholder) {
        await firstInput.fill('Test Value');
        await page.waitForTimeout(500);
      }
    }

    await page.screenshot({ path: `${SCREENSHOTS_DIR}/07-form-interactions.png`, fullPage: true });
  });

  test('08. Test responsive design - tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await page.waitForTimeout(1500);

    await page.screenshot({ path: `${SCREENSHOTS_DIR}/08-tablet-view.png`, fullPage: true });
  });

  test('09. Navigate using available links', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Try to find and click first navigation link
    const navLinks = await page.locator('nav a, header a, [role="navigation"] a').allTextContents();
    console.log('Navigation links:', navLinks);

    // Try to find a link to click
    const allLinks = page.locator('a');
    const count = await allLinks.count();

    if (count > 5) {
      const link = allLinks.nth(2);
      const href = await link.getAttribute('href');
      const text = await link.textContent();
      console.log(`Trying to navigate to: ${text} (${href})`);

      if (href && !href.includes('http')) {
        await link.click({ timeout: 5000 }).catch(()=>{});
        await page.waitForTimeout(1500);
      }
    }

    await page.screenshot({ path: `${SCREENSHOTS_DIR}/09-navigation-attempt.png`, fullPage: true });
  });

  test('10. Check for modal/dialog components', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Look for dialog elements
    const dialogs = await page.locator('[role="dialog"], .modal, .popup').count();
    console.log('Modal elements found:', dialogs);

    // Try to find and click a button that might open a modal
    const buttons = page.locator('button');
    const firstBtn = buttons.first();
    const btnText = await firstBtn.textContent();

    console.log('First button text:', btnText);

    if (btnText && !btnText.toLowerCase().includes('skip')) {
      await firstBtn.click({ timeout: 3000 }).catch(()=>{});
      await page.waitForTimeout(1500);
    }

    await page.screenshot({ path: `${SCREENSHOTS_DIR}/10-modal-check.png`, fullPage: true });
  });

  test('11. Inspect data attributes and classes', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1500);

    // Get page HTML to analyze structure
    const htmlContent = await page.evaluate(() => document.documentElement.outerHTML);
    const hasReact = htmlContent.includes('react') || htmlContent.includes('__react');
    const hasTailwind = htmlContent.includes('tailwind') || htmlContent.includes('class="');

    console.log('Uses React:', hasReact);
    console.log('Uses Tailwind CSS:', hasTailwind);

    // Count different element types
    const h1Count = await page.locator('h1').count();
    const h2Count = await page.locator('h2').count();
    const cardCount = await page.locator('[class*="card"], [class*="Card"]').count();
    const formCount = await page.locator('form').count();

    console.log(`H1: ${h1Count}, H2: ${h2Count}, Cards: ${cardCount}, Forms: ${formCount}`);

    await page.screenshot({ path: `${SCREENSHOTS_DIR}/11-structure-analysis.png`, fullPage: true });
  });

  test('12. Test keyboard navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    // Press Tab to navigate
    await page.keyboard.press('Tab');
    await page.waitForTimeout(300);

    await page.screenshot({ path: `${SCREENSHOTS_DIR}/12-tab-navigation-1.png`, fullPage: true });

    await page.keyboard.press('Tab');
    await page.waitForTimeout(300);

    await page.screenshot({ path: `${SCREENSHOTS_DIR}/12-tab-navigation-2.png`, fullPage: true });

    // Check focus
    const focused = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      return el?.textContent?.substring(0, 50) || 'unknown';
    });

    console.log('Focused element:', focused);
  });

  test('13. Performance timing', async ({ page }) => {
    const start = Date.now();

    await page.goto('/', { waitUntil: 'networkidle' });

    const loadTime = Date.now() - start;
    console.log(`Page load time: ${loadTime}ms`);

    const perf = await page.evaluate(() => {
      const timing = window.performance.timing;
      return {
        domReady: timing.domInteractive - timing.navigationStart,
        pageLoad: timing.loadEventEnd - timing.navigationStart,
      };
    });

    console.log('Performance metrics:', perf);

    await page.screenshot({ path: `${SCREENSHOTS_DIR}/13-performance-screenshot.png`, fullPage: true });
  });

  test('14. Console log analysis', async ({ page }) => {
    const logs: string[] = [];
    const errors: string[] = [];

    page.on('console', msg => {
      console.log(`[${msg.type()}] ${msg.text()}`);
      if (msg.type() === 'error') {
        errors.push(msg.text());
      } else {
        logs.push(msg.text());
      }
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    console.log('\n=== BROWSER CONSOLE ===');
    console.log('Errors:', errors.length > 0 ? errors.slice(0, 5) : 'None');
    console.log('Logs:', logs.length > 0 ? logs.slice(0, 5) : 'None');

    await page.screenshot({ path: `${SCREENSHOTS_DIR}/14-console-check.png`, fullPage: true });
  });

  test('15. Try multiple routes', async ({ page }) => {
    const routes = ['/', '/portal', '/operations', '/deliverables', '/admin', '/login'];

    for (const route of routes) {
      try {
        await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 5000 });
        console.log(`✓ ${route} - accessible`);

        if (route === '/') continue; // Skip duplicating first screenshot

        await page.waitForTimeout(1000);
        await page.screenshot({
          path: `${SCREENSHOTS_DIR}/15-route-${route.slice(1).replace('/', '-') || 'home'}.png`,
          fullPage: true
        });
      } catch (e) {
        console.log(`✗ ${route} - ${(e as Error).message}`);
      }
    }
  });

  test('16. Final comprehensive screenshot', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/', { waitUntil: 'networkidle' });

    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);

    await page.screenshot({ path: `${SCREENSHOTS_DIR}/16-final-full-page.png`, fullPage: true });

    console.log('✅ All screenshots captured successfully');
  });
});
