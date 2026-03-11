// FIX: Add GoogleGenAI import for AI summary generation
import { GoogleGenAI } from '@google/genai';
// FIX: Add MasterReportData to type imports
import { User, UserRole, ExpenseRequest, RequestStatus, BoardSession, Currency, Priority, BankAccount, RevenueCategory, ExpenseFund, FundBalance, DebtRecord, CashInflowRecord, MasterReportData, ProjectRevenue, ServiceRevenue, PartRevenue, DirectiveSnapshot, Invoice, InvoiceStatus } from '../types';
import { formatNumber } from '../utils/formatters';
import { supabase } from '../lib/supabase';

let channel: any = null;

// --- GLOBAL STATE VARIABLES ---
export let USERS: Record<string, User> = {};
export let REQUESTS: ExpenseRequest[] = [];
export let BOARD_SESSIONS: BoardSession[] = [];
export let HIDDEN_FUNDS: Record<string, boolean> = {};
export let DISPATCHED_DIRECTIVES: DirectiveSnapshot[] = [];
export let INVOICES: Invoice[] = [];
export let CURRENT_WEEK_CASH_INFLOW: CashInflowRecord[] = [];
export let ARCHIVED_CASH_INFLOW: Record<string, CashInflowRecord[]> = {};
export let DEBTORS: DebtRecord[] = [];
export let CREDITORS: DebtRecord[] = [];
export let BANK_ACCOUNTS: BankAccount[] = [];
export let REVENUE_CATEGORIES: RevenueCategory[] = [];
export let MOCK_RATES = { USD: 2.70, EUR: 2.90 };
export let MOCK_INFLATION_RATE = 3.2;
export let ANNUAL_BUDGETS: Record<number, Record<string, number>> = {};
export let CURRENT_YEAR_ACTUALS: Record<string, number[]> = {};
export let BUDGET_ANALYSIS_COMMENTS: Record<string, string> = {};
export let MOCK_PROJECTS: ProjectRevenue[] = [];
export let MOCK_SERVICES: ServiceRevenue[] = [];
export let MOCK_PARTS: PartRevenue[] = [];


import { useState, useEffect } from 'react';

export const useSync = () => {
  const [syncTrigger, setSyncTrigger] = useState(0);
  useEffect(() => {
    const handleSync = () => setSyncTrigger(prev => prev + 1);
    window.addEventListener('finboard_sync', handleSync);
    return () => window.removeEventListener('finboard_sync', handleSync);
  }, []);
  return syncTrigger;
};

// Mock Users Structure
USERS = {
  // --- TOP LEVEL ---
  'u_founder': { 
    id: 'u_founder', 
    name: 'Alexander (Founder)', 
    email: 'founder@elevators.ge', 
    role: UserRole.FOUNDER, 
    department: 'Board', 
    managerId: undefined,
    password: '123'
  },
  'u_ceo': { 
    id: 'u_ceo', 
    name: 'Levan (CEO)', 
    email: 'ceo@elevators.ge', 
    role: UserRole.CEO, 
    department: 'Executive', 
    managerId: 'u_founder',
    password: '123'
  },
  'u_fin': { 
    id: 'u_fin', 
    name: 'Giorgi Turmanidze (Fin Director)', 
    email: 'giorgi.turman@gmail.com', 
    role: UserRole.FIN_DIRECTOR, 
    department: 'Finance', 
    managerId: 'u_ceo',
    password: '111979'
  },

  // --- ACCOUNTING ---
  'u_accountant': {
    id: 'u_accountant', 
    name: 'Natia (Chief Accountant)', 
    email: 'accountant@elevators.ge', 
    role: UserRole.ACCOUNTANT, 
    department: 'Finance', 
    managerId: 'u_fin',
    password: '123'
  },
  'u_sub_accountant': {
    id: 'u_sub_accountant',
    name: 'Ana (Accountant)',
    email: 'sub_accountant@elevators.ge',
    role: UserRole.SUB_ACCOUNTANT,
    department: 'Finance',
    managerId: 'u_accountant',
    password: '123'
  },

  // --- MIDDLE LEVEL ---
  'u_comm_dir': { 
    id: 'u_comm_dir', 
    name: 'Nino (Commercial Dir)', 
    email: 'comm@elevators.ge', 
    role: UserRole.COMMERCIAL_DIRECTOR, 
    department: 'Commercial', 
    managerId: 'u_ceo',
    password: '123'
  },
  'u_tech_dir': { 
    id: 'u_tech_dir', 
    name: 'Vakho (Tech Director)', 
    email: 'tech@elevators.ge', 
    role: UserRole.TECH_DIRECTOR, 
    department: 'Technical', 
    managerId: 'u_ceo',
    password: '123'
  },
  'u_admin_mgr': { 
    id: 'u_admin_mgr', 
    name: 'Mariam (Admin Manager)', 
    email: 'admin@elevators.ge', 
    role: UserRole.ADMIN, 
    department: 'Administration', 
    managerId: 'u_ceo',
    password: '123'
  },
  'u_parts_mgr': {
    id: 'u_parts_mgr',
    name: 'Gia (Parts Manager)',
    email: 'parts@elevators.ge',
    role: UserRole.PARTS_MANAGER,
    department: 'Procurement & Parts',
    managerId: 'u_tech_dir',
    password: '123'
  }
};



try {
    const storedUsers = localStorage.getItem('finboard_users');
    if (storedUsers) {
        const parsed = JSON.parse(storedUsers);
        for (const key in USERS) delete USERS[key];
        Object.assign(USERS, parsed);
    }
} catch(e) {
    console.error("Failed to load users from local storage", e);
}
REQUESTS = [];
try {
    const storedReqs = localStorage.getItem('finboard_requests');
    if (storedReqs) REQUESTS = JSON.parse(storedReqs);
} catch(e) {}
function safeEmit(event: string, data: any) {
  if (channel && event === 'update_state') {
    channel.send({
      type: 'broadcast',
      event: 'update_state',
      payload: data
    }).catch((err: any) => console.warn('Supabase broadcast error:', err));
  }
}

const syncRequests = () => {
    localStorage.setItem('finboard_requests', JSON.stringify(REQUESTS));
    safeEmit('update_state', { key: 'requests', value: REQUESTS });
};

export const resetDatabase = async () => {
  // Clear local arrays
  REQUESTS = [];
  BOARD_SESSIONS = [];
  DISPATCHED_DIRECTIVES = [];
  CURRENT_WEEK_CASH_INFLOW = [];
  ARCHIVED_CASH_INFLOW = {};
  MOCK_PROJECTS = [];
  MOCK_SERVICES = [];
  MOCK_PARTS = [];
  INVOICES = [];
  CURRENT_YEAR_ACTUALS = {};
  DEBTORS = [];
  CREDITORS = [];
  BANK_ACCOUNTS = [
    { id: 'ba_1', accountName: 'Main Operational', bankName: 'TBC Bank', iban: 'GE00TB110000000000001', currency: Currency.GEL, currentBalance: 0, lastSync: new Date().toISOString(), mappedCategoryId: 'rev_service', isAutoSync: true },
    { id: 'ba_2', accountName: 'USD Reserve', bankName: 'Bank of Georgia', iban: 'GE00BG220000000000002', currency: Currency.USD, currentBalance: 0, lastSync: new Date().toISOString(), mappedCategoryId: 'rev_projects', isAutoSync: true },
    { id: 'ba_3', accountName: 'Unmapped Incoming', bankName: 'Liberty Bank', iban: 'GE00LB330000000000003', currency: Currency.GEL, currentBalance: 0, lastSync: new Date().toISOString(), isAutoSync: true },
    { id: 'ba_4', accountName: 'Petty Cash', bankName: 'Salaro', iban: 'CASH', currency: Currency.GEL, currentBalance: 0, lastSync: new Date().toISOString(), isAutoSync: false }
  ];
  REVENUE_CATEGORIES = [
    { id: 'rev_projects', name: 'პროექტები', description: 'ახალი ლიფტების მონტაჟი', plannedAmount: 50000, actualAmount: 0 },
    { id: 'rev_service', name: 'სერვისი', description: 'ყოველთვიური მომსახურება', plannedAmount: 30000, actualAmount: 0 },
    { id: 'rev_parts', name: 'ნაწილები', description: 'სათადარიგო ნაწილების რეალიზაცია', plannedAmount: 15000, actualAmount: 0 },
    { id: 'rev_other', name: 'სხვა', description: 'სხვა შემოსავლები', plannedAmount: 5000, actualAmount: 0 },
  ];

  // Clear local storage
  const keysToClear = [
    'finboard_requests',
    'finboard_board_sessions',
    'finboard_directives',
    'finboard_cw_inflow',
    'finboard_archived_inflow',
    'finboard_projects',
    'finboard_services',
    'finboard_parts',
    'finboard_invoices',
    'finboard_current_year_actuals',
    'finboard_debtors',
    'finboard_creditors',
    'finboard_bank_accounts',
    'finboard_revenue_categories'
  ];
  keysToClear.forEach(key => localStorage.removeItem(key));

  // Broadcast empty states to other clients
  safeEmit('update_state', { key: 'requests', value: REQUESTS });
  safeEmit('update_state', { key: 'boardSessions', value: BOARD_SESSIONS });
  safeEmit('update_state', { key: 'dispatchedDirectives', value: DISPATCHED_DIRECTIVES });
  safeEmit('update_state', { key: 'cwInflow', value: CURRENT_WEEK_CASH_INFLOW });
  safeEmit('update_state', { key: 'archivedInflow', value: ARCHIVED_CASH_INFLOW });
  safeEmit('update_state', { key: 'projects', value: MOCK_PROJECTS });
  safeEmit('update_state', { key: 'services', value: MOCK_SERVICES });
  safeEmit('update_state', { key: 'parts', value: MOCK_PARTS });
  safeEmit('update_state', { key: 'invoices', value: INVOICES });
  safeEmit('update_state', { key: 'currentYearActuals', value: CURRENT_YEAR_ACTUALS });
  safeEmit('update_state', { key: 'debtors', value: DEBTORS });
  safeEmit('update_state', { key: 'creditors', value: CREDITORS });
  safeEmit('update_state', { key: 'bankAccounts', value: BANK_ACCOUNTS });
  safeEmit('update_state', { key: 'revenueCategories', value: REVENUE_CATEGORIES });

  // Try to clear Supabase requests table as well
  try {
    await supabase.from('expenditure_requests').delete().neq('id', '0');
  } catch (err) {
    console.warn('Could not clear Supabase table:', err);
  }

  window.dispatchEvent(new Event('finboard_sync'));
};

