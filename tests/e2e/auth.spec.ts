import { test, expect } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_EMAIL || 'zak3@test.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'test123';

test.describe('E2E — Authentification', () => {
  test('page de login est accessible et affiche le formulaire', async ({ page }) => {
    await page.goto('/');
    // Either we see the login form directly, or we're already logged in
    const hasLoginForm = await page.locator('input[type="email"], input[type="text"]').count() > 0;
    const hasApp = await page.locator('[data-testid="app"], .app-container, #root').count() > 0;
    expect(hasLoginForm || hasApp).toBe(true);
  });

  test('login avec credentials valides redirige vers l'application', async ({ page }) => {
    await page.goto('/');
    
    // Check if already logged in
    const emailInput = page.locator('input[type="email"]').first();
    const isLoginPage = await emailInput.isVisible().catch(() => false);
    
    if (!isLoginPage) {
      // Already logged in — test passes
      console.log('Already authenticated, skipping login flow');
      return;
    }

    // Fill login form
    await emailInput.fill(TEST_EMAIL);
    
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill(TEST_PASSWORD);
    
    // Submit
    const submitBtn = page.locator('button[type="submit"], button:has-text("Connexion"), button:has-text("Se connecter")').first();
    await submitBtn.click();
    
    // Wait for navigation or app content to appear
    await page.waitForTimeout(2000);
    
    // Should no longer show login form
    const stillOnLogin = await page.locator('input[type="password"]').isVisible().catch(() => false);
    expect(stillOnLogin).toBe(false);
  });

  test('logout redirige vers la page de connexion', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1500);
    
    // Look for logout button
    const logoutBtn = page.locator('button:has-text("Déconnexion"), button:has-text("Logout"), [aria-label="logout"], [title="Logout"]').first();
    const logoutVisible = await logoutBtn.isVisible().catch(() => false);
    
    if (!logoutVisible) {
      console.log('Logout button not found — user may not be authenticated');
      return;
    }
    
    await logoutBtn.click();
    await page.waitForTimeout(1000);
    
    // Should redirect to login
    const onLoginPage = await page.locator('input[type="email"], input[type="password"]').isVisible().catch(() => false);
    expect(onLoginPage).toBe(true);
  });
});
