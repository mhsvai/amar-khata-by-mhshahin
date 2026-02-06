
import { StorageData } from '../types';

const STORAGE_KEY = 'amar_khata_data';

const DEFAULT_DATA: StorageData = {
  settings: {
    language: 'bn',
    theme: 'light',
    themeColor: 'indigo',
    reminderEnabled: false,
    reminderTime: '20:00',
  },
  khata: {
    id: 'default',
    name: 'My Khata',
    transactions: [],
    loans: [],
    notes: [],
    categories: [
      { id: '1', label: 'বেতন', type: 'INCOME' },
      { id: '2', label: 'উপহার', type: 'INCOME' },
      { id: '3', label: 'খাবার', type: 'EXPENSE' },
      { id: '4', label: 'বাজার', type: 'EXPENSE' },
      { id: '5', label: 'ভাড়া', type: 'EXPENSE' },
      { id: '6', label: 'যাতায়াত', type: 'EXPENSE' },
      { id: '7', label: 'চিকিৎসা', type: 'EXPENSE' },
      { id: '8', label: 'শিক্ষা', type: 'EXPENSE' },
    ],
  }
};

export const storage = {
  getData: (): StorageData => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_DATA;
    try {
      return JSON.parse(saved);
    } catch {
      return DEFAULT_DATA;
    }
  },

  saveData: (data: StorageData) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  },

  exportToJSON: () => {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return;
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AK-backup-BY-SHAHIN-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  importFromJSON: (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const parsed = JSON.parse(content);
          if (parsed.khata && parsed.settings) {
            localStorage.setItem(STORAGE_KEY, content);
            resolve();
          } else {
            reject(new Error('Invalid backup file'));
          }
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('File reading failed'));
      reader.readAsText(file);
    });
  }
};
