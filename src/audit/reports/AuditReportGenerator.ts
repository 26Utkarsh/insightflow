// ──────────────────────────────────────────────────────────────────────────────
// AuditReportGenerator – Professional audit report builder
// ──────────────────────────────────────────────────────────────────────────────
import { RiskSummary } from '../risk/RiskScorer';
import { AuditFinding, AuditReport, ColumnProfile, ComplianceCheck, DataQualityReport, DatasetDomain, FraudIndicator } from '../types';

interface ReportInput {
  datasetName: string;
  domain: DatasetDomain;
  findings: AuditFinding[];
  fraudIndicators: FraudIndicator[];
  complianceResults: ComplianceCheck[];
  dataQuality: DataQualityReport;
  riskSummary: RiskSummary;
  rootCauses: { category: string; count: number; severity: string; explanation: string }[];
  recommendations: string[];
  executiveSummary: string;
  overallAssessment: string;
  totalRecords: number;
  rulesExecuted: number;
  processingTimeMs: number;
  columnProfiles: ColumnProfile[];
}

export function generateAuditReport(input: ReportInput): AuditReport {
  const { datasetName, domain, findings, fraudIndicators, complianceResults, dataQuality, riskSummary, rootCauses, recommendations, executiveSummary, overallAssessment, totalRecords, rulesExecuted, processingTimeMs, columnProfiles } = input;

  const conclusion = generateConclusion(riskSummary, findings.length, fraudIndicators.length);
  const methodology = `InsightFlow Internal Audit Engine executed ${rulesExecuted} configurable audit rules, ${fraudIndicators.length > 0 ? 'advanced fraud detection algorithms (Benford\'s Law, pattern analysis, velocity checks),' : ''} and compliance framework validation against ${totalRecords.toLocaleString()} records in ${(processingTimeMs / 1000).toFixed(1)} seconds. AI reasoning layer ${executiveSummary.includes('local') ? 'used deterministic fallback analysis' : 'provided professional audit-grade assessment'}.`;

  return {
    id: `RPT-${Date.now().toString(36)}`,
    datasetName,
    domain,
    generatedAt: Date.now(),
    executiveSummary,
    methodology,
    scope: `Full-scope internal audit of "${datasetName}" dataset classified as ${domain}. ${totalRecords.toLocaleString()} records analyzed across ${columnProfiles.length} data fields. Audit coverage includes: data quality assessment, rule-based transaction testing, fraud risk analytics, compliance control evaluation, and AI-powered finding analysis.`,
    overallScore: riskSummary.overallScore,
    riskDistribution: riskSummary.riskDistribution,
    findings,
    fraudIndicators,
    complianceResults,
    dataQuality,
    rootCauses,
    recommendations,
    conclusion,
    appendix: {
      totalRecordsAnalyzed: totalRecords,
      rulesExecuted,
      processingTimeMs,
      columnProfiles,
    },
  };
}

function generateConclusion(riskSummary: RiskSummary, findingCount: number, fraudCount: number): string {
  const { overallScore, criticalCount, highCount } = riskSummary;
  if (criticalCount > 0) {
    return `The audit has identified ${criticalCount} critical and ${highCount} high-severity findings requiring immediate management action. The overall control environment score of ${overallScore}/100 indicates significant deficiencies. We recommend immediate escalation to the Audit Committee, implementation of corrective actions within 30 days, and a follow-up audit within 90 days to verify remediation effectiveness.`;
  }
  if (highCount > 3) {
    return `The audit identified ${highCount} high-severity findings with an overall score of ${overallScore}/100. While no critical issues were found, the control environment requires strengthening. Management should prioritize remediation of high-severity findings within 60 days and implement recommended preventive controls.`;
  }
  if (findingCount === 0) {
    return `No audit findings were identified. The control environment appears effective with a score of ${overallScore}/100. We recommend maintaining current controls and scheduling the next audit cycle per the annual audit plan.`;
  }
  return `The audit identified ${findingCount} findings with an overall control score of ${overallScore}/100. Findings are primarily ${riskSummary.riskDistribution.Medium > riskSummary.riskDistribution.High ? 'medium' : 'high'} severity. Management should review recommendations and implement improvements within the next audit cycle.`;
}

/**
 * Generate HTML version of the audit report for preview/print.
 */
