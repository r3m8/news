import c from './config/config.js';
import parseYaml from './utils/yaml.js';
import { fetchWithBrowser, closeBrowser, startBrowser } from './components/browser.js';
import PQueue from 'p-queue';

const main = async () => {
    const queue = new PQueue({ concurrency: c.BROWSER_CONCURRENCY });

    try {
        const feeds = await parseYaml(c.FEEDS_PATH);
        const { page, browser, setTarget } = await startBrowser();
        await Promise.all(feeds.map(async ({ name, url }) => {
            return queue.add(async () => {
                try {
                    const html = await fetchWithBrowser(page, browser, setTarget, url);
                } catch (error) {
                    console.error(`Error fetching URL ${url} after all retries:`, error.message);
                    // You can choose to rethrow or handle the error here
                }
            });
        }));
        await closeBrowser(page, browser, setTarget);
    } catch (error) {
        console.error('Error in main:', error);
    }
};

main();