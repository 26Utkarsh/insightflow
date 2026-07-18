// ──────────────────────────────────────────────────────────────────────────────
// PDFReport – Professional PDF audit report using jsPDF
// ──────────────────────────────────────────────────────────────────────────────
import jsPDF from 'jspdf';
import { AuditReport } from '../types';

const COLORS: Record<string, [number, number, number]> = {
  Critical: [220, 38, 38],
  High: [234, 88, 12],
  Medium: [202, 138, 4],
  Low: [22, 163, 74],
  primary: [15, 23, 42],
  secondary: [100, 116, 139],
  accent: [59, 130, 246],
  white: [255, 255, 255],
  bg: [248, 250, 252],
};

export function generatePDFReport(report: AuditReport): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentW = pageW - margin * 2;
  let y = margin;

  function addPage() {
    doc.addPage();
    y = margin;
    drawFooter();
  }

  function drawFooter() {
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.secondary);
    doc.text(`InsightFlow Internal Audit Report | ${new Date(report.generatedAt).toLocaleDateString()} | Confidential`, pageW / 2, pageH - 10, { align: 'center' });
  }

  function checkSpace(needed: number) {
    if (y + needed > pageH - 20) addPage();
  }

  function drawSectionHeader(title: string) {
    checkSpace(12);
    doc.setFillColor(...COLORS.accent);
    doc.rect(margin, y, 3, 8, 'F');
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text(title, margin + 6, y + 6);
    y += 12;
  }

  function drawKpiRow(items: { label: string; value: string; color: [number, number, number] }[]) {
    const boxW = (contentW - (items.length - 1) * 3) / items.length;
    for (let i = 0; i < items.length; i++) {
      const x = margin + i * (boxW + 3);
      doc.setFillColor(...COLORS.bg);
      doc.roundedRect(x, y, boxW, 18, 2, 2, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.secondary);
      doc.text(items[i].label.toUpperCase(), x + boxW / 2, y + 5, { align: 'center' });
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...items[i].color);
      doc.text(items[i].value, x + boxW / 2, y + 14, { align: 'center' });
    }
    y += 22;
  }

  function drawText(text: string, size = 10, bold = false) {
    doc.setFontSize(size);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(...COLORS.primary);
    const lines = doc.splitTextToSize(text, contentW);
    for (const line of lines) {
      checkSpace(6);
      doc.text(line, margin, y);
      y += size * 0.4 + 1;
    }
  }

  // ── Cover Page ──
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageW, pageH, 'F');

  doc.setFontSize(36);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.white);
  doc.text('Internal Audit Report', pageW / 2, pageH * 0.35, { align: 'center' });

  doc.setFontSize(18);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(report.datasetName, pageW / 2, pageH * 0.35 + 15, { align: 'center' });

  doc.setFontSize(12);
  doc.text(`Domain: ${report.domain}`, pageW / 2, pageH * 0.5, { align: 'center' });
  doc.text(`Generated: ${new Date(report.generatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, pageW / 2, pageH * 0.5 + 8, { align: 'center' });
  doc.text('InsightFlow Audit Engine', pageW / 2, pageH * 0.5 + 16, { align: 'center' });

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('CONFIDENTIAL', pageW / 2, pageH - 20, { align: 'center' });

  // ── Executive Summary ──
  addPage();
  drawFooter();
  drawSectionHeader('Executive Summary');
  drawText(report.executiveSummary);
  y += 4;

  // ── KPIs ──
  const scoreColor: [number, number, number] = report.overallScore >= 70 ? COLORS.Low : report.overallScore >= 40 ? COLORS.Medium : COLORS.Critical;
  drawKpiRow([
    { label: 'Audit Score', value: `${report.overallScore}/100`, color: scoreColor },
    { label: 'Findings', value: `${report.findings.length}`, color: report.findings.length > 0 ? COLORS.High : COLORS.Low },
    { label: 'Fraud Indicators', value: `${report.fraudIndicators.length}`, color: report.fraudIndicators.length > 0 ? COLORS.Critical : COLORS.Low },
    { label: 'Data Quality', value: `${report.dataQuality.score}/100`, color: report.dataQuality.score >= 70 ? COLORS.Low : COLORS.Medium },
  ]);

  // ── Risk Distribution ──
  drawSectionHeader('Risk Distribution');
  drawKpiRow([
    { label: 'Critical', value: `${report.riskDistribution.Critical}`, color: COLORS.Critical },
    { label: 'High', value: `${report.riskDistribution.High}`, color: COLORS.High },
    { label: 'Medium', value: `${report.riskDistribution.Medium}`, color: COLORS.Medium },
    { label: 'Low', value: `${report.riskDistribution.Low}`, color: COLORS.Low },
  ]);

  // ── Methodology & Scope ──
  drawSectionHeader('Methodology & Scope');
  drawText(`Methodology: ${report.methodology}`, 9);
  y += 2;
  drawText(`Scope: ${report.scope}`, 9);
  y += 4;

  // ── Key Findings ──
  drawSectionHeader('Key Findings');
  const topFindings = report.findings.slice(0, 15);
  for (const f of topFindings) {
    checkSpace(28);
    // Finding card
    doc.setFillColor(...COLORS.bg);
    const cardH = 22;
    doc.roundedRect(margin, y, contentW, cardH, 2, 2, 'F');
    // Severity indicator
    const sevColor = COLORS[f.severity] || COLORS.secondary;
    doc.setFillColor(...sevColor);
    doc.roundedRect(margin, y, 3, cardH, 1, 1, 'F');
    // Title
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text(f.title, margin + 6, y + 5);
    // Badge
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...sevColor);
    doc.text(f.severity.toUpperCase(), margin + 6 + doc.getTextWidth(f.title) + 3, y + 5);
    // Details
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.secondary);
    doc.text(`Rule: ${f.ruleName} | Category: ${f.category} | Score: ${f.risk.score}/100 | Records: ${f.affectedRowCount}`, margin + 6, y + 11);
    // Description
    const desc = doc.splitTextToSize(f.description, contentW - 12);
    doc.text(desc[0] || '', margin + 6, y + 17);
    y += cardH + 3;
  }

  // ── Compliance Status ──
  if (report.complianceResults.length > 0) {
    drawSectionHeader('Compliance Status');
    // Table header
    doc.setFillColor(...COLORS.primary);
    doc.rect(margin, y, contentW, 7, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.white);
    const colW = [contentW * 0.25, contentW * 0.3, contentW * 0.15, contentW * 0.15, contentW * 0.15];
    const headers = ['Framework', 'Control', 'Status', 'Severity', ''];
    let cx = margin;
    for (let i = 0; i < headers.length; i++) {
      doc.text(headers[i], cx + 2, y + 5);
      cx += colW[i];
    }
    y += 7;

    for (const c of report.complianceResults) {
      checkSpace(7);
      doc.setFillColor(...COLORS.bg);
      doc.rect(margin, y, contentW, 6, 'F');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.primary);
      cx = margin;
      const vals = [c.framework, c.control, c.status, c.severity];
      for (let i = 0; i < vals.length; i++) {
        if (i === 2) {
          const statusColor = c.status === 'Pass' ? COLORS.Low : c.status === 'Fail' ? COLORS.Critical : COLORS.Medium;
          doc.setTextColor(...statusColor);
        } else {
          doc.setTextColor(...COLORS.primary);
        }
        doc.text(vals[i], cx + 2, y + 4);
        cx += colW[i];
      }
      y += 6;
    }
    y += 4;
  }

  // ── Recommendations ──
  drawSectionHeader('Recommendations');
  for (const rec of report.recommendations) {
    checkSpace(8);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.primary);
    const bulletLines = doc.splitTextToSize(`• ${rec}`, contentW - 4);
    for (const line of bulletLines) {
      checkSpace(5);
      doc.text(line, margin + 2, y);
      y += 4.5;
    }
  }

  // ── Conclusion ──
  y += 4;
  drawSectionHeader('Audit Conclusion');
  drawText(report.conclusion);

  // ── Appendix ──
  y += 4;
  drawSectionHeader('Appendix');
  drawText(`Total Records Analyzed: ${report.appendix.totalRecordsAnalyzed.toLocaleString()}`, 9);
  drawText(`Rules Executed: ${report.appendix.rulesExecuted}`, 9);
  drawText(`Processing Time: ${(report.appendix.processingTimeMs / 1000).toFixed(1)}s`, 9);

  return doc;
}

/**
 * Download the PDF report directly.
 */
export function downloadPDFReport(report: AuditReport) {
  const doc = generatePDFReport(report);
  doc.save(`audit-report-${report.datasetName}.pdf`);
}
