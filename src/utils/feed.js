function filterFeed(feed) {
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

    return feed.items
        .filter(item => new Date(item.pubDate) >= sixHoursAgo)
        .map(item => ({ feedName: feed.name, link: item.link }));
};

export default filterFeed;