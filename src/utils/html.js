import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

async function extractContent(html, url) {
  try {
    const doc = new JSDOM(html, url);
    const reader = new Readability(doc.window.document);
    const article = reader.parse();

    if (!article) {
      throw new Error(`Failed to extract content for ${url}`);
    }

    return {
      title: article.title,
      desc: article.excerpt,
      content: article.textContent,
      author: article.byline,
      site: article.siteName,
      language: article.lang
    };
  } catch (error) {
    console.error('Error extracting content:', error.message);
    throw new Error(`Error extracting content`);
  }
}

export default extractContent;