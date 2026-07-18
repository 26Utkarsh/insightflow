// ──────────────────────────────────────────────────────────────────────────────
// RuleRegistry – Configurable audit rule definitions
// ──────────────────────────────────────────────────────────────────────────────
import { getFieldValue } from '../pipeline/ColumnMapper';
import { AuditRule, CanonicalFields, DatasetDomain, RuleResult } from '../types';

// ── Helper ──────────────────────────────────────────────────────────────────
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
function norm(s: any): string {
  return String(s ?? '').trim().toLowerCase();
}

// ── Rule: Duplicate Transactions ────────────────────────────────────────────
const duplicateTransactionRule: AuditRule = {
  id: 'dup-001', name: 'Duplicate Transactions', category: 'Financial',
  description: 'Detects records with identical amount and date/vendor/reference combinations indicating potential duplicate payments or invoices.',
  severity: 'High', riskWeight: 8, enabled: true,
  parameters: {}, applicableDomains: [],
  execute(records, fields) {
    const results: RuleResult[] = [];
    const groups = new Map<string, number[]>();
    records.forEach((r, i) => {
      const amt = String(r[fields.amount ?? ''] ?? '');
      const dt = norm(r[fields.date ?? '']);
      const vendor = norm(r[fields.vendor ?? '']);
      const ref = norm(r[fields.reference ?? '']);
      // Require amount plus at least one other identifying field to avoid false positives
      if (!amt || amt === '' || (!dt && !vendor && !ref)) return;
      const key = `${amt}|${dt}|${vendor || ref}`;
      const arr = groups.get(key) || []; arr.push(i); groups.set(key, arr);
    });
    groups.forEach((indices, key) => {
      if (indices.length > 1) {
        results.push({
          ruleId: 'dup-001',
          title: 'Duplicate Transaction Detected',
          description: `${indices.length} records share identical key (${key.replace(/\|/g, ', ')}). Possible duplicate payment/invoice.`,
          rowIndices: indices,
          fields: records[indices[0]] as any,
        });
      }
    });
    return results;
  },
};

// ── Rule: Duplicate IDs ─────────────────────────────────────────────────────
const duplicateIdRule: AuditRule = {
  id: 'dup-002', name: 'Duplicate Record IDs', category: 'Data Quality',
  description: 'Detects records sharing the same identifier, indicating data integrity issues.',
  severity: 'Medium', riskWeight: 6, enabled: true,
  parameters: {}, applicableDomains: [],
  execute(records, fields) {
    if (!fields.id) return [];
    const results: RuleResult[] = [];
    const idMap = new Map<string, number[]>();
    records.forEach((r, i) => {
      const id = norm(getFieldValue(r, fields, 'id'));
      if (!id) return;
      const arr = idMap.get(id) || []; arr.push(i); idMap.set(id, arr);
    });
    idMap.forEach((indices, id) => {
      if (indices.length > 1) {
        results.push({ ruleId: 'dup-002', title: 'Duplicate ID', description: `ID "${id}" appears ${indices.length} times.`, rowIndices: indices });
      }
    });
    return results;
  },
};

// ── Rule: Amount Exceeds Policy Limit ───────────────────────────────────────
const policyLimitRule: AuditRule = {
  id: 'pol-001', name: 'Policy Limit Exceeded', category: 'Compliance',
  description: 'Flags transactions exceeding configurable policy thresholds.',
  severity: 'High', riskWeight: 7, enabled: true,
  parameters: { limit: 10000 }, applicableDomains: ['Expenses', 'Invoices', 'Purchase Orders', 'Accounts Payable'],
  execute(records, fields, params) {
    if (!fields.amount) return [];
    const limit = params.limit || 10000;
    const results: RuleResult[] = [];
    const violations: number[] = [];
    records.forEach((r, i) => {
      const amt = parseNum(getFieldValue(r, fields, 'amount'));
      if (amt !== null && amt > limit) violations.push(i);
    });
    if (violations.length > 0) {
      results.push({ ruleId: 'pol-001', title: 'Amount Exceeds Policy Limit', description: `${violations.length} transactions exceed the limit of ${limit.toLocaleString()}.`, rowIndices: violations });
    }
    return results;
  },
};

