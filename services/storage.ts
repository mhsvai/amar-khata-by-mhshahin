
import { StorageData, Transaction, Loan, MonthlyNote, Category } from '../types';

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
    a.download = `amar-khata-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  importFromJSON: (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const imported = JSON.parse(content);
          
          if (imported.khata && imported.settings) {
            const current = storage.getData();
            
            // --- Smart Merging Logic ---
            
            // 1. Transactions: Merge by ID uniqueness
            const existingTxIds = new Set(current.khata.transactions.map(t => t.id));
            const newTransactions = imported.khata.transactions.filter((t: Transaction) => !existingTxIds.has(t.id));
            const mergedTransactions = [...current.khata.transactions, ...newTransactions];

            // 2. Loans: Merge by ID uniqueness
            const existingLoanIds = new Set(current.khata.loans.map(l => l.id));
            const newLoans = imported.khata.loans.filter((l: Loan) => !existingLoanIds.has(l.id));
            const mergedLoans = [...current.khata.loans, ...newLoans];

            // 3. Categories: Merge by Label + Type uniqueness
            const existingCatKeys = new Set(current.khata.categories.map(c => `${c.label}_${c.type}`));
            const newCategories = imported.khata.categories.filter((c: Category) => !existingCatKeys.has(`${c.label}_${c.type}`));
            const mergedCategories = [...current.khata.categories, ...newCategories];

            // 4. Notes: Merge by Month uniqueness
            const existingMonths = new Set(current.khata.notes.map(n => n.month));
            const newNotes = imported.khata.notes.filter((n: MonthlyNote) => !existingMonths.has(n.month));
            const mergedNotes = [...current.khata.notes, ...newNotes];

            const mergedData: StorageData = {
              settings: current.settings, 
              khata: {
                ...current.khata,
                transactions: mergedTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
                loans: mergedLoans.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
                categories: mergedCategories,
                notes: mergedNotes
              }
            };

            storage.saveData(mergedData);
            resolve();
          } else {
            reject(new Error('Invalid backup file format'));
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
