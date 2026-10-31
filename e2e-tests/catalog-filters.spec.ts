/** End-to-end coverage for filtering the prerendered game catalog. */
import { test, expect } from '@playwright/test';

test.describe('Game catalog filters', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  /** Verifies that selecting categories includes games in any selected category. */
  test('filters by multiple categories using any selected category', async ({ page }) => {
    const categoryFilters = page.locator('input[name="category"]');
    const categoryIds = await categoryFilters.evaluateAll((inputs) =>
      inputs.slice(0, 2).map((input) => (input as HTMLInputElement).value),
    );
    expect(categoryIds).toHaveLength(2);

    await test.step('Select two categories', async () => {
      await categoryFilters.nth(0).check();
      await categoryFilters.nth(1).check();
    });

    const expectedCount = await page.getByTestId('game-card').evaluateAll((cards, selectedIds) =>
      cards.filter((card) => selectedIds.includes(card.getAttribute('data-game-category-id') ?? '')).length,
      categoryIds,
    );
    await test.step('Show games from either selected category', async () => {
      await expect(page.getByTestId('game-card').filter({ visible: true })).toHaveCount(expectedCount);
    });
  });

  /** Verifies that selecting a publisher narrows the catalog and updates its count. */
  test('filters by publisher', async ({ page }) => {
    const publisherSelect = page.getByTestId('publisher-filter');
    const publisherId = await publisherSelect.locator('option').nth(1).getAttribute('value');
    if (publisherId === null) throw new Error('Expected at least one publisher option.');

    const expectedCount = await page.locator(`[data-game-publisher-id="${publisherId}"]`).count();
    await test.step('Select a publisher', async () => {
      await publisherSelect.selectOption(publisherId);
    });

    await test.step('Show the publisher’s games and result count', async () => {
      await expect(page.getByTestId('game-card').filter({ visible: true })).toHaveCount(expectedCount);
      await expect(page.getByRole('status')).toContainText(`Showing ${expectedCount} of`);
    });
  });

  /** Verifies that the filters combine and the reset control restores the catalog. */
  test('combines category and publisher filters and can clear them', async ({ page }) => {
    const firstGame = page.getByTestId('game-card').first();
    const categoryId = await firstGame.getAttribute('data-game-category-id');
    const publisherId = await firstGame.getAttribute('data-game-publisher-id');
    if (categoryId === null || publisherId === null) {
      throw new Error('Expected each game to have a category and publisher.');
    }

    const expectedCount = await page.locator(
      `[data-game-category-id="${categoryId}"][data-game-publisher-id="${publisherId}"]`,
    ).count();

    await test.step('Apply category and publisher together', async () => {
      await page.getByTestId(`category-filter-${categoryId}`).check();
      await page.getByTestId('publisher-filter').selectOption(publisherId);
      await expect(page.getByTestId('game-card').filter({ visible: true })).toHaveCount(expectedCount);
    });

    await test.step('Clear filters and restore all games', async () => {
      await page.getByTestId('clear-filters').click();
      await expect(page.getByTestId('game-card').filter({ visible: true })).toHaveCount(
        await page.getByTestId('game-card').count(),
      );
      await expect(page.getByTestId(`category-filter-${categoryId}`)).not.toBeChecked();
      await expect(page.getByTestId('publisher-filter')).toHaveValue('');
    });
  });
});
