import { connect } from 'puppeteer-real-browser';
import c from '../config/config.js';

async function startBrowser() {
  const browserArgs = [
    '--no-sandbox',
    '--disable-gpu',
    '--disable-extensions',
    '--disable-dev-shm-usage',
    '--disable-setuid-sandbox',
    '--disable-infobars',
    '--window-position=0,0',
    '--ignore-certificate-errors',
    '--ignore-certificate-errors-spki-list',
    //'--disable-features=site-per-process'
  ];

  const response = await connect({
    headless: 'auto',
    args: browserArgs,
    turnstile: true,
    fingerprint: true,
  });

  const { page, browser, setTarget } = response;
  return { page, browser, setTarget };
}

async function fetchWithBrowser(page, browser, setTarget, url, retries = c.MAX_RETRY) {
  setTarget({ status: false });
  const newTab = await browser.newPage();

  const attemptFetch = async (attemptsLeft) => {
    try {
      const responsePromise = new Promise((resolve, reject) => {
        newTab.on('response', async (response) => {
          if (response.url() === url) {
            try {
              resolve(await response.text());
            } catch (error) {
              reject(new Error(`Error fetching response body for ${url}: ${error.message}`));
            }
          }
        });
      });

      await newTab.goto(url, { waitUntil: 'networkidle0', timeout: 10_000 });
      console.log((await browser.pages()).length, url);
      return await responsePromise.catch(() => newTab.content());
    } catch (error) {
      if (attemptsLeft > 1) {
        console.error(`Error fetching URL ${url}: ${error} (${attemptsLeft - 1} attempts left)`);
        return attemptFetch(attemptsLeft - 1);
      }
      throw error; // Throw the error after all retries are exhausted
    }
  };

  try {
    return await attemptFetch(retries);
  } finally {
    await newTab.close();
  }
}

async function closeBrowser(page, browser, setTarget) {
  await browser.close();
}

export { startBrowser, fetchWithBrowser, closeBrowser };