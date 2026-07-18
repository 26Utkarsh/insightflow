import dotenv from 'dotenv';
dotenv.config();
import OpenAI from 'openai';

async function testOtherModels() {
  const openai = new OpenAI({
    apiKey: process.env.CEREBRAS_API_KEY,
    baseURL: 'https://api.cerebras.ai/v1'
  });
  
  const models = ['gpt-oss-120b', 'gemma-4-31b'];
  for (const m of models) {
    try {
      console.log(`Testing model ${m}...`);
      const comp = await openai.chat.completions.create({
        model: m,
        messages: [{ role: 'user', content: 'Say hello in one word' }],
        max_tokens: 15
      });
      console.log(`Model ${m} response:`, JSON.stringify(comp, null, 2));
    } catch (err) {
      console.error(`Model ${m} failed:`, err.message);
    }
  }
}

testOtherModels();
