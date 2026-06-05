import { useMemo, useState } from 'react';
import { Download, Package } from 'lucide-react';
import { useBusinessData } from '../contexts/BusinessDataContext';
import { PageLayout } from '../components/layout/PageLayout';
import { SearchInput, EmptyState, Pagination } from '../components/ui/Common';
import { fmtCurrency } from '../lib/calculations';

interface StockSummaryPageProps {
  onBack: () => void;
}

export function StockSummaryPage({ onBack }: StockSummaryPageProps) {
  const { products, sales } = useBusinessData();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PER_PAGE = 15;

  const filtered = useMemo(() => {
    if (!search) return products;
    const q = search.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(q));
  }, [products, search]);

  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // Calculate quantity sold per product
  const quantitySoldMap = useMemo(() => {
    const map: Record<string, number> = {};
    sales.forEach(s => {
      map[s.product_id || s.product_name] = (map[s.product_id || s.product_name] ?? 0) + s.quantity_sold;
    });
    return map;
  }, [sales]);

  const totalStockValue = filtered.reduce((s, p) => s + p.quantity * p.buying_price, 0);

  const lowStockCount = filtered.filter(p => p.quantity > 0 && p.quantity <= 5).length;
  const outOfStockCount = filtered.filter(p => p.quantity === 0).length;

  const exportAsCSV = () => {
    const headers = ['Product Name', 'Qty Purchased', 'Qty Sold', 'Remaining Stock', 'Buying Price', 'Selling Price', 'Stock Value', 'Status'];
    const rows = paged.map(p => {
      const quantitySold = quantitySoldMap[p.id] || 0;
      const quantityPurchased = quantitySold + p.quantity;
      const stockValue = p.quantity * p.buying_price;
      const status = p.quantity === 0 ? 'Out of Stock' : p.quantity <= 5 ? 'Low Stock' : 'In Stock';

      return [
        p.name,
        quantityPurchased,
        quantitySold,
        p.quantity,
        fmtCurrency(p.buying_price),
        fmtCurrency(p.selling_price),
        fmtCurrency(stockValue),
        status,
      ];
    });

    const csv = [headers, ...rows].map(row => row.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-summary-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PageLayout
      title="Stock Summary"
      onBack={onBack}
      description="Complete inventory stock and purchase analysis"
      actions={
        <button onClick={exportAsCSV} className="btn btn-secondary btn-sm">
          <Download size={14} /> Export CSV
        </button>
      }
    >
      <div className="space-y-5">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="card p-4 text-center">
            <div className="text-xl font-bold text-gray-900 dark:text-gray-100">{products.length}</div>
            <div className="text-xs text-gray-500 mt-0.5">Total Products</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-lg font-bold text-cyan-600 dark:text-cyan-400 tabular-nums">{fmtCurrency(totalStockValue)}</div>
            <div className="text-xs text-gray-500 mt-0.5">Stock Value</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-lg font-bold text-amber-600 dark:text-amber-400 tabular-nums">{lowStockCount}</div>
            <div className="text-xs text-gray-500 mt-0.5">Low Stock</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-lg font-bold text-red-600 dark:text-red-400 tabular-nums">{outOfStockCount}</div>
            <div className="text-xs text-gray-500 mt-0.5">Out of Stock</div>
          </div>
        </div>

        {/* Search */}
        <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); }} className="max-w-md" placeholder="Search products…" />

        {/* Table */}
        <div className="card overflow-hidden">
          <div className="table-container rounded-none border-0">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Qty Purchased</th>
                  <th>Qty Sold</th>
                  <th>Remaining</th>
                  <th>Buying Price</th>
                  <th>Selling Price</th>
                  <th>Stock Value</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-0">
                      <EmptyState icon={<Package size={32} />} title="No products found" />
                    </td>
                  </tr>
                ) : (
                  paged.map(p => {
                    const quantitySold = quantitySoldMap[p.id] || 0;
                    const quantityPurchased = quantitySold + p.quantity;
                    const stockValue = p.quantity * p.buying_price;
                    const status = p.quantity === 0 ? 'Out of Stock' : p.quantity <= 5 ? 'Low Stock' : 'In Stock';

                    return (
                      <tr key={p.id}>
                        <td className="font-medium text-gray-900 dark:text-gray-100">{p.name}</td>
                        <td className="tabular-nums">{quantityPurchased}</td>
                        <td className="tabular-nums text-amber-600 dark:text-amber-400">{quantitySold}</td>
                        <td className="tabular-nums font-semibold">{p.quantity}</td>
                        <td className="tabular-nums">{fmtCurrency(p.buying_price)}</td>
                        <td className="tabular-nums">{fmtCurrency(p.selling_price)}</td>
                        <td className="tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">{fmtCurrency(stockValue)}</td>
                        <td>
                          <span className={`badge ${status === 'Out of Stock' ? 'badge-red' : status === 'Low Stock' ? 'badge-yellow' : 'badge-green'}`}>
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <Pagination total={filtered.length} page={page} perPage={PER_PAGE} onPage={setPage} />
        </div>
      </div>
    </PageLayout>
  );
}
