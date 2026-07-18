import React from 'react';
import { DataStats } from '../types';
import { motion } from 'framer-motion';
import { Activity, AlertTriangle, FileWarning, Zap, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '../store';

export default function DataProfile() {
  const activeDataset = useAppStore(state => state.activeDataset);
  if (!activeDataset || !activeDataset.stats) return null;
  const stats = activeDataset.stats;

  return (
    <div className="bg-bg-surface border border-border-primary rounded-[32px] p-[40px] shadow-sm mb-[32px]">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-[20px] font-bold text-text-primary tracking-tight mb-1">Dataset Profile</h2>
          <p className="text-[14px] font-medium text-text-muted">Analysis of uploaded data quality and structure</p>
        </div>
        <div className="flex items-center gap-3">
           <div className={`px-4 py-2 rounded-full border text-[13px] font-bold flex items-center gap-2
             ${(stats.healthScore || 0) > 85 ? 'bg-success/10 border-success/30 text-success' : 
               (stats.healthScore || 0) > 60 ? 'bg-warning/10 border-warning/30 text-warning' : 
               'bg-danger/10 border-danger/30 text-danger'}`}
           >
             <Activity size={16} /> Health Score: {stats.healthScore || 0}%
           </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
         <div className="flex flex-col gap-1 p-4 rounded-[16px] bg-bg-primary border border-border-primary/50">
            <span className="text-[12px] font-bold uppercase tracking-widest text-text-muted">Total Rows</span>
            <span className="text-[24px] font-bold text-text-primary">{stats.totalRows.toLocaleString()}</span>
         </div>
         <div className="flex flex-col gap-1 p-4 rounded-[16px] bg-bg-primary border border-border-primary/50">
            <span className="text-[12px] font-bold uppercase tracking-widest text-text-muted">Valid Rows</span>
            <span className="text-[24px] font-bold text-text-primary">{stats.cleanedRows.toLocaleString()}</span>
         </div>
         <div className="flex flex-col gap-1 p-4 rounded-[16px] bg-bg-primary border border-border-primary/50">
            <span className="text-[12px] font-bold uppercase tracking-widest text-text-muted flex items-center gap-1"><FileWarning size={12}/> Missing Data</span>
            <span className="text-[24px] font-bold text-text-primary">{stats.missingValuesHandled.toLocaleString()}</span>
         </div>
         <div className="flex flex-col gap-1 p-4 rounded-[16px] bg-bg-primary border border-border-primary/50">
            <span className="text-[12px] font-bold uppercase tracking-widest text-text-muted flex items-center gap-1"><AlertTriangle size={12}/> Duplicates</span>
            <span className="text-[24px] font-bold text-text-primary">{stats.duplicatesRemoved.toLocaleString()}</span>
         </div>
      </div>

      {stats.insights && stats.insights.length > 0 && (
         <div>
            <h3 className="text-[14px] font-bold text-text-primary mb-4 flex items-center gap-2">
              <Zap size={16} className="text-accent-primary" /> Key Insights
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {stats.insights.map(insight => (
                  <div key={insight.id} className="p-5 rounded-[20px] bg-bg-primary border border-border-primary/50 flex flex-col gap-2 relative overflow-hidden group">
                     <div className={`absolute top-0 left-0 w-1 h-full 
                        ${insight.type === 'positive' ? 'bg-success' : 
                          insight.type === 'negative' ? 'bg-danger' : 
                          'bg-accent-primary'}`} 
                     />
                     <div className="flex items-center gap-2 text-[14px] font-bold text-text-primary">
                        {insight.type === 'positive' ? <CheckCircle2 size={16} className="text-success" /> : null}
                        {insight.title}
                     </div>
                     <p className="text-[13px] text-text-secondary font-medium leading-relaxed">
                        {insight.description}
                     </p>
                  </div>
               ))}
            </div>
         </div>
      )}
    </div>
  );
}
