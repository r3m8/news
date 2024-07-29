const https = require('https');
const { Readability } = require('@mozilla/readability');
const { JSDOM } = require('jsdom');
const fs = require('fs');
const dotenv = require('dotenv');
const feedparser = require('feedparser');

// const puppeteer = require('puppeteer'); // Uncomment if needed

dotenv.config();

const rssUrl = "https://www.tomshardware.com/feeds/all";
const apiKey = process.env.MISTRAL_API_KEY;

async function fetchRssFeed(url) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, (res) => {
      const parser = new feedparser();

      res.pipe(parser);

      parser.on('error', reject);
      parser.on('end', () => {
        resolve(parser.articles);
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve(data);
      });

      res.on('error', (err) => {
        reject(err);
      });
    });
  });
}

async function extractContent(url) {
  // Using simple HTTP request for debugging
  const html = await fetchHtml(url);

  // Uncomment the following lines to use puppeteer
  // const browser = await puppeteer.launch();
  // const page = await browser.newPage();
  // await page.goto(url);
  // const html = await page.content();
  // await browser.close();

  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  return article ? { title: article.title, content: article.textContent } : null;
}

async function summarizeContent(content) {
  const { default: MistralClient } = await import('@mistralai/mistralai');
  const client = new MistralClient(apiKey);

  const messages = [
    { role: "user", content }
  ];

  const chatResponse = await client.chat({
    model: 'mistral-large-latest',
    messages,
  });

  return chatResponse.choices[0].message.content;
}

async function main() {
  try {
    const articles = await fetchRssFeed(rssUrl);
    const extractedArticles = [];

    for (const entry of articles) {
      const link = entry.link;
      console.log(`Processing: ${link}`);
      const article = await extractContent(link);
      if (article) {
        extractedArticles.push(`# ${article.title}\n\n${article.content}`);
      }
      await new Promise(resolve => setTimeout(resolve, 5000)); // Delay between requests
    }

    const fullContent = extractedArticles.join('\n\n');

    const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
    const fullContentFilename = `full_content_${dateStr}.md`;
    fs.writeFileSync(fullContentFilename, fullContent);

    const prompt = `
This text contains several articles. I'd like you to summarize them exhaustively,
leaving no detail out. Be sure to mention the sources at the end of the summary.
Please answer in Markdown.\n\n`;

    const fullContentWithPrompt = prompt + fullContent;

    // Uncomment the following lines to summarize the content using Mistral AI
    // const summary = await summarizeContent(fullContentWithPrompt);
    // const summaryFilename = `summary_${dateStr}.md`;
    // fs.writeFileSync(summaryFilename, summary);
    // console.log(`Summary generated and saved to ${summaryFilename}`);

    console.log(`Full content saved to ${fullContentFilename}`);
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
