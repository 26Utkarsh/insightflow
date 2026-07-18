import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { getCerebrasModel, getGeminiModel, getGroqModel, localDetection, localReport, runAiJson, runAiText } from './src/server/aiService';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);
  
  app.use(express.json({ limit: '50mb' }));

  app.get('/api/ai/status', (_req, res) => {
    res.json({
      primaryModel:      getCerebrasModel(),
      fallback1Model:    getGroqModel(),
      fallback2Model:    getGeminiModel(),
      cerebrasConfigured: Boolean(process.env.CEREBRAS_API_KEY),
      groqConfigured:     Boolean(process.env.GROQ_API_KEY),
      geminiConfigured:   Boolean(process.env.GEMINI_API_KEY),
      configured: Boolean(process.env.CEREBRAS_API_KEY || process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY)
    });
  });

  // API Route: Smart Dataset Detection
  app.post('/api/detect-dataset', async (req, res) => {
    try {
      const fallback = localDetection({
        task: 'detect-dataset',
        columns: req.body?.columns || [],
        sampleData: req.body?.sampleData || []
      });
      const result = await runAiJson({
        task: 'detect-dataset',
        columns: req.body?.columns || [],
        sampleData: req.body?.sampleData || []
      }, fallback);
      res.json({ ...result.data, model: result.model, aiAvailable: result.ok, error: result.error });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to detect dataset' });
    }
  });
  
  // API Route: Dynamic Analysis / AI Copilot
  app.post('/api/analyze', async (req, res) => {
    try {
      const wantsReport = !req.body?.query;
      if (wantsReport) {
        const fallback = localReport({
          task: 'report',
          domain: req.body?.domain,
          metrics: req.body?.metrics || {},
          context: req.body?.context || []
        });
        const result = await runAiJson({
          task: 'report',
          domain: req.body?.domain,
          metrics: req.body?.metrics || {},
          context: req.body?.context || []
        }, fallback);
        res.json({ report: result.data, model: result.model, aiAvailable: result.ok, error: result.error });
        return;
      }

      const result = await runAiText({
        task: req.body?.type === 'chart' ? 'explain' : 'copilot',
        domain: req.body?.domain,
        query: req.body?.query,
        metrics: req.body?.metrics || {},
        context: req.body?.context || []
      });
      res.json({ answer: result.data.answer, model: result.model, aiAvailable: result.ok, error: result.error });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Analysis failed' });
    }
  });

  // ── Audit AI Endpoints ──────────────────────────────────────────────────────
  app.post('/api/audit/ai-reasoning', async (req, res) => {
    try {
      const { prompt, systemPrompt } = req.body || {};
      if (!prompt) return res.status(400).json({ error: 'Missing prompt' });
      const result = await runAiJson(
        { task: 'audit-reasoning', prompt },
        { reasoning: [], executiveSummary: '', overallAssessment: '' },
      );
      res.json({ result: result.data, model: result.model, aiAvailable: result.ok, error: result.error });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'AI reasoning failed' });
    }
  });

  app.post('/api/audit/root-cause', async (req, res) => {
    try {
      const { prompt } = req.body || {};
      const result = await runAiJson(
        { task: 'audit-root-cause', prompt },
        { rootCauses: [] },
      );
      res.json({ result: result.data, model: result.model, aiAvailable: result.ok, error: result.error });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Root cause analysis failed' });
    }
  });

  app.post('/api/audit/recommendations', async (req, res) => {
    try {
      const { prompt } = req.body || {};
      const result = await runAiJson(
        { task: 'audit-recommendations', prompt },
        { recommendations: [], generalRecommendations: [] },
      );
      res.json({ result: result.data, model: result.model, aiAvailable: result.ok, error: result.error });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Recommendation generation failed' });
    }
  });

  // API Route: Generate Insights
  app.post('/api/generate-insights', async (req, res) => {
    try {
      const fallback = localReport({
        task: 'insights',
        domain: req.body?.domain,
        metrics: req.body?.metrics || {},
        context: req.body?.context || []
      });
      const result = await runAiJson({
        task: 'insights',
        domain: req.body?.domain,
        metrics: req.body?.metrics || {},
        context: req.body?.context || []
      }, fallback);
      res.json({
        insights: result.data.keyInsights || result.data.insights || [],
        recommendations: result.data.recommendations || [],
        model: result.model,
        aiAvailable: result.ok
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to generate insights' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
