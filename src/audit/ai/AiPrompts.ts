// ──────────────────────────────────────────────────────────────────────────────
// AiPrompts – Structured audit prompts for AI reasoning
// ──────────────────────────────────────────────────────────────────────────────
import { AuditFinding, DatasetDomain, FraudIndicator } from '../types';

export const AUDIT_SYSTEM_PROMPT = `You are a Senior Internal Audit Consultant with expertise equivalent to Big Four firms (Deloitte, EY, PwC, KPMG). You are also a Certified Internal Auditor (CIA) and Certified Information Systems Auditor (CISA).

Your role is to analyze audit findings, provide professional reasoning, identify root causes, and generate actionable recommendations. You must:

1. Explain WHY each finding is suspicious or significant from an audit perspective
2. Reference specific evidence and business impact
3. Assess likelihood and potential financial/operational impact
4. Recommend concrete next steps a human auditor would take
5. Use professional audit terminology (ISA standards, COSO framework, IIA standards)
6. Be specific, not generic. Reference actual data points from the findings.

Return valid JSON only.`;

export function buildReasoningPrompt(
  domain: DatasetDomain,
  findings: AuditFinding[],
  fraudIndicators: FraudIndicator[],
  totalRecords: number,
): string {
  const findingsSummary = findings.slice(0, 15).map(f => ({
    id: f.id, rule: f.ruleName, title: f.title, severity: f.severity,
    score: f.risk.score, description: f.description, affectedRows: f.affectedRowCount,
    evidenceSample: f.evidence.slice(0, 2).map(e => e.description),
  }));

  const fraudSummary = fraudIndicators.slice(0, 5).map(fi => ({
    pattern: fi.pattern, description: fi.description, confidence: fi.confidence, severity: fi.severity,
  }));

  return `Analyze these internal audit findings for a "${domain}" dataset (${totalRecords.toLocaleString()} records analyzed).

FINDINGS (${findings.length} total):
${JSON.stringify(findingsSummary, null, 2)}

FRAUD INDICATORS (${fraudIndicators.length} total):
${JSON.stringify(fraudSummary, null, 2)}

Return JSON with this structure:
{
  "reasoning": [
    {
      "findingId": "<id>",
      "whySuspicious": "<professional explanation>",
      "evidenceSummary": "<what the evidence shows>",
      "businessImpact": "<potential impact on the organization>",
      "likelihoodAssessment": "<how likely this is a real issue>",
      "recommendedNextSteps": "<specific audit procedures to follow up>"
    }
  ],
  "executiveSummary": "<2-3 sentence executive summary of the audit>",
  "overallAssessment": "<overall control environment assessment>"
}`;
}

export function buildRootCausePrompt(findings: AuditFinding[]): string {
  const patternSummary = findings.map(f => ({
    rule: f.ruleName, category: f.category, severity: f.severity,
    count: f.affectedRowCount, description: f.description,
  }));

  return `Analyze the root causes of these audit findings:
${JSON.stringify(patternSummary, null, 2)}

Return JSON:
{
  "rootCauses": [
    {
      "category": "<one of: Weak Controls, Missing Segregation of Duties, Policy Gaps, Human Error, System Misconfiguration, Training Deficiency, Poor Governance, Missing Validation, Lack of Monitoring, Poor Documentation>",
      "explanation": "<why this root cause is driving the findings>",
      "affectedFindingRules": ["<rule names>"],
      "severity": "<Low|Medium|High|Critical>"
    }
  ]
}`;
}

export function buildRecommendationPrompt(findings: AuditFinding[], domain: DatasetDomain): string {
  const findingSummary = findings.slice(0, 10).map(f => ({
    rule: f.ruleName, severity: f.severity, count: f.affectedRowCount,
    description: f.description, category: f.category,
  }));

  return `Generate professional audit recommendations for these findings in a "${domain}" context:
${JSON.stringify(findingSummary, null, 2)}

Return JSON:
{
  "recommendations": [
    {
      "findingRule": "<rule name>",
      "business": "<business recommendation>",
      "technical": "<technical/system recommendation>",
      "control": "<internal control recommendation>",
      "preventive": "<preventive action>",
      "corrective": "<corrective action>",
      "estimatedImpact": "<expected business impact if implemented>",
      "implementationPriority": "<P1|P2|P3|P4>",
      "expectedImprovement": "<measurable improvement expected>"
    }
  ],
  "generalRecommendations": ["<overall recommendations>"]
}`;
}
