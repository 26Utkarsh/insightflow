// ──────────────────────────────────────────────────────────────────────────────
// DataProfiler – Comprehensive data quality profiling
// ──────────────────────────────────────────────────────────────────────────────
import { AuditRecord, ColumnProfile, ColumnType, DataQualityIssue, DataQualityReport, SeverityLevel } from '../types';

// ── Column Type Detection ───────────────────────────────────────────────────

const DATE_REGEX = /^\d{1,4}[-/]\d{1,2}[-/]\d{1,4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[\d\s+\-().]{7,20}$/;
const ID_REGEX = /^[A-Z]{0,5}[-_]?\d+$/i;
const CURRENCY_REGEX = /^[$€£¥₹]\s*[\d,]+(?:\.\d+)?$|^[\d,]+(?:\.\d+)?\s*[$€£¥₹]?$/;

function detectColumnType(values: any[]): ColumnType {
  const nonNull = values.filter(v => v !== null && v !== undefined && String(v).trim() !== '');
  if (nonNull.length === 0) return 'unknown';

  const sample = nonNull.slice(0, Math.min(200, nonNull.length));
  let numCount = 0, dateCount = 0, emailCount = 0, phoneCount = 0, boolCount = 0, idCount = 0, currCount = 0;

  for (const v of sample) {
    const s = String(v).trim();
    if (!isNaN(Number(s.replace(/,/g, '')))) numCount++;
    if (DATE_REGEX.test(s)) dateCount++;
    if (EMAIL_REGEX.test(s)) emailCount++;
    if (PHONE_REGEX.test(s)) phoneCount++;
    if (/^(true|false|yes|no|y|n|1|0)$/i.test(s)) boolCount++;
    if (ID_REGEX.test(s)) idCount++;
    if (CURRENCY_REGEX.test(s)) currCount++;
  }

  const threshold = sample.length * 0.6;
  if (emailCount > threshold) return 'email';
  if (dateCount > threshold) return 'date';
  if (currCount > threshold) return 'currency';
  if (boolCount > threshold) return 'boolean';
  if (numCount > threshold) return 'numeric';
  if (idCount > threshold) return 'id';
  if (phoneCount > threshold) return 'phone';
  return 'text';
}

function parseNumeric(v: any): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(String(v).replace(/[, $€£¥₹]/g, ''));
  return isNaN(n) ? null : n;
}

function parseDate(v: any): Date | null {
  if (v === null || v === undefined || v === '') return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

// ── Column Profiling ────────────────────────────────────────────────────────

function profileColumn(name: string, values: any[]): ColumnProfile {
  const type = detectColumnType(values);
  const total = values.length;
  const nullCount = values.filter(v => v === null || v === undefined || String(v).trim() === '').length;
  const nonNull = values.filter(v => v !== null && v !== undefined && String(v).trim() !== '');
  const uniqueSet = new Set(nonNull.map(v => String(v).trim().toLowerCase()));
  const uniqueCount = uniqueSet.size;

  const profile: ColumnProfile = { name, type, nullCount, uniqueCount };

  if (type === 'numeric' || type === 'currency') {
    const nums = nonNull.map(parseNumeric).filter((n): n is number => n !== null);
    if (nums.length > 0) {
      nums.sort((a, b) => a - b);
      profile.min = nums[0];
      profile.max = nums[nums.length - 1];
      profile.mean = nums.reduce((a, b) => a + b, 0) / nums.length;
      profile.median = nums[Math.floor(nums.length / 2)];
      const variance = nums.reduce((acc, n) => acc + (n - profile.mean!) ** 2, 0) / nums.length;
      profile.stdDev = Math.sqrt(variance);
    }
  }

  if (type === 'date') {
    const dates = nonNull.map(parseDate).filter((d): d is Date => d !== null);
    if (dates.length > 0) {
      dates.sort((a, b) => a.getTime() - b.getTime());
      profile.min = dates[0].toISOString();
      profile.max = dates[dates.length - 1].toISOString();
    }
  }

  // Top values (for categorical)
  if (type === 'text' || type === 'id' || type === 'boolean') {
    const freq = new Map<string, number>();
    nonNull.forEach(v => {
      const s = String(v).trim();
      freq.set(s, (freq.get(s) || 0) + 1);
    });
    profile.topValues = Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([value, count]) => ({ value, count }));
  }

  return profile;
}

// ── Quality Issue Detection ─────────────────────────────────────────────────

