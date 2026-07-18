// ──────────────────────────────────────────────────────────────────────────────
// DOCXReport – Professional Word audit report using docx library
// ──────────────────────────────────────────────────────────────────────────────
import {
    AlignmentType, BorderStyle,
    Document,
    Footer,
    Header,
    HeadingLevel,
    Packer,
    Paragraph,
    ShadingType,
    Table,
    TableCell,
    TableRow,
    TextRun,
    WidthType
} from 'docx';
import { AuditReport } from '../types';

const SEV_COLORS: Record<string, string> = {
  Critical: 'DC2626',
  High: 'EA580C',
  Medium: 'CA8A04',
  Low: '16A34A',
};

export async function generateDOCXReport(report: AuditReport): Promise<Blob> {
  const date = new Date(report.generatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: 'Calibri', size: 22 } },
        heading1: { run: { font: 'Calibri', size: 36, bold: true, color: '0F172A' } },
        heading2: { run: { font: 'Calibri', size: 28, bold: true, color: '1E40AF' } },
        heading3: { run: { font: 'Calibri', size: 24, bold: true, color: '334155' } },
      },
    },
    sections: [
      // Cover Page
      {
        children: [
          new Paragraph({ spacing: { before: 3000 }, children: [] }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'Internal Audit Report', bold: true, size: 56, font: 'Calibri', color: '0F172A' })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200 },
            children: [new TextRun({ text: report.datasetName, size: 36, font: 'Calibri', color: '64748B' })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 400 },
            children: [new TextRun({ text: `Domain: ${report.domain}`, size: 24, color: '94A3B8' })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 100 },
            children: [new TextRun({ text: `Generated: ${date}`, size: 24, color: '94A3B8' })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 100 },
            children: [new TextRun({ text: 'InsightFlow Audit Engine', size: 24, color: '94A3B8' })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 2000 },
            children: [new TextRun({ text: 'CONFIDENTIAL', size: 20, color: '94A3B8', bold: true })],
          }),
        ],
      },
      // Main Content
      {
        headers: {
          default: new Header({
            children: [new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [new TextRun({ text: 'InsightFlow Internal Audit Report', size: 16, color: '94A3B8', italics: true })],
            })],
          }),
        },
        footers: {
          default: new Footer({
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: 'Confidential', size: 16, color: '94A3B8' })],
            })],
          }),
        },
        children: [
          // Executive Summary
          heading('Executive Summary', HeadingLevel.HEADING_1),
          bodyPara(report.executiveSummary),
          spacer(),

          // KPI Summary Table
          heading('Overall Audit Score', HeadingLevel.HEADING_2),
          createKpiTable(report),
          spacer(),

          // Risk Distribution
          heading('Risk Distribution', HeadingLevel.HEADING_2),
          createRiskTable(report),
          spacer(),

          // Methodology
          heading('Methodology & Scope', HeadingLevel.HEADING_2),
          bodyPara(`Methodology: ${report.methodology}`),
          bodyPara(`Scope: ${report.scope}`),
          spacer(),

          // Key Findings
          heading('Key Findings', HeadingLevel.HEADING_2),
          ...report.findings.slice(0, 20).flatMap(f => [
            heading(`${f.severity} – ${f.title}`, HeadingLevel.HEADING_3),
            bodyPara(`Rule: ${f.ruleName} | Category: ${f.category} | Risk Score: ${f.risk.score}/100 | Affected Records: ${f.affectedRowCount}`),
            bodyPara(f.description),
            ...(f.aiReasoning ? [bodyPara(`AI Assessment: ${f.aiReasoning.whySuspicious}`)] : []),
            ...(f.recommendations ? [bodyPara(`Recommendation: ${f.recommendations.business}`)] : []),
            spacer(),
          ]),

          // Fraud Indicators
          ...(report.fraudIndicators.length > 0 ? [
            heading('Fraud Indicators', HeadingLevel.HEADING_2),
            ...report.fraudIndicators.map(fi => bodyPara(`[${fi.severity}] ${fi.pattern}: ${fi.description} (Confidence: ${fi.confidence}%, Records: ${fi.affectedRows.length})`)),
            spacer(),
          ] : []),

          // Compliance
          heading('Compliance Status', HeadingLevel.HEADING_2),
          createComplianceTable(report),
          spacer(),

          // Root Causes
          heading('Root Cause Analysis', HeadingLevel.HEADING_2),
          ...report.rootCauses.map(rc => bodyPara(`${rc.category} (${rc.count} findings, ${rc.severity}): ${rc.explanation}`)),
          spacer(),

          // Recommendations
          heading('Recommendations', HeadingLevel.HEADING_2),
          ...report.recommendations.map(r => bulletPara(r)),
          spacer(),

          // Conclusion
          heading('Audit Conclusion', HeadingLevel.HEADING_2),
          bodyPara(report.conclusion),
          spacer(),

          // Appendix
          heading('Appendix', HeadingLevel.HEADING_2),
          bodyPara(`Total Records Analyzed: ${report.appendix.totalRecordsAnalyzed.toLocaleString()}`),
          bodyPara(`Rules Executed: ${report.appendix.rulesExecuted}`),
          bodyPara(`Processing Time: ${(report.appendix.processingTimeMs / 1000).toFixed(1)}s`),
        ],
      },
    ],
  });

  return Packer.toBlob(doc);
}

