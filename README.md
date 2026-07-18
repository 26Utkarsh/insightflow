# InsightFlow

InsightFlow is a premium AI-powered business intelligence workspace for dataset upload, profiling, interactive dashboards, AI-assisted analysis, and executive-grade exports.

## ✨ Features

- **AI-Powered Analytics**: Advanced AI analysis with automatic fallback to Cerebras when Gemini reaches quota limits
- **Interactive Dashboards**: Real-time data visualization with Recharts
- **Premium Export Options**: PDF, DOCX, Excel, CSV, JSON, PNG, and print-ready formats
- **Data Profiling**: Automatic dataset quality assessment and cleaning
- **Risk Analysis**: Built-in audit observations and risk scoring
- **Executive Reports**: AI-generated summaries and actionable recommendations
- **Local Persistence**: IndexedDB-backed storage for datasets and history
- **Multi-Domain Support**: Business Intelligence, Internal Audit, Financial Analysis, Sales Analytics, Operations Analytics

## 🛠 Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS v4
- **State Management**: Zustand with IndexedDB persistence
- **Charts**: Recharts for interactive data visualization
- **Animations**: Framer Motion for smooth transitions
- **Backend**: Express.js API layer
- **AI Integration**: 
  - Primary: Google Gemini (gemini-3.5-flash)
  - Fallback: Cerebras (llama-3.3-70b) with automatic failover
- **Export Libraries**: jsPDF, docx, exceljs, html2canvas
- **Icons**: Lucide React

## 🚀 Local Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open `http://localhost:3000`.

## ⚙️ Environment Variables

Create a local `.env` file:

```bash
# Primary AI API (Required)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.5-flash

# Fallback AI API (Optional but recommended)
# Cerebras provides 1M tokens/day free tier
CEREBRAS_API_KEY=your_cerebras_api_key_here
CEREBRAS_MODEL=llama-3.3-70b
```

**Important**: API keys are used only by the server. Never expose them in frontend code or commit them to version control.

## 🏗️ Build & Production

```bash
# Build for production
npm run build

# Start production server
npm start
```

## 🌐 Render Deployment

**Build Command**: `npm ci && npm run build`

**Start Command**: `npm start`

**Environment Variables**:
- `GEMINI_API_KEY` (Required)
- `GEMINI_MODEL` (Optional, defaults to gemini-3.5-flash)
- `CEREBRAS_API_KEY` (Optional, recommended for fallback)
- `CEREBRAS_MODEL` (Optional, defaults to llama-3.3-70b)
- `PORT` (Optional, defaults to 3000)

## 📦 GitHub & Version Control

Use GitHub as the source repository for deployment. **Do not commit**:
- `.env` files (use `.env.example` as template)
- `node_modules/`
- `dist/`
- Local datasets or generated files
- Logs

**Fresh Clone Verification**:
```bash
git clone <your-repo-url>
cd insightflow
npm ci
npm run build
npm start
```

## 🔒 Security

- API keys are server-side only and never exposed to the client
- Uploaded datasets are stored locally in the browser via IndexedDB
- No data is sent to external servers except for AI API calls
- Automatic fallback mechanism ensures service continuity

## 📊 Export Features

InsightFlow supports multiple export formats:

- **PDF**: Executive reports with charts and analysis
- **DOCX**: Word documents with formatted content
- **Excel**: Spreadsheets with styled headers and metadata
- **CSV**: Raw data export with UTF-8 encoding
- **JSON**: Structured data export
- **PNG**: High-resolution screenshots
- **Print**: Print-optimized layouts

## 🤖 AI Fallback Strategy

The application automatically falls back to Cerebras when Gemini reaches quota limits or rate limits:

1. **Primary**: Google Gemini API
2. **Fallback**: Cerebras API (1M tokens/day free tier)
3. **Last Resort**: Local deterministic insights

This ensures continuous service even when one provider is unavailable.

## 📝 License

This project is proprietary software. All rights reserved.
