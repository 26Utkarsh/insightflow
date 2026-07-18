// ──────────────────────────────────────────────────────────────────────────────
// FraudDetector – Pattern-based fraud detection engine
// ──────────────────────────────────────────────────────────────────────────────
import { getFieldValue } from '../pipeline/ColumnMapper';
import { AuditRecord, CanonicalFields, DatasetDomain, FraudIndicator } from '../types';

function parseNum(v: any): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(String(v).replace(/[, $€£¥₹]/g, ''));
  return isNaN(n) ? null : n;
}
function parseDt(v: any): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}
function norm(s: any): string { return String(s ?? '').trim().toLowerCase(); }
function genId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

// ── Benford's Law Analysis ──────────────────────────────────────────────────
function benfordAnalysis(records: AuditRecord[], fields: CanonicalFields): FraudIndicator | null {
  if (!fields.amount) return null;
  const digits: number[] = [];
  records.forEach(r => {
    const amt = parseNum(getFieldValue(r, fields, 'amount'));
    if (amt !== null && amt > 0) {
      // Correctly extract leading digit: convert to string, find first non-zero digit
      const amtStr = String(Math.abs(amt));
      const match = amtStr.match(/[1-9]/);
      if (match) {
        const leading = parseInt(match[0]);
        if (leading >= 1 && leading <= 9) digits.push(leading);
      }
    }
  });
  if (digits.length < 50) return null;

  const benfordExpected = [0.301, 0.176, 0.125, 0.097, 0.079, 0.067, 0.058, 0.051, 0.046];
  const observed = Array(9).fill(0);
  digits.forEach(d => observed[d - 1]++);
  const total = digits.length;

  let chiSquared = 0;
  for (let i = 0; i < 9; i++) {
    const expected = benfordExpected[i] * total;
    chiSquared += ((observed[i] - expected) ** 2) / expected;
  }

  // Chi-squared > 15.5 indicates significant deviation at p<0.05
  if (chiSquared > 15.5) {
    const deviations = observed.map((o, i) => ({ digit: i + 1, expected: benfordExpected[i] * total, actual: o, deviation: Math.abs(o - benfordExpected[i] * total) }));
    deviations.sort((a, b) => b.deviation - a.deviation);
    return {
      id: genId('FRD-BEN'), pattern: 'Benford\'s Law Violation',
      description: `First-digit distribution significantly deviates from Benford's Law (chi²=${chiSquared.toFixed(1)}). Digit "${deviations[0].digit}" appears ${deviations[0].actual} times vs expected ${deviations[0].expected.toFixed(0)}.`,
      confidence: Math.min(90, 50 + chiSquared), severity: chiSquared > 25 ? 'High' : 'Medium',
      affectedRows: [], evidence: [], details: { chiSquared, deviations: deviations.slice(0, 3) },
    };
  }
  return null;
}

// ── Repeated Reimbursements ────────────────────────────────────────────────
function repeatedReimbursements(records: AuditRecord[], fields: CanonicalFields): FraudIndicator[] {
  if (!fields.amount || !fields.employee || !fields.date) return [];
  const groups = new Map<string, number[]>();
  records.forEach((r, i) => {
    const emp = norm(getFieldValue(r, fields, 'employee'));
    const amt = parseNum(getFieldValue(r, fields, 'amount'));
    const dt = norm(getFieldValue(r, fields, 'date'));
    if (emp && amt !== null && dt) {
      groups.set(`${emp}|${amt}|${dt}`, [...(groups.get(`${emp}|${amt}|${dt}`) || []), i]);
    }
  });
  const results: FraudIndicator[] = [];
  groups.forEach((indices, key) => {
    if (indices.length > 1) {
      results.push({
        id: genId('FRD-REP'), pattern: 'Repeated Reimbursement',
        description: `Employee submitted ${indices.length} identical claims (${key.replace(/\|/g, ', ')}).`,
        confidence: 85, severity: 'High', affectedRows: indices, evidence: [], details: { key },
      });
    }
  });
  return results;
}

// ── Ghost Employees (shared bank accounts) ──────────────────────────────────
function ghostEmployeeDetection(records: AuditRecord[], fields: CanonicalFields): FraudIndicator[] {
  if (!fields.bankAccount || !fields.employee) return [];
  const bankMap = new Map<string, Set<string>>();
  const bankIndices = new Map<string, number[]>();
  records.forEach((r, i) => {
    const bank = norm(getFieldValue(r, fields, 'bankAccount'));
    const emp = norm(getFieldValue(r, fields, 'employee'));
    if (bank && bank.length > 4 && emp) {
      if (!bankMap.has(bank)) { bankMap.set(bank, new Set()); bankIndices.set(bank, []); }
      bankMap.get(bank)!.add(emp);
      bankIndices.get(bank)!.push(i);
    }
  });
  const results: FraudIndicator[] = [];
  bankMap.forEach((employees, bank) => {
    if (employees.size > 1) {
      const indices = bankIndices.get(bank) || [];
      results.push({
        id: genId('FRD-GHO'), pattern: 'Ghost Employee Indicator',
        description: `Bank account ...${bank.slice(-4)} is shared by ${employees.size} employees: ${Array.from(employees).join(', ')}.`,
        confidence: 75, severity: 'Critical', affectedRows: indices, evidence: [], details: { employees: Array.from(employees) },
      });
    }
  });
  return results;
}

// ── Velocity Analysis (rapid small transactions below thresholds) ──────────
function velocityAnalysis(records: AuditRecord[], fields: CanonicalFields): FraudIndicator[] {
  if (!fields.amount || !fields.vendor || !fields.date) return [];
  const threshold = 1000;
  const vendorDaily = new Map<string, { count: number; total: number; indices: number[] }>();
  records.forEach((r, i) => {
    const amt = parseNum(getFieldValue(r, fields, 'amount'));
    const vendor = norm(getFieldValue(r, fields, 'vendor'));
    const dt = norm(getFieldValue(r, fields, 'date'));
    if (amt !== null && amt > 0 && amt < threshold && vendor && dt) {
      const key = `${vendor}|${dt}`;
      const curr = vendorDaily.get(key) || { count: 0, total: 0, indices: [] };
      curr.count++; curr.total += amt; curr.indices.push(i);
      vendorDaily.set(key, curr);
    }
  });
  const results: FraudIndicator[] = [];
  vendorDaily.forEach((data, key) => {
    if (data.count >= 3) {
      results.push({
        id: genId('FRD-VEL'), pattern: 'Transaction Velocity Anomaly',
        description: `${data.count} small transactions from ${key.split('|')[0]} on ${key.split('|')[1]} totaling ${data.total.toLocaleString()} (below threshold).`,
        confidence: 65, severity: 'Medium', affectedRows: data.indices, evidence: [], details: { count: data.count, total: data.total },
      });
    }
  });
  return results;
}

// ── Main Fraud Detection Entry Point ────────────────────────────────────────
export function detectFraud(
  records: AuditRecord[],
  fields: CanonicalFields,
  _domain: DatasetDomain,
): FraudIndicator[] {
  const indicators: FraudIndicator[] = [];

  try { const b = benfordAnalysis(records, fields); if (b) indicators.push(b); } catch {}
  try { indicators.push(...repeatedReimbursements(records, fields)); } catch {}
  try { indicators.push(...ghostEmployeeDetection(records, fields)); } catch {}
  try { indicators.push(...velocityAnalysis(records, fields)); } catch {}

  return indicators;
}
