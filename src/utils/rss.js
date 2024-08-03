import Parser from 'rss-parser';

async function getUrlfromXml(feed) {
    const parser = new Parser();

    try {
        const parsedFeed = await parser.parseString(feed);
        return parsedFeed;
    } catch (error) {
        console.error(`Error parsing RSS feed for ${feed.url}:`, error.message);
        throw new Error(`Error parsing RSS feed for ${feed.url}`);
    }
}

export default getUrlfromXml;