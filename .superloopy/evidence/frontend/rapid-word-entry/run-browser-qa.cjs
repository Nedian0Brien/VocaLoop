const fs = require('node:fs');
const path = require('node:path');

const playwrightRoot = process.argv[2];
if (!playwrightRoot) throw new Error('Playwright temp directory is required.');

const { chromium } = require(path.join(playwrightRoot, 'node_modules', 'playwright'));

const baseUrl = 'http://127.0.0.1:3051';
const evidenceDir = __dirname;
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const getWordFromPrompt = (prompt) => {
  const match = String(prompt || '').match(/Analyze the English word '([^']+)'/);
  return match?.[1] || 'queued-word';
};

const buildAnalysis = (word) => ({
  word,
  meaning_ko: `${word} 뜻`,
  pronunciation: '/test/',
  pos: 'Noun',
  definitions: [`Definition for ${word}.`],
  definitions_ko: [`${word}의 정의.`],
  examples: [{ en: `An example with ${word}.`, ko: `${word} 예문.` }],
  synonyms: [],
  nuance: 'QA',
});

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();
  const consoleErrors = [];
  const failedResponses = [];
  const pageErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400) {
      failedResponses.push({
        status: response.status(),
        url: response.url(),
      });
    }
  });

  await page.route('**/api/ai/codex', async (route) => {
    const body = route.request().postDataJSON();
    const word = getWordFromPrompt(body?.prompt);
    await delay(5000);
    await route.fulfill({
      json: { text: JSON.stringify(buildAnalysis(word)) },
      status: 200,
    });
  });

  const signupResponse = await context.request.post(`${baseUrl}/api/auth/signup`, {
    data: {
      display_name: 'Queue QA',
      email: `queue-qa-${Date.now()}@example.com`,
      password: 'QaPassword123!',
    },
  });
  if (!signupResponse.ok()) {
    throw new Error(`QA signup failed: ${signupResponse.status()} ${await signupResponse.text()}`);
  }

  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  const input = page.getByLabel('새 영어 단어 입력');
  await input.waitFor();

  await input.fill('limerence');
  await input.press('Enter');
  await input.fill('susurrus');
  await input.press('Enter');

  await page.getByText('단어 생성 중...').waitFor();
  await page.getByText('생성 대기 중').waitFor();

  const viewportResults = [];
  for (const width of [390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(150);
    const layout = await page.evaluate(() => ({
      activeLabel: document.activeElement?.getAttribute('aria-label') || '',
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    const screenshotPath = path.join(evidenceDir, `${width}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    viewportResults.push({
      ...layout,
      screenshot: screenshotPath,
      width,
    });
  }

  await page.waitForFunction(
    () => !document.body.innerText.includes('단어 생성 중...')
      && !document.body.innerText.includes('생성 대기 중'),
    undefined,
    { timeout: 20000 },
  );

  const savedWords = await page.locator('body').innerText();
  const result = {
    consoleErrors,
    failedResponses,
    pageErrors,
    processingVisible: true,
    queuedVisible: true,
    savedLimerence: savedWords.includes('limerence'),
    savedSusurrus: savedWords.includes('susurrus'),
    viewportResults,
  };
  fs.writeFileSync(
    path.join(evidenceDir, 'browser-results.json'),
    `${JSON.stringify(result, null, 2)}\n`,
  );

  await browser.close();

  const invalidLayout = viewportResults.find((item) =>
    item.scrollWidth > item.clientWidth || item.activeLabel !== '새 영어 단어 입력');
  const blockingResponses = failedResponses.filter((response) =>
    !response.url.endsWith('/favicon.ico')
    && !response.url.endsWith('/_vercel/speed-insights/script.js'));
  if (
    pageErrors.length > 0
    || blockingResponses.length > 0
    || invalidLayout
    || !result.savedLimerence
    || !result.savedSusurrus
  ) {
    process.exitCode = 1;
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
