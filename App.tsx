import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  History, 
  PieChart as ChartIcon, 
  Settings as SettingsIcon, 
  Plus, 
  FileText,
  Moon,
  Sun,
  X,
  Trash2,
  Edit2,
  Download,
  Upload,
  TrendingUp,
  TrendingDown,
  Bell,
  Palette,
  Check,
  HandCoins,
  User,
  Mail,
  Facebook,
  Send,
  Pipette,
  Languages,
  ClipboardList,
  Filter,
  Calendar,
  StickyNote,
  Info,
  CalendarDays,
  Layers,
  CheckCircle2,
  Clock,
  AlertCircle,
  Archive,
  ArrowRight,
  ListFilter,
  CheckCircle,
  PlusCircle,
  History as HistoryIcon,
  RefreshCcw,
  HelpCircle,
  BookOpen
} from 'lucide-react';
import { storage } from './services/storage';
import { Transaction, Loan, StorageData, TransactionType, LoanType, ThemeColor, Category, MonthlyNote, LoanStatus, LoanPayment } from './types';
import { LOAN_STATUS_LABELS, PRESET_COLORS, THEME_MAP, THEME_GRADIENT, translations } from './constants';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell
} from 'recharts';

type ActiveTab = 'dashboard' | 'history' | 'summary' | 'reports' | 'notes' | 'settings';

export default function App() {
  const [data, setData] = useState<StorageData>(storage.getData());
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(data.settings.theme === 'dark');
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState<{loan: Loan, payment?: LoanPayment} | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{id: string, isLoan: boolean, paymentId?: string} | null>(null);
  const [settleConfirmation, setSettleConfirmation] = useState<Loan | null>(null);
  const [selectedItemDetail, setSelectedItemDetail] = useState<any>(null);
  const [showDevModal, setShowDevModal] = useState(false);
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const lang = data.settings.language || 'bn';
  const t = (key: string) => translations[lang][key] || key;

  const activeColorHex = useMemo(() => {
    if (data.settings.themeColor === 'custom') {
      return data.settings.customHex || '#6366f1';
    }
    return PRESET_COLORS[data.settings.themeColor] || '#4f46e5';
  }, [data.settings.themeColor, data.settings.customHex]);

  useEffect(() => {
    storage.saveData(data);
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      document.body.classList.add('bg-gray-900');
    } else {
      root.classList.remove('dark');
      document.body.classList.remove('bg-gray-900');
    }
    root.style.setProperty('--theme-color', activeColorHex);
  }, [data, isDarkMode, activeColorHex]);

  const updateSettings = (updates: Partial<StorageData['settings']>) => {
    setIsLoading(true);
    setTimeout(() => {
      setData(prev => ({ ...prev, settings: { ...prev.settings, ...updates } }));
      setIsLoading(false);
    }, 300);
  };

  const updateKhata = (updates: any) => {
    setData(prev => ({ ...prev, khata: { ...prev.khata, ...updates } }));
  };

  const totals = useMemo(() => {
    const income = data.khata.transactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
    const expense = data.khata.transactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
    
    const loanTaken = data.khata.loans.filter(l => l.type === 'TAKEN' && l.status === 'PENDING').reduce((s, l) => {
      const paid = l.payments?.reduce((ps, p) => ps + p.amount, 0) || 0;
      return s + (l.amount - paid);
    }, 0);
    
    const loanGiven = data.khata.loans.filter(l => l.type === 'GIVEN' && l.status === 'PENDING').reduce((s, l) => {
      const received = l.payments?.reduce((ps, p) => ps + p.amount, 0) || 0;
      return s + (l.amount - received);
    }, 0);

    const todayStr = new Date().toISOString().split('T')[0];
    const todayIncome = data.khata.transactions.filter(t => t.type === 'INCOME' && t.date === todayStr).reduce((s, t) => s + t.amount, 0);
    const todayExpense = data.khata.transactions.filter(t => t.type === 'EXPENSE' && t.date === todayStr).reduce((s, t) => s + t.amount, 0);

    return {
      income, expense, loanTaken, loanGiven, todayIncome, todayExpense,
      balance: income - expense + loanTaken - loanGiven,
    };
  }, [data.khata.transactions, data.khata.loans]);

  const addOrUpdateEntry = (entry: any) => {
    setIsLoading(true);
    setTimeout(() => {
      const isEdit = !!editingItem;
      const entryId = isEdit ? editingItem.id : crypto.randomUUID();

      if (entry.entryType === 'INCOME' || entry.entryType === 'EXPENSE') {
        const newT: Transaction = {
          id: entryId,
          type: entry.entryType,
          amount: entry.amount,
          category: entry.category,
          note: entry.note,
          date: entry.date,
        };
        setData(prev => {
          let updatedTransactions = [...prev.khata.transactions];
          if (isEdit) {
            updatedTransactions = updatedTransactions.map(t => t.id === entryId ? newT : t);
          } else {
            updatedTransactions = [newT, ...updatedTransactions];
          }
          return { ...prev, khata: { ...prev.khata, transactions: updatedTransactions }};
        });
      } else {
        const newL: Loan = {
          id: entryId,
          type: entry.entryType,
          person: entry.person,
          amount: entry.amount,
          date: entry.date,
          dueDate: entry.dueDate,
          reason: entry.note,
          status: editingItem?.status || 'PENDING',
          payments: editingItem?.payments || []
        };
        setData(prev => {
          let updatedLoans = [...prev.khata.loans];
          if (isEdit) {
            updatedLoans = updatedLoans.map(l => l.id === entryId ? newL : l);
          } else {
            updatedLoans = [newL, ...updatedLoans];
          }
          return { ...prev, khata: { ...prev.khata, loans: updatedLoans }};
        });
      }
      setIsLoading(false);
      setShowEntryModal(false);
      setEditingItem(null);
    }, 400);
  };

  const handleAddPayment = (loanId: string, payment: Omit<LoanPayment, 'id'>, paymentId?: string) => {
    setData(prev => ({
      ...prev,
      khata: {
        ...prev.khata,
        loans: prev.khata.loans.map(l => {
          if (l.id !== loanId) return l;
          let updatedPayments = [...(l.payments || [])];
          if (paymentId) {
            updatedPayments = updatedPayments.map(p => p.id === paymentId ? { ...payment, id: paymentId } : p);
          } else {
            updatedPayments.push({ ...payment, id: crypto.randomUUID() });
          }
          const totalPaid = updatedPayments.reduce((s, p) => s + p.amount, 0);
          let newStatus = totalPaid >= l.amount ? (l.type === 'TAKEN' ? 'PAID' : 'RECEIVED') : 'PENDING';
          const updatedLoan = { ...l, payments: updatedPayments, status: newStatus as LoanStatus };
          if (selectedItemDetail?.id === loanId) setSelectedItemDetail(updatedLoan);
          return updatedLoan;
        })
      }
    }));
    setShowPaymentModal(null);
  };

  const handleDeletePayment = (loanId: string, paymentId: string) => {
    setData(prev => ({
      ...prev,
      khata: {
        ...prev.khata,
        loans: prev.khata.loans.map(l => {
          if (l.id !== loanId) return l;
          const updatedPayments = (l.payments || []).filter(p => p.id !== paymentId);
          const totalPaid = updatedPayments.reduce((s, p) => s + p.amount, 0);
          let newStatus = totalPaid >= l.amount ? (l.type === 'TAKEN' ? 'PAID' : 'RECEIVED') : 'PENDING';
          const updatedLoan = { ...l, payments: updatedPayments, status: newStatus as LoanStatus };
          if (selectedItemDetail?.id === loanId) setSelectedItemDetail(updatedLoan);
          return updatedLoan;
        })
      }
    }));
    setDeleteConfirmation(null);
  };

  const handleSettleLoan = (loan: Loan) => {
    setData(prev => ({
      ...prev,
      khata: {
        ...prev.khata,
        loans: prev.khata.loans.map(l => {
          if (l.id !== loan.id) return l;
          let newStatus: LoanStatus = l.type === 'TAKEN' ? 'PAID' : 'RECEIVED';
          return { ...l, status: newStatus };
        })
      }
    }));
    setSettleConfirmation(null);
  };

  const currentTheme = data.settings.themeColor;

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${isDarkMode ? 'dark bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      {isLoading && (
        <div className="fixed top-0 left-0 w-full h-1 z-[100]">
          <div className={`h-full animate-progress ${THEME_MAP[currentTheme].split(' ')[0]}`}></div>
        </div>
      )}

      <header className="px-6 py-5 flex justify-between items-center bg-white dark:bg-gray-800 border-b dark:border-gray-700 sticky top-0 z-40 backdrop-blur-lg bg-opacity-80 dark:bg-opacity-80">
        <div>
          <p className={`text-[10px] font-bold uppercase tracking-widest ${THEME_MAP[currentTheme].split(' ')[2]}`}>{t('diaryTitle')}</p>
          <h1 className="text-xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">{t('appTitle')}</h1>
        </div>
        <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 rounded-2xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 transition-all active:scale-90 hover:brightness-95 dark:hover:brightness-110">
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-5 py-6 space-y-8">
        {activeTab === 'dashboard' && <DashboardView t={t} lang={lang} totals={totals} loans={data.khata.loans} transactions={data.khata.transactions} theme={currentTheme} onShowAll={() => setActiveTab('history')} onEdit={(item: any) => { setEditingItem(item); setShowEntryModal(true); }} onDelete={(id:string, isL:boolean) => setDeleteConfirmation({id, isLoan: isL})} onShowDetail={setSelectedItemDetail} onOpenSettleConfirm={setSettleConfirmation} onOpenPaymentModal={(loan:Loan) => setShowPaymentModal({loan})} />}
        {activeTab === 'history' && <HistoryView t={t} lang={lang} transactions={data.khata.transactions} loans={data.khata.loans} onDelete={(id:string, isL:boolean) => setDeleteConfirmation({id, isLoan: isL})} onEdit={(item: any) => { setEditingItem(item); setShowEntryModal(true); }} theme={currentTheme} onShowDetail={setSelectedItemDetail} onOpenSettleConfirm={setSettleConfirmation} onOpenPaymentModal={(loan:Loan) => setShowPaymentModal({loan})} />}
        {activeTab === 'summary' && <SummaryView t={t} lang={lang} transactions={data.khata.transactions} loans={data.khata.loans} theme={currentTheme} />}
        {activeTab === 'reports' && <ReportsView t={t} lang={lang} transactions={data.khata.transactions} isDark={isDarkMode} theme={currentTheme} categories={data.khata.categories} />}
        {activeTab === 'notes' && <NotesView t={t} notes={data.khata.notes} setNotes={(n:any) => setData(p => ({...p, khata: {...p.khata, notes: n}}))} theme={currentTheme} />}
        {activeTab === 'settings' && (
          <SettingsView 
            t={t} lang={lang} settings={data.settings} onUpdateSettings={updateSettings} onExport={storage.exportToJSON} onImport={async (e:any) => { if (e.target.files[0]) { await storage.importFromJSON(e.target.files[0]); setData(storage.getData()); } }} theme={currentTheme} onShowDevProfile={() => setShowDevModal(true)} onManageCategories={() => setShowCategoryManager(true)} onShowUsageGuide={() => setShowUsageModal(true)}
          />
        )}
      </main>

      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50">
        <button onClick={() => { setEditingItem(null); setShowEntryModal(true); }} className={`${THEME_MAP[currentTheme].split(' ')[0]} text-white w-16 h-16 rounded-full shadow-xl flex items-center justify-center hover:scale-105 transition-all active:scale-90`}><Plus size={32} strokeWidth={3} /></button>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t dark:border-gray-700 px-2 py-3 pb-6 flex justify-around items-center z-40 transition-colors duration-300">
        <NavItem icon={<LayoutDashboard size={20} />} label={t('home')} active={activeTab === 'dashboard'} theme={currentTheme} onClick={() => setActiveTab('dashboard')} />
        <NavItem icon={<History size={20} />} label={t('history')} active={activeTab === 'history'} theme={currentTheme} onClick={() => setActiveTab('history')} />
        <NavItem icon={<ClipboardList size={20} />} label={t('summary')} active={activeTab === 'summary'} theme={currentTheme} onClick={() => setActiveTab('summary')} />
        <div className="w-14"></div>
        <NavItem icon={<FileText size={20} />} label={t('monthlyNote')} active={activeTab === 'notes'} theme={currentTheme} onClick={() => setActiveTab('notes')} />
        <NavItem icon={<ChartIcon size={20} />} label={t('reports')} active={activeTab === 'reports'} theme={currentTheme} onClick={() => setActiveTab('reports')} />
        <NavItem icon={<SettingsIcon size={20} />} label={t('settings')} active={activeTab === 'settings'} theme={currentTheme} onClick={() => setActiveTab('settings')} />
      </nav>

      {showEntryModal && (
        <EntryModal t={t} lang={lang} onClose={() => { setShowEntryModal(false); setEditingItem(null); }} onSubmit={addOrUpdateEntry} theme={currentTheme} categories={data.khata.categories} onUpdateKhata={(updates: any) => updateKhata(updates)} initialData={editingItem} />
      )}

      {showPaymentModal && (
        <PaymentModal t={t} lang={lang} loan={showPaymentModal.loan} payment={showPaymentModal.payment} onClose={() => setShowPaymentModal(null)} onSubmit={(p: any) => handleAddPayment(showPaymentModal.loan.id, p, showPaymentModal.payment?.id)} theme={currentTheme} />
      )}

      {showCategoryManager && (
        <CategoryManagerModal t={t} lang={lang} onClose={() => setShowCategoryManager(false)} categories={data.khata.categories} onUpdateCategories={(newCats: Category[]) => updateKhata({ categories: newCats })} theme={currentTheme} />
      )}

      {deleteConfirmation && (
        <DeleteConfirmModal t={t} onClose={() => setDeleteConfirmation(null)} onConfirm={() => {
          if (deleteConfirmation.paymentId) {
            handleDeletePayment(deleteConfirmation.id, deleteConfirmation.paymentId);
          } else {
            const { id, isLoan } = deleteConfirmation;
            setData(prev => ({
              ...prev,
              khata: {
                ...prev.khata,
                transactions: isLoan ? prev.khata.transactions : prev.khata.transactions.filter(t => t.id !== id),
                loans: isLoan ? prev.khata.loans.filter(l => l.id !== id) : prev.khata.loans
              }
            }));
            setDeleteConfirmation(null);
          }
        }} />
      )}

      {settleConfirmation && (
        <SettleConfirmModal t={t} lang={lang} loan={settleConfirmation} onClose={() => setSettleConfirmation(null)} onConfirm={() => handleSettleLoan(settleConfirmation)} />
      )}

      {selectedItemDetail && (
        <ItemDetailModal t={t} lang={lang} item={selectedItemDetail} onClose={() => setSelectedItemDetail(null)} theme={currentTheme} onEditPayment={(loan:Loan, payment:LoanPayment) => setShowPaymentModal({loan, payment})} onDeletePayment={(loanId:string, paymentId:string) => setDeleteConfirmation({id: loanId, isLoan: true, paymentId})} />
      )}

      {showDevModal && (
        <DevProfileModal t={t} onClose={() => setShowDevModal(false)} theme={currentTheme} />
      )}

      {showUsageModal && (
        <UsageGuideModal t={t} onClose={() => setShowUsageModal(false)} theme={currentTheme} lang={lang} />
      )}
    </div>
  );
}

