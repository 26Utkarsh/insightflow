// ──────────────────────────────────────────────────────────────────────────────
// ComplianceEngine – Configurable compliance validation framework
// ──────────────────────────────────────────────────────────────────────────────
import { getFieldValue } from '../pipeline/ColumnMapper';
import { AuditRecord, CanonicalFields, ComplianceCheck, DatasetDomain, EvidenceItem, SeverityLevel } from '../types';

interface ComplianceFramework {
  id: string;
  name: string;
  controls: ComplianceControl[];
}

interface ComplianceControl {
  id: string;
  name: string;
  description: string;
  check: (records: AuditRecord[], fields: CanonicalFields) => { pass: boolean; failedRows: number[]; details: string };
  severity: SeverityLevel;
  applicableDomains?: DatasetDomain[];
}

function norm(v: any): string { return String(v ?? '').trim().toLowerCase(); }
function parseNum(v: any): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(String(v).replace(/[, $€£¥₹]/g, ''));
  return isNaN(n) ? null : n;
}

// ── Built-in Controls ───────────────────────────────────────────────────────

const approvalControl: ComplianceControl = {
  id: 'CTRL-APR-001', name: 'Approval Completeness',
  description: 'All transactions must have an approver recorded.',
  severity: 'High',
  check(records, fields) {
    if (!fields.approver) return { pass: true, failedRows: [], details: 'No approver field mapped.' };
    const failed: number[] = [];
    records.forEach((r, i) => { const v = getFieldValue(r, fields, 'approver'); if (!v || !String(v).trim()) failed.push(i); });
    return { pass: failed.length === 0, failedRows: failed, details: failed.length > 0 ? `${failed.length} records lack approval.` : 'All records have approvals.' };
  },
};

const segregationOfDutiesControl: ComplianceControl = {
  id: 'CTRL-SOD-001', name: 'Segregation of Duties',
  description: 'Requestor and approver must be different individuals.',
  severity: 'Critical',
  check(records, fields) {
    if (!fields.approver || !fields.employee) return { pass: true, failedRows: [], details: 'Insufficient fields for SoD check.' };
    const failed: number[] = [];
    records.forEach((r, i) => {
      const emp = norm(getFieldValue(r, fields, 'employee'));
      const apr = norm(getFieldValue(r, fields, 'approver'));
      if (emp && apr && emp === apr) failed.push(i);
    });
    return { pass: failed.length === 0, failedRows: failed, details: failed.length > 0 ? `${failed.length} SoD violations (self-approval).` : 'No SoD violations detected.' };
  },
};

const documentationControl: ComplianceControl = {
  id: 'CTRL-DOC-001', name: 'Documentation Completeness',
  description: 'All records must have a description or reference.',
  severity: 'Medium',
  check(records, fields) {
    if (!fields.description && !fields.reference) return { pass: true, failedRows: [], details: 'No description/reference mapped.' };
    const failed: number[] = [];
    records.forEach((r, i) => {
      const desc = fields.description ? getFieldValue(r, fields, 'description') : null;
      const ref = fields.reference ? getFieldValue(r, fields, 'reference') : null;
      if ((!desc || !String(desc).trim()) && (!ref || !String(ref).trim())) failed.push(i);
    });
    return { pass: failed.length === 0, failedRows: failed, details: failed.length > 0 ? `${failed.length} records missing description and reference.` : 'All records documented.' };
  },
};

const duplicatePreventionControl: ComplianceControl = {
  id: 'CTRL-DUP-001', name: 'Duplicate Prevention',
  description: 'No duplicate transaction identifiers.',
  severity: 'High',
  check(records, fields) {
    if (!fields.id) return { pass: true, failedRows: [], details: 'No ID field mapped.' };
    const seen = new Map<string, number>();
    const failed: number[] = [];
    records.forEach((r, i) => {
      const id = norm(getFieldValue(r, fields, 'id'));
      if (id && seen.has(id)) failed.push(i);
      else if (id) seen.set(id, i);
    });
    return { pass: failed.length === 0, failedRows: failed, details: failed.length > 0 ? `${failed.length} duplicate IDs found.` : 'No duplicates.' };
  },
};

