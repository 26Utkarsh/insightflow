// ──────────────────────────────────────────────────────────────────────────────
// ColumnMapper – Semantic column mapping per domain
// ──────────────────────────────────────────────────────────────────────────────
import { CanonicalFields, DatasetDomain } from '../types';

interface FieldAlias {
  canonical: keyof CanonicalFields;
  aliases: string[];
}

const FIELD_ALIASES: FieldAlias[] = [
  { canonical: 'id', aliases: ['id', 'record id', 'ref', 'reference', 'code', 'number', 'no', 'transaction id', 'invoice id', 'order id', 'employee id', 'vendor id', 'asset id', 'contract id', 'po id', 'claim id', 'ticket id', 'case id'] },
  { canonical: 'date', aliases: ['date', 'transaction date', 'invoice date', 'order date', 'payment date', 'created date', 'created at', 'submitted date', 'submission date', 'approval date', 'posting date', 'entry date', 'effective date', 'transaction_date'] },
  { canonical: 'amount', aliases: ['amount', 'total', 'total amount', 'value', 'sum', 'gross amount', 'net amount', 'invoice amount', 'payment amount', 'salary', 'wage', 'expense amount', 'claim amount', 'cost', 'price', 'total_sales', 'revenue', 'unit_price', 'total sales'] },
  { canonical: 'approver', aliases: ['approver', 'approved by', 'manager', 'approved', 'authorized by', 'reviewer', 'reviewed by', 'supervisor', 'sign off', 'signoff'] },
  { canonical: 'vendor', aliases: ['vendor', 'supplier', 'vendor name', 'supplier name', 'payee', 'creditor', 'service provider', 'contractor', 'provider', 'merchant'] },
  { canonical: 'employee', aliases: ['employee', 'employee name', 'staff', 'worker', 'person', 'requestor', 'claimant', 'applicant', 'user name', 'full name', 'name'] },
  { canonical: 'department', aliases: ['department', 'dept', 'division', 'business unit', 'bu', 'cost center', 'team', 'section', 'function', 'org unit', 'organization'] },
  { canonical: 'status', aliases: ['status', 'state', 'condition', 'phase', 'workflow status', 'approval status', 'payment status', 'current status', 'active', 'is active'] },
  { canonical: 'description', aliases: ['description', 'desc', 'details', 'narrative', 'memo', 'remarks', 'notes', 'comment', 'purpose', 'reason', 'particulars', 'item description', 'product_name', 'product name', 'item', 'item name'] },
  { canonical: 'category', aliases: ['category', 'type', 'class', 'classification', 'group', 'expense category', 'account type', 'product category', 'service type', 'nature', 'head'] },
  { canonical: 'reference', aliases: ['reference', 'ref number', 'ref no', 'po number', 'po no', 'invoice number', 'invoice no', 'receipt number', 'voucher number', 'check number', 'cheque number', 'document number'] },
  { canonical: 'currency', aliases: ['currency', 'ccy', 'currency code', 'curr'] },
  { canonical: 'email', aliases: ['email', 'e-mail', 'email address', 'mail', 'contact email'] },
  { canonical: 'phone', aliases: ['phone', 'telephone', 'mobile', 'contact number', 'phone number', 'cell'] },
  { canonical: 'bankAccount', aliases: ['bank account', 'account number', 'bank account number', 'iban', 'routing', 'account no', 'bank details'] },
  { canonical: 'taxId', aliases: ['tax id', 'tax number', 'tin', 'pan', 'gstin', 'gst number', 'vat number', 'ssn', 'ein', 'abn'] },
  { canonical: 'contractDate', aliases: ['contract date', 'start date', 'agreement date', 'effective date', 'commencement date'] },
  { canonical: 'expiryDate', aliases: ['expiry date', 'end date', 'expiration date', 'valid until', 'valid to', 'termination date', 'renewal date', 'maturity date'] },
];

function normalizeKey(k: string): string {
  return k.toLowerCase().trim().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ');
}

/**
 * Map raw column names to canonical audit fields.
 * Returns a CanonicalFields object where each key maps to the actual column name in the data.
 */
export function mapColumns(columns: string[], _domain?: DatasetDomain): CanonicalFields {
  const normalizedCols = columns.map(normalizeKey);
  const result: CanonicalFields = {};

  for (const fieldDef of FIELD_ALIASES) {
    let bestMatch: string | undefined;

    // Exact match first
    for (const alias of fieldDef.aliases) {
      const nAlias = normalizeKey(alias);
      const idx = normalizedCols.indexOf(nAlias);
      if (idx !== -1) {
        bestMatch = columns[idx];
        break;
      }
    }

    // Partial match fallback
    if (!bestMatch) {
      for (const alias of fieldDef.aliases) {
        const nAlias = normalizeKey(alias);
        const idx = normalizedCols.findIndex(c => c.includes(nAlias) || nAlias.includes(c));
        if (idx !== -1) {
          bestMatch = columns[idx];
          break;
        }
      }
    }

    if (bestMatch) {
      (result as any)[fieldDef.canonical] = bestMatch;
    }
  }

  return result;
}

/**
 * Get the value of a canonical field from a record.
 */
export function getFieldValue(record: Record<string, any>, mappedFields: CanonicalFields, field: keyof CanonicalFields): any {
  const colName = mappedFields[field];
  if (!colName) return undefined;
  return record[colName];
}

/**
 * Return all mapped column names.
 */
export function getMappedColumnNames(mappedFields: CanonicalFields): string[] {
  return Object.values(mappedFields).filter(Boolean) as string[];
}

/**
 * Return unmapped column names (columns not assigned to any canonical field).
 */
export function getUnmappedColumns(columns: string[], mappedFields: CanonicalFields): string[] {
  const mapped = new Set(getMappedColumnNames(mappedFields));
  return columns.filter(c => !mapped.has(c));
}
