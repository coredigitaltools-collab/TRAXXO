import { useState, useMemo, useEffect } from 'react';
import { Plus, Pencil, Trash2, ShoppingCart, Printer, History, Search as SearchIcon, X, Share2 } from 'lucide-react';
import { useBusinessData } from '../contexts/BusinessDataContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { Sale, BusinessSettings } from '../types';
import { Modal, ConfirmModal } from '../components/ui/Modal';
import { SearchInput, FormField, Select, EmptyState, Pagination, Spinner } from '../components/ui/Common';
import { PageLayout } from '../components/layout/PageLayout';
import { fmtCurrency, formatDate, today, saleCOGS, saleGrossProfit } from '../lib/calculations';
import { PAYMENT_METHODS } from '../types';
import { exportSalesCSV } from '../lib/exportUtils';
import { Receipt } from '../components/Receipt';

function generateReceiptNumber(): string {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${y}${m}${d}-${rand}`;
}

interface ReceiptRecord {
  id: string;
  sale_id: string | null;
  receipt_number: string;
  receipt_data: Record<string, unknown>;
  created_at: string;
}

const newSaleForm = () => ({
  product_id: '', product_name: '', quantity_sold: 1,
  buying_price: 0, selling_price: 0, discount: 0, total_sale: 0,
  payment_method: 'cash' as Sale['payment_method'],
  amount_paid: 0, change_amount: 0, customer_name: '', customer_id: '',
  staff_member: '', sale_date: today(),
});

export function SalesPage({ onBack }: { onBack?: () => void } = {}) {
  const { session } = useAuth();
  const { sales, products, customers, addSale, updateSale, deleteSale, addCustomer } = useBusinessData();

  const [tab, setTab] = useState<'sales' | 'history'>('sales');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [dateFilter, setDateFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Sale | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Sale | null>(null);
  const [form, setForm] = useState(newSaleForm());
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [saving, setSaving] = useState(false);
  const [receiptSale, setReceiptSale] = useState<Sale | null>(null);
  const [receiptNumber, setReceiptNumber] = useState('');
  const [settings, setSettings] = useState<Partial<BusinessSettings>>({});
  const [historyRecords, setHistoryRecords] = useState<ReceiptRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyDateFilter, setHistoryDateFilter] = useState('');
  const [historyCustomerFilter, setHistoryCustomerFilter] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const [replayReceipt, setReplayReceipt] = useState<{ sale: Sale; receiptNumber: string } | null>(null);

  const PER_PAGE = 20;
  const HISTORY_PER_PAGE = 20;

  useEffect(() => {
    if (!session?.businessId) return;
    supabase
      .from('business_settings')
      .select('*')
      .eq('business_id', session.businessId)
      .maybeSingle()
      .then(({ data }) => { if (data) setSettings(data as Partial<BusinessSettings>); });
  }, [session?.businessId]);

  const loadHistory = async () => {
    if (!session?.businessId) return;
    setHistoryLoading(true);
    const { data } = await supabase
      .from('receipt_records')
      .select('*')
      .eq('business_id', session.businessId)
      .order('created_at', { ascending: false });
    setHistoryRecords((data ?? []) as ReceiptRecord[]);
    setHistoryLoading(false);
  };

  useEffect(() => {
    if (tab === 'history') loadHistory();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const filtered = useMemo(() => {
    let items = sales;
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(s =>
        s.product_name.toLowerCase().includes(q) ||
        s.customer_name.toLowerCase().includes(q) ||
        s.staff_member.toLowerCase().includes(q)
      );
    }
    if (dateFilter) items = items.filter(s => s.sale_date === dateFilter);
    return items;
  }, [sales, search, dateFilter]);

  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalSalesAmt = filtered.reduce((s, x) => s + x.total_sale, 0);
  const totalCOGS = filtered.reduce((s, x) => s + saleCOGS(x), 0);
  const totalProfit = totalSalesAmt - totalCOGS;

  const filteredHistory = useMemo(() => {
    let items = historyRecords;
    if (historySearch) {
      const q = historySearch.toLowerCase();
      items = items.filter(r => {
        const d = r.receipt_data as Record<string, string>;
        return r.receipt_number.toLowerCase().includes(q) ||
          String(d.product_name ?? '').toLowerCase().includes(q) ||
          String(d.customer_name ?? '').toLowerCase().includes(q);
      });
    }
    if (historyDateFilter) {
      items = items.filter(r => r.created_at.startsWith(historyDateFilter));
    }
    if (historyCustomerFilter) {
      const q = historyCustomerFilter.toLowerCase();
      items = items.filter(r => {
        const d = r.receipt_data as Record<string, string>;
        return String(d.customer_name ?? '').toLowerCase().includes(q);
      });
    }
    return items;
  }, [historyRecords, historySearch, historyDateFilter, historyCustomerFilter]);

  const historyPaged = filteredHistory.slice((historyPage - 1) * HISTORY_PER_PAGE, historyPage * HISTORY_PER_PAGE);

  const set = (k: string, v: unknown) => {
    setForm(f => {
      const updated = { ...f, [k]: v };
      if (k === 'product_id') {
        const product = products.find(p => p.id === v);
        if (product) {
          updated.product_name = product.name;
          updated.buying_price = product.buying_price;
          updated.selling_price = product.selling_price;
        }
      }
      const rawTotal = (updated.quantity_sold * updated.selling_price) - updated.discount;
      updated.total_sale = Math.max(0, rawTotal);
      updated.change_amount = Math.max(0, updated.amount_paid - updated.total_sale);
      return updated;
    });
    setErrors(e => ({ ...e, [k]: '' }));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.product_name.trim()) errs.product_name = 'Required';
    if (form.quantity_sold <= 0) errs.quantity_sold = 'Must be > 0';
    if (form.selling_price <= 0) errs.selling_price = 'Must be > 0';
    if (form.payment_method === 'credit' && !form.customer_id) errs.customer_id = 'Select customer for credit sale';
    const product = products.find(p => p.id === form.product_id);
    if (product && form.quantity_sold > product.quantity && !editTarget) {
      errs.quantity_sold = `Only ${product.quantity} in stock`;
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const openAdd = () => { setForm(newSaleForm()); setErrors({}); setEditTarget(null); setShowForm(true); };
  const openEdit = (s: Sale) => {
    setForm({
      product_id: s.product_id ?? '', product_name: s.product_name,
      quantity_sold: s.quantity_sold, buying_price: s.buying_price, selling_price: s.selling_price,
      discount: s.discount, total_sale: s.total_sale,
      payment_method: s.payment_method, amount_paid: s.amount_paid,
      change_amount: s.change_amount, customer_name: s.customer_name,
      customer_id: s.customer_id ?? '', staff_member: s.staff_member, sale_date: s.sale_date,
    });
    setErrors({}); setEditTarget(s); setShowForm(true);
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      let customerId = form.customer_id;
      const customerName = form.customer_name;
      if (form.customer_name && !form.customer_id) {
        const existing = customers.find(c => c.name.toLowerCase() === form.customer_name.toLowerCase());
        if (existing) {
          customerId = existing.id;
        } else {
          const newC = await addCustomer({ name: form.customer_name, phone: '', credit_balance: 0, total_purchases: 0 });
          customerId = newC.id;
        }
      }
      const payload = {
        ...form,
        customer_id: customerId || undefined,
        product_id: form.product_id || undefined,
        customer_name: customerName,
      };
      if (editTarget) {
        await updateSale(editTarget.id, payload);
        setShowForm(false);
      } else {
        const saved = await addSale(payload);
        setShowForm(false);
        const rNum = generateReceiptNumber();
        setReceiptNumber(rNum);
        setReceiptSale(saved);
        if (session?.businessId) {
          await supabase.from('receipt_records').insert({
            business_id: session.businessId,
            sale_id: saved.id,
            receipt_number: rNum,
            receipt_data: {
              product_name: saved.product_name,
              customer_name: saved.customer_name,
              total_sale: saved.total_sale,
              sale_date: saved.sale_date,
              payment_method: saved.payment_method,
              quantity_sold: saved.quantity_sold,
              selling_price: saved.selling_price,
              discount: saved.discount,
              amount_paid: saved.amount_paid,
              change_amount: saved.change_amount,
              staff_member: saved.staff_member,
            },
          });
        }
      }
    } catch (e) {
      setErrors({ _: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const handleReplay = (record: ReceiptRecord) => {
    const sale = sales.find(s => s.id === record.sale_id);
    if (sale) {
      setReplayReceipt({ sale, receiptNumber: record.receipt_number });
    } else {
      const d = record.receipt_data as Record<string, unknown>;
      const fakeSale: Sale = {
        id: record.sale_id ?? '',
        business_id: session?.businessId ?? '',
        product_name: String(d.product_name ?? ''),
        customer_name: String(d.customer_name ?? ''),
        total_sale: Number(d.total_sale ?? 0),
        sale_date: String(d.sale_date ?? today()),
        payment_method: (d.payment_method ?? 'cash') as Sale['payment_method'],
        quantity_sold: Number(d.quantity_sold ?? 0),
        buying_price: Number(d.buying_price ?? 0),
        selling_price: Number(d.selling_price ?? 0),
        discount: Number(d.discount ?? 0),
        amount_paid: Number(d.amount_paid ?? 0),
        change_amount: Number(d.change_amount ?? 0),
        staff_member: String(d.staff_member ?? ''),
        created_at: record.created_at,
        updated_at: record.created_at,
      };
      setReplayReceipt({ sale: fakeSale, receiptNumber: record.receipt_number });
    }
  };

  const handleReplayWhatsApp = (record: ReceiptRecord) => {
    const d = record.receipt_data as Record<string, unknown>;
    const lines = [
      `*${(session?.businessName ?? 'Business').toUpperCase()}*`,
      '',
      `*Receipt #${record.receipt_number}*`,
      `Date: ${formatDate(String(d.sale_date ?? today()))}`,
      d.customer_name ? `Customer: ${d.customer_name}` : '',
      '',
      `*${d.product_name}*`,
      `*Total: ${fmtCurrency(Number(d.total_sale ?? 0))}*`,
      `Payment: ${String(d.payment_method ?? '').replace(/_/g, ' ').toUpperCase()}`,
      '',
      settings.thank_you_message ?? 'Thank you for your business!',
    ].filter(Boolean).join('\n');
    window.open(`https://wa.me/?text=${encodeURIComponent(lines)}`, '_blank');
  };

  return (
    <PageLayout
      title="Sales"
      onBack={onBack}
      description="Record and manage sales transactions"
      actions={
        <>
          <button onClick={() => exportSalesCSV(filtered)} className="btn btn-secondary btn-sm">CSV</button>
          <button onClick={openAdd} className="btn btn-primary btn-sm">
            <Plus size={14} /> New Sale
          </button>
        </>
      }
    >
      <div className="space-y-5">

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
          <button
            onClick={() => setTab('sales')}
            className={`btn btn-sm gap-1.5 ${tab === 'sales' ? 'btn-primary shadow-sm' : 'bg-transparent text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700'}`}
          >
            <ShoppingCart size={14} /> Sales
          </button>
          <button
            onClick={() => setTab('history')}
            className={`btn btn-sm gap-1.5 ${tab === 'history' ? 'btn-primary shadow-sm' : 'bg-transparent text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700'}`}
          >
            <History size={14} /> Receipt History
          </button>
        </div>

        {/* ── SALES TAB ── */}
        {tab === 'sales' && (
          <>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Total Revenue', value: fmtCurrency(totalSalesAmt), cls: 'text-blue-600 dark:text-blue-400' },
                { label: 'COGS', value: fmtCurrency(totalCOGS), cls: 'text-amber-600 dark:text-amber-400' },
                { label: 'Gross Profit', value: fmtCurrency(totalProfit), cls: totalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400' },
              ].map(item => (
                <div key={item.label} className="card p-4 text-center">
                  <div className={`text-lg font-bold tabular-nums ${item.cls}`}>{item.value}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.label}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); }} className="flex-1" placeholder="Search sales…" />
              <input type="date" value={dateFilter} onChange={e => { setDateFilter(e.target.value); setPage(1); }} className="input w-40" />
              {dateFilter && <button onClick={() => setDateFilter('')} className="btn btn-secondary btn-sm">Clear</button>}
            </div>

            <div className="card overflow-hidden">
              <div className="table-container rounded-none border-0">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th><th>Product</th><th>Qty</th><th>Price</th><th>Discount</th>
                      <th>Total</th><th>COGS</th><th>Gross Profit</th><th>Payment</th>
                      <th>Customer</th><th>Staff</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.length === 0 ? (
                      <tr><td colSpan={12} className="py-0">
                        <EmptyState icon={<ShoppingCart size={32} />} title="No sales found"
                          action={<button onClick={openAdd} className="btn btn-primary btn-sm"><Plus size={14} /> New Sale</button>} />
                      </td></tr>
                    ) : paged.map(s => (
                      <tr key={s.id}>
                        <td className="whitespace-nowrap">{formatDate(s.sale_date)}</td>
                        <td className="font-medium text-gray-900 dark:text-gray-100 max-w-xs truncate">{s.product_name}</td>
                        <td className="tabular-nums">{s.quantity_sold}</td>
                        <td className="tabular-nums">{fmtCurrency(s.selling_price)}</td>
                        <td className="tabular-nums">{s.discount > 0 ? fmtCurrency(s.discount) : '—'}</td>
                        <td className="tabular-nums font-semibold text-blue-600 dark:text-blue-400">{fmtCurrency(s.total_sale)}</td>
                        <td className="tabular-nums text-amber-600 dark:text-amber-400">{fmtCurrency(saleCOGS(s))}</td>
                        <td className={`tabular-nums font-medium ${saleGrossProfit(s) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'}`}>{fmtCurrency(saleGrossProfit(s))}</td>
                        <td><span className="badge badge-blue capitalize">{s.payment_method.replace('_', ' ')}</span></td>
                        <td className="text-gray-500 dark:text-gray-400">{s.customer_name || '—'}</td>
                        <td className="text-gray-500 dark:text-gray-400">{s.staff_member || '—'}</td>
                        <td>
                          <div className="flex gap-1 justify-end">
                            <button
                              onClick={() => { setReceiptSale(s); setReceiptNumber(generateReceiptNumber()); }}
                              className="btn btn-secondary btn-sm" title="View Receipt"
                            >
                              <Printer size={12} />
                            </button>
                            <button onClick={() => openEdit(s)} className="btn btn-secondary btn-sm"><Pencil size={12} /></button>
                            <button onClick={() => setDeleteTarget(s)} className="btn btn-danger btn-sm"><Trash2 size={12} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination total={filtered.length} page={page} perPage={PER_PAGE} onPage={setPage} />
            </div>
          </>
        )}

        {/* ── HISTORY TAB ── */}
        {tab === 'history' && (
          <>
            <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
              <div className="relative flex-1 min-w-48">
                <SearchIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="search"
                  value={historySearch}
                  onChange={e => { setHistorySearch(e.target.value); setHistoryPage(1); }}
                  placeholder="Search receipt #, product, customer…"
                  className="input pl-9"
                />
              </div>
              <input
                type="date"
                value={historyDateFilter}
                onChange={e => { setHistoryDateFilter(e.target.value); setHistoryPage(1); }}
                className="input w-44"
              />
              <input
                type="text"
                value={historyCustomerFilter}
                onChange={e => { setHistoryCustomerFilter(e.target.value); setHistoryPage(1); }}
                placeholder="Filter by customer"
                className="input w-44"
              />
              {(historySearch || historyDateFilter || historyCustomerFilter) && (
                <button
                  onClick={() => { setHistorySearch(''); setHistoryDateFilter(''); setHistoryCustomerFilter(''); }}
                  className="btn btn-secondary btn-sm"
                >
                  <X size={14} /> Clear
                </button>
              )}
            </div>

            {historyLoading ? (
              <div className="flex justify-center py-16"><Spinner size="lg" /></div>
            ) : (
              <div className="card overflow-hidden">
                <div className="table-container rounded-none border-0">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Receipt #</th><th>Date &amp; Time</th><th>Customer</th>
                        <th>Product</th><th>Total</th><th>Payment</th><th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyPaged.length === 0 ? (
                        <tr><td colSpan={7} className="py-0">
                          <EmptyState icon={<History size={32} />} title="No receipts yet"
                            description="Receipts appear here automatically after you record new sales." />
                        </td></tr>
                      ) : historyPaged.map(r => {
                        const d = r.receipt_data as Record<string, unknown>;
                        return (
                          <tr key={r.id}>
                            <td className="font-mono font-medium text-blue-600 dark:text-blue-400">{r.receipt_number}</td>
                            <td className="whitespace-nowrap text-gray-500 dark:text-gray-400 text-xs">
                              {new Date(r.created_at).toLocaleDateString('en', { day: '2-digit', month: 'short', year: 'numeric' })}
                              {' '}{new Date(r.created_at).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="text-gray-700 dark:text-gray-300">{String(d.customer_name || '—')}</td>
                            <td className="font-medium text-gray-900 dark:text-gray-100 max-w-xs truncate">{String(d.product_name ?? '—')}</td>
                            <td className="tabular-nums font-semibold text-blue-600 dark:text-blue-400">{fmtCurrency(Number(d.total_sale ?? 0))}</td>
                            <td><span className="badge badge-blue capitalize">{String(d.payment_method ?? '').replace('_', ' ')}</span></td>
                            <td>
                              <div className="flex gap-1 justify-end">
                                <button onClick={() => handleReplay(r)} className="btn btn-secondary btn-sm" title="View / Reprint">
                                  <Printer size={12} />
                                </button>
                                <button onClick={() => handleReplayWhatsApp(r)} className="btn btn-secondary btn-sm" title="Share via WhatsApp">
                                  <Share2 size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <Pagination total={filteredHistory.length} page={historyPage} perPage={HISTORY_PER_PAGE} onPage={setHistoryPage} />
              </div>
            )}
          </>
        )}

        {/* Sale Form Modal */}
        {showForm && (
          <Modal title={editTarget ? 'Edit Sale' : 'Record Sale'} onClose={() => setShowForm(false)} maxWidth="max-w-2xl">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Product" required error={errors.product_id}>
                  <Select
                    value={form.product_id}
                    onChange={e => set('product_id', e.target.value)}
                    placeholder="Select product"
                    options={products.map(p => ({ value: p.id, label: `${p.name} (${p.quantity} in stock)` }))}
                    className={errors.product_id ? 'input-error' : ''}
                  />
                </FormField>
                <FormField label="Date" error={errors.sale_date}>
                  <input type="date" value={form.sale_date} onChange={e => set('sale_date', e.target.value)} className="input" />
                </FormField>
              </div>

              {!form.product_id && (
                <FormField label="Or Enter Product Name" error={errors.product_name}>
                  <input type="text" value={form.product_name} onChange={e => setForm(f => ({ ...f, product_name: e.target.value }))} className="input" placeholder="Custom product name" />
                </FormField>
              )}

              <div className="grid grid-cols-3 gap-4">
                <FormField label="Quantity" required error={errors.quantity_sold}>
                  <input type="number" min="0.01" step="0.01" value={form.quantity_sold} onChange={e => set('quantity_sold', parseFloat(e.target.value) || 0)} className={`input ${errors.quantity_sold ? 'input-error' : ''}`} />
                </FormField>
                <FormField label="Selling Price" required error={errors.selling_price}>
                  <input type="number" min="0" step="0.01" value={form.selling_price} onChange={e => set('selling_price', parseFloat(e.target.value) || 0)} className="input" />
                </FormField>
                <FormField label="Discount">
                  <input type="number" min="0" step="0.01" value={form.discount} onChange={e => set('discount', parseFloat(e.target.value) || 0)} className="input" />
                </FormField>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-lg font-bold text-blue-600 dark:text-blue-400 tabular-nums">{fmtCurrency(form.total_sale)}</div>
                  <div className="text-xs text-gray-500">Total Sale</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-amber-600 dark:text-amber-400 tabular-nums">{fmtCurrency(form.quantity_sold * form.buying_price)}</div>
                  <div className="text-xs text-gray-500">COGS</div>
                </div>
                <div>
                  <div className={`text-lg font-bold tabular-nums ${(form.total_sale - form.quantity_sold * form.buying_price) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'}`}>
                    {fmtCurrency(form.total_sale - form.quantity_sold * form.buying_price)}
                  </div>
                  <div className="text-xs text-gray-500">Gross Profit</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Payment Method">
                  <Select value={form.payment_method} onChange={e => set('payment_method', e.target.value)} options={PAYMENT_METHODS.map(m => ({ value: m.value, label: m.label }))} />
                </FormField>
                <FormField label="Amount Paid">
                  <input type="number" min="0" step="0.01" value={form.amount_paid} onChange={e => set('amount_paid', parseFloat(e.target.value) || 0)} className="input" />
                </FormField>
              </div>

              {form.amount_paid > 0 && (
                <div className="text-sm font-medium text-center py-2 px-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400">
                  Change: {fmtCurrency(form.change_amount)}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Customer" error={errors.customer_id}>
                  <Select
                    value={form.customer_id}
                    onChange={e => {
                      set('customer_id', e.target.value);
                      const c = customers.find(x => x.id === e.target.value);
                      if (c) setForm(f => ({ ...f, customer_id: e.target.value, customer_name: c.name }));
                    }}
                    placeholder="Walk-in / No customer"
                    options={customers.map(c => ({ value: c.id, label: `${c.name} (bal: ${fmtCurrency(c.credit_balance)})` }))}
                    className={errors.customer_id ? 'input-error' : ''}
                  />
                </FormField>
                <FormField label="Staff Member">
                  <input type="text" value={form.staff_member} onChange={e => set('staff_member', e.target.value)} className="input" placeholder="Staff name" />
                </FormField>
              </div>

              {errors._ && <p className="text-xs text-red-500">{errors._}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="btn btn-secondary">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="btn btn-primary">
                  {saving ? <><Spinner size="sm" /> Saving&hellip;</> : editTarget ? 'Update Sale' : 'Record Sale'}
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* Auto receipt after new sale */}
        {receiptSale && (
          <Receipt
            sale={receiptSale}
            receiptNumber={receiptNumber}
            businessName={session?.businessName ?? 'Business'}
            settings={settings}
            onClose={() => setReceiptSale(null)}
          />
        )}

        {/* Replay receipt from history */}
        {replayReceipt && (
          <Receipt
            sale={replayReceipt.sale}
            receiptNumber={replayReceipt.receiptNumber}
            businessName={session?.businessName ?? 'Business'}
            settings={settings}
            onClose={() => setReplayReceipt(null)}
          />
        )}

        {/* Delete confirm */}
        {deleteTarget && (
          <ConfirmModal
            title="Delete Sale"
            message={`Delete sale of "${deleteTarget.product_name}" for ${fmtCurrency(deleteTarget.total_sale)}? Stock will be restored.`}
            confirmLabel="Delete"
            onConfirm={async () => { await deleteSale(deleteTarget.id); setDeleteTarget(null); }}
            onCancel={() => setDeleteTarget(null)}
          />
        )}
      </div>
    </PageLayout>
  );
}
