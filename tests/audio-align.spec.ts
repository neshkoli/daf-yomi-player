import { test, expect } from '@playwright/test';

test('audio controls and player are vertically aligned and centered', async ({ page }) => {
  await page.goto('http://localhost:8000');

  // Wait for the audio controls and player to be visible
  const controls = page.locator('.header-audio-section .player-controls');
  const audio = page.locator('.header-audio-section .header-audio-player audio');

  await expect(controls).toBeVisible();
  await expect(audio).toBeVisible();

  // Get bounding boxes
  const controlsBox = await controls.boundingBox();
  const audioBox = await audio.boundingBox();

  // Check vertical alignment (center Y should be nearly equal)
  const controlsCenterY = controlsBox!.y + controlsBox!.height / 2;
  const audioCenterY = audioBox!.y + audioBox!.height / 2;
  expect(Math.abs(controlsCenterY - audioCenterY)).toBeLessThanOrEqual(3);

  // Optionally, check that the group is centered in the header
  const header = page.locator('.header-row-2');
  const headerBox = await header.boundingBox();
  const groupLeft = Math.min(controlsBox!.x, audioBox!.x);
  const groupRight = Math.max(controlsBox!.x + controlsBox!.width, audioBox!.x + audioBox!.width);
  const groupCenter = (groupLeft + groupRight) / 2;
  const headerCenter = headerBox!.x + headerBox!.width / 2;
  expect(Math.abs(groupCenter - headerCenter)).toBeLessThanOrEqual(10);
}); 