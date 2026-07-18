import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight, Check, ChevronDown, Copy, Download,
  Edit2, FileSpreadsheet, MoreVertical, Search, Trash2, X, Database, Calendar, HardDrive, ShieldAlert
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import * as storage from '../lib/storage';
import { useAppStore } from '../store';
import { Dataset } from '../types';

type SortOption = 'newest' | 'oldest' | 'name' | 'rows';

export default function History() {
  const history = useAppStore(state => state.history);
  const loadHistory = useAppStore(state => state.loadHistory);
  const removeDataset = useAppStore(state => state.removeDataset);
  const removeMultipleDatasets = useAppStore(state => state.removeMultipleDatasets);
  const clearHistory = useAppStore(state => state.clearHistory);
  const loadActiveDataset = useAppStore(state => state.loadActiveDataset);
  const updateDatasetName = useAppStore(state => state.updateDatasetName);
  const duplicateDataset = useAppStore(state => state.duplicateDataset);
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [datasetToDelete, setDatasetToDelete] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showMultiDeleteConfirm, setShowMultiDeleteConfirm] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [isLoadingDataset, setIsLoadingDataset] = useState(false);
  const [previewDatasetId, setPreviewDatasetId] = useState<string | null>(null);
  const [previewDataset, setPreviewDataset] = useState<Dataset | null>(null);

  useEffect(() => { loadHistory(); }, [loadHistory]);
  
  useEffect(() => {
    const close = () => setOpenMenuId(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const filteredAndSortedHistory = useMemo(() => {
    let result = [...history];
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(d => d.name.toLowerCase().includes(s));
    }
    result.sort((a, b) => {
      if (sortBy === 'newest') return b.createdAt - a.createdAt;
      if (sortBy === 'oldest') return a.createdAt - b.createdAt;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'rows') return b.stats.totalRows - a.stats.totalRows;
      return 0;
    });
    return result;
  }, [history, search, sortBy]);

  // Set default preview dataset
  useEffect(() => {
    if (filteredAndSortedHistory.length > 0 && !previewDatasetId) {
      setPreviewDatasetId(filteredAndSortedHistory[0].id);
    }
  }, [filteredAndSortedHistory]);

  // Fetch full preview dataset detail when preview ID changes
  useEffect(() => {
    if (previewDatasetId) {
      storage.getDataset(previewDatasetId).then(setPreviewDataset);
    } else {
      setPreviewDataset(null);
    }
  }, [previewDatasetId]);

  const handleOpen = async (id: string) => {
    setIsLoadingDataset(true);
    setTimeout(async () => { 
      await loadActiveDataset(id); 
      setIsLoadingDataset(false); 
      const selected = history.find(h => h.id === id);
      if (selected?.stats.detectedFields.includes('riskFlag')) {
        navigate('/audit');
      } else {
        navigate('/analytics');
      }
    }, 500);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setOpenMenuId(null);
    setDatasetToDelete(id);
  };

  const confirmDelete = () => {
    if (datasetToDelete) {
      removeDataset(datasetToDelete);
      setDatasetToDelete(null);
      if (previewDatasetId === datasetToDelete) {
        setPreviewDatasetId(null);
      }
      setSelectedIds(prev => {
        const n = new Set(prev);
        n.delete(datasetToDelete);
        return n;
      });
      toast.success('Dataset deleted');
    }
  };

  const confirmClear = () => {
    clearHistory();
    setShowClearConfirm(false);
    setSelectedIds(new Set());
    setPreviewDatasetId(null);
    toast.success('Workspace cleared');
  };

  const confirmMultiDelete = () => {
    removeMultipleDatasets(Array.from(selectedIds));
    setShowMultiDeleteConfirm(false);
    if (previewDatasetId && selectedIds.has(previewDatasetId)) {
      setPreviewDatasetId(null);
    }
    setSelectedIds(new Set());
    toast.success('Datasets deleted');
  };

  const toggleSelection = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedIds(e.target.checked ? new Set(filteredAndSortedHistory.map(d => d.id)) : new Set());
  };

  const startEditing = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    setOpenMenuId(null);
    setEditingId(id);
    setEditName(name);
  };

  const saveEdit = () => {
    if (editingId && editName.trim()) {
      updateDatasetName(editingId, editName.trim());
      setEditingId(null);
      toast.success('Renamed successfully');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleDuplicate = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setOpenMenuId(null);
    duplicateDataset(id);
    toast.success('Duplicated successfully');
  };

  const handleExport = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setOpenMenuId(null);
    const dataset = await storage.getDataset(id);
    if (!dataset) { toast.error('Dataset not found'); return; }
    try {
      const { exportToCSV } = await import('../lib/exportUtils');
      exportToCSV(dataset.data, dataset.name);
      toast.success('Exported as CSV');
    } catch {
      toast.error('Export failed');
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const s = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + s[i];
  };

  return (
    <div className="flex-1 w-full h-full bg-bg-primary text-text-primary flex flex-col md:flex-row overflow-hidden relative">
      <div className="product-backdrop" aria-hidden="true" />

      {/* Loading Overlay */}
      <AnimatePresence>
        {isLoadingDataset && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-bg-primary/95 backdrop-blur-md flex items-center justify-center">
            <div className="surface-panel rounded-2xl p-8 flex flex-col items-center text-center max-w-xs border border-border-primary">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }} className="w-8 h-8 rounded-full border-2 border-accent-primary border-t-transparent mb-4" />
              <p className="text-xs font-bold text-text-primary uppercase tracking-wider">Loading Workspace...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Left Panel: Catalog List */}
      <div className="flex-1 flex flex-col h-full border-r border-border-primary/60 relative z-10 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-border-primary/50 shrink-0">
          <div className="flex justify-between items-end mb-6">
            <div>
              <span className="editorial-label text-accent-secondary mb-2 block tracking-[0.2em]">Metadata Repository</span>
              <h1 className="text-2xl font-black tracking-tight text-text-primary font-display">Data Catalog</h1>
            </div>
            {history.length > 0 && (
              <button onClick={() => setShowClearConfirm(true)} className="quiet-action text-[10px] font-bold uppercase tracking-wider text-danger border border-danger/20 hover:border-danger/40 px-3 py-1.5 rounded-lg transition-all bg-danger/5">
                Clear Catalog
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={13} />
              <input type="text" placeholder="Search catalogs by name..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-bg-secondary/20 border border-border-primary rounded-lg text-xs text-text-primary focus:border-accent-secondary outline-none transition-all field-control !min-h-0 !py-2" />
            </div>
            <div className="relative shrink-0">
              <select value={sortBy} onChange={e => setSortBy(e.target.value as SortOption)}
                className="appearance-none pl-3 pr-8 py-2 bg-bg-secondary/20 border border-border-primary rounded-lg text-xs text-text-primary focus:border-accent-secondary outline-none transition-all field-control !min-h-0 !py-2 cursor-pointer font-medium">
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="name">Name</option>
                <option value="rows">Rows</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" size={13} />
            </div>
          </div>
        </div>

        {/* Bulk action row */}
        {selectedIds.size > 0 && (
          <div className="bg-bg-secondary/20 border-b border-border-primary/50 px-6 py-2.5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-text-muted cursor-pointer select-none">
                <input type="checkbox" checked={selectedIds.size === filteredAndSortedHistory.length && filteredAndSortedHistory.length > 0} onChange={handleSelectAll} className="accent-current" />
                Toggle All
              </label>
              <span className="text-xs font-semibold text-text-primary">{selectedIds.size} selected</span>
            </div>
            <button onClick={() => setShowMultiDeleteConfirm(true)} className="text-[10px] font-bold uppercase tracking-wider text-danger hover:bg-danger/10 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
              <Trash2 size={12} /> Delete Mapped
            </button>
          </div>
        )}

        {/* Catalog List Scroll */}
        <div className="flex-1 overflow-y-auto p-6 space-y-1.5 custom-scrollbar bg-bg-primary/30">
          {history.length === 0 ? (
            <div className="surface-panel rounded-2xl p-12 text-center border border-border-primary/80 max-w-md mx-auto mt-10">
              <FileSpreadsheet size={28} className="text-text-muted mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-text-primary mb-1">Catalog index empty</h3>
              <p className="text-xs text-text-muted mb-6 leading-relaxed">No structured documents have been uploaded to storage.</p>
              <button onClick={() => navigate('/')} className="primary-action text-xs font-semibold px-5 py-2.5 rounded-lg border border-white/10 shadow-[0_1px_2px_rgba(255,255,255,0.1)_inset]"><ArrowRight size={13} /> Ingest Dataset</button>
            </div>
          ) : (
            filteredAndSortedHistory.map(dataset => {
              const isSelected = selectedIds.has(dataset.id);
              const isPreviewed = previewDatasetId === dataset.id;
              
              return (
                <div
                  key={dataset.id}
                  onClick={() => setPreviewDatasetId(dataset.id)}
                  className={`flex items-center gap-4 px-4 py-3.5 rounded-xl cursor-pointer border transition-all relative group
                    ${isPreviewed 
                      ? 'bg-bg-secondary/40 border-border-primary shadow-sm' 
                      : 'bg-transparent border-transparent hover:bg-bg-secondary/20'}`}
                >
                  <button onClick={e => toggleSelection(e, dataset.id)} className="text-text-muted hover:text-text-primary transition-colors shrink-0">
                    {isSelected ? (
                      <div className="w-4 h-4 rounded-full bg-accent-secondary/10 border border-accent-secondary flex items-center justify-center">
                        <Check size={10} className="text-accent-secondary" />
                      </div>
                    ) : (
                      <div className="w-4 h-4 border border-border-secondary rounded-full bg-bg-surface group-hover:border-text-muted transition-colors" />
                    )}
                  </button>

                  <div className="flex-grow min-w-0" onClick={() => handleOpen(dataset.id)}>
                    {editingId === dataset.id ? (
                      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                          className="px-2.5 py-1 bg-bg-elevated border border-accent-primary text-xs rounded-md text-text-primary outline-none flex-1 font-semibold" />
                        <button onClick={saveEdit} className="p-1 text-success"><Check size={14} /></button>
                        <button onClick={cancelEdit} className="p-1 text-text-muted"><X size={14} /></button>
                      </div>
                    ) : (
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-text-primary truncate">{dataset.name}</div>
                        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-text-muted font-mono">
                          <span>{dataset.stats.cleanedRows.toLocaleString()} records</span>
                          <span>•</span>
                          <span>{formatBytes(dataset.size)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions Dropdown Trigger */}
                  <div className="relative shrink-0" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setOpenMenuId(openMenuId === dataset.id ? null : dataset.id)}
                      className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated border border-transparent hover:border-border-primary/50 transition-colors">
                      <MoreVertical size={13} />
                    </button>
                    {openMenuId === dataset.id && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setOpenMenuId(null)} />
                        <div className="absolute right-0 mt-1 w-36 bg-bg-elevated border border-border-secondary rounded-lg shadow-xl z-40 overflow-hidden py-1">
                          <button onClick={() => handleOpen(dataset.id)} className="w-full text-left px-3 py-1.5 text-[11px] text-text-secondary hover:text-text-primary hover:bg-bg-surface font-semibold">Open Workspace</button>
                          <button onClick={(e) => startEditing(e, dataset.id, dataset.name)} className="w-full text-left px-3 py-1.5 text-[11px] text-text-secondary hover:text-text-primary hover:bg-bg-surface font-semibold flex items-center gap-1.5"><Edit2 size={11} /> Rename</button>
                          <button onClick={(e) => handleDuplicate(e, dataset.id)} className="w-full text-left px-3 py-1.5 text-[11px] text-text-secondary hover:text-text-primary hover:bg-bg-surface font-semibold flex items-center gap-1.5"><Copy size={11} /> Duplicate</button>
                          <button onClick={(e) => handleExport(e, dataset.id)} className="w-full text-left px-3 py-1.5 text-[11px] text-text-secondary hover:text-text-primary hover:bg-bg-surface font-semibold flex items-center gap-1.5"><Download size={11} /> Export CSV</button>
                          <div className="h-px bg-border-primary my-1" />
                          <button onClick={(e) => handleDelete(e, dataset.id)} className="w-full text-left px-3 py-1.5 text-[11px] text-danger hover:bg-danger/10 hover:text-danger font-semibold flex items-center gap-1.5"><Trash2 size={11} /> Delete</button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Panel: Metadata & Profile Previews (Clean layout, no nested boxes) */}
      <div className="hidden lg:flex w-[380px] h-full flex-col bg-bg-secondary/10 shrink-0 p-8 overflow-y-auto custom-scrollbar relative z-10 border-l border-border-primary/40">
        {previewDataset ? (
          <div className="flex flex-col h-full justify-between gap-8">
            <div className="space-y-6">
              <div>
                <span className="editorial-label text-accent-secondary mb-1.5 block tracking-widest">Workspace Details</span>
                <h2 className="text-base font-black text-text-primary font-display leading-tight">{previewDataset.name}</h2>
                <p className="text-[9px] text-text-muted mt-1 font-mono uppercase tracking-wider">ID: {previewDataset.id.substring(0, 12)}</p>
              </div>

              {/* Mapped parameters (Anti box-in-box design: uses light, clean dividers instead of borders) */}
              <div className="space-y-5 pt-4 border-t border-border-primary/50">
                <div className="flex items-center justify-between text-xs py-1">
                  <span className="text-text-muted">Analyzed At</span>
                  <span className="font-medium text-text-primary">{new Date(previewDataset.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs py-1 border-t border-border-primary/30">
                  <span className="text-text-muted">Total Size</span>
                  <span className="font-medium text-text-primary">{formatBytes(previewDataset.size)}</span>
                </div>
                <div className="flex items-center justify-between text-xs py-1 border-t border-border-primary/30">
                  <span className="text-text-muted">Record Rows</span>
                  <span className="font-mono font-medium text-text-primary">{previewDataset.stats.cleanedRows.toLocaleString()}</span>
                </div>
              </div>

              {/* Quality section with dividers */}
              <div className="space-y-5 pt-6 border-t border-border-primary/50">
                <span className="editorial-label text-[9px] text-text-muted block tracking-widest">Quality Metrics</span>
                
                <div className="flex items-center justify-between text-xs py-1">
                  <span className="text-text-muted">Quality Score</span>
                  <span className="font-bold text-success">{previewDataset.stats.healthScore}/100</span>
                </div>
                <div className="flex items-center justify-between text-xs py-1 border-t border-border-primary/30">
                  <span className="text-text-muted">Imputed Fields</span>
                  <span className="font-medium text-text-primary">{previewDataset.stats.missingValuesHandled || 0}</span>
                </div>
                <div className="flex items-center justify-between text-xs py-1 border-t border-border-primary/30">
                  <span className="text-text-muted">Columns Profiled</span>
                  <span className="font-medium text-text-primary">{previewDataset.stats.totalColumns}</span>
                </div>
              </div>
            </div>

            <button 
              onClick={() => handleOpen(previewDataset.id)} 
              className="primary-action text-xs font-semibold w-full py-3 rounded-xl flex items-center justify-center gap-2 border border-white/10 shadow-[0_1px_2px_rgba(255,255,255,0.1)_inset]"
            >
              Open Active Workspace <ArrowRight size={13} />
            </button>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center text-text-muted py-20">
            <Database size={22} className="mb-3 text-text-muted" />
            <p className="text-[11px] font-semibold tracking-wider uppercase">Select dataset metadata preview</p>
          </div>
        )}
      </div>

      {/* Dialogs & Modals */}
      <AnimatePresence>
        {datasetToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
              className="surface-panel rounded-2xl max-w-sm w-full overflow-hidden border border-border-primary p-6">
              <h3 className="text-sm font-bold text-text-primary mb-1">Delete Catalog</h3>
              <p className="text-xs text-text-muted mb-6 leading-relaxed">Are you sure you want to permanently delete this catalog?</p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setDatasetToDelete(null)} className="quiet-action text-xs font-semibold px-4 py-2 border border-border-primary rounded-lg bg-bg-surface">Cancel</button>
                <button onClick={confirmDelete} className="px-4 py-2 text-xs font-semibold bg-danger text-white rounded-lg hover:bg-danger/90 transition-colors">Delete</button>
              </div>
            </motion.div>
          </div>
        )}

        {showClearConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
              className="surface-panel rounded-2xl max-w-sm w-full overflow-hidden border border-border-primary p-6">
              <h3 className="text-sm font-bold text-text-primary mb-1">Clear Repository</h3>
              <p className="text-xs text-text-muted mb-6 leading-relaxed">Permanently delete all catalog records? This action cannot be reversed.</p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowClearConfirm(false)} className="quiet-action text-xs font-semibold px-4 py-2 border border-border-primary rounded-lg bg-bg-surface">Cancel</button>
                <button onClick={confirmClear} className="px-4 py-2 text-xs font-semibold bg-danger text-white rounded-lg hover:bg-danger/90 transition-colors">Clear All</button>
              </div>
            </motion.div>
          </div>
        )}

        {showMultiDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
              className="surface-panel rounded-2xl max-w-sm w-full overflow-hidden border border-border-primary p-6">
              <h3 className="text-sm font-bold text-text-primary mb-1">Delete Selected Catalogs</h3>
              <p className="text-xs text-text-muted mb-6 leading-relaxed">Permanently delete the {selectedIds.size} selected catalogs?</p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowMultiDeleteConfirm(false)} className="quiet-action text-xs font-semibold px-4 py-2 border border-border-primary rounded-lg bg-bg-surface">Cancel</button>
                <button onClick={confirmMultiDelete} className="px-4 py-2 text-xs font-semibold bg-danger text-white rounded-lg hover:bg-danger/90 transition-colors">Delete Selected</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
