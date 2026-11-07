<div align="center">

<img src="assets/hero.svg" alt="InsightFlow: drop a dataset, get the story" width="100%" />

<br />

<a href="https://github.com/26Utkarsh/insightflow/stargazers"><img src="https://img.shields.io/github/stars/26Utkarsh/insightflow?style=for-the-badge&color=4F46E5&logo=github&labelColor=0A0C1E" alt="GitHub stars" /></a>
<a href="https://github.com/26Utkarsh/insightflow/network/members"><img src="https://img.shields.io/github/forks/26Utkarsh/insightflow?style=for-the-badge&color=4F46E5&logo=git&labelColor=0A0C1E" alt="GitHub forks" /></a>
<a href="https://github.com/26Utkarsh/insightflow/blob/main/LICENSE"><img src="https://img.shields.io/github/license/26Utkarsh/insightflow?style=for-the-badge&color=22D3EE&labelColor=0A0C1E" alt="License" /></a>

<br /><br />

<img src="https://img.shields.io/badge/React_18-0A0C1E?style=flat-square&logo=react&logoColor=22D3EE" alt="React 18" />
<img src="https://img.shields.io/badge/TypeScript-0A0C1E?style=flat-square&logo=typescript&logoColor=3178C6" alt="TypeScript" />
<img src="https://img.shields.io/badge/Vite-0A0C1E?style=flat-square&logo=vite&logoColor=A78BFA" alt="Vite" />
<img src="https://img.shields.io/badge/Tailwind_v4-0A0C1E?style=flat-square&logo=tailwindcss&logoColor=22D3EE" alt="Tailwind CSS v4" />
<img src="https://img.shields.io/badge/Zustand-0A0C1E?style=flat-square&logoColor=FBBF24&logo=react" alt="Zustand" />
<img src="https://img.shields.io/badge/Gemini-0A0C1E?style=flat-square&logo=googlegemini&logoColor=8AB4F8" alt="Google Gemini" />

<br /><br />

<b>A premium AI-powered business intelligence workspace for instant dataset profiling,<br />audit compliance, and interactive visual reporting.</b>

<br /><br />

<a href="#what-it-does">What it does</a> &nbsp;·&nbsp;
<a href="#how-data-flows">How data flows</a> &nbsp;·&nbsp;
<a href="#features">Features</a> &nbsp;·&nbsp;
<a href="#tech-stack">Tech stack</a> &nbsp;·&nbsp;
<a href="#quickstart">Quickstart</a>

</div>

<img src="assets/pulse.svg" width="100%" alt="" />

## What it does

Three moves, from raw file to finished brief.

<table>
<tr>
<td width="33%" valign="top">

### 01 &nbsp;Ingest

Drag and drop **CSV, Excel, or JSON**. InsightFlow runs schema profiling, handles missing values, removes duplicates, and standardises formats instantly.

</td>
<td width="33%" valign="top">

### 02 &nbsp;Explore

Work in an interactive canvas with **dynamic charts**, customisable dimensions, and real-time filtering, powered by Recharts.

</td>
<td width="33%" valign="top">

### 03 &nbsp;Ask

Get deep contextual observations from the **AI Copilot**. A dual-engine LLM structure (Gemini, with Cerebras as fallback) keeps synthesis, audit reports, and summaries flowing without interruption.

</td>
</tr>
</table>

<div align="center">

<img src="assets/dashboard.svg" alt="Illustration of the InsightFlow canvas with KPI tiles, charts, and the AI Copilot panel" width="100%" />

<sub>An illustration of the canvas, drawn for this README. It is not a live screenshot.</sub>

</div>

<img src="assets/pulse.svg" width="100%" alt="" />

## How data flows

<img src="assets/pipeline.svg" alt="Pipeline: ingest, profile and clean, canvas, AI Copilot with Gemini to Cerebras failover, export" width="100%" />

<br />

<details>
<summary><b>System architecture and data flow (click to expand)</b></summary>

<br />

```mermaid
graph TD
    A[Dataset file: CSV / XLSX / JSON] -->|Upload / drag and drop| B(Ingestion engine)
    B -->|Auto profile and clean| C[(IndexedDB cache)]
    B -->|Schema mapping| D[React UI canvas]
    D -->|Query / Copilot prompt| E(API Express server)
    E -->|1. Primary inference| F[Gemini API]
    E -->|2. Failover fallback| G[Cerebras Llama 3.3]
    F -.->|Quota exceeded| G
    E -->|Structured observations| D
    D -->|Export briefing decks| H[PDF / DOCX / Excel engine]
```

</details>

<img src="assets/pulse.svg" width="100%" alt="" />

## Features

| | Feature | What you get |
| :-: | :-- | :-- |
| ⚡ | **Dual AI engine** | Primary inference via Gemini with automatic failover to Cerebras Llama 3.3 for high availability. |
| 🧹 | **Auto data cleaning** | Detects and resolves missing records, anomalous numbers, and duplicate stamps during ingestion. |
| 🎨 | **Bespoke UI** | Premium light-first styling by default, ambient botanical line-art backgrounds, Satoshi typography, and fluid transitions. |
| 📁 | **Local-first storage** | Client history and active catalogs persisted in IndexedDB for maximum speed and security. |
| 📈 | **Rich visual charts** | Interactive metrics rendered with responsive Recharts, grouped by custom dimensions. |
| 🖨️ | **Print-ready briefs** | Export professional PDFs, Excel sheets, and print layouts with one-click operations. |

<img src="assets/pulse.svg" width="100%" alt="" />

## Tech stack

<div align="center">

<img src="https://skillicons.dev/icons?i=react,ts,nodejs,express,tailwind,vite,figma,git&theme=dark" alt="React, TypeScript, Node.js, Express, Tailwind CSS, Vite, Figma, Git" />

</div>

<br />

| Layer | Choice |
| :-- | :-- |
| **Core** | React 18 · TypeScript · Vite · Tailwind CSS v4 |
| **State** | Zustand with local IndexedDB persistence |
| **Visualisation** | Responsive Recharts graphs |
| **Inference** | Google Gemini (primary) · Cerebras Llama 3.3 (fallback) |
| **Export** | ExcelJS · jsPDF · DOCX export · html2canvas |

<img src="assets/pulse.svg" width="100%" alt="" />

## Quickstart

### Local installation

```bash
# Clone the repository
git clone https://github.com/26Utkarsh/insightflow.git
cd insightflow

# Install node dependencies
npm install

# Start local server and frontend watch
npm run dev
```

Open `http://localhost:3000` and drop in a dataset.

### Environment configuration

Create a local `.env` file at the root of the project:

```bash
# Primary AI API (required)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.5-flash

# Fallback AI API (optional)
CEREBRAS_API_KEY=your_cerebras_api_key_here
CEREBRAS_MODEL=llama-3.3-70b
```

> [!TIP]
> Keep `.env` out of version control. Add it to your `.gitignore` so your API keys never reach GitHub.

<br />

<div align="center">

<img src="assets/pulse.svg" width="100%" alt="" />

**Built by [Utkarsh](https://github.com/26Utkarsh)**

If InsightFlow saved you an afternoon, a ⭐ keeps the signal strong.

<a href="https://github.com/26Utkarsh/insightflow"><img src="https://img.shields.io/badge/GitHub-26Utkarsh%2Finsightflow-4F46E5?style=for-the-badge&logo=github&logoColor=white&labelColor=0A0C1E" alt="InsightFlow on GitHub" /></a>

</div>
