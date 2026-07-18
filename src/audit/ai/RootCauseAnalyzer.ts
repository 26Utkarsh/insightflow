// ──────────────────────────────────────────────────────────────────────────────
// RootCauseAnalyzer – Determine why issues occurred
// ──────────────────────────────────────────────────────────────────────────────
import { AuditFinding } from '../types';

interface RootCause {
  category: string;
  explanation: string;
  count: number;
  severity: string;
}

const ROOT_CAUSE_PATTERNS: { patterns: string[]; category: string; baseExplanation: string }[] = [
  { patterns: ['Duplicate', 'duplicate'], category: 'Missing Validation', baseExplanation: 'System lacks duplicate detection controls at the point of entry.' },
  { patterns: ['Self-Approval', 'self-approval', 'Segregation'], category: 'Missing Segregation of Duties', baseExplanation: 'Insufficient separation between requestor and approver roles.' },
  { patterns: ['Missing Approval', 'missing approval', 'Missing Mandatory'], category: 'Weak Controls', baseExplanation: 'Approval workflows are not enforced or are easily bypassed.' },
  { patterns: ['Policy Limit', 'policy limit'], category: 'Policy Gaps', baseExplanation: 'Policy thresholds may be poorly defined or not systemically enforced.' },
  { patterns: ['Weekend', 'After-Hours', 'weekend', 'after-hours'], category: 'Lack of Monitoring', baseExplanation: 'Transaction timing is not monitored for anomalies.' },
  { patterns: ['Inactive Vendor', 'Expired'], category: 'Poor Governance', baseExplanation: 'Vendor master data and contract management processes are inadequate.' },
  { patterns: ['Negative', 'Invalid', 'invalid'], category: 'System Misconfiguration', baseExplanation: 'System validation rules are insufficient to prevent erroneous data entry.' },
  { patterns: ['Split Invoice', 'Round Number', 'Benford', 'Ghost', 'Velocity', 'Repeated Reimbursement'], category: 'Potential Fraud', baseExplanation: 'Pattern indicators suggest possible fraudulent activity requiring investigation.' },
  { patterns: ['Duplicate Bank', 'Duplicate Tax'], category: 'Missing Validation', baseExplanation: 'Key identifiers are not validated for uniqueness during onboarding.' },
];

/**
 * Analyze root causes from audit findings deterministically.
 */
export function analyzeRootCauses(findings: AuditFinding[]): RootCause[] {
  const causeMap = new Map<string, { count: number; findings: AuditFinding[]; explanation: string }>();

  for (const finding of findings) {
    let matched = false;
    for (const pattern of ROOT_CAUSE_PATTERNS) {
      if (pattern.patterns.some(p => finding.title.includes(p) || finding.ruleName.includes(p) || finding.description.toLowerCase().includes(p.toLowerCase()))) {
        const existing = causeMap.get(pattern.category) || { count: 0, findings: [], explanation: pattern.baseExplanation };
        existing.count += finding.affectedRowCount;
        existing.findings.push(finding);
        causeMap.set(pattern.category, existing);
        matched = true;
        break;
      }
    }
    if (!matched) {
      const existing = causeMap.get('Weak Controls') || { count: 0, findings: [], explanation: 'Internal controls require strengthening across multiple areas.' };
      existing.count += finding.affectedRowCount;
      existing.findings.push(finding);
      causeMap.set('Weak Controls', existing);
    }
  }

  return Array.from(causeMap.entries())
    .map(([category, data]) => ({
      category,
      explanation: data.explanation,
      count: data.findings.length,
      severity: data.findings.some(f => f.severity === 'Critical') ? 'Critical'
        : data.findings.some(f => f.severity === 'High') ? 'High'
        : data.findings.some(f => f.severity === 'Medium') ? 'Medium' : 'Low',
    }))
    .sort((a, b) => {
      const order = { Critical: 0, High: 1, Medium: 2, Low: 3 };
      return (order as any)[a.severity] - (order as any)[b.severity];
    });
}
