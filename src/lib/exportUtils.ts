// Export utilities: CSV, print-to-PDF (browser native)

import type { Sale, Expense, Product, Customer, MonthlySummary } from '../types';
import { fmtCurrency, saleCOGS, saleGrossProfit, formatDate, monthName } from './calculations';

// ── CSV helpers ──────────────────────────────────────────────────────────────

function toCSV(headers: string[], rows: (string | number)[][]): string {
  const escape = (v: string | number) => {
    const s = String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const lines = [headers, ...rows].map(row => row.map(escape).join(','));
  return lines.join('\n');
}

function downloadFile(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportSalesCSV(sales: Sale[]): void {
  const headers = ['Date', 'Product', 'Qty', 'Buying Price', 'Selling Price', 'Discount', 'Total', 'COGS', 'Gross Profit', 'Payment', 'Customer', 'Staff'];
  const rows = sales.map(s => [
    formatDate(s.sale_date), s.product_name, s.quantity_sold,
    fmtCurrency(s.buying_price), fmtCurrency(s.selling_price), fmtCurrency(s.discount),
    fmtCurrency(s.total_sale), fmtCurrency(saleCOGS(s)), fmtCurrency(saleGrossProfit(s)),
    s.payment_method, s.customer_name, s.staff_member,
  ]);
  downloadFile(toCSV(headers, rows), `traxxo-sales-${Date.now()}.csv`, 'text/csv');
}

export function exportInventoryCSV(products: Product[]): void {
  const headers = ['Name', 'Current Stock', 'Buying Price', 'Selling Price', 'Stock Value', 'Date Added', 'Month'];
  const rows = products.map(p => [
    p.name, p.quantity, fmtCurrency(p.buying_price), fmtCurrency(p.selling_price),
    fmtCurrency(p.quantity * p.buying_price), formatDate(p.date_added), p.purchase_month,
  ]);
  downloadFile(toCSV(headers, rows), `traxxo-inventory-${Date.now()}.csv`, 'text/csv');
}

export function exportExpensesCSV(expenses: Expense[]): void {
  const headers = ['Date', 'Category', 'Description', 'Amount'];
  const rows = expenses.map(e => [
    formatDate(e.expense_date), e.category, e.description, fmtCurrency(e.amount),
  ]);
  downloadFile(toCSV(headers, rows), `traxxo-expenses-${Date.now()}.csv`, 'text/csv');
}

export function exportMonthlySummaryCSV(data: MonthlySummary[]): void {
  const headers = ['Month', 'Sales', 'COGS', 'Expenses', 'Net Profit', 'Units Sold'];
  const rows = data.map(m => [
    monthName(m.month), fmtCurrency(m.sales), fmtCurrency(m.cogs),
    fmtCurrency(m.expenses), fmtCurrency(m.netProfit), m.unitsSold,
  ]);
  const totals = data.reduce(
    (acc, m) => ({
      sales: acc.sales + m.sales,
      cogs: acc.cogs + m.cogs,
      expenses: acc.expenses + m.expenses,
      netProfit: acc.netProfit + m.netProfit,
      unitsSold: acc.unitsSold + m.unitsSold,
    }),
    { sales: 0, cogs: 0, expenses: 0, netProfit: 0, unitsSold: 0 }
  );
  rows.push(['TOTAL', fmtCurrency(totals.sales), fmtCurrency(totals.cogs), fmtCurrency(totals.expenses), fmtCurrency(totals.netProfit), totals.unitsSold]);
  downloadFile(toCSV(headers, rows), `traxxo-annual-${Date.now()}.csv`, 'text/csv');
}

export function exportCustomersCSV(customers: Customer[]): void {
  const headers = ['Name', 'Phone', 'Credit Balance', 'Total Purchases'];
  const rows = customers.map(c => [
    c.name, c.phone, fmtCurrency(c.credit_balance), fmtCurrency(c.total_purchases),
  ]);
  downloadFile(toCSV(headers, rows), `traxxo-customers-${Date.now()}.csv`, 'text/csv');
}

/** Print the current page as PDF using browser print dialog */
export function printPage(): void {
  window.print();
}
