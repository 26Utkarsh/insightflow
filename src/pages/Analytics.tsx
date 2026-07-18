import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity, BarChart3, CheckCircle2, Database, Download,
  Info, RefreshCcw, SearchX, Sparkles, Target, TrendingUp, UploadCloud, X
} from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, LabelList, Legend, Line, Pie, PieChart,
  Tooltip as RechartsTooltip, ResponsiveContainer, XAxis, YAxis
} from 'recharts';
import { toast } from 'sonner';
import AiCopilot from '../components/analytics/AiCopilot';
import AiExplainDrawer from '../components/analytics/AiExplainDrawer';
import AiInsightCenter from '../components/analytics/AiInsightCenter';
import AnalyticsTable from '../components/analytics/AnalyticsTable';
import FilterBar, { FilterState } from '../components/analytics/FilterBar';
import PerformanceTable from '../components/analytics/PerformanceTable';
import { ErrorBoundary } from "../components/ErrorBoundary";
import { generateInsights, generateMetrics } from '../data';
import { useAppStore } from '../store';

const TooltipInfo = React.memo(({ text }: { text: string }) => (
  <div className="group relative inline-flex items-center justify-center ml-1">
    <Info size={11} className="text-text-muted hover:text-text-secondary cursor-help transition-colors" />
    <div className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-44 p-2 bg-bg-elevated border border-border-primary rounded-lg text-[10px] text-text-primary shadow-premium-xl z-50 text-center leading-normal">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-border-primary" />
    </div>
  </div>
));

const ExportMenu = React.memo(({ isExporting, onExport }: { isExporting: boolean, onExport: (format: 'pdf' | 'docx' | 'png' | 'print' | 'csv' | 'excel' | 'json') => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="relative print:hidden">
      <button onClick={() => setIsOpen(!isOpen)} disabled={isExporting}
        className="quiet-action text-xs disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 flex items-center gap-1.5 border border-border-primary rounded-lg">
        <Download size={13} className={isExporting ? 'animate-spin' : ''} />
        {isExporting ? 'Exporting...' : 'Export Briefing'}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, y: 4, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 4, scale: 0.97 }} transition={{ duration: 0.15 }}
            className="absolute right-0 mt-1.5 w-52 bg-bg-elevated border border-border-primary rounded-xl shadow-premium-xl z-50 overflow-hidden">
            <div className="p-1.5 space-y-0.5">
              <div className="px-3 py-1.5 editorial-label text-[9px]">Reports</div>
              {[
                { fmt: 'pdf' as const, label: 'Executive PDF', short: 'PDF' },
                { fmt: 'docx' as const, label: 'Word Document', short: 'DOC' },
              ].map(item => (
                <button key={item.fmt} onClick={() => { setIsOpen(false); onExport(item.fmt); }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-bg-surface transition-colors rounded-lg text-text-secondary hover:text-text-primary font-medium flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-border-primary/30 flex items-center justify-center text-[10px] font-bold">{item.short}</span>
                  {item.label}
                </button>
              ))}
              <div className="h-px bg-border-primary my-1" />
              <div className="px-3 py-1.5 editorial-label text-[9px]">Raw Data</div>
              {[
                { fmt: 'excel' as const, label: 'Excel Spreadsheet', short: 'XLS' },
                { fmt: 'csv' as const, label: 'Flat CSV File', short: 'CSV' },
                { fmt: 'json' as const, label: 'JSON Document', short: '{}' },
              ].map(item => (
                <button key={item.fmt} onClick={() => { setIsOpen(false); onExport(item.fmt); }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-bg-surface transition-colors rounded-lg text-text-secondary hover:text-text-primary font-medium flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-border-primary/30 flex items-center justify-center text-[10px] font-mono">{item.short}</span>
                  {item.label}
                </button>
              ))}
              <div className="h-px bg-border-primary my-1" />
              {[
                { fmt: 'png' as const, label: 'Screenshot PNG', short: 'PNG' },
                { fmt: 'print' as const, label: 'Print Layout', short: 'PRN' },
              ].map(item => (
                <button key={item.fmt} onClick={() => { setIsOpen(false); onExport(item.fmt); }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-bg-surface transition-colors rounded-lg text-text-secondary hover:text-text-primary font-medium flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-border-primary/30 flex items-center justify-center text-[10px] font-bold">{item.short}</span>
                  {item.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {isOpen && <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />}
    </div>
  );
});

const ReportPreviewModal = React.memo(({ isOpen, onClose, metrics, dataset, onExport }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100] flex items-center justify-center p-4 md:p-8 print:hidden">
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-bg-surface w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl border border-border-primary flex flex-col overflow-hidden">
        <div className="p-5 border-b border-border-primary flex justify-between items-center bg-bg-secondary/40">
          <div>
            <h2 className="font-bold text-sm text-text-primary">Executive Report Preview</h2>
            <p className="text-[10px] text-text-muted mt-0.5">{dataset.name}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => onExport('pdf')} className="primary-action text-xs px-4 py-2 font-semibold"><Download size={13} /> Download PDF</button>
            <button onClick={onClose} className="p-2 text-text-muted hover:bg-bg-secondary rounded-lg transition-colors border border-transparent hover:border-border-primary"><X size={16} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-12 bg-white text-gray-900 custom-scrollbar" id="report-preview-content">
          <div className="max-w-4xl mx-auto space-y-10">
            <header className="border-b-2 border-gray-900 pb-6">
              <h1 className="text-3xl font-extrabold uppercase tracking-tight text-gray-900 mb-2">Executive briefing report</h1>
              <div className="flex justify-between items-end">
                <p className="text-sm text-gray-600 font-medium">{dataset.name}</p>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{new Date().toLocaleDateString()}</p>
              </div>
            </header>
            
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Revenue', value: `$${metrics.totalRevenue.toLocaleString()}` },
                { label: 'Total Profit', value: `$${metrics.totalProfit.toLocaleString()}` },
                { label: 'Total Orders', value: metrics.totalOrders.toLocaleString() },
                { label: 'Avg Order Value', value: `$${metrics.averageOrderValue.toLocaleString()}` },
              ].map(m => (
                <div key={m.label} className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                  <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">{m.label}</p>
                  <p className="text-lg font-black text-gray-900 font-mono">{m.value}</p>
                </div>
              ))}
            </section>
          </div>
        </div>
      </motion.div>
    </div>
  );
});

