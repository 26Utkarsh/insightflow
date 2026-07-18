import { AnimatePresence, motion } from 'framer-motion';
import {
    AlertTriangle,
    CheckCircle2,
    ChevronDown,
    Minus, ShieldAlert,
    Sparkles,
    TrendingDown, TrendingUp
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store';
import { Insight } from '../../types';

interface AiInsightCenterProps { insights?: Insight[]; }

/* ── Expandable Panel ── */
function ExpandPanel({ label, children, defaultOpen = false }: { label: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border-primary last:border-b-0">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-5 px-1 text-left group cursor-pointer">
        <span className="text-[15px] font-bold text-text-primary group-hover:text-accent-secondary transition-colors">{label}</span>
        <ChevronDown size={15} className={`text-text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }} className="overflow-hidden">
            <div className="pb-6 px-1 text-[15px] text-text-secondary leading-relaxed">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Confidence Badge ── */
function ConfidenceBadge({ level }: { level?: string }) {
  if (!level) return null;
  const map: Record<string, string> = {
    High: 'bg-success/10 text-success border-success/20',
    Medium: 'bg-warning/10 text-warning border-warning/20',
    Low: 'bg-text-muted/10 text-text-muted border-text-muted/20',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded border ${map[level] || map.Medium}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />{level} Confidence
    </span>
  );
}

/* ── Trend Icon ── */
function TrendIcon({ trend }: { trend?: string }) {
  const cls = trend === 'positive' ? 'text-success' : trend === 'negative' ? 'text-danger' : 'text-text-muted';
  const Icon = trend === 'positive' ? TrendingUp : trend === 'negative' ? TrendingDown : Minus;
  return <Icon size={14} className={cls} />;
}

/* ── Risk meter ── */
function RiskMeter({ score }: { score: number }) {
  const color = score > 70 ? 'text-danger' : score > 30 ? 'text-warning' : 'text-success';
  const barColor = score > 70 ? 'bg-danger' : score > 30 ? 'bg-warning' : 'bg-success';
  return (
    <div className="flex items-end gap-3">
      <span className={`text-4xl font-black tracking-tight ${color}`}>{score}</span>
      <div className="flex-1 mb-2">
        <div className="h-1.5 bg-border-primary rounded-full overflow-hidden">
          <motion.div className={`h-full ${barColor} rounded-full`} initial={{ width: 0 }} animate={{ width: `${score}%` }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} />
        </div>
        <span className="text-[10px] text-text-muted mt-1 block">/ 100 risk score</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ */
/* MAIN COMPONENT                          */
/* ═══════════════════════════════════════ */

const AiInsightCenter = React.memo(function AiInsightCenter({ insights: _fallbackInsights = [] }: AiInsightCenterProps) {
  const [activeSection, setActiveSection] = useState<'briefing' | 'insights' | 'risk' | 'actions'>('briefing');
  const settings = useAppStore(state => state.settings);
  const activeDataset = useAppStore(state => state.activeDataset);

  const [aiReport, setAiReport] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (activeDataset) {
      setIsLoading(true);
      fetch('/api/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: settings.defaultProfile, metrics: activeDataset.stats.metrics, context: activeDataset.stats.detectedFields })
      })
        .then(res => res.json())
        .then(resData => { setAiReport(resData.report || null); })
        .catch(() => { setAiReport(null); })
        .finally(() => setIsLoading(false));
    }
  }, [activeDataset, settings.defaultProfile]);

  /* ── Skeleton ── */
  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-bg-surface">
        <div className="p-8 border-b border-border-primary">
          <div className="h-3 bg-border-primary/30 rounded w-24 mb-4 skeleton" />
          <div className="h-8 bg-border-primary/30 rounded w-3/4 mb-3 skeleton" />
          <div className="h-4 bg-border-primary/20 rounded w-1/2 skeleton" />
        </div>
        <div className="flex-1 p-8 space-y-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="space-y-2">
              <div className="h-3 bg-border-primary/20 rounded w-full skeleton" />
              <div className="h-3 bg-border-primary/20 rounded w-4/5 skeleton" />
              <div className="h-3 bg-border-primary/15 rounded w-3/5 skeleton" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── No report ── */
  if (!aiReport) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-center">
        <Sparkles size={28} className="text-text-muted mb-4" />
        <p className="text-sm font-semibold text-text-primary mb-1">No Analysis Available</p>
        <p className="text-xs text-text-muted max-w-xs">Upload a dataset to generate an executive briefing.</p>
      </div>
    );
  }

  const sections = [
    { id: 'briefing' as const, label: 'Briefing' },
    { id: 'insights' as const, label: 'Insights' },
    { id: 'risk' as const, label: 'Risk & Audit' },
    { id: 'actions' as const, label: 'Actions' },
  ];

  return (
    <div className="flex flex-col h-full bg-bg-surface">
      {/* Header: the single most important insight */}
      <div className="px-8 pt-8 pb-6 border-b border-border-primary">
        <div className="flex items-center gap-2 mb-4">
          <span className="editorial-label">AI Briefing</span>
          <ConfidenceBadge level={aiReport.confidence?.level} />
          <span className="ml-auto text-[10px] font-mono text-text-muted">{aiReport.model || settings.aiModel || 'AI'}</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-gradient font-display leading-snug max-w-3xl">
          {aiReport.executiveSummary?.split('.')[0] || 'Analysis Complete'}
        </h2>
        <p className="text-[15px] text-text-secondary mt-2.5 leading-relaxed max-w-2xl">
          {aiReport.executiveSummary?.split('.').slice(1).join('.').trim() || ''}
        </p>

        {/* Meta strip */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-6 border-t border-border-primary/50 pt-5 select-none">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-text-muted font-bold text-[10px] uppercase tracking-wider">Quality</span>
            <span className="font-bold text-success bg-success/5 border border-success/15 px-2 py-0.5 rounded text-[11px]">{aiReport.dataQuality || 'Excellent'}</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-text-muted font-bold text-[10px] uppercase tracking-wider">Depth</span>
            <span className="font-bold text-accent-primary bg-accent-primary/5 border border-accent-primary/15 px-2 py-0.5 rounded text-[11px]">{aiReport.analysisDepth || 'Comprehensive'}</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-text-muted font-bold text-[10px] uppercase tracking-wider">Coverage</span>
            <span className="font-bold text-text-primary bg-bg-secondary border border-border-primary/80 px-2 py-0.5 rounded text-[11px]">{aiReport.coverage || 'Full'}</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-text-muted font-bold text-[10px] uppercase tracking-wider">Insights</span>
            <span className="font-bold text-text-primary bg-bg-secondary border border-border-primary/80 px-2 py-0.5 rounded text-[11px]">{aiReport.insightsCount || aiReport.keyInsights?.length || 0}</span>
          </div>
        </div>
      </div>

      {/* Section nav */}
      <div className="flex border-b border-border-primary px-8 gap-1">
        {sections.map(s => (
          <button key={s.id} onClick={() => setActiveSection(s.id)}
            className={`relative py-3.5 px-4 text-[12px] font-bold uppercase tracking-widest transition-colors cursor-pointer ${activeSection === s.id ? 'text-text-primary font-extrabold' : 'text-text-muted hover:text-text-secondary'}`}>
            {s.label}
            {activeSection === s.id && <motion.div layoutId="ai-nav" className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-secondary" transition={{ type: 'spring', stiffness: 500, damping: 35 }} />}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar">
        <AnimatePresence mode="wait">

          {/* BRIEFING */}
          {activeSection === 'briefing' && (
            <motion.div key="briefing" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {/* Data story as expandable panels */}
              {aiReport.dataStory && (
                <div className="mb-8">
                  <span className="editorial-label mb-4 block">What the data says</span>
                  <div className="evidence-rail pl-6 space-y-0">
                    <ExpandPanel label="What happened" defaultOpen>
                      <p className="text-[15px] text-text-secondary leading-relaxed">{aiReport.dataStory.whatHappened}</p>
                    </ExpandPanel>
                    <ExpandPanel label="Why it happened">
                      <p className="text-[15px] text-text-secondary leading-relaxed">{aiReport.dataStory.whyItHappened}</p>
                    </ExpandPanel>
                    <ExpandPanel label="What's next">
                      <p className="text-[15px] text-text-secondary leading-relaxed">{aiReport.dataStory.whatNext}</p>
                    </ExpandPanel>
                  </div>
                </div>
              )}

              {/* Interesting findings */}
              {aiReport.interestingFindings?.length > 0 && (
                <div>
                  <span className="editorial-label mb-4 block">Notable Findings</span>
                  <div className="space-y-3">
                    {aiReport.interestingFindings.map((f: any, i: number) => (
                      <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                        className="flex gap-3.5 p-4 bg-bg-primary border border-border-primary rounded-xl">
                        <Sparkles size={16} className="text-accent-secondary shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[15px] font-bold text-text-primary">{f.finding}</p>
                          <p className="text-xs text-text-muted mt-1 leading-relaxed">{f.significance}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* INSIGHTS */}
          {activeSection === 'insights' && (
            <motion.div key="insights" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <span className="editorial-label mb-5 block">{aiReport.keyInsights?.length || 0} Key Insights</span>
              <div className="space-y-0">
                {aiReport.keyInsights?.map((insight: any, idx: number) => (
                  <ExpandPanel key={idx} label={insight.title} defaultOpen={idx === 0}>
                    <div className="flex items-start gap-3">
                      <TrendIcon trend={insight.trend} />
                      <div className="flex-1">
                        <p className="text-[15px] text-text-secondary leading-relaxed">{insight.description}</p>
                        {insight.metric && (
                          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-bg-primary border border-border-primary rounded font-mono text-[11px] text-text-muted">
                            <span className="w-1.5 h-1.5 rounded-full bg-accent-secondary" />{insight.metric}
                          </div>
                        )}
                      </div>
                    </div>
                  </ExpandPanel>
                ))}
              </div>
            </motion.div>
          )}

          {/* RISK & AUDIT */}
          {activeSection === 'risk' && (
            <motion.div key="risk" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {/* Risk score */}
              {aiReport.riskAnalysis && (
                <div className="mb-8">
                  <span className="editorial-label mb-4 block">Overall Risk Assessment</span>
                  <RiskMeter score={aiReport.riskAnalysis.overallScore || 0} />
                  {aiReport.riskAnalysis.anomalies?.length > 0 && (
                    <div className="mt-6">
                      <span className="text-xs font-bold text-text-primary flex items-center gap-2 mb-3">
                        <ShieldAlert size={14} className="text-warning" />
                        {aiReport.riskAnalysis.anomalies.length} Anomalies Detected
                      </span>
                      <div className="space-y-2">
                        {aiReport.riskAnalysis.anomalies.map((a: string, i: number) => (
                          <div key={i} className="flex items-start gap-2.5 text-xs text-text-secondary bg-bg-primary p-3.5 rounded-xl border border-border-primary">
                            <AlertTriangle size={13} className="text-warning shrink-0 mt-0.5" />
                            <span className="leading-relaxed">{a}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Audit observations */}
              {aiReport.auditObservations?.length > 0 && (
                <div>
                  <span className="editorial-label mb-4 block">{aiReport.auditObservations.length} Audit Observations</span>
                  <div className="space-y-0">
                    {aiReport.auditObservations.map((obs: any, idx: number) => (
                      <ExpandPanel key={idx} label={obs.title} defaultOpen={idx === 0}>
                        <div className="flex items-center gap-2 mb-3">
                          <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded border flex items-center gap-1.5 ${
                            obs.riskLevel === 'High' ? 'bg-danger/10 text-danger border-danger/20' :
                            obs.riskLevel === 'Medium' ? 'bg-warning/10 text-warning border-warning/20' :
                            'bg-success/10 text-success border-success/20'}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />{obs.riskLevel} Risk
                          </span>
                        </div>
                        <div className="space-y-3 text-xs md:text-sm mt-3">
                          <div className="flex gap-3"><span className="font-bold text-text-muted shrink-0 w-24 text-right">Observation</span><span className="text-text-secondary flex-1 leading-relaxed">{obs.observation}</span></div>
                          <div className="flex gap-3"><span className="font-bold text-text-muted shrink-0 w-24 text-right">Evidence</span><span className="text-text-secondary flex-1 leading-relaxed">{obs.evidence}</span></div>
                          <div className="flex gap-3"><span className="font-bold text-text-muted shrink-0 w-24 text-right">Impact</span><span className="text-text-secondary flex-1 leading-relaxed">{obs.impact}</span></div>
                        </div>
                      </ExpandPanel>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ACTIONS */}
          {activeSection === 'actions' && (
            <motion.div key="actions" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <span className="editorial-label mb-5 block">{aiReport.recommendations?.length || 0} Recommendations</span>
              <div className="space-y-4">
                {aiReport.recommendations?.map((rec: any, idx: number) => (
                  <motion.div key={idx} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.06 }}
                    className="p-5 bg-bg-primary border border-border-primary rounded-xl relative">
                    <div className="flex items-start gap-4">
                      <span className="text-2xl font-black text-text-muted/30 leading-none select-none">{String(idx + 1).padStart(2, '0')}</span>
                      <div className="flex-1">
                        <span className="editorial-label">{rec.category}</span>
                        <p className="text-[15px] font-bold text-text-primary mt-1 mb-3 leading-relaxed">{rec.action}</p>
                        <div className="flex items-start gap-2.5 bg-bg-surface border border-border-primary rounded-xl p-4">
                          <CheckCircle2 size={16} className="text-success shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-text-muted mb-1 select-none">Expected Outcome</p>
                            <p className="text-xs text-text-secondary leading-relaxed">{rec.expectedOutcome}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
});

export default AiInsightCenter;
