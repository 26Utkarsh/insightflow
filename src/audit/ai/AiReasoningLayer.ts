// ──────────────────────────────────────────────────────────────────────────────
// AiReasoningLayer – AI reasoning over audit findings
// ──────────────────────────────────────────────────────────────────────────────
import { AuditFinding, DatasetDomain, FraudIndicator } from '../types';
import { AUDIT_SYSTEM_PROMPT, buildReasoningPrompt } from './AiPrompts';

interface AiReasoningResult {
  reasoning: {
    findingId: string;
    whySuspicious: string;
    evidenceSummary: string;
    businessImpact: string;
    likelihoodAssessment: string;
    recommendedNextSteps: string;
  }[];
  executiveSummary: string;
  overallAssessment: string;
  model: string;
  aiAvailable: boolean;
}

/**
 * Generate local fallback reasoning when AI is unavailable.
 */
function localReasoning(findings: AuditFinding[], fraudIndicators: FraudIndicator[], domain: DatasetDomain): AiReasoningResult {
  const reasoning = findings.map(f => ({
    findingId: f.id,
    whySuspicious: `This finding represents a ${f.severity.toLowerCase()}-severity ${f.category.toLowerCase()} issue: ${f.description}`,
    evidenceSummary: `${f.affectedRowCount} records affected. Evidence includes ${f.evidence.length} linked records with transaction details.`,
    businessImpact: f.severity === 'Critical'
      ? 'Potential material misstatement or fraud risk requiring immediate investigation and management escalation.'
      : f.severity === 'High'
        ? 'Significant control weakness that could lead to financial loss or regulatory non-compliance.'
        : f.severity === 'Medium'
          ? 'Control gap that may result in operational inefficiency or moderate financial exposure.'
          : 'Minor issue with limited immediate impact but should be monitored for trend deterioration.',
    likelihoodAssessment: f.severity === 'Critical' ? 'Very high likelihood of a genuine issue based on pattern analysis.'
      : f.severity === 'High' ? 'High likelihood; pattern is consistent with known control deficiencies.'
      : 'Moderate likelihood; further investigation recommended to confirm.',
    recommendedNextSteps: f.severity === 'Critical'
      ? '1. Immediately escalate to audit committee. 2. Perform detailed transaction testing. 3. Interview responsible parties. 4. Preserve evidence chain.'
      : f.severity === 'High'
        ? '1. Schedule follow-up audit procedure. 2. Review supporting documentation. 3. Assess control design and operating effectiveness.'
        : '1. Include in next audit cycle review. 2. Monitor for recurrence. 3. Verify management remediation actions.',
  }));

  const critCount = findings.filter(f => f.severity === 'Critical').length;
  const highCount = findings.filter(f => f.severity === 'High').length;

  return {
    reasoning,
    executiveSummary: `The internal audit of the ${domain} dataset identified ${findings.length} findings (${critCount} critical, ${highCount} high severity) and ${fraudIndicators.length} fraud indicators across the analyzed records. ${critCount > 0 ? 'Critical issues require immediate management attention.' : highCount > 0 ? 'Several high-severity issues should be addressed promptly.' : 'Overall control environment shows manageable risk levels.'}`,
    overallAssessment: critCount > 0 ? 'Significant control deficiencies identified requiring immediate remediation.'
      : highCount > 3 ? 'Multiple high-risk areas identified; control environment requires strengthening.'
      : 'Control environment is generally adequate with identified areas for improvement.',
    model: 'local-fallback',
    aiAvailable: false,
  };
}

/**
 * Execute AI reasoning over audit findings.
 * Falls back to local deterministic reasoning if AI is unavailable.
 */
export async function runAiReasoning(
  domain: DatasetDomain,
  findings: AuditFinding[],
  fraudIndicators: FraudIndicator[],
  totalRecords: number,
): Promise<AiReasoningResult> {
  if (findings.length === 0) {
    return {
      reasoning: [],
      executiveSummary: `No audit findings were identified in the ${domain} dataset of ${totalRecords.toLocaleString()} records. The control environment appears effective.`,
      overallAssessment: 'No significant issues identified. Control environment is operating effectively.',
      model: 'local',
      aiAvailable: false,
    };
  }

  try {
    const prompt = buildReasoningPrompt(domain, findings, fraudIndicators, totalRecords);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    const response = await fetch('/api/audit/ai-reasoning', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, systemPrompt: AUDIT_SYSTEM_PROMPT }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    if (data.aiAvailable && data.result?.reasoning) {
      return { ...data.result, model: data.model, aiAvailable: true };
    }
    throw new Error(data.error || 'AI returned no results');
  } catch {
    return localReasoning(findings, fraudIndicators, domain);
  }
}

export type { AiReasoningResult };

