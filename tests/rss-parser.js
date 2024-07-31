import fs from 'fs';
import Parser from 'rss-parser';

async function listLinks() {
  const parser = new Parser();

  // Read the local RSS feed file
  const feedContent = fs.readFileSync('feed.rss', 'utf-8');

  // Parse the RSS feed
  const feed = await parser.parseString(feedContent);

  // List the links in the feed
  console.log('Links in the RSS feed:');
  feed.items.forEach(item => {
    console.log(item.link);
  });
}

listLinks().catch(console.error);
