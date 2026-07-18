import localforage from 'localforage';
import { Dataset } from '../types';

const datasetsStore = localforage.createInstance({
  name: 'InsightFlow',
  storeName: 'datasets'
});

export const saveDataset = async (dataset: Dataset) => {
  await datasetsStore.setItem(dataset.id, dataset);
};

export const getDataset = async (id: string): Promise<Dataset | null> => {
  return await datasetsStore.getItem(id);
};

export const getAllDatasets = async (): Promise<Dataset[]> => {
  const datasets: Dataset[] = [];
  await datasetsStore.iterate((value: Dataset) => {
    datasets.push(value);
  });
  return datasets.sort((a, b) => b.createdAt - a.createdAt); // newest first
};

export const deleteDataset = async (id: string) => {
  await datasetsStore.removeItem(id);
};

export const clearAllDatasets = async () => {
  await datasetsStore.clear();
};
