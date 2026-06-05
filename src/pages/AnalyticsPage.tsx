import { useMemo, useState } from 'react';
import { TrendingUp, BarChart2 } from 'lucide-react';
import { useBusinessData } from '../contexts/BusinessDataContext';
import { PageLayout } from '../components/layout/PageLayout';
import { computeMonthlyBreakdown, fmtCurrency, saleCOGS } from '../lib/calculations';

interface BarChartProps {
  data: { label: string; value: number; color: string }[];
  title: string;
  suffix?: string;
}

function BarChart({ data, title, suffix = '' }: BarChartProps) {
  const max = Math.max(...data.map(d => Math.abs(d.value)), 1);
  return (
    <div className="card p-5">
      <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-5">{title}</h3>
      <div className="flex items-end gap-2 h-36">
        {data.map((d, i) => {
          const pct = (Math.abs(d.value) / max) * 100;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
              <div className="relative w-full flex flex-col items-center justify-end h-28">
                <div
                  className={`w-full rounded-t-md transition-all duration-500 ${d.value >= 0 ? d.color : 'bg-red-400'}`}
                  style={{ height: `${pct}%`, minHeight: pct > 0 ? '4px' : '0' }}
                />
                <div className="absolute -top-5 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap bg-white dark:bg-gray-700 px-1.5 py-0.5 rounded shadow-sm border border-gray-100 dark:border-gray-600 z-10">
                  {suffix}{fmtCurrency(d.value)}
                </div>
              </div>
              <span className="text-[10px] text-gray-400 dark:text-gray-500">{d.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface DonutProps {
  data: { label: string; value: number; color: string }[];
  title: string;
}

function DonutChart({ data, title }: DonutProps) {
  const total = data.reduce((s, d) => s + d.value, 0);
  let offset = 0;
  const segments = data.map(d => {
    const pct = total > 0 ? (d.value / total) * 100 : 0;
    const seg = { ...d, pct, offset };
    offset += pct;
    return seg;
  });

  const circumference = 2 * Math.PI * 40;

  return (
    <div className="card p-5">
      <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-4">{title}</h3>
      {total === 0 ? (
        <p className="text-xs text-gray-400 text-center py-8">No data yet</p>
      ) : (
        <div className="flex items-center gap-6">
          <svg viewBox="0 0 100 100" className="w-28 h-28 shrink-0 -rotate-90">
            <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" className="text-gray-100 dark:text-gray-700" />
            {segments.map((seg, i) => (
              <circle
                key={i}
                cx="50" cy="50" r="40"
                fill="none"
                stroke={seg.color.replace('bg-', '').replace('-400', '')}
                strokeWidth="8"
                strokeDasharray={`${(seg.pct / 100) * circumference} ${circumference}`}
                strokeDashoffset={`${-(seg.offset / 100) * circumference}`}
                className={seg.color.replace('bg-', 'stroke-')}
              />
            ))}
          </svg>
          <div className="space-y-1.5 flex-1">
            {segments.map((seg, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${seg.color}`} />
                <span className="text-xs text-gray-600 dark:text-gray-400 flex-1 truncate">{seg.label}</span>
                <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 tabular-nums">{seg.pct.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function AnalyticsPage({ onBack }: { onBack?: () => void } = {}) {
  const { sales, expenses, products } = useBusinessData();
  const [year] = useState(new Date().getFullYear());

  const monthly = useMemo(() => computeMonthlyBreakdown(sales, expenses, year), [sales, expenses, year]);

  const salesData = monthly.map(m => ({ label: m.month.slice(5), value: m.sales, color: 'bg-blue-500' }));
  const profitData = monthly.map(m => ({ label: m.month.slice(5), value: m.netProfit, color: 'bg-emerald-500' }));
  const expenseData = monthly.map(m => ({ label: m.month.slice(5), value: m.expenses, color: 'bg-red-400' }));
  const cogsData = monthly.map(m => ({ label: m.month.slice(5), value: m.cogs, color: 'bg-amber-400' }));

  // Expense category donut
  const expenseByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(e => { map[e.category] = (map[e.category] ?? 0) + e.amount; });
    const colors = ['bg-red-400', 'bg-orange-400', 'bg-amber-400', 'bg-yellow-400', 'bg-lime-400', 'bg-emerald-400'];
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, value], i) => ({ label, value, color: colors[i % colors.length] }));
  }, [expenses]);

  // Payment method donut
  const paymentData = useMemo(() => {
    const map: Record<string, number> = {};
    sales.forEach(s => { map[s.payment_method] = (map[s.payment_method] ?? 0) + s.total_sale; });
    const colors = ['bg-blue-500', 'bg-cyan-400', 'bg-teal-400', 'bg-sky-400', 'bg-indigo-400'];
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([label, value], i) => ({ label: label.replace('_', ' '), value, color: colors[i % colors.length] }));
  }, [sales]);

  // Top 5 products by revenue
  const topProductData = useMemo(() => {
    const map: Record<string, number> = {};
    sales.forEach(s => { map[s.product_name] = (map[s.product_name] ?? 0) + s.total_sale; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, value]) => ({ label: label.length > 12 ? label.slice(0, 12) + '…' : label, value, color: 'bg-blue-500' }));
  }, [sales]);

  // Inventory value by product (top 5)
  const inventoryData = useMemo(() =>
    products.sort((a, b) => (b.quantity * b.buying_price) - (a.quantity * a.buying_price)).slice(0, 5).map(p => ({
      label: p.name.length > 12 ? p.name.slice(0, 12) + '…' : p.name,
      value: p.quantity * p.buying_price,
      color: 'bg-cyan-500',
    })), [products]);

  // Summary stats
  const totalSales = sales.reduce((s, x) => s + x.total_sale, 0);
  const totalCOGS = sales.reduce((s, x) => s + saleCOGS(x), 0);
  const grossMargin = totalSales > 0 ? ((totalSales - totalCOGS) / totalSales) * 100 : 0;
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const netProfit = totalSales - totalCOGS - totalExpenses;
  const netMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

  return (
    <PageLayout title="Analytics" onBack={onBack} description="Visual insights into business performance">
      <div className="space-y-5">
      {/* KPI metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Gross Margin', value: `${grossMargin.toFixed(1)}%`, cls: 'text-blue-600 dark:text-blue-400', icon: <TrendingUp size={16} /> },
          { label: 'Net Margin', value: `${netMargin.toFixed(1)}%`, cls: netMargin >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600', icon: <BarChart2 size={16} /> },
          { label: 'Total Revenue', value: fmtCurrency(totalSales), cls: 'text-blue-600 dark:text-blue-400', icon: <TrendingUp size={16} /> },
          { label: 'Net Profit', value: fmtCurrency(netProfit), cls: netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600', icon: <BarChart2 size={16} /> },
        ].map(item => (
          <div key={item.label} className="card p-4">
            <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 mb-2">{item.icon}<span className="text-xs">{item.label}</span></div>
            <div className={`text-xl font-bold tabular-nums ${item.cls}`}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Monthly charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <BarChart data={salesData} title={`Monthly Sales — ${year}`} />
        <BarChart data={profitData} title={`Monthly Net Profit — ${year}`} />
        <BarChart data={expenseData} title={`Monthly Expenses — ${year}`} />
        <BarChart data={cogsData} title={`Monthly COGS — ${year}`} />
      </div>

      {/* Donut charts + bar charts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <DonutChart data={expenseByCategory} title="Expenses by Category" />
        <DonutChart data={paymentData} title="Sales by Payment Method" />
        <BarChart data={topProductData} title="Top Products by Revenue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <BarChart data={inventoryData} title="Top Inventory by Value (Buying Price)" />

        {/* Profitability breakdown */}
        <div className="card p-5">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-4">Profitability Breakdown</h3>
          <div className="space-y-4">
            {[
              { label: 'Revenue', value: totalSales, pct: 100, color: 'bg-blue-500' },
              { label: 'COGS', value: totalCOGS, pct: totalSales > 0 ? (totalCOGS / totalSales) * 100 : 0, color: 'bg-amber-400' },
              { label: 'Gross Profit', value: totalSales - totalCOGS, pct: grossMargin, color: 'bg-teal-400' },
              { label: 'Expenses', value: totalExpenses, pct: totalSales > 0 ? (totalExpenses / totalSales) * 100 : 0, color: 'bg-red-400' },
              { label: 'Net Profit', value: netProfit, pct: Math.abs(netMargin), color: netProfit >= 0 ? 'bg-emerald-500' : 'bg-red-500' },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-400">{item.label}</span>
                  <span className="font-semibold tabular-nums text-gray-900 dark:text-gray-100">{fmtCurrency(item.value)} <span className="text-gray-400 font-normal text-xs">({item.pct.toFixed(1)}%)</span></span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${item.color}`} style={{ width: `${Math.min(100, Math.abs(item.pct))}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>
    </PageLayout>
  );
}
