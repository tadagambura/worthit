// Captures the core screens for review: SCREENS=1 npx playwright test e2e/screens.spec.ts
import { test } from '@playwright/test';

const out = (n: string) => `../docs/pilots/screens/worthit-${n}.png`;

test('screens', async ({ page }) => {
  test.skip(!process.env.SCREENS, 'set SCREENS=1 to capture');
  await page.goto('/');
  await page.getByTestId('intro').waitFor();
  for (let i = 0; i < 3; i++) await page.getByTestId('intro-next').click();
  const people: [string, number[]][] = [['Gym guy', [4, 5, 4, 5, 4, 3]], ['Bumble Sam', [2, 1, 2, 3, 2, 2]], ['Festival Jo', [3, 3, 4, 4, 4, 2]]];
  for (const [name, r] of people) {
    await page.goto('/person/new');
    await page.getByTestId('person-nickname').fill(name);
    await page.getByTestId('person-save').click();
    const dims = ['communication', 'consistency', 'effort', 'respect', 'feel', 'future'];
    for (let i = 0; i < 6; i++) await page.getByTestId(`rate-${dims[i]}-${r[i]}`).click();
    await page.getByTestId('checkin-save').click();
    await page.waitForTimeout(2800);
  }
  await page.screenshot({ path: out('2-person'), fullPage: true });
  await page.goto('/');
  await page.getByTestId('ranking').waitFor();
  await page.screenshot({ path: out('1-ranking'), fullPage: true });
});
