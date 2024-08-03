import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import config from './config/config.js';

async function writeMarkdownFile(content, fileName) {
    const filePath = join(config.OUTPUT_DIR, fileName);

    try {
        await mkdir(config.OUTPUT_DIR, { recursive: true });
        await writeFile(filePath, content);
    } catch (error) {
        console.error(`Error writing file ${fileName}:`, error.message);
        throw new Error(`Error writing file ${fileName}`);
    }
}

export default writeMarkdownFile;