import React, { useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

export interface PerformanceRow {
  name: string;
  revenue: number;
  profit: number;
  orders: number;
  quantity: number;
}

interface PerformanceTableProps {
  title: string;
  subtitle: string;
  data: PerformanceRow[];
  totalRevenue: number;
  nameLabel: string;
}

type SortField = 'name' | 'revenue' | 'profit' | 'margin' | 'avgPrice' | 'orders' | 'quantity' | 'pctRev';
type SortDirection = 'asc' | 'desc';

export function PerformanceTable({ title, subtitle, data, totalRevenue, nameLabel }: PerformanceTableProps) {
  const [sortField, setSortField] = useState<SortField>('revenue');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedData = React.useMemo(() => {
    return [...data].sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      const marginA = a.revenue > 0 ? (a.profit / a.revenue) * 100 : 0;
      const marginB = b.revenue > 0 ? (b.profit / b.revenue) * 100 : 0;
      
      const avgA = a.revenue / (a.quantity || 1);
      const avgB = b.revenue / (b.quantity || 1);

      const pctA = (a.revenue / totalRevenue) * 100;
      const pctB = (b.revenue / totalRevenue) * 100;

      switch (sortField) {
        case 'name':
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
          break;
        case 'revenue':
          valA = a.revenue;
          valB = b.revenue;
          break;
        case 'profit':
          valA = a.profit;
          valB = b.profit;
          break;
        case 'margin':
          valA = marginA;
          valB = marginB;
          break;
        case 'avgPrice':
          valA = avgA;
          valB = avgB;
          break;
        case 'orders':
          valA = a.orders;
          valB = b.orders;
          break;
        case 'quantity':
          valA = a.quantity;
          valB = b.quantity;
          break;
        case 'pctRev':
          valA = pctA;
          valB = pctB;
          break;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortField, sortDirection, totalRevenue]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="ml-1 opacity-40 group-hover:opacity-100 transition-opacity" />;
    return sortDirection === 'asc' 
      ? <ArrowUp size={14} className="ml-1 text-[var(--chart-0)]" /> 
      : <ArrowDown size={14} className="ml-1 text-[var(--chart-0)]" />;
  };

  const Th = ({ field, label, align = 'right' }: { field: SortField, label: string, align?: 'left' | 'right' }) => (
    <th 
      className={`px-4 py-3.5 font-semibold cursor-pointer select-none group transition-colors hover:bg-border-primary/30 ${align === 'right' ? 'text-right' : 'text-left'}`}
      onClick={() => handleSort(field)}
    >
      <div className={`flex items-center ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
        {label}
        <SortIcon field={field} />
      </div>
    </th>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="border-b border-border-primary pb-2 flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight text-text-primary print:text-black">{title}</h2>
        <span className="text-xs font-medium text-text-secondary">{subtitle}</span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border-primary bg-bg-surface shadow-sm max-h-[500px]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="text-xs text-text-secondary uppercase border-b border-border-primary bg-bg-surface sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-4 py-3.5 font-semibold w-16">Rank</th>
              <Th field="name" label={nameLabel} align="left" />
              <Th field="revenue" label="Revenue" />
              <Th field="profit" label="Profit" />
              <Th field="margin" label="Margin" />
              <Th field="avgPrice" label="Avg Price" />
              <Th field="orders" label="Orders" />
              <Th field="quantity" label="Qty" />
              <Th field="pctRev" label="% Rev" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border-primary/50">
            {sortedData.slice(0, 50).map((p, idx) => {
              const margin = p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0;
              const pctRev = (p.revenue / totalRevenue) * 100;
              const avgPrice = p.revenue / (p.quantity || 1);
              
              return (
                <tr key={idx} className="hover:bg-bg-primary/50 transition-colors border-b border-border-primary last:border-0">
                  <td className="px-4 py-3 font-medium text-text-secondary">#{idx + 1}</td>
                  <td className="px-4 py-3 font-medium text-text-primary">
                    <div className="max-w-[280px] sm:max-w-md md:max-w-lg lg:max-w-xl truncate" title={p.name}>
                      {p.name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-text-primary font-medium">{formatCurrency(p.revenue)}</td>
                  <td className="px-4 py-3 text-right text-text-primary font-medium">{formatCurrency(p.profit)}</td>
                  <td className={`px-4 py-3 text-right font-medium ${p.profit > 0 ? 'text-success' : p.profit < 0 ? 'text-error' : 'text-text-secondary'}`}>
                    {margin.toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-right text-text-secondary">{formatCurrency(avgPrice)}</td>
                  <td className="px-4 py-3 text-right text-text-secondary">{p.orders}</td>
                  <td className="px-4 py-3 text-right text-text-secondary flex flex-col items-end">
                     <span>{p.quantity}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-text-secondary">{pctRev.toFixed(1)}%</span>
                      <div className="w-16 h-1.5 bg-border-primary rounded-full overflow-hidden flex-shrink-0">
                        <div className="h-full bg-[var(--chart-0)]" style={{ width: `${Math.min(pctRev, 100)}%` }} />
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
