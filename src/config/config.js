import { join } from 'path';

const currentDir = new URL('.', import.meta.url).pathname;
const dateStr = new Intl.DateTimeFormat('fr-FR', {
  year: '2-digit',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Paris'
}).format(new Date());

const config = {
  FEEDS_PATH: join(currentDir, '../static/feeds.yml'),
  OUTPUT_DIR: join(currentDir, '../../summaries'),
  FULL_SUMMARY_FILENAME: `full_content_${dateStr}.md`,
  MAX_RETRY: 3,
  BROWSER_CONCURRENCY: 5,
  REQUEST_INTERVAL: 3_000,
  LLM_API: 'https://api.deepseek.com',
  TOKENIZER_PATH: join(currentDir, '../static/deepseek-v2-chat-0628.json'),
  MAX_TOKENS: 100_000,
  LLM_MODEL: 'deepseek-chat',
  LLM_SYSTEM_PROMPT: 'You are a helpful assistant. Favors length and quality in answering questions.',
  LLM_PROMPT: `
Context: The texts below are written in markdown. They are several articles written in many languages on various subjects. They come from several different sites. They may deal with the same subject.

Instruction: summarize the topics covered in the texts below in English. If two texts deal with the same subject, gather information to avoid duplication and be more precise. The most important thing is for the information to be as complete as possible, exhaustive information that includes every available piece of information. Don't deal with articles that appear commercial or sponsored. Answer in markdown and without using introductory or concluding sentences, just the summary itself of the texts.
  `.trim()
};

export default config;