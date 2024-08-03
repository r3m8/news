import OpenAI from 'openai';
import config from './config/config.js';

async function getSummaryFromAI(content) {
    const client = new OpenAI({
        apiKey: process.env.LLM_API_KEY,
        baseURL: config.LLM_API
    });

    const prompt = `${config.LLM_PROMPT}\n${content}`;

    try {
        const response = await client.chat.completions.create({
            model: LLM_MODEL,
            messages: [
                { role: "system", content: LLM_SYSTEM_PROMPT },
                { role: "user", content: prompt }
            ],
            stream: false
        });

        return response.choices[0].message.content;
    } catch (error) {
        console.error('Error getting summary from ai:', error.message);
        throw new Error(`Error getting summary from ai`);
    }
}

export default getSummaryFromAI;