// ── Rule: Negative Amounts ──────────────────────────────────────────────────
const negativeAmountRule: AuditRule = {
  id: 'amt-001', name: 'Negative Amount Detected', category: 'Financial',
  description: 'Identifies transactions with negative monetary values.',
  severity: 'Medium', riskWeight: 5, enabled: true,
  parameters: {}, applicableDomains: [],
  execute(records, fields) {
    if (!fields.amount) return [];
    const indices: number[] = [];
    records.forEach((r, i) => {
      const amt = parseNum(getFieldValue(r, fields, 'amount'));
      if (amt !== null && amt < 0) indices.push(i);
    });
    if (indices.length === 0) return [];
    return [{ ruleId: 'amt-001', title: 'Negative Amount', description: `${indices.length} records have negative amounts.`, rowIndices: indices }];
  },
};

// ── Rule: Missing Approval ──────────────────────────────────────────────────
const missingApprovalRule: AuditRule = {
  id: 'apr-001', name: 'Missing Approval', category: 'Compliance',
  description: 'Detects transactions without an approver recorded.',
  severity: 'High', riskWeight: 7, enabled: true,
  parameters: {}, applicableDomains: ['Expenses', 'Invoices', 'Purchase Orders', 'Payroll'],
  execute(records, fields) {
    if (!fields.approver) return [];
    const indices: number[] = [];
    records.forEach((r, i) => {
      const v = getFieldValue(r, fields, 'approver');
      if (!v || String(v).trim() === '' || norm(v) === 'null') indices.push(i);
    });
    if (indices.length === 0) return [];
    return [{ ruleId: 'apr-001', title: 'Missing Approval', description: `${indices.length} transactions have no approver recorded.`, rowIndices: indices }];
  },
};

// ── Rule: Self-Approval ─────────────────────────────────────────────────────
const selfApprovalRule: AuditRule = {
  id: 'apr-002', name: 'Self-Approval Detected', category: 'Fraud',
  description: 'Flags records where the requestor and approver are the same person.',
  severity: 'Critical', riskWeight: 9, enabled: true,
  parameters: {}, applicableDomains: ['Expenses', 'Invoices', 'Purchase Orders', 'Payroll'],
  execute(records, fields) {
    if (!fields.approver || !fields.employee) return [];
    const indices: number[] = [];
    records.forEach((r, i) => {
      const emp = norm(getFieldValue(r, fields, 'employee'));
      const apr = norm(getFieldValue(r, fields, 'approver'));
      if (emp && apr && emp === apr) indices.push(i);
    });
    if (indices.length === 0) return [];
    return [{ ruleId: 'apr-002', title: 'Self-Approval', description: `${indices.length} records where requestor self-approved.`, rowIndices: indices }];
  },
};

// ── Rule: Weekend/Holiday Transactions ──────────────────────────────────────
const weekendTransactionRule: AuditRule = {
  id: 'tim-001', name: 'Weekend Transaction', category: 'Fraud',
  description: 'Detects transactions occurring on weekends (Saturday/Sunday).',
  severity: 'Medium', riskWeight: 5, enabled: true,
  parameters: {}, applicableDomains: [],
  execute(records, fields) {
    if (!fields.date) return [];
    const indices: number[] = [];
    records.forEach((r, i) => {
      const d = parseDt(getFieldValue(r, fields, 'date'));
      if (d && (d.getDay() === 0 || d.getDay() === 6)) indices.push(i);
    });
    if (indices.length === 0) return [];
    return [{ ruleId: 'tim-001', title: 'Weekend Transaction', description: `${indices.length} transactions occurred on weekends.`, rowIndices: indices }];
  },
};

// ── Rule: After-Hours Transactions ──────────────────────────────────────────
const afterHoursRule: AuditRule = {
  id: 'tim-002', name: 'After-Hours Transaction', category: 'Fraud',
  description: 'Flags transactions with timestamps outside normal business hours (before 7am or after 8pm).',
  severity: 'Medium', riskWeight: 5, enabled: true,
  parameters: {}, applicableDomains: [],
  execute(records, fields) {
    if (!fields.date) return [];
    const indices: number[] = [];
    records.forEach((r, i) => {
      const d = parseDt(getFieldValue(r, fields, 'date'));
      if (d) {
        const h = d.getHours();
        if (h < 7 || h >= 20) indices.push(i);
      }
    });
    if (indices.length === 0) return [];
    return [{ ruleId: 'tim-002', title: 'After-Hours Transaction', description: `${indices.length} transactions outside business hours (7am-8pm).`, rowIndices: indices }];
  },
};

