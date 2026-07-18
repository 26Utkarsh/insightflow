import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle, ArrowRight, BarChart3, Brain, Check,
  ChevronRight, Database, FileSpreadsheet, LineChart, Shield, Sparkles, UploadCloud, Zap
} from 'lucide-react';
import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { cleanAndProcessData } from '../data';
import { analyzeFile, FileAnalysis, SheetInfo } from '../lib/importUtils';
import { useAppStore } from '../store';
import { AnalysisProfile, DataResult } from '../types';

type ImportStep = 'upload' | 'select-sheet' | 'summary';

const PROFILES: { id: AnalysisProfile; icon: React.ReactNode; desc: string; color: string }[] = [
  { id: 'Business Intelligence', icon: <Brain size={18} />, desc: 'Cross-functional data exploration & KPIs', color: 'from-blue-500/20 to-indigo-500/20 border-blue-500/30 text-blue-400' },
  { id: 'Internal Audit', icon: <Shield size={18} />, desc: 'Control mapping, fraud risk, compliance validation', color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-400' },
  { id: 'Financial Analysis', icon: <LineChart size={18} />, desc: 'Margin signals, sales growth, revenue indicators', color: 'from-violet-500/20 to-purple-500/20 border-violet-500/30 text-purple-400' },
  { id: 'Sales Analytics', icon: <BarChart3 size={18} />, desc: 'Customer concentration, deals flow, metrics funnel', color: 'from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-400' },
  { id: 'Operations Analytics', icon: <Zap size={18} />, desc: 'Workflows, supply chain checks, efficiency margins', color: 'from-rose-500/20 to-pink-500/20 border-rose-500/30 text-rose-400' },
];

export default function Home() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addDataset = useAppStore(state => state.addDataset);
  const settings = useAppStore(state => state.settings);
  const updateSettings = useAppStore(state => state.updateSettings);

  const [step, setStep] = useState<ImportStep>('upload');
  const [analysis, setAnalysis] = useState<FileAnalysis | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<SheetInfo | null>(null);
  const [processedResult, setProcessedResult] = useState<DataResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectedDomain, setDetectedDomain] = useState<{ type: string; confidence: number; reason: string; example: string } | null>(null);
  const [loadingText, setLoadingText] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<AnalysisProfile>(settings.defaultProfile || 'Business Intelligence');
  const [dragActive, setDragActive] = useState(false);

  React.useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [step]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  };
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) handleFile(e.target.files[0]);
  };

  const handleFile = async (file: File) => {
    setIsProcessing(true); setLoadingText('Analyzing file structure...');
    const toastId = toast.loading('Analyzing file structure...');
    try {
      updateSettings({ defaultProfile: selectedProfile });
      const fileAnalysis = await analyzeFile(file);
      setAnalysis(fileAnalysis);
      if (fileAnalysis.sheets.length > 1) { 
        toast.dismiss(toastId); 
        setStep('select-sheet'); 
      } else { 
        const sheet = fileAnalysis.sheets[0]; 
        setSelectedSheet(sheet); 
        await processSelectedSheet(sheet, fileAnalysis, toastId); 
      }
    } catch (err: any) { 
      toast.error(err.message || 'Failed to analyze file', { id: toastId }); 
      setStep('upload'); 
    } finally { 
      setIsProcessing(false); 
      setLoadingText(''); 
      if (fileInputRef.current) fileInputRef.current.value = ''; 
    }
  };

  const handleSheetSelection = async (sheet: SheetInfo) => {
    if (!analysis) return;
    setSelectedSheet(sheet); setLoadingText('Processing sheet data...');
    const toastId = toast.loading('Processing sheet data...'); setIsProcessing(true);
    try { await processSelectedSheet(sheet, analysis, toastId); }
    catch (err: any) { toast.error(err.message || 'Failed to parse dataset', { id: toastId }); setIsProcessing(false); setLoadingText(''); }
  };

  const processSelectedSheet = async (sheet: SheetInfo, _fileAnalysis: FileAnalysis, toastId?: string | number) => {
    try {
      setLoadingText('Uploading dataset...'); await new Promise(r => setTimeout(r, 300));
      setLoadingText('Profiling & Cleaning data...');
      if (toastId) toast.loading('Profiling & Cleaning data...', { id: toastId });
      const result = await cleanAndProcessData(sheet.rawData);
      setLoadingText('Detecting dataset domain via AI...');
      if (toastId) toast.loading('Detecting dataset domain via AI...', { id: toastId });
      try {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 5000);
        const detectRes = await fetch('/api/detect-dataset', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
          body: JSON.stringify({ columns: sheet.rawData.length > 0 ? Object.keys(sheet.rawData[0]) : [], sampleData: sheet.rawData.slice(0, 5) }),
        }).finally(() => window.clearTimeout(timeout));
        const detectData = await detectRes.json();
        if (detectData?.type) { 
          setDetectedDomain(detectData); 
          setSelectedProfile(detectData.type as AnalysisProfile); 
          updateSettings({ defaultProfile: detectData.type as AnalysisProfile }); 
        }
      } catch { /* fallback to heuristics in frontend */ }
      setLoadingText('Generating AI Insights...'); await new Promise(r => setTimeout(r, 400));
      setProcessedResult(result); setIsProcessing(false); setLoadingText(''); setStep('summary');
      if (toastId) toast.success(`Processed ${result.stats.cleanedRows.toLocaleString()} rows`, { id: toastId });
    } catch (err: any) { 
      if (toastId) toast.error(err.message || 'Failed to process data', { id: toastId }); 
      throw err; 
    } finally { 
      setIsProcessing(false); 
      setLoadingText(''); 
    }
  };

  const handleFinalizeImport = async () => {
    if (!analysis || !processedResult) return;
    setLoadingText('Saving dataset...');
    const toastId = toast.loading('Saving dataset...');
    try {
      const newDataset = { 
        id: crypto.randomUUID(), 
        name: analysis.fileName + (analysis.sheets.length > 1 && selectedSheet ? ` (${selectedSheet.name})` : ''), 
        size: analysis.fileSize, 
        createdAt: Date.now(), 
        data: processedResult.data, 
        stats: processedResult.stats 
      };
      await addDataset(newDataset);
      toast.success('Dataset ready!', { id: toastId });
      navigate(selectedProfile === 'Internal Audit' ? '/audit' : '/analytics');
    } catch { 
      toast.error('Failed to save dataset', { id: toastId }); 
    }
  };

  const formatSize = (bytes: number) => { 
    if (bytes === 0) return '0 B'; 
    const k = 1024; 
    const s = ['B', 'KB', 'MB', 'GB']; 
    const i = Math.floor(Math.log(bytes) / Math.log(k)); 
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + s[i]; 
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-bg-primary text-text-primary relative overflow-x-hidden p-6 lg:p-12">
      <div className="product-backdrop" aria-hidden="true" />

      {/* STEP HEADER */}
      <div className="max-w-5xl mx-auto w-full relative z-10 mb-10 flex justify-between items-center">
        <div className="flex items-center gap-4">
          {/* Step 1 */}
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300
              ${step === 'upload' 
                ? 'bg-bg-surface text-accent-primary border-2 border-accent-primary shadow-[0_0_12px_rgba(99,102,241,0.25)] ring-2 ring-accent-primary/10' 
                : 'bg-success/10 text-success border border-success/20 font-semibold'}`}>
              {step === 'upload' ? '1' : <Check size={11} className="stroke-[2.5]" />}
            </span>
            <span className={`text-[11px] uppercase tracking-wider font-bold transition-colors duration-300 ${step === 'upload' ? 'text-text-primary' : 'text-text-muted'}`}>Upload</span>
          </div>
          
          <div className="h-[2px] w-8 bg-border-primary/80" />
          
          {/* Step 2 */}
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300
              ${step === 'select-sheet' 
                ? 'bg-bg-surface text-accent-primary border-2 border-accent-primary shadow-[0_0_12px_rgba(99,102,241,0.25)] ring-2 ring-accent-primary/10' 
                : step === 'summary' 
                  ? 'bg-success/10 text-success border border-success/20 font-semibold' 
                  : 'bg-transparent text-text-muted/50 border border-border-primary/70'}`}>
              {step === 'select-sheet' ? '2' : step === 'summary' ? <Check size={11} className="stroke-[2.5]" /> : '2'}
            </span>
            <span className={`text-[11px] uppercase tracking-wider font-bold transition-colors duration-300 ${step === 'select-sheet' ? 'text-text-primary' : 'text-text-muted'}`}>Structure</span>
          </div>
          
          <div className="h-[2px] w-8 bg-border-primary/80" />
          
          {/* Step 3 */}
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300
              ${step === 'summary' 
                ? 'bg-bg-surface text-accent-primary border-2 border-accent-primary shadow-[0_0_12px_rgba(99,102,241,0.25)] ring-2 ring-accent-primary/10' 
                : 'bg-transparent text-text-muted/50 border border-border-primary/70'}`}>
              3
            </span>
            <span className={`text-[11px] uppercase tracking-wider font-bold transition-colors duration-300 ${step === 'summary' ? 'text-text-primary' : 'text-text-muted'}`}>Summary</span>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* ── UPLOAD STEP ── */}
        {step === 'upload' && (
          <motion.div
            key="upload-step"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            className="max-w-5xl mx-auto w-full relative z-10 grid lg:grid-cols-[1fr_420px] gap-12 flex-1 items-stretch"
          >
            {/* Subtle Botanical Motif Backgrounds (Negative Space) */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 select-none">
              {/* Top-Right behind Analysis Focus Panel */}
              <div className="absolute -top-16 -right-16 w-[480px] h-[580px] opacity-[0.05] text-accent-secondary">
                <svg viewBox="0 0 400 500" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
                  <path d="M380,0 C330,120 240,240 100,320 M240,150 C180,130 140,150 120,180 C100,210 130,230 240,150 Z M170,220 C120,200 80,220 70,250 C60,280 90,300 170,220 Z" />
                  <path d="M280,90 C220,70 180,90 160,120 C140,150 170,170 280,90 Z" />
                </svg>
              </div>
              {/* Bottom-Left in empty space */}
              <div className="absolute bottom-[-80px] left-[-60px] w-[380px] h-[480px] opacity-[0.04] text-accent-secondary">
                <svg viewBox="0 0 300 400" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
                  <path d="M0,400 C50,280 120,180 250,120 M120,230 C160,250 190,230 200,200 C210,170 180,150 120,230 Z M180,170 C220,190 250,170 260,140 C270,110 240,90 180,170 Z" />
                </svg>
              </div>
            </div>

            {/* Left Column: Dropzone + Explainer */}
            <div className="flex flex-col justify-center py-4 relative z-10">
              <span className="text-[10px] uppercase tracking-[0.28em] font-semibold text-text-muted/70 mb-5 block">
                InsightFlow Ingest Terminal
              </span>
              <h1 className="text-4xl md:text-[46px] font-medium font-serif-display leading-[1.1] text-text-primary mb-2 tracking-[-0.025em]">
                Upload business data. <br />
                Review insights <span className="text-accent-secondary italic underline decoration-accent-secondary/35 decoration-2 underline-offset-6">instantly</span>.
              </h1>
              <p className="text-[17px] text-text-secondary/90 leading-[1.65] max-w-[42rem] mt-7 mb-8">
                InsightFlow automatically profiles, cleans, and structures your records, generating audit ready compliance ledgers and interactive dashboards in seconds.
              </p>

              {/* Handcrafted dropzone */}
              <div className="relative">
                {isProcessing && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-bg-secondary/95 backdrop-blur-md rounded-2xl border border-border-secondary">
                    <motion.div 
                      animate={{ rotate: 360 }} 
                      transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }} 
                      className="w-10 h-10 rounded-full border-2 border-accent-primary border-t-transparent mb-4" 
                    />
                    <p className="text-xs font-bold uppercase tracking-wider text-text-primary animate-pulse">{loadingText || 'Processing...'}</p>
                  </div>
                )}

                <div
                  className={`surface-panel rounded-2xl flex flex-col items-center justify-center p-12 text-center transition-all duration-300 cursor-pointer bg-gradient-to-br from-bg-surface to-bg-secondary/40 hover:to-bg-surface border-2 border-dashed bevel-border glow-card relative overflow-hidden group shadow-[inset_0_2px_8px_rgba(0,0,0,0.015)]
                    ${dragActive ? 'border-accent-secondary scale-[1.01] bg-accent-primary/[0.02] shadow-lg' : 'border-border-primary/80 hover:border-accent-secondary/50 hover:shadow-xl hover:shadow-accent-primary/5'}
                    ${isProcessing ? 'pointer-events-none opacity-50' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                  role="button" tabIndex={0} aria-label="Upload dataset file"
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
                >
                  {/* Subtle top indicator bar */}
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-accent-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  <div className="w-12 h-12 rounded-xl bg-gradient-to-b from-bg-surface to-bg-secondary border border-border-primary/80 flex items-center justify-center mb-5 text-text-muted/80 group-hover:text-accent-secondary transition-all duration-300 shadow-[0_2.5px_8px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.05)] group-hover:scale-105 group-hover:shadow-[0_4px_12px_rgba(79,70,229,0.12)]">
                    <UploadCloud size={18} className="transition-transform duration-300" />
                  </div>
                  <h4 className="text-sm font-extrabold text-text-primary mb-2 tracking-tight group-hover:text-accent-secondary transition-colors duration-200">
                    {dragActive ? 'Drop files here' : 'Drag & drop your file or click to browse'}
                  </h4>
                  <p className="text-xs text-text-muted mb-6">Supports CSV, XLSX, JSON, PDF &mdash; up to 100MB</p>
                  
                  <div className="flex gap-2 mb-6">
                    {['CSV', 'XLSX', 'JSON', 'PDF'].map(f => (
                      <span key={f} className="px-2.5 py-1 bg-bg-surface border border-border-primary/95 rounded-md text-[9px] font-bold text-text-secondary uppercase tracking-widest shadow-[0_1px_2px_rgba(0,0,0,0.015)]">{f}</span>
                    ))}
                  </div>
                  <input type="file" accept=".csv,.xlsx,.json,.pdf" onChange={handleFileUpload} ref={fileInputRef} className="hidden" />
                  <button className="primary-action text-xs font-semibold px-6 py-2.5 rounded-lg shadow-sm hover:shadow transition-all duration-300 cursor-pointer">
                    Select File
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Profile Selector */}
            <div className="flex flex-col justify-center relative z-10">
              <div className="surface-panel p-9 rounded-2xl relative overflow-hidden bevel-border bg-bg-surface/30 backdrop-blur-sm shadow-[0_8px_30px_rgba(0,0,0,0.02)]">
                <div className="absolute top-0 right-0 w-36 h-36 bg-accent-primary/5 rounded-full blur-3xl pointer-events-none" />
                <span className="editorial-label mb-2 block tracking-[0.22em] text-accent-secondary font-bold text-[10px]">Analysis Focus</span>
                <p className="text-[15px] text-text-secondary/90 mb-6 leading-[1.6] font-medium">
                  Choose a target domain framework. InsightFlow will adjust its metric checks and AI observations to align with your choice.
                </p>

                <div className="space-y-3">
                  {PROFILES.map(p => {
                    const active = selectedProfile === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => { setSelectedProfile(p.id); updateSettings({ defaultProfile: p.id }); }}
                        aria-pressed={active}
                        className={`w-full flex items-start gap-4 px-4.5 py-4.5 rounded-xl text-left transition-all border duration-200 cursor-pointer group/item
                          ${active 
                            ? 'bg-bg-surface border-accent-secondary/40 shadow-[0_4px_20px_rgba(79,70,229,0.08),0_0_0_1px_rgba(79,70,229,0.1)]' 
                            : 'bg-transparent border-transparent hover:bg-bg-surface hover:border-border-primary/80'}`}
                      >
                        <span className={`shrink-0 w-11 h-11 flex items-center justify-center rounded-xl bg-gradient-to-b from-bg-surface to-bg-secondary border border-border-primary/75 mt-0.5 transition-all duration-200 shadow-[0_1px_2.5px_rgba(0,0,0,0.02)]
                          ${active ? 'text-accent-secondary border-accent-secondary/25 bg-gradient-to-b from-accent-secondary/15 to-accent-secondary/5 scale-105' : 'text-text-muted group-hover/item:text-text-primary'}`}>
                          {React.cloneElement(p.icon as React.ReactElement, { size: 18 })}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-semibold tracking-tight transition-colors duration-150 ${active ? 'text-text-primary' : 'text-text-secondary group-hover/item:text-text-primary'}`}>{p.id}</div>
                          <div className={`text-[13.5px] mt-1.5 leading-[1.5] transition-colors duration-150 ${active ? 'text-text-secondary/85' : 'text-text-muted group-hover/item:text-text-secondary/90'}`}>{p.desc}</div>
                        </div>
                        {active && (
                          <div className="w-5 h-5 rounded-full bg-accent-secondary text-white shadow-[0_1.5px_3.5px_rgba(79,70,229,0.3)] flex items-center justify-center shrink-0 mt-0.5">
                            <Check size={11} className="stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── SHEET SELECTION ── */}
        {step === 'select-sheet' && analysis && (
          <motion.div
            key="select-sheet-step"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="max-w-xl mx-auto w-full relative z-10 flex items-center justify-center flex-1"
          >
            <div className="w-full command-panel p-6 bevel-border">
              <div className="pb-5 border-b border-border-primary/60 flex items-start gap-3.5">
                <div className="p-2 bg-accent-primary/10 rounded-lg text-accent-secondary">
                  <FileSpreadsheet size={18} />
                </div>
                <div>
                  <h2 className="font-bold text-sm text-text-primary">Multiple Worksheets Detected</h2>
                  <p className="text-[11px] text-text-muted mt-1">Select sheet from {analysis.fileName}</p>
                </div>
              </div>
              
              <div className="py-4 space-y-1.5 max-h-[300px] overflow-y-auto custom-scrollbar">
                {analysis.sheets.map((sheet, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => handleSheetSelection(sheet)} 
                    disabled={sheet.empty || isProcessing}
                    className={`w-full text-left flex items-center justify-between p-3.5 rounded-xl border border-transparent transition-all
                      ${sheet.empty 
                        ? 'opacity-40 cursor-not-allowed bg-transparent' 
                        : 'hover:bg-bg-elevated hover:border-border-primary/50 cursor-pointer bg-bg-secondary/20'}`}
                  >
                    <div>
                      <h3 className="text-xs font-bold text-text-primary">{sheet.name}</h3>
                      <p className="text-[10px] text-text-muted mt-0.5">{sheet.rows.toLocaleString()} rows</p>
                    </div>
                    <ChevronRight size={14} className="text-text-muted" />
                  </button>
                ))}
              </div>

              <div className="pt-4 border-t border-border-primary/60 flex gap-3">
                <button onClick={() => setStep('upload')} className="quiet-action text-xs flex-1">Back</button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── SUMMARY ── */}
        {step === 'summary' && analysis && processedResult && (
          <motion.div
            key="summary-step"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="max-w-5xl mx-auto w-full relative z-10 flex flex-col flex-1"
          >
            {/* Header */}
            <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-border-primary/50 pb-8">
              <div>
                <span className="editorial-label text-accent-secondary mb-2 block tracking-widest">Ingest Complete</span>
                <h1 className="text-2xl font-black tracking-tight text-text-primary font-display">{analysis.fileName}</h1>
                <p className="text-sm text-text-muted mt-2">
                  Parsed {processedResult.stats.cleanedRows.toLocaleString()} valid rows across {processedResult.stats.totalColumns} dimensions.
                </p>
              </div>
              <button onClick={handleFinalizeImport} className="primary-action text-xs font-semibold px-6 py-3 rounded-lg flex items-center gap-2 border border-white/10 shadow-[0_1px_2px_rgba(255,255,255,0.1)_inset]">
                Launch Workspace <ArrowRight size={14} />
              </button>
            </div>

            {/* Ingestion Info Grid */}
            <div className="grid md:grid-cols-[1fr_340px] gap-10 items-start">
              <div className="space-y-8">
                {/* AI Detection Card */}
                {detectedDomain && (
                  <div className="surface-panel p-6 rounded-2xl relative overflow-hidden bevel-border">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-success/5 rounded-full blur-xl pointer-events-none" />
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-success/10 rounded-xl text-success shrink-0 mt-0.5">
                        <Sparkles size={16} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="editorial-label text-[9px] text-text-muted font-bold tracking-wider">AI Classification</span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 bg-success/15 text-success rounded-md">{detectedDomain.confidence}% confidence</span>
                        </div>
                        <h4 className="text-sm font-semibold text-text-primary mt-1">{detectedDomain.type}</h4>
                        <p className="text-[11px] text-text-muted mt-1.5 leading-relaxed">
                          {detectedDomain.reason}. Mapped keywords: <span className="font-mono text-text-secondary">{detectedDomain.example}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Health and Quality Assessment */}
                <div className="surface-panel p-6 rounded-2xl bevel-border">
                  <span className="editorial-label mb-5 block tracking-[0.1em] text-text-muted font-bold">Quality Observations</span>
                  
                  <div className="grid sm:grid-cols-2 gap-8 py-2">
                    <div className="flex flex-col justify-between">
                      <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Dataset Health</span>
                      <div className="flex items-baseline gap-1 mt-2.5">
                        <span className="text-2xl font-black text-text-primary">{processedResult.stats.healthScore}</span>
                        <span className="text-xs text-text-muted">/100</span>
                      </div>
                      <div className="h-1.5 w-full bg-border-primary rounded-full mt-4 overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${processedResult.stats.healthScore >= 90 ? 'bg-success' : processedResult.stats.healthScore >= 70 ? 'bg-warning' : 'bg-danger'}`}
                          style={{ width: `${processedResult.stats.healthScore}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col justify-between">
                      <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Storage Metrics</span>
                      <div className="flex items-baseline gap-1 mt-2.5">
                        <span className="text-2xl font-black text-text-primary">{formatSize(analysis.fileSize)}</span>
                      </div>
                      <span className="text-[10px] text-text-muted mt-4">Raw size on storage media</span>
                    </div>
                  </div>

                  <div className="mt-6 space-y-2.5 border-t border-border-primary/50 pt-5">
                    {processedResult.stats.duplicatesRemoved > 0 && (
                      <div className="flex items-center gap-2.5 text-sm text-warning">
                        <AlertTriangle size={13} className="shrink-0" />
                        <span>Removed <strong>{processedResult.stats.duplicatesRemoved.toLocaleString()}</strong> identical duplicates.</span>
                      </div>
                    )}
                    {processedResult.stats.missingValuesHandled > 0 && (
                      <div className="flex items-center gap-2.5 text-sm text-warning">
                        <AlertTriangle size={13} className="shrink-0" />
                        <span>Imputed <strong>{processedResult.stats.missingValuesHandled.toLocaleString()}</strong> missing values using category modes.</span>
                      </div>
                    )}
                    {processedResult.stats.invalidDates > 0 && (
                      <div className="flex items-center gap-2.5 text-sm text-danger">
                        <AlertTriangle size={13} className="shrink-0" />
                        <span>Fixed <strong>{processedResult.stats.invalidDates}</strong> malformed date stamps.</span>
                      </div>
                    )}
                    {processedResult.stats.invalidNumbers > 0 && (
                      <div className="flex items-center gap-2.5 text-sm text-danger">
                        <AlertTriangle size={13} className="shrink-0" />
                        <span>Corrected <strong>{processedResult.stats.invalidNumbers}</strong> structural number fields.</span>
                      </div>
                    )}
                    {processedResult.stats.healthScore === 100 && (
                      <div className="flex items-center gap-2.5 text-sm text-success">
                        <Check size={13} className="shrink-0" />
                        <span>All rows conform to schema. Zero anomalies detected.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Sidebar stats panel */}
              <div className="space-y-8 pl-0 md:pl-4">
                <div>
                  <span className="editorial-label mb-3 block tracking-[0.1em] text-text-muted font-bold">Metrics Sheet</span>
                  <div className="space-y-0.5 border-t border-border-primary/50 pt-2">
                    <div className="metric-line">
                      <span className="text-sm text-text-secondary">Total Rows</span>
                      <span className="text-sm font-mono font-semibold text-text-primary">{processedResult.stats.totalRows.toLocaleString()}</span>
                    </div>
                    <div className="metric-line">
                      <span className="text-sm text-text-secondary">Cleaned Rows</span>
                      <span className="text-sm font-mono font-semibold text-text-primary">{processedResult.stats.cleanedRows.toLocaleString()}</span>
                    </div>
                    <div className="metric-line">
                      <span className="text-sm text-text-secondary">Total Columns</span>
                      <span className="text-sm font-mono font-semibold text-text-primary">{processedResult.stats.totalColumns}</span>
                    </div>
                    <div className="metric-line">
                      <span className="text-sm text-text-secondary">Audit Profile</span>
                      <span className="text-sm font-bold text-accent-secondary">{selectedProfile}</span>
                    </div>
                  </div>
                </div>

                {/* Mapped Fields */}
                <div className="border-t border-border-primary/50 pt-6">
                  <span className="editorial-label mb-3 block tracking-[0.1em] text-text-muted font-bold">Schema Map</span>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {processedResult.stats.detectedFields.map(field => (
                      <span key={field} className="px-2.5 py-1 bg-bg-secondary border border-border-primary rounded-md text-[10px] font-mono text-text-secondary">
                        {field}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="text-center pt-4">
                  <button 
                    onClick={() => setStep('upload')} 
                    className="text-[11px] text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
                  >
                    Upload another dataset
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
