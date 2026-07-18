// ──────────────────────────────────────────────────────────────────────────────
// FileIngestor – Multi-format file parsing (CSV, XLSX, JSON, PDF)
// ──────────────────────────────────────────────────────────────────────────────
import { analyzeFile, FileAnalysis } from '../../lib/importUtils';
import { AuditRecord } from '../types';

export interface IngestResult {
  fileName: string;
  fileSize: number;
  fileType: string;
  records: AuditRecord[];
  columns: string[];
  sheetName?: string;
  sheetCount: number;
  warnings: string[];
}

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const SUPPORTED_TYPES = ['csv', 'xlsx', 'json', 'pdf'];

/**
 * Validate a file before processing.
 */
function validateFile(file: File): string[] {
  const warnings: string[] = [];
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  if (!SUPPORTED_TYPES.includes(ext)) {
    throw new Error(`Unsupported file type ".${ext}". Supported: CSV, XLSX, JSON, PDF.`);
  }
  if (file.size === 0) {
    throw new Error('The uploaded file is empty.');
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File exceeds maximum size of ${MAX_FILE_SIZE / 1024 / 1024}MB.`);
  }
  if (file.size > 50 * 1024 * 1024) {
    warnings.push('Large file detected (>50MB). Processing may take longer.');
  }
  return warnings;
}

/**
 * Parse a PDF file and extract tabular data.
 * Uses a heuristic approach to extract tables from PDF text content.
 */
async function parsePDF(file: File): Promise<{ records: AuditRecord[]; columns: string[] }> {
  try {
    const pdfjsLib = await import('pdfjs-dist');
    // Set worker source - use fake worker for browser compatibility
    if (typeof window !== 'undefined') {
      (pdfjsLib as any).GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    const allText: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: any) => item.str)
        .join(' ')
        .trim();
      if (pageText) allText.push(pageText);
    }

    const fullText = allText.join('\n');
    if (!fullText.trim()) {
      throw new Error('No extractable text found in PDF. The file may be image-based.');
    }

    // Try to detect tabular structure from lines
    const lines = fullText.split(/\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) {
      return { records: [{ content: fullText }], columns: ['content'] };
    }

    // Heuristic: split by common delimiters (tabs, multiple spaces)
    const delimiter = lines[0].includes('\t') ? '\t' : /\s{2,}/;
    const headerParts = lines[0].split(delimiter).map(h => h.trim()).filter(Boolean);

    if (headerParts.length < 2) {
      // No table structure detected, return as single-column
      return {
        records: lines.map((line, i) => ({ line_number: i + 1, content: line })),
        columns: ['line_number', 'content'],
      };
    }

    const records: AuditRecord[] = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(delimiter).map(p => p.trim()).filter(Boolean);
      if (parts.length === 0) continue;
      const record: AuditRecord = {};
      headerParts.forEach((h, j) => {
        record[h] = parts[j] ?? null;
      });
      records.push(record);
    }

    return { records, columns: headerParts };
  } catch (err: any) {
    if (err.message?.includes('No extractable')) throw err;
    throw new Error(`PDF parsing failed: ${err.message || 'Unknown error'}. Try converting to CSV or Excel.`);
  }
}

/**
 * Ingest a single file and return structured records.
 */
export async function ingestFile(file: File, sheetIndex?: number): Promise<IngestResult> {
  const warnings = validateFile(file);
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  // PDF path
  if (ext === 'pdf') {
    const { records, columns } = await parsePDF(file);
    return { fileName: file.name, fileSize: file.size, fileType: 'PDF', records, columns, sheetCount: 1, warnings };
  }

  // CSV / XLSX / JSON path via existing importUtils
  const analysis: FileAnalysis = await analyzeFile(file);

  if (analysis.sheets.length === 0 || analysis.sheets.every(s => s.empty)) {
    throw new Error('No data found in the uploaded file.');
  }

  const idx = sheetIndex ?? 0;
  const sheet = analysis.sheets[Math.min(idx, analysis.sheets.length - 1)];
  const rawData = sheet.rawData;

  if (rawData.length === 0) {
    throw new Error(`Sheet "${sheet.name}" contains no data rows.`);
  }

  const columns = Object.keys(rawData[0]);
  const records: AuditRecord[] = rawData;

  if (analysis.sheets.length > 1 && sheetIndex === undefined) {
    warnings.push(`File has ${analysis.sheets.length} sheets. Showing "${sheet.name}".`);
  }

  return {
    fileName: analysis.fileName,
    fileSize: analysis.fileSize,
    fileType: analysis.fileType,
    records,
    columns,
    sheetName: sheet.name,
    sheetCount: analysis.sheets.length,
    warnings,
  };
}

/**
 * Ingest multiple files (batch). Returns results for each file.
 */
export async function ingestMultipleFiles(files: File[]): Promise<IngestResult[]> {
  const results: IngestResult[] = [];
  for (const file of files) {
    try {
      results.push(await ingestFile(file));
    } catch (err: any) {
      results.push({
        fileName: file.name,
        fileSize: file.size,
        fileType: file.name.split('.').pop() || 'unknown',
        records: [],
        columns: [],
        sheetCount: 0,
        warnings: [`Failed to parse: ${err.message}`],
      });
    }
  }
  return results;
}
