// ──────────────────────────────────────────────────────────────────────────────
// AuditFindings – Sortable, filterable findings table with drill-down
// ──────────────────────────────────────────────────────────────────────────────
import { AnimatePresence, motion } from 'framer-motion';
import {
    AlertCircle,
    ChevronDown,
    ChevronRight,
    ChevronUp,
    Info,
    Search
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { getSeverityColor } from '../../audit/risk/RiskScorer';
import { AuditFinding, AuditRecord, RiskCategory, SeverityLevel } from '../../audit/types';
import EvidenceViewer from './EvidenceViewer';

interface Props {
  findings: AuditFinding[];
  records: AuditRecord[];
}

type SortField = 'severity' | 'score' | 'title' | 'affected' | 'category';
type SortDir = 'asc' | 'desc';

const SEVERITY_ORDER: Record<SeverityLevel, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };

export default function AuditFindings({ findings, records }: Props) {
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<SeverityLevel | 'All'>('All');
  const [categoryFilter, setCategoryFilter] = useState<RiskCategory | 'All'>('All');
  const [sortField, setSortField] = useState<SortField>('severity');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const categories = useMemo(() => Array.from(new Set(findings.map(f => f.category))), [findings]);

  const filtered = useMemo(() => {
    let result = [...findings];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(f =>
        f.title.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        f.ruleName.toLowerCase().includes(q)
      );
    }
    if (severityFilter !== 'All') result = result.filter(f => f.severity === severityFilter);
    if (categoryFilter !== 'All') result = result.filter(f => f.category === categoryFilter);

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'severity': cmp = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]; break;
        case 'score': cmp = a.risk.score - b.risk.score; break;
        case 'title': cmp = a.title.localeCompare(b.title); break;
        case 'affected': cmp = a.affectedRowCount - b.affectedRowCount; break;
        case 'category': cmp = a.category.localeCompare(b.category); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [findings, search, severityFilter, categoryFilter, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  return (
    <div className="max-w-[1200px] mx-auto">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search findings..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-bg-surface border border-border-primary rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
          />
        </div>

        <select
          value={severityFilter}
          onChange={e => setSeverityFilter(e.target.value as any)}
          className="px-3 py-2 text-sm bg-bg-surface border border-border-primary rounded-lg text-text-primary focus:outline-none"
        >
          <option value="All">All Severities</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value as any)}
          className="px-3 py-2 text-sm bg-bg-surface border border-border-primary rounded-lg text-text-primary focus:outline-none"
        >
          <option value="All">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <span className="text-xs text-text-muted ml-auto">{filtered.length} of {findings.length} findings</span>
      </div>

      {/* Table Header */}
      <div className="bg-bg-surface border border-border-primary rounded-t-xl overflow-hidden">
        <div className="grid grid-cols-[40px_1fr_100px_80px_100px_80px] gap-2 px-4 py-2 text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border-primary">
          <div></div>
          <button onClick={() => toggleSort('title')} className="flex items-center gap-1 text-left hover:text-text-primary">
            Finding {sortField === 'title' && (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
          </button>
          <button onClick={() => toggleSort('severity')} className="flex items-center gap-1 hover:text-text-primary">
            Severity {sortField === 'severity' && (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
          </button>
          <button onClick={() => toggleSort('score')} className="flex items-center gap-1 hover:text-text-primary">
            Score {sortField === 'score' && (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
          </button>
          <button onClick={() => toggleSort('category')} className="flex items-center gap-1 hover:text-text-primary">
            Category {sortField === 'category' && (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
          </button>
          <button onClick={() => toggleSort('affected')} className="flex items-center gap-1 hover:text-text-primary">
            Records {sortField === 'affected' && (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
          </button>
        </div>

        {/* Rows */}
        <div className="divide-y divide-border-primary/50 max-h-[600px] overflow-y-auto">
          {filtered.map(f => (
            <React.Fragment key={f.id}>
              <div
                className="grid grid-cols-[40px_1fr_100px_80px_100px_80px] gap-2 px-4 py-3 items-center hover:bg-bg-primary/50 cursor-pointer transition-colors"
                onClick={() => setExpandedId(expandedId === f.id ? null : f.id)}
              >
                <ChevronRight size={14} className={`text-text-muted transition-transform ${expandedId === f.id ? 'rotate-90' : ''}`} />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-text-primary truncate">{f.title}</div>
                  <div className="text-xs text-text-muted truncate">{f.ruleName}</div>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full text-center" style={{ background: getSeverityColor(f.severity) + '20', color: getSeverityColor(f.severity) }}>
                  {f.severity}
                </span>
                <span className="text-sm font-semibold text-text-primary">{f.risk.score}</span>
                <span className="text-xs text-text-secondary">{f.category}</span>
                <span className="text-sm text-text-secondary">{f.affectedRowCount}</span>
              </div>

              {/* Expanded Detail */}
              <AnimatePresence>
                {expandedId === f.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <FindingDetail finding={f} records={records} />
                  </motion.div>
                )}
              </AnimatePresence>
            </React.Fragment>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-text-muted">
              <AlertCircle size={28} className="mx-auto mb-2" />
              <p className="text-sm">No findings match your filters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FindingDetail({ finding: f, records }: { finding: AuditFinding; records: AuditRecord[] }) {
  return (
    <div className="px-6 py-4 bg-bg-primary border-t border-border-primary/30 space-y-4">
      <p className="text-sm text-text-secondary">{f.description}</p>

      {/* AI Reasoning */}
      {f.aiReasoning && (
        <div className="bg-accent-primary/5 border border-accent-primary/20 rounded-lg p-4">
          <h4 className="text-xs font-bold text-accent-primary uppercase tracking-wider mb-2 flex items-center gap-1">
            <Info size={12} /> AI Assessment
          </h4>
          <p className="text-sm text-text-primary mb-1"><strong>Why Suspicious:</strong> {f.aiReasoning.whySuspicious}</p>
          <p className="text-sm text-text-secondary mb-1"><strong>Business Impact:</strong> {f.aiReasoning.businessImpact}</p>
          <p className="text-sm text-text-secondary"><strong>Next Steps:</strong> {f.aiReasoning.recommendedNextSteps}</p>
        </div>
      )}

      {/* Recommendations */}
      {f.recommendations && (
        <div className="bg-success/5 border border-success/20 rounded-lg p-4">
          <h4 className="text-xs font-bold text-success uppercase tracking-wider mb-2">Recommendations</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div><strong className="text-text-primary">Business:</strong> <span className="text-text-secondary">{f.recommendations.business}</span></div>
            <div><strong className="text-text-primary">Technical:</strong> <span className="text-text-secondary">{f.recommendations.technical}</span></div>
            <div><strong className="text-text-primary">Control:</strong> <span className="text-text-secondary">{f.recommendations.control}</span></div>
            <div><strong className="text-text-primary">Priority:</strong> <span className="text-text-secondary">{f.recommendations.implementationPriority}</span></div>
          </div>
        </div>
      )}

      {/* Evidence */}
      <EvidenceViewer evidence={f.evidence} />
    </div>
  );
}
