import { useState, useMemo } from 'react';
import { Download, Printer, TrendingUp, Package, ShoppingCart, Receipt } from 'lucide-react';
import { useBusinessData } from '../contexts/BusinessDataContext';
import { PageLayout } from '../components/layout/PageLayout';
import { computeKPIs, computeMonthlyBreakdown, fmtCurrency, monthName, today, saleCOGS } from '../lib/calculations';
import { exportSalesCSV, exportInventoryCSV, exportExpensesCSV, exportMonthlySummaryCSV } from '../lib/exportUtils';

type ReportType = 'daily' | 'weekly' | 'monthly' | 'annual' | 'custom';

function dateRange(type: ReportType): { from: string; to: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (type === 'daily') return { from: fmt(now), to: fmt(now) };
  if (type === 'weekly') {
    const start = new Date(now); start.setDate(now.getDate() - 6);
    return { from: fmt(start), to: fmt(now) };
  }
  if (type === 'monthly') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: fmt(start), to: fmt(now) };
  }
  // annual
  return { from: `${now.getFullYear()}-01-01`, to: `${now.getFullYear()}-12-31` };
}

export function ReportsPage({ onBack }: { onBack?: () => void } = {}) {
  const { sales, expenses, products, customers } = useBusinessData();
  const [reportType, setReportType] = useState<ReportType>('monthly');
  const [customFrom, setCustomFrom] = useState(today());
  const [customTo, setCustomTo] = useState(today());

  const range = reportType === 'custom' ? { from: customFrom, to: customTo } : dateRange(reportType);

  const filteredSales = useMemo(() => sales.filter(s => s.sale_date >= range.from && s.sale_date <= range.to), [sales, range]);
  const filteredExpenses = useMemo(() => expenses.filter(e => e.expense_date >= range.from && e.expense_date <= range.to), [expenses, range]);

  const kpis = useMemo(() => computeKPIs(filteredSales, filteredExpenses, products, customers), [filteredSales, filteredExpenses, products, customers]);

  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; revenue: number; units: number; cogs: number }> = {};
    filteredSales.forEach(s => {
      const key = s.product_name;
      if (!map[key]) map[key] = { name: s.product_name, revenue: 0, units: 0, cogs: 0 };
      map[key].revenue += s.total_sale;
      map[key].units += s.quantity_sold;
      map[key].cogs += saleCOGS(s);
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [filteredSales]);

  const expenseByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses.forEach(e => { map[e.category] = (map[e.category] ?? 0) + e.amount; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filteredExpenses]);

  const paymentBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    filteredSales.forEach(s => { map[s.payment_method] = (map[s.payment_method] ?? 0) + s.total_sale; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filteredSales]);

  const annualData = useMemo(() => computeMonthlyBreakdown(sales, expenses, new Date().getFullYear()), [sales, expenses]);

  const TYPES: { id: ReportType; label: string }[] = [
    { id: 'daily', label: "Today" },
    { id: 'weekly', label: "This Week" },
    { id: 'monthly', label: "This Month" },
    { id: 'annual', label: "This Year" },
    { id: 'custom', label: "Custom" },
  ];

  return (
    <PageLayout title="Reports" onBack={onBack} description="Financial reports and business analytics">
      <div className="space-y-5">
      {/* Report type selector */}
      <div className="flex flex-wrap gap-2">
        {TYPES.map(t => (
          <button key={t.id} onClick={() => setReportType(t.id)} className={`btn btn-sm ${reportType === t.id ? 'btn-primary' : 'btn-secondary'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {reportType === 'custom' && (
        <div className="card p-4 flex flex-wrap gap-4 items-end">
          <div>
            <label className="label">From</label>
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="input w-40" />
          </div>
          <div>
            <label className="label">To</label>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="input w-40" />
          </div>
        </div>
      )}

      {/* Period info */}
      <div className="text-xs text-gray-500 dark:text-gray-400">
        Report period: <span className="font-medium text-gray-700 dark:text-gray-300">{range.from} to {range.to}</span>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Sales', value: fmtCurrency(kpis.totalSales), cls: 'text-blue-600 dark:text-blue-400' },
          { label: 'Total COGS', value: fmtCurrency(kpis.totalCOGS), cls: 'text-amber-600 dark:text-amber-400' },
          { label: 'Total Expenses', value: fmtCurrency(kpis.totalExpenses), cls: 'text-red-600 dark:text-red-400' },
          { label: 'Net Profit', value: fmtCurrency(kpis.netProfit), cls: kpis.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400' },
        ].map(item => (
          <div key={item.label} className="card p-4 text-center">
            <div className={`text-xl font-bold tabular-nums ${item.cls}`}>{item.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Additional stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4 text-center">
          <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{filteredSales.length}</div>
          <div className="text-xs text-gray-500">Transactions</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{kpis.unitsSold.toLocaleString()}</div>
          <div className="text-xs text-gray-500">Units Sold</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {filteredSales.length > 0 ? fmtCurrency(kpis.totalSales / filteredSales.length) : '0.00'}
          </div>
          <div className="text-xs text-gray-500">Avg Sale Value</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top Products */}
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <TrendingUp size={15} className="text-blue-500" />Top Products
            </h3>
            <button onClick={() => exportSalesCSV(filteredSales)} className="btn btn-secondary btn-sm">
              <Download size={12} /> Sales CSV
            </button>
          </div>
          {topProducts.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">No sales in this period</p>
          ) : (
            <div className="table-container rounded-none border-0">
              <table className="data-table">
                <thead><tr><th>Product</th><th>Units</th><th>Revenue</th><th>Gross Profit</th></tr></thead>
                <tbody>
                  {topProducts.map(p => (
                    <tr key={p.name}>
                      <td className="font-medium truncate max-w-[120px]">{p.name}</td>
                      <td className="tabular-nums">{p.units.toLocaleString()}</td>
                      <td className="tabular-nums text-blue-600 dark:text-blue-400">{fmtCurrency(p.revenue)}</td>
                      <td className={`tabular-nums font-medium ${(p.revenue - p.cogs) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'}`}>{fmtCurrency(p.revenue - p.cogs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Expense Breakdown */}
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Receipt size={15} className="text-red-500" /> Expenses by Category
            </h3>
            <button onClick={() => exportExpensesCSV(filteredExpenses)} className="btn btn-secondary btn-sm">
              <Download size={12} /> Expenses CSV
            </button>
          </div>
          {expenseByCategory.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">No expenses in this period</p>
          ) : (
            <div className="p-4 space-y-3">
              {expenseByCategory.map(([cat, amt]) => {
                const pct = kpis.totalExpenses > 0 ? (amt / kpis.totalExpenses) * 100 : 0;
                return (
                  <div key={cat}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 dark:text-gray-300">{cat}</span>
                      <span className="font-semibold tabular-nums text-gray-900 dark:text-gray-100">{fmtCurrency(amt)}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-red-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Payment Method Breakdown */}
        <div className="card p-5">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <ShoppingCart size={15} className="text-blue-500" /> Payment Methods
          </h3>
          {paymentBreakdown.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">No data</p>
          ) : (
            <div className="space-y-3">
              {paymentBreakdown.map(([method, amt]) => {
                const pct = kpis.totalSales > 0 ? (amt / kpis.totalSales) * 100 : 0;
                return (
                  <div key={method}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 dark:text-gray-300 capitalize">{method.replace('_', ' ')}</span>
                      <span className="font-semibold tabular-nums">{fmtCurrency(amt)} <span className="text-gray-400 font-normal">({pct.toFixed(1)}%)</span></span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Inventory Summary */}
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Package size={15} className="text-cyan-500" /> Inventory Status
            </h3>
            <button onClick={() => exportInventoryCSV(products)} className="btn btn-secondary btn-sm">
              <Download size={12} /> Inventory CSV
            </button>
          </div>
          <div className="p-4 grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <div className="text-xl font-bold text-gray-900 dark:text-gray-100">{products.length}</div>
              <div className="text-xs text-gray-500 mt-0.5">Total Products</div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <div className="text-xl font-bold text-cyan-600 dark:text-cyan-400 tabular-nums">{fmtCurrency(kpis.inventoryValue)}</div>
              <div className="text-xs text-gray-500 mt-0.5">Inventory Value</div>
            </div>
            <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
              <div className="text-xl font-bold text-amber-600 dark:text-amber-400">{products.filter(p => p.quantity > 0 && p.quantity <= 5).length}</div>
              <div className="text-xs text-gray-500 mt-0.5">Low Stock</div>
            </div>
            <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
              <div className="text-xl font-bold text-red-600 dark:text-red-400">{products.filter(p => p.quantity === 0).length}</div>
              <div className="text-xs text-gray-500 mt-0.5">Out of Stock</div>
            </div>
          </div>
        </div>
      </div>

      {/* Annual Monthly Table */}
      {reportType === 'annual' && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Monthly Breakdown — {new Date().getFullYear()}</h3>
            <button onClick={() => exportMonthlySummaryCSV(annualData)} className="btn btn-secondary btn-sm">
              <Download size={12} /> Annual CSV
            </button>
          </div>
          <div className="table-container rounded-none border-0">
            <table className="data-table">
              <thead><tr><th>Month</th><th>Sales</th><th>COGS</th><th>Expenses</th><th>Net Profit</th><th>Units Sold</th></tr></thead>
              <tbody>
                {annualData.map(m => (
                  <tr key={m.month}>
                    <td className="font-medium">{monthName(m.month)}</td>
                    <td className="tabular-nums text-blue-600 dark:text-blue-400">{fmtCurrency(m.sales)}</td>
                    <td className="tabular-nums text-amber-600 dark:text-amber-400">{fmtCurrency(m.cogs)}</td>
                    <td className="tabular-nums text-red-600 dark:text-red-400">{fmtCurrency(m.expenses)}</td>
                    <td className={`tabular-nums font-semibold ${m.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'}`}>{fmtCurrency(m.netProfit)}</td>
                    <td className="tabular-nums">{m.unitsSold.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {(() => {
                  const totals = annualData.reduce(
                    (acc, m) => ({
                      sales: acc.sales + m.sales,
                      cogs: acc.cogs + m.cogs,
                      expenses: acc.expenses + m.expenses,
                      netProfit: acc.netProfit + m.netProfit,
                      unitsSold: acc.unitsSold + m.unitsSold,
                    }),
                    { sales: 0, cogs: 0, expenses: 0, netProfit: 0, unitsSold: 0 }
                  );
                  return (
                    <tr className="bg-gray-50 dark:bg-gray-700/60 border-t-2 border-gray-200 dark:border-gray-600">
                      <td className="font-black text-gray-900 dark:text-gray-100 text-sm tracking-wide uppercase">Total</td>
                      <td className="tabular-nums font-black text-blue-700 dark:text-blue-300 text-sm">{fmtCurrency(totals.sales)}</td>
                      <td className="tabular-nums font-black text-amber-700 dark:text-amber-300 text-sm">{fmtCurrency(totals.cogs)}</td>
                      <td className="tabular-nums font-black text-red-700 dark:text-red-300 text-sm">{fmtCurrency(totals.expenses)}</td>
                      <td className={`tabular-nums font-black text-sm ${totals.netProfit >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>{fmtCurrency(totals.netProfit)}</td>
                      <td className="tabular-nums font-black text-gray-900 dark:text-gray-100 text-sm">{totals.unitsSold.toLocaleString()}</td>
                    </tr>
                  );
                })()}
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Print actions */}
      <div className="flex gap-3 justify-end">
        <button onClick={() => window.print()} className="btn btn-secondary">
          <Printer size={14} /> Print Report
        </button>
      </div>
      </div>
    </PageLayout>
  );
}
