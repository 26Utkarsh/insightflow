// ──────────────────────────────────────────────────────────────────────────────
// RiskHeatmap – Visual risk distribution by severity and category
// ──────────────────────────────────────────────────────────────────────────────
import { getSeverityColor } from '../../audit/risk/RiskScorer';
import { AuditFinding } from '../../audit/types';

interface Props {
  findings: AuditFinding[];
}

export default function RiskHeatmap({ findings }: Props) {
  // Build matrix: category x severity
  const categories = Array.from(new Set(findings.map(f => f.category)));
  const severities: Array<'Critical' | 'High' | 'Medium' | 'Low'> = ['Critical', 'High', 'Medium', 'Low'];

  const matrix: Record<string, Record<string, number>> = {};
  for (const cat of categories) {
    matrix[cat] = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  }
  for (const f of findings) {
    if (matrix[f.category]) matrix[f.category][f.severity]++;
  }

  if (categories.length === 0) {
    return (
      <div className="bg-bg-surface border border-border-primary rounded-xl p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-widest mb-4">Risk Heatmap</h3>
        <p className="text-sm text-text-muted text-center py-4">No risk data to display</p>
      </div>
    );
  }

  const maxCount = Math.max(1, ...findings.map(() => 1).flat(), ...categories.flatMap(c => severities.map(s => matrix[c][s])));

  return (
    <div className="bg-bg-surface border border-border-primary rounded-xl p-6 shadow-sm">
      <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-widest mb-4">Risk Heatmap</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left py-2 px-2 text-text-muted font-medium">Category</th>
              {severities.map(s => (
                <th key={s} className="text-center py-2 px-2 font-medium" style={{ color: getSeverityColor(s) }}>{s}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.map(cat => (
              <tr key={cat} className="border-t border-border-primary/30">
                <td className="py-2 px-2 text-text-primary font-medium">{cat}</td>
                {severities.map(sev => {
                  const count = matrix[cat][sev];
                  const intensity = count / maxCount;
                  return (
                    <td key={sev} className="text-center py-2 px-2">
                      <div
                        className="inline-flex items-center justify-center w-10 h-8 rounded text-xs font-bold"
                        style={{
                          background: count > 0 ? getSeverityColor(sev) + Math.round(intensity * 40 + 10).toString(16).padStart(2, '0') : 'transparent',
                          color: count > 0 ? getSeverityColor(sev) : '#64748b',
                          border: count > 0 ? `1px solid ${getSeverityColor(sev)}40` : '1px solid transparent',
                        }}
                      >
                        {count || '–'}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
