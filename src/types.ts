export interface SalesRecord {
  order_id: string;
  order_date: Date;
  customer_name: string;
  product_name: string;
  category: string;
  region: string;
  quantity: number;
  unit_price: number;
  discount: number;
  returned: string;
  total_sales: number;
  profit: number;
  month: string;
  riskFlag?: 'Normal' | 'Low' | 'Medium' | 'High' | 'Critical';
  riskReason?: string;
  year: number;
}

export interface Insight {
  id: string;
  type: 'positive' | 'negative' | 'info' | 'warning';
  title: string;
  description: string;
}

export interface DataMetrics {
  totalRevenue: number;
  totalProfit: number;
  averageOrderValue: number;
  totalOrders: number;
  uniqueCustomers: number;
  uniqueProducts: number;
  averageQuantity: number;
  revenuePerCustomer: number;
  revenuePerProduct: number;
  bestMonth: { month: string; revenue: number } | null;
  worstMonth: { month: string; revenue: number } | null;
  highestSellingProduct: { name: string; revenue: number } | null;
  lowestSellingProduct: { name: string; revenue: number } | null;
  highestRevenueRegion: { name: string; revenue: number } | null;
  highestRevenueCategory: { name: string; revenue: number } | null;
  growth: number;
}

export interface DataProfiling {
  numericColumns: number;
  categoricalColumns: number;
  dateColumns: number;
  uniqueValues: Record<string, number>;
}

export interface DataStats {
  totalRows: number;
  totalColumns: number;
  cleanedRows: number;
  duplicatesRemoved: number;
  missingValuesHandled: number;
  invalidDates: number;
  invalidNumbers: number;
  emptyColumns: number;
  healthScore: number;
  aiAnalysis?: AIRiskAnalysis;
  dateRange?: { start: number; end: number };
  insights: Insight[];
  detectedFields: string[];
  metrics: DataMetrics;
  profiling: DataProfiling;
}

export interface DataResult {
  data: SalesRecord[];
  stats: DataStats;
}

export interface Dataset {
  id: string;
  name: string;
  createdAt: number;
  size: number;
  stats: DataStats;
  data: SalesRecord[];
}

export interface DashboardSnapshot {
  id: string;
  datasetId: string;
  name: string;
  createdAt: number;
  filters: {
    year: string;
    category: string;
    region: string;
    timeHorizon: '1M' | '1Y' | 'ALL';
  };
}

export interface AppSettings {
  theme: 'dark' | 'light';
  animationsEnabled: boolean;
  aiModel: string;
  defaultProfile: AnalysisProfile;
  reportFormat: string;
  language: string;
}

export type AnalysisProfile = 'Business Intelligence' | 'Internal Audit' | 'Financial Analysis' | 'Sales Analytics' | 'Operations Analytics';

export interface AuditObservation {
  id: string;
  observation: string;
  evidence: string;
  businessImpact: string;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  recommendation: string;
}

export interface RiskAlert {
  id: string;
  title: string;
  description: string;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
}

export interface AIRiskAnalysis {
  riskScore: number;
  complianceScore: number;
  aiConfidence: number;
  anomaliesDetected: number;
  criticalFindings: number;
  auditReadiness: string;
  domain: string;
  potentialAnomalies: number;
  policyViolations: number;
  duplicateTransactions: number;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  observations: AuditObservation[];
  riskAlerts: RiskAlert[];
  recommendations: string[];
}

// Re-export audit module types for convenience
export type {
    AuditFinding, AuditRecord, AuditReport, AuditResult, AuditRule, CanonicalFields, ColumnProfile, ColumnType, ComplianceCheck, DataQualityIssue, DataQualityReport, DatasetDomain, EvidenceItem, FraudIndicator, PipelineProgress, PipelineStage, Priority,
    RiskAssessment, RiskCategory, RuleResult, SeverityLevel
} from './audit/types';

