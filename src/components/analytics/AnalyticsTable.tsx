import React, { useState } from 'react';
import { SalesRecord } from '../../types';
import { ChevronLeft, ChevronRight, AlertTriangle, ShieldCheck } from 'lucide-react';
import AiExplainDrawer from './AiExplainDrawer';

interface AnalyticsTableProps {
  data: SalesRecord[];
}

const AnalyticsTable = React.memo(function AnalyticsTable({ data }: AnalyticsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<SalesRecord | null>(null);

  const { totalPages, currentData } = React.useMemo(() => {
    return {
      totalPages: Math.ceil(data.length / rowsPerPage),
      currentData: data.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)
    };
  }, [data, currentPage]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  const formatDate = (val: Date) => new Date(val).toLocaleDateString();

  const getRiskColor = (risk?: string) => {
    switch (risk) {
      case 'Critical': return 'bg-danger/10 text-danger border-danger/20';
      case 'High': return 'bg-danger/10 text-danger border-danger/20';
      case 'Medium': return 'bg-warning/10 text-warning border-warning/20';
      case 'Low': return 'bg-success/10 text-success border-success/20';
      case 'Normal':
      default: return 'bg-bg-primary text-text-secondary border-border-primary';
    }
  };

  const getRiskIcon = (risk?: string) => {
    switch (risk) {
      case 'Critical':
      case 'High': return <AlertTriangle size={14} className="mr-1" />;
      case 'Medium': return <AlertTriangle size={14} className="mr-1" />;
      case 'Low':
      case 'Normal':
      default: return <ShieldCheck size={14} className="mr-1" />;
    }
  };

  const handleRowClick = (row: SalesRecord) => {
    setSelectedRow(row);
    setDrawerOpen(true);
  };

  return (
    <>
      <div className="bg-bg-surface border border-border-primary rounded-xl overflow-hidden flex flex-col shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-bg-primary border-b border-border-primary text-xs uppercase tracking-widest text-text-muted">
                <th className="p-4 font-semibold">Order ID</th>
                <th className="p-4 font-semibold">Date</th>
                <th className="p-4 font-semibold">Customer</th>
                <th className="p-4 font-semibold">Product</th>
                <th className="p-4 font-semibold text-right">Amount</th>
                <th className="p-4 font-semibold text-center">Risk Flag</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {currentData.map((row, idx) => (
                <tr 
                  key={idx} 
                  onClick={() => handleRowClick(row)}
                  className="border-b border-border-primary hover:bg-bg-primary transition-colors cursor-pointer"
                >
                  <td className="p-4 text-text-primary font-medium">{row.order_id}</td>
                  <td className="p-4 text-text-secondary">{row.order_date ? formatDate(row.order_date) : 'N/A'}</td>
                  <td className="p-4 text-text-primary">{row.customer_name}</td>
                  <td className="p-4 text-text-secondary">{row.product_name}</td>
                  <td className="p-4 text-text-primary font-medium text-right">{formatCurrency(row.total_sales)}</td>
                  <td className="p-4 flex justify-center">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getRiskColor(row.riskFlag)}`}>
                      {getRiskIcon(row.riskFlag)} {row.riskFlag || 'Normal'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 border-t border-border-primary flex items-center justify-between bg-bg-surface">
          <span className="text-sm text-text-secondary">
            Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, data.length)} of {data.length}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded-md border border-border-primary text-text-secondary disabled:opacity-50 hover:bg-bg-primary transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded-md border border-border-primary text-text-secondary disabled:opacity-50 hover:bg-bg-primary transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      <AiExplainDrawer 
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Transaction Analysis"
        type="row"
        data={selectedRow}
      />
    </>
  );
});
export default AnalyticsTable;
