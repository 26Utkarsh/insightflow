import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Use getters so env vars are read at call-time, not module-load-time (dotenv may not have run yet)
export function getGeminiModel(): string   { return process.env.GEMINI_MODEL   || 'gemini-2.0-flash'; }
export function getCerebrasModel(): string  { return process.env.CEREBRAS_MODEL  || 'gpt-oss-120b'; }
export function getGroqModel(): string      { return process.env.GROQ_MODEL      || 'llama-3.3-70b-versatile'; }

type AiError = { code: string; message: string };
type AiResult<T> = { ok: boolean; model: string; data: T; error?: AiError };

let aiClientPromise: Promise<any> | null = null;
let cerebrasClientPromise: Promise<any> | null = null;
let groqClientPromise: Promise<any> | null = null;

async function getAiClient() {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!aiClientPromise) {
    aiClientPromise = import(pathToFileURL(path.join(process.cwd(), 'node_modules', '@google', 'genai', 'dist', 'index.mjs')).href)
      .then(({ GoogleGenAI }) => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }))
      .catch(err => { aiClientPromise = null; throw err; });
  }
  return aiClientPromise;
}

async function getGroqClient() {
  if (!process.env.GROQ_API_KEY) return null;
  if (!groqClientPromise) {
    groqClientPromise = import('openai')
      .then(({ default: OpenAI }) => new OpenAI({
        apiKey: process.env.GROQ_API_KEY,
        baseURL: 'https://api.groq.com/openai/v1'
      }))
      .catch(err => { groqClientPromise = null; throw err; });
  }
  return groqClientPromise;
}

async function getCerebrasClient() {
  if (!process.env.CEREBRAS_API_KEY) return null;
  if (!cerebrasClientPromise) {
    cerebrasClientPromise = import('openai')
      .then(({ default: OpenAI }) => new OpenAI({
        apiKey: process.env.CEREBRAS_API_KEY,
        baseURL: 'https://api.cerebras.ai/v1'
      }))
      .catch(err => { cerebrasClientPromise = null; throw err; });
  }
  return cerebrasClientPromise;
}

const money = (value: unknown) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
}).format(Number(value || 0));

function normalizeError(error: unknown, provider = 'AI'): AiError {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (lower.includes('api key') || lower.includes('permission') || lower.includes('unauthorized') || lower.includes('invalid')) {
    return { code: 'invalid_key', message: `${provider} API key is invalid or does not have access to the configured model.` };
  }
  if (lower.includes('quota') || lower.includes('rate')) {
    return { code: 'quota', message: `${provider} quota or rate limit was reached. Falling back to alternative provider.` };
  }
  if (lower.includes('timeout')) {
    return { code: 'timeout', message: `${provider} request timed out. Falling back to alternative provider.` };
  }
  return { code: 'ai_error', message: `${provider} analysis could not be completed. Falling back to alternative provider.` };
}

