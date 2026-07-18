// ──────────────────────────────────────────────────────────────────────────────
// AuditTimeline – Audit pipeline timeline view
// ──────────────────────────────────────────────────────────────────────────────
import { CheckCircle2, Clock } from 'lucide-react';

interface Props {
  stages: { name: string; timestamp?: number }[];
  processingTimeMs: number;
}

export default function AuditTimeline({ stages, processingTimeMs }: Props) {
  return (
    <div className="bg-bg-surface border border-border-primary rounded-xl p-6 shadow-sm">
      <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-widest mb-4 flex items-center gap-2">
        <Clock size={14} /> Audit Timeline
      </h3>
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border-primary" />
        <div className="space-y-4">
          {stages.map((stage, i) => (
            <div key={stage.name} className="flex items-start gap-3 relative">
              <div className="w-8 h-8 rounded-full bg-success/10 border-2 border-success flex items-center justify-center z-10 shrink-0">
                <CheckCircle2 size={14} className="text-success" />
              </div>
              <div className="pt-1">
                <span className="text-sm font-medium text-text-primary">{stage.name}</span>
                {stage.timestamp && (
                  <span className="ml-2 text-xs text-text-muted">{((stage.timestamp) / 1000).toFixed(1)}s</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-border-primary/50 text-xs text-text-muted text-center">
        Total processing time: {(processingTimeMs / 1000).toFixed(1)} seconds
      </div>
    </div>
  );
}
