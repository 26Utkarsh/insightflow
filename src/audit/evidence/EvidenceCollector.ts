// ──────────────────────────────────────────────────────────────────────────────
// EvidenceCollector – Evidence linking for every finding
// ──────────────────────────────────────────────────────────────────────────────
import { AuditFinding, AuditRecord, CanonicalFields, EvidenceItem } from '../types';

/**
 * Enrich findings with detailed evidence from the source records.
 */
export function collectEvidence(
  findings: AuditFinding[],
  records: AuditRecord[],
  fields: CanonicalFields,
  fileName?: string,
): AuditFinding[] {
  return findings.map(finding => {
    // Evidence is already populated by the RuleEngine for basic cases.
    // Here we enrich it with additional context.
    const enrichedEvidence = finding.evidence.map(ev => {
      const record = records[ev.rowIndex];
      if (!record) return ev;

      const enriched: EvidenceItem = { ...ev, sourceFile: fileName || ev.sourceFile };

      // Add all non-null fields from the record
      const allFields: Record<string, string | number | null> = {};
      for (const key of Object.keys(record)) {
        const v = record[key];
        if (v !== null && v !== undefined && String(v).trim() !== '') {
          allFields[key] = typeof v === 'number' ? v : String(v);
        }
      }
      enriched.fields = { ...allFields, ...ev.fields };
      return enriched;
    });

    return { ...finding, evidence: enrichedEvidence };
  });
}

/**
 * Generate a summary of evidence for display.
 */
export function summarizeEvidence(finding: AuditFinding): string {
  if (finding.evidence.length === 0) return 'No specific evidence records linked.';
  const sample = finding.evidence.slice(0, 3);
  const parts = sample.map(ev => {
    const id = ev.recordId || `Row ${ev.rowIndex + 1}`;
    const amt = ev.fields['amount'] || ev.fields['Amount'] || '';
    const date = ev.fields['date'] || ev.fields['Date'] || '';
    return `${id}${amt ? ` (${amt})` : ''}${date ? ` on ${date}` : ''}`;
  });
  const remaining = finding.evidence.length - sample.length;
  return parts.join('; ') + (remaining > 0 ? ` ... and ${remaining} more.` : '');
}
