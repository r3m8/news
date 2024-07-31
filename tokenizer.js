import { promises as fs } from 'fs';

const defaultTokenizerPath = 'tokenizers/deepseek-v2-chat-0628.json';

async function loadTokenizer(filePath) {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
}

function countTokens(text, tokenizer) {
    const words = text.match(/\S+|\n|\s+/g) || [];
    let tokens = [];

    for (const word of words) {
        const token = tokenizer[word] || word;
        tokens = tokens.concat(Array.isArray(token) ? token : [token]);
    }

    return tokens.length;
}

async function countTokensInText(content, tokenizerPath = defaultTokenizerPath) {
    try {
        const tokenizer = await loadTokenizer(tokenizerPath);
        const tokenCount = countTokens(content, tokenizer);

        console.log(`Number of tokens: ${tokenCount}`);
    } catch (error) {
        console.error('An error occurred:', error);
    }
}

export { countTokensInText };
