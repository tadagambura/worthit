import { expect, test, type Page } from '@playwright/test';

async function finishIntro(page: Page) {
  await expect(page.getByTestId('intro')).toBeVisible();
  for (let i = 0; i < 3; i++) await page.getByTestId('intro-next').click();
  await expect(page.getByTestId('ranking')).toBeVisible();
}

async function addPerson(page: Page, name: string) {
  await page.getByTestId('add-person').first().click();
  await page.getByTestId('person-nickname').fill(name);
  await page.getByTestId('person-save').click();
  await expect(page.getByTestId('checkin')).toBeVisible();
}

async function goodCheckIn(page: Page) {
  await page.getByTestId('before-3').click();
  await page.getByTestId('after-5').click();
  await page.getByTestId('green-Keeps their word').click();
  await page.getByTestId('green-Makes plans ahead').click();
  await page.getByTestId('said').fill('See you Friday');
  await page.getByTestId('did').fill('Turned up early');
  await page.getByTestId('checkin-save').click();
  await expect(page.getByTestId('person')).toBeVisible();
}

test('check-ins build a pattern (never a score), and a lovely pattern suggests AfterHours', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await finishIntro(page);
  await addPerson(page, 'Gym guy');
  await goodCheckIn(page);
  await expect(page.getByTestId('pattern-headline')).toContainText('Early days with Gym guy');
  for (let i = 0; i < 2; i++) {
    await page.getByTestId('person-checkin').click();
    await goodCheckIn(page);
  }
  await expect(page.getByTestId('pattern-headline')).toContainText('Mostly green');
  await expect(page.getByText('You usually feel better after time with them.')).toBeVisible();
  await expect(page.getByTestId('afterhours-nudge')).toBeVisible();
  await page.getByTestId('afterhours-dismiss').click();
  await expect(page.getByTestId('afterhours-nudge')).toBeHidden();
  await page.reload();
  await expect(page.getByTestId('pattern-headline')).toContainText('Mostly green');
  await expect(page.getByText(/\/100/)).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('boundaries are tracked in check-ins; crossed boundaries and red flags turn the pattern red', async ({ page }) => {
  await page.goto('/');
  await finishIntro(page);
  await addPerson(page, 'Bumble Sam');
  await page.getByTestId('checkin-save').click();
  await page.getByTestId('boundary-input').fill('No last-minute plans');
  await page.getByTestId('boundary-add').click();
  for (let i = 0; i < 2; i++) {
    await page.getByTestId('person-checkin').click();
    await page.getByTestId('before-4').click();
    await page.getByTestId('after-1').click();
    await page.getByTestId('red-Cancels last minute, often').click();
    await page.getByTestId('crossed-No last-minute plans').click();
    await page.getByTestId('checkin-save').click();
  }
  await expect(page.getByTestId('pattern-headline')).toHaveText('The pattern says: protect your peace.');
  await expect(page.getByTestId('pattern')).toContainText('boundaries kept 0%');
});

test('feeling unsafe shows the helpline first', async ({ page }) => {
  await page.goto('/');
  await finishIntro(page);
  await addPerson(page, 'Charmer');
  await page.getByTestId('red-I feel unsafe').click();
  await page.getByTestId('checkin-save').click();
  await expect(page.getByText(/0808 2000 247/).first()).toBeVisible();
});
