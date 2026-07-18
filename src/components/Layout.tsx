import { AnimatePresence, motion } from 'framer-motion';
import {
    BarChart3, ChevronDown, Clock, Database, FolderOpen,
    LayoutDashboard, Menu, Moon, Settings, Shield, Sparkles, Sun, X,
    ChevronLeft, ChevronRight
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAppStore } from '../store';

function ThemeToggle({ className = "" }: { className?: string }) {
  const theme = useAppStore(state => state.settings.theme);
  const updateSettings = useAppStore(state => state.updateSettings);

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [theme]);

  return (
    <>
      <Toaster position="bottom-right" theme={theme} />
      <button
        onClick={() => updateSettings({ theme: theme === 'dark' ? 'light' : 'dark' })}
        className={`w-9 h-9 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-all hover:scale-105 active:scale-95 duration-200 ${className}`}
        title="Toggle Theme"
      >
        {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
      </button>
    </>
  );
}

function LogoIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M3 12C3 7.5 6.5 5 11 5C14.5 5 16.5 7 17.5 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M21 12C21 16.5 17.5 19 13 19C9.5 19 7.5 17 6.5 15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="11" cy="5" r="1.5" fill="currentColor"/>
      <circle cx="13" cy="19" r="1.5" fill="currentColor"/>
      <path d="M11 9.5L13.5 12L11 14.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export default function Layout() {
  const activeDatasetId = useAppStore(state => state.activeDatasetId);
  const activeDataset = useAppStore(state => state.activeDataset);
  const loadActiveDataset = useAppStore(state => state.loadActiveDataset);
  const history = useAppStore(state => state.history);
  const loadHistory = useAppStore(state => state.loadHistory);
  
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [workspaceDropdownOpen, setWorkspaceDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    loadHistory();
    if (activeDatasetId) {
      loadActiveDataset(activeDatasetId);
    }
  }, [activeDatasetId]);

  const navLinks = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={16} /> },
    { name: 'Analytics', path: '/analytics', icon: <BarChart3 size={16} />, requiresDataset: true },
    { name: 'Internal Audit', path: '/audit', icon: <Shield size={16} />, requiresDataset: true },
    { name: 'Data Catalog', path: '/history', icon: <Clock size={16} /> },
    { name: 'Settings', path: '/settings', icon: <Settings size={16} /> },
  ];

  const switchWorkspace = async (id: string) => {
    setWorkspaceDropdownOpen(false);
    await loadActiveDataset(id);
    const dataset = history.find(h => h.id === id);
    if (dataset) {
      navigate(dataset.stats.detectedFields.includes('riskFlag') || location.pathname.includes('audit') ? '/audit' : '/analytics');
    }
  };

  return (
    <div className="flex h-screen w-full bg-bg-primary text-text-primary overflow-hidden">
      {/* Sidebar for Desktop */}
      <aside 
        className={`hidden md:flex flex-col h-full bg-gradient-to-b from-bg-secondary/95 to-bg-primary/95 border-r border-border-primary/50 transition-all duration-300 relative z-40
          ${sidebarCollapsed ? 'w-16' : 'w-64'}`}
      >
        {/* Brand Header */}
        <div className="h-14 flex items-center px-4 justify-between border-b border-border-primary/50">
          <Link to="/" className="flex items-center gap-2.5 group overflow-hidden pl-1">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-b from-bg-surface to-bg-secondary border border-border-primary/60 flex items-center justify-center shrink-0 shadow-[0_1.5px_4px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.05)] transition-all duration-300 group-hover:scale-105 text-accent-primary">
              <LogoIcon className="w-4.5 h-4.5" />
            </div>
            {!sidebarCollapsed && (
              <span className="font-extrabold text-xs uppercase tracking-[0.2em] font-display text-text-primary">
                InsightFlow
              </span>
            )}
          </Link>
        </div>

        {/* Workspace Selector */}
        <div className="p-3 border-b border-border-primary/50 relative">
          <button
            onClick={() => !sidebarCollapsed && setWorkspaceDropdownOpen(!workspaceDropdownOpen)}
            className={`w-full flex items-center justify-between p-2 py-1.5 rounded-xl bg-bg-surface/80 hover:bg-bg-surface border border-border-primary/45 transition-all text-left shadow-[0_2px_8px_rgba(0,0,0,0.02)]
              ${sidebarCollapsed ? 'justify-center cursor-default' : 'hover:border-border-primary/80 hover:shadow-md'}`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Database size={14} className="text-accent-secondary shrink-0" />
              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <div className="text-[9px] uppercase font-bold tracking-wider text-text-muted">Active Catalog</div>
                  <div className="text-xs font-semibold text-text-primary truncate">
                    {activeDataset ? activeDataset.name : 'No dataset active'}
                  </div>
                </div>
              )}
            </div>
            {!sidebarCollapsed && (
              <ChevronDown size={13} className={`text-text-muted/50 transition-transform duration-200 ${workspaceDropdownOpen ? 'rotate-180 text-text-secondary' : ''}`} />
            )}
          </button>

          {/* Selector Dropdown */}
          <AnimatePresence>
            {workspaceDropdownOpen && !sidebarCollapsed && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setWorkspaceDropdownOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="absolute left-3 right-3 mt-1.5 bg-bg-elevated border border-border-secondary rounded-xl shadow-2xl z-20 overflow-hidden max-h-60 overflow-y-auto custom-scrollbar"
                >
                  <div className="p-1.5 space-y-0.5">
                    {history.length === 0 ? (
                      <div className="p-3 text-xs text-text-muted text-center flex flex-col items-center gap-1.5">
                        <FolderOpen size={15} />
                        No datasets uploaded yet
                      </div>
                    ) : (
                      history.map(item => (
                        <button
                          key={item.id}
                          onClick={() => switchWorkspace(item.id)}
                          className={`w-full text-left px-2.5 py-2 text-xs hover:bg-bg-surface transition-colors rounded-lg text-text-secondary hover:text-text-primary font-medium flex items-center justify-between gap-2
                            ${activeDatasetId === item.id ? 'bg-bg-surface text-text-primary border-l-2 border-accent-secondary' : ''}`}
                        >
                          <span className="truncate">{item.name}</span>
                          <span className="text-[9px] text-text-muted font-mono shrink-0">
                            {item.stats.cleanedRows.toLocaleString()} rows
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-2.5 py-4 space-y-2 overflow-y-auto custom-scrollbar">
          {navLinks.map(link => {
            const isActive = location.pathname === link.path || (link.path !== '/' && location.pathname.startsWith(link.path));
            const isDisabled = link.requiresDataset && !activeDataset;
            
            return (
              <React.Fragment key={link.path}>
                {link.name === 'Settings' && (
                  <div className="my-3 border-t border-border-primary/30 mx-2" />
                )}
                <Link
                  to={isDisabled ? '#' : link.path}
                  onClick={e => isDisabled && e.preventDefault()}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold tracking-tight transition-all duration-200 relative group
                    ${isActive ? 'text-text-primary font-semibold' : 'text-text-muted hover:text-text-primary hover:bg-bg-surface/40'}
                    ${isDisabled ? 'opacity-35 cursor-not-allowed hover:bg-transparent hover:text-text-muted' : ''}`}
                  title={sidebarCollapsed ? link.name : ''}
                >
                  <span className={`shrink-0 relative z-10 transition-colors duration-150 ${isActive ? 'text-text-primary' : 'text-text-muted/70 group-hover:text-text-secondary'}`}>
                    {link.icon}
                  </span>
                  {!sidebarCollapsed && <span className="relative z-10 transition-colors duration-150">{link.name}</span>}
                  {isActive && (
                    <motion.div
                      layoutId="activePill"
                      className="absolute inset-0 bg-accent-primary/[0.06] border border-accent-primary/10 rounded-xl z-0"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </Link>
              </React.Fragment>
            );
          })}
        </nav>

        {/* Footer Area */}
        <div className="p-3 border-t border-border-primary/40">
          <div className={`flex items-center bg-bg-surface/50 border border-border-primary/65 rounded-xl p-1 shadow-sm transition-all duration-300
            ${sidebarCollapsed ? 'flex-col gap-1.5' : 'flex-row justify-between w-full'}`}>
            <ThemeToggle />
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-all hover:scale-105 active:scale-95 duration-200"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Wrapper (covers both desktop and mobile, single outlet) */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* Mobile Header Bar */}
        <header className="md:hidden h-14 w-full bg-bg-secondary border-b border-border-primary px-4 flex items-center justify-between shrink-0">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7.5 h-7.5 rounded-lg bg-gradient-to-tr from-accent-primary to-accent-secondary flex items-center justify-center shrink-0 shadow-sm text-white">
              <LogoIcon className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-xs uppercase tracking-wider font-display">InsightFlow</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle className="border border-border-primary/65 shadow-sm bg-bg-surface" />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-text-secondary hover:bg-bg-elevated border border-border-primary/40"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </header>

        {/* Mobile Menu Panel */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 z-40 md:hidden"
                onClick={() => setMobileMenuOpen(false)}
              />
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'tween', duration: 0.2 }}
                className="fixed top-0 bottom-0 left-0 w-72 bg-bg-secondary border-r border-border-primary z-50 p-4 flex flex-col md:hidden"
              >
                <div className="flex items-center justify-between pb-6 border-b border-border-primary/50">
                  <div className="flex items-center gap-2">
                    <div className="w-7.5 h-7.5 rounded-lg bg-gradient-to-tr from-accent-primary to-accent-secondary flex items-center justify-center shrink-0 shadow-sm text-white">
                      <LogoIcon className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-xs uppercase tracking-wider font-display">InsightFlow</span>
                  </div>
                  <button onClick={() => setMobileMenuOpen(false)} className="text-text-secondary">
                    <X size={18} />
                  </button>
                </div>
                
                {/* Mobile Active Dataset Selector */}
                <div className="py-4 border-b border-border-primary/50">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-text-muted mb-2">Active Catalog</div>
                  <select 
                    value={activeDatasetId || ''} 
                    onChange={e => switchWorkspace(e.target.value)}
                    className="w-full text-xs font-semibold p-2.5 rounded-lg bg-bg-surface border border-border-primary"
                  >
                    <option value="" disabled>Select Catalog...</option>
                    {history.map(item => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </div>

                <nav className="flex-1 py-4 space-y-1">
                  {navLinks.map(link => {
                    const isActive = location.pathname === link.path || (link.path !== '/' && location.pathname.startsWith(link.path));
                    const isDisabled = link.requiresDataset && !activeDataset;

                    return (
                      <Link
                        key={link.path}
                        to={isDisabled ? '#' : link.path}
                        onClick={e => {
                          if (isDisabled) e.preventDefault();
                          else setMobileMenuOpen(false);
                        }}
                        className={`flex items-center gap-3 px-3 py-3 rounded-lg text-xs font-medium transition-all
                          ${isActive ? 'text-text-primary bg-bg-surface font-semibold border border-border-primary' : 'text-text-secondary hover:bg-bg-surface/50'}
                          ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                      >
                        <span className={isActive ? 'text-accent-primary' : 'text-text-muted'}>
                          {link.icon}
                        </span>
                        <span>{link.name}</span>
                      </Link>
                    );
                  })}
                </nav>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <main className="flex-1 overflow-hidden relative">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