function NavItem({ icon, label, active, theme, onClick }: any) {
  const activeClass = THEME_MAP[theme as ThemeColor].split(' ')[2];
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 transition-all ${active ? `${activeClass} scale-110 font-bold` : 'text-gray-400 dark:text-gray-500'}`}>
      {icon}
      <span className="text-[10px] font-bold">{label}</span>
    </button>
  );
}

function PaidStamp({ t }: { t: any }) {
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-[25deg] pointer-events-none z-10 opacity-20 dark:opacity-30">
      <div className="border-[6px] border-emerald-600 rounded-2xl px-6 py-2">
        <span className="text-4xl font-black text-emerald-600 uppercase tracking-widest leading-none">
          {t('paidStamp')}
        </span>
      </div>
    </div>
  );
}

function DashboardView({ t, lang, totals, loans, transactions, theme, onShowAll, onEdit, onDelete, onShowDetail, onOpenSettleConfirm, onOpenPaymentModal }: any) {
  const todayDues = loans.filter((l:any) => l.status === 'PENDING' && l.dueDate === new Date().toISOString().split('T')[0]);
  const gradientClass = THEME_GRADIENT[theme as ThemeColor];
  const accentText = THEME_MAP[theme as ThemeColor].split(' ')[2];

  const recentItems = useMemo(() => {
    const combined = [
      ...transactions.map((t: any) => ({ ...t, isLoan: false })),
      ...loans.map((l: any) => ({ ...l, isLoan: true, category: l.person, note: l.reason }))
    ];
    return combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6);
  }, [transactions, loans]);

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className={`relative overflow-hidden bg-gradient-to-br ${gradientClass} rounded-[2.5rem] p-8 text-white shadow-2xl`}>
        <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        <p className="text-white/80 text-xs font-bold uppercase tracking-widest mb-2">{t('currentBalance')}</p>
        <h2 className="text-4xl font-black mb-6 flex items-center gap-2">৳ {totals.balance.toLocaleString('bn-BD')}</h2>
        <div className="grid grid-cols-2 gap-4 bg-white/10 backdrop-blur-md rounded-3xl p-4">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl"><TrendingUp size={18} /></div>
            <div><p className="text-[10px] text-white/70">{t('totalIncome')}</p><p className="font-bold">৳ {totals.income.toLocaleString('bn-BD')}</p></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl"><TrendingDown size={18} /></div>
            <div><p className="text-[10px] text-white/70">{t('totalExpense')}</p><p className="font-bold">৳ {totals.expense.toLocaleString('bn-BD')}</p></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm transition-colors"><p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase mb-1">{t('todayIncome')}</p><p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">+ ৳ {totals.todayIncome}</p></div>
        <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm transition-colors"><p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase mb-1">{t('todayExpense')}</p><p className="text-lg font-bold text-rose-600 dark:text-rose-400">- ৳ {totals.todayExpense}</p></div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between transition-colors">
        <div className="space-y-1"><p className="text-[10px] font-black text-blue-500 dark:text-blue-400 uppercase">{t('loanGiven')}</p><p className="text-xl font-black text-gray-900 dark:text-gray-100">৳ {totals.loanGiven.toLocaleString('bn-BD')}</p></div>
        <div className="h-10 w-px bg-gray-100 dark:bg-gray-700 mx-4"></div>
        <div className="space-y-1 text-right"><p className="text-[10px] font-black text-orange-500 dark:text-orange-400 uppercase">{t('loanTaken')}</p><p className="text-xl font-black text-gray-900 dark:text-gray-100">৳ {totals.loanTaken.toLocaleString('bn-BD')}</p></div>
      </div>

      {todayDues.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800 p-6 rounded-[2.5rem] shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-amber-100 dark:bg-amber-800 p-2.5 rounded-2xl">
              <AlertCircle className="text-amber-600 dark:text-amber-400" size={20}/>
            </div>
            <h3 className="font-black text-sm uppercase tracking-wider text-amber-900 dark:text-amber-100">{t('reminder')}</h3>
          </div>
          <div className="space-y-3">
            {todayDues.map((d:any) => {
              const paid = d.payments?.reduce((s:number, p:any) => s + p.amount, 0) || 0;
              const remaining = Math.max(0, d.amount - paid);
              return (
                <div key={d.id} className="bg-white/60 dark:bg-gray-800/60 p-4 rounded-2xl flex justify-between items-center shadow-xs border border-amber-50 dark:border-amber-900/30">
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-amber-900 dark:text-amber-100 truncate max-w-[120px]">{d.person}</span>
                    <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase">{d.type === 'TAKEN' ? t('loanTakenType') : t('loanGivenType')}</span>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <span className="text-xl font-black text-amber-900 dark:text-amber-100 leading-none">৳ {remaining.toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-US')}</span>
                    {paid > 0 && (
                      <p className="text-[10px] text-amber-900/40 font-bold line-through mt-0.5">৳ {d.amount.toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-US')}</p>
                    )}
                    <p className="text-[8px] font-bold text-amber-600/60 uppercase mt-0.5">{lang === 'bn' ? 'আজ পরিশোধযোগ্য' : 'Due Today'}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <div className="flex justify-between items-center mb-4 px-2"><h3 className="text-lg font-black tracking-tight text-gray-900 dark:text-gray-100">{t('recentHistory')}</h3><button onClick={onShowAll} className={`text-xs font-bold ${accentText}`}>{t('seeAll')}</button></div>
        <div className="space-y-3 pb-10">
          {recentItems.map((item: any) => {
            const isSettled = item.status && item.status !== 'PENDING';
            const paid = item.isLoan ? (item.payments?.reduce((s:number, p:any) => s + p.amount, 0) || 0) : 0;
            const remaining = item.isLoan ? Math.max(0, item.amount - paid) : 0;
            const isLoss = (item.type === 'EXPENSE' || (item.isLoan && item.type === 'TAKEN'));
            
            return (
              <div key={item.id} onClick={() => onShowDetail(item)} className={`relative overflow-hidden bg-white dark:bg-gray-800 p-4 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm transition-all hover:scale-[1.01] dark:hover:bg-gray-750 cursor-pointer ${isSettled ? 'opacity-70' : ''}`}>
                {isSettled && <PaidStamp t={t} />}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${item.isLoan ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300' : item.type === 'INCOME' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300'}`}>
                      {item.isLoan ? <HandCoins size={20} /> : item.type === 'INCOME' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm leading-tight text-gray-900 dark:text-gray-100 truncate">{item.isLoan ? item.person : item.category} {item.isLoan && (item.type === 'TAKEN' ? (lang === 'en' ? '(Taken)' : '(ঋণ গ্রহণ)') : (lang === 'en' ? '(Given)' : '(ঋণ প্রদান)'))}</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">{new Date(item.date).toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    <div className="text-right flex flex-col items-end">
                      <p className={`font-black text-2xl leading-none tracking-tight ${ !isLoss ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        ৳ {(item.isLoan ? (isSettled ? 0 : remaining) : item.amount).toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-US')}
                      </p>
                      {item.isLoan && (paid > 0 || isSettled) && (
                        <p className="text-[11px] text-gray-400 font-bold italic line-through mt-0.5">৳ {item.amount.toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-US')}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-2" onClick={(e) => e.stopPropagation()}>
                        {item.isLoan && !isSettled && (
                          <>
                            <button onClick={() => onOpenPaymentModal(item)} className="w-8 h-8 flex items-center justify-center text-amber-500 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300 transition-colors bg-amber-50 dark:bg-amber-900/20 rounded-lg" title={t('addPayment')}><PlusCircle size={15} /></button>
                            <button onClick={() => onOpenSettleConfirm(item)} className="w-8 h-8 flex items-center justify-center text-emerald-500 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-amber-300 transition-colors bg-emerald-50 dark:bg-amber-900/20 rounded-lg" title={t('settle')}><CheckCircle size={15} /></button>
                          </>
                        )}
                        <button onClick={() => onEdit(item)} className="w-8 h-8 flex items-center justify-center text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors bg-blue-50 dark:bg-blue-900/20 rounded-lg"><Edit2 size={14} /></button>
                        <button onClick={() => onDelete(item.id, !!item.isLoan)} className="w-8 h-8 flex items-center justify-center text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 transition-colors bg-rose-50 dark:bg-blue-900/20 rounded-lg"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
                {(item.reason || item.note) && (
                  <div className="mt-3 w-full text-left bg-gray-50 dark:bg-gray-700/40 px-3 py-2 rounded-xl border border-gray-100 dark:border-gray-700 transition-colors active:bg-gray-100 overflow-hidden">
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium truncate italic">
                      "{item.reason || item.note}"
                    </p>
                  </div>
                )}
              </div>
            );
          })}
          {recentItems.length === 0 && <div className="text-center py-10 text-gray-400 dark:text-gray-600 font-bold italic">{lang === 'bn' ? 'কোন হিসাব নেই' : 'No entries yet'}</div>}
        </div>
      </div>
    </div>
  );
}

function ItemDetailModal({ t, lang, item, onClose, theme, onEditPayment, onDeletePayment }: any) {
  const isIncome = item.type === 'INCOME' || (item.isLoan && item.type === 'GIVEN');
  const typeText = useMemo(() => {
    if (item.isLoan) return item.type === 'TAKEN' ? t('loanTakenType') : t('loanGivenType');
    return item.type === 'INCOME' ? t('incomeType') : t('expenseType');
  }, [item, t]);

  const paidAmount = item.payments?.reduce((s:number, p:any) => s + p.amount, 0) || 0;
  const remaining = item.isLoan ? Math.max(0, item.amount - paidAmount) : 0;
  const isSettled = item.status && item.status !== 'PENDING';

  const sortedPayments = useMemo(() => {
    if (!item.payments) return [];
    return [...item.payments].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [item.payments]);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative bg-white dark:bg-gray-800 w-full max-sm:w-[95%] max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh] hide-scrollbar">
        <div className="flex justify-between items-start mb-6 sticky top-0 bg-white dark:bg-gray-800 z-10 -mt-2 py-2">
          <div className="flex items-center gap-3">
             <div className={`p-2 rounded-2xl ${isIncome ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/30'}`}>{item.isLoan ? <HandCoins size={24} /> : isIncome ? <TrendingUp size={24} /> : <TrendingDown size={24} />}</div>
             <div><h2 className="text-xl font-black text-gray-900 dark:text-white leading-tight">{t('noteDetails')}</h2><p className={`text-[10px] font-black uppercase tracking-widest ${isIncome ? 'text-emerald-500' : 'text-rose-500'}`}>{typeText}</p></div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full bg-gray-50 dark:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={20} /></button>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800"><div className="flex items-center gap-3 text-gray-500 dark:text-gray-400 shrink-0"><CalendarDays size={18} /><span className="text-xs font-bold uppercase">{t('dateLabel')}</span></div><span className="font-bold text-gray-900 dark:text-white text-sm truncate ml-2">{new Date(item.date).toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
          <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800"><div className="flex items-center gap-3 text-gray-500 dark:text-gray-400 shrink-0"><Layers size={18} /><span className="text-xs font-bold uppercase">{t('category')}</span></div><span className="font-bold text-gray-900 dark:text-white text-sm truncate ml-2">{item.isLoan ? item.person : item.category}</span></div>
          <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800"><div className="flex items-center gap-3 text-gray-500 dark:text-gray-400 shrink-0"><CheckCircle2 size={18} /><span className="text-xs font-bold uppercase">{lang === 'bn' ? 'মোট পরিমাণ' : 'Total Amount'}</span></div><span className="font-black text-xl ml-2">৳ {item.amount.toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-US')}</span></div>
          
          {item.isLoan && (
            <>
              <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800"><div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400 shrink-0"><TrendingUp size={18} /><span className="text-xs font-bold uppercase">{t('paidAmount')}</span></div><span className="font-black text-lg text-emerald-600 dark:text-emerald-400">৳ {paidAmount.toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-US')}</span></div>
              <div className="flex items-center justify-between p-4 rounded-2xl bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800"><div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 shrink-0"><TrendingDown size={18} /><span className="text-xs font-bold uppercase">{t('remaining')}</span></div><span className="font-black text-lg text-rose-600 dark:text-rose-400">৳ {remaining.toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-US')}</span></div>
              
              {sortedPayments.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-[1.5rem] border border-gray-100 dark:border-gray-700 mt-4">
                  <div className="flex items-center gap-2 mb-3 text-gray-500 dark:text-gray-400"><HistoryIcon size={16} /><span className="text-[10px] font-black uppercase tracking-widest">{t('paymentHistory')}</span></div>
                  <div className="space-y-4 max-h-[350px] overflow-y-auto hide-scrollbar">
                    {sortedPayments.map((p: any) => (
                      <div key={p.id} className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">{new Date(p.date).toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">৳ {p.amount.toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-US')}</span>
                          </div>
                          <div className="flex gap-2">
                             <button onClick={() => onEditPayment(item, p)} className="w-8 h-8 flex items-center justify-center bg-blue-50 dark:bg-blue-900/30 text-blue-500 hover:text-blue-600 rounded-xl transition-all active:scale-90"><Edit2 size={14}/></button>
                             <button onClick={() => onDeletePayment(item.id, p.id)} className="w-8 h-8 flex items-center justify-center bg-rose-50 dark:bg-rose-900/30 text-rose-500 hover:text-rose-600 rounded-xl transition-all active:scale-90"><Trash2 size={14}/></button>
                          </div>
                        </div>
                        {p.note && (
                          <div className="bg-gray-50 dark:bg-gray-700/50 px-3 py-2 rounded-xl border border-dashed border-gray-200 dark:border-gray-600 flex items-start gap-2">
                             <StickyNote size={12} className="text-gray-400 mt-1 shrink-0" />
                             <p className="text-[10px] text-gray-600 dark:text-gray-300 font-semibold italic leading-relaxed">"{p.note}"</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {(item.reason || item.note) && (
            <div className="bg-blue-50/50 dark:bg-blue-900/20 p-5 rounded-[1.5rem] border border-blue-100 dark:border-blue-800/50 mt-4"><div className="flex items-center gap-2 mb-3 text-blue-600 dark:text-blue-400"><StickyNote size={18} /><span className="text-[10px] font-black uppercase tracking-widest">{lang === 'en' ? 'Detailed Note' : 'বিস্তারিত নোট'}</span></div><p className="text-sm font-semibold text-gray-700 dark:text-gray-200 leading-relaxed whitespace-pre-wrap italic">"{item.reason || item.note}"</p></div>
          )}
        </div>
        <button onClick={onClose} className="w-full bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-black py-4 rounded-[1.5rem] mt-6 active:scale-95 transition-all shadow-lg">{t('close')}</button>
      </div>
    </div>
  );
}

function HistoryView({ t, lang, transactions, loans, onDelete, onEdit, theme, onShowDetail, onOpenSettleConfirm, onOpenPaymentModal }: any) {
  const [filter, setFilter] = useState('all');
  const accentBg = THEME_MAP[theme as ThemeColor].split(' ')[0];

  const items = useMemo(() => {
    let combined = [
      ...transactions.map((t:any) => ({...t, isLoan: false})), 
      ...loans.map((l:any) => ({...l, isLoan: true, category: l.person, note: l.reason}))
    ];

    if (filter === 'income') combined = transactions.filter((t:any) => t.type === 'INCOME').map((t:any) => ({...t, isLoan: false}));
    if (filter === 'expense') combined = transactions.filter((t:any) => t.type === 'EXPENSE').map((t:any) => ({...t, isLoan: false}));
    if (filter === 'taken') combined = loans.filter((l:any) => l.type === 'TAKEN' && l.status === 'PENDING').map((l:any) => ({...l, isLoan: true, category: l.person, note: l.reason}));
    if (filter === 'given') combined = loans.filter((l:any) => l.type === 'GIVEN' && l.status === 'PENDING').map((l:any) => ({...l, isLoan: true, category: l.person, note: l.reason}));
    if (filter === 'settled') combined = loans.filter((l:any) => l.status !== 'PENDING').map((l:any) => ({...l, isLoan: true, category: l.person, note: l.reason}));

    return combined.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, loans, filter]);

  return (
    <div className="space-y-6">
      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2 px-1">
        {[
          { id: 'all', label: lang === 'bn' ? 'সব' : 'All' },
          { id: 'income', label: lang === 'bn' ? 'আয়' : 'Income' },
          { id: 'expense', label: lang === 'bn' ? 'ব্যয়' : 'Expense' },
          { id: 'taken', label: lang === 'bn' ? 'ঋণ গ্রহণ' : 'Taken' },
          { id: 'given', label: lang === 'bn' ? 'ঋণ প্রদান' : 'Given' },
          { id: 'settled', label: t('settledFilter') }
        ].map(f => (
          <button 
            key={f.id} 
            onClick={() => setFilter(f.id)} 
            className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shrink-0 border ${filter === f.id ? `${accentBg} text-white border-transparent shadow-lg` : 'bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-100 dark:border-gray-700'}`}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="space-y-4 pb-20">
        {items.map((item:any) => {
          const isSettled = item.status && item.status !== 'PENDING';
          const paid = item.isLoan ? (item.payments?.reduce((s:number, p:any) => s + p.amount, 0) || 0) : 0;
          const remaining = item.isLoan ? Math.max(0, item.amount - paid) : 0;
          const isLoss = (item.type === 'EXPENSE' || (item.isLoan && item.type === 'TAKEN'));
          
          return (
            <div key={item.id} onClick={() => onShowDetail(item)} className={`relative overflow-hidden bg-white dark:bg-gray-800 p-5 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm transition-all dark:hover:bg-gray-750 cursor-pointer ${isSettled ? 'opacity-70' : ''}`}>
              {isSettled && <PaidStamp t={t} />}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className={`p-3 rounded-2xl shrink-0 ${item.isLoan ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300' : item.type === 'INCOME' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/40 dark:text-blue-300' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300'}`}>{item.isLoan ? <HandCoins size={20}/> : item.type === 'INCOME' ? <TrendingUp size={20}/> : <TrendingDown size={20}/>}</div>
                  <div className="flex-1 min-w-0"><p className="font-bold text-sm leading-tight text-gray-900 dark:text-gray-100 truncate">{item.isLoan ? item.person : item.category} {item.isLoan && (item.type === 'TAKEN' ? (lang === 'en' ? ' (Taken)' : ' (ধার নেওয়া)') : (lang === 'en' ? ' (Given)' : ' (ধার দেওয়া)'))}</p><p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 font-medium">{new Date(item.date).toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US')}</p></div>
                </div>
                <div className="text-right flex items-center gap-4 shrink-0">
                  <div className="text-right flex flex-col items-end">
                    <p className={`font-black whitespace-nowrap text-2xl leading-none tracking-tight ${ !isLoss ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>৳ {(item.isLoan ? (isSettled ? 0 : remaining) : item.amount).toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-US')}</p>
                    {item.isLoan && (paid > 0 || isSettled) && (
                      <p className="text-[11px] text-gray-400 font-bold italic line-through mt-0.5">৳ {item.amount.toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-US')}</p>
                    )}
                  </div>
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    {item.isLoan && !isSettled && (
                      <div className="flex gap-2">
                        <button onClick={() => onOpenPaymentModal(item)} className="text-amber-500 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300 transition-colors p-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl" title={t('addPayment')}><PlusCircle size={16} /></button>
                        <button onClick={() => onOpenSettleConfirm(item)} className="text-emerald-500 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-amber-300 transition-colors p-2 bg-emerald-50 dark:bg-amber-900/20 rounded-xl" title={t('settle')}><CheckCircle size={16} /></button>
                      </div>
                    )}
                    <button onClick={() => onEdit(item)} className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl"><Edit2 size={16} /></button>
                    <button onClick={() => onDelete(item.id, !!item.isLoan)} className="text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 transition-colors p-2 bg-rose-50 dark:bg-blue-900/20 rounded-xl"><Trash2 size={16} /></button>
                  </div>
                </div>
              </div>
              {(item.reason || item.note) && (<div className="mt-3 w-full text-left bg-gray-50 dark:bg-gray-900/40 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700 transition-colors active:bg-gray-100 overflow-hidden"><p className="text-[10px] text-gray-500 dark:text-gray-400 italic font-medium truncate">"{item.reason || item.note}"</p></div>)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SummaryView({ t, lang, transactions, loans, theme }: any) {
  const [summaryType, setSummaryType] = useState<'finance' | 'loans'>('finance');
  const [viewMode, setViewMode] = useState<'monthly' | 'yearly' | 'custom'>('monthly');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [startMonth, setStartMonth] = useState(new Date().toISOString().substring(0, 7));
  const [endMonth, setEndMonth] = useState(new Date().toISOString().substring(0, 7));
  
  const accentClass = THEME_MAP[theme as ThemeColor].split(' ')[0];
  const accentText = THEME_MAP[theme as ThemeColor].split(' ')[2];
  
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    for (let y = 2022; y <= 2032; y++) {
      years.add(y.toString());
    }
    transactions.forEach((tr: any) => years.add(tr.date.substring(0, 4)));
    loans.forEach((lo: any) => years.add(lo.date.substring(0, 4)));
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [transactions, loans]);

  const monthlyData = useMemo(() => {
    const allMonths: Record<string, { income: number, expense: number, loanGiven: number, loanTaken: number }> = {};
    
    transactions.forEach((tr: any) => {
      const month = tr.date.substring(0, 7);
      if (!allMonths[month]) allMonths[month] = { income: 0, expense: 0, loanGiven: 0, loanTaken: 0 };
      if (tr.type === 'INCOME') allMonths[month].income += tr.amount;
      else if (tr.type === 'EXPENSE') allMonths[month].expense += tr.amount;
    });

    loans.forEach((lo: any) => {
      const month = lo.date.substring(0, 7);
      if (!allMonths[month]) allMonths[month] = { income: 0, expense: 0, loanGiven: 0, loanTaken: 0 };
      const paymentsInMonth = lo.payments?.filter((p:any) => p.date.startsWith(month)).reduce((s:number, p:any) => s + p.amount, 0) || 0;
      if (lo.type === 'GIVEN') allMonths[month].loanGiven += paymentsInMonth;
      else if (lo.type === 'TAKEN') allMonths[month].loanTaken += paymentsInMonth;
    });

    const sortedMonths = Object.keys(allMonths).sort((a, b) => a.localeCompare(b));
    let runningBalance = 0;
    const records = sortedMonths.map(month => {
      const data = allMonths[month];
      const monthlyNet = data.income - data.expense + data.loanTaken - data.loanGiven;
      runningBalance += monthlyNet;
      return {
        month,
        ...data,
        financeBalance: data.income - data.expense,
        loanBalance: data.loanTaken - data.loanGiven,
        closingBalance: runningBalance
      };
    });

    if (viewMode === 'monthly') {
      const target = `${selectedYear}-${selectedMonth}`;
      return records.filter(r => r.month === target);
    } else if (viewMode === 'yearly') {
      return records.filter(r => r.month.startsWith(selectedYear)).reverse();
    } else {
      return records.filter(r => r.month >= startMonth && r.month <= endMonth).reverse();
    }
  }, [transactions, loans, selectedYear, selectedMonth, viewMode, startMonth, endMonth]);

  const rangeTotals = useMemo(() => {
    return monthlyData.reduce((acc, curr) => ({
      income: acc.income + curr.income,
      expense: acc.expense + curr.expense,
      loanGiven: acc.loanGiven + curr.loanGiven,
      loanTaken: acc.loanTaken + curr.loanTaken,
    }), { income: 0, expense: 0, loanGiven: 0, loanTaken: 0 });
  }, [monthlyData]);

  const monthNames = lang === 'bn' 
    ? ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর']
    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 px-2">
        <h3 className="font-black text-xl text-gray-900 dark:text-gray-100">{t('monthlySummary')}</h3>
        <div className="flex gap-2 p-1 bg-gray-50 dark:bg-gray-900/50 rounded-2xl overflow-x-auto hide-scrollbar">
          <button onClick={() => setViewMode('monthly')} className={`flex-1 py-2.5 px-4 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap ${viewMode === 'monthly' ? `${accentClass} text-white shadow-md` : 'text-gray-400 dark:text-gray-500'}`}>{t('monthly')}</button>
          <button onClick={() => setViewMode('yearly')} className={`flex-1 py-2.5 px-4 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap ${viewMode === 'yearly' ? `${accentClass} text-white shadow-md` : 'text-gray-400 dark:text-gray-500'}`}>{t('yearly')}</button>
          <button onClick={() => setViewMode('custom')} className={`flex-1 py-2.5 px-4 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap ${viewMode === 'custom' ? `${accentClass} text-white shadow-md` : 'text-gray-400 dark:text-gray-500'}`}>{t('customRange')}</button>
        </div>
        <div className="bg-white dark:bg-gray-800 p-5 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm animate-in slide-in-from-top-2 duration-300">
          {viewMode === 'monthly' ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase ml-2">{lang === 'bn' ? 'বছর' : 'Year'}</label><select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className={`w-full bg-gray-50 dark:bg-gray-700 px-4 py-2.5 rounded-xl text-xs font-bold ${accentText} outline-none cursor-pointer appearance-none border-none`}>{availableYears.map(y => <option key={y} value={y}>{y}</option>)}</select></div>
              <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase ml-2">{lang === 'bn' ? 'মাস' : 'Month'}</label><select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className={`w-full bg-gray-50 dark:bg-gray-700 px-4 py-2.5 rounded-xl text-xs font-bold ${accentText} outline-none cursor-pointer appearance-none border-none`}>{monthNames.map((name, i) => (<option key={i} value={(i + 1).toString().padStart(2, '0')}>{name}</option>))}</select></div>
            </div>
          ) : viewMode === 'yearly' ? (
             <div className="flex items-center justify-between"><span className="text-xs font-bold text-gray-500 dark:text-gray-400">{lang === 'bn' ? 'বছর নির্বাচন করুন' : 'Select Year'}</span><select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className={`bg-gray-50 dark:bg-gray-700 px-6 py-2.5 rounded-xl text-xs font-bold ${accentText} outline-none cursor-pointer appearance-none border-none`}>{availableYears.map(y => <option key={y} value={y}>{y}</option>)}</select></div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase ml-2">{lang === 'bn' ? 'শুরুর মাস' : 'Start Month'}</label><input type="month" value={startMonth} onChange={e => setStartMonth(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-700 p-2.5 rounded-xl text-xs font-bold outline-none dark:text-white dark:color-scheme-dark border-none" /></div>
              <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase ml-2">{lang === 'bn' ? 'শেষ মাস' : 'End Month'}</label><input type="month" value={endMonth} onChange={e => setEndMonth(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-700 p-2.5 rounded-xl text-xs font-bold outline-none dark:text-white dark:color-scheme-dark border-none" /></div>
            </div>
          )}
        </div>
        <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-[2rem]"><button onClick={() => setSummaryType('finance')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[1.5rem] text-xs font-bold transition-all ${summaryType === 'finance' ? `${accentClass} text-white shadow-lg` : 'text-gray-400 dark:text-gray-500'}`}><TrendingUp size={16} />{t('finance')}</button><button onClick={() => setSummaryType('loans')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[1.5rem] text-xs font-bold transition-all ${summaryType === 'loans' ? `${accentClass} text-white shadow-lg` : 'text-gray-400 dark:text-gray-500'}`}><HandCoins size={16} />{t('loans')}</button></div>
      </div>
      {monthlyData.length > 0 && (<div className={`${accentClass} bg-opacity-5 dark:bg-opacity-20 p-6 rounded-[2.5rem] border-2 border-dashed border-gray-200 dark:border-gray-700 mx-2`}><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 text-center">{viewMode === 'yearly' ? `${selectedYear} ${lang === 'bn' ? 'এর মোট হিসাব' : 'Yearly Totals'}` : viewMode === 'monthly' ? (lang === 'bn' ? 'মাসের মোট হিসাব' : 'Monthly Totals') : (lang === 'bn' ? 'নির্বাচিত রেঞ্জের মোট' : 'Range Totals')}</p><div className="grid grid-cols-2 gap-4"><div className="text-center"><p className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">{summaryType === 'finance' ? t('totalIncome') : t('loanTaken')}</p><p className="text-lg font-black text-gray-900 dark:text-white">৳ {(summaryType === 'finance' ? rangeTotals.income : rangeTotals.loanTaken).toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-US')}</p></div><div className="text-center border-l border-gray-200 dark:border-gray-700"><p className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">{summaryType === 'finance' ? t('totalExpense') : t('loanGiven')}</p><p className="text-lg font-black text-gray-900 dark:text-white">৳ {(summaryType === 'finance' ? rangeTotals.expense : rangeTotals.loanGiven).toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-US')}</p></div></div></div>)}
      <div className="space-y-4 pb-20">{monthlyData.map((data: any) => (<div key={data.month} className="bg-white dark:bg-gray-800 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden transition-all hover:shadow-md mx-2"><div className="bg-gray-50 dark:bg-gray-900/50 px-8 py-5 flex justify-between items-center border-b dark:border-gray-700"><p className="font-black text-xs uppercase tracking-widest text-gray-900 dark:text-gray-100">{new Date(data.month + '-01').toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', { month: 'long', year: 'numeric' })}</p><div className={`text-[10px] font-black px-4 py-1.5 rounded-full ${summaryType === 'finance' ? (data.financeBalance >= 0 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300') : (data.loanBalance >= 0 ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300' : 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300')}`}>{summaryType === 'finance' ? t('balance') : t('netLoan')}: ৳ {Math.abs(summaryType === 'finance' ? data.financeBalance : data.loanBalance).toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-US')}</div></div><div className="p-8 grid grid-cols-2 gap-10">{summaryType === 'finance' ? (<><div className="space-y-1"><p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tighter">{t('totalIncome')}</p><p className="text-2xl font-black text-gray-900 dark:text-gray-100 truncate">৳ {data.income.toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-US')}</p></div><div className="space-y-1 text-right"><p className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-tighter">{t('totalExpense')}</p><p className="text-2xl font-black text-gray-900 dark:text-gray-100 truncate">৳ {data.expense.toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-US')}</p></div></>) : (<><div className="space-y-1"><p className="text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-tighter">{t('loanTaken')}</p><p className="text-2xl font-black text-gray-900 dark:text-gray-100 truncate">৳ {data.loanTaken.toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-US')}</p></div><div className="space-y-1 text-right"><p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-tighter">{t('loanGiven')}</p><p className="text-2xl font-black text-gray-900 dark:text-gray-100 truncate">৳ {data.loanGiven.toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-US')}</p></div></>)}</div><div className="px-8 pb-6 text-center border-t dark:border-gray-700 pt-4 bg-gray-50/30 dark:bg-gray-900/20"><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{t('closingBalance')}</p><p className={`text-lg font-black ${data.closingBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>৳ {data.closingBalance.toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-US')}</p></div></div>))}</div>
    </div>
  );
}

function ReportsView({ t, lang, transactions, isDark, theme, categories }: any) {
  const [rangeType, setRangeType] = useState<'weekly' | 'monthly' | 'custom'>('monthly');
  const [catFilter, setCatFilter] = useState('all');
  const [customStart, setCustomStart] = useState(new Date().toISOString().split('T')[0]);
  const [customEnd, setCustomEnd] = useState(new Date().toISOString().split('T')[0]);
  const activeColorHex = useMemo(() => theme === 'custom' ? 'var(--theme-color)' : PRESET_COLORS[theme] || '#4f46e5', [theme]);
  
  const filteredTransactions = useMemo(() => transactions.filter((tr: Transaction) => { 
    if (catFilter !== 'all' && tr.category !== catFilter) return false; 
    const trDate = new Date(tr.date); 
    const now = new Date(); 
    if (rangeType === 'weekly') { 
      const weekAgo = new Date(); 
      weekAgo.setDate(now.getDate() - 7); 
      return trDate >= weekAgo; 
    } else if (rangeType === 'monthly') { 
      return trDate.getMonth() === now.getMonth() && trDate.getFullYear() === now.getFullYear(); 
    } else if (rangeType === 'custom') { 
      const start = new Date(customStart); 
      const end = new Date(customEnd); 
      start.setHours(0,0,0,0); 
      end.setHours(23,59,59,999); 
      return trDate >= start && trDate <= end; 
    } 
    return true; 
  }), [transactions, rangeType, catFilter, customStart, customEnd]);

  const chartData = useMemo(() => { 
    const isDaily = rangeType === 'weekly' || (rangeType === 'custom' && (new Date(customEnd).getTime() - new Date(customStart).getTime()) < 30 * 24 * 60 * 60 * 1000); 
    const groups: Record<string, { income: number, expense: number }> = {}; 
    filteredTransactions.forEach((t: any) => { 
      const key = isDaily ? t.date : t.date.substring(0, 7); 
      if (!groups[key]) groups[key] = { income: 0, expense: 0 }; 
      if (t.type === 'INCOME') groups[key].income += t.amount; 
      else groups[key].expense += t.amount; 
    }); 
    return Object.entries(groups).map(([name, val]) => ({ name, ...val })).sort((a, b) => a.name.localeCompare(b.name)); 
  }, [filteredTransactions, rangeType, customStart, customEnd]);

  const pieData = useMemo(() => { 
    const cats: Record<string, number> = {}; 
    filteredTransactions.filter((t: any) => t.type === 'EXPENSE').forEach((t: any) => { 
      cats[t.category] = (cats[t.category] || 0) + t.amount; 
    }); 
    return Object.entries(cats).map(([name, value]) => ({ name, value })); 
  }, [filteredTransactions]);

  const stats = useMemo(() => { 
    const inc = filteredTransactions.filter((t: any) => t.type === 'INCOME').reduce((s,t) => s + t.amount, 0); 
    const exp = filteredTransactions.filter((t: any) => t.type === 'EXPENSE').reduce((s,t) => s + t.amount, 0); 
    return { income: inc, expense: exp, balance: inc - exp }; 
  }, [filteredTransactions]);

  const COLORS = [activeColorHex, '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  const accentClass = THEME_MAP[theme].split(' ')[0];
  const accentText = THEME_MAP[theme].split(' ')[2];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm space-y-6"><div className="flex items-center gap-2 mb-2"><Filter size={18} className={accentText} /><h3 className="font-black text-sm uppercase tracking-wider">{t('stats')}</h3></div><div className="flex gap-2 p-1 bg-gray-50 dark:bg-gray-900/50 rounded-2xl">{['weekly', 'monthly', 'custom'].map((r: any) => (<button key={r} onClick={() => setRangeType(r)} className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${rangeType === r ? `${accentClass} text-white shadow-md` : 'text-gray-400 dark:text-gray-500'}`}>{t(r === 'custom' ? 'customRange' : r)}</button>))}</div><div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase ml-2">{t('category')}</label><select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl border-none outline-none font-bold text-xs text-gray-900 dark:text-gray-100 appearance-none"><option value="all">{t('allCategories')}</option>{Array.from(new Set(categories.map((c: any) => c.label))).map((catLabel: any) => (<option key={catLabel} value={catLabel}>{catLabel}</option>))}</select></div>{rangeType === 'custom' && (<div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300"><div className="space-y-1.5"><label className="text-[10px] font-black text-gray-400 uppercase ml-2">{t('startDate')}</label><input type="date" className="w-full p-3.5 bg-gray-50 dark:bg-gray-700 rounded-2xl border-none outline-none font-bold text-xs text-gray-900 dark:text-gray-100 dark:color-scheme-dark" value={customStart} onChange={e => setCustomStart(e.target.value)} /></div><div className="space-y-1.5"><label className="text-[10px] font-black text-gray-400 uppercase ml-2">{t('endDate')}</label><input type="date" className="w-full p-3.5 bg-gray-50 dark:bg-gray-700 rounded-2xl border-none outline-none font-bold text-xs text-gray-900 dark:text-gray-100 dark:color-scheme-dark" value={customEnd} onChange={e => setCustomEnd(e.target.value)} /></div></div>)}</div>
      <div className="grid grid-cols-3 gap-3"><div className="bg-white dark:bg-gray-800 p-4 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm transition-colors text-center"><p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase mb-1">{t('totalIncome')}</p><p className="text-sm font-black text-gray-900 dark:text-gray-100 truncate">৳{stats.income.toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-US')}</p></div><div className="bg-white dark:bg-gray-800 p-4 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm transition-colors text-center"><p className="text-[9px] font-black text-rose-600 dark:text-rose-400 uppercase mb-1">{t('totalExpense')}</p><p className="text-sm font-black text-gray-900 dark:text-gray-100 truncate">৳{stats.expense.toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-US')}</p></div><div className="bg-white dark:bg-gray-800 p-4 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm transition-colors text-center"><p className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase mb-1">{t('balance')}</p><p className="text-sm font-black text-gray-900 dark:text-gray-100 truncate">৳{stats.balance.toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-US')}</p></div></div>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm transition-colors"><h3 className="font-black text-lg mb-6 text-gray-900 dark:text-gray-100">{rangeType === 'weekly' ? t('weekly') : rangeType === 'monthly' ? t('monthly') : t('customRange')}</h3><div className="h-[250px] w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#374151' : '#f3f4f6'} /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fontStretch: 'condensed', fontWeight: 'bold', fill: isDark ? '#9ca3af' : '#4b5563'}} tickFormatter={(v) => rangeType === 'weekly' ? v.split('-').pop() : v} /><YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fill: isDark ? '#9ca3af' : '#4b5563'}} /><Tooltip cursor={{fill: 'transparent'}} contentStyle={{ backgroundColor: isDark ? '#1f2937' : '#fff', borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)', color: isDark ? '#fff' : '#000' }} /><Bar dataKey="income" name={t('totalIncome')} fill="#10b981" radius={[10, 10, 10, 10]} barSize={10} /><Bar dataKey="expense" name={t('totalExpense')} fill="#ef4444" radius={[10, 10, 10, 10]} barSize={10} /></BarChart></ResponsiveContainer></div></div>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm transition-colors"><h3 className="font-black text-lg mb-6 text-gray-900 dark:text-gray-100">{t('totalExpense')}</h3><div className="h-[250px] w-full">{pieData.length > 0 ? (<ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={8} cornerRadius={10} dataKey="value" stroke="none">{pieData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip contentStyle={{ backgroundColor: isDark ? '#1f2937' : '#fff', borderRadius: '15px', border: 'none' }} /></PieChart></ResponsiveContainer>) : (<div className="h-full flex flex-col items-center justify-center opacity-30"><ClipboardList size={40} className="mb-2" /><p className="text-xs font-bold italic">{lang === 'bn' ? 'কোন তথ্য নেই' : 'No data'}</p></div>)}</div></div>
    </div>
  );
}

function NotesView({ t, notes, setNotes, theme }: any) {
  const [activeMonth, setActiveMonth] = useState(new Date().toISOString().substring(0, 7));
  const currentNote = notes.find((n: any) => n.month === activeMonth);
  const accentText = THEME_MAP[theme as ThemeColor].split(' ')[2];
  const handleSave = (text: string) => { 
    if (currentNote) {
      setNotes(notes.map((n: any) => n.month === activeMonth ? { ...n, text } : n));
    } else {
      setNotes([...notes, { id: crypto.randomUUID(), month: activeMonth, text }]);
    }
  };
  return (
    <div className="space-y-6"><div className="flex items-center justify-between px-2"><h3 className="font-black text-xl text-gray-900 dark:text-gray-100">{t('monthlySummary') === 'Monthly Summary' ? 'Notes' : 'নোটস'}</h3><input type="month" value={activeMonth} onChange={e => setActiveMonth(e.target.value)} className={`bg-gray-100 dark:bg-gray-800 p-2.5 rounded-2xl border-none font-bold text-xs ${accentText} outline-none transition-colors dark:text-gray-100 dark:color-scheme-dark`} /></div><textarea className="w-full h-80 p-8 rounded-[3rem] bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 focus:ring-4 focus:ring-opacity-10 outline-none text-sm font-medium leading-loose shadow-sm transition-colors text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600" placeholder={t('save') === 'Save Changes' ? 'Write something important for this month...' : 'এই মাসের জরুরি কিছু লিখে রাখুন...'} value={currentNote?.text || ''} onChange={e => handleSave(e.target.value)} /></div>
  );
}

function SettingsView({ t, lang, settings, onUpdateSettings, onExport, onImport, theme, onShowDevProfile, onManageCategories, onShowUsageGuide }: any) {
  const [notifPermission, setNotifPermission] = useState(Notification.permission);
  const accentClass = THEME_MAP[theme as ThemeColor].split(' ')[0];
  const accentText = THEME_MAP[theme as ThemeColor].split(' ')[2];
  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 p-6 shadow-sm space-y-4 transition-colors"><div className="flex items-center gap-3"><div className={`p-2 rounded-xl bg-gray-50 dark:bg-gray-700 ${accentText}`}><Languages size={20}/></div><h3 className="font-black text-sm text-gray-900 dark:text-gray-100">{t('language')}</h3></div><div className="flex gap-2 p-1 bg-gray-50 dark:bg-gray-900/50 rounded-2xl"><button onClick={() => onUpdateSettings({ language: 'bn' })} className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${settings.language === 'bn' ? `${accentClass} text-white shadow-md` : 'text-gray-400 dark:text-gray-500'}`}>বাংলা</button><button onClick={() => onUpdateSettings({ language: 'en' })} className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${settings.language === 'en' ? `${accentClass} text-white shadow-md` : 'text-gray-400 dark:text-gray-500'}`}>English</button></div></div>
      <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 p-6 shadow-sm space-y-4 transition-colors"><div className="flex items-center gap-3"><div className={`p-2 rounded-xl bg-gray-50 dark:bg-gray-700 ${accentText}`}><Palette size={20}/></div><h3 className="font-black text-sm text-gray-900 dark:text-gray-100">{t('themeColor')}</h3></div><div className="flex flex-wrap gap-4 px-2 items-center">{(['indigo', 'emerald', 'rose', 'amber'] as ThemeColor[]).map(c => (<button key={c} onClick={() => onUpdateSettings({ themeColor: c })} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${THEME_MAP[c].split(' ')[0]} ${settings.themeColor === c ? 'ring-4 ring-offset-4 ring-gray-200 dark:ring-gray-600' : ''}`}>{settings.themeColor === c && <Check className="text-white" size={18}/>}</button>))}<div className="flex items-center gap-3"><button onClick={() => onUpdateSettings({ themeColor: 'custom' })} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all bg-gradient-to-tr from-gray-300 via-gray-100 to-gray-400 dark:from-gray-600 dark:via-gray-700 dark:to-gray-500 border border-gray-300 dark:border-gray-600 ${settings.themeColor === 'custom' ? 'ring-4 ring-offset-4 ring-gray-200 dark:ring-gray-600' : ''}`} style={settings.themeColor === 'custom' ? { backgroundColor: settings.customHex } : {}}>{settings.themeColor === 'custom' ? <Check className="text-white" size={18}/> : <Pipette className="text-gray-500 dark:text-gray-300" size={18}/>}</button>{settings.themeColor === 'custom' && (<div className="flex items-center bg-gray-50 dark:bg-gray-700 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-600 animate-in slide-in-from-left-2"><input type="color" value={settings.customHex || '#6366f1'} onChange={e => onUpdateSettings({ customHex: e.target.value })} className="w-6 h-6 border-none bg-transparent cursor-pointer" /><span className="text-[10px] font-bold ml-2 uppercase dark:text-gray-300">{settings.customHex}</span></div>)}</div></div></div>
      <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 p-6 shadow-sm space-y-6 transition-colors"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="bg-orange-50 dark:bg-orange-900/30 p-2 rounded-xl text-orange-600 dark:text-orange-400"><Bell size={20}/></div><h3 className="font-black text-sm text-gray-900 dark:text-gray-100">{t('reminder')}</h3></div><button onClick={() => onUpdateSettings({ reminderEnabled: !settings.reminderEnabled })} className={`w-12 h-6 rounded-full transition-all relative ${settings.reminderEnabled ? accentClass : 'bg-gray-200 dark:bg-gray-700'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.reminderEnabled ? 'right-1' : 'left-1'}`}></div></button></div>{settings.reminderEnabled && (<div className="space-y-4 animate-in slide-in-from-top duration-300"><div className="flex items-center justify-between bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl"><span className="text-xs font-bold text-gray-500 dark:text-gray-400">{lang === 'bn' ? 'নোটিফিকেশন সময়' : 'Notification Time'}</span><input type="time" value={settings.reminderTime} onChange={e => onUpdateSettings({ reminderTime: e.target.value })} className={`bg-transparent border-none font-bold text-sm outline-none text-gray-900 dark:text-gray-100 dark:color-scheme-dark`} /></div>{notifPermission !== 'granted' && <button onClick={async () => { const res = await Notification.requestPermission(); setNotifPermission(res); }} className="w-full bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 text-[10px] font-black py-3 rounded-2xl border border-orange-200 dark:border-orange-800">{lang === 'bn' ? 'অনুমতি দিন (নোটিফিকেশন পেতে)' : 'Allow Notifications'}</button>}</div>)}</div>
      <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm transition-colors"><button onClick={onManageCategories} className="w-full p-6 flex items-center gap-5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b dark:border-gray-700 text-left"><div className="bg-emerald-50 dark:bg-emerald-900/30 p-3 rounded-2xl text-emerald-600 dark:text-emerald-400"><ListFilter size={20}/></div><div><p className="font-black text-sm text-gray-900 dark:text-gray-100">{t('manageCategories')}</p><p className="text-[10px] text-gray-500 dark:text-gray-400">{lang === 'bn' ? 'আয়-ব্যয় ক্যাটাগরিগুলো পরিচালনা করুন' : 'Manage income & expense categories'}</p></div></button><button onClick={onShowUsageGuide} className="w-full p-6 flex items-center gap-5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b dark:border-gray-700 text-left"><div className="bg-amber-50 dark:bg-amber-900/30 p-3 rounded-2xl text-amber-600 dark:text-amber-400"><BookOpen size={20}/></div><div><p className="font-black text-sm text-gray-900 dark:text-gray-100">{t('usageGuide')}</p><p className="text-[10px] text-gray-500 dark:text-gray-400">{lang === 'bn' ? 'অ্যাপটি কিভাবে ব্যবহার করবেন জানুন' : 'Learn how to use the app'}</p></div></button><button onClick={onExport} className="w-full p-6 flex items-center gap-5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b dark:border-gray-700 text-left"><div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-2xl text-blue-600 dark:text-blue-400"><Download size={20}/></div><div><p className="font-black text-sm text-gray-900 dark:text-gray-100">{t('backup')}</p><p className="text-[10px] text-gray-500 dark:text-gray-400">{lang === 'bn' ? 'তথ্যগুলো JSON ফাইলে সেভ করুন' : 'Save data to JSON file'}</p></div></button><label className="w-full p-6 flex items-center gap-5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer text-left border-b dark:border-gray-700"><div className={`${accentClass.replace('bg-', 'bg-opacity-10 bg-')} p-3 rounded-2xl`}><Upload size={20}/></div><div><p className="font-black text-sm text-gray-900 dark:text-gray-100">{t('restore')}</p><p className="text-[10px] text-gray-500 dark:text-gray-400">{lang === 'bn' ? 'পুরানো ডাটা ফিরিয়ে আনুন' : 'Bring back old data'}</p></div><input type="file" accept=".json" onChange={onImport} className="hidden" /></label><button onClick={onShowDevProfile} className="w-full p-6 flex items-center gap-5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"><div className="bg-violet-50 dark:bg-violet-900/30 p-3 rounded-2xl text-violet-600 dark:text-violet-400"><User size={20}/></div><div><p className="font-black text-sm text-gray-900 dark:text-gray-100">{t('devProfile')}</p><p className="text-[10px] text-gray-500 dark:text-gray-400">{lang === 'bn' ? 'আমার সম্পর্কে জানুন' : 'Know about me'}</p></div></button></div>
      <div className="text-center p-10 opacity-60"><FileText size={40} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" /><p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">{t('appTitle')} v2.5 • {lang === 'bn' ? 'পার্সোনাল এডিশন' : 'Personal Edition'}</p></div>
    </div>
  );
}

function EntryModal({ t, lang, onClose, onSubmit, theme, categories, onUpdateKhata, initialData }: any) {
  const [entryType, setEntryType] = useState<TransactionType | LoanType>(initialData?.type || 'EXPENSE');
  const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
  const [category, setCategory] = useState(initialData?.category || '');
  const [person, setPerson] = useState(initialData?.person || '');
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(initialData?.dueDate || new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState(initialData?.note || initialData?.reason || '');
  const [newCategoryLabel, setNewCategoryLabel] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [error, setError] = useState('');
  
  const accentClass = THEME_MAP[theme as ThemeColor].split(' ')[0];
  const accentText = THEME_MAP[theme as ThemeColor].split(' ')[2];
  
  const filteredCategories = categories.filter((c: any) => c.type === (entryType === 'INCOME' ? 'INCOME' : 'EXPENSE'));

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((entryType === 'INCOME' || entryType === 'EXPENSE') && !category) {
      setError(t('selectCatError'));
      return;
    }
    onSubmit({ entryType, amount: parseFloat(amount), category, person, date, dueDate, note });
  };

  const getLabel = (type: string) => {
    if (type === 'INCOME') return lang === 'bn' ? 'আয়' : 'Income';
    if (type === 'EXPENSE') return lang === 'bn' ? 'ব্যয়' : 'Expense';
    if (type === 'TAKEN') return lang === 'bn' ? 'গ্রহণ' : 'Taken';
    if (type === 'GIVEN') return lang === 'bn' ? 'প্রদান' : 'Given';
    return type;
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white dark:bg-gray-800 w-full max-w-lg rounded-t-[3rem] sm:rounded-[3rem] p-8 shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-400 overflow-y-auto max-h-[90vh] hide-scrollbar">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black text-gray-900 dark:text-white">{initialData ? t('editEntry') : t('addEntry')}</h2>
          <button onClick={onClose} className="p-2 rounded-2xl bg-gray-100 dark:bg-gray-700 text-gray-400"><X size={20} /></button>
        </div>
        
        <div className="flex gap-2 p-1 bg-gray-50 dark:bg-gray-900/50 rounded-2xl mb-8 overflow-hidden">
          {['INCOME', 'EXPENSE', 'TAKEN', 'GIVEN'].map((type) => (
            <button 
              key={type} 
              type="button"
              onClick={() => { setEntryType(type as any); setCategory(''); setError(''); }} 
              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-tight rounded-xl transition-all truncate px-1 ${entryType === type ? `${accentClass} text-white shadow-md` : 'text-gray-400 dark:text-gray-500'}`}
            >
              {getLabel(type)}
            </button>
          ))}
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-4">{lang === 'bn' ? 'টাকার পরিমাণ (৳)' : 'Amount (৳)'}</label>
            <input type="number" step="any" required autoFocus value={amount} onChange={e => setAmount(e.target.value)} className="w-full p-6 bg-gray-50 dark:bg-gray-700 rounded-3xl border-none outline-none font-black text-2xl text-gray-900 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600 focus:ring-4 focus:ring-opacity-10 transition-all" placeholder="0.00" />
          </div>

          {(entryType === 'INCOME' || entryType === 'EXPENSE') ? (
            <div className="space-y-2">
              <div className="flex justify-between items-center ml-4 mr-2">
                <label className={`text-[10px] font-black uppercase ${error ? 'text-rose-500' : 'text-gray-400'}`}>{t('category')} {error && `(${error})`}</label>
                <button type="button" onClick={() => setShowAddCategory(!showAddCategory)} className={`text-[10px] font-black uppercase tracking-tighter ${accentText}`}>
                  {showAddCategory ? t('close') : '+ নতুন'}
                </button>
              </div>
              {showAddCategory ? (
                <div className="flex gap-2 animate-in slide-in-from-top-2 duration-200">
                  <input type="text" value={newCategoryLabel} onChange={e => setNewCategoryLabel(e.target.value)} className="flex-1 p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl border-none outline-none font-bold text-sm text-gray-900 dark:text-gray-100" placeholder="নতুন নাম" />
                  <button type="button" onClick={() => { if(!newCategoryLabel) return; onUpdateKhata({ categories: [...categories, { id: crypto.randomUUID(), label: newCategoryLabel, type: entryType as TransactionType }] }); setCategory(newCategoryLabel); setNewCategoryLabel(''); setShowAddCategory(false); setError(''); }} className={`p-4 ${accentClass} text-white rounded-2xl shadow-lg active:scale-95`}>
                    <Check size={20} />
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {filteredCategories.map((cat: any) => (
                    <button key={cat.id} type="button" onClick={() => { setCategory(cat.label); setError(''); }} className={`p-4 rounded-2xl text-[10px] font-bold transition-all border truncate ${category === cat.label ? `${accentClass} text-white border-transparent shadow-lg` : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-100 dark:border-gray-700'}`}>
                      {cat.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-4">{lang === 'bn' ? 'ব্যক্তির নাম' : 'Person Name'}</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input type="text" required value={person} onChange={e => setPerson(e.target.value)} className="w-full p-4 pl-12 bg-gray-50 dark:bg-gray-700 rounded-3xl border-none outline-none font-bold text-sm text-gray-900 dark:text-gray-100" placeholder="নাম লিখুন" />
              </div>
            </div>
          )}

          <div className={`grid ${entryType === 'TAKEN' || entryType === 'GIVEN' ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-4">{t('startDate')}</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="w-full p-4 pl-12 bg-gray-50 dark:bg-gray-700 rounded-3xl border-none outline-none font-bold text-xs text-gray-900 dark:text-gray-100 dark:color-scheme-dark" />
              </div>
            </div>
            {(entryType === 'TAKEN' || entryType === 'GIVEN') && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-4">{lang === 'bn' ? 'পরিশোধের তারিখ' : 'Due Date'}</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input type="date" required value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full p-4 pl-12 bg-gray-50 dark:bg-gray-700 rounded-3xl border-none outline-none font-bold text-xs text-gray-900 dark:text-gray-100 dark:color-scheme-dark" />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-4">নোট / কারণ</label>
            <div className="relative">
              <FileText className="absolute left-4 top-4 text-gray-400" size={18} />
              <textarea value={note} onChange={e => setNote(e.target.value)} className="w-full p-4 pl-12 bg-gray-50 dark:bg-gray-700 rounded-3xl border-none outline-none font-bold text-sm text-gray-900 dark:text-gray-100 min-h-[100px]" placeholder="বিস্তারিত কিছু লিখুন..." />
            </div>
          </div>

          <button type="submit" className={`w-full ${accentClass} text-white font-black py-6 rounded-3xl shadow-xl shadow-gray-200 dark:shadow-none hover:scale-[1.02] active:scale-95 transition-all text-lg mt-4`}>
            {initialData ? t('update') : 'যোগ করুন'}
          </button>
        </form>
      </div>
    </div>
  );
}

function CategoryManagerModal({ t, lang, onClose, categories, onUpdateCategories, theme }: any) {
  const [type, setType] = useState<TransactionType>('INCOME');
  const [newLabel, setNewLabel] = useState('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  
  const accentClass = THEME_MAP[theme as ThemeColor].split(' ')[0];

  const handleSave = () => {
    if (!newLabel.trim()) return;
    
    if (editingCategory) {
      onUpdateCategories(categories.map((c: any) => c.id === editingCategory.id ? { ...c, label: newLabel } : c));
      setEditingCategory(null);
    } else {
      onUpdateCategories([...categories, { id: crypto.randomUUID(), label: newLabel, type }]);
    }
    setNewLabel('');
  };

  const startEdit = (cat: Category) => {
    setEditingCategory(cat);
    setNewLabel(cat.label);
    setType(cat.type);
  };

  const filtered = categories.filter((c: any) => c.type === type);

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative bg-white dark:bg-gray-800 w-full max-md:max-w-md rounded-[2.5rem] p-6 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black text-gray-900 dark:text-white">{t('manageCategories')}</h2>
          <button onClick={onClose} className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-400"><X size={20} /></button>
        </div>

        <div className="flex gap-2 p-1 bg-gray-50 dark:bg-gray-900/50 rounded-2xl mb-6">
          <button onClick={() => { setType('INCOME'); setEditingCategory(null); setNewLabel(''); }} className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${type === 'INCOME' ? `${accentClass} text-white shadow-md` : 'text-gray-400 dark:text-gray-500'}`}>{t('incomeType')}</button>
          <button onClick={() => { setType('EXPENSE'); setEditingCategory(null); setNewLabel(''); }} className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${type === 'EXPENSE' ? `${accentClass} text-white shadow-md` : 'text-gray-400 dark:text-gray-500'}`}>{t('expenseType')}</button>
        </div>

        <div className="flex gap-2 mb-6">
          <input type="text" value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder={editingCategory ? "সংশোধন করুন" : "নতুন নাম লিখুন"} className="flex-1 p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl border-none outline-none font-bold text-sm text-gray-900 dark:text-gray-100" />
          <button onClick={handleSave} className={`p-4 ${accentClass} text-white rounded-2xl shadow-lg transition-all active:scale-95`}>
            {editingCategory ? <RefreshCcw size={24} /> : <Plus size={24} />}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-2 hide-scrollbar">
          {filtered.map((cat: any) => (
            <div key={cat.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-750 rounded-2xl border border-gray-100 dark:border-gray-700 group transition-all hover:bg-white dark:hover:bg-gray-700">
              <span className="font-bold text-sm text-gray-900 dark:text-gray-100">{cat.label}</span>
              <div className="flex gap-2">
                <button onClick={() => startEdit(cat)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors">
                  <Edit2 size={18} />
                </button>
                <button onClick={() => setCategoryToDelete(cat)} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-colors">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="text-center py-10 opacity-30 italic text-sm">{lang === 'bn' ? 'কোন ক্যাটাগরি নেই' : 'No categories yet'}</div>}
        </div>

        {categoryToDelete && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-white/95 dark:bg-gray-800/95 animate-in fade-in zoom-in-95 rounded-[2.5rem]">
            <div className="text-center">
              <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/30 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-lg font-black mb-2">{t('confirmDelete')}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">ক্যাটাগরি: <span className="font-bold">"{categoryToDelete.label}"</span></p>
              <div className="flex gap-3">
                <button onClick={() => { onUpdateCategories(categories.filter((c: any) => c.id !== categoryToDelete.id)); setCategoryToDelete(null); }} className="flex-1 bg-rose-500 text-white font-bold py-3 rounded-xl shadow-lg">{t('deleteBtn')}</button>
                <button onClick={() => setCategoryToDelete(null)} className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold py-3 rounded-xl">{t('cancelBtn')}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DevProfileModal({ t, onClose, theme }: any) {
  const accentClass = THEME_MAP[theme as ThemeColor].split(' ')[0];
  const accentBorder = theme === 'custom' ? 'border-[var(--theme-color)]' : 
    theme === 'indigo' ? 'border-indigo-600' :
    theme === 'emerald' ? 'border-emerald-600' :
    theme === 'rose' ? 'border-rose-600' : 'border-amber-600';
  
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white dark:bg-gray-800 w-full max-sm:w-[95%] max-w-sm rounded-[3rem] p-8 pt-12 shadow-2xl animate-in zoom-in-95 duration-200 text-center flex flex-col items-center">
        
        <div className={`w-36 h-36 rounded-full mb-6 p-2 border-[4px] ${accentBorder} shadow-lg relative`}>
          <div className="w-full h-full rounded-full bg-pink-100 dark:bg-pink-900/30 overflow-hidden flex items-center justify-center">
            <img 
              src="https://i.postimg.cc/W13RYW8V/20251108-090556.jpg" 
              alt="Developer" 
              className="w-full h-full object-cover scale-110" 
            />
          </div>
        </div>

        <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-4">
          {t('devName')}
        </h2>

        <p className="text-[13px] text-gray-600 dark:text-gray-300 leading-relaxed text-justify px-2 mb-10">
          একজন ওয়েব ও অ্যাপ ডেভেলপার হিসেবে আমি সবসময় চেষ্টা করি প্রযুক্তিকে মানুষের জন্য আরও সহজ, কার্যকর এবং উপভোগ্য করে তুলতে। আমার প্রতিটি প্রজেক্টে ব্যবহারকারীর প্রয়োজন, আকর্ষণীয় ডিজাইন ও সর্বোচ্চ পারফরম্যান্সকে সর্বাধিক গুরুত্ব দিই। নতুন কিছু শেখা, তৈরি করা এবং সেটিকে মানুষের উপকারে কাজে লাগানোই আমার কাজের সবচেয়ে বড় অনুপ্রেরণা।
        </p>

        <div className="flex gap-6 mb-12">
          <a href="mailto:majidul.hasan.shahin@gmail.com" className="p-3 rounded-full bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 transition-transform active:scale-90 shadow-sm border border-gray-100 dark:border-gray-600">
            <Mail size={24} />
          </a>
          <a href="https://facebook.com/majidulhasanshahin" target="_blank" rel="noreferrer" className="p-3 rounded-full bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 transition-transform active:scale-90 shadow-sm border border-gray-100 dark:border-gray-600">
            <Facebook size={24} />
          </a>
          <a href="https://t.me/majidulhasanshahin" target="_blank" rel="noreferrer" className="p-3 rounded-full bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 transition-transform active:scale-90 shadow-sm border border-gray-100 dark:border-gray-600">
            <Send size={24} className="-rotate-12 translate-x-0.5" />
          </a>
        </div>

        <button 
          onClick={onClose} 
          className={`w-full ${accentClass} text-white font-black py-5 rounded-[1.5rem] shadow-xl active:scale-95 transition-all text-lg`}
        >
          {t('close')}
        </button>
      </div>
    </div>
  );
}

function UsageGuideModal({ t, onClose, theme, lang }: any) {
  const accentClass = THEME_MAP[theme as ThemeColor].split(' ')[0];
  const accentText = THEME_MAP[theme as ThemeColor].split(' ')[2];
  
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative bg-white dark:bg-gray-800 w-full max-w-lg rounded-[3rem] shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] overflow-hidden">
        
        <div className="p-8 pb-4 flex justify-between items-center border-b dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-2xl bg-amber-50 dark:bg-amber-900/30 ${accentText}`}>
              <BookOpen size={24} />
            </div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
              {t('usageGuide')}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth hide-scrollbar">
          {lang === 'bn' ? (
            <>
              <section className="space-y-3">
                <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                  <LayoutDashboard className="text-indigo-500" size={20} /> হোম পেজ (Dashboard)
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed text-justify">
                  এখানে আপনার মোট ব্যালেন্স, আজকের আয় ও ব্যয় এবং পাওনা ও দেনার একটি সংক্ষিপ্ত চিত্র দেখতে পাবেন। নিচের প্লাস (+) বাটনে ক্লিক করে দ্রুত নতুন হিসাব যোগ করা যায়।
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                  <History className="text-emerald-500" size={20} /> হিসাব তালিকা (History)
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed text-justify">
                  আপনার করা সকল এন্ট্রি এখানে তারিখ অনুযায়ী সাজানো থাকে। আপনি ফিল্টার ব্যবহার করে শুধুমাত্র আয়, ব্যয় বা লেনদেনের তালিকা আলাদাভাবে দেখতে পারবেন। প্রতিটি এন্ট্রি এডিট বা ডিলিট করার সুবিধাও আছে।
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                  <HandCoins className="text-orange-500" size={20} /> লেনদেন ও ঋণ (Loans)
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed text-justify">
                  কাউকে ধার দিলে বা কারো থেকে ধার নিলে তা 'লেনদেন' হিসেবে যোগ করুন। আপনি চাইলে কিস্তিতে বা আংশিক পেমেন্ট যোগ করতে পারেন। পাওনা টাকা পুরোপুরি আদায় হয়ে গেলে বা ধার পরিশোধ হয়ে গেলে 'Mark Settle' বাটনে ক্লিক করে তা সম্পন্ন হিসেবে চিহ্নিত করতে পারেন।
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                  <FileText className="text-blue-500" size={20} /> মাসিক নোট (Monthly Notes)
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed text-justify">
                  আপনার প্রতিটি মাসের জন্য আলাদা আলাদা নোট বুক বা ডায়েরি অপশন রয়েছে। এখানে জরুরি কোনো তথ্য বা হিসাব লিখে রাখতে পারেন যা অটোমেটিক সেভ হয়ে যাবে।
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                  <ChartIcon className="text-rose-500" size={20} /> রিপোর্ট ও চার্ট (Reports)
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed text-justify">
                  আপনার অর্থনৈতিক অবস্থা গ্রাফ এবং পাই-চার্টের মাধ্যমে বিশ্লেষণ করতে পারবেন। কোন ক্যাটাগরিতে কত ব্যয় হচ্ছে তা এখান থেকে সহজেই বোঝা যায়।
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                  <SettingsIcon className="text-gray-500" size={20} /> সেটিং ও ব্যাকআপ (Settings)
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed text-justify">
                  এখান থেকে অ্যাপের ভাষা, থিম কালার এবং ডার্ক মোড পরিবর্তন করা যায়। আপনার গুরুত্বপূর্ণ ডাটা নিরাপদ রাখতে নিয়মিত 'ব্যাকআপ ডাউনলোড' করে রাখুন এবং প্রয়োজনে 'ব্যাকআপ রিস্টোর' ব্যবহার করে ডাটা ফিরিয়ে আনুন।
                </p>
              </section>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800">
                <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400 italic text-center">
                  * এই অ্যাপটি সম্পূর্ণ অফলাইন, তাই আপনার ডাটা শুধুমাত্র আপনার ফোনেই সংরক্ষিত থাকে। ডাটা ডিলিট হওয়ার হাত থেকে বাঁচতে নিয়মিত ব্যাকআপ নিন।
                </p>
              </div>
            </>
          ) : (
            <>
              <section className="space-y-3">
                <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                  <LayoutDashboard className="text-indigo-500" size={20} /> Dashboard
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed text-justify">
                  View your net balance, daily income/expense, and loan summary here. Click the (+) button to add new entries quickly.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                  <History className="text-emerald-500" size={20} /> History
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed text-justify">
                  All transactions are listed chronologically. Use filters to view income, expense, or loans separately. You can edit or delete any entry here.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                  <HandCoins className="text-orange-500" size={20} /> Loans & Dealings
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed text-justify">
                  Track money you've borrowed or lent. You can add partial payments to any loan. Once settled, mark it as 'Settle' to move it from your pending list.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                  <FileText className="text-blue-500" size={20} /> Monthly Notes
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed text-justify">
                  A personal digital diary for each month. Keep track of important reminders or custom notes here.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                  <ChartIcon className="text-rose-500" size={20} /> Reports
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed text-justify">
                  Visualize your financial data with bar charts and pie charts. Analyze category-wise spending habits easily.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                  <SettingsIcon className="text-gray-500" size={20} /> Backup & Settings
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed text-justify">
                  Customize theme colors, language, and dark mode. Use 'Download Backup' to save your data locally and 'Restore Backup' to bring it back if needed.
                </p>
              </section>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800">
                <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400 italic text-center">
                  * This app is 100% offline. Your data stays on your device. Always keep regular backups to prevent data loss.
                </p>
              </div>
            </>
          )}
        </div>

        <div className="p-8 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button 
            onClick={onClose} 
            className={`w-full ${accentClass} text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-all text-lg`}
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
}

function PaymentModal({ t, lang, loan, payment, onClose, onSubmit, theme }: any) {
  const [amount, setAmount] = useState(payment?.amount?.toString() || '');
  const [date, setDate] = useState(payment?.date || new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState(payment?.note || '');
  const accentClass = THEME_MAP[theme as ThemeColor].split(' ')[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    onSubmit({ amount: parseFloat(amount), date, note });
  };

  const totalPaid = loan.payments?.reduce((s: number, p: any) => s + p.amount, 0) || 0;
  const alreadyPaidExcludingThis = payment ? totalPaid - payment.amount : totalPaid;
  const remaining = Math.max(0, loan.amount - alreadyPaidExcludingThis);

  return (
    <div className="fixed inset-0 z-[160] flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white dark:bg-gray-800 w-full max-w-lg rounded-t-[3rem] sm:rounded-[3rem] p-8 shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-400">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black text-gray-900 dark:text-white">{payment ? t('editPayment') : t('addPayment')}</h2>
          <button onClick={onClose} className="p-2 rounded-2xl bg-gray-100 dark:bg-gray-700 text-gray-400"><X size={20} /></button>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl mb-6 flex justify-between items-center">
            <div><p className="text-[10px] font-black text-gray-400 uppercase">{t('remaining')}</p><p className="text-lg font-black text-rose-500">৳ {remaining.toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-US')}</p></div>
            <div className="text-right"><p className="text-[10px] font-black text-gray-400 uppercase">{loan.person}</p><p className="text-xs font-bold text-gray-600 dark:text-gray-300 truncate max-w-[150px]">{loan.reason || '-'}</p></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-4">{lang === 'bn' ? 'টাকার পরিমাণ (৳)' : 'Amount (৳)'}</label>
            <input type="number" step="any" max={remaining} required autoFocus value={amount} onChange={e => setAmount(e.target.value)} className="w-full p-6 bg-gray-50 dark:bg-gray-700 rounded-3xl border-none outline-none font-black text-2xl text-gray-900 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600 focus:ring-4 focus:ring-opacity-10 transition-all" placeholder="0.00" />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-4">{t('dateLabel')}</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="w-full p-4 pl-12 bg-gray-50 dark:bg-gray-700 rounded-3xl border-none outline-none font-bold text-xs text-gray-900 dark:text-gray-100 dark:color-scheme-dark" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-4">{lang === 'bn' ? 'নোট' : 'Note'}</label>
            <div className="relative">
              <StickyNote className="absolute left-4 top-4 text-gray-400" size={18} />
              <textarea value={note} onChange={e => setNote(e.target.value)} className="w-full p-4 pl-12 bg-gray-50 dark:bg-gray-700 rounded-3xl border-none outline-none font-bold text-sm text-gray-900 dark:text-gray-100 min-h-[80px]" placeholder="..." />
            </div>
          </div>

          <button type="submit" className={`w-full ${accentClass} text-white font-black py-6 rounded-3xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-lg`}>
            {t('save')}
          </button>
        </form>
      </div>
    </div>
  );
}

function DeleteConfirmModal({ t, onClose, onConfirm }: any) {
  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-6 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative bg-white dark:bg-gray-800 w-full max-sm:w-[95%] max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200 text-center">
        <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/30 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <Trash2 size={40} />
        </div>
        <h3 className="text-2xl font-black mb-2 text-gray-900 dark:text-white">{t('confirmDelete')}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
          {t('deleteWarn')}
        </p>
        <div className="flex flex-col gap-3">
          <button onClick={onConfirm} className="w-full bg-rose-500 text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-all text-lg">{t('deleteBtn')}</button>
          <button onClick={onClose} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold py-4 rounded-2xl active:scale-95 transition-all">{t('cancelBtn')}</button>
        </div>
      </div>
    </div>
  );
}

function SettleConfirmModal({ t, lang, loan, onClose, onConfirm }: any) {
  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-6 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative bg-white dark:bg-gray-800 w-full max-sm:w-[95%] max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200 text-center">
        <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} />
        </div>
        <h3 className="text-2xl font-black mb-2 text-gray-900 dark:text-white">{t('confirmSettle')}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
          {t('settleWarn')}
        </p>
        <div className="flex flex-col gap-3">
          <button onClick={onConfirm} className="w-full bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-all text-lg">{t('yesSettle')}</button>
          <button onClick={onClose} className="w-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold py-4 rounded-2xl active:scale-95 transition-all">{t('cancelBtn')}</button>
        </div>
      </div>
    </div>
  );
}