export async function downloadDOCXReport(report: AuditReport) {
  const blob = await generateDOCXReport(report);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `audit-report-${report.datasetName}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Helper functions ────────────────────────────────────────────────────────

function heading(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel]) {
  return new Paragraph({ heading: level, children: [new TextRun({ text })] });
}

function bodyPara(text: string) {
  return new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text, size: 22 })] });
}

function bulletPara(text: string) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 60 },
    children: [new TextRun({ text, size: 22 })],
  });
}

function spacer() {
  return new Paragraph({ spacing: { after: 200 }, children: [] });
}

function createKpiTable(report: AuditReport) {
  const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const borders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };
  const kpis = [
    { label: 'Audit Score', value: `${report.overallScore}/100` },
    { label: 'Total Findings', value: `${report.findings.length}` },
    { label: 'Fraud Indicators', value: `${report.fraudIndicators.length}` },
    { label: 'Data Quality', value: `${report.dataQuality.score}/100` },
  ];
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: kpis.map(k => new TableCell({
          borders,
          shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
          children: [
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: k.label.toUpperCase(), size: 16, bold: true, color: '64748B' })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: k.value, size: 28, bold: true, color: '0F172A' })] }),
          ],
        })),
      }),
    ],
  });
}

function createRiskTable(report: AuditReport) {
  const items = [
    { severity: 'Critical', count: report.riskDistribution.Critical },
    { severity: 'High', count: report.riskDistribution.High },
    { severity: 'Medium', count: report.riskDistribution.Medium },
    { severity: 'Low', count: report.riskDistribution.Low },
  ];
  const thinBorder = { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' };
  const borders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: ['Severity', 'Count'].map(h => new TableCell({
          borders,
          shading: { fill: '0F172A', type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: 'FFFFFF', size: 20 })] })],
        })),
      }),
      ...items.map(item => new TableRow({
        children: [
          new TableCell({ borders, children: [new Paragraph({ children: [new TextRun({ text: item.severity, color: SEV_COLORS[item.severity] || '000000', bold: true, size: 20 })] })] }),
          new TableCell({ borders, children: [new Paragraph({ children: [new TextRun({ text: `${item.count}`, size: 20 })] })] }),
        ],
      })),
    ],
  });
}

function createComplianceTable(report: AuditReport) {
  const thinBorder = { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' };
  const borders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
  const headers = ['Framework', 'Control', 'Status', 'Severity'];
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: headers.map(h => new TableCell({
          borders,
          shading: { fill: '0F172A', type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: 'FFFFFF', size: 18 })] })],
        })),
      }),
      ...report.complianceResults.map(c => new TableRow({
        children: [c.framework, c.control, c.status, c.severity].map((v, i) => new TableCell({
          borders,
          children: [new Paragraph({ children: [new TextRun({ text: v, size: 18, color: i === 2 ? (v === 'Pass' ? '16A34A' : v === 'Fail' ? 'DC2626' : 'CA8A04') : '000000' })] })],
        })),
      })),
    ],
  });
}
