import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, Receipt } from 'lucide-react';
import { useBusinessData } from '../contexts/BusinessDataContext';
import type { Expense } from '../types';
import { Modal, ConfirmModal } from '../components/ui/Modal';
import { SearchInput, FormField, Select, EmptyState, Pagination, Spinner } from '../components/ui/Common';
import { PageLayout } from '../components/layout/PageLayout';
import { fmtCurrency, formatDate, today } from '../lib/calculations';
import { EXPENSE_CATEGORIES } from '../types';
import { exportExpensesCSV } from '../lib/exportUtils';

const EMPTY: Omit<Expense, 'id' | 'business_id' | 'created_at' | 'updated_at'> = {
  category: 'General', description: '', amount: 0, expense_date: today(),
};

export function ExpensesPage({ onBack }: { onBack?: () => void } = {}) {
  const { expenses, addExpense, updateExpense, deleteExpense } = useBusinessData();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Expense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [saving, setSaving] = useState(false);

  const PER_PAGE = 20;

  const filtered = useMemo(() => {
    let items = expenses;
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(e => e.description.toLowerCase().includes(q) || e.category.toLowerCase().includes(q));
    }
    if (categoryFilter) items = items.filter(e => e.category === categoryFilter);
    if (dateFilter) items = items.filter(e => e.expense_date === dateFilter);
    return items;
  }, [expenses, search, categoryFilter, dateFilter]);

  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalAmount = filtered.reduce((s, e) => s + e.amount, 0);

  // Category breakdown
  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(e => { map[e.category] = (map[e.category] ?? 0) + e.amount; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [expenses]);

  const set = (k: string, v: string | number) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(er => ({ ...er, [k]: '' }));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.description.trim()) errs.description = 'Required';
    if (form.amount <= 0) errs.amount = 'Must be > 0';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const openAdd = () => { setForm({ ...EMPTY }); setErrors({}); setEditTarget(null); setShowForm(true); };
  const openEdit = (e: Expense) => {
    setForm({ category: e.category, description: e.description, amount: e.amount, expense_date: e.expense_date });
    setErrors({}); setEditTarget(e); setShowForm(true);
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editTarget) await updateExpense(editTarget.id, form);
      else await addExpense(form);
      setShowForm(false);
    } catch (er) {
      setErrors({ _: (er as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout title="Expenses" onBack={onBack} description="Track and manage business expenses"
      actions={
        <>
          <button onClick={() => exportExpensesCSV(filtered)} className="btn btn-secondary btn-sm">CSV</button>
          <button onClick={openAdd} className="btn btn-primary btn-sm"><Plus size={14} /> Add</button>
        </>
      }
    >
      <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400 tabular-nums">{fmtCurrency(totalAmount)}</div>
          <div className="text-xs text-gray-500 mt-0.5">{categoryFilter || dateFilter ? 'Filtered Total' : 'Total Expenses'}</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{filtered.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">Transactions</div>
        </div>
        <div className="card p-4">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Top Categories</div>
          <div className="space-y-1.5">
            {byCategory.slice(0, 3).map(([cat, amt]) => (
              <div key={cat} className="flex justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400 truncate">{cat}</span>
                <span className="font-medium text-gray-900 dark:text-gray-100 tabular-nums">{fmtCurrency(amt)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); }} className="flex-1" placeholder="Search expenses…" />
        <Select
          value={categoryFilter}
          onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
          options={EXPENSE_CATEGORIES.map(c => ({ value: c, label: c }))}
          placeholder="All Categories"
          className="w-40"
        />
        <input type="date" value={dateFilter} onChange={e => { setDateFilter(e.target.value); setPage(1); }} className="input w-40" />
        {(categoryFilter || dateFilter) && <button onClick={() => { setCategoryFilter(''); setDateFilter(''); }} className="btn btn-secondary btn-sm">Clear</button>}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="table-container rounded-none border-0">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Description</th>
                <th>Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={5} className="py-0">
                  <EmptyState icon={<Receipt size={32} />} title="No expenses found"
                    action={<button onClick={openAdd} className="btn btn-primary btn-sm"><Plus size={14} /> Add Expense</button>} />
                </td></tr>
              ) : paged.map(e => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap">{formatDate(e.expense_date)}</td>
                  <td><span className="badge badge-gray">{e.category}</span></td>
                  <td className="text-gray-700 dark:text-gray-300">{e.description}</td>
                  <td className="tabular-nums font-semibold text-red-600 dark:text-red-400">{fmtCurrency(e.amount)}</td>
                  <td>
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => openEdit(e)} className="btn btn-secondary btn-sm"><Pencil size={12} /></button>
                      <button onClick={() => setDeleteTarget(e)} className="btn btn-danger btn-sm"><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination total={filtered.length} page={page} perPage={PER_PAGE} onPage={setPage} />
      </div>

      {showForm && (
        <Modal title={editTarget ? 'Edit Expense' : 'Add Expense'} onClose={() => setShowForm(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Category" required>
                <Select value={form.category} onChange={e => set('category', e.target.value)} options={EXPENSE_CATEGORIES.map(c => ({ value: c, label: c }))} />
              </FormField>
              <FormField label="Date">
                <input type="date" value={form.expense_date} onChange={e => set('expense_date', e.target.value)} className="input" />
              </FormField>
            </div>
            <FormField label="Description" required error={errors.description}>
              <input type="text" value={form.description} onChange={e => set('description', e.target.value)} className={`input ${errors.description ? 'input-error' : ''}`} placeholder="e.g. Shop rent for June" autoFocus />
            </FormField>
            <FormField label="Amount" required error={errors.amount}>
              <input type="number" min="0.01" step="0.01" value={form.amount} onChange={e => set('amount', parseFloat(e.target.value) || 0)} className={`input ${errors.amount ? 'input-error' : ''}`} />
            </FormField>
            {errors._ && <p className="text-xs text-red-500">{errors._}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowForm(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn btn-primary">
                {saving ? <><Spinner size="sm" /> Saving…</> : editTarget ? 'Update' : 'Add Expense'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmModal title="Delete Expense" message={`Delete "${deleteTarget.description}" (${fmtCurrency(deleteTarget.amount)})?`} confirmLabel="Delete" onConfirm={async () => { await deleteExpense(deleteTarget.id); setDeleteTarget(null); }} onCancel={() => setDeleteTarget(null)} />
      )}
      </div>
    </PageLayout>
  );
}
