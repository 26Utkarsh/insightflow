import dotenv from 'dotenv';
dotenv.config();
import OpenAI from 'openai';

async function testJson() {
  const openai = new OpenAI({
    apiKey: process.env.CEREBRAS_API_KEY,
    baseURL: 'https://api.cerebras.ai/v1'
  });
  
  const jsonPrompt = `Return strict JSON only for this InsightFlow request:\n{"task":"detect-dataset","columns":["order_id","customer","revenue","profit"],"sampleData":[{"order_id":"1","customer":"Acme","revenue":1000,"profit":200}]}`;
  const jsonSystem = 'You are an AI assistant powering InsightFlow, a production business intelligence platform. Return concise, valid JSON only. No markdown, no explanation, just JSON.';

  const models = ['gemma-4-31b', 'zai-glm-4.7'];
  for (const m of models) {
    try {
      console.log(`Testing model ${m}...`);
      const comp = await openai.chat.completions.create({
        model: m,
        messages: [
          { role: 'system', content: jsonSystem },
          { role: 'user', content: jsonPrompt }
        ],
        temperature: 0.35,
        max_tokens: 4096,
      });
      console.log(`Model ${m} succeeded:`, JSON.stringify(comp, null, 2));
    } catch (err) {
      console.error(`Model ${m} failed:`, err.message);
    }
  }
}

testJson();
