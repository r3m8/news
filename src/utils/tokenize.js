import config from './config/config.js';
import { Tokenizer } from 'tokenizers';

async function countTokens(text, tokenizerPath = config.TOKENIZER_PATH) {
  const tokenizer = Tokenizer.fromFile(tokenizerPath);
  const encoding = await tokenizer.encode(text);

  return encoding.tokens.length;
}

export default countTokens;