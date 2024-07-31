import { promises as fs } from 'fs';
import { join } from 'path';
import { parse } from 'yaml';
import Parser from 'rss-parser';
import { connect } from 'puppeteer-real-browser';
import { Readability } from '@mozilla/readability';
import { JSDOM, VirtualConsole } from 'jsdom';
import OpenAI from 'openai';
import { countTokensInText } from './tokenizer.js';

const CONFIG_FILE = 'feeds.yml';
const OUTPUT_DIR = 'summaries';
const CONCURRENCY_LIMIT = 1;
const REQUEST_INTERVAL = 0;
const LLM_MODEL = 'deepseek-chat';
const TOKENIZER_PATH = 'tokenizers/deepseek-v2-chat-0628.json';
const MAX_TOKENS = 100000;

async function getFeedsFromYaml() {
  try {
    const fileContents = await fs.readFile(CONFIG_FILE, 'utf8');
    const data = parse(fileContents);
    return data.feeds;
  } catch (error) {
    console.error('Error reading YAML file:', error);
    return [];
  }
}

function escapeXml(text) {
  return text.replace(/[&]/g, (c) => {
    switch (c) {
      case '&': return '&amp;';
      default: return c;
    }
  });
}

async function fetchRssFeed(url) {
  const { browser, page } = await connect({
    headless: 'auto',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-infobars',
      '--window-position=0,0',
      '--ignore-certifcate-errors',
      '--ignore-certifcate-errors-spki-list',
    ],
    turnstile: true,
    fingerprint: true,
  });

  try {
    let responseBody = '';
    let finalUrl = '';
    let wasRedirected = false;
    let redirectCount = 0;

    page.on('response', async (response) => {
      if (response.url() === url || finalUrl === response.url()) {
        try {
          responseBody = await response.text();
          finalUrl = response.url();
        } catch (error) {
          if (error.message.includes('Response body is unavailable for redirect responses')) {
            console.log(`Redirect detected for ${url}. Following redirect to ${response.url()}...`);
            wasRedirected = true;
            redirectCount += 1;

            if (redirectCount > 10) {
              console.error(`Exceeded maximum redirect limit (10) for ${url}`);
              return;
            }
          } else {
            console.error(`Error fetching response body for ${url}:`, error);
          }
        }
      }
    });

    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });

    if (wasRedirected && !responseBody) {
      responseBody = await page.content();
    }

    if (responseBody) {
      const escapedFeedContent = escapeXml(responseBody);
      const parser = new Parser();

      try {
        const parsedFeed = await parser.parseString(escapedFeedContent);
        const links = parsedFeed.items.map(item => item.link);
        if (wasRedirected) {
          console.log(`RSS feed successfully obtained (${links.length} URLs) with redirect for ${url}. Final URL: ${finalUrl}`);
        } else {
          console.log(`RSS feed successfully obtained (${links.length} URLs) without redirect for ${url}`);
        }

        return parsedFeed;
      } catch (parseError) {
        console.error(`Error parsing RSS feed for ${url}:`, parseError);
        return null;
      }
    } else {
      console.error(`Failed to obtain RSS feed for ${url}`);
      return null;
    }
  } catch (error) {
    console.error(`Error fetching RSS feed ${url}:`, error);
    return null;
  } finally {
    await browser.close();
  }
}

