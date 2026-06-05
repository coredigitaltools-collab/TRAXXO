import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { useBusinessData } from '../contexts/BusinessDataContext';
import { PageLayout } from '../components/layout/PageLayout';
import { Select } from '../components/ui/Common';
import { fmtCurrency, saleCOGS, saleGrossProfit } from '../lib/calculations';

interface TopSellingPageProps {
  onBack: () => void;
}

export function TopSellingProductsPage({ onBack }: TopSellingPageProps) {
  const { sales } = useBusinessData();
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'annual'>('monthly');

  const now = new Date();
  const getPeriodLabel = () => {
    const today = now.toISOString().split('T')[0];
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - now.getDay());
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisYearStart = new Date(now.getFullYear(), 0, 1);

    const fmt = (d: Date) => d.toISOString().split('T')[0];

    switch (period) {
      case 'daily': return { from: today, to: today, label: 'Today' };
      case 'weekly': return { from: fmt(thisWeekStart), to: today, label: 'This Week' };
      case 'monthly': return { from: fmt(thisMonthStart), to: today, label: 'This Month' };
      case 'annual': return { from: fmt(thisYearStart), to: today, label: 'This Year' };
    }
  };

  const periodData = getPeriodLabel();

  const topProducts = useMemo(() => {
    const filtered = sales.filter(s => s.sale_date >= periodData.from && s.sale_date <= periodData.to);
    const map: Record<string, {
      name: string;
      quantity: number;
      revenue: number;
      cogs: number;
      profit: number;
      profitMargin: number;
      transactions: number;
    }> = {};

    filtered.forEach(s => {
      const key = s.product_name;
      if (!map[key]) {
        map[key] = { name: s.product_name, quantity: 0, revenue: 0, cogs: 0, profit: 0, profitMargin: 0, transactions: 0 };
      }
      const cogs = saleCOGS(s);
      const profit = saleGrossProfit(s);
      map[key].quantity += s.quantity_sold;
      map[key].revenue += s.total_sale;
      map[key].cogs += cogs;
      map[key].profit += profit;
      map[key].transactions += 1;
    });

    return Object.values(map)
      .map(p => ({
        ...p,
        profitMargin: p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [sales, periodData]);

  const totals = useMemo(() => ({
    quantity: topProducts.reduce((s, p) => s + p.quantity, 0),
    revenue: topProducts.reduce((s, p) => s + p.revenue, 0),
    cogs: topProducts.reduce((s, p) => s + p.cogs, 0),
    profit: topProducts.reduce((s, p) => s + p.profit, 0),
  }), [topProducts]);

  const exportCSV = () => {
    const headers = ['Rank', 'Product Name', 'Units Sold', 'Total Revenue', 'Total COGS', 'Gross Profit', 'Profit Margin %', 'Transactions'];
    const rows = topProducts.map((p, i) => [
      i + 1,
      p.name,
      p.quantity,
      fmtCurrency(p.revenue),
      fmtCurrency(p.cogs),
      fmtCurrency(p.profit),
      p.profitMargin.toFixed(2),
      p.transactions,
    ]);

    const csv = [headers, ...rows].map(row => row.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `top-selling-products-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PageLayout
      title="Top Selling Products"
      onBack={onBack}
      description="Best performing products by revenue"
      actions={
        <button onClick={exportCSV} className="btn btn-secondary btn-sm">
          <Download size={14} /> Export CSV
        </button>
      }
    >
      <div className="space-y-5">
        {/* Period selector */}
        <div className="flex gap-3 items-end">
          <div>
            <label className="label">Report Period</label>
            <Select
              value={period}
              onChange={e => setPeriod(e.target.value as any)}
              options={[
                { value: 'daily', label: 'Daily' },
                { value: 'weekly', label: 'Weekly' },
                { value: 'monthly', label: 'Monthly' },
                { value: 'annual', label: 'Annual' },
              ]}
            />
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {periodData.label} • {periodData.from} to {periodData.to}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="card p-4 text-center">
            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{topProducts.length}</div>
            <div className="text-xs text-gray-500 mt-0.5">Unique Products</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-lg font-bold text-gray-900 dark:text-gray-100 tabular-nums">{totals.quantity.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-0.5">Units Sold</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-lg font-bold text-blue-600 dark:text-blue-400 tabular-nums">{fmtCurrency(totals.revenue)}</div>
            <div className="text-xs text-gray-500 mt-0.5">Total Revenue</div>
          </div>
          <div className="card p-4 text-center">
            <div className={`text-lg font-bold tabular-nums ${totals.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'}`}>
              {fmtCurrency(totals.profit)}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">Total Profit</div>
          </div>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <div className="table-container rounded-none border-0">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Product Name</th>
                  <th>Units Sold</th>
                  <th>Revenue</th>
                  <th>COGS</th>
                  <th>Gross Profit</th>
                  <th>Margin %</th>
                  <th>Transactions</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-gray-500">
                      No sales data for selected period
                    </td>
                  </tr>
                ) : (
                  topProducts.map((p, i) => (
                    <tr key={i}>
                      <td className="font-bold text-blue-600 dark:text-blue-400">#{i + 1}</td>
                      <td className="font-medium text-gray-900 dark:text-gray-100">{p.name}</td>
                      <td className="tabular-nums">{p.quantity.toLocaleString()}</td>
                      <td className="tabular-nums text-blue-600 dark:text-blue-400 font-medium">{fmtCurrency(p.revenue)}</td>
                      <td className="tabular-nums text-amber-600 dark:text-amber-400">{fmtCurrency(p.cogs)}</td>
                      <td className={`tabular-nums font-semibold ${p.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'}`}>
                        {fmtCurrency(p.profit)}
                      </td>
                      <td className="tabular-nums font-medium">{p.profitMargin.toFixed(1)}%</td>
                      <td className="text-center">{p.transactions}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top 3 Summary Cards */}
        {topProducts.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {topProducts.slice(0, 3).map((p, i) => (
              <div key={i} className="card p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                    i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-gray-400' : 'bg-orange-600'
                  }`}>
                    {i + 1}
                  </div>
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700">{p.transactions} sales</span>
                </div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3 line-clamp-2">{p.name}</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Units:</span>
                    <span className="font-semibold">{p.quantity.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Revenue:</span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">{fmtCurrency(p.revenue)}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-2">
                    <span className="text-gray-500">Profit:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{fmtCurrency(p.profit)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
