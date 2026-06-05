import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, Package, AlertTriangle } from 'lucide-react';
import { useBusinessData } from '../contexts/BusinessDataContext';
import type { Product } from '../types';
import { Modal, ConfirmModal } from '../components/ui/Modal';
import { SearchInput, FormField, EmptyState, Pagination, Spinner } from '../components/ui/Common';
import { PageLayout } from '../components/layout/PageLayout';
import { fmtCurrency, formatDate, today } from '../lib/calculations';
import { exportInventoryCSV } from '../lib/exportUtils';

const EMPTY: Omit<Product, 'id' | 'business_id' | 'created_at' | 'updated_at'> = {
  name: '', quantity: 0, buying_price: 0, selling_price: 0,
  date_added: today(), purchase_month: today().slice(0, 7),
};

export function InventoryPage({ onBack }: { onBack?: () => void } = {}) {
  const { products, addProduct, updateProduct, deleteProduct } = useBusinessData();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');

  const PER_PAGE = 15;

  const filtered = useMemo(() => {
    let items = products;
    if (filter === 'low') items = items.filter(p => p.quantity > 0 && p.quantity <= 5);
    if (filter === 'out') items = items.filter(p => p.quantity === 0);
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(p => p.name.toLowerCase().includes(q));
    }
    return items;
  }, [products, search, filter]);

  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  // Stock Value = remaining quantity × buying price
  const stockValue = products.reduce((s, p) => s + p.quantity * p.buying_price, 0);
  // Purchase Value = original quantity × buying price (same formula, tracked per product)
  // Since we store current quantity, Purchase Value equals Stock Value here and is shown per-row too
  const totalPurchaseValue = products.reduce((s, p) => s + p.quantity * p.buying_price, 0);
  const totalUnits = products.reduce((s, p) => s + p.quantity, 0);

  const openAdd = () => { setForm({ ...EMPTY }); setErrors({}); setEditTarget(null); setShowForm(true); };
  const openEdit = (p: Product) => { setForm({ name: p.name, quantity: p.quantity, buying_price: p.buying_price, selling_price: p.selling_price, date_added: p.date_added, purchase_month: p.purchase_month }); setErrors({}); setEditTarget(p); setShowForm(true); };

  const set = (k: string, v: string | number) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: '' }));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Required';
    if (form.quantity < 0) errs.quantity = 'Cannot be negative';
    if (form.buying_price < 0) errs.buying_price = 'Cannot be negative';
    if (form.selling_price < 0) errs.selling_price = 'Cannot be negative';
    if (form.selling_price < form.buying_price && form.selling_price > 0)
      errs.selling_price = 'Selling price is below buying price';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editTarget) {
        await updateProduct(editTarget.id, form);
      } else {
        await addProduct(form);
      }
      setShowForm(false);
    } catch (e) {
      setErrors({ _: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteProduct(deleteTarget.id);
    setDeleteTarget(null);
  };

  const lowCount = products.filter(p => p.quantity > 0 && p.quantity <= 5).length;
  const outCount = products.filter(p => p.quantity === 0).length;

  return (
    <PageLayout title="Inventory" onBack={onBack} description="Manage products and stock levels"
      actions={
        <>
          <button onClick={() => exportInventoryCSV(products)} className="btn btn-secondary btn-sm">Export CSV</button>
          <button onClick={openAdd} className="btn btn-primary btn-sm">
            <Plus size={14} /> Add
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: 'Total Products', value: products.length, cls: 'text-blue-600 dark:text-blue-400', hint: 'SKUs in inventory' },
          { label: 'Total Units', value: totalUnits.toLocaleString(), cls: 'text-cyan-600 dark:text-cyan-400', hint: 'Sum of all current stock' },
          { label: 'Purchase Value', value: fmtCurrency(totalPurchaseValue), cls: 'text-violet-600 dark:text-violet-400', hint: 'Qty × Buying Price' },
          { label: 'Stock Value', value: fmtCurrency(stockValue), cls: 'text-emerald-600 dark:text-emerald-400', hint: 'Current stock worth' },
          { label: 'Low / Out', value: `${lowCount} / ${outCount}`, cls: outCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400', hint: 'Items needing restock' },
        ].map(item => (
          <div key={item.label} className="card p-4 text-center">
            <div className={`text-xl font-bold tabular-nums ${item.cls}`}>{item.value}</div>
            <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mt-0.5">{item.label}</div>
            <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{item.hint}</div>
          </div>
        ))}
      </div>

      {/* Filters and Search */}
      <div className="space-y-3">
        <div className="flex gap-2 flex-wrap">
          {(['all', 'low', 'out'] as const).map(f => (
            <button key={f} onClick={() => { setFilter(f); setPage(1); }}
              className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}>
              {f === 'all' ? 'All' : f === 'low' ? `Low Stock (${lowCount})` : `Out of Stock (${outCount})`}
            </button>
          ))}
        </div>
        <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); }} className="max-w-md" />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="table-container rounded-none border-0">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Current Stock</th>
                <th>Buying Price</th>
                <th>Selling Price</th>
                <th title="Current Stock × Buying Price — investment in this product">Purchase Value</th>
                <th title="Current stock remaining × Buying Price">Stock Value</th>
                <th>Date Added</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={9} className="py-0">
                  <EmptyState
                    icon={<Package size={32} />}
                    title="No inventory found"
                    description={search ? 'Try a different search term.' : 'Add your first product to get started.'}
                    action={!search ? <button onClick={openAdd} className="btn btn-primary btn-sm"><Plus size={14} /> Add Product</button> : undefined}
                  />
                </td></tr>
              ) : paged.map(p => (
                <tr key={p.id}>
                  <td className="font-medium text-gray-900 dark:text-gray-100">{p.name}</td>
                  <td className="tabular-nums font-semibold">{p.quantity}</td>
                  <td className="tabular-nums">{fmtCurrency(p.buying_price)}</td>
                  <td className="tabular-nums">{fmtCurrency(p.selling_price)}</td>
                  <td className="tabular-nums text-violet-600 dark:text-violet-400 font-medium">
                    {fmtCurrency(p.quantity * p.buying_price)}
                  </td>
                  <td className="tabular-nums text-emerald-600 dark:text-emerald-400 font-medium">
                    {fmtCurrency(p.quantity * p.buying_price)}
                  </td>
                  <td>{formatDate(p.date_added)}</td>
                  <td>
                    {p.quantity === 0
                      ? <span className="badge badge-red"><AlertTriangle size={10} className="mr-1" />Out</span>
                      : p.quantity <= 5
                      ? <span className="badge badge-yellow">Low</span>
                      : <span className="badge badge-green">OK</span>}
                  </td>
                  <td>
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => openEdit(p)} className="btn btn-secondary btn-sm"><Pencil size={12} /></button>
                      <button onClick={() => setDeleteTarget(p)} className="btn btn-danger btn-sm"><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination total={filtered.length} page={page} perPage={PER_PAGE} onPage={setPage} />
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <Modal title={editTarget ? 'Edit Product' : 'Add Product'} onClose={() => setShowForm(false)}>
          <div className="space-y-4">
            <FormField label="Product Name" required error={errors.name}>
              <input type="text" value={form.name} onChange={e => set('name', e.target.value)} className={`input ${errors.name ? 'input-error' : ''}`} placeholder="e.g. Paracetamol 500mg" autoFocus />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Current Stock" required error={errors.quantity}>
                <input type="number" min="0" step="0.01" value={form.quantity} onChange={e => set('quantity', parseFloat(e.target.value) || 0)} className={`input ${errors.quantity ? 'input-error' : ''}`} />
              </FormField>
              <FormField label="Date Added" error={errors.date_added}>
                <input type="date" value={form.date_added} onChange={e => { set('date_added', e.target.value); set('purchase_month', e.target.value.slice(0, 7)); }} className="input" />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Buying Price" required error={errors.buying_price} hint="Used for stock valuation & COGS">
                <input type="number" min="0" step="0.01" value={form.buying_price} onChange={e => set('buying_price', parseFloat(e.target.value) || 0)} className={`input ${errors.buying_price ? 'input-error' : ''}`} />
              </FormField>
              <FormField label="Selling Price" required error={errors.selling_price}>
                <input type="number" min="0" step="0.01" value={form.selling_price} onChange={e => set('selling_price', parseFloat(e.target.value) || 0)} className={`input ${errors.selling_price ? 'input-error' : ''}`} />
              </FormField>
            </div>

            {form.buying_price > 0 && form.selling_price > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-sm font-bold text-blue-700 dark:text-blue-400">{fmtCurrency(form.selling_price - form.buying_price)}</div>
                  <div className="text-xs text-gray-500 mt-0.5">Margin</div>
                </div>
                <div>
                  <div className="text-sm font-bold text-blue-700 dark:text-blue-400">
                    {form.buying_price > 0 ? `${(((form.selling_price - form.buying_price) / form.buying_price) * 100).toFixed(1)}%` : '—'}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">Markup</div>
                </div>
                <div>
                  <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{fmtCurrency(form.quantity * form.buying_price)}</div>
                  <div className="text-xs text-gray-500 mt-0.5">Stock Value</div>
                </div>
              </div>
            )}

            {errors._ && <p className="text-xs text-red-500">{errors._}</p>}

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowForm(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn btn-primary">
                {saving ? <><Spinner size="sm" /> Saving…</> : editTarget ? 'Update' : 'Add Product'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete Product"
          message={`Are you sure you want to delete "${deleteTarget.name}"? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </PageLayout>
  );
}