// ── Rule: Round Number Transactions ─────────────────────────────────────────
const roundNumberRule: AuditRule = {
  id: 'rnd-001', name: 'Round Number Transaction', category: 'Fraud',
  description: 'Flags transactions with suspiciously round amounts (multiples of 100/500/1000).',
  severity: 'Low', riskWeight: 3, enabled: true,
  parameters: { threshold: 500 }, applicableDomains: [],
  execute(records, fields, params) {
    if (!fields.amount) return [];
    const threshold = params.threshold || 500;
    const indices: number[] = [];
    records.forEach((r, i) => {
      const amt = parseNum(getFieldValue(r, fields, 'amount'));
      if (amt !== null && amt >= threshold && amt % threshold === 0) indices.push(i);
    });
    if (indices.length === 0) return [];
    return [{ ruleId: 'rnd-001', title: 'Round Number Transaction', description: `${indices.length} transactions with round amounts (multiples of ${threshold}).`, rowIndices: indices }];
  },
};

// ── Rule: Inactive Vendor Payments ──────────────────────────────────────────
const inactiveVendorRule: AuditRule = {
  id: 'vnd-001', name: 'Inactive Vendor Payment', category: 'Operational',
  description: 'Detects payments to vendors with inactive or missing status.',
  severity: 'High', riskWeight: 7, enabled: true,
  parameters: {}, applicableDomains: ['Vendor Data', 'Invoices', 'Accounts Payable', 'Procurement'],
  execute(records, fields) {
    if (!fields.vendor || !fields.status) return [];
    const indices: number[] = [];
    records.forEach((r, i) => {
      const status = norm(getFieldValue(r, fields, 'status'));
      if (status && (status.includes('inactive') || status.includes('suspended') || status.includes('closed') || status.includes('blacklisted'))) indices.push(i);
    });
    if (indices.length === 0) return [];
    return [{ ruleId: 'vnd-001', title: 'Inactive Vendor Payment', description: `${indices.length} transactions with inactive/suspended vendors.`, rowIndices: indices }];
  },
};

// ── Rule: Missing Mandatory Fields ──────────────────────────────────────────
const missingFieldsRule: AuditRule = {
  id: 'dat-001', name: 'Missing Mandatory Fields', category: 'Data Quality',
  description: 'Records with missing critical fields (ID, date, amount).',
  severity: 'Medium', riskWeight: 5, enabled: true,
  parameters: {}, applicableDomains: [],
  execute(records, fields) {
    const mandatory: (keyof CanonicalFields)[] = ['id', 'date', 'amount'];
    const indices: number[] = [];
    records.forEach((r, i) => {
      for (const f of mandatory) {
        if (fields[f]) {
          const v = getFieldValue(r, fields, f);
          if (v === null || v === undefined || String(v).trim() === '') { indices.push(i); break; }
        }
      }
    });
    if (indices.length === 0) return [];
    return [{ ruleId: 'dat-001', title: 'Missing Mandatory Fields', description: `${indices.length} records missing critical fields (id/date/amount).`, rowIndices: indices }];
  },
};

// ── Rule: Expired Contracts/Licenses ────────────────────────────────────────
const expiredContractRule: AuditRule = {
  id: 'cmp-001', name: 'Expired Contract/License', category: 'Compliance',
  description: 'Detects contracts or licenses that have expired based on expiry date field.',
  severity: 'High', riskWeight: 8, enabled: true,
  parameters: {}, applicableDomains: ['Contracts', 'IT Assets', 'Compliance Documents', 'Vendor Data'],
  execute(records, fields) {
    if (!fields.expiryDate) return [];
    const now = new Date();
    const indices: number[] = [];
    records.forEach((r, i) => {
      const d = parseDt(getFieldValue(r, fields, 'expiryDate'));
      if (d && d < now) indices.push(i);
    });
    if (indices.length === 0) return [];
    return [{ ruleId: 'cmp-001', title: 'Expired Contract/License', description: `${indices.length} records have expired dates.`, rowIndices: indices }];
  },
};

// ── Rule: Duplicate Bank Accounts ───────────────────────────────────────────
const duplicateBankRule: AuditRule = {
  id: 'frd-001', name: 'Duplicate Bank Accounts', category: 'Fraud',
  description: 'Detects multiple records sharing the same bank account number.',
  severity: 'Critical', riskWeight: 9, enabled: true,
  parameters: {}, applicableDomains: ['Payroll', 'Vendor Data', 'Expenses'],
  execute(records, fields) {
    if (!fields.bankAccount) return [];
    const bankMap = new Map<string, number[]>();
    records.forEach((r, i) => {
      const bank = norm(getFieldValue(r, fields, 'bankAccount'));
      if (bank && bank.length > 4) {
        const arr = bankMap.get(bank) || []; arr.push(i); bankMap.set(bank, arr);
      }
    });
    const results: RuleResult[] = [];
    bankMap.forEach((indices, bank) => {
      if (indices.length > 1) {
        results.push({ ruleId: 'frd-001', title: 'Duplicate Bank Account', description: `Bank account ending in ...${bank.slice(-4)} appears in ${indices.length} records.`, rowIndices: indices });
      }
    });
    return results;
  },
};

