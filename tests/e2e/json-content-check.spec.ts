import { test } from '@playwright/test';

test('Check what track JSON actually contains', async ({ page }) => {
  await page.goto('http://localhost:4201');

  // Fetch the JSON directly from the browser
  const jsonContent = await page.evaluate(async () => {
    const response = await fetch(`/assets/tracks/track01.json?nocache=${Date.now()}`);
    const data = await response.json();
    return data;
  });

  console.log('\n=== TRACK JSON CONTENT ===');
  console.log(JSON.stringify(jsonContent, null, 2));
  console.log(`\nSpawn point Z coordinate: ${jsonContent.spawnPoint.position[2]}`);
});