function detectQualityIssues(
  records: AuditRecord[],
  columns: string[],
  profiles: ColumnProfile[],
  idColumn?: string,
  amountColumn?: string,
  dateColumn?: string,
): DataQualityIssue[] {
  const issues: DataQualityIssue[] = [];

  // 1. Missing values per column
  for (let c = 0; c < columns.length; c++) {
    const col = columns[c];
    const profile = profiles[c];
    if (profile.nullCount > 0) {
      const rowIndices: number[] = [];
      records.forEach((r, i) => {
        if (r[col] === null || r[col] === undefined || String(r[col]).trim() === '') rowIndices.push(i);
      });
      if (rowIndices.length > 0) {
        const severity: SeverityLevel = rowIndices.length > records.length * 0.3 ? 'High'
          : rowIndices.length > records.length * 0.1 ? 'Medium' : 'Low';
        issues.push({
          type: 'missing',
          column: col,
          rowIndices: rowIndices.slice(0, 50),
          count: rowIndices.length,
          description: `${rowIndices.length} missing values in column "${col}" (${((rowIndices.length / records.length) * 100).toFixed(1)}%)`,
          severity,
        });
      }
    }
  }

  // 2. Duplicate rows
  const rowHashes = new Map<string, number[]>();
  records.forEach((r, i) => {
    const hash = columns.map(c => String(r[c] ?? '')).join('|||');
    const arr = rowHashes.get(hash) || [];
    arr.push(i);
    rowHashes.set(hash, arr);
  });
  const dupRowIndices: number[] = [];
  rowHashes.forEach(indices => {
    if (indices.length > 1) dupRowIndices.push(...indices.slice(1));
  });
  if (dupRowIndices.length > 0) {
    issues.push({
      type: 'duplicate_row',
      rowIndices: dupRowIndices.slice(0, 100),
      count: dupRowIndices.length,
      description: `${dupRowIndices.length} duplicate rows detected (identical values across all columns)`,
      severity: dupRowIndices.length > 10 ? 'High' : dupRowIndices.length > 3 ? 'Medium' : 'Low',
    });
  }

  // 3. Duplicate IDs
  if (idColumn) {
    const idMap = new Map<string, number[]>();
    records.forEach((r, i) => {
      const id = String(r[idColumn] ?? '').trim();
      if (id && id !== '' && id !== 'null') {
        const arr = idMap.get(id) || [];
        arr.push(i);
        idMap.set(id, arr);
      }
    });
    const dupIdIndices: number[] = [];
    idMap.forEach(indices => {
      if (indices.length > 1) dupIdIndices.push(...indices);
    });
    if (dupIdIndices.length > 0) {
      issues.push({
        type: 'duplicate_id',
        column: idColumn,
        rowIndices: dupIdIndices.slice(0, 100),
        count: dupIdIndices.length,
        description: `${dupIdIndices.length} rows with duplicate IDs in "${idColumn}"`,
        severity: 'High',
      });
    }
  }

  // 4. Negative amounts
  if (amountColumn) {
    const negIndices: number[] = [];
    records.forEach((r, i) => {
      const val = parseNumeric(r[amountColumn]);
      if (val !== null && val < 0) negIndices.push(i);
    });
    if (negIndices.length > 0) {
      issues.push({
        type: 'negative_amount',
        column: amountColumn,
        rowIndices: negIndices.slice(0, 100),
        count: negIndices.length,
        description: `${negIndices.length} negative amounts detected in "${amountColumn}"`,
        severity: negIndices.length > 5 ? 'High' : 'Medium',
      });
    }
  }

  // 5. Invalid dates
  if (dateColumn) {
    const invalidDateIndices: number[] = [];
    records.forEach((r, i) => {
      const v = r[dateColumn];
      if (v !== null && v !== undefined && String(v).trim() !== '') {
        if (!parseDate(v)) invalidDateIndices.push(i);
      }
    });
    if (invalidDateIndices.length > 0) {
      issues.push({
        type: 'invalid_date',
        column: dateColumn,
        rowIndices: invalidDateIndices.slice(0, 100),
        count: invalidDateIndices.length,
        description: `${invalidDateIndices.length} unparseable dates in "${dateColumn}"`,
        severity: 'Medium',
      });
    }

    // Impossible dates (future dates or very old dates)
    const impossibleIndices: number[] = [];
    const now = new Date();
    const minDate = new Date('1900-01-01');
    records.forEach((r, i) => {
      const d = parseDate(r[dateColumn]);
      if (d && (d > now || d < minDate)) impossibleIndices.push(i);
    });
    if (impossibleIndices.length > 0) {
      issues.push({
        type: 'invalid_date',
        column: dateColumn,
        rowIndices: impossibleIndices.slice(0, 100),
        count: impossibleIndices.length,
        description: `${impossibleIndices.length} impossible dates (future or pre-1900) in "${dateColumn}"`,
        severity: 'Medium',
      });
    }
  }

  // 6. Outliers (IQR method on numeric columns)
  for (const profile of profiles) {
    if ((profile.type === 'numeric' || profile.type === 'currency') && profile.stdDev && profile.mean && profile.stdDev > 0) {
      const col = profile.name;
      const outlierIndices: number[] = [];
      const lowerBound = profile.mean - 3 * profile.stdDev;
      const upperBound = profile.mean + 3 * profile.stdDev;
      records.forEach((r, i) => {
        const val = parseNumeric(r[col]);
        if (val !== null && (val < lowerBound || val > upperBound)) outlierIndices.push(i);
      });
      if (outlierIndices.length > 0 && outlierIndices.length < records.length * 0.1) {
        issues.push({
          type: 'outlier',
          column: col,
          rowIndices: outlierIndices.slice(0, 50),
          count: outlierIndices.length,
          description: `${outlierIndices.length} statistical outliers in "${col}" (beyond 3 standard deviations)`,
          severity: outlierIndices.length > 10 ? 'Medium' : 'Low',
        });
      }
    }
  }

  return issues;
}

