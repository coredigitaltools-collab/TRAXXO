import { useMemo, useState } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingBag, Package,
  CreditCard, Users, BarChart2, Activity, ArrowUpRight
} from 'lucide-react';
import { useBusinessData } from '../contexts/BusinessDataContext';
import { computeKPIs, computeMonthlyBreakdown, fmtCurrency, currentYearMonth, monthName, saleGrossProfit } from '../lib/calculations';
import { StatCard } from '../components/ui/Common';
import { PageLayout } from '../components/layout/PageLayout';

interface SimpleBarProps {
  data: { label: string; value: number; color?: string }[];
  maxValue?: number;
}

function SimpleBar({ data, maxValue }: SimpleBarProps) {
  const max = maxValue ?? Math.max(...data.map(d => d.value), 1);
  return (
    <div className="space-y-2">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-20 text-right text-xs text-gray-500 dark:text-gray-400 shrink-0 truncate">{d.label}</div>
          <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${d.color ?? 'bg-blue-500'}`}
              style={{ width: max > 0 ? `${(d.value / max) * 100}%` : '0%' }}
            />
          </div>
          <div className="w-20 text-xs font-medium text-gray-700 dark:text-gray-300 tabular-nums shrink-0">{fmtCurrency(d.value)}</div>
        </div>
      ))}
    </div>
  );
}

export function Dashboard() {
  const { sales, expenses, products, customers } = useBusinessData();
  const [selectedYear] = useState(new Date().getFullYear());

  const allKPIs = useMemo(() => computeKPIs(sales, expenses, products, customers), [sales, expenses, products, customers]);

  const curMonth = currentYearMonth();
  const monthSales = useMemo(() => sales.filter(s => s.sale_date.startsWith(curMonth)), [sales, curMonth]);
  const monthExpenses = useMemo(() => expenses.filter(e => e.expense_date.startsWith(curMonth)), [expenses, curMonth]);
  const monthKPIs = useMemo(() => computeKPIs(monthSales, monthExpenses, products, customers), [monthSales, monthExpenses, products, customers]);

  const monthly = useMemo(() => computeMonthlyBreakdown(sales, expenses, selectedYear), [sales, expenses, selectedYear]);
  const annualTotals = useMemo(() => monthly.reduce(
    (acc, m) => ({ sales: acc.sales + m.sales, cogs: acc.cogs + m.cogs, expenses: acc.expenses + m.expenses, netProfit: acc.netProfit + m.netProfit, unitsSold: acc.unitsSold + m.unitsSold }),
    { sales: 0, cogs: 0, expenses: 0, netProfit: 0, unitsSold: 0 }
  ), [monthly]);

  // Chart data: last 6 months of sales
  const chartData = useMemo(() => monthly.slice(-6).map(m => ({
    label: m.month.slice(5),
    value: m.sales,
    color: 'bg-blue-500',
  })), [monthly]);

  const profitChartData = useMemo(() => monthly.slice(-6).map(m => ({
    label: m.month.slice(5),
    value: Math.max(0, m.netProfit),
    color: m.netProfit >= 0 ? 'bg-emerald-500' : 'bg-red-500',
  })), [monthly]);

  const lowStockItems = products.filter(p => p.quantity <= 5).slice(0, 5);

  return (
    <PageLayout title="Dashboard" description="Real-time business overview and performance metrics">
      <div className="space-y-6">
      {/* Current month indicator */}
      <div className="text-xs font-medium px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg inline-block">
        {monthName(curMonth)} (This Month)
      </div>

      {/* KPI Grid — All-time */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
        <StatCard
          title="Total Sales"
          value={`${fmtCurrency(allKPIs.totalSales)}`}
          subtitle="All-time revenue"
          icon={<DollarSign size={18} />}
          color="blue"
        />
        <StatCard
          title="Net Profit"
          value={`${fmtCurrency(allKPIs.netProfit)}`}
          subtitle="After COGS & expenses"
          icon={allKPIs.netProfit >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
          color={allKPIs.netProfit >= 0 ? 'green' : 'red'}
        />
        <StatCard
          title="Total Expenses"
          value={`${fmtCurrency(allKPIs.totalExpenses)}`}
          subtitle="All categories"
          icon={<BarChart2 size={18} />}
          color="amber"
        />
        <StatCard
          title="Inventory Value"
          value={`${fmtCurrency(allKPIs.inventoryValue)}`}
          subtitle="At buying price"
          icon={<Package size={18} />}
          color="cyan"
        />
        <StatCard
          title="Current Stock"
          value={`${allKPIs.currentStock.toLocaleString()} units`}
          subtitle="Across all products"
          icon={<ShoppingBag size={18} />}
          color="teal"
        />
        <StatCard
          title="Units Sold"
          value={allKPIs.unitsSold.toLocaleString()}
          subtitle="All-time"
          icon={<Activity size={18} />}
          color="slate"
        />
        <StatCard
          title="Outstanding Credits"
          value={`${fmtCurrency(allKPIs.outstandingCredits)}`}
          subtitle="Owed by customers"
          icon={<CreditCard size={18} />}
          color="orange"
        />
        <StatCard
          title="Customers"
          value={customers.length.toLocaleString()}
          subtitle="Registered"
          icon={<Users size={18} />}
          color="blue"
        />
      </div>

      {/* This Month highlight */}
      <div className="card p-5">
        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <Activity size={16} className="text-blue-500" />
          {monthName(curMonth)} — Monthly Performance
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Sales', value: fmtCurrency(monthKPIs.totalSales), color: 'text-blue-600 dark:text-blue-400' },
            { label: 'COGS', value: fmtCurrency(monthKPIs.totalCOGS), color: 'text-amber-600 dark:text-amber-400' },
            { label: 'Expenses', value: fmtCurrency(monthKPIs.totalExpenses), color: 'text-red-600 dark:text-red-400' },
            { label: 'Net Profit', value: fmtCurrency(monthKPIs.netProfit), color: monthKPIs.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400' },
          ].map(item => (
            <div key={item.label} className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <div className={`text-lg font-bold tabular-nums ${item.color}`}>{item.value}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Sales trend chart */}
        <div className="card p-5">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-blue-500" />
            Sales — Last 6 Months
          </h3>
          {chartData.every(d => d.value === 0) ? (
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-8">No sales data yet</p>
          ) : (
            <SimpleBar data={chartData} />
          )}
        </div>

        {/* Profit trend chart */}
        <div className="card p-5">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <ArrowUpRight size={16} className="text-emerald-500" />
            Net Profit — Last 6 Months
          </h3>
          {profitChartData.every(d => d.value === 0) ? (
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-8">No profit data yet</p>
          ) : (
            <SimpleBar data={profitChartData} />
          )}
        </div>
      </div>

      {/* Top-Selling & Profitable Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top Selling Product */}
        <div className="card p-5">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-4">Top Selling Product (All-Time)</h3>
          {sales.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">No sales data yet</p>
          ) : (() => {
            const topProduct = useMemo(() => {
              const map: Record<string, { name: string; qty: number; revenue: number }> = {};
              sales.forEach(s => {
                const key = s.product_name;
                if (!map[key]) map[key] = { name: s.product_name, qty: 0, revenue: 0 };
                map[key].qty += s.quantity_sold;
                map[key].revenue += s.total_sale;
              });
              return Object.values(map).sort((a, b) => b.qty - a.qty)[0];
            }, [sales]);
            return topProduct ? (
              <div className="space-y-3">
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{topProduct.name}</div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-gray-500 dark:text-gray-400 text-xs">Units Sold</div>
                    <div className="font-bold text-gray-900 dark:text-gray-100">{topProduct.qty.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 dark:text-gray-400 text-xs">Revenue</div>
                    <div className="font-bold text-gray-900 dark:text-gray-100 tabular-nums">{fmtCurrency(topProduct.revenue)}</div>
                  </div>
                </div>
              </div>
            ) : null;
          })()}
        </div>

        {/* Most Profitable Product */}
        <div className="card p-5">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-4">Most Profitable Product (All-Time)</h3>
          {sales.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">No sales data yet</p>
          ) : (() => {
            const profitableProduct = useMemo(() => {
              const map: Record<string, { name: string; profit: number; revenue: number }> = {};
              sales.forEach(s => {
                const key = s.product_name;
                if (!map[key]) map[key] = { name: s.product_name, profit: 0, revenue: 0 };
                map[key].profit += saleGrossProfit(s);
                map[key].revenue += s.total_sale;
              });
              return Object.values(map).sort((a, b) => b.profit - a.profit)[0];
            }, [sales]);
            return profitableProduct ? (
              <div className="space-y-3">
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{profitableProduct.name}</div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-gray-500 dark:text-gray-400 text-xs">Gross Profit</div>
                    <div className="font-bold text-gray-900 dark:text-gray-100 tabular-nums">{fmtCurrency(profitableProduct.profit)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 dark:text-gray-400 text-xs">Revenue</div>
                    <div className="font-bold text-gray-900 dark:text-gray-100 tabular-nums">{fmtCurrency(profitableProduct.revenue)}</div>
                  </div>
                </div>
              </div>
            ) : null;
          })()}
        </div>
      </div>

      {/* Annual Summary Table */}
      <div className="card overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">{selectedYear} — Annual Summary</h3>
        </div>
        <div className="table-container rounded-none border-0">
          <table className="data-table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Sales</th>
                <th>COGS</th>
                <th>Expenses</th>
                <th>Net Profit</th>
                <th>Units Sold</th>
              </tr>
            </thead>
            <tbody>
              {monthly.map(m => (
                <tr key={m.month} className={m.month === curMonth ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}>
                  <td className="font-medium">{monthName(m.month)}</td>
                  <td className="tabular-nums">{fmtCurrency(m.sales)}</td>
                  <td className="tabular-nums text-amber-600 dark:text-amber-400">{fmtCurrency(m.cogs)}</td>
                  <td className="tabular-nums text-red-600 dark:text-red-400">{fmtCurrency(m.expenses)}</td>
                  <td className={`tabular-nums font-semibold ${m.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {fmtCurrency(m.netProfit)}
                  </td>
                  <td className="tabular-nums">{m.unitsSold.toLocaleString()}</td>
                </tr>
              ))}
              <tr className="bg-gray-50 dark:bg-gray-700/50 font-bold border-t-2 border-gray-200 dark:border-gray-600">
                <td>Total</td>
                <td className="tabular-nums text-blue-600 dark:text-blue-400">{fmtCurrency(annualTotals.sales)}</td>
                <td className="tabular-nums text-amber-600 dark:text-amber-400">{fmtCurrency(annualTotals.cogs)}</td>
                <td className="tabular-nums text-red-600 dark:text-red-400">{fmtCurrency(annualTotals.expenses)}</td>
                <td className={`tabular-nums ${annualTotals.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {fmtCurrency(annualTotals.netProfit)}
                </td>
                <td className="tabular-nums">{annualTotals.unitsSold.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <div className="card p-5 border-amber-200 dark:border-amber-800">
          <h3 className="text-sm font-bold text-amber-700 dark:text-amber-400 mb-3 flex items-center gap-2">
            <Package size={16} />
            Low Stock Alerts ({products.filter(p => p.quantity <= 5).length} items)
          </h3>
          <div className="space-y-2">
            {lowStockItems.map(p => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300">{p.name}</span>
                <span className={`badge ${p.quantity === 0 ? 'badge-red' : 'badge-yellow'}`}>
                  {p.quantity === 0 ? 'Out of Stock' : `${p.quantity} left`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>
    </PageLayout>
  );
}