async function withTimeout<T>(task: Promise<T>, timeoutMs: number, label = 'AI'): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} request timeout after ${timeoutMs}ms`)), timeoutMs);
  });

  try {
    return await Promise.race([task, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Robust JSON extraction from AI text that may contain markdown fences or surrounding prose. */
function extractJson(text: string): any {
  const cleaned = text.replace(/```json\s*\n?/g, '').replace(/```\s*$/g, '').trim();
  // Try the cleaned string first
  try { return JSON.parse(cleaned); } catch {}
  // Try to find the first { ... } or [ ... ] block
  const match = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (match) {
    try { return JSON.parse(match[0]); } catch {}
  }
  throw new Error('Could not parse JSON from AI response');
}

async function callGemini(prompt: string, systemInstruction: string, timeoutMs = 15000): Promise<string> {
  const ai = await getAiClient();
  if (!ai) throw new Error('missing GEMINI_API_KEY');

  const response: any = await withTimeout(
    ai.models.generateContent({
      model: getGeminiModel(),
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.35,
        responseMimeType: 'text/plain',
      },
    }),
    timeoutMs,
    'Gemini'
  );

  return response.text || '';
}

let activeCerebrasModel: string | null = null;
let isListingModels = false;

async function getCerebrasModelName(client: any): Promise<string> {
  if (activeCerebrasModel) return activeCerebrasModel;
  const configured = getCerebrasModel();
  if (isListingModels) return configured;
  try {
    isListingModels = true;
    const list = await client.models.list();
    const ids = list.data.map((m: any) => m.id);
    if (ids.includes(configured)) {
      activeCerebrasModel = configured;
    } else if (ids.includes('zai-glm-4.7')) {
      activeCerebrasModel = 'zai-glm-4.7';
    } else if (ids.includes('gemma-4-31b')) {
      activeCerebrasModel = 'gemma-4-31b';
    } else if (ids.length > 0) {
      activeCerebrasModel = ids[0];
    } else {
      activeCerebrasModel = configured;
    }
  } catch {
    activeCerebrasModel = configured;
  } finally {
    isListingModels = false;
  }
  return activeCerebrasModel;
}

async function callCerebras(prompt: string, systemInstruction: string, timeoutMs = 15000): Promise<string> {
  const client = await getCerebrasClient();
  if (!client) throw new Error('missing CEREBRAS_API_KEY');

  const model = await getCerebrasModelName(client);

  const response: any = await withTimeout(
    client.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: prompt }
      ],
      temperature: 0.35,
      max_tokens: 4096,
    }),
    timeoutMs,
    'Cerebras'
  );

  const msg = response.choices[0]?.message;
  return msg?.content || msg?.reasoning || '';
}

async function callGroq(prompt: string, systemInstruction: string, timeoutMs = 15000): Promise<string> {
  const client = await getGroqClient();
  if (!client) throw new Error('missing GROQ_API_KEY');

  const response: any = await withTimeout(
    client.chat.completions.create({
      model: getGroqModel(),
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: prompt }
      ],
      temperature: 0.35,
      max_tokens: 4096,
    }),
    timeoutMs,
    'Groq'
  );

  return response.choices[0]?.message?.content || '';
}

export function localDetection(req: any) {
  const columns = (req.columns || []).map((column: string) => column.toLowerCase());
  const joined = columns.join(' ');

  let type = 'Business Intelligence';
  if (/(audit|risk|control|policy|compliance)/.test(joined)) type = 'Internal Audit';
  else if (/(revenue|profit|amount|invoice|cost|margin|transaction)/.test(joined)) type = 'Financial Analysis';
  else if (/(sales|customer|product|order)/.test(joined)) type = 'Sales Analytics';
  else if (/(operation|inventory|shipment|supplier|procurement)/.test(joined)) type = 'Operations Analytics';

  return {
    type,
    confidence: 78,
    reason: 'Classified from column names and sample structure.',
    example: columns.slice(0, 5).join(', '),
  };
}

export function localReport(req: any) {
  const metrics = req.metrics || {};
  const revenue = Number(metrics.totalRevenue || 0);
  const profit = Number(metrics.totalProfit || 0);
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  const bestProduct = metrics.highestSellingProduct?.name || 'the strongest product segment';
  const bestRegion = metrics.highestRevenueRegion?.name || 'the strongest region';

  return {
    executiveSummary: `The dataset shows ${metrics.totalOrders || 0} analyzed records with total revenue of ${money(revenue)}. Profitability is ${margin.toFixed(1)}%, with ${bestProduct} and ${bestRegion} standing out as important performance drivers.`,
    confidence: { level: 'Medium', rationale: 'Generated from deterministic local metrics while AI service is unavailable.' },
    dataStory: {
      whatHappened: `${bestProduct} and ${bestRegion} are the strongest visible contributors in the current view.`,
      whyItHappened: 'The pattern is driven by concentration across available category, region, customer, and product dimensions.',
      whatNext: 'Validate outliers, compare discounting behavior, and review margin performance by segment.',
    },
    keyInsights: [
      { title: 'Revenue concentration', description: `${bestProduct} contributes a meaningful share of revenue.`, metric: money(metrics.highestSellingProduct?.revenue || 0), trend: 'positive' },
      { title: 'Profitability signal', description: `Current margin is ${margin.toFixed(1)}%.`, metric: `${margin.toFixed(1)}%`, trend: margin >= 20 ? 'positive' : 'neutral' },
    ],
    riskAnalysis: {
      overallScore: Math.min(100, Math.max(10, 100 - Number(metrics.growth || 0))),
      anomalies: ['Review unusually large transactions and missing values before executive distribution.'],
    },
    auditObservations: [
      {
        title: 'Data quality review',
        riskLevel: 'Medium',
        observation: 'Automated profiling found fields that may require business validation.',
        evidence: `${req.context?.length || 0} mapped fields detected.`,
        impact: 'Unvalidated fields can affect executive interpretation.',
      },
    ],
    recommendations: [
      { category: 'Operations', action: 'Review the top-performing segment and validate whether the trend is repeatable.', expectedOutcome: 'Better confidence in forecast and operating decisions.' },
      { category: 'Governance', action: 'Document data source ownership before exporting final reports.', expectedOutcome: 'Cleaner audit trail for stakeholders.' },
    ],
    interestingFindings: [
      { finding: 'InsightFlow generated a local fallback analysis because the AI service was unavailable.', significance: 'The dashboard remains useful even when AI services fail.' },
    ],
  };
}

function localAnswer(req: any) {
  const report = localReport(req);
  return `AI service is not available right now, so I analyzed the local metrics instead.\n\n${report.executiveSummary}\n\nRecommended next step: ${report.recommendations[0].action}`;
}

async function runWithRetry<T>(
  apiCall: () => Promise<T>,
  provider: string,
  maxAttempts = 3,
  baseDelayMs = 1000
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await apiCall();
    } catch (error) {
      attempt++;
      const normalized = normalizeError(error, provider);
      if (normalized.code === 'invalid_key' || attempt >= maxAttempts) {
        throw error;
      }
      const delay = baseDelayMs * Math.pow(2, attempt - 1) * (0.8 + Math.random() * 0.4);
      console.log(`[AI Service] ${provider} attempt ${attempt} failed (${normalized.code}). Retrying in ${Math.round(delay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

export async function runAiJson(req: any, fallback: any): Promise<AiResult<any>> {
  const jsonPrompt = `Return strict JSON only for this InsightFlow request:\n${JSON.stringify(req, null, 2)}`;
  const jsonSystem = 'You are an AI assistant powering InsightFlow, a production business intelligence platform. Return concise, valid JSON only. No markdown, no explanation, just JSON.';

  // Try Cerebras FIRST (primary provider)
  if (process.env.CEREBRAS_API_KEY) {
    try {
      const text = await runWithRetry(() => callCerebras(jsonPrompt, jsonSystem), 'Cerebras');
      return { ok: true, model: getCerebrasModel(), data: extractJson(text) };
    } catch (error: any) {
      const cerebrasError = normalizeError(error, 'Cerebras');
      console.log(`Cerebras failed completely (${cerebrasError.code}):`, error.message || error);
    }
  }

  // Fall back to Groq (2nd tier — 14,400 free req/day, llama-3.3-70b-versatile)
  if (process.env.GROQ_API_KEY) {
    try {
      const text = await runWithRetry(() => callGroq(jsonPrompt, jsonSystem), 'Groq');
      return { ok: true, model: getGroqModel(), data: extractJson(text) };
    } catch (error) {
      const groqError = normalizeError(error, 'Groq');
      console.log(`Groq JSON failed completely (${groqError.code}), trying Gemini...`);
    }
  }

  // Last resort: Gemini
  if (process.env.GEMINI_API_KEY) {
    try {
      const text = await runWithRetry(() => callGemini(jsonPrompt, jsonSystem), 'Gemini');
      return { ok: true, model: getGeminiModel(), data: extractJson(text) };
    } catch (error) {
      const geminiError = normalizeError(error, 'Gemini');
      return { ok: false, model: getGeminiModel(), data: fallback, error: geminiError };
    }
  }

  return { ok: false, model: 'fallback', data: fallback, error: { code: 'missing_key', message: 'No AI provider (CEREBRAS_API_KEY, GROQ_API_KEY, GEMINI_API_KEY) is configured on the server.' } };
}

export async function runAiText(req: any): Promise<AiResult<{ answer: string }>> {
  const textPrompt = `Answer this InsightFlow analytics request:\n${JSON.stringify(req, null, 2)}`;
  const textSystem = 'You are an AI assistant acting as InsightFlow business intelligence copilot. Be direct, specific, and executive-ready.';

  // Try Cerebras FIRST (primary provider)
  if (process.env.CEREBRAS_API_KEY) {
    try {
      const answer = await runWithRetry(() => callCerebras(textPrompt, textSystem), 'Cerebras');
      return { ok: true, model: getCerebrasModel(), data: { answer } };
    } catch (error) {
      const cerebrasError = normalizeError(error, 'Cerebras');
      console.log(`Cerebras text failed completely (${cerebrasError.code}), trying Gemini fallback...`);
    }
  }

  // Fall back to Groq (2nd tier)
  if (process.env.GROQ_API_KEY) {
    try {
      const answer = await runWithRetry(() => callGroq(textPrompt, textSystem), 'Groq');
      return { ok: true, model: getGroqModel(), data: { answer } };
    } catch (error) {
      const groqError = normalizeError(error, 'Groq');
      console.log(`Groq text failed completely (${groqError.code}), trying Gemini...`);
    }
  }

  // Last resort: Gemini
  if (process.env.GEMINI_API_KEY) {
    try {
      const answer = await runWithRetry(() => callGemini(textPrompt, textSystem), 'Gemini');
      return { ok: true, model: getGeminiModel(), data: { answer } };
    } catch (error) {
      const geminiError = normalizeError(error, 'Gemini');
      return { ok: false, model: getGeminiModel(), data: { answer: localAnswer(req) }, error: geminiError };
    }
  }

  return { ok: false, model: 'fallback', data: { answer: localAnswer(req) }, error: { code: 'missing_key', message: 'No AI provider (CEREBRAS_API_KEY, GROQ_API_KEY, GEMINI_API_KEY) is configured on the server.' } };
}