// ── Main Profiling Function ─────────────────────────────────────────────────

export function profileData(
  records: AuditRecord[],
  idColumn?: string,
  amountColumn?: string,
  dateColumn?: string,
): DataQualityReport {
  if (records.length === 0) {
    return {
      score: 0, totalRows: 0, validRows: 0, issues: [], columnProfiles: [],
      summary: { missingValues: 0, duplicateRows: 0, duplicateIds: 0, invalidDates: 0, invalidFormats: 0, outliers: 0, negativeAmounts: 0, orphanRecords: 0 },
    };
  }

  const columns = Object.keys(records[0]);
  const columnProfiles = columns.map(col => {
    const values = records.map(r => r[col]);
    return profileColumn(col, values);
  });

  const issues = detectQualityIssues(records, columns, columnProfiles, idColumn, amountColumn, dateColumn);

  // Summary aggregation
  const summary = {
    missingValues: issues.filter(i => i.type === 'missing').reduce((s, i) => s + i.count, 0),
    duplicateRows: issues.filter(i => i.type === 'duplicate_row').reduce((s, i) => s + i.count, 0),
    duplicateIds: issues.filter(i => i.type === 'duplicate_id').reduce((s, i) => s + i.count, 0),
    invalidDates: issues.filter(i => i.type === 'invalid_date').reduce((s, i) => s + i.count, 0),
    invalidFormats: issues.filter(i => i.type === 'invalid_format').reduce((s, i) => s + i.count, 0),
    outliers: issues.filter(i => i.type === 'outlier').reduce((s, i) => s + i.count, 0),
    negativeAmounts: issues.filter(i => i.type === 'negative_amount').reduce((s, i) => s + i.count, 0),
    orphanRecords: issues.filter(i => i.type === 'orphan').reduce((s, i) => s + i.count, 0),
  };

  // Score: start at 100, deduct per issue type
  let score = 100;
  const totalRows = records.length;
  score -= Math.min(25, (summary.missingValues / Math.max(1, totalRows * columns.length)) * 200);
  score -= Math.min(20, (summary.duplicateRows / totalRows) * 100);
  score -= Math.min(15, (summary.duplicateIds / totalRows) * 80);
  score -= Math.min(10, (summary.invalidDates / totalRows) * 60);
  score -= Math.min(10, (summary.negativeAmounts / totalRows) * 60);
  score -= Math.min(10, (summary.outliers / totalRows) * 40);
  score -= Math.min(10, summary.invalidFormats * 2);
  score = Math.max(0, Math.round(score));

  const affectedRows = new Set<number>();
  issues.forEach(i => i.rowIndices.forEach(idx => affectedRows.add(idx)));
  const validRows = totalRows - affectedRows.size;

  return { score, totalRows, validRows, issues, columnProfiles, summary };
}
