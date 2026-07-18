import { Dataset } from '../types';

const getChartImage = async (chartId: string, scale: number = 4): Promise<string | null> => {
  const element = document.getElementById(chartId);
  if (!element) return null;
  const isDark = document.documentElement.classList.contains('dark');
  const bgColor = isDark ? '#1e293b' : '#ffffff';
  
  try {
    const { default: html2canvas } = await import('html2canvas');
    const canvas = await html2canvas(element, { scale: scale, useCORS: true, backgroundColor: bgColor, logging: false });
    return canvas.toDataURL('image/png', 1.0);
  } catch (error) {
    console.error('Error generating chart image:', error);
    return null;
  }
};

export const exportToPNG = async (elementId: string, filename: string, isDark: boolean) => {
  const element = document.getElementById(elementId);
  if (!element) throw new Error("Element not found");
  
  const { default: html2canvas } = await import('html2canvas');
  const canvas = await html2canvas(element, { scale: 4, useCORS: true, backgroundColor: isDark ? '#1e293b' : '#ffffff', logging: false });
  const dataUrl = canvas.toDataURL('image/png', 1.0);
  
  const link = document.createElement('a');
  link.download = `${filename}.png`;
  link.href = dataUrl;
  link.click();
};

export const printDashboard = () => {
  window.print();
};

class PDFLayoutManager {
  doc: any;
  cursorY: number;
  margin: number;
  pageWidth: number;
  pageHeight: number;

  constructor(doc: any, margin: number = 20) {
    this.doc = doc;
    this.margin = margin;
    this.pageWidth = doc.internal.pageSize.getWidth();
    this.pageHeight = doc.internal.pageSize.getHeight();
    this.cursorY = margin;
  }

  checkPageBreak(heightNeeded: number) {
    if (this.cursorY + heightNeeded > this.pageHeight - this.margin - 15) { // 15 for footer
      this.doc.addPage();
      this.cursorY = this.margin;
      return true;
    }
    return false;
  }

  moveCursor(yOffset: number) {
    this.cursorY += yOffset;
  }
  
  addGrid(items: any[], renderCell: (item: any, x: number, y: number, w: number, h: number) => void, columns: number, rowHeight: number, gap: number) {
    const contentWidth = this.pageWidth - this.margin * 2;
    const colWidth = (contentWidth - gap * (columns - 1)) / columns;
    
    let currentX = this.margin;
    
    for (let i = 0; i < items.length; i++) {
      if (i > 0 && i % columns === 0) {
        currentX = this.margin;
        this.cursorY += rowHeight + gap;
      }
      
      this.checkPageBreak(rowHeight);
      
      renderCell(items[i], currentX, this.cursorY, colWidth, rowHeight);
      currentX += colWidth + gap;
    }
    this.cursorY += rowHeight;
  }
}

type ReportLine = {
  title: string;
  detail: string;
  level?: string;
};