async function getHtmlContent(url) {
  const { browser, page } = await connect({
    headless: 'auto',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-infobars',
      '--window-position=0,0',
      '--ignore-certifcate-errors',
      '--ignore-certifcate-errors-spki-list',
    ],
    turnstile: true,
    fingerprint: true,
  });

  try {
    let responseBody = '';
    let finalUrl = '';
    let wasRedirected = false;

    page.on('response', async (response) => {
      if (response.url() === url || finalUrl === response.url()) {
        try {
          responseBody = await response.text();
          finalUrl = response.url();
        } catch (error) {
          if (error.message.includes('Response body is unavailable for redirect responses')) {
            console.log(`Redirect detected for ${url}. Following redirect to ${response.url()}...`);
            wasRedirected = true;
          } else {
            console.error(`Error fetching response body for ${url}:`, error);
          }
        }
      }
    });

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    if (wasRedirected && !responseBody) {
      responseBody = await page.content();
    }

    if (responseBody) {
      if (wasRedirected) {
        console.log(`HTML content successfully obtained with redirect for ${url}. Final URL: ${finalUrl}`);
      } else {
        console.log(`HTML content successfully obtained without redirect for ${url}`);
      }

      return responseBody;
    } else {
      console.error(`Failed to obtain HTML content for ${url}`);
      return null;
    }
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

function parsePubDate(pubDate) {
  return new Date(pubDate);
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
      const pubDate = parsePubDate(item.pubDate);
      const now = new Date();
      const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);

      if (pubDate >= sixHoursAgo) {
        allLinks.push({ feedName: feed.name, link: item.link });
      }
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
          // Somes feeds like XDA contains many spaces and line break
          link.link = link.link.replace(/\s+/g, '');
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

async function writeMarkdownFile(content, fileName) {
  const filePath = join(OUTPUT_DIR, fileName);

  try {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    await fs.writeFile(filePath, content);
    console.log(`File written successfully: ${filePath}`);
  } catch (error) {
    console.error('Error writing file:', error);
  }
}

async function getSummaryFromAI(content) {
  const client = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: "https://api.deepseek.com"
  });

  const prompt = `
Context: The texts below are written in markdown. They are several articles written in many languages on various subjects. They come from several different sites. They may deal with the same subject.

Instruction: summarize the topics covered in the texts below in English. If two texts deal with the same subject, gather information to avoid duplication and be more precise. The most important thing is for the information to be as complete as possible, exhaustive information that includes every available piece of information. Don't deal with articles that appear commercial or sponsored.
Answer in markdown and without using introductory or concluding sentences, just the summary itself of the texts.

${content}
  `;

  try {
    const response = await client.chat.completions.create({
      model: LLM_MODEL,
      messages: [
        { role: "system", content: "You are a helpful assistant. Favors length and quality in answering questions." },
        { role: "user", content: prompt }
      ],
      stream: false
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error getting summary from AI:', error);
    return '';
  }
}

async function splitContent(content, maxTokens) {
  let fragments = [];
  let currentFragment = '';
  let currentTokens = 0;
  const articles = content.split('---\n');
  for (const article of articles) {
    const articleTokens = countTokensInText(article, TOKENIZER_PATH);
    if (currentTokens + articleTokens > maxTokens) {
      if (currentFragment) {
        fragments.push(currentFragment.trim());
      }
      currentFragment = article;
      currentTokens = articleTokens;
    } else {
      currentFragment += (currentFragment ? '---\n' : '') + article;
      currentTokens += articleTokens;
    }
  }

  if (currentFragment) {
    fragments.push(currentFragment.trim());
  }

  return fragments;
}

async function processLargeContent(content) {
  const fragments = await splitContent(content, MAX_TOKENS);
  let fragmentSummaries = [];

  for (const fragment of fragments) {
    const summary = await getSummaryFromAI(fragment);
    fragmentSummaries.push(summary);
  }

  const combinedSummary = fragmentSummaries.join('\n\n');
  return await getSummaryFromAI(combinedSummary);
}

async function main() {
  try {
    console.log('Starting to process feeds...');
    const content = await processFeeds();
    const date = new Date();
    const dateStr = `${String(date.getHours()).padStart(2, '0')}-${String(date.getMinutes()).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getFullYear()).slice(-2)}`;
    const fileName = `full_content_${dateStr}.md`;
    await writeMarkdownFile(content, fileName);

    const totalTokens = countTokensInText(content, TOKENIZER_PATH);
    console.log(`Total tokens: ${totalTokens}`);

    let summary;
    if (totalTokens > MAX_TOKENS) {
      console.log('Content exceeds token limit. Processing in fragments...');
      // summary = await processLargeContent(content);
    } else {
      // summary = await getSummaryFromAI(content);
    }

    // const summaryFileName = `summary_${dateStr}.md`;
    // await writeMarkdownFile(summary, summaryFileName);

    console.log('Finished processing feeds.');
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

main();