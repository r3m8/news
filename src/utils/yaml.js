import { readFile } from 'fs/promises';
import { parse } from 'yaml';

async function parseYaml(filePath) {
  try {
    const fileContents = await readFile(filePath, 'utf8');
    const { feeds = [] } = parse(fileContents);
    return feeds;
  } catch (error) {
    console.error('Error reading YAML file:', error);
    throw new Error('Failed to read feeds from YAML file');
  }
}

export default parseYaml;