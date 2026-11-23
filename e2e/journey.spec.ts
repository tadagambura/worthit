import { expect, test, type Page } from '@playwright/test';

async function finishIntro(page: Page) {
  await expect(page.getByTestId('intro')).toBeVisible();
  for (let i = 0; i < 3; i++) await page.getByTestId('intro-next').click();
  await expect(page.getByTestId('ranking')).toBeVisible();
}

async function addPerson(page: Page, name: string, rate: number) {
  await page.getByTestId('add-person').first().click();
  await page.getByTestId('person-nickname').fill(name);
  await page.getByTestId('person-save').click();
  await expect(page.getByTestId('checkin')).toBeVisible();
  for (const d of ['communication', 'consistency', 'effort', 'respect', 'feel', 'future']) await page.getByTestId(`rate-${d}-${rate}`).click();
  await page.getByTestId('checkin-save').click();
  await expect(page.getByTestId('person')).toBeVisible();
}

test('add someone → check in → score, balanced take, ranking, and it persists', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await finishIntro(page);
  await addPerson(page, 'Gym guy', 5);
  await expect(page.getByTestId('person-score')).toHaveText('100');
  await expect(page.getByTestId('take')).toContainText('Respect: respectful');

  await page.goto('/');
  await addPerson(page, 'Bumble Sam', 2);
  await expect(page.getByTestId('person-score')).toHaveText('25');
  await page.goto('/');
  await expect(page.getByTestId('score-Gym guy')).toHaveText('100');
  const order = await page.locator('[data-testid^="person-"]').allInnerTexts();
  expect(order[0]).toContain('Gym guy');
  await page.reload();
  await expect(page.getByTestId('score-Bumble Sam')).toHaveText('25');
  expect(errors).toEqual([]);
});

test('feeling unsafe caps the score and shows the helpline', async ({ page }) => {
  await page.goto('/');
  await finishIntro(page);
  await page.getByTestId('add-person').click();
  await page.getByTestId('person-nickname').fill('Charmer');
  await page.getByTestId('person-save').click();
  for (const d of ['communication', 'consistency', 'effort', 'respect', 'feel', 'future']) await page.getByTestId(`rate-${d}-5`).click();
  await page.getByTestId('red-I feel unsafe').click();
  await page.getByTestId('checkin-save').click();
  await expect(page.getByTestId('person-score')).toHaveText('25');
  await expect(page.getByText(/0808 2000 247/).first()).toBeVisible();
});

test('notes, ending a situationship, and the free limit of 3', async ({ page }) => {
  await page.goto('/');
  await finishIntro(page);
  await addPerson(page, 'A', 3);
  await page.getByTestId('note-input').fill('Great first date at the arcade');
  await page.getByTestId('note-save').click();
  await expect(page.getByText('Great first date at the arcade')).toBeVisible();
  await page.getByTestId('person-end').click();
  await page.getByTestId('end-lesson').fill('Trust the vibe');
  await page.getByTestId('end-save').click();
  await page.goto('/');
  await expect(page.getByText(/Trust the vibe/)).toBeVisible();
  await addPerson(page, 'B', 3);
  await page.goto('/');
  await addPerson(page, 'C', 3);
  await page.goto('/');
  await addPerson(page, 'D', 3);
  await page.goto('/');
  await page.getByTestId('add-person').click();
  await expect(page.getByTestId('paywall')).toBeVisible();
});
