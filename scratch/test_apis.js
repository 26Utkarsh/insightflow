import dotenv from 'dotenv';
dotenv.config();
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';

async function testKeys() {
  console.log("GEMINI_API_KEY length:", process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.length : 0);
  console.log("CEREBRAS_API_KEY length:", process.env.CEREBRAS_API_KEY ? process.env.CEREBRAS_API_KEY.length : 0);

  try {
    const openai = new OpenAI({
      apiKey: process.env.CEREBRAS_API_KEY,
      baseURL: 'https://api.cerebras.ai/v1'
    });
    const models = await openai.models.list();
    console.log("Cerebras models:", models.data.map(m => m.id));
    
    // Test with one of the available models
    const targetModel = models.data[0]?.id || 'llama-3.3-70b';
    console.log("Testing Cerebras with model:", targetModel);
    const comp = await openai.chat.completions.create({
      model: targetModel,
      messages: [{ role: 'user', content: 'Say hello in one word' }],
      max_tokens: 10
    });
    console.log("Cerebras response:", comp.choices[0]?.message?.content);
  } catch (err) {
    console.error("Cerebras test error:", err.message);
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: 'Say hello in one word',
    });
    console.log("Gemini response:", response.text);
  } catch (err) {
    console.error("Gemini test error:", err.message);
  }
}

testKeys();