function AnalyticsContent() {
  const activeDataset = useAppStore(state => state.activeDataset);
  const settings = useAppStore(state => state.settings);
  const [explainDrawer, setExplainDrawer] = useState<{ isOpen: boolean; title: string; type: 'chart' | 'row'; data?: any }>({ isOpen: false, title: '', type: 'chart' });
  const [filters, setFilters] = useState<FilterState>({ category: '', region: '', product: '', customer: '' });
  const [isExporting, setIsExporting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const filteredData = useMemo(() => {
    if (!activeDataset?.data) return [];
    return activeDataset.data.filter(row => {
      let pass = true;
      if (filters.category && row.category !== filters.category) pass = false;
      if (filters.region && row.region !== filters.region) pass = false;
      if (filters.product && row.product_name !== filters.product) pass = false;
      if (filters.customer && row.customer_name !== filters.customer) pass = false;
      return pass;
    });
  }, [activeDataset, filters]);

  const metrics = useMemo(() => generateMetrics(filteredData), [filteredData]);
  const insights = useMemo(() => generateInsights(filteredData), [filteredData]);
  const stats = activeDataset?.stats || { totalRows: 0, totalColumns: 0, healthScore: 0, memoryUsage: 0, columnStats: {} };

  const { hasDate, hasRevenue, revenueByMonth, categoryRevenue, regionRevenue, productRevenue, customerRevenue } = useMemo(() => {
    let hasD = false, hasR = false;
    const monthMap = new Map<string, { revenue: number; profit: number }>();
    const catMap = new Map<string, { revenue: number; profit: number }>();
    const regMap = new Map<string, { revenue: number; profit: number }>();
    const prodMap = new Map<string, { revenue: number; profit: number; orders: Set<string>; quantity: number }>();
    const custMap = new Map<string, { revenue: number; orders: Set<string> }>();

    filteredData.forEach(row => {
      if (row.order_date) hasD = true;
      if (row.total_sales !== undefined) hasR = true;
      const rev = row.total_sales || 0, prof = row.profit || 0;
      if (row.order_date) { 
        const d = new Date(row.order_date); 
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; 
        const c = monthMap.get(k) || { revenue: 0, profit: 0 }; 
        monthMap.set(k, { revenue: c.revenue + rev, profit: c.profit + prof }); 
      }
      if (row.category) { const c = catMap.get(row.category) || { revenue: 0, profit: 0 }; catMap.set(row.category, { revenue: c.revenue + rev, profit: c.profit + prof }); }
      if (row.region) { const c = regMap.get(row.region) || { revenue: 0, profit: 0 }; regMap.set(row.region, { revenue: c.revenue + rev, profit: c.profit + prof }); }
      if (row.product_name) { 
        const c = prodMap.get(row.product_name) || { revenue: 0, profit: 0, orders: new Set(), quantity: 0 }; 
        if (row.order_id) c.orders.add(row.order_id); 
        prodMap.set(row.product_name, { revenue: c.revenue + rev, profit: c.profit + prof, orders: c.orders, quantity: c.quantity + (row.quantity || 1) }); 
      }
      if (row.customer_name) { 
        const c = custMap.get(row.customer_name) || { revenue: 0, orders: new Set() }; 
        if (row.order_id) c.orders.add(row.order_id); 
        custMap.set(row.customer_name, { revenue: c.revenue + rev, orders: c.orders }); 
      }
    });

    const monthArr = Array.from(monthMap.entries()).map(([k, v]) => { 
      const [yy, mm] = k.split('-'); 
      const mName = new Date(parseInt(yy), parseInt(mm) - 1, 1).toLocaleString('default', { month: 'short' }); 
      return { date: k, displayDate: `${mName} ${yy}`, ...v }; 
    }).sort((a, b) => a.date.localeCompare(b.date));
    
    return {
      hasDate: hasD, hasRevenue: hasR, revenueByMonth: monthArr,
      categoryRevenue: Array.from(catMap.entries()).map(([name, val]) => ({ name, ...val })).sort((a, b) => b.revenue - a.revenue),
      regionRevenue: Array.from(regMap.entries()).map(([name, val]) => ({ name, value: val.revenue })).sort((a, b) => b.value - a.value),
      productRevenue: Array.from(prodMap.entries()).map(([name, val]) => ({ name, revenue: val.revenue, profit: val.profit, ordersCount: val.orders.size, quantity: val.quantity })).sort((a, b) => b.revenue - a.revenue),
      customerRevenue: Array.from(custMap.entries()).map(([name, val]) => ({ name, revenue: val.revenue, ordersCount: val.orders.size })).sort((a, b) => b.revenue - a.revenue),
    };
  }, [filteredData]);

  const handleCloseDrawer = useCallback(() => setExplainDrawer(prev => ({ ...prev, isOpen: false })), []);
  const handleClosePreview = useCallback(() => setPreviewOpen(false), []);

  const handleExport = useCallback(async (format: 'pdf' | 'docx' | 'png' | 'print' | 'csv' | 'excel' | 'json') => {
    setIsExporting(true);
    try {
      const { exportToPNG, printDashboard, exportToDOCX, exportToCSV, exportToExcel, exportToJSON } = await import('../lib/exportUtils');
      if (format === 'csv') await exportToCSV(filteredData, activeDataset?.name || 'export');
      else if (format === 'excel') await exportToExcel(filteredData, activeDataset?.name || 'export');
      else if (format === 'json') exportToJSON(activeDataset, activeDataset?.name || 'export');
      else if (format === 'print') printDashboard();
      else if (format === 'pdf') setPreviewOpen(true);
      else if (format === 'docx' && activeDataset) { 
        await exportToDOCX(activeDataset, metrics.totalRevenue, metrics.averageOrderValue); 
        toast.success('DOCX report downloaded.'); 
      }
      else if (format === 'png') await exportToPNG('dashboard-content', activeDataset?.name || 'dashboard_export', document.documentElement.classList.contains('dark'));
      toast.success(`${format.toUpperCase()} export completed.`);
    } catch (e) { 
      console.error(e); 
      toast.error('Export failed'); 
    } finally { 
      setIsExporting(false); 
    }
  }, [filteredData, activeDataset, metrics]);

  const handlePdfPreviewExport = useCallback(async () => {
    const el = document.getElementById('report-preview-content');
    if (!el || !activeDataset) return;
    setIsExporting(true); toast.loading('Generating PDF...');
    try { 
      const { exportToPDF } = await import('../lib/exportUtils'); 
      await exportToPDF(activeDataset, metrics.totalRevenue, metrics.averageOrderValue); 
      toast.dismiss(); 
      toast.success('Report downloaded!'); 
      setPreviewOpen(false); 
    } catch { 
      toast.dismiss(); 
      toast.error('Failed to generate PDF'); 
    } finally { 
      setIsExporting(false); 
    }
  }, [activeDataset, metrics]);

  if (!activeDataset) {
    return (
      <div className="flex-1 flex items-center justify-center bg-bg-primary h-full min-h-[500px] p-6">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center text-center max-w-sm w-full surface-panel rounded-xl p-10">
          <Database size={32} className="text-text-muted mb-4" />
          <h2 className="text-lg font-bold tracking-tight text-text-primary mb-2">No Dataset Active</h2>
          <p className="text-xs text-text-secondary mb-6 leading-relaxed">Upload a dataset to view analytics. Supports CSV, Excel, and JSON.</p>
          <button onClick={() => window.location.href = '/'} className="primary-action text-sm"><UploadCloud size={14} /> Upload Dataset</button>
        </motion.div>
      </div>
    );
  }

  const COLORS = ['var(--chart-0)', 'var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)', 'var(--chart-7)'];
  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
  const formatTooltipCurrency = (value: unknown) => formatCurrency(Number(value || 0));

  return (
    <div className="flex-1 w-full overflow-y-auto bg-bg-primary text-text-primary print:bg-white print:text-black relative custom-scrollbar">
      <AnimatePresence>
        {isExporting && !previewOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-bg-primary/90 backdrop-blur-md flex flex-col items-center justify-center">
            <div className="surface-panel rounded-xl p-8 flex flex-col items-center text-center max-w-xs">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }} className="w-8 h-8 rounded-full border-2 border-accent-primary border-t-transparent mb-4" />
              <h3 className="text-sm font-bold tracking-tight text-text-primary mb-1">Generating Export</h3>
              <p className="text-xs text-text-muted">Analyzing dimensions...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="px-6 lg:px-12 pt-8 pb-5 print:pt-4 print:pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 max-w-7xl mx-auto w-full">
        <div>
          <span className="editorial-label text-accent-secondary mb-2 block tracking-widest">Business Intelligence Workspace</span>
          <h1 className="text-3xl font-black tracking-tight text-text-primary font-display flex items-baseline gap-3">
            {activeDataset.name}
            <span className="text-xs font-mono text-text-muted font-normal uppercase">{filteredData.length.toLocaleString()} rows</span>
          </h1>
        </div>
        <ExportMenu isExporting={isExporting} onExport={handleExport} />
      </header>

      {/* Filters Bar */}
      <FilterBar data={activeDataset.data} filters={filters} setFilters={setFilters} filteredCount={filteredData.length} totalCount={activeDataset.data.length} />

      {filteredData.length === 0 ? (
        <div className="flex-1 flex items-center justify-center bg-bg-primary h-full min-h-[400px] p-6">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center text-center max-w-sm w-full surface-panel rounded-xl p-10 bg-bg-secondary/20">
            {(!activeDataset.data || activeDataset.data.length === 0) ? <Database size={28} className="text-text-muted mb-4" /> : <SearchX size={28} className="text-text-muted mb-4" />}
            <h2 className="text-sm font-bold tracking-tight text-text-primary mb-1.5">
              {(!activeDataset.data || activeDataset.data.length === 0) ? "Empty Dataset" : "No Matching Records"}
            </h2>
            <p className="text-xs text-text-muted mb-6 leading-relaxed">
              {(!activeDataset.data || activeDataset.data.length === 0) ? "This dataset contains no records." : "Your current filters yielded no results. Try modifying category or region values."}
            </p>
            {(!activeDataset.data || activeDataset.data.length === 0) ? (
              <button onClick={() => window.location.href = '/'} className="primary-action text-xs"><UploadCloud size={13} /> Upload Dataset</button>
            ) : (
              <button onClick={() => setFilters({ category: '', region: '', product: '', customer: '' })} className="quiet-action text-xs font-semibold"><RefreshCcw size={13} /> Clear Filters</button>
            )}
          </motion.div>
        </div>
      ) : (
        <main id="dashboard-content" className="px-6 lg:px-12 py-6 print:p-0 max-w-7xl mx-auto w-full">
          <div className="flex flex-col gap-8 print:gap-10">

            {/* AI BRIEFING & KPI INTEGRATED HUB */}
            <div className="grid lg:grid-cols-[1fr_320px] gap-8">
              {/* Left: Storytelling AI Narrative */}
              <div className="surface-panel rounded-2xl overflow-hidden min-h-[420px]">
                <AiInsightCenter insights={insights} />
              </div>

              {/* Right: Integrated Metrics & Profiling */}
              <div className="space-y-8 pl-0 lg:pl-4">
                {/* KPI Briefing */}
                <div>
                  <span className="editorial-label text-text-muted block tracking-wider text-[10px]">KPI Briefing</span>
                  
                  <div className="mt-4 space-y-5 border-t border-border-primary/50 pt-4">
                    {[
                      { label: 'Total Revenue', value: formatCurrency(metrics.totalRevenue), tip: 'Sum of revenue across all filtered records.' },
                      { label: 'Total Profit', value: formatCurrency(metrics.totalProfit), tip: 'Net profit calculated for available rows.' },
                      { label: 'Total Orders', value: metrics.totalOrders.toLocaleString(), tip: 'Unique orders parsed.' },
                      { label: 'Avg Order Value', value: formatCurrency(metrics.averageOrderValue), tip: 'Average ticket price of filtered orders.' },
                    ].map(kpi => (
                      <div key={kpi.label} className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1 select-none">
                          {kpi.label}
                          <TooltipInfo text={kpi.tip} />
                        </span>
                        <span className="text-2xl font-black tracking-tight text-text-primary font-mono">{kpi.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quality dials */}
                <div className="border-t border-border-primary/50 pt-6">
                  <span className="editorial-label text-text-muted block tracking-wider text-[10px]">Dataset Integrity</span>
                  
                  <div className="mt-4 space-y-1">
                    <div className="metric-line">
                      <span className="text-sm text-text-secondary">Health Index</span>
                      <span className={`text-sm font-mono font-bold flex items-center gap-1 ${stats.healthScore >= 90 ? 'text-success' : 'text-warning'}`}>
                        {stats.healthScore}/100
                      </span>
                    </div>
                    <div className="metric-line">
                      <span className="text-sm text-text-secondary">Imputed Values</span>
                      <span className="text-sm font-mono font-semibold text-text-primary">{(stats as any).missingValuesHandled || 0}</span>
                    </div>
                    <div className="metric-line">
                      <span className="text-sm text-text-secondary">Cleaned Rows</span>
                      <span className="text-sm font-mono font-semibold text-text-primary">{(stats as any).cleanedRows?.toLocaleString() || stats.totalRows.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* AI COPILOT */}
            <AiCopilot />

            {/* CHART: TREND */}
            {hasDate && revenueByMonth.length > 0 && (
              <section className="flex flex-col gap-4 print:break-inside-avoid">
                <div className="flex justify-between items-center border-b border-border-primary/50 pb-3">
                  <div className="flex items-center gap-3">
                    <h2 className="text-base font-bold tracking-tight text-text-primary">Revenue & Profit Trends</h2>
                    <button onClick={() => setExplainDrawer({ isOpen: true, title: 'Revenue Trend Analysis', type: 'chart' })}
                      className="text-[10px] font-bold text-accent-secondary hover:underline flex items-center gap-1 print:hidden uppercase tracking-wider">
                      <Sparkles size={12} /> Explain Trend
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-text-muted">
                    <span>{revenueByMonth.length} months</span>
                    {revenueByMonth.length > 1 && (
                      <span className="text-success flex items-center gap-0.5 font-bold">
                        <TrendingUp size={11} />
                        +{((revenueByMonth[revenueByMonth.length - 1]?.revenue - revenueByMonth[0]?.revenue) / revenueByMonth[0]?.revenue * 100).toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="w-full h-[360px] surface-panel rounded-2xl p-6" id="chart-trend">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={revenueByMonth} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS[0]} stopOpacity={0.25} />
                          <stop offset="95%" stopColor={COLORS[0]} stopOpacity={0.01} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-primary)" strokeOpacity={0.4} />
                      <XAxis dataKey="displayDate" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} dy={8} />
                      <YAxis yAxisId="left" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `$${(Number(val) / 1000)}k`} dx={-8} />
                      {metrics.totalProfit > 0 && <YAxis yAxisId="right" orientation="right" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `$${(Number(val) / 1000)}k`} dx={8} />}
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', color: 'var(--text-primary)', padding: '10px', fontSize: '11px' }} 
                        formatter={(value, name) => [formatTooltipCurrency(value), String(name)]} 
                      />
                      <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', color: 'var(--text-secondary)' }} />
                      <Area yAxisId="left" type="monotone" name="Revenue" dataKey="revenue" stroke={COLORS[0]} strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" activeDot={{ r: 5, fill: COLORS[0], stroke: 'var(--bg-surface)', strokeWidth: 2 }} />
                      {metrics.totalProfit > 0 && <Line yAxisId="right" type="monotone" name="Profit" dataKey="profit" stroke={COLORS[1]} strokeWidth={2} dot={false} activeDot={{ r: 5, fill: COLORS[1], stroke: 'var(--bg-surface)', strokeWidth: 2 }} />}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </section>
            )}

            {/* CATEGORY & REGION PIECES */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 print:break-inside-avoid">
              {categoryRevenue.length > 0 && (
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center border-b border-border-primary/50 pb-3">
                    <h2 className="text-base font-bold tracking-tight text-text-primary flex items-center gap-2"><Target size={15} className="text-accent-secondary" /> Mapped Categories</h2>
                    <span className="text-xs text-text-muted uppercase tracking-wider">{categoryRevenue.length} Categories</span>
                  </div>
                  <div className="w-full h-[300px] surface-panel rounded-2xl p-5" id="chart-category">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={categoryRevenue} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="revenue" stroke="var(--bg-surface)" strokeWidth={3}
                          labelLine={false} label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}>
                          {categoryRevenue.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <RechartsTooltip contentStyle={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', borderRadius: '12px', color: 'var(--text-primary)', padding: '10px', fontSize: '11px' }} formatter={(value) => formatTooltipCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
              
              {regionRevenue.length > 0 && (
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center border-b border-border-primary/50 pb-3">
                    <h2 className="text-base font-bold tracking-tight text-text-primary flex items-center gap-2"><BarChart3 size={15} className="text-accent-secondary" /> Region Breakdowns</h2>
                    <span className="text-xs text-text-muted uppercase tracking-wider">{regionRevenue.length} Regions</span>
                  </div>
                  <div className="w-full h-[300px] surface-panel rounded-2xl p-5" id="chart-region">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart layout="vertical" data={regionRevenue} margin={{ top: 10, right: 30, left: 60, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical stroke="var(--border-primary)" strokeOpacity={0.4} />
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                        <RechartsTooltip cursor={{ fill: 'var(--bg-secondary)', opacity: 0.15 }} contentStyle={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', borderRadius: '12px', color: 'var(--text-primary)', padding: '10px', fontSize: '11px' }} formatter={(value) => formatTooltipCurrency(value)} />
                        <Bar dataKey="value" fill={COLORS[0]} radius={[0, 4, 4, 0] as any} barSize={16} background={{ fill: "var(--bg-secondary)", radius: [0, 4, 4, 0] as any, opacity: 0.2 }}>
                          {regionRevenue.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          <LabelList dataKey="value" position="right" formatter={(value) => formatTooltipCurrency(value)} fill="var(--text-secondary)" fontSize={10} offset={8} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </section>

            {/* PERFORMANCE ANALYSIS TABLES */}
            <section className="grid grid-cols-1 gap-8 print:break-inside-avoid">
              {productRevenue.length > 0 && <PerformanceTable title="Product Performance" subtitle="Ranking based on total sales volume" data={productRevenue} totalRevenue={metrics.totalRevenue} nameLabel="Product" />}
              {categoryRevenue.length > 0 && <PerformanceTable title="Category Performance" subtitle="Ranking based on sector margin margins" data={categoryRevenue} totalRevenue={metrics.totalRevenue} nameLabel="Category" />}
            </section>

            {/* TRANSACTION REVIEW DETAIL */}
            <section className="print:break-inside-avoid">
              <div className="mb-4 border-b border-border-primary/50 pb-3">
                <h2 className="text-base font-bold tracking-tight text-text-primary flex items-center gap-2"><Activity size={15} className="text-accent-secondary" /> Transaction Review</h2>
                <p className="text-sm text-text-muted mt-1">Audit ledger with granular row-level data and anomaly flags.</p>
              </div>
              <AnalyticsTable data={filteredData} />
            </section>
          </div>
        </main>
      )}

      <ReportPreviewModal isOpen={previewOpen} onClose={handleClosePreview} metrics={metrics} dataset={activeDataset} onExport={handlePdfPreviewExport} />
      <AiExplainDrawer isOpen={explainDrawer.isOpen} onClose={handleCloseDrawer} title={explainDrawer.title} type={explainDrawer.type} data={explainDrawer.data} />
    </div>
  );
}

export default function Analytics() {
  return (<ErrorBoundary><AnalyticsContent /></ErrorBoundary>);
}
