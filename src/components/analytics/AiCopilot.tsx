import { AnimatePresence, motion } from 'framer-motion';
import { MessageSquare, Send, Sparkles, X } from 'lucide-react';
import React, { useState } from 'react';
import Markdown from 'react-markdown';
import { useAppStore } from '../../store';

const AiCopilot = React.memo(function AiCopilot() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'ai', content: string}[]>([
    { role: 'ai', content: 'Hello. I am your InsightFlow AI business intelligence copilot. What would you like to inspect?' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  
  const settings = useAppStore(state => state.settings);
  const activeDataset = useAppStore(state => state.activeDataset);

  const handleSend = async () => {
    if (!query.trim()) return;
    
    setMessages(prev => [...prev, { role: 'user', content: query }]);
    const currentQuery = query;
    setQuery('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: settings.defaultProfile,
          query: currentQuery,
          metrics: activeDataset?.stats.metrics || {},
          context: activeDataset?.stats.detectedFields || []
        })
      });
      const data = await response.json();
      setMessages(prev => [...prev, { role: 'ai', content: data.answer || 'I was unable to analyze this request. Please try rephrasing your question.' }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'ai', content: 'I am having trouble connecting right now. Please try again in a moment.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <motion.button 
        whileHover={{ scale: 1.1, rotate: 5 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 p-4 bg-gradient-to-br from-accent-primary to-accent-primary/80 text-bg-primary rounded-2xl shadow-premium-lg hover:shadow-premium-xl transition-all z-40 flex items-center justify-center print:hidden border border-accent-primary/20"
      >
        <Sparkles size={24} className="animate-pulse" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-24 right-8 w-[400px] h-[600px] max-h-[80vh] bg-bg-surface border border-border-primary rounded-2xl shadow-premium-xl flex flex-col z-50 overflow-hidden"
          >
            <div className="p-5 border-b border-border-primary flex items-center justify-between bg-gradient-to-r from-bg-primary to-bg-surface">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-primary/20 to-accent-primary/5 flex items-center justify-center text-accent-primary border border-accent-primary/10">
                  <Sparkles size={18} className={isLoading ? "animate-spin-slow" : ""} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-text-primary tracking-tight">AI Copilot</h3>
                  <p className="text-xs text-text-secondary">{settings.defaultProfile} Assistant</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bg-surface text-text-muted hover:text-text-primary transition-colors border border-transparent hover:border-border-primary"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar bg-bg-primary">
              {messages.map((msg, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-text-primary text-bg-primary shadow-premium' : 'bg-gradient-to-br from-accent-primary/20 to-accent-primary/5 text-accent-primary border border-accent-primary/10'}`}>
                    {msg.role === 'user' ? <MessageSquare size={16} /> : <Sparkles size={16} />}
                  </div>
                  <div className={`p-4 rounded-2xl text-sm max-w-[80%] ${msg.role === 'user' ? 'bg-text-primary text-bg-primary rounded-tr-none shadow-premium' : 'bg-bg-surface border border-border-primary text-text-primary rounded-tl-none shadow-sm'}`}>
                    {msg.role === 'user' ? (
                      msg.content
                    ) : (
                      <div className="prose prose-sm dark:prose-invert prose-p:my-1 prose-headings:my-2 prose-ul:my-1 max-w-none">
                        <Markdown>{msg.content}</Markdown>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-primary/20 to-accent-primary/5 text-accent-primary flex items-center justify-center shrink-0 border border-accent-primary/10">
                    <Sparkles size={16} className="animate-spin-slow" />
                  </div>
                  <div className="p-4 rounded-2xl rounded-tl-none bg-bg-surface border border-border-primary text-text-secondary text-sm flex items-center gap-2 shadow-sm">
                    <span className="w-2 h-2 bg-accent-primary rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-accent-primary rounded-full animate-bounce delay-75"></span>
                    <span className="w-2 h-2 bg-accent-primary rounded-full animate-bounce delay-150"></span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-border-primary bg-bg-surface">
              <div className="flex items-center gap-3 bg-bg-primary border-2 border-border-primary p-2 pl-4 rounded-2xl focus-within:border-accent-primary focus-within:ring-2 focus-within:ring-accent-primary/20 transition-all shadow-sm">
                <input 
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={`Ask about ${settings.defaultProfile.toLowerCase()}...`}
                  className="flex-1 bg-transparent text-sm outline-none text-text-primary placeholder:text-text-muted"
                />
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSend}
                  disabled={!query.trim() || isLoading}
                  className="p-2.5 bg-gradient-to-br from-accent-primary to-accent-primary/80 text-bg-primary rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
                >
                  <Send size={16} />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});
export default AiCopilot;
