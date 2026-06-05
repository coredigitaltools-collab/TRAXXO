// Business logic calculations — pure functions, no side effects

import type { Sale, Expense, Product, Customer } from '../types';

export const fmt = (n: number, decimals = 2): string =>
  n.toLocaleString('en', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

export const fmtCurrency = (n: number): string => fmt(n, 2);

/** COGS for a single sale */
export const saleCOGS = (sale: Sale): number =>
  sale.quantity_sold * sale.buying_price;

/** Revenue from a single sale (after discount) */
export const saleRevenue = (sale: Sale): number => sale.total_sale;

/** Gross profit on a single sale */
export const saleGrossProfit = (sale: Sale): number =>
  saleRevenue(sale) - saleCOGS(sale);

/** Aggregate KPIs from raw data */
export function computeKPIs(
  sales: Sale[],
  expenses: Expense[],
  products: Product[],
  customers: Customer[]
) {
  const totalSales = sales.reduce((s, x) => s + x.total_sale, 0);
  const totalCOGS = sales.reduce((s, x) => s + saleCOGS(x), 0);
  const totalExpenses = expenses.reduce((s, x) => s + x.amount, 0);
  const netProfit = totalSales - totalCOGS - totalExpenses;

  // Stock value = current quantity × buying price (NEVER selling price)
  const inventoryValue = products.reduce((s, p) => s + p.quantity * p.buying_price, 0);
  const currentStock = products.reduce((s, p) => s + p.quantity, 0);
  const unitsSold = sales.reduce((s, x) => s + x.quantity_sold, 0);

  const outstandingCredits = customers.reduce((s, c) => s + Math.max(0, c.credit_balance), 0);
  const creditCollections = customers.reduce(
    (s, c) => s + (c.credit_balance < 0 ? Math.abs(c.credit_balance) : 0),
    0
  );

  return {
    totalSales,
    totalCOGS,
    totalExpenses,
    netProfit,
    inventoryValue,
    currentStock,
    unitsSold,
    outstandingCredits,
    creditCollections,
  };
}

/** Build monthly breakdown for a given year */
export function computeMonthlyBreakdown(
  sales: Sale[],
  expenses: Expense[],
  year: number
) {
  const months = Array.from({ length: 12 }, (_, i) => {
    const m = String(i + 1).padStart(2, '0');
    return `${year}-${m}`;
  });

  return months.map(month => {
    const mSales = sales.filter(s => s.sale_date.startsWith(month));
    const mExpenses = expenses.filter(e => e.expense_date.startsWith(month));

    const salesTotal = mSales.reduce((s, x) => s + x.total_sale, 0);
    const cogs = mSales.reduce((s, x) => s + saleCOGS(x), 0);
    const expensesTotal = mExpenses.reduce((s, x) => s + x.amount, 0);
    const netProfit = salesTotal - cogs - expensesTotal;
    const unitsSold = mSales.reduce((s, x) => s + x.quantity_sold, 0);

    return { month, sales: salesTotal, cogs, expenses: expensesTotal, netProfit, unitsSold };
  });
}

/** Filter sales/expenses to a date range (YYYY-MM-DD strings) */
export function filterByDateRange<T extends { sale_date?: string; expense_date?: string }>(
  items: T[],
  dateField: 'sale_date' | 'expense_date',
  from: string,
  to: string
): T[] {
  return items.filter(item => {
    const d = (item as Record<string, unknown>)[dateField] as string;
    return d >= from && d <= to;
  });
}

/** Get YYYY-MM from a date string */
export const toYearMonth = (dateStr: string): string => dateStr.slice(0, 7);

/** Current YYYY-MM */
export const currentYearMonth = (): string => new Date().toISOString().slice(0, 7);

/** Today's date as YYYY-MM-DD */
export const today = (): string => new Date().toISOString().slice(0, 10);

/** Format date for display */
export const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const monthName = (monthStr: string): string => {
  const [year, month] = monthStr.split('-');
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString('en', { month: 'short', year: 'numeric' });
};
