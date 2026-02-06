
export type TransactionType = 'INCOME' | 'EXPENSE';
export type LoanType = 'TAKEN' | 'GIVEN';
export type LoanStatus = 'PENDING' | 'PAID' | 'RECEIVED';
export type ThemeColor = 'indigo' | 'emerald' | 'rose' | 'amber' | 'custom';

export interface Category {
  id: string;
  label: string;
  type: TransactionType;
}

export interface Transaction {
  id: string;
  amount: number;
  category: string;
  date: string;
  note: string;
  type: TransactionType;
}

export interface LoanPayment {
  id: string;
  amount: number;
  date: string;
  note: string;
}

export interface Loan {
  id: string;
  person: string;
  amount: number;
  date: string;
  dueDate: string;
  reason: string;
  status: LoanStatus;
  type: LoanType;
  payments?: LoanPayment[];
}

export interface MonthlyNote {
  id: string;
  month: string; // YYYY-MM
  text: string;
}

export interface Khata {
  id: string;
  name: string;
  transactions: Transaction[];
  loans: Loan[];
  notes: MonthlyNote[];
  categories: Category[];
}

export interface AppSettings {
  language: 'bn' | 'en';
  theme: 'light' | 'dark';
  themeColor: ThemeColor;
  customHex?: string;
  reminderEnabled: boolean;
  reminderTime: string; // HH:mm format
  lastAutoBackup?: string;
}

export interface StorageData {
  settings: AppSettings;
  khata: Khata;
}