// TEMPORARY RESET
const RESET_VERSION = 'v4_production_clean';
if (localStorage.getItem('finboard_reset_version') !== RESET_VERSION) {
  resetDatabase().then(() => {
    localStorage.setItem('finboard_reset_version', RESET_VERSION);
    console.log('Database initialized for production (clean).');
  });
}

export const fetchRequestsFromSupabase = async () => {
  try {
    const { data, error } = await supabase
      .from('expenditure_requests')
      .select('*');
    
    if (error) {
      console.warn('Supabase fetch error (might be missing table or RLS):', error.message);
      return;
    }
    
    if (data && data.length > 0) {
      const mappedData: ExpenseRequest[] = data.map(item => ({
        id: item.id?.toString() || `db_${Math.random().toString(36).substr(2, 9)}`,
        userId: item.user_id || 'u_unknown',
        requesterName: item.user_name || 'Unknown',
        department: item.department || 'N/A',
        managerId: item.manager_id || 'u_ceo',
        date: item.date || (item.created_at ? item.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
        category: item.category || 'Other',
        itemName: item.item_name || 'N/A',
        quantity: item.quantity || 1,
        unitPrice: item.unit_price || 0,
        currency: (item.currency as Currency) || Currency.GEL,
        totalAmount: item.amount || 0,
        description: item.description || '',
        revenuePotential: item.revenue_potential || '',
        priority: (item.priority as Priority) || Priority.MEDIUM,
        alternativesChecked: true,
        selectedOptionReason: item.selection_reason || '',
        status: (item.status as RequestStatus) || RequestStatus.WAITING_DEPT_APPROVAL,
        createdAt: item.created_at || new Date().toISOString(),
        boardDate: item.board_date || item.created_at || new Date().toISOString(),
      }));

      // Merge logic: prefer local if IDs clash, or just append new ones
      const existingIds = new Set(REQUESTS.map(r => r.id));
      const newItems = mappedData.filter(r => !existingIds.has(r.id));
      
      if (newItems.length > 0) {
        REQUESTS = [...REQUESTS, ...newItems];
        syncRequests();
      }
    }
  } catch (err) {
    console.warn('Critical error fetching from Supabase:', err);
  }
};

// Initial fetch
fetchRequestsFromSupabase();

BOARD_SESSIONS = [];
HIDDEN_FUNDS = {};
DISPATCHED_DIRECTIVES = [];

// === BOARD SESSION SYNC ===
const syncBoardSessions = () => {
    localStorage.setItem('finboard_board_sessions', JSON.stringify(BOARD_SESSIONS));
    safeEmit('update_state', { key: 'boardSessions', value: BOARD_SESSIONS });
};

try {
    const sBoardSessions = localStorage.getItem('finboard_board_sessions');
    if (sBoardSessions) BOARD_SESSIONS = JSON.parse(sBoardSessions);
    
    const sHiddenFunds = localStorage.getItem('finboard_hidden_funds');
    if (sHiddenFunds) HIDDEN_FUNDS = JSON.parse(sHiddenFunds);
    
    const sDirectives = localStorage.getItem('finboard_directives');
    if (sDirectives) DISPATCHED_DIRECTIVES = JSON.parse(sDirectives);
} catch(e) {}

// NEW: Invoice Storage (Persisted)
INVOICES = [];
try {
    const storedInv = localStorage.getItem('finboard_invoices');
    if (storedInv) INVOICES = JSON.parse(storedInv);
} catch(e) {}
const syncInvoices = () => {
    localStorage.setItem('finboard_invoices', JSON.stringify(INVOICES));
    safeEmit('update_state', { key: 'invoices', value: INVOICES });
};

const syncDirectives = () => {
    localStorage.setItem('finboard_directives', JSON.stringify(DISPATCHED_DIRECTIVES));
    safeEmit('update_state', { key: 'dispatchedDirectives', value: DISPATCHED_DIRECTIVES });
};


export const getHiddenFunds = async (): Promise<Record<string, boolean>> => {
  return { ...HIDDEN_FUNDS };
};
export const toggleFundVisibility = async (fundId: string): Promise<void> => {
  HIDDEN_FUNDS[fundId] = !HIDDEN_FUNDS[fundId];
  safeEmit('update_state', { key: 'hiddenFunds', value: HIDDEN_FUNDS });
};
export const toggleSectionVisibility = async (category: string): Promise<void> => {
  const fundsInCategory = EXPENSE_FUNDS.filter(f => f.category === category);
  const areAllHidden = fundsInCategory.every(f => HIDDEN_FUNDS[f.id]);
  fundsInCategory.forEach(f => {
    HIDDEN_FUNDS[f.id] = !areAllHidden;
  });
  safeEmit('update_state', { key: 'hiddenFunds', value: HIDDEN_FUNDS });
};


// --- CASH INFLOW DATA (Persisted) ---
const getWeekKey = (date: Date): string => {
  const d = new Date(date);
  const day = d.getDay(); const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const weekStart = new Date(d); weekStart.setDate(diff); weekStart.setHours(0, 0, 0, 0);
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const pastDaysOfYear = (weekStart.getTime() - startOfYear.getTime()) / 86400000;
  const weekNumber = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
  return `${d.getFullYear()} - კვირა ${weekNumber}`;
};

CURRENT_WEEK_CASH_INFLOW = [];
ARCHIVED_CASH_INFLOW = {};

try {
    const storedCW = localStorage.getItem('finboard_cw_inflow');
    if (storedCW) CURRENT_WEEK_CASH_INFLOW = JSON.parse(storedCW);
    const storedArch = localStorage.getItem('finboard_archived_inflow');
    if (storedArch) ARCHIVED_CASH_INFLOW = JSON.parse(storedArch);
} catch(e) {}

const syncCashInflow = () => {
    localStorage.setItem('finboard_cw_inflow', JSON.stringify(CURRENT_WEEK_CASH_INFLOW));
    localStorage.setItem('finboard_archived_inflow', JSON.stringify(ARCHIVED_CASH_INFLOW));
    safeEmit('update_state', { key: 'cwInflow', value: CURRENT_WEEK_CASH_INFLOW });
    safeEmit('update_state', { key: 'archivedInflow', value: ARCHIVED_CASH_INFLOW });
};

// --- DEBT/CREDIT DATA (Persisted) ---
DEBTORS = [];
CREDITORS = [];

try {
    const sDebtors = localStorage.getItem('finboard_debtors');
    if (sDebtors) DEBTORS = JSON.parse(sDebtors);
    const sCreditors = localStorage.getItem('finboard_creditors');
    if (sCreditors) CREDITORS = JSON.parse(sCreditors);
} catch(e) {}

const syncDebts = () => {
    localStorage.setItem('finboard_debtors', JSON.stringify(DEBTORS));
    localStorage.setItem('finboard_creditors', JSON.stringify(CREDITORS));
    safeEmit('update_state', { key: 'debtors', value: DEBTORS });
    safeEmit('update_state', { key: 'creditors', value: CREDITORS });
}

// --- BANKING DATA ---
BANK_ACCOUNTS = [
  { id: 'ba_1', accountName: 'Main Operational', bankName: 'TBC Bank', iban: 'GE00TB110000000000001', currency: Currency.GEL, currentBalance: 0, lastSync: new Date().toISOString(), mappedCategoryId: 'rev_service', isAutoSync: true },
  { id: 'ba_2', accountName: 'USD Reserve', bankName: 'Bank of Georgia', iban: 'GE00BG220000000000002', currency: Currency.USD, currentBalance: 0, lastSync: new Date().toISOString(), mappedCategoryId: 'rev_projects', isAutoSync: true },
  { id: 'ba_3', accountName: 'Unmapped Incoming', bankName: 'Liberty Bank', iban: 'GE00LB330000000000003', currency: Currency.GEL, currentBalance: 0, lastSync: new Date().toISOString(), isAutoSync: true },
  { id: 'ba_4', accountName: 'Petty Cash', bankName: 'Salaro', iban: 'CASH', currency: Currency.GEL, currentBalance: 0, lastSync: new Date().toISOString(), isAutoSync: false }
];

REVENUE_CATEGORIES = [
  { id: 'rev_projects', name: 'პროექტები', description: 'ახალი ლიფტების მონტაჟი', plannedAmount: 50000, actualAmount: 0 },
  { id: 'rev_service', name: 'სერვისი', description: 'ყოველთვიური მომსახურება', plannedAmount: 30000, actualAmount: 0 },
  { id: 'rev_parts', name: 'ნაწილები', description: 'სათადარიგო ნაწილების რეალიზაცია', plannedAmount: 15000, actualAmount: 0 },
  { id: 'rev_other', name: 'სხვა', description: 'სხვა შემოსავლები', plannedAmount: 5000, actualAmount: 0 },
];

try {
    const sBankAccounts = localStorage.getItem('finboard_bank_accounts');
    if (sBankAccounts) BANK_ACCOUNTS = JSON.parse(sBankAccounts);
    
    const sRevenueCategories = localStorage.getItem('finboard_revenue_categories');
    if (sRevenueCategories) REVENUE_CATEGORIES = JSON.parse(sRevenueCategories);
} catch(e) {}

// --- CURRENCY RATES (PROMPT 6.2-009) ---
MOCK_RATES = { USD: 2.70, EUR: 2.90 };
try {
    const sMockRates = localStorage.getItem('finboard_mock_rates');
    if (sMockRates) MOCK_RATES = JSON.parse(sMockRates);
} catch(e) {}

export const getCurrencyRates = async () => ({ ...MOCK_RATES });
export const updateCurrencyRates = async (newRates: { USD: number; EUR: number }) => { 
  MOCK_RATES = { ...newRates }; 
  localStorage.setItem('finboard_mock_rates', JSON.stringify(MOCK_RATES));
  safeEmit('update_state', { key: 'mockRates', value: MOCK_RATES });
};

// PROMPT 6.3-015: Inflation Rate
MOCK_INFLATION_RATE = 3.2;
try {
    const sMockInflation = localStorage.getItem('finboard_mock_inflation');
    if (sMockInflation) MOCK_INFLATION_RATE = JSON.parse(sMockInflation);
} catch(e) {}

export const getInflationRate = async () => MOCK_INFLATION_RATE;
export const updateInflationRate = async (newRate: number) => { 
  MOCK_INFLATION_RATE = newRate; 
  localStorage.setItem('finboard_mock_inflation', JSON.stringify(MOCK_INFLATION_RATE));
  safeEmit('update_state', { key: 'mockInflation', value: MOCK_INFLATION_RATE });
};


// PROMPT 7.2-001: GLOBAL 4-SECTION FUND MODEL
export const EXPENSE_FUNDS: ExpenseFund[] = [
  // SECTION A: პირდაპირი ხარჯის ფონდები
  { id: 'fund_direct_project', name: 'პროექტის პირდაპირი ხარჯი', description: 'Direct Project Costs', category: 'Direct' },
  { id: 'fund_direct_service', name: 'სერვისის პირდაპირი ხარჯი', description: 'Direct Service Costs', category: 'Direct' },
  { id: 'fund_direct_parts', name: 'ნაწილები პირდაპირი ხარჯი', description: 'Direct Parts Costs', category: 'Direct' },
  
  // SECTION B: მარჟინალური ხარჯების ფონდები
  { id: 'fund_marginal_salary_admin', name: 'სახელფასო ფონდი - ადმინისტრაცია', description: 'Salary Admin', category: 'Marginal' },
  { id: 'fund_marginal_salary_comm', name: 'სახელფასო ფონდი - კომერცია', description: 'Salary Commercial', category: 'Marginal' },
  { id: 'fund_marginal_salary_service', name: 'სახელფასო ფონდი - სერვისი', description: 'Salary Service', category: 'Marginal' },
  { id: 'fund_marginal_tax', name: 'სხვა საგადასახადო ვალდებულებები', description: 'Other Tax Liabilities', category: 'Marginal' },
  { id: 'fund_marginal_fixed', name: 'ყოველთვიური ფიქსირებული', description: 'Monthly Fixed Costs', category: 'Marginal' },
  { id: 'fund_marginal_fleet', name: 'ავტომობილების მოვლის და საწვავის', description: 'Fleet & Fuel', category: 'Marginal' },
  { id: 'fund_marginal_consumables', name: 'სწრაფცვეთადი მასალები', description: 'Consumables', category: 'Marginal' },

  // SECTION C: კორექტირებადი ხარჯების ფონდები
  { id: 'fund_adj_bonus_admin', name: 'საბონუსე - ადმინისტრაცია', description: 'Admin Bonuses', category: 'Adjustable' },
  { id: 'fund_adj_bonus_comm', name: 'საბონუსე - კომერცია', description: 'Commercial Bonuses', category: 'Adjustable' },
  { id: 'fund_adj_bonus_service', name: 'საბონუსე - სერვისი', description: 'Service Bonuses', category: 'Adjustable' },
  { id: 'fund_adj_office', name: 'საოფისე და ადმინისტრაციული', description: 'Office & Admin', category: 'Adjustable' },
  { id: 'fund_adj_marketing', name: 'რეკლამა და მარკეტინგის ფონდი', description: 'Ads & Marketing', category: 'Adjustable' },
  { id: 'fund_adj_assets', name: 'ძირითადი საშუალებების', description: 'Fixed Assets', category: 'Adjustable' },
  { id: 'fund_adj_rep', name: 'წარმომადგენლობითი', description: 'Representation', category: 'Adjustable' },
  { id: 'fund_adj_other', name: 'სხვა ხარჯები', description: 'Other Expenses', category: 'Adjustable' },

  // SECTION D: განსაკუთრებული ფონდები
  { id: 'fund_special_reserve', name: 'სარეზერვო ფონდი', description: 'Reserve Fund', category: 'Special' },
  { id: 'fund_special_founder', name: 'დამფუძნებლის ფონდი', description: 'Founder\'s Fund', category: 'Special' },
  { id: 'fund_special_dev', name: 'განვითარების ფონდი', description: 'Development Fund', category: 'Special' },
];

// --- BUDGETING DATA ---
ANNUAL_BUDGETS = {
  2025: {},
  2026: {
    // Revenues
    'rev_projects': 3000000,
    'rev_service': 2000000,
    'rev_parts': 1000000,
    'rev_other': 200000,
    // Total Revenue: 6,200,000

    // Expenses (Negative values as per budget convention)
    // SECTION A
    'fund_direct_project': -1200000,
    'fund_direct_service': -800000,
    'fund_direct_parts': -500000,
    
    // SECTION B
    'fund_marginal_salary_admin': -2234480, // This should result in 36.04% (2234480 / 6200000)
    'fund_marginal_salary_comm': -400000,
    'fund_marginal_salary_service': -600000,
    'fund_marginal_tax': -250000,
    'fund_marginal_fixed': -150000,
    'fund_marginal_fleet': -120000,
    'fund_marginal_consumables': -80000,

    // SECTION C
    'fund_adj_bonus_admin': -100000,
    'fund_adj_bonus_comm': -150000,
    'fund_adj_bonus_service': -200000,
    'fund_adj_office': -70000,
    'fund_adj_marketing': -90000,
    'fund_adj_assets': -50000,
    'fund_adj_rep': -30000,
    'fund_adj_other': -20000,

    // SECTION D
    'fund_special_reserve': -180000,
    'fund_special_founder': -100000,
    'fund_special_dev': -150000,
  }
};
let budgetOverrideData: any[] | null = null;
export const clearBudgetOverride = async () => { budgetOverrideData = null; };

// PROMPT 6.2-008: State for dynamic budget actuals
CURRENT_YEAR_ACTUALS = {};
export const clearBudgetActuals = async () => { CURRENT_YEAR_ACTUALS = {}; };

// PROMPT 7.3-008: State for analysis comments
BUDGET_ANALYSIS_COMMENTS = {};
export const getBudgetAnalysisComments = async (): Promise<Record<string, string>> => ({ ...BUDGET_ANALYSIS_COMMENTS });
export const updateBudgetAnalysisComment = async (fundId: string, comment: string): Promise<void> => { BUDGET_ANALYSIS_COMMENTS[fundId] = comment; };


// PROMPT 6.7-002: Project Revenue Data (Persisted)
MOCK_PROJECTS = [];

try {
    const sProjects = localStorage.getItem('finboard_projects');
    if (sProjects) MOCK_PROJECTS = JSON.parse(sProjects);
} catch(e) {}
const syncProjects = () => {
    localStorage.setItem('finboard_projects', JSON.stringify(MOCK_PROJECTS));
    safeEmit('update_state', { key: 'projects', value: MOCK_PROJECTS });
};

export const getProjects = async (): Promise<ProjectRevenue[]> => [...MOCK_PROJECTS];

export const addProject = async (projectData: Omit<ProjectRevenue, 'id' | 'status'>): Promise<ProjectRevenue> => {
  const newProject: ProjectRevenue = {
    id: `proj_${Date.now()}`,
    ...projectData,
    status: 'active',
  };
  MOCK_PROJECTS.push(newProject);
  syncProjects();
  return newProject;
};

export const updateProject = async (projectId: string, updates: Partial<ProjectRevenue>): Promise<void> => {
  MOCK_PROJECTS = MOCK_PROJECTS.map(p => p.id === projectId ? { ...p, ...updates } : p);
  syncProjects();
};

export const terminateProject = async (projectId: string, terminationDate: string, terminationReason: string): Promise<void> => {
  MOCK_PROJECTS = MOCK_PROJECTS.map(p => p.id === projectId ? { ...p, status: 'terminated', terminationDate, terminationReason } : p);
  syncProjects();
};


// PROMPT 6.8-001: Service Revenue Data (Persisted)
MOCK_SERVICES = [];

try {
    const sServices = localStorage.getItem('finboard_services');
    if (sServices) MOCK_SERVICES = JSON.parse(sServices);
} catch(e) {}
const syncServices = () => {
    localStorage.setItem('finboard_services', JSON.stringify(MOCK_SERVICES));
    safeEmit('update_state', { key: 'services', value: MOCK_SERVICES });
};

export const getServices = async (): Promise<ServiceRevenue[]> => [...MOCK_SERVICES];

export const addService = async (serviceData: Omit<ServiceRevenue, 'id' | 'status'>): Promise<ServiceRevenue> => {
  const newService: ServiceRevenue = {
    id: `serv_${Date.now()}`,
    ...serviceData,
    status: 'active',
  };
  MOCK_SERVICES.push(newService);
  syncServices();
  return newService;
};

export const updateService = async (serviceId: string, updates: Partial<ServiceRevenue>): Promise<void> => {
  MOCK_SERVICES = MOCK_SERVICES.map(s => s.id === serviceId ? { ...s, ...updates } : s);
  syncServices();
};

export const terminateService = async (serviceId: string, terminationDate: string, terminationReason: string): Promise<void> => {
  MOCK_SERVICES = MOCK_SERVICES.map(s => s.id === serviceId ? { ...s, status: 'terminated', terminationDate, terminationReason } : s);
  syncServices();
};

// PROMPT 6.8-002: Parts Revenue Data (Persisted)
MOCK_PARTS = [];

try {
    const sParts = localStorage.getItem('finboard_parts');
    if (sParts) MOCK_PARTS = JSON.parse(sParts);
} catch(e) {}
const syncParts = () => {
    localStorage.setItem('finboard_parts', JSON.stringify(MOCK_PARTS));
    safeEmit('update_state', { key: 'parts', value: MOCK_PARTS });
};


export const getParts = async (): Promise<PartRevenue[]> => [...MOCK_PARTS];

export const addPart = async (partData: Omit<PartRevenue, 'id' | 'status'>): Promise<PartRevenue> => {
  const newPart: PartRevenue = {
    id: `part_${Date.now()}`,
    ...partData,
    status: 'active',
  };
  MOCK_PARTS.push(newPart);
  syncParts();
  return newPart;
};

export const updatePart = async (partId: string, updates: Partial<PartRevenue>): Promise<void> => {
  MOCK_PARTS = MOCK_PARTS.map(p => p.id === partId ? { ...p, ...updates } : p);
  syncParts();
};

export const terminatePart = async (partId: string, terminationDate: string, terminationReason: string): Promise<void> => {
  MOCK_PARTS = MOCK_PARTS.map(p => p.id === partId ? { ...p, status: 'terminated', terminationDate, terminationReason } : p);
  syncParts();
};


const generateZeroBasedMonthlyData = () => Array(12).fill({ plan: 0, fact: 0 });

export const getAnnualBudget = async (year: number) => {
  if (budgetOverrideData) { return [...budgetOverrideData]; }

  const allItems = [
    ...REVENUE_CATEGORIES.map(r => ({ ...r, type: 'revenue', category: 'Revenues' })),
    ...EXPENSE_FUNDS.map(f => ({ ...f, type: 'expense', plannedAmount: 0 }))
  ];
  
  return allItems.map(item => {
    const plannedAmount = ANNUAL_BUDGETS[year]?.[item.id] || 0;
    const monthlyData = generateZeroBasedMonthlyData().map((m, i) => ({ plan: (plannedAmount / 12), fact: 0 }));
    
    // Apply actuals
    if (CURRENT_YEAR_ACTUALS[item.id]) {
      CURRENT_YEAR_ACTUALS[item.id].forEach((actual, index) => {
        if (monthlyData[index]) monthlyData[index].fact = actual;
      });
    }

    const actualAmount = monthlyData.reduce((sum, m) => sum + m.fact, 0);

    return { ...item, plannedAmount, actualAmount, monthlyData };
  });
};


export const updateAnnualBudget = async (year: number, fundId: string, amount: number) => {
  if (!ANNUAL_BUDGETS[year]) ANNUAL_BUDGETS[year] = {};
  ANNUAL_BUDGETS[year][fundId] = amount;
  safeEmit('update_state', { key: 'annualBudgets', value: ANNUAL_BUDGETS });
};

// --- DEBT SERVICE (PROMPT 6.1-011) ---
export const getDebtors = async (): Promise<DebtRecord[]> => [...DEBTORS];
export const getCreditors = async (): Promise<DebtRecord[]> => [...CREDITORS];
export const updateDebtor = async (id: string, updates: Partial<DebtRecord>): Promise<void> => {
  DEBTORS = DEBTORS.map(d => d.id === id ? { ...d, ...updates } : d);
  syncDebts();
};
export const updateCreditor = async (id: string, updates: Partial<DebtRecord>): Promise<void> => {
  CREDITORS = CREDITORS.map(c => c.id === id ? { ...c, ...updates } : c);
  syncDebts();
};
export const addDebtor = async (record: DebtRecord): Promise<void> => { DEBTORS.unshift(record); syncDebts(); };
export const addCreditor = async (record: DebtRecord): Promise<void> => { CREDITORS.unshift(record); syncDebts(); };


// --- CASH INFLOW SERVICE (PROMPT 6.1-012) ---
export const getCurrentWeekCashInflow = async (user: User): Promise<CashInflowRecord[]> => {
  const isTopLevel = [UserRole.FOUNDER, UserRole.FIN_DIRECTOR, UserRole.CEO].includes(user.role);

  if (isTopLevel) {
    return [...CURRENT_WEEK_CASH_INFLOW];
  } else {
    return CURRENT_WEEK_CASH_INFLOW.filter(entry => entry.authorId === user.id);
  }
};

export const getArchivedCashInflow = async (): Promise<Record<string, CashInflowRecord[]>> => ({ ...ARCHIVED_CASH_INFLOW });
export const addCurrentWeekCashInflowEntry = async (entry: Partial<CashInflowRecord>, authorId: string): Promise<CashInflowRecord> => {
  const newEntry: CashInflowRecord = {
    id: `cw_${Date.now()}_${Math.random()}`,
    name: entry.name || '', category: entry.category || 'პროექტები',
    budgeted: entry.budgeted || 0, actual: entry.actual || 0,
    comment: entry.comment || '',
    authorId, timestamp: new Date().toISOString(),
    isTestData: entry.isTestData || false,
  };
  CURRENT_WEEK_CASH_INFLOW.push(newEntry);
  syncCashInflow();
  return newEntry;
};
export const updateCurrentWeekCashInflowEntry = async (id: string, updates: Partial<CashInflowRecord>, authorId: string): Promise<void> => {
  const index = CURRENT_WEEK_CASH_INFLOW.findIndex(e => e.id === id);
  if (index !== -1) {
    CURRENT_WEEK_CASH_INFLOW[index] = { ...CURRENT_WEEK_CASH_INFLOW[index], ...updates, authorId, timestamp: new Date().toISOString() };
    syncCashInflow();
  }
};
export const deleteCurrentWeekCashInflowEntry = async (id: string): Promise<void> => {
  CURRENT_WEEK_CASH_INFLOW = CURRENT_WEEK_CASH_INFLOW.filter(e => e.id !== id);
  syncCashInflow();
};
export const finalizeCurrentWeek = async (): Promise<void> => {
  const key = getWeekKey(new Date());
  const entriesWithDate = CURRENT_WEEK_CASH_INFLOW.map(e => ({ ...e, date: new Date().toISOString() }));
  if (!ARCHIVED_CASH_INFLOW[key]) { ARCHIVED_CASH_INFLOW[key] = []; }
  ARCHIVED_CASH_INFLOW[key].push(...entriesWithDate);
  CURRENT_WEEK_CASH_INFLOW = [];
  syncCashInflow();
};

// ... existing code ...

export const getFinancialData = async () => ({
  totalInflow: 150000,
  bankBalances: [{ name: 'TBC Main', amount: 45000, currency: 'GEL' }, { name: 'BOG Corporate', amount: 105000, currency: 'GEL' }]
});

// Initial Rules for New Matrix
export const getFundDistributionRules = async () => EXPENSE_FUNDS.map(f => ({
    id: f.id,
    name: f.name,
    percentage: 0, 
    description: f.description
}));

// --- Banking Getters/Setters ---
export const getBankAccounts = async (): Promise<BankAccount[]> => {
  return [...BANK_ACCOUNTS];
};

export const updateBankAccountMapping = async (accountId: string, categoryId: string | undefined): Promise<void> => {
  const index = BANK_ACCOUNTS.findIndex(b => b.id === accountId);
  if (index !== -1) {
    BANK_ACCOUNTS[index] = { ...BANK_ACCOUNTS[index], mappedCategoryId: categoryId };
    safeEmit('update_state', { key: 'bankAccounts', value: BANK_ACCOUNTS });
  }
};

export const validateBankAccountRules = async (account: Partial<BankAccount>, excludeId?: string): Promise<string | null> => {
    const duplicateIban = BANK_ACCOUNTS.find(a => a.iban === account.iban && a.id !== excludeId);
    if (duplicateIban) return 'ეს ანგარიში (IBAN) უკვე რეგისტრირებულია სხვა ბანკში.';
    
    if (account.mappedCategoryId && account.bankName) {
        const duplicateFundInBank = BANK_ACCOUNTS.find(a => 
            a.bankName?.toLowerCase() === account.bankName?.toLowerCase() && 
            a.mappedCategoryId === account.mappedCategoryId &&
            a.id !== excludeId
        );
        if (duplicateFundInBank) return `ამ ბანკში (${account.bankName}) ეს ფონდი უკვე დაკავებულია.`;
    }
    return null; 
};

export const updateBankAccountDetails = async (accountId: string, updates: Partial<BankAccount>): Promise<void> => {
  const index = BANK_ACCOUNTS.findIndex(b => b.id === accountId);
  if (index !== -1) {
    BANK_ACCOUNTS[index] = { ...BANK_ACCOUNTS[index], ...updates };
    safeEmit('update_state', { key: 'bankAccounts', value: BANK_ACCOUNTS });
  }
};

export const updateBankAccountSyncStatus = async (accountId: string, isAuto: boolean): Promise<void> => {
  const index = BANK_ACCOUNTS.findIndex(b => b.id === accountId);
  if (index !== -1) {
    BANK_ACCOUNTS[index] = { ...BANK_ACCOUNTS[index], isAutoSync: isAuto };
    safeEmit('update_state', { key: 'bankAccounts', value: BANK_ACCOUNTS });
  }
};

export const updateBankAccountBalance = async (accountId: string, newBalance: number): Promise<void> => {
  const index = BANK_ACCOUNTS.findIndex(b => b.id === accountId);
  if (index !== -1) {
    BANK_ACCOUNTS[index] = { 
      ...BANK_ACCOUNTS[index], 
      currentBalance: newBalance,
      lastSync: new Date().toISOString() 
    };
    safeEmit('update_state', { key: 'bankAccounts', value: BANK_ACCOUNTS });
  }
};

export const addManualBankAccount = async (): Promise<BankAccount> => {
  const newAccount: BankAccount = {
    id: `ba_manual_${Math.random().toString(36).substr(2, 5)}`,
    accountName: 'ახალი ანგარიში',
    bankName: 'TBC Bank', 
    iban: '',
    currency: Currency.GEL,
    currentBalance: 0,
    lastSync: new Date().toISOString(),
    isAutoSync: false,
  };
  BANK_ACCOUNTS.push(newAccount);
  safeEmit('update_state', { key: 'bankAccounts', value: BANK_ACCOUNTS });
  return newAccount;
};

export const getRevenueCategories = async (): Promise<RevenueCategory[]> => {
  return [...REVENUE_CATEGORIES];
};

export const getExpenseFunds = async (): Promise<ExpenseFund[]> => {
  return [...EXPENSE_FUNDS];
};

export const syncBankAccounts = async (): Promise<BankAccount[]> => {
    BANK_ACCOUNTS.forEach(acc => {
        if(acc.isAutoSync) {
            acc.lastSync = new Date().toISOString();
        }
    });
    safeEmit('update_state', { key: 'bankAccounts', value: BANK_ACCOUNTS });
    return [...BANK_ACCOUNTS];
};

// --- PROMPT 409: PREVIOUS WEEK FACT LOGIC ---
const isDateInPreviousWeek = (dateStr: string): boolean => {
    const date = new Date(dateStr);
    const today = new Date();
    const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
    return date >= twoWeeksAgo && date < oneWeekAgo;
};

export const getPreviousWeekFundFacts = async (): Promise<Record<string, number>> => {
  const facts: Record<string, number> = {};
  REQUESTS.forEach(req => {
      if ((req.status === RequestStatus.DISPATCHED_TO_ACCOUNTING || req.status === RequestStatus.PAID) && 
          req.assignedFundId &&
          isDateInPreviousWeek(req.createdAt)) {
          facts[req.assignedFundId] = (facts[req.assignedFundId] || 0) + req.totalAmount;
      }
  });
  return facts;
};

// Real-Time Balances (Active)
// PROMPT 420: Updated to include reserved (Council Review) and approved (FD Approved) amounts
export const getRealTimeFundBalances = async (): Promise<FundBalance[]> => {
  const totalRevenue = BANK_ACCOUNTS
    .filter(b => !!b.mappedCategoryId)
    .reduce((sum, b) => sum + b.currentBalance, 0);

  const rules = await getFundDistributionRules();
  
  const spentMap: Record<string, number> = {};
  REQUESTS.forEach(req => {
    // Include all post-Council statuses + active Council review if fund assigned (Reservation)
    const isSpentOrReserved = 
        req.status === RequestStatus.FD_APPROVED ||
        req.status === RequestStatus.FD_FINAL_CONFIRM ||
        req.status === RequestStatus.READY_FOR_PAYMENT ||
        req.status === RequestStatus.DISPATCHED_TO_ACCOUNTING || 
        req.status === RequestStatus.PAID ||
        (req.status === RequestStatus.COUNCIL_REVIEW && !!req.assignedFundId); 

    if (isSpentOrReserved && req.assignedFundId) {
      spentMap[req.assignedFundId] = (spentMap[req.assignedFundId] || 0) + req.totalAmount;
    }
  });

  return EXPENSE_FUNDS.map(fund => {
    const rule = rules.find(r => r.id === fund.id);
    const allocated = rule ? (totalRevenue * rule.percentage / 100) : 0; 
    const spent = spentMap[fund.id] || 0;
    
    return {
      id: fund.id,
      name: fund.name,
      totalAllocated: allocated,
      totalSpent: spent,
      remaining: allocated - spent
    };
  });
};

// --- PROMPT 415 & 416 & 6.3-010: HISTORICAL SESSION LOGIC ---
export interface FinancialSession {
  id: string;
  weekNumber: number;
  periodStart: string;
  periodEnd: string;
  dateConducted: string;
  totalRevenue: number; // P416
  totalAmount: number; // Expense
  netBalance: number; // P416
  status: 'active' | 'archived';
}

export const getFinancialCouncilSessions = async (): Promise<FinancialSession[]> => {
  const groups: Record<string, ExpenseRequest[]> = {};
  
  REQUESTS.forEach(req => {
    if (req.status === RequestStatus.DRAFT) return;
    const key = req.boardDate;
    if (!groups[key]) groups[key] = [];
    groups[key].push(req);
  });

  // Convert to Session Objects
  const sessions: FinancialSession[] = Object.keys(groups).sort((a,b) => new Date(b).getTime() - new Date(a).getTime()).map(dateStr => {
    const date = new Date(dateStr);
    const reqs = groups[dateStr];
    
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDays = (date.getTime() - startOfYear.getTime()) / 86400000;
    const weekNum = Math.ceil((pastDays + startOfYear.getDay() + 1) / 7);

    const endDate = new Date(date);
    const startDate = new Date(date);
    startDate.setDate(date.getDate() - 6);

    const totalExpense = reqs.reduce((sum, r) => sum + r.totalAmount, 0);
    
    const seed = date.getTime() % 10000; 
    const totalRevenue = totalExpense + (seed * 5) - 10000; 
    const finalRevenue = Math.max(totalRevenue > 0 ? totalRevenue : totalExpense + 5000, 1000); 

    const isPast = date < new Date(); 

    return {
      id: dateStr, 
      weekNumber: weekNum,
      periodStart: startDate.toLocaleDateString('ka-GE'),
      periodEnd: endDate.toLocaleDateString('ka-GE'),
      dateConducted: date.toISOString(),
      totalRevenue: finalRevenue,
      totalAmount: totalExpense,
      netBalance: finalRevenue - totalExpense,
      status: isPast ? 'archived' : 'active'
    };
  });

  return sessions;
};

// Historical Matrix Data (Read-Only)
export const getMatrixDataForDate = async (dateStr: string): Promise<FundBalance[]> => {
  const rules = await getFundDistributionRules();
  const sessions = await getFinancialCouncilSessions();
  const session = sessions.find(s => s.dateConducted === dateStr);
  const totalRevenue = session ? session.totalRevenue : 150000; 
  
  const targetDate = new Date(dateStr).toISOString();
  const sessionRequests = REQUESTS.filter(req => 
      req.boardDate === targetDate &&
      (req.status === RequestStatus.DISPATCHED_TO_ACCOUNTING || req.status === RequestStatus.PAID || req.status === RequestStatus.FD_FINAL_CONFIRM) &&
      req.assignedFundId
  );

  const spentMap: Record<string, number> = {};
  sessionRequests.forEach(req => {
    if(req.assignedFundId) {
      spentMap[req.assignedFundId] = (spentMap[req.assignedFundId] || 0) + req.totalAmount;
    }
  });

  return EXPENSE_FUNDS.map(fund => {
    const rule = rules.find(r => r.id === fund.id);
    const allocated = rule ? (totalRevenue * rule.percentage / 100) : 0; 
    const spent = spentMap[fund.id] || 0;
    
    return {
      id: fund.id,
      name: fund.name,
      totalAllocated: allocated,
      totalSpent: spent,
      remaining: allocated - spent
    };
  });
};

// --- REQUESTS ---

// PROMPT 6.3-010: Cut-off logic
const EXEMPT_ROLES = [UserRole.FIN_DIRECTOR, UserRole.CEO, UserRole.FOUNDER];

const determineBoardDateForRequest = (submissionDate: Date, userRole: UserRole): Date => {
  const date = new Date(submissionDate);
  
  // Target: Wednesday (3)
  const targetDay = 3; 
  const targetHour = 17;
  
  const currentDay = date.getDay();
  const diff = targetDay - currentDay;
  
  const thisWeekWednesday = new Date(date);
  thisWeekWednesday.setDate(date.getDate() + diff);
  thisWeekWednesday.setHours(targetHour, 0, 0, 0);
  
  // If today is past Wednesday, thisWeekWednesday is in the past.
  // The "current week's council" for Thursday/Friday/Saturday is actually NEXT Wednesday.
  // For Sunday/Monday/Tuesday, "current week's council" is THIS Wednesday.
  
  if (EXEMPT_ROLES.includes(userRole)) {
    // Exempt roles can submit up to Wednesday 23:59 for this week's council
    const thisWeekWednesdayEnd = new Date(thisWeekWednesday);
    thisWeekWednesdayEnd.setHours(23, 59, 59, 999);
    
    if (date > thisWeekWednesdayEnd) {
      const nextWeekWednesday = new Date(thisWeekWednesday);
      nextWeekWednesday.setDate(thisWeekWednesday.getDate() + 7);
      return nextWeekWednesday;
    }
    return thisWeekWednesday;
  }
  
  // Normal roles: cutoff is Wednesday 17:00
  if (date > thisWeekWednesday) {
    const nextWeekWednesday = new Date(thisWeekWednesday);
    nextWeekWednesday.setDate(thisWeekWednesday.getDate() + 7);
    return nextWeekWednesday;
  }
  
  return thisWeekWednesday;
};


const createNewRequest = (details: Partial<ExpenseRequest>, user: User): ExpenseRequest => {
  const manager = Object.values(USERS).find(u => u.id === user.managerId);
  const now = details.createdAt ? new Date(details.createdAt) : new Date();

  return {
    id: `req_${Math.random().toString(36).substr(2, 9)}`,
    userId: user.id,
    requesterName: user.name,
    department: user.department,
    managerId: manager?.id || 'u_ceo',
    date: now.toISOString().split('T')[0],
    category: 'Uncategorized',
    itemName: 'N/A',
    quantity: 1,
    unitPrice: 0,
    currency: Currency.GEL,
    totalAmount: 0,
    description: '',
    revenuePotential: '',
    priority: Priority.LOW,
    alternativesChecked: false,
    selectedOptionReason: '',
    status: (user.role === UserRole.FOUNDER || user.role === UserRole.CEO || user.role === UserRole.FIN_DIRECTOR || user.role === UserRole.ADMIN) 
            ? RequestStatus.COUNCIL_REVIEW 
            : RequestStatus.WAITING_DEPT_APPROVAL,
    createdAt: now.toISOString(),
    boardDate: determineBoardDateForRequest(now, user.role).toISOString(),
    ...details
  };
};

export const submitRequest = async (details: Partial<ExpenseRequest>, user: User): Promise<ExpenseRequest> => {
  const newReq = createNewRequest(details, user);
  REQUESTS.push(newReq);
  syncRequests();
  return newReq;
};

export const getRequestsForUser = async (userId: string): Promise<ExpenseRequest[]> => {
  const activeStatuses = [
    RequestStatus.DRAFT,
    RequestStatus.WAITING_DEPT_APPROVAL,
    RequestStatus.COUNCIL_REVIEW,
    RequestStatus.FD_APPROVED,
    RequestStatus.FD_FINAL_CONFIRM,
    RequestStatus.READY_FOR_PAYMENT,
    RequestStatus.DISPATCHED_TO_ACCOUNTING,
    RequestStatus.APPROVED_FOR_PAYMENT,
    RequestStatus.RETURNED_TO_SENDER,
    RequestStatus.RETURNED_TO_MANAGER,
  ];

  const user = Object.values(USERS).find(u => u.id === userId);
  
  if (!user) return [];
  
  return REQUESTS.filter(req => 
    activeStatuses.includes(req.status) &&
    (req.userId === userId || req.managerId === userId)
  ).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const getArchivedRequestsForUser = async (user: User): Promise<ExpenseRequest[]> => {
  const archivedStatuses = [
    RequestStatus.PAID,
    RequestStatus.REJECTED,
    RequestStatus.RETURNED_TO_SENDER,
    RequestStatus.RETURNED_TO_MANAGER
  ];

  const allArchived = REQUESTS.filter(req => archivedStatuses.includes(req.status));

  const isManager = [
    UserRole.COMMERCIAL_DIRECTOR,
    UserRole.TECH_DIRECTOR,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.PARTS_MANAGER // Added Parts Manager
  ].includes(user.role);

  let userSpecificArchive: ExpenseRequest[];

  if (isManager) {
    userSpecificArchive = allArchived.filter(req => req.userId === user.id || req.managerId === user.id);
  } else {
    userSpecificArchive = allArchived.filter(req => req.userId === user.id);
  }

  return userSpecificArchive.sort((a, b) => {
    const dateA = new Date(a.updatedAt || a.createdAt).getTime();
    const dateB = new Date(b.updatedAt || b.createdAt).getTime();
    return dateB - dateA;
  });
};


export const updateRequestStatus = async (requestId: string, newStatus: RequestStatus, actorId: string): Promise<void> => {
  const index = REQUESTS.findIndex(r => r.id === requestId);
  if (index !== -1) {
    const actor = Object.values(USERS).find(u => u.id === actorId);
    const updates: Partial<ExpenseRequest> = {
        status: newStatus,
        updatedAt: new Date().toISOString()
    };

    // If moving to Council Review, update the board date to the next upcoming Thursday
    // to ensure it appears in the current/upcoming board session
    if (newStatus === RequestStatus.COUNCIL_REVIEW) {
        updates.boardDate = determineBoardDateForRequest(new Date(), actor?.role || UserRole.EMPLOYEE).toISOString();
    }

    REQUESTS[index] = { 
        ...REQUESTS[index], 
        ...updates
    };

    if (newStatus === RequestStatus.PAID) {
        const req = REQUESTS[index];
        if (req.assignedFundId) {
            const rates = await getCurrencyRates();
            let amountInGel = req.totalAmount;
            if (req.currency === Currency.USD) {
                amountInGel = req.totalAmount * rates.USD;
            } else if (req.currency === Currency.EUR) {
                amountInGel = req.totalAmount * rates.EUR;
            }
            
            const month = new Date(req.createdAt).getMonth();
            if (!CURRENT_YEAR_ACTUALS[req.assignedFundId]) {
                CURRENT_YEAR_ACTUALS[req.assignedFundId] = Array(12).fill(0);
            }
            CURRENT_YEAR_ACTUALS[req.assignedFundId][month] += amountInGel;
        }
    }
    syncRequests();
  }
};

export const updateRequestDetails = async (requestId: string, updates: Partial<ExpenseRequest>): Promise<void> => {
    const index = REQUESTS.findIndex(r => r.id === requestId);
    if (index !== -1) {
        REQUESTS[index] = { ...REQUESTS[index], ...updates };
        syncRequests();
    }
};

export const resubmitRequest = async (requestId: string, updates: Partial<ExpenseRequest>, actor?: User): Promise<void> => {
  const index = REQUESTS.findIndex(r => r.id === requestId);
  if (index !== -1 && REQUESTS[index].status === RequestStatus.RETURNED_TO_SENDER) {
    const now = new Date();
    const user = actor || Object.values(USERS).find(u => u.id === REQUESTS[index].userId);
    
    REQUESTS[index] = { 
        ...REQUESTS[index], 
        ...updates,
        status: RequestStatus.WAITING_DEPT_APPROVAL, // Reset status
        updatedAt: now.toISOString(),
        boardDate: determineBoardDateForRequest(now, user?.role || UserRole.EMPLOYEE).toISOString()
    };
    syncRequests();
  }
};

// --- DATA FOR FINANCIAL COUNCIL ---
export const getDirectorBoardRequests = async (): Promise<ExpenseRequest[]> => {
  const relevantStatuses = [
    RequestStatus.COUNCIL_REVIEW,
    RequestStatus.FD_APPROVED,
    RequestStatus.WAITING_DEPT_APPROVAL,
  ];
  
  const filtered = REQUESTS.filter(r => relevantStatuses.includes(r.status));
  
  return filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
};

export const getAllRequests = async (): Promise<ExpenseRequest[]> => {
    return [...REQUESTS];
};

export const getBoardSession = async (): Promise<BoardSession | null> => {
    return BOARD_SESSIONS.find(s => s.isActive) || null;
};

// === BOARD SESSION LIFECYCLE (persist open/close + step) ===

export const openBoardSession = async (user: User): Promise<BoardSession> => {
    const now = new Date();
    const sessionDate = determineBoardDateForRequest(now, user.role);
    const weekDateStr = sessionDate.toISOString();

    // 1. Check if there's already an active session
    const existingActive = BOARD_SESSIONS.find(s => s.isActive);
    if (existingActive) {
        return existingActive;
    }

    // 2. Check if a session for this week already exists (even if closed)
    // "Only one session opens, never more than one"
    const existingSession = BOARD_SESSIONS.find(s => s.weekDate === weekDateStr);
    if (existingSession) {
        existingSession.isActive = true; // Re-open it
        syncBoardSessions();
        localStorage.setItem('finboard_council_step', '1');
        return existingSession;
    }

    // 3. Create new session
    const session: BoardSession = {
        id: `board_${Date.now()}`,
        weekDate: weekDateStr,
        startTime: now.toISOString(),
        isActive: true,
        attendees: [user.id],
        initiatorId: user.id,
    };

    BOARD_SESSIONS.push(session);
    syncBoardSessions();
    localStorage.setItem('finboard_council_step', '1');
    return session;
};

export const closeBoardSession = async (): Promise<void> => {
    const active = BOARD_SESSIONS.find(s => s.isActive);
    if (active) {
        active.isActive = false;
        active.endTime = new Date().toISOString();
    }
    syncBoardSessions();
    localStorage.removeItem('finboard_council_step');
};

export const saveBoardStep = (step: number): void => {
    localStorage.setItem('finboard_council_step', String(step));
};

export const getSavedBoardStep = (): number => {
    const saved = localStorage.getItem('finboard_council_step');
    return saved !== null ? parseInt(saved, 10) : 0;
};

export const getArchivedBoardSessions = async (): Promise<BoardSession[]> => {
    return BOARD_SESSIONS.filter(s => !s.isActive).sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
};

export const getFdFinalRequests = async (): Promise<ExpenseRequest[]> => {
    return REQUESTS.filter(r => r.status === RequestStatus.FD_APPROVED);
};

export const getDispatchedRequests = async (): Promise<ExpenseRequest[]> => {
    return REQUESTS.filter(r => r.status === RequestStatus.DISPATCHED_TO_ACCOUNTING || r.status === RequestStatus.PAID)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const getAccountingRequests = async (): Promise<ExpenseRequest[]> => {
  return REQUESTS.filter(r => 
    r.status === RequestStatus.DISPATCHED_TO_ACCOUNTING ||
    r.status === RequestStatus.APPROVED_FOR_PAYMENT ||
    r.status === RequestStatus.PAID
  ).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

// User Management Mocks
const syncUsers = () => {
    localStorage.setItem('finboard_users', JSON.stringify(USERS));
    safeEmit('update_state', { key: 'users', value: USERS });
};

export const getAllUsers = async (): Promise<User[]> => Object.values(USERS);
export const addUserMock = async (data: Omit<User, 'id'>) => { 
    const id = `u_mock_${Math.random()}`;
    USERS[id] = { id, ...data };
    syncUsers();
};
export const updateUserMock = async (id: string, data: Partial<User>) => {
    USERS[id] = { ...USERS[id], ...data };
    syncUsers();
};
export const deleteUserMock = async (id: string) => {
    delete USERS[id];
    syncUsers();
};

// --- DATABASE BACKUP & RESTORE ---

export const exportDatabase = () => {
  const data = {
    requests: REQUESTS,
    boardSessions: BOARD_SESSIONS,
    hiddenFunds: HIDDEN_FUNDS,
    dispatchedDirectives: DISPATCHED_DIRECTIVES,
    invoices: INVOICES,
    cwInflow: CURRENT_WEEK_CASH_INFLOW,
    archivedInflow: ARCHIVED_CASH_INFLOW,
    debtors: DEBTORS,
    creditors: CREDITORS,
    bankAccounts: BANK_ACCOUNTS,
    revenueCategories: REVENUE_CATEGORIES,
    mockRates: MOCK_RATES,
    mockInflation: MOCK_INFLATION_RATE,
    annualBudgets: ANNUAL_BUDGETS,
    currentYearActuals: CURRENT_YEAR_ACTUALS,
    budgetAnalysisComments: BUDGET_ANALYSIS_COMMENTS,
    projects: MOCK_PROJECTS,
    services: MOCK_SERVICES,
    parts: MOCK_PARTS,
    users: USERS,
  };
  return JSON.stringify(data, null, 2);
};

export const importDatabase = async (jsonString: string) => {
  try {
    const data = JSON.parse(jsonString);
    
    // Update local variables
    if (data.requests) REQUESTS = data.requests;
    if (data.boardSessions) BOARD_SESSIONS = data.boardSessions;
    if (data.hiddenFunds) HIDDEN_FUNDS = data.hiddenFunds;
    if (data.dispatchedDirectives) DISPATCHED_DIRECTIVES = data.dispatchedDirectives;
    if (data.invoices) INVOICES = data.invoices;
    if (data.cwInflow) CURRENT_WEEK_CASH_INFLOW = data.cwInflow;
    if (data.archivedInflow) ARCHIVED_CASH_INFLOW = data.archivedInflow;
    if (data.debtors) DEBTORS = data.debtors;
    if (data.creditors) CREDITORS = data.creditors;
    if (data.bankAccounts) BANK_ACCOUNTS = data.bankAccounts;
    if (data.revenueCategories) REVENUE_CATEGORIES = data.revenueCategories;
    if (data.mockRates) MOCK_RATES = data.mockRates;
    if (data.mockInflation) MOCK_INFLATION_RATE = data.mockInflation;
    if (data.annualBudgets) ANNUAL_BUDGETS = data.annualBudgets;
    if (data.currentYearActuals) CURRENT_YEAR_ACTUALS = data.currentYearActuals;
    if (data.budgetAnalysisComments) BUDGET_ANALYSIS_COMMENTS = data.budgetAnalysisComments;
    if (data.projects) MOCK_PROJECTS = data.projects;
    if (data.services) MOCK_SERVICES = data.services;
    if (data.parts) MOCK_PARTS = data.parts;
    if (data.users) USERS = data.users;

    // Sync to localStorage
    localStorage.setItem('finboard_requests', JSON.stringify(REQUESTS));
    localStorage.setItem('finboard_board_sessions', JSON.stringify(BOARD_SESSIONS));
    localStorage.setItem('finboard_hidden_funds', JSON.stringify(HIDDEN_FUNDS));
    localStorage.setItem('finboard_directives', JSON.stringify(DISPATCHED_DIRECTIVES));
    localStorage.setItem('finboard_invoices', JSON.stringify(INVOICES));
    localStorage.setItem('finboard_cw_inflow', JSON.stringify(CURRENT_WEEK_CASH_INFLOW));
    localStorage.setItem('finboard_archived_inflow', JSON.stringify(ARCHIVED_CASH_INFLOW));
    localStorage.setItem('finboard_debtors', JSON.stringify(DEBTORS));
    localStorage.setItem('finboard_creditors', JSON.stringify(CREDITORS));
    localStorage.setItem('finboard_bank_accounts', JSON.stringify(BANK_ACCOUNTS));
    localStorage.setItem('finboard_revenue_categories', JSON.stringify(REVENUE_CATEGORIES));
    localStorage.setItem('finboard_mock_rates', JSON.stringify(MOCK_RATES));
    localStorage.setItem('finboard_mock_inflation', JSON.stringify(MOCK_INFLATION_RATE));
    localStorage.setItem('finboard_annual_budgets', JSON.stringify(ANNUAL_BUDGETS));
    localStorage.setItem('finboard_current_year_actuals', JSON.stringify(CURRENT_YEAR_ACTUALS));
    localStorage.setItem('finboard_budget_comments', JSON.stringify(BUDGET_ANALYSIS_COMMENTS));
    localStorage.setItem('finboard_projects', JSON.stringify(MOCK_PROJECTS));
    localStorage.setItem('finboard_services', JSON.stringify(MOCK_SERVICES));
    localStorage.setItem('finboard_parts', JSON.stringify(MOCK_PARTS));
    localStorage.setItem('finboard_users', JSON.stringify(USERS));

    window.dispatchEvent(new Event('finboard_sync'));
    return true;
  } catch (e) {
    console.error('Failed to import database:', e);
    return false;
  }
};
export const getInvoicesForAccountant = async (): Promise<Invoice[]> => {
  return INVOICES.filter(inv => inv.status === InvoiceStatus.PENDING_ACCOUNTANT)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const getGeneratedInvoices = async (): Promise<Invoice[]> => {
  return INVOICES.filter(inv => inv.status === InvoiceStatus.GENERATED || inv.status === InvoiceStatus.COMPLETED)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const updateInvoice = async (id: string, updates: Partial<Invoice>): Promise<void> => {
  const index = INVOICES.findIndex(inv => inv.id === id);
  if (index !== -1) {
    INVOICES[index] = { ...INVOICES[index], ...updates };
    syncInvoices();
  }
};

export const updateInvoiceStatus = async (id: string, status: InvoiceStatus): Promise<void> => {
  const index = INVOICES.findIndex(inv => inv.id === id);
  if (index !== -1) {
    INVOICES[index] = { ...INVOICES[index], status };
    syncInvoices();
  }
};


// PROMPT 6.3-007: Update AI summary generation
export const generateAIReportSummary = async (data: MasterReportData): Promise<string> => {
  const summaryData = {
      revenues: data.revenues.map(r => ({ name: r.name, actualAmount: r.actualAmount })),
      fundBalances: data.funds.map(f => ({ name: f.name, remaining: f.remaining })),
      expensesByDept: data.expenseAnalysis,
      debtorTotals: {
          count: data.debtors.length,
          totalBalance: data.debtors.reduce((sum, d) => sum + d.currentBalance, 0)
      },
      creditorTotals: {
          count: data.creditors.length,
          totalBalance: data.creditors.reduce((sum, c) => sum + c.currentBalance, 0)
      }
  };

  if (!process.env.API_KEY) {
    const totalRevenue = summaryData.revenues.reduce((sum, r) => sum + (r.actualAmount || 0), 0);
    const totalExpense = summaryData.expensesByDept.reduce((sum, e) => sum + e.totalApproved, 0);
    const topExpenseDept = [...summaryData.expensesByDept].sort((a, b) => b.totalApproved - a.totalApproved)[0];

    return `
    პერიოდის ანალიზი:
    - შემოსავლები: ${totalRevenue.toLocaleString()} GEL
    - ხარჯები: ${totalExpense.toLocaleString()} GEL (დომინანტი დეპარტამენტი: ${topExpenseDept?.department || 'N/A'})
    - დებიტორული დავალიანება: ${summaryData.debtorTotals.totalBalance.toLocaleString()} GEL
    - კრედიტორული დავალიანება: ${summaryData.creditorTotals.totalBalance.toLocaleString()} GEL
    
    რეკომენდაცია: საჭიროა დებიტორული დავალიანების შემცირებაზე ფოკუსირება.
    (ეს არის მოქ-პასუხი. API Key-ს არარსებობის გამო.)
    `;
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Analyze the following JSON data for a corporate board meeting financial summary. Provide a concise summary in Georgian.
    The data includes revenues, fund balances, expense analysis by department, and debtor/creditor totals.
    
    Data:
    ${JSON.stringify(summaryData, null, 2)}

    Analysis Criteria (in Georgian):
    1. Overall financial health (შემოსავლები ხარჯებთან მიმართებაში).
    2. Key revenue sources (მთავარი შემოსავლის წყაროები).
    3. Top spending departments (ყველაზე ხარჯიანი დეპარტამენტები).
    4. Debt situation (დებიტორ-კრედიტორული დავალიანების მდგომარეობა).
    5. Key recommendations (ძირითადი რეკომენდაციები).
    
    Keep the summary professional, objective, and around 150 words.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("AI summary generation failed:", error);
    return "AI დასკვნის გენერაცია ვერ მოხერხერდა. შეამოწმეთ API კავშირი და სცადეთ თავიდან.";
  }
};
// PROMPT 7.5 - 002: Directive Push to Accounting
export const dispatchDirectivesToAccounting = async (user: User, directives: any[], session: FinancialSession): Promise<void> => {
  const snapshot: DirectiveSnapshot = {
    id: `dir_${session.id}`,
    weekNumber: session.weekNumber,
    periodStart: session.periodStart,
    periodEnd: session.periodEnd,
    dispatchedByUserId: user.id,
    dispatchedByName: user.name,
    dispatchedAt: new Date().toISOString(),
    directivesData: directives.map(d => ({
      fundName: d.name || d.fundName,
      category: d.category,
      approvedAmount: d.approved || d.approvedAmount,
      availableAmount: d.available || d.availableAmount,
      distributionPercentage: d.distributionPercentage,
      calculatedAmount: d.calculated || d.calculatedAmount
    })),
    status: 'pending',
  };

  const existingIndex = DISPATCHED_DIRECTIVES.findIndex(d => d.id === snapshot.id);
  if (existingIndex !== -1) {
    DISPATCHED_DIRECTIVES[existingIndex] = snapshot;
  } else {
    DISPATCHED_DIRECTIVES.unshift(snapshot);
  }
  syncDirectives();
};

export const getDispatchedDirectives = async (): Promise<DirectiveSnapshot[]> => {
  const senderRoles = [UserRole.FOUNDER, UserRole.CEO, UserRole.FIN_DIRECTOR];
  return DISPATCHED_DIRECTIVES.filter(d => {
    const sender = Object.values(USERS).find(u => u.id === d.dispatchedByUserId);
    return sender && senderRoles.includes(sender.role);
  });
};

export const updateDirectiveStatus = async (directiveId: string, newStatus: 'processed', userId: string): Promise<void> => {
  const index = DISPATCHED_DIRECTIVES.findIndex(d => d.id === directiveId);
  if (index !== -1) {
    DISPATCHED_DIRECTIVES[index] = {
      ...DISPATCHED_DIRECTIVES[index],
      status: newStatus,
      processedAt: new Date().toISOString(),
      processedByUserId: userId,
    };
    syncDirectives();
  }
};

// --- NEW: INVOICE LOGIC (Now Persistent) ---

export const createInvoice = async (invoiceData: Omit<Invoice, 'id' | 'status' | 'createdAt' | 'invoiceNumber'>): Promise<Invoice> => {
  const currentYear = new Date().getFullYear();
  const count = INVOICES.length + 1;
  const invoiceNumber = `${currentYear}${count.toString().padStart(3, '0')}-2`; 

  const newInvoice: Invoice = {
    id: `inv_${Date.now()}`,
    invoiceNumber,
    ...invoiceData,
    status: InvoiceStatus.PENDING_ACCOUNTANT,
    createdAt: new Date().toISOString()
  };
  INVOICES.push(newInvoice);
  syncInvoices();
  return newInvoice;
};

export const getProformaInvoicesForUser = async (userId: string): Promise<Invoice[]> => {
  return INVOICES.filter(inv => inv.creatorId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

// PROMPT 6.2-009: Reset Data
export const resetAllDataToProduction = async () => {
  localStorage.clear();
  // Since we reload the page, in-memory variables will reset automatically.
};

// === SUPABASE REALTIME SYNC SETUP ===
const handleInitState = (state: any) => {
  let hasData = false;
  if (state.users && Object.keys(state.users).length > 0) {
    for (const key in USERS) delete USERS[key];
    Object.assign(USERS, state.users);
    hasData = true;
  }
  
  if (state.requests && state.requests.length > 0) { REQUESTS = state.requests; localStorage.setItem('finboard_requests', JSON.stringify(REQUESTS)); hasData = true; }
  if (state.invoices && state.invoices.length > 0) { INVOICES = state.invoices; localStorage.setItem('finboard_invoices', JSON.stringify(INVOICES)); hasData = true; }
  if (state.cwInflow && state.cwInflow.length > 0) { CURRENT_WEEK_CASH_INFLOW = state.cwInflow; localStorage.setItem('finboard_cw_inflow', JSON.stringify(CURRENT_WEEK_CASH_INFLOW)); hasData = true; }
  if (state.archivedInflow && state.archivedInflow.length > 0) { ARCHIVED_CASH_INFLOW = state.archivedInflow; localStorage.setItem('finboard_archived_inflow', JSON.stringify(ARCHIVED_CASH_INFLOW)); hasData = true; }
  if (state.debtors && state.debtors.length > 0) { DEBTORS = state.debtors; localStorage.setItem('finboard_debtors', JSON.stringify(DEBTORS)); hasData = true; }
  if (state.creditors && state.creditors.length > 0) { CREDITORS = state.creditors; localStorage.setItem('finboard_creditors', JSON.stringify(CREDITORS)); hasData = true; }
  if (state.projects && state.projects.length > 0) { MOCK_PROJECTS = state.projects; localStorage.setItem('finboard_projects', JSON.stringify(MOCK_PROJECTS)); hasData = true; }
  if (state.services && state.services.length > 0) { MOCK_SERVICES = state.services; localStorage.setItem('finboard_services', JSON.stringify(MOCK_SERVICES)); hasData = true; }
  if (state.parts && state.parts.length > 0) { MOCK_PARTS = state.parts; localStorage.setItem('finboard_parts', JSON.stringify(MOCK_PARTS)); hasData = true; }
  if (state.boardSessions && state.boardSessions.length > 0) { BOARD_SESSIONS = state.boardSessions; localStorage.setItem('finboard_board_sessions', JSON.stringify(BOARD_SESSIONS)); hasData = true; }
  if (state.hiddenFunds && Object.keys(state.hiddenFunds).length > 0) { HIDDEN_FUNDS = state.hiddenFunds; localStorage.setItem('finboard_hidden_funds', JSON.stringify(HIDDEN_FUNDS)); hasData = true; }
  if (state.dispatchedDirectives && state.dispatchedDirectives.length > 0) { DISPATCHED_DIRECTIVES = state.dispatchedDirectives; localStorage.setItem('finboard_directives', JSON.stringify(DISPATCHED_DIRECTIVES)); hasData = true; }
  if (state.bankAccounts && state.bankAccounts.length > 0) { BANK_ACCOUNTS = state.bankAccounts; localStorage.setItem('finboard_bank_accounts', JSON.stringify(BANK_ACCOUNTS)); hasData = true; }
  if (state.revenueCategories && state.revenueCategories.length > 0) { REVENUE_CATEGORIES = state.revenueCategories; localStorage.setItem('finboard_revenue_categories', JSON.stringify(REVENUE_CATEGORIES)); hasData = true; }
  if (state.annualBudgets && state.annualBudgets.length > 0) { ANNUAL_BUDGETS = state.annualBudgets; localStorage.setItem('finboard_annual_budgets', JSON.stringify(ANNUAL_BUDGETS)); hasData = true; }
  if (state.currentYearActuals && state.currentYearActuals.length > 0) { CURRENT_YEAR_ACTUALS = state.currentYearActuals; localStorage.setItem('finboard_current_year_actuals', JSON.stringify(CURRENT_YEAR_ACTUALS)); hasData = true; }
  if (state.budgetAnalysisComments && Object.keys(state.budgetAnalysisComments).length > 0) { BUDGET_ANALYSIS_COMMENTS = state.budgetAnalysisComments; localStorage.setItem('finboard_budget_comments', JSON.stringify(BUDGET_ANALYSIS_COMMENTS)); hasData = true; }
  if (state.mockRates && Object.keys(state.mockRates).length > 0) { MOCK_RATES = state.mockRates; localStorage.setItem('finboard_mock_rates', JSON.stringify(MOCK_RATES)); hasData = true; }
  if (state.mockInflation && Object.keys(state.mockInflation).length > 0) { MOCK_INFLATION_RATE = state.mockInflation; localStorage.setItem('finboard_mock_inflation', JSON.stringify(MOCK_INFLATION_RATE)); hasData = true; }

  window.dispatchEvent(new Event('finboard_sync'));
};

const handleStateUpdated = (data: any) => {
  const { key, action, id, changes, value } = data;

  const applyUpdate = (stateRef: any) => {
    if (action === 'update_item' && Array.isArray(stateRef)) {
      const index = stateRef.findIndex((item: any) => item.id === id);
      if (index !== -1) {
        const updated = [...stateRef];
        updated[index] = { ...updated[index], ...changes };
        return updated;
      }
    } else if (action === 'add_item' && Array.isArray(stateRef)) {
      return [...stateRef, value];
    } else if (action === 'delete_item' && Array.isArray(stateRef)) {
      return stateRef.filter((item: any) => item.id !== id);
    }
    // Full replacement fallback
    return value;
  };

  if (key === 'users') {
    for (const k in USERS) delete USERS[k];
    Object.assign(USERS, value);
    localStorage.setItem('finboard_users', JSON.stringify(USERS));
  }
  if (key === 'requests') { REQUESTS = applyUpdate(REQUESTS); localStorage.setItem('finboard_requests', JSON.stringify(REQUESTS)); }
  if (key === 'invoices') { INVOICES = applyUpdate(INVOICES); localStorage.setItem('finboard_invoices', JSON.stringify(INVOICES)); }
  if (key === 'cwInflow') { CURRENT_WEEK_CASH_INFLOW = applyUpdate(CURRENT_WEEK_CASH_INFLOW); localStorage.setItem('finboard_cw_inflow', JSON.stringify(CURRENT_WEEK_CASH_INFLOW)); }
  if (key === 'archivedInflow') { ARCHIVED_CASH_INFLOW = applyUpdate(ARCHIVED_CASH_INFLOW); localStorage.setItem('finboard_archived_inflow', JSON.stringify(ARCHIVED_CASH_INFLOW)); }
  if (key === 'debtors') { DEBTORS = applyUpdate(DEBTORS); localStorage.setItem('finboard_debtors', JSON.stringify(DEBTORS)); }
  if (key === 'creditors') { CREDITORS = applyUpdate(CREDITORS); localStorage.setItem('finboard_creditors', JSON.stringify(CREDITORS)); }
  if (key === 'projects') { MOCK_PROJECTS = applyUpdate(MOCK_PROJECTS); localStorage.setItem('finboard_projects', JSON.stringify(MOCK_PROJECTS)); }
  if (key === 'services') { MOCK_SERVICES = applyUpdate(MOCK_SERVICES); localStorage.setItem('finboard_services', JSON.stringify(MOCK_SERVICES)); }
  if (key === 'parts') { MOCK_PARTS = applyUpdate(MOCK_PARTS); localStorage.setItem('finboard_parts', JSON.stringify(MOCK_PARTS)); }
  if (key === 'boardSessions') { BOARD_SESSIONS = applyUpdate(BOARD_SESSIONS); localStorage.setItem('finboard_board_sessions', JSON.stringify(BOARD_SESSIONS)); }
  if (key === 'hiddenFunds') { HIDDEN_FUNDS = applyUpdate(HIDDEN_FUNDS); localStorage.setItem('finboard_hidden_funds', JSON.stringify(HIDDEN_FUNDS)); }
  if (key === 'dispatchedDirectives') { DISPATCHED_DIRECTIVES = applyUpdate(DISPATCHED_DIRECTIVES); localStorage.setItem('finboard_directives', JSON.stringify(DISPATCHED_DIRECTIVES)); }
  if (key === 'bankAccounts') { BANK_ACCOUNTS = applyUpdate(BANK_ACCOUNTS); localStorage.setItem('finboard_bank_accounts', JSON.stringify(BANK_ACCOUNTS)); }
  if (key === 'revenueCategories') { REVENUE_CATEGORIES = applyUpdate(REVENUE_CATEGORIES); localStorage.setItem('finboard_revenue_categories', JSON.stringify(REVENUE_CATEGORIES)); }
  if (key === 'annualBudgets') { ANNUAL_BUDGETS = applyUpdate(ANNUAL_BUDGETS); localStorage.setItem('finboard_annual_budgets', JSON.stringify(ANNUAL_BUDGETS)); }
  if (key === 'currentYearActuals') { CURRENT_YEAR_ACTUALS = applyUpdate(CURRENT_YEAR_ACTUALS); localStorage.setItem('finboard_current_year_actuals', JSON.stringify(CURRENT_YEAR_ACTUALS)); }
  if (key === 'budgetAnalysisComments') { BUDGET_ANALYSIS_COMMENTS = applyUpdate(BUDGET_ANALYSIS_COMMENTS); localStorage.setItem('finboard_budget_comments', JSON.stringify(BUDGET_ANALYSIS_COMMENTS)); }
  if (key === 'mockRates') { MOCK_RATES = applyUpdate(MOCK_RATES); localStorage.setItem('finboard_mock_rates', JSON.stringify(MOCK_RATES)); }
  if (key === 'mockInflation') { MOCK_INFLATION_RATE = applyUpdate(MOCK_INFLATION_RATE); localStorage.setItem('finboard_mock_inflation', JSON.stringify(MOCK_INFLATION_RATE)); }

  window.dispatchEvent(new Event('finboard_sync'));
};

export const clearArchivedRequests = async (): Promise<void> => {
  REQUESTS = REQUESTS.filter(r => 
    r.status !== RequestStatus.PAID && 
    r.status !== RequestStatus.REJECTED &&
    r.status !== RequestStatus.APPROVED_FOR_PAYMENT
  );
  localStorage.setItem('finboard_requests', JSON.stringify(REQUESTS));
  window.dispatchEvent(new Event('finboard_sync'));
};

const initSupabaseSync = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  if (!url || !key || url.includes('your-project') || key.includes('your-anon-key')) {
    console.warn('Supabase Realtime skipped: Invalid or placeholder credentials.');
    return;
  }

  if (!url.startsWith('https://')) {
    console.warn('Supabase Realtime error: VITE_SUPABASE_URL must start with https://');
    return;
  }

  channel = supabase.channel('finboard_sync_channel');

  channel
    .on('broadcast', { event: 'update_state' }, ({ payload }: any) => {
      handleStateUpdated(payload);
    })
    .on('broadcast', { event: 'request_state' }, () => {
      // Another client is requesting state, let's send our current state
      channel.send({
        type: 'broadcast',
        event: 'init_state',
        payload: {
          users: USERS,
          requests: REQUESTS,
          invoices: INVOICES,
          cwInflow: CURRENT_WEEK_CASH_INFLOW,
          archivedInflow: ARCHIVED_CASH_INFLOW,
          debtors: DEBTORS,
          creditors: CREDITORS,
          projects: MOCK_PROJECTS,
          services: MOCK_SERVICES,
          parts: MOCK_PARTS,
          boardSessions: BOARD_SESSIONS,
          hiddenFunds: HIDDEN_FUNDS,
          dispatchedDirectives: DISPATCHED_DIRECTIVES,
          bankAccounts: BANK_ACCOUNTS,
          revenueCategories: REVENUE_CATEGORIES,
          annualBudgets: ANNUAL_BUDGETS,
          currentYearActuals: CURRENT_YEAR_ACTUALS,
          budgetAnalysisComments: BUDGET_ANALYSIS_COMMENTS,
          mockRates: MOCK_RATES,
          mockInflation: MOCK_INFLATION_RATE
        }
      }).catch((err: any) => console.warn('Supabase broadcast error:', err));
    })
    .on('broadcast', { event: 'init_state' }, ({ payload }: any) => {
      handleInitState(payload);
    })
    .subscribe((status: string, err?: any) => {
      if (status === 'SUBSCRIBED') {
        console.log('Supabase Realtime connected successfully');
        // Request initial state from other clients
        channel.send({
          type: 'broadcast',
          event: 'request_state',
          payload: {}
        }).catch((err: any) => console.warn('Supabase broadcast error:', err));
      } else if (status === 'CHANNEL_ERROR') {
        console.warn('Supabase Realtime connection error:', err || 'Unknown error. Please verify your credentials and ensure Realtime is enabled in your Supabase project dashboard.');
      } else if (status === 'TIMED_OUT') {
        console.warn('Supabase Realtime connection timed out.');
      }
    });
};

initSupabaseSync();
