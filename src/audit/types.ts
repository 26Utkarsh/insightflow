// ──────────────────────────────────────────────────────────────────────────────
// InsightFlow – Enterprise Internal Audit Type System
// ──────────────────────────────────────────────────────────────────────────────

// ── Dataset Domain ──────────────────────────────────────────────────────────
export type DatasetDomain =
  | 'Employee Records' | 'Payroll' | 'Expenses' | 'Invoices'
  | 'Purchase Orders' | 'Vendor Data' | 'Project Tracking' | 'Attendance'
  | 'Sales' | 'Finance' | 'Inventory' | 'Procurement'
  | 'IT Assets' | 'Access Logs' | 'Compliance Documents' | 'Contracts'
  | 'HR Data' | 'General Ledger' | 'Accounts Payable' | 'Accounts Receivable'
  | 'Fixed Assets' | 'Budget' | 'Travel' | 'Unknown';

// ── Generic Record ──────────────────────────────────────────────────────────
/** A single row of uploaded data – keys are dynamic, not hardcoded. */
export interface AuditRecord {
  [field: string]: string | number | boolean | null | undefined;
}

// ── Canonical Field Mapping ─────────────────────────────────────────────────
export interface CanonicalFields {
  id?: string;
  date?: string;
  amount?: string;
  approver?: string;
  vendor?: string;
  employee?: string;
  department?: string;
  status?: string;
  description?: string;
  category?: string;
  reference?: string;
  currency?: string;
  email?: string;
  phone?: string;
  bankAccount?: string;
  taxId?: string;
  contractDate?: string;
  expiryDate?: string;
}

// ── Column Type ─────────────────────────────────────────────────────────────
export type ColumnType = 'numeric' | 'date' | 'text' | 'currency' | 'id' | 'email' | 'phone' | 'boolean' | 'unknown';

export interface ColumnProfile {
  name: string;
  type: ColumnType;
  nullCount: number;
  uniqueCount: number;
  min?: number | string;
  max?: number | string;
  mean?: number;
  median?: number;
  stdDev?: number;
  topValues?: { value: string; count: number }[];
  canonicalField?: string;
}

// ── Data Quality Report ─────────────────────────────────────────────────────
export interface DataQualityIssue {
  type: 'missing' | 'duplicate_row' | 'duplicate_id' | 'negative_amount'
      | 'invalid_date' | 'invalid_format' | 'outlier' | 'orphan'
      | 'broken_fk' | 'inconsistent_currency' | 'corrupted';
  column?: string;
  rowIndices: number[];
  count: number;
  description: string;
  severity: SeverityLevel;
}

export interface DataQualityReport {
  score: number; // 0-100
  totalRows: number;
  validRows: number;
  issues: DataQualityIssue[];
  columnProfiles: ColumnProfile[];
  summary: {
    missingValues: number;
    duplicateRows: number;
    duplicateIds: number;
    invalidDates: number;
    invalidFormats: number;
    outliers: number;
    negativeAmounts: number;
    orphanRecords: number;
  };
}

// ── Severity / Risk ─────────────────────────────────────────────────────────
export type SeverityLevel = 'Low' | 'Medium' | 'High' | 'Critical';
export type RiskCategory = 'Financial' | 'Operational' | 'Compliance' | 'Fraud' | 'Data Quality' | 'Strategic';
export type Priority = 'P1' | 'P2' | 'P3' | 'P4';

export interface RiskAssessment {
  likelihood: 1 | 2 | 3 | 4 | 5;
  impact: 1 | 2 | 3 | 4 | 5;
  severity: SeverityLevel;
  score: number; // 0-100
  category: RiskCategory;
  businessArea: string;
  priority: Priority;
  confidence: number; // 0-100
  criticality: SeverityLevel;
}

// ── Evidence ────────────────────────────────────────────────────────────────
export interface EvidenceItem {
  rowIndex: number;
  recordId?: string;
  fields: Record<string, string | number | null>;
  sourceFile?: string;
  description: string;
}

