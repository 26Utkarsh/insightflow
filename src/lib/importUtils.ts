import Papa from 'papaparse';
import readExcelFile from 'read-excel-file/browser';

export interface SheetInfo {
  name: string;
  rows: number;
  empty: boolean;
  rawData: any[];
}

export interface FileAnalysis {
  fileName: string;
  fileSize: number;
  fileType: string;
  sheets: SheetInfo[]; // Will have 1 item for CSV/JSON
}

export function flattenJSON(obj: any, prefix = ''): any {
  if (obj === null || obj === undefined) return {};
  let result: any = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        Object.assign(result, flattenJSON(obj[key], newKey));
      } else {
        result[newKey] = obj[key];
      }
    }
  }
  return result;
}

function rowsToObjects(rows: any[][]): any[] {
  if (!rows.length) return [];

  const headers = rows[0].map((header, index) => {
    const value = String(header ?? '').trim();
    return value || `Column ${index + 1}`;
  });

  return rows.slice(1)
    .filter(row => row.some(cell => cell !== null && cell !== undefined && cell !== ''))
    .map(row => headers.reduce((record, header, index) => {
      record[header] = row[index] ?? null;
      return record;
    }, {} as Record<string, any>));
}

export async function analyzeFile(file: File): Promise<FileAnalysis> {
  const fileType = file.name.split('.').pop()?.toLowerCase() || '';
  
  if (fileType === 'csv') {
    const text = await file.text();
    return new Promise((resolve, reject) => {
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        complete: (results) => {
          resolve({
            fileName: file.name,
            fileSize: file.size,
            fileType: 'CSV',
            sheets: [{
              name: 'Data',
              rows: results.data.length,
              empty: results.data.length === 0,
              rawData: results.data
            }]
          });
        },
        error: (err: Error) => reject(new Error(`CSV Parse Error: ${err.message}`))
      });
    });
  } else if (fileType === 'json') {
    const text = await file.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      throw new Error('Invalid JSON file format');
    }
    
    if (!Array.isArray(data)) {
      throw new Error('JSON file must contain an array of objects');
    }
    
    const flattened = data.map(item => flattenJSON(item));
    
    return {
      fileName: file.name,
      fileSize: file.size,
      fileType: 'JSON',
      sheets: [{
        name: 'Data',
        rows: flattened.length,
        empty: flattened.length === 0,
        rawData: flattened
      }]
    };
  } else if (fileType === 'xlsx') {
    const workbook = await readExcelFile(file);
    const sheets = workbook.map(({ sheet, data }) => {
      const rawData = rowsToObjects(data as any[][]);
      return {
        name: sheet,
        rows: rawData.length,
        empty: rawData.length === 0,
        rawData
      };
    });
    
    return {
      fileName: file.name,
      fileSize: file.size,
      fileType: 'Excel',
      sheets
    };
  } else {
    throw new Error('Unsupported file format. Please upload CSV, JSON, or Excel (.xlsx).');
  }
}
