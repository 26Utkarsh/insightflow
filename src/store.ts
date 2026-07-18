import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuditResult, PipelineProgress } from './audit/types';
import * as storage from './lib/storage';
import { AppSettings, Dataset } from './types';

interface AppState {
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;
  
  activeDatasetId: string | null;
  setActiveDatasetId: (id: string | null) => void;
  
  activeDataset: Dataset | null;
  loadActiveDataset: (id: string) => Promise<void>;
  clearActiveDataset: () => void;
  
  // Audit state
  auditResult: AuditResult | null;
  setAuditResult: (result: AuditResult | null) => void;
  auditProgress: PipelineProgress | null;
  setAuditProgress: (progress: PipelineProgress | null) => void;
  
  history: Omit<Dataset, 'data'>[];
  loadHistory: () => Promise<void>;
  addDataset: (dataset: Dataset) => Promise<void>;
  removeDataset: (id: string) => Promise<void>;
  removeMultipleDatasets: (ids: string[]) => Promise<void>;
  updateDatasetName: (id: string, name: string) => Promise<void>;
  duplicateDataset: (id: string) => Promise<void>;
  clearHistory: () => Promise<void>;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      settings: {
        theme: 'light',
        animationsEnabled: true,
        aiModel: 'llama-3.3-70b',
        defaultProfile: 'Business Intelligence',
        reportFormat: 'Standard',
        language: 'English'
      },
      updateSettings: (newSettings) => set((state) => ({ 
        settings: { ...state.settings, ...newSettings } 
      })),
      
      activeDatasetId: null,
      setActiveDatasetId: (id) => set({ activeDatasetId: id }),
      
      activeDataset: null,
      loadActiveDataset: async (id) => {
        const dataset = await storage.getDataset(id);
        if (dataset) {
          set({ activeDataset: dataset, activeDatasetId: id });
        }
      },
      clearActiveDataset: () => set({ activeDataset: null, activeDatasetId: null }),
      
      // Audit state
      auditResult: null,
      setAuditResult: (result) => set({ auditResult: result }),
      auditProgress: null,
      setAuditProgress: (progress) => set({ auditProgress: progress }),
      
      history: [],
      loadHistory: async () => {
        const datasets = await storage.getAllDatasets();
        set({ history: datasets.map(({ data, ...rest }) => rest) });
      },
      
      addDataset: async (dataset) => {
        await storage.saveDataset(dataset);
        set({ activeDataset: dataset, activeDatasetId: dataset.id });
        await get().loadHistory();
      },
      
      removeDataset: async (id) => {
        await storage.deleteDataset(id);
        if (get().activeDatasetId === id) {
          set({ activeDataset: null, activeDatasetId: null });
        }
        await get().loadHistory();
      },
      
      removeMultipleDatasets: async (ids) => {
        for (const id of ids) {
          await storage.deleteDataset(id);
        }
        if (get().activeDatasetId && ids.includes(get().activeDatasetId!)) {
          set({ activeDataset: null, activeDatasetId: null });
        }
        await get().loadHistory();
      },

      updateDatasetName: async (id, name) => {
        const dataset = await storage.getDataset(id);
        if (dataset) {
          dataset.name = name;
          await storage.saveDataset(dataset);
          if (get().activeDatasetId === id) {
             set({ activeDataset: dataset });
          }
          await get().loadHistory();
        }
      },

      duplicateDataset: async (id) => {
        const dataset = await storage.getDataset(id);
        if (dataset) {
          const newDataset = {
            ...dataset,
            id: crypto.randomUUID(),
            name: `${dataset.name} (Copy)`,
            createdAt: Date.now()
          };
          await storage.saveDataset(newDataset);
          await get().loadHistory();
        }
      },
      
      clearHistory: async () => {
        await storage.clearAllDatasets();
        set({ history: [], activeDataset: null, activeDatasetId: null });
      }
    }),
    {
      name: 'insightflow-settings',
      partialize: (state) => ({ 
        settings: state.settings.aiModel?.toLowerCase().includes('insight')
          ? { ...state.settings, aiModel: 'llama-3.3-70b' }
          : state.settings
      }), // Only persist settings
    }
  )
);

// One-time startup migration to clear existing datasets (clean slate)
if (typeof window !== 'undefined') {
  const CLEAN_KEY = 'insightflow_clean_slate_v2';
  if (!localStorage.getItem(CLEAN_KEY)) {
    useAppStore.getState().clearHistory().then(() => {
      localStorage.setItem(CLEAN_KEY, 'true');
    });
  }
}

