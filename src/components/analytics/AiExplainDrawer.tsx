import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import Markdown from 'react-markdown';
import { useAppStore } from '../../store';

interface AiExplainDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  type: 'chart' | 'row';
  data?: any;
}

const AiExplainDrawer = React.memo(function AiExplainDrawer({ isOpen, onClose, title, type, data }: AiExplainDrawerProps) {
  const settings = useAppStore(state => state.settings);
  const activeDataset = useAppStore(state => state.activeDataset);
  
  const [analysis, setAnalysis] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const payload = JSON.stringify(data ?? null);
      setAnalysis('');
      setIsLoading(true);
      fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: settings.defaultProfile,
          type,
          query: `Analyze this context deeply: ${title}. Data payload: ${payload.slice(0, 500)}`,
          metrics: activeDataset?.stats.metrics || {},
          context: activeDataset?.stats.detectedFields || []
        })
      })
      .then(res => res.json())
      .then(resData => {
        setAnalysis(resData.answer || 'Analysis is being generated for this context.');
      })
      .catch(() => {
        setAnalysis('Analysis is temporarily unavailable. Please try again shortly.');
      })
      .finally(() => {
        setIsLoading(false);
      });
    }
  }, [isOpen, title, data, settings.defaultProfile, activeDataset]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-bg-primary/50 backdrop-blur-sm z-40 print:hidden"
          />
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-lg bg-bg-surface border-l border-border-primary z-50 shadow-2xl flex flex-col"
          >
            <div className="p-6 border-b border-border-primary flex items-center justify-between bg-bg-primary">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent-primary/10 flex items-center justify-center text-accent-primary">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h2 className="font-bold text-text-primary text-lg flex items-center gap-2">
                    AI Analysis
                  </h2>
                  <p className="text-xs text-text-muted">{settings.defaultProfile}</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg-surface text-text-muted hover:text-text-primary transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              
              <div>
                <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-widest mb-3">Context</h3>
                <div className="bg-bg-primary border border-border-primary rounded-lg p-4 text-sm text-text-primary font-medium">
                  {title}
                </div>
              </div>

              {isLoading ? (
                <div className="flex flex-col gap-4">
                   <div className="h-6 w-1/3 bg-border-primary rounded skeleton"></div>
                   <div className="h-24 w-full bg-border-primary rounded skeleton"></div>
                   <div className="h-6 w-1/4 bg-border-primary rounded skeleton"></div>
                   <div className="h-24 w-full bg-border-primary rounded skeleton"></div>
                </div>
              ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-text-secondary prose-headings:uppercase prose-headings:tracking-widest prose-headings:text-xs prose-p:text-text-primary prose-strong:text-text-primary prose-a:text-accent-primary prose-p:leading-relaxed bg-bg-primary border border-border-primary p-6 rounded-xl shadow-sm">
                  <Markdown>{analysis}</Markdown>
                </div>
              )}

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});
export default AiExplainDrawer;