const buildReportLines = (dataset: Dataset) => {
  const stats = dataset.stats;
  const metrics = stats.metrics;
  const aiAnalysis = stats.aiAnalysis;

  const observations: ReportLine[] = aiAnalysis?.observations?.length
    ? aiAnalysis.observations.slice(0, 4).map(observation => ({
        title: observation.observation,
        detail: observation.evidence || observation.businessImpact || observation.recommendation,
        level: observation.riskLevel
      }))
    : [
        {
          title: 'Dataset readiness',
          detail: `${stats.cleanedRows.toLocaleString()} of ${stats.totalRows.toLocaleString()} records are analysis-ready across ${stats.totalColumns.toLocaleString()} columns.`,
          level: stats.healthScore >= 80 ? 'Low' : 'Medium'
        },
        {
          title: 'Commercial concentration',
          detail: metrics.highestSellingProduct
            ? `${metrics.highestSellingProduct.name} is the top revenue contributor at ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(metrics.highestSellingProduct.revenue)}.`
            : 'No dominant product concentration was identified from the available columns.',
          level: 'Informational'
        },
        {
          title: 'Data quality posture',
          detail: stats.missingValuesHandled || stats.duplicatesRemoved || stats.invalidDates || stats.invalidNumbers
            ? `${stats.missingValuesHandled} missing values, ${stats.duplicatesRemoved} duplicate rows, ${stats.invalidDates} invalid dates, and ${stats.invalidNumbers} invalid numbers were handled during import.`
            : 'No cleanup exceptions were detected during import.',
          level: stats.healthScore >= 90 ? 'Low' : 'Medium'
        }
      ];

  const risks: ReportLine[] = aiAnalysis?.riskAlerts?.length
    ? aiAnalysis.riskAlerts.slice(0, 4).map(alert => ({
        title: alert.title,
        detail: alert.description,
        level: alert.riskLevel
      }))
    : [
        ...(stats.duplicatesRemoved > 0 ? [{
          title: 'Duplicate data removed',
          detail: `${stats.duplicatesRemoved.toLocaleString()} duplicate rows were excluded before analysis. Review upstream data entry and integration controls.`,
          level: 'Medium'
        }] : []),
        ...(stats.missingValuesHandled > 0 ? [{
          title: 'Missing values imputed',
          detail: `${stats.missingValuesHandled.toLocaleString()} missing values were handled. Validate whether imputation is appropriate before external reporting.`,
          level: 'Medium'
        }] : []),
        ...(stats.healthScore < 70 ? [{
          title: 'Data quality below target',
          detail: `The current health score is ${stats.healthScore}/100. Additional cleansing is recommended before making high-stakes decisions.`,
          level: 'High'
        }] : []),
        {
          title: 'No fabricated exceptions',
          detail: 'InsightFlow did not add synthetic audit exceptions to this report. Risks shown here are derived from the imported dataset profile.',
          level: 'Informational'
        }
      ];

  const recommendations = aiAnalysis?.recommendations?.length
    ? aiAnalysis.recommendations.slice(0, 4)
    : [
        'Validate source-system controls for duplicate and missing records before final reporting.',
        'Use the dashboard filters to review revenue concentration by product, category, and region.',
        'Configure AI insights to generate a deeper executive narrative and audit-oriented recommendations.'
      ];

  return { observations, risks, recommendations };
};

const formatReportLine = (line: ReportLine) => `${line.title}${line.level ? ` (${line.level})` : ''}: ${line.detail}`;

