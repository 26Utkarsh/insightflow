import dotenv from 'dotenv';
dotenv.config();
import OpenAI from 'openai';

async function testCerebras() {
  const openai = new OpenAI({
    apiKey: process.env.CEREBRAS_API_KEY,
    baseURL: 'https://api.cerebras.ai/v1'
  });
  
  const models = ['zai-glm-4.7', 'gpt-oss-120b', 'gemma-4-31b'];
  for (const m of models) {
    try {
      console.log(`Testing Cerebras model ${m}...`);
      const comp = await openai.chat.completions.create({
        model: m,
        messages: [{ role: 'user', content: 'Say hello in one word' }],
        max_tokens: 10
      });
      console.log(`Model ${m} succeeded:`, comp.choices[0]?.message?.content);
      return;
    } catch (err) {
      console.error(`Model ${m} failed:`, err.message);
    }
  }
}

testCerebras();
