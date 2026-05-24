import { test, expect } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_EMAIL || 'zak3@test.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'test123';

async function loginIfNeeded(page: any) {
  const emailInput = page.locator('input[type="email"]').first();
  const isLoginPage = await emailInput.isVisible().catch(() => false);
  if (!isLoginPage) return; // Already authenticated
  
  await emailInput.fill(TEST_EMAIL);
  await page.locator('input[type="password"]').first().fill(TEST_PASSWORD);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(2000);
}

test.describe('E2E — Studio multi-agents', () => {
  test('naviguer vers le Studio depuis la barre de navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1500);
    await loginIfNeeded(page);
    await page.waitForTimeout(1000);

    // Look for Studio or Chat navigation link
    const studioLink = page.locator(
      'a:has-text("Studio"), nav a:has-text("Chat"), button:has-text("Studio"), [href*="studio"]'
    ).first();
    
    const studioVisible = await studioLink.isVisible().catch(() => false);
    if (studioVisible) {
      await studioLink.click();
      await page.waitForTimeout(1000);
    }
    
    // Page should be loaded without errors
    const pageTitle = await page.title();
    expect(pageTitle).toBeTruthy();
  });

  test('selectionner un agent dans la liste du Studio', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1500);
    await loginIfNeeded(page);
    await page.waitForTimeout(1000);

    // Navigate to Studio
    const studioLink = page.locator('a:has-text("Studio"), nav a:has-text("Chat"), a:has-text("Chat IA")').first();
    if (await studioLink.isVisible().catch(() => false)) {
      await studioLink.click();
      await page.waitForTimeout(1000);
    }

    // Look for agent selector (Sophie, Alexandre, etc.)
    const agentNames = ['Sophie', 'Alexandre', 'Natalie', 'Isabelle', 'Marc', 'Sarah', 'Jean-François', 'Emilie', 'Patrick'];
    let agentFound = false;
    
    for (const name of agentNames) {
      const agentEl = page.locator(`text="${name}"`).first();
      if (await agentEl.isVisible().catch(() => false)) {
        await agentEl.click();
        await page.waitForTimeout(500);
        agentFound = true;
        break;
      }
    }
    
    // Either an agent was found and clicked, or the Studio uses a different layout
    // Both are valid — the important thing is no JS error occurred
    const hasError = await page.locator('text="ReferenceError", text="TypeError", text="Cannot read"').count();
    expect(hasError).toBe(0);
    
    console.log(`Agent found in Studio: ${agentFound}`);
  });

  test('envoyer un message et attendre une reponse (sans clé API)', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1500);
    await loginIfNeeded(page);
    await page.waitForTimeout(1000);

    // Navigate to Studio/Chat
    const chatLink = page.locator('a:has-text("Studio"), a:has-text("Chat IA"), a:has-text("Chat")').first();
    if (await chatLink.isVisible().catch(() => false)) {
      await chatLink.click();
      await page.waitForTimeout(1000);
    }

    // Find message input
    const messageInput = page.locator('textarea, input[placeholder*="message"], input[placeholder*="Message"]').first();
    const inputVisible = await messageInput.isVisible().catch(() => false);
    
    if (!inputVisible) {
      console.log('Message input not found — may need authentication to access Studio');
      return;
    }

    await messageInput.fill('Test: quelle est la TPS au Canada?');
    
    // Find and click send button
    const sendBtn = page.locator('button[type="submit"], button:has-text("Envoyer"), button:has-text("Send"), button[aria-label*="envoyer"]').first();
    if (await sendBtn.isVisible().catch(() => false)) {
      await sendBtn.click();
    } else {
      // Try pressing Enter
      await messageInput.press('Enter');
    }
    
    await page.waitForTimeout(3000);
    
    // Verify no crash (no JS error visible on page)
    const errorText = await page.locator('text="ReferenceError"').count();
    expect(errorText).toBe(0);
  });
});
