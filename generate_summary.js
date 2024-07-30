const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const Parser = require('rss-parser');
const puppeteer = require('puppeteer');
const { Readability } = require('@mozilla/readability');
const { JSDOM, VirtualConsole } = require('jsdom');

// Configuration
const CONFIG_FILE = 'feeds.yml';
const OUTPUT_DIR = 'summaries';
const CONCURRENCY_LIMIT = 1;
const REQUEST_INTERVAL = 1500;

// YAML structure definition
const yamlStructure = `
feeds:
  - name: Example Feed 1
    url: https://example.com/feed1.rss
  - name: Example Feed 2
    url: https://example.com/feed2.rss
`;

async function getFeedsFromYaml() {
  try {
    const fileContents = await fs.readFile(CONFIG_FILE, 'utf8');
    const data = yaml.load(fileContents);
    return data.feeds;
  } catch (error) {
    console.error('Error reading YAML file:', error);
    return [];
  }
}

async function fetchRssFeed(url) {
  const parser = new Parser();
  try {
    return await parser.parseURL(url);
  } catch (error) {
    console.error(`Error fetching RSS feed ${url}:`, error);
    return null;
  }
}

async function getHtmlContent(url) {
  const browser = await puppeteer.launch({ headless: 'new' });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    const content = await page.content();
    return content;
  } catch (error) {
    console.error(`Error fetching HTML content for ${url}:`, error);
    return null;
  } finally {
    await browser.close();
  }
}

async function extractContent(html) {
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('error', () => {});
  const dom = new JSDOM(html, {
    resources: 'usable',
    virtualConsole: virtualConsole
  });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  if (article) {
    // Remove unwanted line breaks
    const content = article.textContent.replace(/\n+/g, '\n').trim();
    return {
      title: article.title,
      content: content
    };
  } else {
    return {
      title: '',
      content: ''
    };
  }
}

function formatAsMarkdown(title, websiteName, url, content) {
  return `# ${title}\n\n[${websiteName}](${url})\n\n${content}\n\n---\n\n`;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function processFeeds() {
  const feeds = await getFeedsFromYaml();
  let fullContent = '';

  const PQueue = (await import('p-queue')).default;
  const queue = new PQueue({ concurrency: CONCURRENCY_LIMIT });

  // Collect all links from all feeds
  const allLinks = [];
  for (const feed of feeds) {
    const feedData = await fetchRssFeed(feed.url);
    if (!feedData) continue;

    for (const item of feedData.items) {
      allLinks.push({ feedName: feed.name, link: item.link });
    }
  }

  // Process links in an alternating manner
  let index = 0;
  while (index < allLinks.length) {
    for (const feed of feeds) {
      const link = allLinks.find(l => l.feedName === feed.name && !l.processed);
      if (link) {
        link.processed = true;
        await queue.add(async () => {
          console.log(`Exploring link: ${link.link}`);
          const html = await getHtmlContent(link.link);
          if (!html) return;

          const { title, content } = await extractContent(html);
          console.log(`Finished loading link: ${link.link}`);
          fullContent += formatAsMarkdown(title, feed.name, link.link, content);

          console.log(`Waiting for ${REQUEST_INTERVAL / 1000} seconds before next request...`);
          await delay(REQUEST_INTERVAL);
        });
      }
    }
    index++;
  }

  return fullContent;
}

async function writeMarkdownFile(content) {
  const date = new Date();
  const dateStr = `${String(new Date().getHours()).padStart(2, '0')}-${String(new Date().getMinutes()).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getFullYear()).slice(-2)}`;
  const fileName = `full_content_${dateStr}.md`;
  const filePath = path.join(OUTPUT_DIR, fileName);

  try {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    await fs.writeFile(filePath, content);
    console.log(`File written successfully: ${filePath}`);
  } catch (error) {
    console.error('Error writing file:', error);
  }
}

async function main() {
  try {
    console.log('Starting to process feeds...');
    const content = await processFeeds();
    await writeMarkdownFile(content);
    console.log('Finished processing feeds.');
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

main();