export function generateHTMLReport(report: AuditReport): string {
  const fmt = (n: number) => new Intl.NumberFormat('en-US').format(n);
  const curr = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
  const date = new Date(report.generatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const sevColor = (s: string) => ({ Critical: '#dc2626', High: '#ea580c', Medium: '#ca8a04', Low: '#16a34a' } as any)[s] || '#6b7280';

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Internal Audit Report - ${report.datasetName}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1e293b; line-height: 1.6; max-width: 900px; margin: 0 auto; padding: 40px; }
  h1 { font-size: 28px; border-bottom: 3px solid #1e293b; padding-bottom: 12px; margin-bottom: 8px; }
  h2 { font-size: 20px; margin-top: 32px; margin-bottom: 12px; color: #0f172a; border-left: 4px solid #3b82f6; padding-left: 12px; }
  h3 { font-size: 16px; margin-top: 20px; margin-bottom: 8px; }
  .cover { text-align: center; padding: 80px 0; page-break-after: always; }
  .cover h1 { font-size: 42px; border: none; margin-bottom: 16px; }
  .cover .subtitle { font-size: 22px; color: #64748b; margin-bottom: 40px; }
  .cover .meta { color: #94a3b8; font-size: 14px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 16px 0; }
  .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center; }
  .kpi-card .label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600; }
  .kpi-card .value { font-size: 24px; font-weight: 800; margin-top: 4px; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 700; color: white; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
  th { background: #0f172a; color: white; padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; }
  td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
  tr:nth-child(even) { background: #f8fafc; }
  .section { margin-bottom: 24px; }
  .finding-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 12px 0; border-left: 4px solid #3b82f6; }
  .finding-card.critical { border-left-color: #dc2626; }
  .finding-card.high { border-left-color: #ea580c; }
  .finding-card.medium { border-left-color: #ca8a04; }
  ul { margin-left: 20px; margin-top: 8px; }
  li { margin-bottom: 4px; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center; }
  @media print { body { padding: 20px; } .cover { padding: 40px 0; } }
</style></head><body>
<div class="cover">
  <h1>Internal Audit Report</h1>
  <div class="subtitle">${report.datasetName}</div>
  <div class="meta">Domain: ${report.domain} | Generated: ${date} | InsightFlow Audit Engine</div>
</div>

<h1>Executive Summary</h1>
<p>${report.executiveSummary}</p>

<h2>Overall Audit Score</h2>
<div class="kpi-grid">
  <div class="kpi-card"><div class="label">Audit Score</div><div class="value" style="color:${report.overallScore >= 70 ? '#16a34a' : report.overallScore >= 40 ? '#ca8a04' : '#dc2626'}">${report.overallScore}/100</div></div>
  <div class="kpi-card"><div class="label">Total Findings</div><div class="value">${report.findings.length}</div></div>
  <div class="kpi-card"><div class="label">Fraud Indicators</div><div class="value">${report.fraudIndicators.length}</div></div>
  <div class="kpi-card"><div class="label">Data Quality</div><div class="value">${report.dataQuality.score}/100</div></div>
</div>

<h2>Risk Distribution</h2>
<div class="kpi-grid">
  <div class="kpi-card"><div class="label">Critical</div><div class="value" style="color:#dc2626">${report.riskDistribution.Critical}</div></div>
  <div class="kpi-card"><div class="label">High</div><div class="value" style="color:#ea580c">${report.riskDistribution.High}</div></div>
  <div class="kpi-card"><div class="label">Medium</div><div class="value" style="color:#ca8a04">${report.riskDistribution.Medium}</div></div>
  <div class="kpi-card"><div class="label">Low</div><div class="value" style="color:#16a34a">${report.riskDistribution.Low}</div></div>
</div>

<h2>Methodology &amp; Scope</h2>
<p><strong>Methodology:</strong> ${report.methodology}</p>
<p><strong>Scope:</strong> ${report.scope}</p>

<h2>Key Findings</h2>
${report.findings.slice(0, 15).map(f => `
<div class="finding-card ${f.severity.toLowerCase()}">
  <h3>${f.title} <span class="badge" style="background:${sevColor(f.severity)}">${f.severity}</span></h3>
  <p><strong>Rule:</strong> ${f.ruleName} | <strong>Category:</strong> ${f.category} | <strong>Risk Score:</strong> ${f.risk.score}/100 | <strong>Affected Records:</strong> ${fmt(f.affectedRowCount)}</p>
  <p>${f.description}</p>
  ${f.aiReasoning ? `<p><strong>AI Assessment:</strong> ${f.aiReasoning.whySuspicious}</p>` : ''}
  ${f.recommendations ? `<p><strong>Recommendation:</strong> ${f.recommendations.business}</p>` : ''}
</div>`).join('')}

${report.fraudIndicators.length > 0 ? `<h2>Fraud Indicators</h2>
${report.fraudIndicators.map(fi => `
<div class="finding-card ${fi.severity.toLowerCase()}">
  <h3>${fi.pattern} <span class="badge" style="background:${sevColor(fi.severity)}">${fi.severity}</span></h3>
  <p>${fi.description}</p>
  <p><strong>Confidence:</strong> ${fi.confidence}% | <strong>Affected Records:</strong> ${fi.affectedRows.length}</p>
</div>`).join('')}` : ''}

<h2>Compliance Status</h2>
<table>
  <tr><th>Framework</th><th>Control</th><th>Status</th><th>Severity</th></tr>
  ${report.complianceResults.map(c => `<tr><td>${c.framework}</td><td>${c.control}</td><td><span class="badge" style="background:${c.status === 'Pass' ? '#16a34a' : c.status === 'Fail' ? '#dc2626' : '#ca8a04'}">${c.status}</span></td><td>${c.severity}</td></tr>`).join('')}
</table>

<h2>Root Cause Analysis</h2>
<table>
  <tr><th>Category</th><th>Findings</th><th>Severity</th><th>Explanation</th></tr>
  ${report.rootCauses.map(rc => `<tr><td>${rc.category}</td><td>${rc.count}</td><td><span class="badge" style="background:${sevColor(rc.severity)}">${rc.severity}</span></td><td>${rc.explanation}</td></tr>`).join('')}
</table>

<h2>Recommendations</h2>
<ul>${report.recommendations.map(r => `<li>${r}</li>`).join('')}</ul>

<h2>Audit Conclusion</h2>
<p>${report.conclusion}</p>

<h2>Appendix</h2>
<p><strong>Total Records Analyzed:</strong> ${fmt(report.appendix.totalRecordsAnalyzed)}</p>
<p><strong>Rules Executed:</strong> ${report.appendix.rulesExecuted}</p>
<p><strong>Processing Time:</strong> ${(report.appendix.processingTimeMs / 1000).toFixed(1)}s</p>

<div class="footer">
  InsightFlow Internal Audit Report | Generated ${date} | Confidential
</div>
</body></html>`;
}
