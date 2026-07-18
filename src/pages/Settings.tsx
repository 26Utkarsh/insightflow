import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Moon, Sun, ShieldAlert, Cpu, Key, Sliders, HardDrive, Languages } from 'lucide-react';
import React, { useState } from 'react';
import { useAppStore } from '../store';

function SettingRow({ label, desc, icon, children }: { label: string; desc: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-6 border-b border-border-primary/60 last:border-b-0">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <span className="shrink-0 p-1.5 rounded-lg bg-bg-secondary border border-border-primary/80 text-accent-secondary mt-0.5">
          {icon}
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-text-primary">{label}</h3>
          <p className="text-xs text-text-muted mt-1 leading-relaxed">{desc}</p>
        </div>
      </div>
      <div className="shrink-0">
        {children}
      </div>
    </div>
  );
}

export default function Settings() {
  const settings = useAppStore(state => state.settings);
  const updateSettings = useAppStore(state => state.updateSettings);
  const clearHistory = useAppStore(state => state.clearHistory);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const confirmClear = () => { clearHistory(); setShowClearConfirm(false); };

  const selectClass = "bg-bg-secondary border border-border-primary text-text-primary text-xs rounded-lg p-2.5 outline-none focus:border-accent-secondary transition-all field-control !min-h-0 !py-2 cursor-pointer font-medium";

  return (
    <div className="flex-1 w-full overflow-y-auto bg-bg-primary text-text-primary px-6 lg:px-12 py-10 relative custom-scrollbar">
      <div className="product-backdrop" aria-hidden="true" />
      
      <div className="max-w-3xl mx-auto relative z-10">
        <div className="mb-12">
          <span className="editorial-label text-accent-secondary mb-2 block tracking-widest">Workspace Properties</span>
          <h1 className="text-3xl font-black tracking-tight text-text-primary font-display">System Settings</h1>
        </div>

        <div className="space-y-8">
          {/* AI Configuration */}
          <section>
            <span className="editorial-label text-[10px] text-text-muted mb-3.5 block tracking-wider">AI Operations</span>
            <div className="surface-panel rounded-2xl p-6 divide-y divide-border-primary/50">
              <SettingRow label="Primary Inference Engine" desc="Select LLM model for data analysis, synthesis, and Copilot reasoning." icon={<Cpu size={14} />}>
                <select value={settings.aiModel || 'llama-3.3-70b'} onChange={e => updateSettings({ aiModel: e.target.value as any })} className={selectClass}>
                  <option value="llama-3.3-70b">Cerebras Llama 3.3 70B (Primary)</option>
                  <option value="gemini-2.0-flash">Gemini 2.0 Flash (Fallback)</option>
                  <option value="gemini-3.5-flash">Gemini 3.5 Flash (Fallback)</option>
                </select>
              </SettingRow>
              <SettingRow label="Core Analysis Frame" desc="Standard target domain checklist persona loaded on file ingestion." icon={<Sliders size={14} />}>
                <select value={settings.defaultProfile || 'Business Intelligence'} onChange={e => updateSettings({ defaultProfile: e.target.value as any })} className={selectClass}>
                  <option value="Business Intelligence">Business Intelligence</option>
                  <option value="Internal Audit">Internal Audit</option>
                  <option value="Financial Analysis">Financial Analysis</option>
                  <option value="Sales Analytics">Sales Analytics</option>
                  <option value="Operations Analytics">Operations Analytics</option>
                </select>
              </SettingRow>
            </div>
          </section>

          {/* Reports & Exports */}
          <section>
            <span className="editorial-label text-[10px] text-text-muted mb-3.5 block tracking-wider">Briefing Deck Properties</span>
            <div className="surface-panel rounded-2xl p-6 divide-y divide-border-primary/50">
              <SettingRow label="Report Formatting Structure" desc="Configure structural layouts of exported PDF and DOCX decks." icon={<HardDrive size={14} />}>
                <select value={settings.reportFormat || 'Standard'} onChange={e => updateSettings({ reportFormat: e.target.value as any })} className={selectClass}>
                  <option value="Standard">Standard Briefing</option>
                  <option value="Executive Summary">Executive Briefing</option>
                  <option value="Detailed Audit">Detailed Control Report</option>
                </select>
              </SettingRow>
              <SettingRow label="Synthesizer Language" desc="Primary language used for AI text synthesis and insights reports." icon={<Languages size={14} />}>
                <select value={settings.language || 'English'} onChange={e => updateSettings({ language: e.target.value })} className={selectClass}>
                  <option value="English">English (US)</option>
                  <option value="Spanish">Español (ES)</option>
                  <option value="French">Français (FR)</option>
                  <option value="German">Deutsch (DE)</option>
                </select>
              </SettingRow>
            </div>
          </section>

          {/* Preferences */}
          <section>
            <span className="editorial-label text-[10px] text-text-muted mb-3.5 block tracking-wider">User Preferences</span>
            <div className="surface-panel rounded-2xl p-6 divide-y divide-border-primary/50">
              <SettingRow label="Interface Contrast Theme" desc="Toggle between Light and high-contrast dark visual interfaces." icon={<Sun size={14} />}>
                <div className="flex bg-bg-secondary p-0.5 rounded-lg border border-border-primary/80">
                  <button onClick={() => updateSettings({ theme: 'light' })}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors ${settings.theme === 'light' ? 'bg-bg-surface text-text-primary border border-border-primary/80 shadow-sm' : 'text-text-muted hover:text-text-secondary border border-transparent'}`}>
                    <Sun size={11} /> Light
                  </button>
                  <button onClick={() => updateSettings({ theme: 'dark' })}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors ${settings.theme === 'dark' ? 'bg-bg-surface text-text-primary border border-border-primary/80 shadow-sm' : 'text-text-muted hover:text-text-secondary border border-transparent'}`}>
                    <Moon size={11} /> Dark
                  </button>
                </div>
              </SettingRow>
              <SettingRow label="Micro-Animations" desc="Enable/Disable Framer Motion page transition overlays and graphs paths." icon={<Sliders size={14} />}>
                <button onClick={() => updateSettings({ animationsEnabled: !settings.animationsEnabled })}
                  className={`relative w-9 h-[20px] rounded-full transition-colors focus:outline-none shrink-0 cursor-pointer ${settings.animationsEnabled ? 'bg-accent-primary' : 'bg-border-primary'}`}>
                  <span className={`absolute top-[2px] w-4 h-4 rounded-full bg-white transition-all shadow-xs ${settings.animationsEnabled ? 'left-[18px]' : 'left-[2px]'}`} />
                </button>
              </SettingRow>
            </div>
          </section>

          {/* Local Catalog Management */}
          <section>
            <span className="editorial-label text-[10px] text-text-muted mb-3.5 block tracking-wider">Repository Management</span>
            <div className="surface-panel rounded-2xl p-6 border-danger/15 bg-danger/[0.01]">
              <SettingRow label="Clear Metadata Repository" desc="Permanently erase all ingested catalogs and historical snapshots from local IndexedDB storage. This cannot be undone." icon={<ShieldAlert size={14} className="text-danger" />}>
                <button onClick={() => setShowClearConfirm(true)}
                  className="px-4 py-2.5 text-xs font-semibold text-danger bg-danger/10 border border-danger/20 rounded-xl hover:bg-danger/20 transition-all flex items-center gap-2">
                  <AlertTriangle size={13} /> Clear Repository
                </button>
              </SettingRow>
            </div>
          </section>
        </div>
      </div>

      <AnimatePresence>
        {showClearConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
              className="surface-panel rounded-2xl max-w-sm w-full overflow-hidden border border-border-primary p-6">
              <h3 className="text-sm font-bold text-text-primary mb-1">Clear Repository</h3>
              <p className="text-xs text-text-muted mb-6 leading-relaxed">Are you absolutely sure? This will wipe all loaded tables and snapshots.</p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowClearConfirm(false)} className="quiet-action text-xs font-semibold px-4 py-2 border border-border-primary rounded-lg bg-bg-surface">Cancel</button>
                <button onClick={confirmClear} className="px-4 py-2 text-xs font-semibold bg-danger text-white rounded-lg hover:bg-danger/90 transition-colors">Clear All</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
