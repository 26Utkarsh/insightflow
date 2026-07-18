import dotenv from 'dotenv';
dotenv.config();
import { GoogleGenAI } from '@google/genai';

async function testGemini() {
  const models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
  for (const m of models) {
    try {
      console.log(`Testing model ${m}...`);
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: m,
        contents: 'Say hello in one word',
      });
      console.log(`Model ${m} succeeded:`, response.text);
      return;
    } catch (err) {
      console.error(`Model ${m} failed:`, err.message);
    }
  }
}

testGemini();
