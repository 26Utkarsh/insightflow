// ──────────────────────────────────────────────────────────────────────────────
// DataCleaner – Domain-agnostic data cleaning and normalization
// ──────────────────────────────────────────────────────────────────────────────
import { AuditRecord, CanonicalFields, ColumnProfile } from '../types';

interface CleanResult {
  cleaned: AuditRecord[];
  stats: {
    totalRows: number;
    cleanedRows: number;
    duplicatesRemoved: number;
    missingImputed: number;
    invalidDatesFixed: number;
    invalidNumbersFixed: number;
    emptyColumnsRemoved: number;
    normalizedValues: number;
  };
}

function parseNumeric(v: any): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(String(v).replace(/[, $€£¥₹]/g, ''));
  return isNaN(n) ? null : n;
}

function parseDate(v: any): Date | null {
  if (v === null || v === undefined || v === '') return null;
  const d = new Date(v);
  if (!isNaN(d.getTime())) return d;
  // Try DD/MM/YYYY
  if (typeof v === 'string') {
    const parts = v.split(/[-/]/);
    if (parts.length === 3) {
      let day: number, month: number, year: number;
      if (parts[2].length === 4) {
        year = parseInt(parts[2]);
        month = parseInt(parts[1]) > 12 ? parseInt(parts[0]) : parseInt(parts[1]);
        day = parseInt(parts[1]) > 12 ? parseInt(parts[1]) : parseInt(parts[0]);
      } else if (parts[0].length === 4) {
        year = parseInt(parts[0]); month = parseInt(parts[1]); day = parseInt(parts[2]);
      } else {
        return null;
      }
      const parsed = new Date(year, month - 1, day);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
  }
  return null;
}

function normalizeText(v: any): string {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

/**
 * Remove fully empty columns from the dataset.
 */
function removeEmptyColumns(records: AuditRecord[]): { records: AuditRecord[]; removed: number } {
  if (records.length === 0) return { records, removed: 0 };
  const columns = Object.keys(records[0]);
  const nonEmpty = columns.filter(col =>
    records.some(r => r[col] !== null && r[col] !== undefined && String(r[col]).trim() !== '')
  );
  const removed = columns.length - nonEmpty.length;
  if (removed === 0) return { records, removed };
  const cleaned = records.map(r => {
    const obj: AuditRecord = {};
    nonEmpty.forEach(c => { obj[c] = r[c]; });
    return obj;
  });
  return { records: cleaned, removed };
}

/**
 * Remove exact duplicate rows.
 */
function removeDuplicateRows(records: AuditRecord[]): { records: AuditRecord[]; removed: number } {
  const seen = new Set<string>();
  const result: AuditRecord[] = [];
  let removed = 0;
  for (const row of records) {
    const hash = Object.keys(row).sort().map(k => `${k}:${String(row[k] ?? '')}`).join('|');
    if (seen.has(hash)) { removed++; continue; }
    seen.add(hash);
    result.push(row);
  }
  return { records: result, removed };
}

/**
 * Remove rows with duplicate IDs.
 */
function removeDuplicateIds(records: AuditRecord[], idColumn: string): { records: AuditRecord[]; removed: number } {
  const seen = new Set<string>();
  const result: AuditRecord[] = [];
  let removed = 0;
  for (const row of records) {
    const id = normalizeText(row[idColumn]);
    if (id && id !== '' && id !== 'null') {
      if (seen.has(id)) { removed++; continue; }
      seen.add(id);
    }
    result.push(row);
  }
  return { records: result, removed };
}

// ── Main Cleaning Function ──────────────────────────────────────────────────

export function cleanData(
  records: AuditRecord[],
  mappedFields: CanonicalFields,
  _columnProfiles: ColumnProfile[],
): CleanResult {
  if (records.length === 0) {
    return {
      cleaned: [],
      stats: { totalRows: 0, cleanedRows: 0, duplicatesRemoved: 0, missingImputed: 0, invalidDatesFixed: 0, invalidNumbersFixed: 0, emptyColumnsRemoved: 0, normalizedValues: 0 },
    };
  }

  const totalRows = records.length;
  let working = [...records];
  let duplicatesRemoved = 0;
  let missingImputed = 0;
  let invalidDatesFixed = 0;
  let invalidNumbersFixed = 0;
  let normalizedValues = 0;

  // Step 1: Remove empty columns
  const emptyResult = removeEmptyColumns(working);
  working = emptyResult.records;
  const emptyColumnsRemoved = emptyResult.removed;

  // Step 2: Remove duplicate rows
  const dupResult = removeDuplicateRows(working);
  working = dupResult.records;
  duplicatesRemoved += dupResult.removed;

  // Step 3: Remove duplicate IDs
  if (mappedFields.id) {
    const idResult = removeDuplicateIds(working, mappedFields.id);
    working = idResult.records;
    duplicatesRemoved += idResult.removed;
  }

  // Step 4: Normalize each row
  working = working.map(row => {
    const cleaned: AuditRecord = { ...row };

    // Normalize date fields
    if (mappedFields.date && cleaned[mappedFields.date] !== undefined) {
      const raw = cleaned[mappedFields.date];
      const d = parseDate(raw);
      if (d) {
        cleaned[mappedFields.date] = d.toISOString();
        if (String(raw) !== cleaned[mappedFields.date]) normalizedValues++;
      } else if (raw !== null && raw !== undefined && String(raw).trim() !== '') {
        invalidDatesFixed++;
        cleaned[mappedFields.date] = String(raw);
      }
    }

    // Normalize amount fields
    if (mappedFields.amount && cleaned[mappedFields.amount] !== undefined) {
      const raw = cleaned[mappedFields.amount];
      const n = parseNumeric(raw);
      if (n !== null) {
        if (String(raw) !== String(n)) { normalizedValues++; }
        cleaned[mappedFields.amount] = n;
      } else if (raw !== null && raw !== undefined && String(raw).trim() !== '') {
        invalidNumbersFixed++;
        cleaned[mappedFields.amount] = 0;
      }
    }

    // Normalize text fields
    for (const key of Object.keys(cleaned)) {
      const v = cleaned[key];
      if (typeof v === 'string') {
        const trimmed = v.trim();
        if (trimmed !== v) { normalizedValues++; cleaned[key] = trimmed; }
        if (trimmed === '') { cleaned[key] = null; missingImputed++; }
      }
    }

    return cleaned;
  });

  return {
    cleaned: working,
    stats: {
      totalRows,
      cleanedRows: working.length,
      duplicatesRemoved,
      missingImputed,
      invalidDatesFixed,
      invalidNumbersFixed,
      emptyColumnsRemoved,
      normalizedValues,
    },
  };
}
