import dotenv from 'dotenv';
dotenv.config();
import OpenAI from 'openai';

async function inspectCerebras() {
  const openai = new OpenAI({
    apiKey: process.env.CEREBRAS_API_KEY,
    baseURL: 'https://api.cerebras.ai/v1'
  });
  
  try {
    const comp = await openai.chat.completions.create({
      model: 'zai-glm-4.7',
      messages: [{ role: 'user', content: 'Say hello' }],
      max_tokens: 15
    });
    console.log("Full Cerebras response:", JSON.stringify(comp, null, 2));
  } catch (err) {
    console.error("Failed:", err.message);
  }
}

inspectCerebras();
