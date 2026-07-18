// ──────────────────────────────────────────────────────────────────────────────
// ComplianceStatus – Compliance check results view
// ──────────────────────────────────────────────────────────────────────────────
import { AlertTriangle, CheckCircle2, MinusCircle, XCircle } from 'lucide-react';
import React from 'react';
import { ComplianceCheck } from '../../audit/types';

interface Props {
  checks: ComplianceCheck[];
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  Pass: <CheckCircle2 size={14} className="text-success" />,
  Fail: <XCircle size={14} className="text-danger" />,
  Partial: <AlertTriangle size={14} className="text-warning" />,
  'Not Applicable': <MinusCircle size={14} className="text-text-muted" />,
};

const STATUS_BG: Record<string, string> = {
  Pass: 'bg-success/10 border-success/30',
  Fail: 'bg-danger/10 border-danger/30',
  Partial: 'bg-warning/10 border-warning/30',
  'Not Applicable': 'bg-bg-primary border-border-primary/50',
};

export default function ComplianceStatus({ checks }: Props) {
  const passCount = checks.filter(c => c.status === 'Pass').length;
  const failCount = checks.filter(c => c.status === 'Fail').length;
  const partialCount = checks.filter(c => c.status === 'Partial').length;

  return (
    <div className="bg-bg-surface border border-border-primary rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-widest">Compliance Status</h3>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-success font-medium">{passCount} Pass</span>
          <span className="text-warning font-medium">{partialCount} Partial</span>
          <span className="text-danger font-medium">{failCount} Fail</span>
        </div>
      </div>

      <div className="space-y-2 max-h-[280px] overflow-y-auto">
        {checks.map(check => (
          <div key={check.id} className={`flex items-start gap-3 p-3 rounded-lg border ${STATUS_BG[check.status]}`}>
            <span className="mt-0.5 shrink-0">{STATUS_ICON[check.status]}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-sm font-medium text-text-primary">{check.control}</span>
                <span className="text-xs text-text-muted">{check.framework}</span>
              </div>
              <p className="text-xs text-text-secondary">{check.description}</p>
              {check.findings.length > 0 && (
                <p className="text-xs text-text-muted mt-1">{check.findings[0]}</p>
              )}
            </div>
          </div>
        ))}
        {checks.length === 0 && (
          <p className="text-sm text-text-muted text-center py-4">No compliance checks configured</p>
        )}
      </div>
    </div>
  );
}
