// ──────────────────────────────────────────────────────────────────────────────
// FraudIndicatorsPanel – Fraud detection results panel
// ──────────────────────────────────────────────────────────────────────────────
import { CheckCircle2, Eye } from 'lucide-react';
import { getSeverityColor } from '../../audit/risk/RiskScorer';
import { FraudIndicator } from '../../audit/types';

interface Props {
  indicators: FraudIndicator[];
}

export default function FraudIndicatorsPanel({ indicators }: Props) {
  return (
    <div className="bg-bg-surface border border-border-primary rounded-xl p-6 shadow-sm">
      <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-widest mb-4 flex items-center gap-2">
        <Eye size={14} /> Fraud Indicators ({indicators.length})
      </h3>
      {indicators.length === 0 ? (
        <div className="text-center py-6">
          <CheckCircle2 size={28} className="mx-auto mb-2 text-success" />
          <p className="text-sm text-text-muted">No fraud indicators detected</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[280px] overflow-y-auto">
          {indicators.map(fi => (
            <div key={fi.id} className="p-3 rounded-lg bg-bg-primary border border-border-primary/50">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-text-primary">{fi.pattern}</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: getSeverityColor(fi.severity) + '20', color: getSeverityColor(fi.severity) }}>
                  {fi.severity}
                </span>
              </div>
              <p className="text-xs text-text-secondary mb-2">{fi.description}</p>
              <div className="flex items-center gap-3 text-xs text-text-muted">
                <span>Confidence: {fi.confidence}%</span>
                <span>Records: {fi.affectedRows.length}</span>
              </div>
              {/* Confidence bar */}
              <div className="mt-2 w-full bg-border-primary/30 rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full transition-all"
                  style={{ width: `${fi.confidence}%`, background: getSeverityColor(fi.severity) }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
