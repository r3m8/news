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
  const browser = await puppeteer.launch({ headless: 'shell' });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0' });
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

function formatAsMarkdown(title, content) {
  return `# ${title}\n${content}\n\n---\n\n`;
}

async function processFeeds() {
  const feeds = await getFeedsFromYaml();
  const { default: pLimit } = await import('p-limit');
  const limit = pLimit(CONCURRENCY_LIMIT);
  let fullContent = '';

  for (const feed of feeds) {
    const feedData = await fetchRssFeed(feed.url);
    if (!feedData) continue;

    const itemPromises = feedData.items.map(item => limit(async () => {
      const html = await getHtmlContent(item.link);
      if (!html) return '';

      const { title, content } = await extractContent(html);
      return formatAsMarkdown(title, content);
    }));

    const itemContents = await Promise.all(itemPromises);
    fullContent += itemContents.join('');
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
    const content = await processFeeds();
    await writeMarkdownFile(content);
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

main();
