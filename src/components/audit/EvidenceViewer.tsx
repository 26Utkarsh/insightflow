// ──────────────────────────────────────────────────────────────────────────────
// EvidenceViewer – Evidence drill-down per finding
// ──────────────────────────────────────────────────────────────────────────────
import { ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { useState } from 'react';
import { EvidenceItem } from '../../audit/types';

interface Props {
  evidence: EvidenceItem[];
  maxVisible?: number;
}

export default function EvidenceViewer({ evidence, maxVisible = 5 }: Props) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? evidence : evidence.slice(0, maxVisible);

  if (evidence.length === 0) {
    return (
      <div className="text-center py-3 text-text-muted text-xs">
        No evidence records linked to this finding.
      </div>
    );
  }

  return (
    <div>
      <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 flex items-center gap-1">
        <FileText size={12} /> Evidence ({evidence.length} records)
      </h4>
      <div className="space-y-1.5">
        {visible.map((ev, i) => (
          <div key={i} className="flex items-start gap-2 p-2 rounded bg-bg-surface border border-border-primary/30 text-xs">
            <span className="text-text-muted shrink-0 font-mono w-14">Row {ev.rowIndex + 1}</span>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                {Object.entries(ev.fields).slice(0, 6).map(([k, v]) => (
                  <span key={k} className="text-text-secondary">
                    <span className="text-text-muted">{k}:</span>{' '}
                    <span className="text-text-primary font-medium truncate max-w-[120px] inline-block align-bottom">{String(v ?? '–')}</span>
                  </span>
                ))}
              </div>
              {ev.description && <p className="text-text-muted mt-0.5 truncate">{ev.description}</p>}
            </div>
          </div>
        ))}
      </div>
      {evidence.length > maxVisible && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-2 text-xs text-accent-primary hover:underline font-medium flex items-center gap-1"
        >
          {showAll ? <><ChevronUp size={12} /> Show less</> : <><ChevronDown size={12} /> Show {evidence.length - maxVisible} more</>}
        </button>
      )}
    </div>
  );
}