// ── Rule: Duplicate Tax IDs ─────────────────────────────────────────────────
const duplicateTaxIdRule: AuditRule = {
  id: 'frd-002', name: 'Duplicate Tax IDs', category: 'Fraud',
  description: 'Detects multiple records sharing the same tax ID (PAN/GST/VAT).',
  severity: 'High', riskWeight: 8, enabled: true,
  parameters: {}, applicableDomains: ['Vendor Data', 'Invoices', 'Accounts Payable'],
  execute(records, fields) {
    if (!fields.taxId) return [];
    const taxMap = new Map<string, number[]>();
    records.forEach((r, i) => {
      const tid = norm(getFieldValue(r, fields, 'taxId'));
      if (tid && tid.length > 3) {
        const arr = taxMap.get(tid) || []; arr.push(i); taxMap.set(tid, arr);
      }
    });
    const results: RuleResult[] = [];
    taxMap.forEach((indices, tid) => {
      if (indices.length > 1) {
        results.push({ ruleId: 'frd-002', title: 'Duplicate Tax ID', description: `Tax ID "${tid}" appears in ${indices.length} records.`, rowIndices: indices });
      }
    });
    return results;
  },
};

// ── Rule: Split Invoices ────────────────────────────────────────────────────
const splitInvoiceRule: AuditRule = {
  id: 'frd-003', name: 'Potential Split Invoices', category: 'Fraud',
  description: 'Detects multiple invoices from the same vendor on the same date with amounts just below approval thresholds.',
  severity: 'High', riskWeight: 8, enabled: true,
  parameters: { threshold: 5000 }, applicableDomains: ['Invoices', 'Expenses', 'Accounts Payable', 'Purchase Orders'],
  execute(records, fields, params) {
    if (!fields.amount || !fields.vendor || !fields.date) return [];
    const threshold = params.threshold || 5000;
    const groups = new Map<string, number[]>();
    records.forEach((r, i) => {
      const amt = parseNum(getFieldValue(r, fields, 'amount'));
      if (amt !== null && amt > threshold * 0.7 && amt < threshold) {
        const key = `${norm(getFieldValue(r, fields, 'vendor'))}|${norm(getFieldValue(r, fields, 'date'))}`;
        const arr = groups.get(key) || []; arr.push(i); groups.set(key, arr);
      }
    });
    const results: RuleResult[] = [];
    groups.forEach((indices, key) => {
      if (indices.length > 1) {
        results.push({ ruleId: 'frd-003', title: 'Potential Split Invoice', description: `${indices.length} invoices from same vendor/date just below threshold (${key.replace('|', ' on ')}).`, rowIndices: indices });
      }
    });
    return results;
  },
};

// ── Default Rule Set ────────────────────────────────────────────────────────
export const DEFAULT_RULES: AuditRule[] = [
  duplicateTransactionRule,
  duplicateIdRule,
  policyLimitRule,
  negativeAmountRule,
  missingApprovalRule,
  selfApprovalRule,
  weekendTransactionRule,
  afterHoursRule,
  roundNumberRule,
  inactiveVendorRule,
  missingFieldsRule,
  expiredContractRule,
  duplicateBankRule,
  duplicateTaxIdRule,
  splitInvoiceRule,
];

/**
 * Get rules applicable to a specific domain.
 */
export function getApplicableRules(domain: DatasetDomain, customRules?: AuditRule[]): AuditRule[] {
  const allRules = customRules ? [...DEFAULT_RULES, ...customRules] : [...DEFAULT_RULES];
  return allRules.filter(rule => {
    if (!rule.enabled) return false;
    if (rule.applicableDomains.length === 0) return true; // universal
    return rule.applicableDomains.includes(domain);
  });
}

/**
 * Override rule parameters without modifying source.
 */
export function configureRule(ruleId: string, params: Record<string, any>, rules: AuditRule[]): AuditRule[] {
  return rules.map(r => r.id === ruleId ? { ...r, parameters: { ...r.parameters, ...params } } : r);
}

/**
 * Toggle a rule on/off.
 */
export function toggleRule(ruleId: string, enabled: boolean, rules: AuditRule[]): AuditRule[] {
  return rules.map(r => r.id === ruleId ? { ...r, enabled } : r);
}
