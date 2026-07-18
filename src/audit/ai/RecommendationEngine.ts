// ──────────────────────────────────────────────────────────────────────────────
// RecommendationEngine – Professional audit recommendations
// ──────────────────────────────────────────────────────────────────────────────
import { AuditFinding, DatasetDomain, Priority } from '../types';

interface FindingRecommendation {
  findingId: string;
  ruleName: string;
  business: string;
  technical: string;
  control: string;
  preventive: string;
  corrective: string;
  estimatedImpact: string;
  implementationPriority: Priority;
  expectedImprovement: string;
}

const RECOMMENDATION_TEMPLATES: Record<string, Omit<FindingRecommendation, 'findingId' | 'ruleName'>> = {
  'dup-001': {
    business: 'Implement a three-way match process (PO, receipt, invoice) before payment authorization.',
    technical: 'Deploy automated duplicate detection at point of entry using composite key matching (vendor+amount+date).',
    control: 'Add a mandatory review step in the payment workflow that flags potential duplicates before release.',
    preventive: 'Implement real-time duplicate alerting in the ERP system with configurable matching thresholds.',
    corrective: 'Investigate all identified duplicates, reverse any duplicate payments, and recover overpaid amounts.',
    estimatedImpact: 'Potential recovery of duplicate payment amounts plus reduction in future duplicate risk by 90%.',
    implementationPriority: 'P1',
    expectedImprovement: 'Eliminate 95% of duplicate transactions within 3 months of control implementation.',
  },
  'pol-001': {
    business: 'Review and update expense/procurement policies to reflect current business requirements.',
    technical: 'Configure system-enforced spending limits with automated escalation for threshold breaches.',
    control: 'Implement tiered approval authority based on transaction amount with documented delegation matrix.',
    preventive: 'Add pre-submission validation that warns users when amounts approach policy limits.',
    corrective: 'Review all policy violations, determine if retroactive approval is warranted, and document exceptions.',
    estimatedImpact: 'Reduce unauthorized spending by 70% and improve policy compliance to >95%.',
    implementationPriority: 'P1',
    expectedImprovement: 'Policy compliance rate improvement from current levels to >95% within 6 months.',
  },
  'apr-001': {
    business: 'Establish a formal approval hierarchy with documented delegation of authority.',
    technical: 'Configure mandatory approval fields in the system with role-based access controls.',
    control: 'Implement automated workflow routing that prevents transaction processing without required approvals.',
    preventive: 'System should block transaction submission when approver field is empty.',
    corrective: 'Retroactively obtain approvals for identified transactions or document as exceptions.',
    estimatedImpact: 'Ensure 100% approval coverage and strengthen audit trail for all transactions.',
    implementationPriority: 'P1',
    expectedImprovement: '100% approval compliance within 2 months of system configuration.',
  },
  'apr-002': {
    business: 'Enforce segregation of duties policy – no individual should approve their own transactions.',
    technical: 'Implement system controls that prevent same-user requestor/approver combinations.',
    control: 'Configure SoD conflict detection in the ERP with automated blocking and escalation.',
    preventive: 'Add SoD validation at transaction creation that rejects self-approval attempts.',
    corrective: 'Investigate all self-approvals for potential fraud, re-approve through proper channels.',
    estimatedImpact: 'Eliminate self-approval risk and reduce fraud opportunity by implementing proper SoD.',
    implementationPriority: 'P1',
    expectedImprovement: 'Zero self-approval instances within 1 month of control implementation.',
  },
  'tim-001': {
    business: 'Review weekend transactions for business justification and proper authorization.',
    technical: 'Implement time-based transaction monitoring with automated alerts for off-hours activity.',
    control: 'Require additional approval level for transactions processed outside business hours.',
    preventive: 'Configure system alerts for weekend/holiday transactions requiring supervisory review.',
    corrective: 'Review identified weekend transactions for legitimacy and document business rationale.',
    estimatedImpact: 'Reduce unauthorized after-hours transactions by 80% through monitoring controls.',
    implementationPriority: 'P2',
    expectedImprovement: 'All off-hours transactions properly authorized within 3 months.',
  },
  'frd-001': {
    business: 'Implement bank account verification during vendor/employee onboarding.',
    technical: 'Deploy bank account uniqueness validation and cross-reference with known account databases.',
    control: 'Add mandatory bank account verification step in master data maintenance process.',
    preventive: 'System should flag and block duplicate bank accounts across different payee records.',
    corrective: 'Investigate all shared bank accounts for potential ghost employees or vendor fraud.',
    estimatedImpact: 'Prevent payroll fraud and ghost employee schemes through bank account controls.',
    implementationPriority: 'P1',
    expectedImprovement: 'Eliminate duplicate bank account risk within 2 months.',
  },
  'cmp-001': {
    business: 'Implement contract lifecycle management with automated renewal/expiry alerts.',
    technical: 'Deploy automated monitoring of contract expiry dates with 90/60/30-day alerts.',
    control: 'Add contract validity check before processing any payments to contracted parties.',
    preventive: 'System should block transactions with expired contracts and require renewal confirmation.',
    corrective: 'Review all expired contracts, determine if services were delivered during lapse, and renew or terminate.',
    estimatedImpact: 'Eliminate compliance risk from expired contracts and ensure continuous coverage.',
    implementationPriority: 'P1',
    expectedImprovement: '100% contract compliance within 3 months of CLM implementation.',
  },
};

const DEFAULT_RECOMMENDATION: Omit<FindingRecommendation, 'findingId' | 'ruleName'> = {
  business: 'Review the affected transactions and assess business impact.',
  technical: 'Implement automated monitoring and validation controls for this risk area.',
  control: 'Strengthen the internal control framework with additional review and approval steps.',
  preventive: 'Add proactive monitoring alerts to detect similar issues before they materialize.',
  corrective: 'Investigate identified issues, quantify impact, and implement remediation actions.',
  estimatedImpact: 'Improved control effectiveness and reduced risk exposure.',
  implementationPriority: 'P2',
  expectedImprovement: 'Measurable risk reduction within 6 months of implementation.',
};

/**
 * Generate recommendations for all findings.
 */
export function generateRecommendations(findings: AuditFinding[], _domain: DatasetDomain): {
  findingRecommendations: FindingRecommendation[];
  generalRecommendations: string[];
} {
  const findingRecommendations = findings.map(f => {
    const template = RECOMMENDATION_TEMPLATES[f.ruleId] || DEFAULT_RECOMMENDATION;
    return { findingId: f.id, ruleName: f.ruleName, ...template };
  });

  const generalRecommendations: string[] = [
    'Establish a continuous monitoring program using automated tools to detect anomalies in real-time.',
    'Conduct periodic control self-assessments across all business units to identify control gaps proactively.',
    'Strengthen the three lines of defense model: operational management, risk/compliance, and internal audit.',
    'Implement a formal exception reporting process with defined escalation thresholds and timelines.',
    'Ensure all audit findings are tracked through a formal issue management system with assigned owners and due dates.',
  ];

  if (findings.some(f => f.severity === 'Critical')) {
    generalRecommendations.unshift('Immediately escalate critical findings to the Audit Committee and senior management.');
  }
  if (findings.some(f => f.category === 'Fraud')) {
    generalRecommendations.unshift('Engage forensic specialists to investigate fraud indicators with proper chain-of-custody protocols.');
  }

  return { findingRecommendations, generalRecommendations };
}

export type { FindingRecommendation };

