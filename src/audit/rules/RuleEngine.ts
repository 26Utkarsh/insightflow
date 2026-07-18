// ──────────────────────────────────────────────────────────────────────────────
// RuleEngine – Configurable audit rule executor
// ──────────────────────────────────────────────────────────────────────────────
import { getFieldValue } from '../pipeline/ColumnMapper';
import { AuditFinding, AuditRecord, AuditRule, CanonicalFields, DatasetDomain, EvidenceItem, Priority, RiskAssessment, RuleResult, SeverityLevel } from '../types';
import { getApplicableRules } from './RuleRegistry';

interface EngineResult {
  findings: AuditFinding[];
  rulesExecuted: number;
  totalViolations: number;
  executionTimeMs: number;
}

function generateId(): string {
  return `F-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function computePriority(score: number): Priority {
  if (score > 80) return 'P1';
  if (score > 60) return 'P2';
  if (score > 40) return 'P3';
  return 'P4';
}

function severityFromRule(sev: SeverityLevel): SeverityLevel { return sev; }

function computeRiskScore(severity: SeverityLevel, riskWeight: number, affectedCount: number): number {
  const sevMap: Record<SeverityLevel, number> = { Critical: 40, High: 30, Medium: 20, Low: 10 };
  const baseScore = sevMap[severity];
  const weightBonus = riskWeight * 3;
  const countBonus = Math.min(20, Math.log2(affectedCount + 1) * 5);
  return Math.min(100, Math.round(baseScore + weightBonus + countBonus));
}

function buildRiskAssessment(rule: AuditRule, result: RuleResult, _records: AuditRecord[]): RiskAssessment {
  const severity = result.severity || rule.severity;
  const score = computeRiskScore(severity, rule.riskWeight, result.rowIndices.length);
  const likelihoodMap: Record<SeverityLevel, 1 | 2 | 3 | 4 | 5> = { Critical: 5, High: 4, Medium: 3, Low: 2 };
  const impactMap: Record<SeverityLevel, 1 | 2 | 3 | 4 | 5> = { Critical: 5, High: 4, Medium: 3, Low: 2 };

  return {
    likelihood: likelihoodMap[severity],
    impact: impactMap[severity],
    severity,
    score,
    category: rule.category,
    businessArea: rule.applicableDomains.length > 0 ? rule.applicableDomains.join(', ') : 'General',
    priority: computePriority(score),
    confidence: Math.min(95, 60 + result.rowIndices.length * 2),
    criticality: severity,
  };
}

function buildEvidence(result: RuleResult, records: AuditRecord[], fields: CanonicalFields, fileName?: string): EvidenceItem[] {
  return result.rowIndices.slice(0, 20).map(idx => {
    const record = records[idx];
    const evFields: Record<string, string | number | null> = {};
    // Include key mapped fields in evidence
    const keysToInclude: (keyof CanonicalFields)[] = ['id', 'date', 'amount', 'vendor', 'employee', 'department', 'reference', 'approver', 'status'];
    for (const k of keysToInclude) {
      if (fields[k]) {
        const v = getFieldValue(record, fields, k);
        evFields[k] = v !== null && v !== undefined ? (typeof v === 'number' ? v : String(v)) : null;
      }
    }
    // Also include the raw fields from result
    if (result.fields) {
      Object.entries(result.fields).slice(0, 5).forEach(([fk, fv]) => {
        if (!(fk in evFields)) evFields[fk] = fv as any;
      });
    }
    return {
      rowIndex: idx,
      recordId: fields.id ? String(record[fields.id] ?? '') : undefined,
      fields: evFields,
      sourceFile: fileName,
      description: `Row ${idx + 1}: ${result.description}`,
    };
  });
}

/**
 * Execute all applicable rules against the dataset.
 */
export function executeRules(
  records: AuditRecord[],
  fields: CanonicalFields,
  domain: DatasetDomain,
  fileName?: string,
  customRules?: AuditRule[],
): EngineResult {
  const startTime = Date.now();
  const rules = getApplicableRules(domain, customRules);
  const findings: AuditFinding[] = [];
  let totalViolations = 0;

  for (const rule of rules) {
    try {
      const results = rule.execute(records, fields, rule.parameters);
      for (const result of results) {
        const risk = buildRiskAssessment(rule, result, records);
        const evidence = buildEvidence(result, records, fields, fileName);
        findings.push({
          id: generateId(),
          ruleId: rule.id,
          ruleName: rule.name,
          category: rule.category,
          title: result.title,
          description: result.description,
          severity: severityFromRule(result.severity || rule.severity),
          risk,
          evidence,
          affectedRowCount: result.rowIndices.length,
          timestamp: Date.now(),
        });
        totalViolations += result.rowIndices.length;
      }
    } catch (err) {
      console.error(`Rule ${rule.id} (${rule.name}) execution failed:`, err);
      // Continue with other rules – no silent failure, but don't stop the pipeline
    }
  }

  return {
    findings,
    rulesExecuted: rules.length,
    totalViolations,
    executionTimeMs: Date.now() - startTime,
  };
}
