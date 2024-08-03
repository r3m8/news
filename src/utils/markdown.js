/**
 * @param {string} title
 * @param {string} desc
 * @param {string} content
 * @param {string} author
 * @param {string} site
 * @param {string} language
 * @param {string} url
 * @returns {string}
 */

function formatAsMarkdown(title, desc, content, author, site, language, url) {
    return `
# ${title}

## ${desc}

[${site}](${url}) (${language}) - ${author}

${content}

---
`.trim();
}

export default formatAsMarkdown;
