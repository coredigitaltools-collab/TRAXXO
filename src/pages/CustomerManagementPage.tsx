import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, Users, Phone, MapPin } from 'lucide-react';
import { useBusinessData } from '../contexts/BusinessDataContext';
import type { Customer } from '../types';
import { Modal, ConfirmModal } from '../components/ui/Modal';
import { SearchInput, FormField, EmptyState, Spinner } from '../components/ui/Common';
import { PageLayout } from '../components/layout/PageLayout';
import { fmtCurrency, today } from '../lib/calculations';
import { exportCustomersCSV } from '../lib/exportUtils';

const EMPTY_CUSTOMER = { name: '', phone: '', address: '', notes: '', credit_balance: 0, total_purchases: 0, date_created: today() };

interface CustomerListProps {
  onBack: () => void;
}

export function CustomerManagementPage({ onBack }: CustomerListProps) {
  const { customers, addCustomer, updateCustomer, deleteCustomer, sales } = useBusinessData();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState(EMPTY_CUSTOMER);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    if (!search) return customers;
    const q = search.toLowerCase();
    return customers.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q));
  }, [customers, search]);

  const totalCustomers = customers.length;
  const totalOutstanding = customers.reduce((s, c) => s + Math.max(0, c.credit_balance), 0);

  const openAdd = () => {
    setForm(EMPTY_CUSTOMER);
    setErrors({});
    setEditCustomer(null);
    setShowForm(true);
  };

  const openEdit = (c: Customer) => {
    setForm({
      name: c.name,
      phone: c.phone,
      address: c.address || '',
      notes: c.notes || '',
      credit_balance: c.credit_balance,
      total_purchases: c.total_purchases,
      date_created: c.date_created || today(),
    });
    setErrors({});
    setEditCustomer(c);
    setShowForm(true);
  };

  const set = (k: string, v: string | number) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(er => ({ ...er, [k]: '' }));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editCustomer) await updateCustomer(editCustomer.id, form);
      else await addCustomer(form);
      setShowForm(false);
    } catch (e) {
      setErrors({ _: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const getCustomerStats = (customerId: string) => {
    const customerSales = sales.filter(s => s.customer_id === customerId);
    const totalSpent = customerSales.reduce((s, x) => s + x.total_sale, 0);
    const purchaseCount = customerSales.length;
    return { totalSpent, purchaseCount };
  };

  return (
    <PageLayout
      title="Customers"
      onBack={onBack}
      description="Manage customer records and credit"
      actions={
        <button onClick={openAdd} className="btn btn-primary btn-sm">
          <Plus size={14} /> Add Customer
        </button>
      }
    >
      <div className="space-y-5">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalCustomers}</div>
            <div className="text-xs text-gray-500 mt-0.5">Total Customers</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-xl font-bold text-red-600 dark:text-red-400 tabular-nums">{fmtCurrency(totalOutstanding)}</div>
            <div className="text-xs text-gray-500 mt-0.5">Outstanding</div>
          </div>
          <div className="card p-4 text-center">
            <button onClick={() => exportCustomersCSV(customers)} className="btn btn-secondary btn-sm w-full">
              Export CSV
            </button>
          </div>
        </div>

        {/* Search */}
        <SearchInput value={search} onChange={setSearch} className="max-w-md" placeholder="Search customers…" />

        {/* Customer List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* List */}
          <div className="lg:col-span-1 card overflow-hidden">
            {filtered.length === 0 ? (
              <EmptyState icon={<Users size={32} />} title="No customers found"
                action={<button onClick={openAdd} className="btn btn-primary btn-sm"><Plus size={14} /> Add</button>} />
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {filtered.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCustomer(c)}
                    className={`w-full text-left px-4 py-3 transition-colors ${
                      selectedCustomer?.id === c.id ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                    }`}
                  >
                    <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">{c.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{c.phone || 'No phone'}</div>
                    {c.credit_balance !== 0 && (
                      <div className={`text-xs font-medium mt-1 ${c.credit_balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {c.credit_balance > 0 ? 'Owes' : 'Credit'}: {fmtCurrency(Math.abs(c.credit_balance))}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Detail Panel */}
          <div className="lg:col-span-2">
            {selectedCustomer ? (
              <div className="space-y-4">
                <div className="card p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{selectedCustomer.name}</h2>
                      <p className="text-xs text-gray-500 mt-0.5">Customer since {new Date(selectedCustomer.date_created + 'T00:00:00').toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(selectedCustomer)} className="btn btn-secondary btn-sm"><Pencil size={12} /></button>
                      <button onClick={() => setDeleteTarget(selectedCustomer)} className="btn btn-danger btn-sm"><Trash2 size={12} /></button>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm">
                    {selectedCustomer.phone && (
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Phone size={14} /> {selectedCustomer.phone}
                      </div>
                    )}
                    {selectedCustomer.address && (
                      <div className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
                        <MapPin size={14} className="mt-0.5" /> <span className="break-words">{selectedCustomer.address}</span>
                      </div>
                    )}
                    {selectedCustomer.notes && (
                      <div className="text-gray-600 dark:text-gray-400">
                        <p className="font-medium text-xs text-gray-500 mb-1">Notes</p>
                        <p>{selectedCustomer.notes}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 gap-3">
                  {(() => {
                    const stats = getCustomerStats(selectedCustomer.id);
                    return (
                      <>
                        <div className="card p-4 text-center">
                          <div className="text-lg font-bold text-blue-600 dark:text-blue-400 tabular-nums">{fmtCurrency(stats.totalSpent)}</div>
                          <div className="text-xs text-gray-500 mt-0.5">Total Spent</div>
                        </div>
                        <div className="card p-4 text-center">
                          <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{stats.purchaseCount}</div>
                          <div className="text-xs text-gray-500 mt-0.5">Purchases</div>
                        </div>
                        <div className="card p-4 text-center col-span-2">
                          <div className={`text-lg font-bold tabular-nums ${selectedCustomer.credit_balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {fmtCurrency(selectedCustomer.credit_balance)}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">{selectedCustomer.credit_balance > 0 ? 'Amount Owing' : 'Credit Balance'}</div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            ) : (
              <div className="card flex flex-col items-center justify-center h-full text-center py-16">
                <Users size={32} className="text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Select a customer to view details</p>
              </div>
            )}
          </div>
        </div>

        {/* Form Modal */}
        {showForm && (
          <Modal title={editCustomer ? 'Edit Customer' : 'Add Customer'} onClose={() => setShowForm(false)}>
            <div className="space-y-4">
              <FormField label="Name" required error={errors.name}>
                <input type="text" value={form.name} onChange={e => set('name', e.target.value)} className="input" autoFocus />
              </FormField>
              <FormField label="Phone">
                <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} className="input" placeholder="0712345678" />
              </FormField>
              <FormField label="Address">
                <textarea rows={2} value={form.address} onChange={e => set('address', e.target.value)} className="input resize-none" placeholder="Customer address" />
              </FormField>
              <FormField label="Notes">
                <textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} className="input resize-none" placeholder="Additional notes" />
              </FormField>
              {errors._ && <p className="text-xs text-red-500">{errors._}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="btn btn-secondary">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="btn btn-primary">
                  {saving ? <><Spinner size="sm" /> Saving…</> : editCustomer ? 'Update' : 'Add Customer'}
                </button>
              </div>
            </div>
          </Modal>
        )}

        {deleteTarget && (
          <ConfirmModal
            title="Delete Customer"
            message={`Delete customer "${deleteTarget.name}"? All associated data will be kept for records.`}
            confirmLabel="Delete"
            onConfirm={async () => {
              await deleteCustomer(deleteTarget.id);
              setDeleteTarget(null);
              setSelectedCustomer(null);
            }}
            onCancel={() => setDeleteTarget(null)}
          />
        )}
      </div>
    </PageLayout>
  );
}
