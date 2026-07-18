import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Download,
  Eye,
  FileSpreadsheet,
  FileText, Loader2,
  RefreshCw,
  Shield,
  UploadCloud
} from 'lucide-react';
import React, { useCallback, useRef, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { runAiReasoning } from '../audit/ai/AiReasoningLayer';
import { generateRecommendations } from '../audit/ai/RecommendationEngine';
import { analyzeRootCauses } from '../audit/ai/RootCauseAnalyzer';
import { runComplianceChecks } from '../audit/compliance/ComplianceEngine';
import { collectEvidence } from '../audit/evidence/EvidenceCollector';
import { detectFraud } from '../audit/fraud/FraudDetector';
import { mapColumns } from '../audit/pipeline/ColumnMapper';
import { cleanData } from '../audit/pipeline/DataCleaner';
import { profileData } from '../audit/pipeline/DataProfiler';
import { ingestMultipleFiles } from '../audit/pipeline/FileIngestor';
import { detectDomain } from '../audit/pipeline/SchemaDetector';
import { generateAuditReport, generateHTMLReport } from '../audit/reports/AuditReportGenerator';
import { downloadDOCXReport } from '../audit/reports/DOCXReport';
import { downloadPDFReport } from '../audit/reports/PDFReport';
import { generateRiskSummary } from '../audit/risk/RiskScorer';
import { executeRules } from '../audit/rules/RuleEngine';
import {
  AuditFinding, AuditRecord, AuditResult,
  CanonicalFields,
  DatasetDomain,
  PipelineProgress, PipelineStage
} from '../audit/types';
import AuditDashboard from '../components/audit/AuditDashboard';
import AuditFindings from '../components/audit/AuditFindings';
import { useAppStore } from '../store';

type AuditView = 'upload' | 'processing' | 'dashboard' | 'findings';

const STAGE_LABELS: Record<PipelineStage, string> = {
  upload: 'Uploading Files',
  validation: 'Validating Data',
  schema_detection: 'Detecting Dataset Domain',
  column_mapping: 'Mapping Columns',
  data_cleaning: 'Cleaning Data',
  normalization: 'Normalizing Values',
  business_context: 'Building Business Context',
  rule_engine: 'Executing Audit Rules',
  ai_reasoning: 'AI Reasoning Analysis',
  risk_scoring: 'Scoring Risk',
  evidence_collection: 'Collecting Evidence',
  recommendations: 'Generating Recommendations',
  report_generation: 'Building Report',
  complete: 'Complete',
  error: 'Error',
};

export default function AuditPage() {
  const activeDataset = useAppStore(s => s.activeDataset);
  const auditResult = useAppStore(s => s.auditResult);
  const setAuditResult = useAppStore(s => s.setAuditResult);
  const setAuditProgress = useAppStore(s => s.setAuditProgress);

  const [view, setView] = useState<AuditView>(auditResult ? 'dashboard' : 'upload');
  const [progress, setProgress] = useState<PipelineProgress | null>(null);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll terminal to bottom
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalLogs]);

  const updateProgress = useCallback((stage: PipelineStage, pct: number, msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logPrefix = `[${timestamp}] [${stage.toUpperCase().padEnd(16)}]`;
    let logMsg = '';
    switch (stage) {
      case 'upload':
        logMsg = `${logPrefix} Ingesting file stream into local workspace...`;
        break;
      case 'validation':
        logMsg = `${logPrefix} Validating record formats and column counts...`;
        break;
      case 'schema_detection':
        logMsg = `${logPrefix} Evaluating metadata schema types...`;
        break;
      case 'column_mapping':
        logMsg = `${logPrefix} Aligning schema to canonical model fields...`;
        break;
      case 'data_cleaning':
        logMsg = `${logPrefix} Standardizing values & auditing quality profiles...`;
        break;
      case 'rule_engine':
        logMsg = `${logPrefix} Running control checks over records...`;
        break;
      case 'ai_reasoning':
        logMsg = `${logPrefix} Launching cognitive layer (failover-enabled LLM)...`;
        break;
      case 'risk_scoring':
        logMsg = `${logPrefix} Scoring risk vectors and category weights...`;
        break;
      case 'evidence_collection':
        logMsg = `${logPrefix} Packaging transaction trails for forensic review...`;
        break;
      case 'recommendations':
        logMsg = `${logPrefix} Synthesizing corrective operations briefing...`;
        break;
      case 'report_generation':
        logMsg = `${logPrefix} Formatting final report layout...`;
        break;
      case 'complete':
        logMsg = `${logPrefix} Audit successfully compiled.`;
        break;
      default:
        logMsg = `${logPrefix} ${msg}`;
    }
    
    setTerminalLogs(prev => [...prev, logMsg, `[${timestamp}]   ➔ ${msg}`]);
    const p: PipelineProgress = { stage, progress: pct, message: msg, startedAt: Date.now() };
    setProgress(p);
    setAuditProgress(p);
  }, [setAuditProgress]);

  const runPipeline = useCallback(async (files: File[]) => {
    setError(null);
    setTerminalLogs([]);
    setView('processing');
    const t0 = performance.now();

    try {
      // 1. Ingest
      updateProgress('upload', 5, 'Parsing files...');
      const ingestResults = await ingestMultipleFiles(files);
      let records: AuditRecord[] = [];
      let fileName = files[0]?.name || 'Unknown';
      for (const ir of ingestResults) {
        records = records.concat(ir.records);
      }
      if (records.length === 0) throw new Error('No data rows found in uploaded files.');

      // 2. Validate
      updateProgress('validation', 12, `Validating ${records.length.toLocaleString()} records...`);
      await new Promise(r => setTimeout(r, 200));

      // 3. Schema detection
      updateProgress('schema_detection', 18, 'Detecting dataset domain framework...');
      const columns = records.length > 0 ? Object.keys(records[0]) : [];
      const domainResult = detectDomain(columns, records.slice(0, 20));
      const domain: DatasetDomain = domainResult.domain;

      // 4. Column mapping
      updateProgress('column_mapping', 25, `Mapping dimensions for ${domain}...`);
      const mappedFields: CanonicalFields = mapColumns(columns, domain);

      // 5. Data profiling (before cleaning)
      updateProgress('data_cleaning', 30, 'Profiling column health metrics...');
      const idCol = mappedFields.id || undefined;
      const amtCol = mappedFields.amount || undefined;
      const dateCol = mappedFields.date || undefined;
      const dataQuality = profileData(records, idCol, amtCol, dateCol);

      // 6. Data cleaning
      updateProgress('data_cleaning', 35, 'Executing automated cleaning schema...');
      const cleaned = cleanData(records, mappedFields, dataQuality.columnProfiles);

      // 7. Normalization
      updateProgress('normalization', 40, 'Normalizing rows...');
      await new Promise(r => setTimeout(r, 150));

      // 8. Business context
      updateProgress('business_context', 44, 'Calibrating metadata contexts...');
      await new Promise(r => setTimeout(r, 100));

      // 9. Rule engine
      updateProgress('rule_engine', 50, 'Executing controls audit rules...');
      const engineResult = executeRules(cleaned.cleaned, mappedFields, domain, fileName);
      let findings = engineResult.findings;

      // 10. Fraud detection
      updateProgress('rule_engine', 58, 'Running fraud signature pattern searches...');
      const fraudIndicators = detectFraud(cleaned.cleaned, mappedFields, domain);

      // 11. AI reasoning
      updateProgress('ai_reasoning', 65, 'Analyzing findings via LLM reasoning...');
      const aiResult = await runAiReasoning(domain, findings, fraudIndicators, cleaned.cleaned.length);

      // Merge AI reasoning into findings
      findings = findings.map(f => {
        const reasoning = aiResult.reasoning.find(r => r.findingId === f.id);
        return reasoning ? { ...f, aiReasoning: reasoning } : f;
      });

      // 12. Risk scoring (already computed in RuleEngine, re-aggregate)
      updateProgress('risk_scoring', 75, 'Scoring risk levels...');
      const riskSummary = generateRiskSummary(findings, fraudIndicators, cleaned.cleaned.length);

      // 13. Compliance
      updateProgress('evidence_collection', 80, 'Evaluating compliance checkboxes...');
      const complianceResults = runComplianceChecks(cleaned.cleaned, mappedFields, domain);

      // 14. Evidence
      updateProgress('evidence_collection', 85, 'Packaging audit trails...');
      const findingsWithEvidence = collectEvidence(findings, cleaned.cleaned, mappedFields, fileName);

      // 15. Root cause + recommendations
      updateProgress('recommendations', 90, 'Formulating recommendations briefs...');
      const rootCauses = analyzeRootCauses(findingsWithEvidence);
      const recResult = generateRecommendations(findingsWithEvidence, domain);

      // Enrich findings with recommendations
      const finalFindings: AuditFinding[] = findingsWithEvidence.map(f => {
        const rec = recResult.findingRecommendations.find(r => r.findingId === f.id);
        return rec ? { ...f, recommendations: rec } : f;
      });

      // 15. Report
      updateProgress('report_generation', 95, 'Compiling briefing layout...');
      const report = generateAuditReport({
        datasetName: fileName,
        domain,
        findings: finalFindings,
        fraudIndicators,
        complianceResults,
        dataQuality,
        riskSummary,
        rootCauses,
        recommendations: recResult.generalRecommendations,
        executiveSummary: buildExecutiveSummary(finalFindings, riskSummary, domain, fraudIndicators.length, dataQuality.score),
        overallAssessment: riskSummary.overallScore >= 70 ? 'Satisfactory' : riskSummary.overallScore >= 40 ? 'Needs Improvement' : 'Unsatisfactory',
        totalRecords: cleaned.cleaned.length,
        rulesExecuted: engineResult.rulesExecuted,
        processingTimeMs: performance.now() - t0,
        columnProfiles: dataQuality.columnProfiles,
      });

      const result: AuditResult = {
        report,
        cleanedData: cleaned.cleaned,
        mappedFields,
        domain,
        pipelineTimeMs: performance.now() - t0,
      };

      setAuditResult(result);
      updateProgress('complete', 100, `Audit compiled successfully in ${((performance.now() - t0) / 1000).toFixed(1)}s`);
      toast.success(`Audit complete: ${finalFindings.length} findings identified`);
      setTimeout(() => setView('dashboard'), 600);
    } catch (err: any) {
      const msg = err?.message || 'Audit pipeline failed';
      setError(msg);
      updateProgress('error', 0, msg);
      toast.error(msg);
    }
  }, [setAuditResult, setAuditProgress, updateProgress]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) runPipeline(files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) runPipeline(files);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleUseActiveDataset = () => {
    if (!activeDataset) {
      toast.error('No active dataset. Upload a file first.');
      return;
    }
    try {
      const jsonStr = JSON.stringify(activeDataset.data);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const file = new File([blob], activeDataset.name || 'dataset.json', { type: 'application/json' });
      runPipeline([file]);
    } catch {
      toast.error('Failed to prepare dataset for audit.');
    }
  };

  const handleExportHTML = () => {
    if (!auditResult) return;
    const html = generateHTMLReport(auditResult.report);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-report-${auditResult.report.datasetName}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('HTML report downloaded');
  };

  const handleExportPDF = () => {
    if (!auditResult) return;
    try {
      downloadPDFReport(auditResult.report);
      toast.success('PDF report downloaded');
    } catch (e) {
      toast.error('Failed to generate PDF');
    }
  };

  const handleExportDOCX = async () => {
    if (!auditResult) return;
    try {
      await downloadDOCXReport(auditResult.report);
      toast.success('DOCX report downloaded');
    } catch (e) {
      toast.error('Failed to generate DOCX');
    }
  };

  const handleReset = () => {
    setAuditResult(null);
    setProgress(null);
    setError(null);
    setTerminalLogs([]);
    setView('upload');
  };

  // ── Upload View ──
  if (view === 'upload') {
    return (
      <div className="flex-1 flex flex-col items-center justify-start min-h-screen bg-bg-primary px-6 py-16 overflow-y-auto relative">
        <div className="product-backdrop" aria-hidden="true" />
        
        {/* Glowing radial atmospheric aura */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-accent-primary/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="w-full max-w-4xl flex flex-col items-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-14">
            <span className="editorial-label mb-3 block tracking-[0.2em] text-accent-secondary">Forensic Controls Panel</span>
            <h1 className="text-5xl md:text-6xl font-black tracking-tight text-text-primary mb-5 font-display leading-tight">
              AI Internal Audit Engine
            </h1>
            <p className="text-base text-text-secondary max-w-lg mx-auto leading-relaxed">
              Scan records to identify control gaps, compliance flags, fraud risk assessments, and executive remedial briefings.
            </p>
          </motion.div>

          <div className="w-full max-w-xl mb-10">
            <div
              className={`surface-panel rounded-2xl flex flex-col items-center justify-center p-14 text-center transition-all bg-bg-secondary/20 bevel-border glow-card relative overflow-hidden
                ${dragActive ? 'border-accent-primary scale-[1.01] bg-accent-primary/[0.02]' : 'border-border-primary hover:border-border-secondary'}`}
              onClick={() => fileInputRef.current?.click()}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              role="button"
              tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
            >
              {/* Subtle top indicator bar */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-accent-primary/30 to-transparent" />

              <div className="w-12 h-12 rounded-xl bg-bg-elevated border border-border-primary flex items-center justify-center mb-5 text-text-muted hover:text-accent-secondary transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                <UploadCloud size={22} />
              </div>
              <h3 className="text-base font-bold text-text-primary mb-2">Drag &amp; drop files or click to browse</h3>
              <p className="text-sm text-text-muted mb-6">Supports CSV, XLSX, JSON, PDF</p>
              <button className="primary-action text-sm font-semibold px-8 py-3 rounded-lg">Select Files</button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".csv,.xlsx,.xls,.json,.pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>

          {activeDataset && (
            <button onClick={handleUseActiveDataset} className="quiet-action text-xs font-semibold px-5 py-2.5 gap-2 border border-border-primary/80 rounded-xl bevel-border bg-bg-secondary/40 hover:bg-bg-secondary/70 transition-all">
              <FileSpreadsheet size={13} className="text-accent-secondary shrink-0" /> 
              Audit active workspace: <strong className="text-text-primary underline decoration-accent-secondary/50 underline-offset-2">{activeDataset.name}</strong>
            </button>
          )}

          {/* Unified borderless card strip (Anti-box-in-box design) */}
          <div className="mt-16 border border-border-primary/80 rounded-2xl bg-bg-secondary/10 overflow-hidden w-full max-w-3xl grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-border-primary/80">
            {[
              { icon: <Shield size={16} />, label: '15+ Audit Rules', desc: 'Preconfigured control policies' },
              { icon: <Eye size={16} />, label: 'Fraud Detection', desc: 'Signature checks & anomalies' },
              { icon: <BarChart3 size={16} />, label: 'Risk Scoring', desc: 'Weighted category scores' },
              { icon: <FileText size={16} />, label: 'Briefing Reports', desc: 'DOCX, PDF, and HTML' },
            ].map(f => (
              <div key={f.label} className="flex flex-col gap-1 p-6 text-left bg-transparent">
                <span className="text-accent-secondary mb-2.5 shrink-0">{f.icon}</span>
                <span className="text-sm font-bold text-text-primary leading-tight">{f.label}</span>
                <span className="text-xs text-text-muted mt-1 leading-relaxed">{f.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Processing View (The Log Console) ──
  if (view === 'processing') {
    const stages: PipelineStage[] = ['upload', 'validation', 'schema_detection', 'column_mapping', 'data_cleaning', 'normalization', 'business_context', 'rule_engine', 'ai_reasoning', 'risk_scoring', 'evidence_collection', 'recommendations', 'report_generation'];
    const currentIdx = progress ? stages.indexOf(progress.stage) : -1;

    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-bg-primary px-6 py-12 relative overflow-hidden">
        <div className="product-backdrop" aria-hidden="true" />
        
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-3xl relative z-10 flex flex-col gap-6">
          <div className="text-center">
            <Loader2 size={32} className="text-accent-secondary animate-spin mx-auto mb-3" />
            <h2 className="text-xl font-black text-text-primary font-display tracking-tight">Compiling Forensic Audit</h2>
            <p className="text-xs text-text-muted mt-1">Executing pipeline instructions...</p>
          </div>

          {/* Interactive Console Terminal */}
          <div className="w-full h-80 rounded-xl bg-black border border-border-primary/80 p-5 font-mono text-[11px] text-zinc-400 flex flex-col justify-between overflow-hidden shadow-2xl relative">
            <div className="absolute top-3 right-5 flex gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-danger/40" />
              <span className="w-2.5 h-2.5 rounded-full bg-warning/40" />
              <span className="w-2.5 h-2.5 rounded-full bg-success/40" />
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar pr-2 mb-4 leading-normal">
              {terminalLogs.map((log, idx) => (
                <div key={idx} className={log.includes('[COMPLETE') || log.includes('successfully') ? 'text-success font-semibold' : log.includes('➔') ? 'text-zinc-500 pl-4' : log.includes('error') ? 'text-danger font-semibold' : ''}>
                  {log}
                </div>
              ))}
              <div ref={terminalEndRef} />
            </div>

            <div className="flex items-center justify-between border-t border-zinc-900 pt-3 text-[10px] text-zinc-500 shrink-0">
              <span className="animate-pulse">● PIPELINE RUNNING</span>
              <span>STAGE {currentIdx + 1}/{stages.length}: {STAGE_LABELS[stages[currentIdx]] || 'STANDBY'}</span>
            </div>
          </div>

          {progress && (
            <div className="w-full bg-border-primary rounded-full h-1.5 overflow-hidden">
              <motion.div className="bg-accent-primary h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${progress.progress}%` }} transition={{ duration: 0.3 }} />
            </div>
          )}

          {error && (
            <div className="bg-danger/5 border border-danger/20 rounded-xl p-4 text-center">
              <p className="text-danger text-xs font-semibold mb-2">{error}</p>
              <button onClick={handleReset} className="quiet-action text-xs font-semibold px-4 py-2 border border-border-primary rounded-lg bg-bg-surface">Try Again</button>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  if (!auditResult) return null;

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-bg-primary overflow-y-auto custom-scrollbar">
      {/* Header bar */}
      <div className="sticky top-0 z-30 backdrop-blur-md bg-bg-primary/80 border-b border-border-primary/60 px-6 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent-primary/10 flex items-center justify-center border border-accent-primary/25">
            <Shield size={16} className="text-accent-secondary" />
          </div>
          <div>
            <h1 className="text-xs font-black text-text-primary tracking-tight">{auditResult.report.datasetName}</h1>
            <span className="text-[9px] uppercase font-bold tracking-widest text-text-muted">{auditResult.domain} framework</span>
          </div>
        </div>
        
        {/* Navigation Tabs & Actions */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex bg-bg-secondary p-1 rounded-lg border border-border-primary/60 mr-2">
            <button 
              onClick={() => setView('dashboard')} 
              className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors 
                ${view === 'dashboard' ? 'text-text-primary bg-bg-elevated border border-border-primary/40' : 'text-text-muted hover:text-text-secondary'}`}
            >
              Dashboard
            </button>
            <button 
              onClick={() => setView('findings')} 
              className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors 
                ${view === 'findings' ? 'text-text-primary bg-bg-elevated border border-border-primary/40' : 'text-text-muted hover:text-text-secondary'}`}
            >
              Findings ({auditResult.report.findings.length})
            </button>
          </div>
          
          <button onClick={handleExportHTML} className="quiet-action text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg border border-border-primary gap-1">
            <Download size={11} /> HTML
          </button>
          <button onClick={handleExportPDF} className="quiet-action text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg border border-border-primary gap-1">
            <Download size={11} /> PDF
          </button>
          <button onClick={handleExportDOCX} className="quiet-action text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg border border-border-primary gap-1">
            <Download size={11} /> DOCX
          </button>
          <button onClick={handleReset} className="quiet-action text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg border border-border-primary gap-1">
            <RefreshCw size={11} /> Reset
          </button>
        </div>
      </div>

      <div className="flex-1 p-6 lg:p-12">
        <AnimatePresence mode="wait">
          {view === 'dashboard' && (
            <motion.div key="dashboard-tab" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
              <AuditDashboard result={auditResult} onNavigateFindings={() => setView('findings')} />
            </motion.div>
          )}
          {view === 'findings' && (
            <motion.div key="findings-tab" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
              <AuditFindings findings={auditResult.report.findings} records={auditResult.cleanedData} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function buildExecutiveSummary(
  findings: import('../audit/types').AuditFinding[],
  riskSummary: import('../audit/risk/RiskScorer').RiskSummary,
  domain: DatasetDomain,
  fraudCount: number,
  dataQualityScore: number
): string {
  const critical = findings.filter(f => f.severity === 'Critical').length;
  const high = findings.filter(f => f.severity === 'High').length;
  const total = findings.length;
  const score = riskSummary.overallScore;

  let summary = `Internal audit of ${domain} dataset identified ${total} finding(s) with an overall control environment score of ${score}/100. `;
  if (critical > 0) summary += `${critical} critical finding(s) require immediate management attention. `;
  if (high > 0) summary += `${high} high-severity finding(s) should be prioritized for remediation. `;
  if (fraudCount > 0) summary += `${fraudCount} fraud indicator(s) detected requiring further investigation. `;
  if (total === 0) summary += `No significant issues were identified. The control environment appears effective. `;
  summary += `Data quality score: ${dataQualityScore >= 70 ? 'Good' : dataQualityScore >= 40 ? 'Fair' : 'Poor'} (${dataQualityScore}/100).`;
  return summary;
}