// ── Audit Finding ───────────────────────────────────────────────────────────
export interface AuditFinding {
  id: string;
  ruleId: string;
  ruleName: string;
  category: RiskCategory;
  title: string;
  description: string;
  severity: SeverityLevel;
  risk: RiskAssessment;
  evidence: EvidenceItem[];
  aiReasoning?: {
    whySuspicious: string;
    evidenceSummary: string;
    businessImpact: string;
    likelihoodAssessment: string;
    recommendedNextSteps: string;
  };
  rootCause?: {
    category: string;
    explanation: string;
  };
  recommendations?: {
    business: string;
    technical: string;
    control: string;
    preventive: string;
    corrective: string;
    estimatedImpact: string;
    implementationPriority: Priority;
    expectedImprovement: string;
  };
  affectedRowCount: number;
  timestamp: number;
}

// ── Rule Engine ─────────────────────────────────────────────────────────────
export interface AuditRule {
  id: string;
  name: string;
  category: RiskCategory;
  description: string;
  severity: SeverityLevel;
  riskWeight: number; // 1-10
  enabled: boolean;
  parameters: Record<string, any>;
  applicableDomains: DatasetDomain[];
  execute: (records: AuditRecord[], mappedFields: CanonicalFields, params: Record<string, any>) => RuleResult[];
}

export interface RuleResult {
  ruleId: string;
  title: string;
  description: string;
  rowIndices: number[];
  fields?: Record<string, string | number | null>;
  severity?: SeverityLevel;
  extra?: Record<string, any>;
}

// ── Fraud Indicator ─────────────────────────────────────────────────────────
export interface FraudIndicator {
  id: string;
  pattern: string;
  description: string;
  confidence: number; // 0-100
  severity: SeverityLevel;
  affectedRows: number[];
  evidence: EvidenceItem[];
  details: Record<string, any>;
}

// ── Compliance Check ────────────────────────────────────────────────────────
export interface ComplianceCheck {
  id: string;
  framework: string;
  control: string;
  description: string;
  status: 'Pass' | 'Fail' | 'Partial' | 'Not Applicable';
  evidence: EvidenceItem[];
  findings: string[];
  severity: SeverityLevel;
}

// ── Audit Report ────────────────────────────────────────────────────────────
export interface AuditReport {
  id: string;
  datasetName: string;
  domain: DatasetDomain;
  generatedAt: number;
  executiveSummary: string;
  methodology: string;
  scope: string;
  overallScore: number; // 0-100 (higher = better control environment)
  riskDistribution: Record<SeverityLevel, number>;
  findings: AuditFinding[];
  fraudIndicators: FraudIndicator[];
  complianceResults: ComplianceCheck[];
  dataQuality: DataQualityReport;
  rootCauses: { category: string; count: number; severity: string; explanation: string }[];
  recommendations: string[];
  conclusion: string;
  appendix: {
    totalRecordsAnalyzed: number;
    rulesExecuted: number;
    processingTimeMs: number;
    columnProfiles: ColumnProfile[];
  };
}

// ── Pipeline State ──────────────────────────────────────────────────────────
export type PipelineStage =
  | 'upload' | 'validation' | 'schema_detection' | 'column_mapping'
  | 'data_cleaning' | 'normalization' | 'business_context'
  | 'rule_engine' | 'ai_reasoning' | 'risk_scoring'
  | 'evidence_collection' | 'recommendations' | 'report_generation'
  | 'complete' | 'error';

export interface PipelineProgress {
  stage: PipelineStage;
  progress: number; // 0-100
  message: string;
  startedAt: number;
}

// ── Audit Result (full output of the pipeline) ─────────────────────────────
export interface AuditResult {
  report: AuditReport;
  cleanedData: AuditRecord[];
  mappedFields: CanonicalFields;
  domain: DatasetDomain;
  pipelineTimeMs: number;
}
