import { test, expect } from '@playwright/test';

// NOTE: These tests bypass authentication by seeding localStorage with
// the expected keys. CI can run them without Supabase by relying on localStorage.

const TEST_USER = {
  id: 'test-user-1',
  name: 'Test User',
  email: 'test@example.com',
  address: { street: 'Old Street', city: 'Old City', postalCode: '12345', phone: '123456789' }
};

test.describe('Catalog user page - E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Seed localStorage keys used by the app
    await page.addInitScript((user) => {
      try {
        localStorage.setItem('kond-user', JSON.stringify(user));
        localStorage.setItem('currentUser', JSON.stringify(user));
      } catch (e) {
        // ignore when storage is unavailable in some runners
      }
    }, TEST_USER);
  });

  test('Edit address and save updates localStorage and emits user:updated', async ({ page }) => {
    await page.goto('http://localhost:3000/catalog/user');

    // Wait for form to load
    await page.waitForSelector('[data-testid="address-street"]', { timeout: 5000 });

    // Fill new address
    await page.fill('[data-testid="address-street"]', 'New Street 42');
    await page.fill('[data-testid="address-city"]', 'New City');
    await page.fill('[data-testid="address-postalCode"]', '54321');
    await page.fill('[data-testid="address-phone"]', '987654321');

    // Listen for a global marker the app may set after successful save.
    await page.evaluate(() => {
      // prepare a global hook the app might set; tests will check it
      (window as any)._lastUserUpdated = null;
      window.addEventListener('user:updated', (e: any) => { (window as any)._lastUserUpdated = e.detail || true; });
    });

    // Click save
    await page.click('[data-testid="address-save"]');

    // Wait for either a toast or the global variable to be set
    await page.waitForFunction(() => {
      // Wait until either a toast exists or the hook changed
      const toast = document.querySelector('.toast, [role="status"]');
      // @ts-ignore
      return toast || (window as any)._lastUserUpdated;
    }, { timeout: 5000 });

    // Assert localStorage updated
    const kondUser = await page.evaluate(() => JSON.parse(localStorage.getItem('kond-user') || 'null'));
    expect(kondUser).not.toBeNull();
    expect(kondUser.address).toBeDefined();
    expect(kondUser.address.street).toBe('New Street 42');

    // Assert event marker
    const lastUpdated = await page.evaluate(() => (window as any)._lastUserUpdated);
    expect(lastUpdated).toBeTruthy();
  });

  test('Navigate to perfil and fields are populated', async ({ page }) => {
    await page.goto('http://localhost:3000/catalog/user/perfil');
    await page.waitForSelector('[data-testid="address-street"]', { timeout: 5000 });

    const street = await page.inputValue('[data-testid="address-street"]');
    expect(street).toBe('Old Street');
  });
});

// CI notes: run with a running app at http://localhost:3000. Locally:
// cd next-app && npm run dev
// npx playwright test tests/e2e/catalog-user.spec.ts