export const exportToPDF = async (dataset: Dataset, totalRevenue: number, averageOrderValue: number) => {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const layout = new PDFLayoutManager(doc, 20);
  
  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  const formatNumber = (val: number) => new Intl.NumberFormat('en-US').format(val);
  
  const metrics = dataset.stats.metrics;
  const reportLines = buildReportLines(dataset);
  
  // Custom colors
  const primaryColor: [number, number, number] = [15, 23, 42]; 
  const secondaryColor: [number, number, number] = [71, 85, 105]; 
  const accentColor: [number, number, number] = [59, 130, 246]; 
  const lightBg: [number, number, number] = [248, 250, 252]; 
  const borderColor: [number, number, number] = [226, 232, 240]; 
  
  // Cover Page
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, layout.pageWidth, layout.pageHeight, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(42);
  doc.text('InsightFlow', 20, 120);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(24);
  doc.setTextColor(200, 200, 200);
  doc.text('Executive Analytics Report', 20, 135);
  
  doc.setFillColor(...accentColor);
  doc.rect(20, 145, 25, 3, 'F');
  
  doc.setFontSize(14);
  doc.setTextColor(148, 163, 184);
  doc.text(`Dataset: ${dataset.name}`, 20, 165);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 173);
  
  // Executive Summary
  doc.addPage();
  layout.cursorY = 50;
  
  // Header
  const drawHeader = (title: string) => {
    doc.setFillColor(...lightBg);
    doc.rect(0, 0, layout.pageWidth, 40, 'F');
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.text(title, 20, 25);
  };
  
  drawHeader('Executive Summary');
  
  doc.setFontSize(16);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('Performance Overview', 20, layout.cursorY);
  layout.moveCursor(8);
  
  const kpiItems = [
    { title: 'Total Revenue', value: formatCurrency(metrics.totalRevenue) },
    { title: 'Total Profit', value: formatCurrency(metrics.totalProfit) },
    { title: 'Avg Order Value', value: formatCurrency(metrics.averageOrderValue) },
    { title: 'Total Orders', value: formatNumber(metrics.totalOrders) },
    { title: 'Unique Customers', value: formatNumber(metrics.uniqueCustomers) },
    { title: 'Unique Products', value: formatNumber(metrics.uniqueProducts) },
  ];
  
  layout.addGrid(kpiItems, (item, x, y, w, h) => {
    doc.setDrawColor(...borderColor);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, w, h, 2, 2, 'FD');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...secondaryColor);
    doc.text(item.title.toUpperCase(), x + 6, y + 9);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text(item.value, x + 6, y + 20);
  }, 3, 28, 4);
  
  layout.moveCursor(16);
  
  // Key Insights
  layout.checkPageBreak(90);
  doc.setFillColor(...lightBg);
  doc.setDrawColor(...borderColor);
  doc.roundedRect(20, layout.cursorY, layout.pageWidth - 40, 85, 2, 2, 'FD');
  
  doc.setFontSize(16);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('Key Business Insights', 28, layout.cursorY + 16);
  
  doc.setFillColor(...accentColor);
  doc.rect(28, layout.cursorY + 22, 15, 2, 'F');
  
  let insightY = layout.cursorY + 38;
  const lineSpacing = 12;
  const drawInsight = (label: string, value: string) => {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text(`${label}:`, 28, insightY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...secondaryColor);
    doc.text(value, 85, insightY);
    insightY += lineSpacing;
  };
  
  if (metrics.bestMonth) drawInsight('Highest Revenue Month', `${metrics.bestMonth.month} (${formatCurrency(metrics.bestMonth.revenue)})`);
  if (metrics.highestSellingProduct) drawInsight('Top Selling Product', `${metrics.highestSellingProduct.name} (${formatCurrency(metrics.highestSellingProduct.revenue)})`);
  if (metrics.highestRevenueRegion) drawInsight('Top Region', `${metrics.highestRevenueRegion.name} (${formatCurrency(metrics.highestRevenueRegion.revenue)})`);
  if (metrics.highestRevenueCategory) drawInsight('Top Category', `${metrics.highestRevenueCategory.name} (${formatCurrency(metrics.highestRevenueCategory.revenue)})`);
  
  layout.cursorY = insightY + 12;
  
  // Dataset Profile
  layout.checkPageBreak(30);
  doc.setFontSize(16);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('Dataset Profile', 20, layout.cursorY);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...secondaryColor);
  doc.text(`Rows: ${formatNumber(dataset.stats.totalRows)}   •   Columns: ${formatNumber(dataset.stats.totalColumns)}   •   Health Score: ${dataset.stats.healthScore}/100`, 20, layout.cursorY + 8);
  
  layout.moveCursor(20);
  
  // Charts
  const trendImg = await getChartImage('chart-trend');
  const catImg = await getChartImage('chart-category');
  const regImg = await getChartImage('chart-region');
  
  if (trendImg) {
    if (layout.checkPageBreak(120)) drawHeader('Revenue Trend Analysis');
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('Revenue Trend', 20, layout.cursorY);
    layout.moveCursor(6);
    
    doc.setDrawColor(...borderColor);
    doc.rect(20, layout.cursorY, layout.pageWidth - 40, 100);
    doc.addImage(trendImg, 'PNG', 22, layout.cursorY + 2, layout.pageWidth - 44, 96);
    layout.moveCursor(110);
  }
  
  if (catImg) {
    if (layout.checkPageBreak(120)) drawHeader('Breakdown Analysis');
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('Category Distribution', 20, layout.cursorY);
    layout.moveCursor(6);
    
    doc.setDrawColor(...borderColor);
    doc.rect(20, layout.cursorY, layout.pageWidth - 40, 95);
    doc.addImage(catImg, 'PNG', 22, layout.cursorY + 2, layout.pageWidth - 44, 91);
    layout.moveCursor(105);
  }
  
  if (regImg) {
    if (layout.checkPageBreak(120)) drawHeader('Breakdown Analysis');
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('Regional Impact', 20, layout.cursorY);
    layout.moveCursor(6);
    
    doc.setDrawColor(...borderColor);
    doc.rect(20, layout.cursorY, layout.pageWidth - 40, 95);
    doc.addImage(regImg, 'PNG', 22, layout.cursorY + 2, layout.pageWidth - 44, 91);
    layout.moveCursor(105);
  }

  
  // Audit & Risk Sections
  if (layout.checkPageBreak(120)) drawHeader('Risk & Compliance');
  doc.setFontSize(16);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('Audit Observations & Detected Risks', 20, layout.cursorY);
  layout.moveCursor(10);
  
  const drawReportList = (heading: string, items: string[]) => {
    doc.setFontSize(11);
    doc.setTextColor(...secondaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text(`${heading}:`, 20, layout.cursorY);
    layout.moveCursor(7);
    doc.setFont('helvetica', 'normal');

    items.forEach(item => {
      const lines = doc.splitTextToSize(`• ${item}`, layout.pageWidth - 50);
      layout.checkPageBreak(lines.length * 5 + 4);
      doc.text(lines, 25, layout.cursorY);
      layout.moveCursor(lines.length * 5 + 3);
    });
    layout.moveCursor(4);
  };

  drawReportList('Audit Observations', reportLines.observations.map(formatReportLine));
  drawReportList('Detected Risks', reportLines.risks.map(formatReportLine));
  drawReportList('Recommendations', reportLines.recommendations);
  
  // Appendix
  layout.checkPageBreak(60);
  doc.setFontSize(16);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('Appendix', 20, layout.cursorY);
  layout.moveCursor(10);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('Methodology: Generated by InsightFlow using local metrics and AI-assisted analysis when configured.', 20, layout.cursorY);
  layout.moveCursor(20);
  
  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184); 
    doc.text(`InsightFlow | Executive Analytics Report | Page ${i} of ${totalPages}`, layout.pageWidth / 2, layout.pageHeight - 10, { align: 'center' });
  }
  
  doc.save(`InsightFlow_Executive_Report_${Date.now()}.pdf`);
};

