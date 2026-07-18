// ──────────────────────────────────────────────────────────────────────────────
// RiskScorer – Multi-dimensional risk scoring and aggregation
// ──────────────────────────────────────────────────────────────────────────────
import { AuditFinding, FraudIndicator, SeverityLevel } from '../types';

export interface RiskSummary {
  overallScore: number; // 0-100 (higher = better control environment)
  riskDistribution: Record<SeverityLevel, number>;
  categoryDistribution: Record<string, number>;
  departmentRisk: { name: string; score: number; count: number }[];
  topFindings: AuditFinding[];
  averageRiskScore: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
}

const SEVERITY_WEIGHT: Record<SeverityLevel, number> = { Critical: 40, High: 25, Medium: 10, Low: 3 };

/**
 * Compute overall audit score (100 = clean, 0 = many critical issues).
 */
export function computeOverallScore(findings: AuditFinding[], fraudIndicators: FraudIndicator[], totalRecords: number): number {
  if (findings.length === 0 && fraudIndicators.length === 0) return 100;

  let deduction = 0;
  for (const f of findings) {
    deduction += SEVERITY_WEIGHT[f.severity] * (f.risk.score / 100);
  }
  for (const fi of fraudIndicators) {
    deduction += SEVERITY_WEIGHT[fi.severity] * (fi.confidence / 100);
  }
  // Normalize by total records (larger datasets get more lenient scoring)
  const normalizationFactor = Math.max(1, Math.log10(totalRecords + 1));
  deduction = deduction / normalizationFactor;

  return Math.max(0, Math.min(100, Math.round(100 - deduction)));
}

/**
 * Generate full risk summary from audit results.
 */
export function generateRiskSummary(findings: AuditFinding[], fraudIndicators: FraudIndicator[], totalRecords: number): RiskSummary {
  const riskDistribution: Record<SeverityLevel, number> = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  const categoryDistribution: Record<string, number> = {};
  const deptMap = new Map<string, { score: number; count: number }>();

  for (const f of findings) {
    riskDistribution[f.severity]++;
    categoryDistribution[f.category] = (categoryDistribution[f.category] || 0) + 1;

    // Department risk from evidence
    for (const ev of f.evidence) {
      const dept = ev.fields['department'] || ev.fields['Department'] || 'Unknown';
      const deptStr = String(dept);
      const curr = deptMap.get(deptStr) || { score: 0, count: 0 };
      curr.score += f.risk.score;
      curr.count++;
      deptMap.set(deptStr, curr);
    }
  }

  const departmentRisk = Array.from(deptMap.entries())
    .map(([name, d]) => ({ name, score: Math.round(d.score / d.count), count: d.count }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  const allScores = findings.map(f => f.risk.score);
  const averageRiskScore = allScores.length > 0 ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;

  const topFindings = [...findings].sort((a, b) => b.risk.score - a.risk.score).slice(0, 10);

  return {
    overallScore: computeOverallScore(findings, fraudIndicators, totalRecords),
    riskDistribution,
    categoryDistribution,
    departmentRisk,
    topFindings,
    averageRiskScore,
    criticalCount: riskDistribution.Critical,
    highCount: riskDistribution.High,
    mediumCount: riskDistribution.Medium,
    lowCount: riskDistribution.Low,
  };
}

/**
 * Get color for severity level.
 */
export function getSeverityColor(severity: SeverityLevel): string {
  switch (severity) {
    case 'Critical': return '#ef4444';
    case 'High': return '#f97316';
    case 'Medium': return '#eab308';
    case 'Low': return '#22c55e';
  }
}

/**
 * Get score color (0=red, 100=green).
 */
export function getScoreColor(score: number): string {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#eab308';
  if (score >= 40) return '#f97316';
  return '#ef4444';
}
