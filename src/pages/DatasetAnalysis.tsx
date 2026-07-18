import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { 
  CheckCircle2, AlertTriangle, FileSpreadsheet,
  Database, LineChart, PieChart, BarChart3, Users, Zap, ArrowRight
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function DatasetAnalysis() {
  const navigate = useNavigate();
  const activeDataset = useAppStore(state => state.activeDataset);

  useEffect(() => {
    if (!activeDataset) {
      navigate('/');
    }
  }, [activeDataset, navigate]);

  if (!activeDataset) return null;

  const { stats, name, size } = activeDataset;

  const hasDate = stats.detectedFields.includes('Date');
  const hasRevenue = stats.detectedFields.includes('Revenue');
  const hasCategory = stats.detectedFields.includes('Category');
  const hasRegion = stats.detectedFields.includes('Region');
  const hasCustomer = stats.detectedFields.includes('Customer');

  const availableVisualizations = [];
  if (hasDate && hasRevenue) availableVisualizations.push({ name: 'Revenue Trend', icon: <LineChart size={18} /> });
  if (hasCategory) availableVisualizations.push({ name: 'Category Breakdown', icon: <PieChart size={18} /> });
  if (hasRegion) availableVisualizations.push({ name: 'Regional Performance', icon: <BarChart3 size={18} /> });
  if (hasCustomer) availableVisualizations.push({ name: 'Top Customers', icon: <Users size={18} /> });
  if (hasDate && hasRevenue) availableVisualizations.push({ name: 'Forecast', icon: <Zap size={18} /> });

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (ms: number) => {
    return new Date(ms).toLocaleDateString();
  };

  const healthScore = stats.healthScore ?? 100;
  let healthLabel = 'Poor';
  let healthColor = 'text-error';
  if (healthScore >= 90) {
    healthLabel = 'Excellent';
    healthColor = 'text-success';
  } else if (healthScore >= 70) {
    healthLabel = 'Good';
    healthColor = 'text-accent-primary';
  } else if (healthScore >= 50) {
    healthLabel = 'Fair';
    healthColor = 'text-warning';
  }

  const issues = [];
  if (stats.duplicatesRemoved > 0) issues.push(`${stats.duplicatesRemoved} duplicate row${stats.duplicatesRemoved > 1 ? 's' : ''}`);
  if (stats.missingValuesHandled > 0) issues.push(`${stats.missingValuesHandled} missing value${stats.missingValuesHandled > 1 ? 's' : ''}`);
  if (stats.invalidDates > 0) issues.push(`${stats.invalidDates} invalid date${stats.invalidDates > 1 ? 's' : ''}`);
  if (stats.invalidNumbers > 0) issues.push(`${stats.invalidNumbers} invalid number${stats.invalidNumbers > 1 ? 's' : ''}`);
  if (stats.emptyColumns > 0) issues.push(`${stats.emptyColumns} empty column${stats.emptyColumns > 1 ? 's' : ''}`);

  return (
    <div className="flex-1 w-full overflow-y-auto bg-bg-primary text-text-primary p-6 lg:p-12 font-sans">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-12"
        >
          <div className="flex items-center gap-4 mb-16">
            <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center text-success">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-text-primary">Dataset Ready</h1>
              <p className="text-lg text-text-secondary mt-1">Your data has been successfully ingested and analyzed.</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-16 mb-16">
            
            {/* Overview - Text based layout */}
            <div className="flex flex-col gap-6">
              <h2 className="text-xl font-bold tracking-tight text-text-primary">Overview</h2>
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center border-b border-border-primary pb-3">
                  <span className="text-text-secondary">Name</span>
                  <span className="font-medium text-text-primary flex items-center gap-2">
                    <FileSpreadsheet size={16} className="text-text-muted" /> {name}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-border-primary pb-3">
                  <span className="text-text-secondary">File Size</span>
                  <span className="font-medium text-text-primary">{formatSize(size)}</span>
                </div>
                <div className="flex justify-between items-center border-b border-border-primary pb-3">
                  <span className="text-text-secondary">Total Rows</span>
                  <span className="font-medium text-text-primary">{stats.totalRows.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center border-b border-border-primary pb-3">
                  <span className="text-text-secondary">Total Columns</span>
                  <span className="font-medium text-text-primary">{stats.totalColumns}</span>
                </div>
                {stats.dateRange && (
                  <div className="flex justify-between items-center border-b border-border-primary pb-3">
                    <span className="text-text-secondary">Date Range</span>
                    <span className="font-medium text-text-primary">
                      {formatDate(stats.dateRange.start)} - {formatDate(stats.dateRange.end)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Health & Issues */}
            <div className="flex flex-col gap-6">
              <h2 className="text-xl font-bold tracking-tight text-text-primary">Health Assessment</h2>
              <div className="flex items-baseline gap-3 mb-2">
                <span className={`text-5xl font-bold tracking-tighter ${healthColor}`}>
                  {healthScore}
                </span>
                <span className="text-lg text-text-muted">/ 100</span>
                <span className={`text-sm font-semibold uppercase tracking-wider ml-2 ${healthColor}`}>
                  {healthLabel}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-text-primary mb-3">Issues Found</h3>
                {issues.length > 0 ? (
                  <ul className="flex flex-col gap-2">
                    {issues.map((issue, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-text-secondary">
                        <AlertTriangle size={16} className="text-warning" />
                        {issue}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex items-center gap-2 text-success font-medium">
                    <CheckCircle2 size={16} />
                    No issues detected
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-16 mb-16">
            <div className="flex flex-col gap-6">
              <h2 className="text-xl font-bold tracking-tight text-text-primary">Detected Fields</h2>
              {stats.detectedFields.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {stats.detectedFields.map(field => (
                    <div key={field} className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-surface border border-border-primary text-text-primary rounded-md text-sm font-medium">
                      <CheckCircle2 size={14} className="text-success" />
                      {field}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-text-secondary">No standard fields could be mapped automatically.</div>
              )}
            </div>

            <div className="flex flex-col gap-6">
              <h2 className="text-xl font-bold tracking-tight text-text-primary">Available Visualizations</h2>
              <div className="flex flex-wrap gap-2">
                {availableVisualizations.length > 0 ? (
                  availableVisualizations.map((vis, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-bg-surface border border-border-primary rounded-md px-3 py-1.5">
                      <div className="text-text-muted">{vis.icon}</div>
                      <span className="text-sm font-medium text-text-primary">{vis.name}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-text-secondary">
                    Not enough standard fields detected to generate visualizations.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-border-primary flex justify-end">
            <button 
              onClick={() => navigate('/analytics')}
              className="bg-text-primary text-bg-primary px-8 py-3 rounded-lg font-medium transition-all hover:bg-text-secondary active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-text-primary focus:ring-offset-2 focus:ring-offset-bg-primary flex items-center gap-2 shadow-sm"
            >
              Open Dashboard
              <ArrowRight size={18} />
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