const amountReasonablenessControl: ComplianceControl = {
  id: 'CTRL-AMT-001', name: 'Amount Reasonableness',
  description: 'Transaction amounts should not be negative or zero without justification.',
  severity: 'Medium',
  check(records, fields) {
    if (!fields.amount) return { pass: true, failedRows: [], details: 'No amount field mapped.' };
    const failed: number[] = [];
    records.forEach((r, i) => {
      const amt = parseNum(getFieldValue(r, fields, 'amount'));
      if (amt !== null && amt <= 0) failed.push(i);
    });
    return { pass: failed.length === 0, failedRows: failed, details: failed.length > 0 ? `${failed.length} zero/negative amounts.` : 'All amounts positive.' };
  },
};

const dateValidityControl: ComplianceControl = {
  id: 'CTRL-DAT-001', name: 'Date Validity',
  description: 'Transaction dates must be valid and within reasonable range.',
  severity: 'Medium',
  check(records, fields) {
    if (!fields.date) return { pass: true, failedRows: [], details: 'No date field mapped.' };
    const now = new Date();
    const minDate = new Date('2000-01-01');
    const failed: number[] = [];
    records.forEach((r, i) => {
      const v = getFieldValue(r, fields, 'date');
      if (v) {
        const d = new Date(v);
        if (isNaN(d.getTime()) || d > now || d < minDate) failed.push(i);
      }
    });
    return { pass: failed.length === 0, failedRows: failed, details: failed.length > 0 ? `${failed.length} invalid dates.` : 'All dates valid.' };
  },
};

// ── Built-in Frameworks ─────────────────────────────────────────────────────

const INTERNAL_CONTROLS: ComplianceFramework = {
  id: 'FW-INTERNAL', name: 'Internal Control Framework',
  controls: [approvalControl, segregationOfDutiesControl, documentationControl, duplicatePreventionControl, amountReasonablenessControl, dateValidityControl],
};

const SOP_FRAMEWORK: ComplianceFramework = {
  id: 'FW-SOP', name: 'Standard Operating Procedures',
  controls: [approvalControl, documentationControl, duplicatePreventionControl],
};

/**
 * Run compliance checks against all applicable frameworks.
 */
export function runComplianceChecks(
  records: AuditRecord[],
  fields: CanonicalFields,
  domain: DatasetDomain,
  customFrameworks?: ComplianceFramework[],
): ComplianceCheck[] {
  const frameworks = customFrameworks ? [INTERNAL_CONTROLS, SOP_FRAMEWORK, ...customFrameworks] : [INTERNAL_CONTROLS, SOP_FRAMEWORK];
  const results: ComplianceCheck[] = [];

  for (const fw of frameworks) {
    for (const ctrl of fw.controls) {
      // Check domain applicability
      if (ctrl.applicableDomains && ctrl.applicableDomains.length > 0 && !ctrl.applicableDomains.includes(domain)) continue;

      try {
        const result = ctrl.check(records, fields);
        const evidence: EvidenceItem[] = result.failedRows.slice(0, 10).map(idx => ({
          rowIndex: idx,
          fields: Object.fromEntries(Object.entries(records[idx]).slice(0, 5).map(([k, v]) => [k, v as any])),
          description: `Row ${idx + 1} failed control ${ctrl.id}`,
        }));

        results.push({
          id: `${fw.id}/${ctrl.id}`,
          framework: fw.name,
          control: ctrl.name,
          description: ctrl.description,
          status: result.pass ? 'Pass' : result.failedRows.length > records.length * 0.2 ? 'Fail' : 'Partial',
          evidence,
          findings: result.pass ? [] : [result.details],
          severity: ctrl.severity,
        });
      } catch (err) {
        results.push({
          id: `${fw.id}/${ctrl.id}`, framework: fw.name, control: ctrl.name,
          description: ctrl.description, status: 'Not Applicable', evidence: [], findings: [`Check failed: ${err}`], severity: ctrl.severity,
        });
      }
    }
  }

  return results;
}
