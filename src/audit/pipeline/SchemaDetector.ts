// ──────────────────────────────────────────────────────────────────────────────
// SchemaDetector – Auto-detect dataset domain from columns and values
// ──────────────────────────────────────────────────────────────────────────────
import { DatasetDomain } from '../types';

interface DomainSignature {
  domain: DatasetDomain;
  keywords: string[];
  valuePatterns?: RegExp[];
}

const DOMAIN_SIGNATURES: DomainSignature[] = [
  {
    domain: 'Payroll',
    keywords: ['salary', 'wage', 'payroll', 'payslip', 'gross pay', 'net pay', 'deduction', 'tax withholding', 'bonus', 'overtime pay', 'pay period', 'employee id', 'bank account', 'social security', 'ssn'],
  },
  {
    domain: 'Expenses',
    keywords: ['expense', 'reimbursement', 'claim', 'receipt', 'expense report', 'travel expense', 'per diem', 'mileage', 'out of pocket', 'expense category', 'submission date', 'approval date', 'policy limit'],
  },
  {
    domain: 'Invoices',
    keywords: ['invoice', 'invoice number', 'invoice date', 'due date', 'bill to', 'ship to', 'line item', 'subtotal', 'tax amount', 'payment terms', 'po number', 'billing'],
  },
  {
    domain: 'Purchase Orders',
    keywords: ['purchase order', 'po number', 'po date', 'requisition', 'buyer', 'supplier', 'order quantity', 'unit cost', 'delivery date', 'goods receipt', 'purchase requisition'],
  },
  {
    domain: 'Vendor Data',
    keywords: ['vendor', 'supplier', 'vendor id', 'supplier id', 'vendor name', 'payment terms', 'vendor category', 'tax id', 'pan', 'gst', 'registration number', 'vendor status', 'bank details'],
  },
  {
    domain: 'Employee Records',
    keywords: ['employee', 'employee id', 'employee name', 'department', 'designation', 'job title', 'hire date', 'manager', 'reporting to', 'employment type', 'full time', 'part time', 'contractor'],
  },
  {
    domain: 'Attendance',
    keywords: ['attendance', 'check in', 'check out', 'hours worked', 'overtime', 'leave', 'absent', 'present', 'shift', 'clock in', 'clock out', 'timesheet', 'work hours'],
  },
  {
    domain: 'Project Tracking',
    keywords: ['project', 'project id', 'project name', 'milestone', 'task', 'sprint', 'budget', 'actual cost', 'planned cost', 'variance', 'project manager', 'status', 'completion'],
  },
  {
    domain: 'Sales',
    keywords: ['order', 'sale', 'customer', 'product', 'revenue', 'quantity sold', 'unit price', 'discount', 'region', 'sales rep', 'sales amount'],
  },
  {
    domain: 'Finance',
    keywords: ['account', 'debit', 'credit', 'journal entry', 'ledger', 'trial balance', 'general ledger', 'chart of accounts', 'fiscal year', 'period', 'gl account'],
  },
  {
    domain: 'Inventory',
    keywords: ['inventory', 'sku', 'stock', 'warehouse', 'quantity on hand', 'reorder level', 'item code', 'bin location', 'stock movement', 'inventory value'],
  },
  {
    domain: 'Procurement',
    keywords: ['procurement', 'rfq', 'rfp', 'bid', 'tender', 'contract', 'sourcing', 'procurement category', 'negotiation', 'award'],
  },
  {
    domain: 'IT Assets',
    keywords: ['asset', 'asset id', 'serial number', 'hardware', 'software', 'license', 'it asset', 'mac address', 'ip address', 'device type', 'warranty', 'amc'],
  },
  {
    domain: 'Access Logs',
    keywords: ['access', 'login', 'logout', 'user id', 'ip address', 'session', 'authentication', 'permission', 'role', 'access level', 'timestamp', 'action'],
  },
  {
    domain: 'Compliance Documents',
    keywords: ['compliance', 'certification', 'audit', 'control', 'policy', 'standard', 'regulation', 'iso', 'soc', 'gdpr', 'hipaa', 'finding', 'remediation'],
  },
  {
    domain: 'Contracts',
    keywords: ['contract', 'agreement', 'contract id', 'start date', 'end date', 'expiry', 'renewal', 'party', 'signatory', 'contract value', 'terms', 'sla'],
  },
  {
    domain: 'HR Data',
    keywords: ['hr', 'recruitment', 'candidate', 'interview', 'offer', 'onboarding', 'performance review', 'appraisal', 'training', 'competency', 'skill'],
  },
  {
    domain: 'General Ledger',
    keywords: ['gl', 'general ledger', 'account code', 'journal', 'posting', 'fiscal period', 'cost center', 'profit center', 'debit amount', 'credit amount'],
  },
  {
    domain: 'Accounts Payable',
    keywords: ['payable', 'ap', 'payment', 'vendor payment', 'check number', 'payment date', 'invoice amount', 'aging', 'due amount', 'credit note'],
  },
  {
    domain: 'Accounts Receivable',
    keywords: ['receivable', 'ar', 'collection', 'customer payment', 'aging report', 'outstanding', 'invoice amount', 'credit limit', 'payment received'],
  },
  {
    domain: 'Fixed Assets',
    keywords: ['fixed asset', 'depreciation', 'asset register', 'book value', 'acquisition date', 'useful life', 'salvage value', 'asset category', 'net book value'],
  },
  {
    domain: 'Budget',
    keywords: ['budget', 'forecast', 'planned', 'actual', 'variance', 'budget line', 'allocation', 'cost center', 'fiscal year', 'quarter'],
  },
  {
    domain: 'Travel',
    keywords: ['travel', 'trip', 'booking', 'flight', 'hotel', 'airfare', 'itinerary', 'travel request', 'travel approval', 'per diem', 'mileage'],
  },
];

