export type UserRole = 'Admin' | 'Manager' | 'Employee' | 'admin' | 'manager' | 'employee';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  avatar?: string;
  profileImageUrl?: string;
}

export interface Task {
  id: string;
  assignedTo: string;
  assignedToName: string;
  category: string;
  title: string;
  description: string;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface FilterChip {
  id: string;
  label: string;
}

export interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'task' | 'announcement' | 'reminder' | 'alert';
    isRead: boolean;
    createdAt: string; // ISO date string
    relatedTaskId?: string;
  }
  
  export type NotificationFilter = 'today' | 'week' | 'month' | 'all';  

  export interface Employee {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    department: string;
    phone: string;
    joinDate: string;
    status: 'active' | 'inactive';
    tasksCompleted: number;
    tasksAssigned: number;
    /** Optional UI flag from API (falls back to status if omitted). */
    isActive?: boolean;
    avatar?: string;
    profileImageUrl?: string;
  }
  
  export interface Client {
    id: string;
    name: string;
    company: string;
    email: string;
    phone: string;
    status: 'active' | 'inactive';
    projectType: string;
    joinDate: string;
    totalProjects: number;
  }
  
  export type Priority = 'low' | 'medium' | 'high' | 'urgent';

  // ------------------------------------------
  // Tally API Response Types
  // ------------------------------------------

  export interface TallyBill {
    clientName: string;
    billRef: string;
    billDate: string;
    dueDate: string;
    billAmount: string;
    pendingAmount: string;
    daysOverdue: number;
    isOverdue: boolean;
    ageingBucket: string;
    dueDateFormatted: string;
  }

  export interface ReceivablesSummary {
    totalOutstanding: number;
    totalOverdue: number;
    totalBills: number;
    overdueBills: number;
    ageingBuckets: {
      '0-30': { count: number; total: number };
      '31-60': { count: number; total: number };
      '61-90': { count: number; total: number };
      '90+': { count: number; total: number };
    };
    mtdCollections: number;
  }

  export interface ProfitLossDerived {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    netProfitMarginPercent: number;
    revenueVsLastMonth: {
      currentMonthRevenue: number;
      lastMonthRevenue: number;
      changeAmount: number;
      changePercent: number;
      lastMonthNetProfit: number;
    };
    revenueVsSameMonthLastYear: {
      currentMonthRevenue: number;
      sameMonthLastYearRevenue: number;
      changeAmount: number;
      changePercent: number;
      sameMonthLastYearNetProfit: number;
    };
  }

  export interface BankPositionData {
    bankAccounts: Array<{ name: string; openingBalance: string; closingBalance: string }>;
    cashAccounts: Array<{ name: string; closingBalance: string }>;
    totalBankBalance: number;
    totalCashBalance: number;
    unclearedCheques: any[];
    unclearedCount: number;
    receiptsInPeriod: number;
    paymentsInPeriod: number;
    derived: {
      totalLiquidFunds: number;
    };
  }

  export interface InvoiceItem {
    voucherNumber: string;
    date: string;
    clientName: string;
    narration: string;
    grossAmount: number;
    taxableValue: number;
    cgst: number;
    sgst: number;
    igst: number;
    billRef: string;
    dueDate: string;
    amountReceived: number;
    outstandingBalance: number;
    clientGSTIN: string;
    placeOfSupply: string;
    paymentStatus: 'Paid' | 'Partial' | 'Unpaid' | 'Overdue';
    isOverdue: boolean;
    dueDateFormatted: string;
  }

  export interface ClientBillingInvoice {
    voucherNumber: string;
    date: string;
    clientName: string;
    narration: string;
    grossAmount: string;
    outstandingAmount: string;
    paymentStatus: 'Paid' | 'Partial' | 'Unpaid';
    amountCollected: number;
  }

  export interface ClientRealisation {
    clientName: string;
    totalBilled: number;
    totalCollected: number;
    feeRealisationRatePercent: number;
  }
