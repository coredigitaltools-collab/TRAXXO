// Core domain types for Traxxo ProPlus

export interface Business {
  id: string;
  name: string;
  credential_hash: string;
  owner_hash: string;
  created_at: string;
}

export interface Product {
  id: string;
  business_id: string;
  name: string;
  quantity: number;
  buying_price: number;
  selling_price: number;
  date_added: string;
  purchase_month: string;
  created_at: string;
  updated_at: string;
}

export interface StockMovement {
  id: string;
  business_id: string;
  product_id: string;
  movement_type: 'purchase' | 'sale' | 'adjustment' | 'return' | 'opening';
  quantity: number;
  reference_id?: string;
  note: string;
  created_at: string;
}

export interface Sale {
  id: string;
  business_id: string;
  product_id?: string;
  product_name: string;
  quantity_sold: number;
  buying_price: number;
  selling_price: number;
  discount: number;
  total_sale: number;
  payment_method: 'cash' | 'credit' | 'mobile_money' | 'bank_transfer' | 'card';
  amount_paid: number;
  change_amount: number;
  customer_name: string;
  customer_id?: string;
  staff_member: string;
  sale_date: string;
  sale_time?: string;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  business_id: string;
  category: string;
  description: string;
  amount: number;
  expense_date: string;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  business_id: string;
  name: string;
  phone: string;
  address?: string;
  notes?: string;
  credit_balance: number;
  total_purchases: number;
  date_created?: string;
  created_at: string;
  updated_at: string;
}

export interface CreditTransaction {
  id: string;
  business_id: string;
  customer_id: string;
  transaction_type: 'credit_sale' | 'payment' | 'adjustment';
  amount: number;
  balance_after: number;
  description: string;
  sale_id?: string;
  transaction_date: string;
  created_at: string;
}

// Staff & activity types
export type StaffRole = 'cashier' | 'store_manager' | 'administrator';

export interface StaffMember {
  id: string;
  business_id: string;
  name: string;
  pin_hash: string;
  role: StaffRole;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  business_id: string;
  staff_name: string;
  staff_role: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  created_at: string;
}

// Auth & session types
export interface AuthSession {
  businessId: string;
  businessName: string;
  role: 'owner' | 'staff';
  staffName?: string;
  staffId?: string;
  staffRole?: StaffRole;
}

export interface LoginCredentials {
  businessName: string;
  pin: string;
  secretWord: string;
  role: 'owner' | 'staff';
  staffName?: string;
  staffPin?: string;
}

// Dashboard KPI types
export interface DashboardKPIs {
  totalSales: number;
  totalCOGS: number;
  totalExpenses: number;
  netProfit: number;
  inventoryValue: number;
  currentStock: number;
  unitsSold: number;
  outstandingCredits: number;
  creditCollections: number;
}

export interface MonthlySummary {
  month: string;
  sales: number;
  cogs: number;
  expenses: number;
  netProfit: number;
  unitsSold: number;
}

// Form types
export type ProductForm = Omit<Product, 'id' | 'business_id' | 'created_at' | 'updated_at'>;
export type SaleForm = Omit<Sale, 'id' | 'business_id' | 'created_at' | 'updated_at'>;
export type ExpenseForm = Omit<Expense, 'id' | 'business_id' | 'created_at' | 'updated_at'>;
export type CustomerForm = Omit<Customer, 'id' | 'business_id' | 'created_at' | 'updated_at'>;

export const EXPENSE_CATEGORIES = [
  'Rent', 'Salaries', 'Utilities', 'Transport', 'Supplies',
  'Marketing', 'Maintenance', 'Insurance', 'Taxes', 'Miscellaneous', 'General',
] as const;

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'credit', label: 'Credit' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'card', label: 'Card' },
] as const;

export const CURRENCIES = [
  { value: 'UGX', label: 'UGX - Uganda Shilling', symbol: '₦' },
  { value: 'KES', label: 'KES - Kenyan Shilling', symbol: 'KSh' },
  { value: 'TZS', label: 'TZS - Tanzanian Shilling', symbol: 'TSh' },
  { value: 'USD', label: 'USD - US Dollar', symbol: '$' },
  { value: 'GBP', label: 'GBP - British Pound', symbol: '£' },
  { value: 'EUR', label: 'EUR - Euro', symbol: '€' },
] as const;

export const DATE_FORMATS = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'] as const;
export const TIME_FORMATS = ['HH:mm', 'hh:mm A'] as const;

export interface BusinessSettings {
  id: string;
  business_id: string;
  logo_url: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  tax_number: string;
  currency: string;
  date_format: string;
  time_format: string;
  receipt_header: string;
  receipt_footer: string;
  thank_you_message: string;
  created_at: string;
  updated_at: string;
}

export interface Receipt {
  id: string;
  business_id: string;
  sale_id: string;
  receipt_number: string;
  receipt_data: Record<string, unknown>;
  created_at: string;
}

export interface TopSellingProduct {
  business_id: string;
  product_name: string;
  total_quantity_sold: number;
  total_revenue: number;
  total_cogs: number;
  gross_profit: number;
  sale_count: number;
}

export interface ProductPerformance {
  id: string;
  business_id: string;
  name: string;
  remaining_stock: number;
  buying_price: number;
  selling_price: number;
  quantity_sold: number;
  revenue: number;
  cogs: number;
  gross_profit: number;
  stock_value: number;
  total_purchase_value: number;
}