export const exportToDOCX = async (dataset: Dataset, totalRevenue: number, averageOrderValue: number) => {
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    ImageRun,
    Table,
    TableRow,
    TableCell,
    BorderStyle,
    WidthType,
    AlignmentType,
    PageBreak
  } = await import('docx');
  const trendImg = await getChartImage('chart-trend');
  const catImg = await getChartImage('chart-category');
  const regImg = await getChartImage('chart-region');
  
  const metrics = dataset.stats.metrics;
  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  const formatNumber = (val: number) => new Intl.NumberFormat('en-US').format(val);
  const reportLines = buildReportLines(dataset);
  
  const createKPICell = (title: string, value: string) => {
    return new TableCell({
      width: { size: 33.33, type: WidthType.PERCENTAGE },
      margins: { top: 200, bottom: 200, left: 200, right: 200 },
      shading: { fill: "f8fafc" },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 4, color: "e2e8f0" },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: "e2e8f0" },
        left: { style: BorderStyle.SINGLE, size: 4, color: "e2e8f0" },
        right: { style: BorderStyle.SINGLE, size: 4, color: "e2e8f0" },
      },
      children: [
        new Paragraph({
          children: [new TextRun({ text: title.toUpperCase(), color: "475569", size: 18, bold: true })],
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          children: [new TextRun({ text: value, color: "0f172a", size: 28, bold: true })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 100 },
        }),
      ],
    });
  };

  const createKPITable = () => {
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NIL },
        bottom: { style: BorderStyle.NIL },
        left: { style: BorderStyle.NIL },
        right: { style: BorderStyle.NIL },
        insideHorizontal: { style: BorderStyle.NIL },
        insideVertical: { style: BorderStyle.NIL },
      },
      rows: [
        new TableRow({
          children: [
            createKPICell("Total Revenue", formatCurrency(metrics.totalRevenue)),
            createKPICell("Total Profit", formatCurrency(metrics.totalProfit)),
            createKPICell("Avg Order Value", formatCurrency(metrics.averageOrderValue)),
          ],
        }),
        new TableRow({
          children: [
            createKPICell("Total Orders", formatNumber(metrics.totalOrders)),
            createKPICell("Unique Customers", formatNumber(metrics.uniqueCustomers)),
            createKPICell("Unique Products", formatNumber(metrics.uniqueProducts)),
          ],
        }),
      ],
    });
  };

  const createInsightRow = (label: string, value: string) => {
    return new Paragraph({
      spacing: { before: 120, after: 120 },
      children: [
        new TextRun({ text: `${label}: `, bold: true, color: "0f172a", size: 22 }),
        new TextRun({ text: value, color: "475569", size: 22 }),
      ],
    });
  };

  const children: any[] = [
    // Cover Page
    new Paragraph({
      spacing: { before: 2400, after: 400 },
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "InsightFlow", bold: true, size: 72, color: "0f172a" })],
    }),
    new Paragraph({
      spacing: { after: 1200 },
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "Executive Analytics Report", size: 44, color: "475569" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 1000 },
      children: [new TextRun({ text: `Dataset: ${dataset.name}`, size: 26, color: "475569" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200 },
      children: [new TextRun({ text: `Generated: ${new Date().toLocaleString()}`, size: 22, color: "64748b" })],
    }),
    new Paragraph({ children: [new PageBreak()] }),
    
    // Page 2: Executive Summary
    new Paragraph({
      text: "Executive Summary",
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 400 },
    }),
    
    new Paragraph({
      text: "Performance Overview",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 300 },
    }),
    createKPITable(),
    
    new Paragraph({
      text: "Key Business Insights",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 600, after: 200 },
    }),
  ];

  if (metrics.bestMonth) children.push(createInsightRow('Highest Revenue Month', `${metrics.bestMonth.month} (${formatCurrency(metrics.bestMonth.revenue)})`));
  if (metrics.highestSellingProduct) children.push(createInsightRow('Top Selling Product', `${metrics.highestSellingProduct.name} (${formatCurrency(metrics.highestSellingProduct.revenue)})`));
  if (metrics.highestRevenueRegion) children.push(createInsightRow('Top Region', `${metrics.highestRevenueRegion.name} (${formatCurrency(metrics.highestRevenueRegion.revenue)})`));
  if (metrics.highestRevenueCategory) children.push(createInsightRow('Top Category', `${metrics.highestRevenueCategory.name} (${formatCurrency(metrics.highestRevenueCategory.revenue)})`));

  children.push(
    new Paragraph({
      text: "Dataset Profile",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 600, after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Rows: ${formatNumber(dataset.stats.totalRows)}   •   Columns: ${formatNumber(dataset.stats.totalColumns)}   •   Health Score: ${dataset.stats.healthScore}/100`, color: "475569", size: 22 }),
      ]
    }),
  );

  if (trendImg) {
    children.push(new Paragraph({ children: [new PageBreak()] }));
    children.push(new Paragraph({
      text: "Revenue Trend Analysis",
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 400 },
    }));
    
    const base64Data = trendImg.replace(/^data:image\/png;base64,/, "");
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new ImageRun({
          data: Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)),
          transformation: { width: 600, height: 300 },
          type: "png",
        }),
      ],
    }));
  }
  
  if (catImg || regImg) {
    children.push(new Paragraph({ children: [new PageBreak()] }));
    children.push(new Paragraph({
      text: "Breakdown Analysis",
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 400 },
    }));
    
    if (catImg) {
      children.push(new Paragraph({
        text: "Category Distribution",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 300 },
      }));
      const base64Data = catImg.replace(/^data:image\/png;base64,/, "");
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new ImageRun({
            data: Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)),
            transformation: { width: 500, height: 500 },
            type: "png",
          }),
        ],
      }));
    }
    
    if (regImg) {
      children.push(new Paragraph({
        text: "Regional Impact",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 600, after: 300 },
      }));
      const base64Data = regImg.replace(/^data:image\/png;base64,/, "");
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new ImageRun({
            data: Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)),
            transformation: { width: 500, height: 500 },
            type: "png",
          }),
        ],
      }));
    }
  }

  children.push(new Paragraph({ text: "Audit Observations", heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }));
  reportLines.observations.forEach(line => {
    children.push(new Paragraph({ children: [new TextRun({ text: `• ${formatReportLine(line)}`, size: 24, color: "333333" })] }));
  });
  
  children.push(new Paragraph({ text: "Detected Risks", heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }));
  reportLines.risks.forEach(line => {
    children.push(new Paragraph({ children: [new TextRun({ text: `• ${formatReportLine(line)}`, size: 24, color: "333333" })] }));
  });

  children.push(new Paragraph({ text: "Recommendations", heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }));
  reportLines.recommendations.forEach(recommendation => {
    children.push(new Paragraph({ children: [new TextRun({ text: `• ${recommendation}`, size: 24, color: "333333" })] }));
  });
  
  children.push(new Paragraph({ text: "Appendix", heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 }, pageBreakBefore: true }));
  children.push(new Paragraph({ children: [new TextRun({ text: "Methodology: Data processed by InsightFlow using local metrics and AI-assisted analysis when configured.", size: 24, color: "666666" })] }));

  const doc = new Document({
    sections: [{
      properties: {},
      children: children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `InsightFlow_Executive_Report_${Date.now()}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const exportToCSV = (data: any[], filename: string) => {
  if (!data || data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => {
      const value = row[header];
      const normalized = value instanceof Date
        ? value.toISOString()
        : value && typeof value === 'object'
          ? JSON.stringify(value)
          : value ?? '';
      return `"${String(normalized).replace(/"/g, '""')}"`;
    }).join(','))
  ].join('\n');
  
  const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = `${filename.replace(/[^a-z0-9-_]+/gi, '_')}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportToExcel = async (data: any[], filename: string) => {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Data Export');
  
  // Add styling
  const headerStyle = {
    font: { bold: true, color: { argb: 'FFFFFFFF' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    }
  };
  
  const cellStyle = {
    font: { color: { argb: 'FF0F172A' } },
    border: {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
    }
  };
  
  if (data && data.length > 0) {
    const headers = Object.keys(data[0]);
    
    // Add headers with styling
    const headerRow = worksheet.addRow(headers);
    headerRow.eachCell((cell: any) => {
      cell.style = headerStyle;
    });
    
    // Add data with styling
    data.forEach((row, rowIndex) => {
      const dataRow = worksheet.addRow(headers.map(header => row[header]));
      dataRow.eachCell((cell: any) => {
        cell.style = cellStyle;
      });
      
      // Alternate row colors
      if (rowIndex % 2 === 0) {
        dataRow.eachCell((cell: any) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8FAFC' }
          };
        });
      }
    });
    
    // Auto-fit columns
    worksheet.columns.forEach((column: any) => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, (cell: any) => {
        const cellValue = cell.value ? String(cell.value).length : 10;
        if (cellValue > maxLength) {
          maxLength = cellValue;
        }
      });
      column.width = Math.min(maxLength + 2, 50);
    });
    
    // Add metadata
    const metadataSheet = workbook.addWorksheet('Export Info');
    metadataSheet.addRow(['Export Information']);
    metadataSheet.addRow(['Dataset Name', filename]);
    metadataSheet.addRow(['Export Date', new Date().toLocaleString()]);
    metadataSheet.addRow(['Total Records', data.length]);
    metadataSheet.addRow(['Total Columns', headers.length]);
    metadataSheet.addRow(['Exported By', 'InsightFlow Analytics Platform']);
    
    // Style metadata
    metadataSheet.getRow(1).font = { bold: true, size: 14, color: { argb: 'FF0F172A' } };
    metadataSheet.getColumn(1).width = 20;
    metadataSheet.getColumn(2).width = 40;
  }
  
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = `${filename.replace(/[^a-z0-9-_]+/gi, '_')}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportToJSON = (data: any, filename: string) => {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = `${filename.replace(/[^a-z0-9-_]+/gi, '_')}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