interface DetectionResult {
  domain: DatasetDomain;
  confidence: number;
  matchedKeywords: string[];
  reasoning: string;
}

function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ');
}

export function detectDomain(columns: string[], sampleData: Record<string, any>[] = []): DetectionResult {
  const normalizedCols = columns.map(normalize);
  const colJoined = normalizedCols.join(' ');

  const scores: { domain: DatasetDomain; score: number; matched: string[] }[] = [];

  for (const sig of DOMAIN_SIGNATURES) {
    let score = 0;
    const matched: string[] = [];
    for (const kw of sig.keywords) {
      const nkw = normalize(kw);
      if (normalizedCols.some(c => c === nkw || c.includes(nkw) || nkw.includes(c))) {
        score += 3;
        matched.push(kw);
      } else if (colJoined.includes(nkw)) {
        score += 1.5;
        matched.push(kw);
      }
    }
    // Check sample values for domain hints
    if (sampleData.length > 0 && sig.valuePatterns) {
      const sampleText = JSON.stringify(sampleData.slice(0, 10)).toLowerCase();
      for (const pat of sig.valuePatterns) {
        if (pat.test(sampleText)) score += 2;
      }
    }
    if (score > 0) {
      scores.push({ domain: sig.domain, score, matched });
    }
  }

  scores.sort((a, b) => b.score - a.score);

  if (scores.length === 0 || scores[0].score < 2) {
    return {
      domain: 'Unknown',
      confidence: 30,
      matchedKeywords: [],
      reasoning: `No strong domain match found from ${columns.length} columns. The dataset will be analyzed generically.`,
    };
  }

  const top = scores[0];
  const maxPossible = DOMAIN_SIGNATURES.find(s => s.domain === top.domain)!.keywords.length * 3;
  const confidence = Math.min(98, Math.round((top.score / maxPossible) * 100 + 20));

  return {
    domain: top.domain,
    confidence,
    matchedKeywords: top.matched,
    reasoning: `Matched ${top.matched.length} domain keywords across ${columns.length} columns: "${top.matched.slice(0, 6).join('", "')}"`,
  };
}
