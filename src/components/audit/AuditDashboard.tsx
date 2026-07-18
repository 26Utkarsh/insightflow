// ──────────────────────────────────────────────────────────────────────────────
// AuditDashboard – Enterprise audit dashboard with all key metrics
// ──────────────────────────────────────────────────────────────────────────────
import { motion } from 'framer-motion';
import {
    Activity,
    AlertCircle,
    AlertTriangle, CheckCircle2,
    Eye,
    FileText,
    Shield,
    Target
} from 'lucide-react';
import React from 'react';
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getScoreColor, getSeverityColor } from '../../audit/risk/RiskScorer';
import { AuditResult } from '../../audit/types';
import ComplianceStatus from './ComplianceStatus';
import FraudIndicatorsPanel from './FraudIndicatorsPanel';
import RiskHeatmap from './RiskHeatmap';

interface Props {
  result: AuditResult;
  onNavigateFindings: () => void;
}

const fade = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 } };

export default function AuditDashboard({ result, onNavigateFindings }: Props) {
  const { report } = result;
  const { findings, fraudIndicators, complianceResults, dataQuality, riskDistribution } = report;
  const score = report.overallScore;
  const scoreColor = getScoreColor(score);

  const criticalFindings = findings.filter(f => f.severity === 'Critical').slice(0, 5);
  const highFindings = findings.filter(f => f.severity === 'High').slice(0, 5);

  // Risk distribution chart data
  const riskData = [
    { name: 'Critical', value: riskDistribution.Critical, color: getSeverityColor('Critical') },
    { name: 'High', value: riskDistribution.High, color: getSeverityColor('High') },
    { name: 'Medium', value: riskDistribution.Medium, color: getSeverityColor('Medium') },
    { name: 'Low', value: riskDistribution.Low, color: getSeverityColor('Low') },
  ].filter(d => d.value > 0);

  // Category distribution chart data
  const categoryData = Object.entries(report.riskDistribution || {}).length > 0
    ? Object.entries(findings.reduce<Record<string, number>>((acc, f) => {
        acc[f.category] = (acc[f.category] || 0) + 1;
        return acc;
      }, {})).map(([name, value]) => ({ name, value }))
    : [];

  const severityLabel = score >= 80 ? 'Satisfactory' : score >= 60 ? 'Needs Improvement' : score >= 40 ? 'Unsatisfactory' : 'Critical';

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto">
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <KpiCard label="Audit Score" value={`${score}/100`} color={scoreColor} icon={<Shield size={16} />} subtitle={severityLabel} />
        <KpiCard label="Total Findings" value={findings.length.toString()} color={findings.length > 0 ? '#f97316' : '#22c55e'} icon={<AlertTriangle size={16} />} subtitle={`${riskDistribution.Critical} critical`} />
        <KpiCard label="Fraud Indicators" value={fraudIndicators.length.toString()} color={fraudIndicators.length > 0 ? '#ef4444' : '#22c55e'} icon={<Eye size={16} />} subtitle={fraudIndicators.length > 0 ? 'Investigate' : 'None detected'} />
        <KpiCard label="Data Quality" value={`${dataQuality.score}/100`} color={getScoreColor(dataQuality.score)} icon={<Activity size={16} />} subtitle={`${dataQuality.issues.length} issues`} />
        <KpiCard label="Compliance" value={`${complianceResults.filter(c => c.status === 'Pass').length}/${complianceResults.length}`} color={complianceResults.every(c => c.status === 'Pass') ? '#22c55e' : '#f97316'} icon={<CheckCircle2 size={16} />} subtitle="Controls passed" />
        <KpiCard label="Records" value={report.appendix.totalRecordsAnalyzed.toLocaleString()} color="#3b82f6" icon={<FileText size={16} />} subtitle={`${(report.appendix.processingTimeMs / 1000).toFixed(1)}s`} />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Score Gauge + Risk Distribution */}
        <motion.div {...fade} transition={{ delay: 0.1 }} className="surface-panel rounded-2xl p-6 bevel-border">
          <h3 className="text-xs font-bold text-text-muted uppercase tracking-[0.1em] mb-5 flex items-center gap-2">
            <Target size={14} className="text-accent-secondary" /> Risk Distribution
          </h3>
          <div className="flex items-center justify-center py-2">
            <ScoreGauge score={score} color={scoreColor} label={severityLabel} />
          </div>
          {riskData.length > 0 && (
            <div className="mt-6 border-t border-border-primary/50 pt-5">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={riskData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={2}>
                    {riskData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', color: 'var(--text-primary)', padding: '10px', fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 flex-wrap mt-2">
                {riskData.map(d => (
                  <div key={d.name} className="flex items-center gap-1.5 text-[10px] font-medium">
                    <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                    <span className="text-text-secondary">{d.name} ({d.value})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Critical & High Findings */}
        <motion.div {...fade} transition={{ delay: 0.15 }} className="lg:col-span-2 surface-panel rounded-2xl p-6 bevel-border">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-xs font-bold text-text-muted uppercase tracking-[0.1em] flex items-center gap-2">
              <AlertCircle size={14} className="text-accent-secondary" /> Top Findings
            </h3>
            <button onClick={onNavigateFindings} className="text-[10px] uppercase tracking-wider text-accent-secondary hover:underline font-bold">
              View All ({findings.length})
            </button>
          </div>
          <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1 custom-scrollbar">
            {[...criticalFindings, ...highFindings].slice(0, 8).map(f => (
              <div key={f.id} className="flex items-start gap-3 p-3 rounded-lg bg-bg-primary border border-border-primary/50 hover:border-border-primary transition-colors">
                <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: getSeverityColor(f.severity) }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ background: getSeverityColor(f.severity) + '20', color: getSeverityColor(f.severity) }}>{f.severity}</span>
                    <span className="text-sm font-medium text-text-primary truncate">{f.title}</span>
                  </div>
                  <p className="text-xs text-text-secondary line-clamp-1">{f.description}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
                    <span>Score: {f.risk.score}/100</span>
                    <span>{f.affectedRowCount} records</span>
                    <span>{f.category}</span>
                  </div>
                </div>
              </div>
            ))}
            {findings.length === 0 && (
              <div className="text-center py-8 text-text-muted">
                <CheckCircle2 size={32} className="mx-auto mb-2 text-success" />
                <p className="text-sm">No findings identified. Clean dataset!</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fraud Indicators */}
        <motion.div {...fade} transition={{ delay: 0.2 }}>
          <FraudIndicatorsPanel indicators={fraudIndicators} />
        </motion.div>

        {/* Compliance Status */}
        <motion.div {...fade} transition={{ delay: 0.25 }}>
          <ComplianceStatus checks={complianceResults} />
        </motion.div>
      </div>

      {/* Third Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution */}
        {categoryData.length > 0 && (
          <motion.div {...fade} transition={{ delay: 0.3 }} className="bg-bg-surface border border-border-primary rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-widest mb-4">Findings by Category</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={categoryData} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Risk Heatmap */}
        <motion.div {...fade} transition={{ delay: 0.35 }}>
          <RiskHeatmap findings={findings} />
        </motion.div>
      </div>

      {/* Data Quality Summary */}
      <motion.div {...fade} transition={{ delay: 0.4 }} className="bg-bg-surface border border-border-primary rounded-xl p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-widest mb-4 flex items-center gap-2">
          <Activity size={14} /> Data Quality Issues ({dataQuality.issues.length})
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <QualityBadge label="Missing Values" count={dataQuality.summary.missingValues} />
          <QualityBadge label="Duplicate Rows" count={dataQuality.summary.duplicateRows} />
          <QualityBadge label="Duplicate IDs" count={dataQuality.summary.duplicateIds} />
          <QualityBadge label="Outliers" count={dataQuality.summary.outliers} />
          <QualityBadge label="Invalid Dates" count={dataQuality.summary.invalidDates} />
          <QualityBadge label="Invalid Formats" count={dataQuality.summary.invalidFormats} />
          <QualityBadge label="Negative Amounts" count={dataQuality.summary.negativeAmounts} />
          <QualityBadge label="Orphan Records" count={dataQuality.summary.orphanRecords} />
        </div>
      </motion.div>
    </div>
  );
}

// ── Sub-Components ──────────────────────────────────────────────────────────

function KpiCard({ label, value, color, icon, subtitle }: { label: string; value: string; color: string; icon: React.ReactNode; subtitle: string }) {
  return (
    <div className="surface-panel p-5 rounded-2xl bevel-border transition-all hover:border-border-secondary flex flex-col justify-between">
      <div className="flex items-center justify-between gap-2">
        <span className="editorial-label text-[10px] text-text-muted block tracking-wider font-bold select-none">{label}</span>
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="text-xl font-black font-mono mt-3" style={{ color }}>{value}</div>
      <div className="text-[10px] text-text-muted mt-1 font-medium">{subtitle}</div>
    </div>
  );
}

function ScoreGauge({ score, color, label }: { score: number; color: string; label: string }) {
  const circumference = 2 * Math.PI * 50;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative w-32 h-32 select-none">
      <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="50" stroke="var(--border-primary)" strokeWidth="10" fill="none" opacity="0.6" />
        <circle cx="60" cy="60" r="50" stroke={color} strokeWidth="10" fill="none" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black" style={{ color }}>{score}</span>
        <span className="text-[9px] uppercase tracking-wider text-text-muted font-bold mt-0.5">{label}</span>
      </div>
    </div>
  );
}

function QualityBadge({ label, count }: { label: string; count: number }) {
  const color = count === 0 ? 'text-success' : count < 5 ? 'text-warning' : 'text-danger';
  return (
    <div className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-border-primary/50 bg-bg-secondary/20 hover:border-border-primary transition-all">
      <span className="text-xs text-text-secondary font-medium">{label}</span>
      <span className={`text-xs font-bold font-mono ${color}`}>{count}</span>
    </div>
  );
}
