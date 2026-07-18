import React from 'react';

interface PerformanceTableProps {
  title: string;
  subtitle: string;
  data: any[];
  totalRevenue: number;
  nameLabel: string;
}

const PerformanceTable = React.memo(function PerformanceTable({ title, subtitle, data, totalRevenue, nameLabel }: PerformanceTableProps) {
  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(val);
  const formatPercent = (val: number) => new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 1 }).format(val);

  return (
    <div className="bg-bg-surface border border-border-primary rounded-xl overflow-hidden shadow-sm flex flex-col print:border-none print:shadow-none">
      <div className="p-5 border-b border-border-primary print:border-b-2">
        <h3 className="text-lg font-bold tracking-tight text-text-primary print:text-black">{title}</h3>
        <p className="text-sm text-text-secondary print:text-gray-600">{subtitle}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-bg-primary border-b border-border-primary text-xs uppercase tracking-widest text-text-muted print:bg-white print:text-gray-800">
              <th className="p-4 font-semibold">{nameLabel}</th>
              <th className="p-4 font-semibold text-right">Revenue</th>
              <th className="p-4 font-semibold text-right">Profit</th>
              <th className="p-4 font-semibold text-right">Orders</th>
              <th className="p-4 font-semibold text-right">% of Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-primary print:divide-gray-200">
            {data.slice(0, 50).map((row, idx) => (
              <tr key={idx} className="hover:bg-bg-primary/50 transition-colors">
                <td className="p-4 text-sm font-medium text-text-primary print:text-black">{row.name}</td>
                <td className="p-4 text-sm text-right text-text-secondary print:text-gray-700">{formatCurrency(row.revenue)}</td>
                <td className="p-4 text-sm text-right text-text-secondary print:text-gray-700">{formatCurrency(row.profit || 0)}</td>
                <td className="p-4 text-sm text-right text-text-secondary print:text-gray-700">{row.orders !== undefined ? row.orders : (row.ordersCount || 0)}</td>
                <td className="p-4 text-sm text-right text-text-secondary font-medium print:text-gray-700">
                  {totalRevenue > 0 ? formatPercent(row.revenue / totalRevenue) : '0%'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});
export default PerformanceTable;
