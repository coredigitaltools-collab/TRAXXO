import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Plus, Pencil, Trash2, Users, CreditCard, ArrowDownCircle, ArrowUpCircle,
  AlertTriangle, CheckCircle, Clock, Printer, Share2, FileText, X, RefreshCw,
} from 'lucide-react';
import { useBusinessData } from '../contexts/BusinessDataContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { Customer } from '../types';
import { Modal, ConfirmModal } from '../components/ui/Modal';
import { SearchInput, FormField, Select, EmptyState, Pagination, Spinner } from '../components/ui/Common';
import { PageLayout } from '../components/layout/PageLayout';
import { fmtCurrency, formatDate, today } from '../lib/calculations';
import { exportCustomersCSV } from '../lib/exportUtils';

// ── local types ────────────────────────────────────────────────────────────────

interface CreditRecord {
  id: string;
  business_id: string;
  customer_id: string;
  credit_date: string;
  due_date: string | null;
  description: string;
  credit_amount: number;
  initial_payment: number;
  amount_paid: number;
  outstanding: number;
  status: 'active' | 'partial' | 'settled' | 'overdue';
  notes: string;
  created_at: string;
  updated_at: string;
}

// ── helpers ────────────────────────────────────────────────────────────────────

function statusBadge(status: CreditRecord['status']) {
  const map: Record<CreditRecord['status'], string> = {
    active: 'badge badge-blue',
    partial: 'badge badge-yellow',
    settled: 'badge badge-green',
    overdue: 'badge badge-red',
  };
  const icons: Record<CreditRecord['status'], React.ReactNode> = {
    active: <Clock size={10} className="mr-1" />,
    partial: <RefreshCw size={10} className="mr-1" />,
    settled: <CheckCircle size={10} className="mr-1" />,
    overdue: <AlertTriangle size={10} className="mr-1" />,
  };
  return <span className={map[status]}>{icons[status]}{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
}

const EMPTY_CREDIT_FORM = {
  customer_id: '',
  customer_name_input: '',
  customer_phone_input: '',
  credit_date: today(),
  due_date: '',
  description: '',
  credit_amount: 0,
  initial_payment: 0,
  notes: '',
};

const EMPTY_PAYMENT_FORM = {
  amount: 0,
  payment_date: today(),
  notes: '',
};

const EMPTY_CUSTOMER = { name: '', phone: '', credit_balance: 0, total_purchases: 0 };

// ── component ──────────────────────────────────────────────────────────────────

export function CreditsPage({ onBack }: { onBack?: () => void } = {}) {
  const { session } = useAuth();
  const {
    customers, creditTransactions,
    addCustomer, updateCustomer, deleteCustomer,
  } = useBusinessData();

  // view tab
  const [tab, setTab] = useState<'credits' | 'customers'>('credits');

  // credit records state
  const [creditRecords, setCreditRecords] = useState<CreditRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  // filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | CreditRecord['status']>('all');
  const [page, setPage] = useState(1);

  // customer panel
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');

  // modals
  const [showCreditForm, setShowCreditForm] = useState(false);
  const [editCreditRecord, setEditCreditRecord] = useState<CreditRecord | null>(null);
  const [deleteCreditTarget, setDeleteCreditTarget] = useState<CreditRecord | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState<CreditRecord | null>(null);
  const [showStatement, setShowStatement] = useState<Customer | null>(null);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [deleteCustomerTarget, setDeleteCustomerTarget] = useState<Customer | null>(null);

  // forms
  const [creditForm, setCreditForm] = useState({ ...EMPTY_CREDIT_FORM });
  const [paymentForm, setPaymentForm] = useState({ ...EMPTY_PAYMENT_FORM });
  const [customerForm, setCustomerForm] = useState({ ...EMPTY_CUSTOMER });
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [saving, setSaving] = useState(false);

  const PER_PAGE = 20;

  // ── load credit records ────────────────────────────────────────────────────

  const loadCreditRecords = useCallback(async () => {
    if (!session?.businessId) return;
    setLoadingRecords(true);
    const { data } = await supabase
      .from('credit_records')
      .select('*')
      .eq('business_id', session.businessId)
      .order('created_at', { ascending: false });
    // auto-mark overdue
    const now = today();
    const records = ((data ?? []) as CreditRecord[]).map(r => ({
      ...r,
      status: (r.outstanding <= 0
        ? 'settled'
        : r.due_date && r.due_date < now
          ? 'overdue'
          : r.amount_paid > 0
            ? 'partial'
            : 'active') as CreditRecord['status'],
    }));
    setCreditRecords(records);
    setLoadingRecords(false);
  }, [session?.businessId]);

  useEffect(() => { loadCreditRecords(); }, [loadCreditRecords]);

  // ── dashboard stats ────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const withCredit = customers.filter(c => c.credit_balance > 0);
    const totalOutstanding = creditRecords.reduce((s, r) => s + r.outstanding, 0);
    const totalIssued = creditRecords.reduce((s, r) => s + r.credit_amount, 0);
    const totalCollected = creditRecords.reduce((s, r) => s + r.amount_paid + r.initial_payment, 0);
    const overdue = creditRecords.filter(r => r.status === 'overdue').reduce((s, r) => s + r.outstanding, 0);
    return { customersWithCredit: withCredit.length, totalOutstanding, totalIssued, totalCollected, overdue };
  }, [customers, creditRecords]);

  // ── filtered credits ───────────────────────────────────────────────────────

  const filteredCredits = useMemo(() => {
    let items = creditRecords;
    if (statusFilter !== 'all') items = items.filter(r => r.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(r => {
        const cust = customers.find(c => c.id === r.customer_id);
        return (cust?.name ?? '').toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q);
      });
    }
    return items;
  }, [creditRecords, statusFilter, search, customers]);

  const pagedCredits = filteredCredits.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // ── filtered customers ─────────────────────────────────────────────────────

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers;
    const q = customerSearch.toLowerCase();
    return customers.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q));
  }, [customers, customerSearch]);

  const customerTxns = useMemo(
    () => selectedCustomer
      ? creditTransactions
          .filter(t => t.customer_id === selectedCustomer.id)
          .sort((a, b) => b.transaction_date.localeCompare(a.transaction_date))
      : [],
    [creditTransactions, selectedCustomer]
  );

  const customerCredits = useMemo(
    () => selectedCustomer ? creditRecords.filter(r => r.customer_id === selectedCustomer.id) : [],
    [creditRecords, selectedCustomer]
  );

  // ── credit form ────────────────────────────────────────────────────────────

  const outstanding = Math.max(0, (creditForm.credit_amount || 0) - (creditForm.initial_payment || 0));

  const openAddCredit = () => {
    setCreditForm({ ...EMPTY_CREDIT_FORM });
    setErrors({});
    setEditCreditRecord(null);
    setShowCreditForm(true);
  };

  const openEditCredit = (r: CreditRecord) => {
    const cust = customers.find(c => c.id === r.customer_id);
    setCreditForm({
      customer_id: r.customer_id,
      customer_name_input: cust?.name ?? '',
      customer_phone_input: cust?.phone ?? '',
      credit_date: r.credit_date,
      due_date: r.due_date ?? '',
      description: r.description,
      credit_amount: r.credit_amount,
      initial_payment: r.initial_payment,
      notes: r.notes,
    });
    setErrors({});
    setEditCreditRecord(r);
    setShowCreditForm(true);
  };

  const validateCredit = () => {
    const errs: Record<string, string> = {};
    if (!creditForm.customer_id && !creditForm.customer_name_input.trim()) errs.customer_name_input = 'Customer required';
    if (!creditForm.description.trim()) errs.description = 'Required';
    if (creditForm.credit_amount <= 0) errs.credit_amount = 'Must be > 0';
    if (creditForm.initial_payment < 0) errs.initial_payment = 'Cannot be negative';
    if (creditForm.initial_payment > creditForm.credit_amount) errs.initial_payment = 'Cannot exceed credit amount';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveCredit = async () => {
    if (!validateCredit()) return;
    setSaving(true);
    try {
      let customerId = creditForm.customer_id;

      // resolve or create customer
      if (!customerId && creditForm.customer_name_input.trim()) {
        const existing = customers.find(c => c.name.toLowerCase() === creditForm.customer_name_input.toLowerCase());
        if (existing) {
          customerId = existing.id;
        } else {
          const newC = await addCustomer({
            name: creditForm.customer_name_input.trim(),
            phone: creditForm.customer_phone_input.trim(),
            credit_balance: 0,
            total_purchases: 0,
          });
          customerId = newC.id;
        }
      }

      const amt = creditForm.credit_amount;
      const init = creditForm.initial_payment;
      const outstandingAmt = Math.max(0, amt - init);
      const newStatus: CreditRecord['status'] = outstandingAmt <= 0 ? 'settled'
        : init > 0 ? 'partial'
        : 'active';

      if (editCreditRecord) {
        await supabase.from('credit_records').update({
          customer_id: customerId,
          credit_date: creditForm.credit_date,
          due_date: creditForm.due_date || null,
          description: creditForm.description,
          credit_amount: amt,
          initial_payment: init,
          outstanding: outstandingAmt,
          status: newStatus,
          notes: creditForm.notes,
          updated_at: new Date().toISOString(),
        }).eq('id', editCreditRecord.id);

        // update customer balance delta
        const delta = outstandingAmt - editCreditRecord.outstanding;
        if (delta !== 0) {
          const cust = customers.find(c => c.id === customerId);
          if (cust) {
            await supabase.from('customers').update({
              credit_balance: cust.credit_balance + delta,
              updated_at: new Date().toISOString(),
            }).eq('id', customerId);
          }
        }
      } else {
        await supabase.from('credit_records').insert({
          business_id: session!.businessId,
          customer_id: customerId,
          credit_date: creditForm.credit_date,
          due_date: creditForm.due_date || null,
          description: creditForm.description,
          credit_amount: amt,
          initial_payment: init,
          amount_paid: 0,
          outstanding: outstandingAmt,
          status: newStatus,
          notes: creditForm.notes,
        });

        // update customer balance
        const cust = customers.find(c => c.id === customerId);
        if (cust) {
          await supabase.from('customers').update({
            credit_balance: cust.credit_balance + outstandingAmt,
            updated_at: new Date().toISOString(),
          }).eq('id', customerId);
        }

        // record credit transaction
        if (outstandingAmt > 0) {
          const cust2 = customers.find(c => c.id === customerId);
          const newBal = (cust2?.credit_balance ?? 0) + outstandingAmt;
          await supabase.from('credit_transactions').insert({
            business_id: session!.businessId,
            customer_id: customerId,
            transaction_type: 'credit_sale',
            amount: amt,
            balance_after: newBal,
            description: creditForm.description,
            transaction_date: creditForm.credit_date,
          });
        }

        // record initial payment if any
        if (init > 0) {
          const cust3 = customers.find(c => c.id === customerId);
          const balAfterPay = (cust3?.credit_balance ?? 0) + outstandingAmt - init;
          await supabase.from('credit_transactions').insert({
            business_id: session!.businessId,
            customer_id: customerId,
            transaction_type: 'payment',
            amount: init,
            balance_after: balAfterPay,
            description: `Initial payment for: ${creditForm.description}`,
            transaction_date: creditForm.credit_date,
          });
        }
      }

      await loadCreditRecords();
      setShowCreditForm(false);
    } catch (e) {
      setErrors({ _: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  // ── record payment ─────────────────────────────────────────────────────────

  const handleRecordPayment = async () => {
    const rec = showPaymentModal;
    if (!rec) return;
    if (paymentForm.amount <= 0) { setErrors({ amount: 'Must be > 0' }); return; }
    if (paymentForm.amount > rec.outstanding) { setErrors({ amount: 'Cannot exceed outstanding balance' }); return; }
    setSaving(true);
    try {
      const newAmountPaid = rec.amount_paid + paymentForm.amount;
      const newOutstanding = Math.max(0, rec.outstanding - paymentForm.amount);
      const newStatus: CreditRecord['status'] = newOutstanding <= 0 ? 'settled'
        : newAmountPaid > 0 ? 'partial'
        : 'active';

      await supabase.from('credit_records').update({
        amount_paid: newAmountPaid,
        outstanding: newOutstanding,
        status: newStatus,
        updated_at: new Date().toISOString(),
      }).eq('id', rec.id);

      // update customer balance
      const cust = customers.find(c => c.id === rec.customer_id);
      if (cust) {
        const newBal = Math.max(0, cust.credit_balance - paymentForm.amount);
        await supabase.from('customers').update({
          credit_balance: newBal,
          updated_at: new Date().toISOString(),
        }).eq('id', rec.customer_id);

        await supabase.from('credit_transactions').insert({
          business_id: session!.businessId,
          customer_id: rec.customer_id,
          transaction_type: 'payment',
          amount: paymentForm.amount,
          balance_after: newBal,
          description: paymentForm.notes || `Payment for: ${rec.description}`,
          transaction_date: paymentForm.payment_date,
        });
      }

      await loadCreditRecords();
      setShowPaymentModal(null);
    } catch (e) {
      setErrors({ _: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  // ── delete credit record ───────────────────────────────────────────────────

  const handleDeleteCredit = async () => {
    const rec = deleteCreditTarget;
    if (!rec) return;
    // restore customer balance
    const cust = customers.find(c => c.id === rec.customer_id);
    if (cust && rec.outstanding > 0) {
      await supabase.from('customers').update({
        credit_balance: Math.max(0, cust.credit_balance - rec.outstanding),
        updated_at: new Date().toISOString(),
      }).eq('id', rec.customer_id);
    }
    await supabase.from('credit_records').delete().eq('id', rec.id);
    await loadCreditRecords();
    setDeleteCreditTarget(null);
  };

  // ── customer form ──────────────────────────────────────────────────────────

  const handleSaveCustomer = async () => {
    if (!customerForm.name.trim()) { setErrors({ name: 'Required' }); return; }
    setSaving(true);
    try {
      if (editCustomer) await updateCustomer(editCustomer.id, customerForm);
      else await addCustomer(customerForm);
      setShowCustomerForm(false);
    } catch (e) { setErrors({ _: (e as Error).message }); }
    finally { setSaving(false); }
  };

  // ── statement printer ──────────────────────────────────────────────────────

  const printStatement = (cust: Customer) => {
    const recs = creditRecords.filter(r => r.customer_id === cust.id);
    const txns = creditTransactions.filter(t => t.customer_id === cust.id).sort((a, b) => a.transaction_date.localeCompare(b.transaction_date));
    const totalIssued = recs.reduce((s, r) => s + r.credit_amount, 0);
    const totalPaid = recs.reduce((s, r) => s + r.amount_paid + r.initial_payment, 0);
    const totalOutstanding = recs.reduce((s, r) => s + r.outstanding, 0);

    const html = `<!DOCTYPE html><html><head><title>Statement - ${cust.name}</title>
    <style>
      body{font-family:Arial,sans-serif;padding:24px;color:#111;font-size:13px}
      h1{font-size:20px;margin-bottom:4px}
      .meta{color:#555;font-size:12px;margin-bottom:20px}
      table{width:100%;border-collapse:collapse;margin-top:12px}
      th{background:#f0f0f0;text-align:left;padding:8px;font-size:11px;text-transform:uppercase}
      td{padding:8px;border-bottom:1px solid #eee;font-size:12px}
      .totals{margin-top:16px;background:#f9f9f9;padding:12px;border-radius:6px}
      .totals div{display:flex;justify-content:space-between;padding:4px 0;font-size:13px}
      .bold{font-weight:bold}
      .red{color:#c00}
      .green{color:#060}
      @media print{@page{margin:16mm}}
    </style></head><body>
    <h1>${cust.name}</h1>
    <div class="meta">${cust.phone ? 'Phone: ' + cust.phone + ' &nbsp;|&nbsp; ' : ''}Statement generated: ${new Date().toLocaleDateString()}</div>
    <h3>Credit Records</h3>
    <table>
      <thead><tr><th>Date</th><th>Description</th><th>Credit</th><th>Paid</th><th>Outstanding</th><th>Status</th></tr></thead>
      <tbody>
        ${recs.length === 0 ? '<tr><td colspan="6" style="text-align:center;color:#888">No credit records</td></tr>' :
          recs.map(r => `<tr>
            <td>${formatDate(r.credit_date)}</td>
            <td>${r.description}</td>
            <td class="bold">${fmtCurrency(r.credit_amount)}</td>
            <td class="green">${fmtCurrency(r.amount_paid + r.initial_payment)}</td>
            <td class="${r.outstanding > 0 ? 'red bold' : ''}">${fmtCurrency(r.outstanding)}</td>
            <td>${r.status}</td>
          </tr>`).join('')}
      </tbody>
    </table>
    <h3 style="margin-top:24px">Payment History</h3>
    <table>
      <thead><tr><th>Date</th><th>Description</th><th>Amount</th><th>Balance After</th></tr></thead>
      <tbody>
        ${txns.length === 0 ? '<tr><td colspan="4" style="text-align:center;color:#888">No transactions</td></tr>' :
          txns.map(t => `<tr>
            <td>${formatDate(t.transaction_date)}</td>
            <td>${t.description}</td>
            <td class="${t.transaction_type === 'payment' ? 'green' : 'red'}">${t.transaction_type === 'payment' ? '-' : '+'}${fmtCurrency(t.amount)}</td>
            <td>${fmtCurrency(t.balance_after)}</td>
          </tr>`).join('')}
      </tbody>
    </table>
    <div class="totals">
      <div><span>Total Credit Issued</span><span class="bold">${fmtCurrency(totalIssued)}</span></div>
      <div><span>Total Paid</span><span class="green bold">${fmtCurrency(totalPaid)}</span></div>
      <div><span class="bold">Outstanding Balance</span><span class="${totalOutstanding > 0 ? 'red bold' : 'green bold'}">${fmtCurrency(totalOutstanding)}</span></div>
    </div>
    </body></html>`;

    const win = window.open('', '_blank', 'width=700,height=900');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  };

  const shareStatementWhatsApp = (cust: Customer) => {
    const recs = creditRecords.filter(r => r.customer_id === cust.id);
    const totalOutstanding = recs.reduce((s, r) => s + r.outstanding, 0);
    const totalIssued = recs.reduce((s, r) => s + r.credit_amount, 0);
    const totalPaid = recs.reduce((s, r) => s + r.amount_paid + r.initial_payment, 0);
    const lines = [
      `*Credit Statement — ${cust.name}*`,
      cust.phone ? `Phone: ${cust.phone}` : '',
      '',
      `Total Credit Issued: ${fmtCurrency(totalIssued)}`,
      `Total Paid: ${fmtCurrency(totalPaid)}`,
      `*Outstanding Balance: ${fmtCurrency(totalOutstanding)}*`,
      '',
      ...recs.slice(0, 5).map(r => `- ${r.description}: ${fmtCurrency(r.outstanding)} (${r.status})`),
      recs.length > 5 ? `...and ${recs.length - 5} more records` : '',
      '',
      `Statement Date: ${new Date().toLocaleDateString()}`,
    ].filter(Boolean).join('\n');
    window.open(`https://wa.me/?text=${encodeURIComponent(lines)}`, '_blank');
  };

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <PageLayout
      title="Credits"
      onBack={onBack}
      description="Accounts receivable — issue credit, track payments, manage balances"
      actions={
        <>
          <button onClick={() => exportCustomersCSV(customers)} className="btn btn-secondary btn-sm">CSV</button>
          <button onClick={openAddCredit} className="btn btn-primary btn-sm">
            <Plus size={14} /> Add Credit
          </button>
        </>
      }
    >
      <div className="space-y-5">

        {/* Dashboard Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: 'Customers w/ Credit', value: stats.customersWithCredit, cls: 'text-blue-600 dark:text-blue-400' },
            { label: 'Total Outstanding', value: fmtCurrency(stats.totalOutstanding), cls: 'text-red-600 dark:text-red-400' },
            { label: 'Total Issued', value: fmtCurrency(stats.totalIssued), cls: 'text-amber-600 dark:text-amber-400' },
            { label: 'Total Collected', value: fmtCurrency(stats.totalCollected), cls: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'Overdue', value: fmtCurrency(stats.overdue), cls: stats.overdue > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400' },
          ].map(item => (
            <div key={item.label} className="card p-4 text-center">
              <div className={`text-lg font-bold tabular-nums ${item.cls}`}>{item.value}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
          <button
            onClick={() => setTab('credits')}
            className={`btn btn-sm gap-1.5 ${tab === 'credits' ? 'btn-primary shadow-sm' : 'bg-transparent text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700'}`}
          >
            <CreditCard size={14} /> Credit Records
          </button>
          <button
            onClick={() => setTab('customers')}
            className={`btn btn-sm gap-1.5 ${tab === 'customers' ? 'btn-primary shadow-sm' : 'bg-transparent text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700'}`}
          >
            <Users size={14} /> Customer Accounts
          </button>
        </div>

        {/* ── CREDIT RECORDS TAB ── */}
        {tab === 'credits' && (
          <>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); }} className="flex-1" placeholder="Search by customer or description…" />
              <div className="flex gap-1 flex-wrap">
                {(['all', 'active', 'partial', 'overdue', 'settled'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => { setStatusFilter(s); setPage(1); }}
                    className={`btn btn-sm capitalize ${statusFilter === s ? 'btn-primary' : 'btn-secondary'}`}
                  >
                    {s === 'all' ? 'All' : s}
                  </button>
                ))}
              </div>
            </div>

            {loadingRecords ? (
              <div className="flex justify-center py-16"><Spinner size="lg" /></div>
            ) : (
              <div className="card overflow-hidden">
                <div className="table-container rounded-none border-0">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Customer</th>
                        <th>Phone</th>
                        <th>Description</th>
                        <th>Credit Date</th>
                        <th>Due Date</th>
                        <th>Credit Amount</th>
                        <th>Amount Paid</th>
                        <th>Outstanding</th>
                        <th>Status</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedCredits.length === 0 ? (
                        <tr><td colSpan={10} className="py-0">
                          <EmptyState
                            icon={<CreditCard size={32} />}
                            title="No credit records"
                            description="Issue credit to a customer to get started."
                            action={<button onClick={openAddCredit} className="btn btn-primary btn-sm"><Plus size={14} /> Add Credit</button>}
                          />
                        </td></tr>
                      ) : pagedCredits.map(r => {
                        const cust = customers.find(c => c.id === r.customer_id);
                        const totalPaid = r.amount_paid + r.initial_payment;
                        return (
                          <tr key={r.id}>
                            <td className="font-medium text-gray-900 dark:text-gray-100">{cust?.name ?? '—'}</td>
                            <td className="text-gray-500 dark:text-gray-400">{cust?.phone || '—'}</td>
                            <td className="max-w-xs truncate text-gray-700 dark:text-gray-300">{r.description}</td>
                            <td className="whitespace-nowrap text-gray-500 dark:text-gray-400">{formatDate(r.credit_date)}</td>
                            <td className={`whitespace-nowrap ${r.status === 'overdue' ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                              {r.due_date ? formatDate(r.due_date) : '—'}
                            </td>
                            <td className="tabular-nums font-semibold text-amber-600 dark:text-amber-400">{fmtCurrency(r.credit_amount)}</td>
                            <td className="tabular-nums text-emerald-600 dark:text-emerald-400">{fmtCurrency(totalPaid)}</td>
                            <td className={`tabular-nums font-bold ${r.outstanding > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400'}`}>
                              {fmtCurrency(r.outstanding)}
                            </td>
                            <td>{statusBadge(r.status)}</td>
                            <td>
                              <div className="flex gap-1 justify-end">
                                {r.status !== 'settled' && (
                                  <button
                                    onClick={() => { setPaymentForm({ ...EMPTY_PAYMENT_FORM }); setErrors({}); setShowPaymentModal(r); }}
                                    className="btn btn-success btn-sm"
                                    title="Record Payment"
                                  >
                                    <ArrowDownCircle size={12} />
                                  </button>
                                )}
                                {cust && (
                                  <>
                                    <button onClick={() => setShowStatement(cust)} className="btn btn-secondary btn-sm" title="View Statement"><FileText size={12} /></button>
                                  </>
                                )}
                                <button onClick={() => openEditCredit(r)} className="btn btn-secondary btn-sm" title="Edit"><Pencil size={12} /></button>
                                <button onClick={() => setDeleteCreditTarget(r)} className="btn btn-danger btn-sm" title="Delete"><Trash2 size={12} /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <Pagination total={filteredCredits.length} page={page} perPage={PER_PAGE} onPage={setPage} />
              </div>
            )}
          </>
        )}

        {/* ── CUSTOMER ACCOUNTS TAB ── */}
        {tab === 'customers' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* List */}
            <div className="space-y-3">
              <div className="flex gap-2">
                <SearchInput value={customerSearch} onChange={setCustomerSearch} className="flex-1" placeholder="Search customers…" />
                <button onClick={() => { setCustomerForm({ ...EMPTY_CUSTOMER }); setErrors({}); setEditCustomer(null); setShowCustomerForm(true); }} className="btn btn-primary btn-sm">
                  <Plus size={14} /> Add
                </button>
              </div>
              <div className="card overflow-hidden">
                {filteredCustomers.length === 0 ? (
                  <EmptyState icon={<Users size={32} />} title="No customers" />
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {filteredCustomers.map(c => {
                      const cRecs = creditRecords.filter(r => r.customer_id === c.id);
                      const totalIssued = cRecs.reduce((s, r) => s + r.credit_amount, 0);
                      const outstandingAmt = cRecs.reduce((s, r) => s + r.outstanding, 0);
                      return (
                        <div
                          key={c.id}
                          onClick={() => setSelectedCustomer(c)}
                          className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${selectedCustomer?.id === c.id ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'}`}
                        >
                          <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-sm font-bold text-blue-600 dark:text-blue-400 shrink-0">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{c.name}</div>
                            <div className="text-xs text-gray-400 dark:text-gray-500">{c.phone || 'No phone'}</div>
                            {totalIssued > 0 && <div className="text-xs text-gray-400">{cRecs.length} credit record{cRecs.length !== 1 ? 's' : ''}</div>}
                          </div>
                          <div className="text-right shrink-0">
                            <div className={`text-sm font-bold tabular-nums ${outstandingAmt > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400'}`}>
                              {fmtCurrency(outstandingAmt)}
                            </div>
                            <div className="text-xs text-gray-400">{outstandingAmt > 0 ? 'owes' : 'settled'}</div>
                          </div>
                          <div className="flex flex-col gap-1 ml-1">
                            <button onClick={e => { e.stopPropagation(); setCustomerForm({ name: c.name, phone: c.phone, credit_balance: c.credit_balance, total_purchases: c.total_purchases }); setErrors({}); setEditCustomer(c); setShowCustomerForm(true); }} className="btn btn-secondary p-1"><Pencil size={11} /></button>
                            <button onClick={e => { e.stopPropagation(); setDeleteCustomerTarget(c); }} className="btn btn-danger p-1"><Trash2 size={11} /></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Customer Statement Panel */}
            <div>
              {selectedCustomer ? (
                <div className="space-y-4">
                  {/* Profile card */}
                  <div className="card p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{selectedCustomer.name}</h3>
                        {selectedCustomer.phone && <p className="text-xs text-gray-500">{selectedCustomer.phone}</p>}
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => printStatement(selectedCustomer)} className="btn btn-secondary btn-sm" title="Print Statement"><Printer size={12} /></button>
                        <button onClick={() => shareStatementWhatsApp(selectedCustomer)} className="btn btn-secondary btn-sm" title="Share via WhatsApp"><Share2 size={12} /></button>
                        <button onClick={() => setShowStatement(selectedCustomer)} className="btn btn-secondary btn-sm" title="View Statement"><FileText size={12} /></button>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {(() => {
                        const cRecs = customerCredits;
                        const totalIssued = cRecs.reduce((s, r) => s + r.credit_amount, 0);
                        const totalPaid = cRecs.reduce((s, r) => s + r.amount_paid + r.initial_payment, 0);
                        const outstanding = cRecs.reduce((s, r) => s + r.outstanding, 0);
                        const lastCredit = cRecs[0];
                        return (
                          <>
                            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 text-center">
                              <div className="text-base font-bold text-amber-600 dark:text-amber-400 tabular-nums">{fmtCurrency(totalIssued)}</div>
                              <div className="text-xs text-gray-500 mt-0.5">Total Issued</div>
                            </div>
                            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 text-center">
                              <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{fmtCurrency(totalPaid)}</div>
                              <div className="text-xs text-gray-500 mt-0.5">Total Paid</div>
                            </div>
                            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 text-center col-span-2">
                              <div className={`text-lg font-bold tabular-nums ${outstanding > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                {fmtCurrency(outstanding)}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5">Outstanding Balance</div>
                              {lastCredit && <div className="text-xs text-gray-400 mt-0.5">Last credit: {formatDate(lastCredit.credit_date)}</div>}
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={openAddCredit}
                        className="btn btn-warning btn-sm flex-1"
                      >
                        <ArrowUpCircle size={14} /> Issue Credit
                      </button>
                    </div>
                  </div>

                  {/* Credit records for this customer */}
                  {customerCredits.length > 0 && (
                    <div className="card overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Credit Records
                      </div>
                      <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-56 overflow-y-auto">
                        {customerCredits.map(r => (
                          <div key={r.id} className="px-4 py-3 flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{r.description}</div>
                              <div className="text-xs text-gray-400">{formatDate(r.credit_date)}{r.due_date ? ` · due ${formatDate(r.due_date)}` : ''}</div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className={`text-sm font-bold tabular-nums ${r.outstanding > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400'}`}>
                                {fmtCurrency(r.outstanding)}
                              </div>
                              <div className="mt-0.5">{statusBadge(r.status)}</div>
                            </div>
                            {r.status !== 'settled' && (
                              <button
                                onClick={() => { setPaymentForm({ ...EMPTY_PAYMENT_FORM }); setErrors({}); setShowPaymentModal(r); }}
                                className="btn btn-success btn-sm shrink-0"
                                title="Record Payment"
                              >
                                <ArrowDownCircle size={12} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Transaction history */}
                  <div className="card overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Payment History
                    </div>
                    {customerTxns.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-8">No transactions yet</p>
                    ) : (
                      <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-64 overflow-y-auto">
                        {customerTxns.map(t => (
                          <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${t.transaction_type === 'payment' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 'bg-red-100 dark:bg-red-900/30 text-red-500'}`}>
                              {t.transaction_type === 'payment' ? <ArrowDownCircle size={14} /> : <ArrowUpCircle size={14} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{t.description}</div>
                              <div className="text-xs text-gray-400">{formatDate(t.transaction_date)}</div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className={`text-xs font-bold tabular-nums ${t.transaction_type === 'payment' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                                {t.transaction_type === 'payment' ? '-' : '+'}{fmtCurrency(t.amount)}
                              </div>
                              <div className="text-xs text-gray-400">Bal: {fmtCurrency(t.balance_after)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="card flex flex-col items-center justify-center h-64 text-center">
                  <CreditCard size={32} className="text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Select a customer to view account</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ADD / EDIT CREDIT MODAL ── */}
        {showCreditForm && (
          <Modal title={editCreditRecord ? 'Edit Credit Record' : 'Add Credit'} onClose={() => setShowCreditForm(false)} maxWidth="max-w-xl">
            <div className="space-y-4">
              {/* Customer selection */}
              <div className="space-y-2">
                <label className="label font-semibold">Customer <span className="text-red-500">*</span></label>
                <Select
                  value={creditForm.customer_id}
                  onChange={e => {
                    const cust = customers.find(c => c.id === e.target.value);
                    setCreditForm(f => ({
                      ...f,
                      customer_id: e.target.value,
                      customer_name_input: cust?.name ?? '',
                      customer_phone_input: cust?.phone ?? '',
                    }));
                    setErrors(er => ({ ...er, customer_name_input: '' }));
                  }}
                  placeholder="Select existing customer…"
                  options={customers.map(c => ({ value: c.id, label: `${c.name}${c.phone ? ' — ' + c.phone : ''}` }))}
                />
                {!creditForm.customer_id && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 px-1">— or create new customer —</div>
                )}
                {!creditForm.customer_id && (
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Customer Name" error={errors.customer_name_input}>
                      <input
                        type="text"
                        value={creditForm.customer_name_input}
                        onChange={e => { setCreditForm(f => ({ ...f, customer_name_input: e.target.value })); setErrors(er => ({ ...er, customer_name_input: '' })); }}
                        className={`input ${errors.customer_name_input ? 'input-error' : ''}`}
                        placeholder="New customer name"
                      />
                    </FormField>
                    <FormField label="Phone Number">
                      <input
                        type="tel"
                        value={creditForm.customer_phone_input}
                        onChange={e => setCreditForm(f => ({ ...f, customer_phone_input: e.target.value }))}
                        className="input"
                        placeholder="0712345678"
                      />
                    </FormField>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Credit Date" required>
                  <input type="date" value={creditForm.credit_date} onChange={e => setCreditForm(f => ({ ...f, credit_date: e.target.value }))} className="input" />
                </FormField>
                <FormField label="Due Date">
                  <input type="date" value={creditForm.due_date} onChange={e => setCreditForm(f => ({ ...f, due_date: e.target.value }))} className="input" />
                </FormField>
              </div>

              <FormField label="Description / Reason" required error={errors.description}>
                <input
                  type="text"
                  value={creditForm.description}
                  onChange={e => { setCreditForm(f => ({ ...f, description: e.target.value })); setErrors(er => ({ ...er, description: '' })); }}
                  className={`input ${errors.description ? 'input-error' : ''}`}
                  placeholder="What is this credit for?"
                  autoFocus
                />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Credit Amount" required error={errors.credit_amount}>
                  <input
                    type="number" min="0.01" step="0.01"
                    value={creditForm.credit_amount}
                    onChange={e => { setCreditForm(f => ({ ...f, credit_amount: parseFloat(e.target.value) || 0 })); setErrors(er => ({ ...er, credit_amount: '' })); }}
                    className={`input ${errors.credit_amount ? 'input-error' : ''}`}
                  />
                </FormField>
                <FormField label="Initial Payment (Optional)" error={errors.initial_payment} hint="Amount paid upfront">
                  <input
                    type="number" min="0" step="0.01"
                    value={creditForm.initial_payment}
                    onChange={e => { setCreditForm(f => ({ ...f, initial_payment: parseFloat(e.target.value) || 0 })); setErrors(er => ({ ...er, initial_payment: '' })); }}
                    className={`input ${errors.initial_payment ? 'input-error' : ''}`}
                  />
                </FormField>
              </div>

              {/* Outstanding preview */}
              {creditForm.credit_amount > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-base font-bold text-amber-600 dark:text-amber-400 tabular-nums">{fmtCurrency(creditForm.credit_amount)}</div>
                    <div className="text-xs text-gray-500 mt-0.5">Credit Amount</div>
                  </div>
                  <div>
                    <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{fmtCurrency(creditForm.initial_payment)}</div>
                    <div className="text-xs text-gray-500 mt-0.5">Initial Payment</div>
                  </div>
                  <div>
                    <div className={`text-base font-bold tabular-nums ${outstanding > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{fmtCurrency(outstanding)}</div>
                    <div className="text-xs text-gray-500 mt-0.5">Outstanding</div>
                  </div>
                </div>
              )}

              <FormField label="Notes">
                <textarea
                  value={creditForm.notes}
                  onChange={e => setCreditForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="input resize-none"
                  placeholder="Additional notes…"
                />
              </FormField>

              {errors._ && <p className="text-xs text-red-500">{errors._}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowCreditForm(false)} className="btn btn-secondary">Cancel</button>
                <button onClick={handleSaveCredit} disabled={saving} className="btn btn-primary">
                  {saving ? <><Spinner size="sm" /> Saving&hellip;</> : editCreditRecord ? 'Update Credit' : 'Issue Credit'}
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* ── RECORD PAYMENT MODAL ── */}
        {showPaymentModal && (
          <Modal title="Record Payment" onClose={() => setShowPaymentModal(null)}>
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-sm space-y-1">
                {(() => {
                  const cust = customers.find(c => c.id === showPaymentModal.customer_id);
                  return (
                    <>
                      <div className="flex justify-between"><span className="text-gray-500">Customer</span><span className="font-semibold">{cust?.name ?? '—'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Description</span><span className="truncate max-w-xs text-right">{showPaymentModal.description}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Outstanding</span><span className="font-bold text-red-600 dark:text-red-400 tabular-nums">{fmtCurrency(showPaymentModal.outstanding)}</span></div>
                    </>
                  );
                })()}
              </div>

              <FormField label="Payment Amount" required error={errors.amount}>
                <input
                  type="number" min="0.01" step="0.01"
                  value={paymentForm.amount}
                  onChange={e => { setPaymentForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 })); setErrors(er => ({ ...er, amount: '' })); }}
                  className={`input ${errors.amount ? 'input-error' : ''}`}
                  autoFocus
                />
              </FormField>

              <FormField label="Payment Date">
                <input type="date" value={paymentForm.payment_date} onChange={e => setPaymentForm(f => ({ ...f, payment_date: e.target.value }))} className="input" />
              </FormField>

              <FormField label="Notes">
                <input type="text" value={paymentForm.notes} onChange={e => setPaymentForm(f => ({ ...f, notes: e.target.value }))} className="input" placeholder="e.g. Cash received" />
              </FormField>

              {paymentForm.amount > 0 && paymentForm.amount <= showPaymentModal.outstanding && (
                <div className="text-sm font-medium text-center py-2 px-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400">
                  Balance after payment: {fmtCurrency(showPaymentModal.outstanding - paymentForm.amount)}
                </div>
              )}

              {errors._ && <p className="text-xs text-red-500">{errors._}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowPaymentModal(null)} className="btn btn-secondary">Cancel</button>
                <button onClick={handleRecordPayment} disabled={saving} className="btn btn-success">
                  {saving ? <><Spinner size="sm" /> Saving&hellip;</> : 'Record Payment'}
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* ── STATEMENT MODAL ── */}
        {showStatement && (
          <Modal title={`Statement — ${showStatement.name}`} onClose={() => setShowStatement(null)} maxWidth="max-w-2xl">
            <div className="space-y-4">
              {/* Actions */}
              <div className="flex gap-2 justify-end">
                <button onClick={() => printStatement(showStatement)} className="btn btn-secondary btn-sm">
                  <Printer size={14} /> Print
                </button>
                <button onClick={() => shareStatementWhatsApp(showStatement)} className="btn btn-secondary btn-sm">
                  <Share2 size={14} /> WhatsApp
                </button>
                <button onClick={() => printStatement(showStatement)} className="btn btn-secondary btn-sm">
                  <FileText size={14} /> PDF
                </button>
              </div>

              {/* Customer info */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                <div className="font-bold text-gray-900 dark:text-gray-100 text-base">{showStatement.name}</div>
                {showStatement.phone && <div className="text-sm text-gray-500 mt-0.5">{showStatement.phone}</div>}
              </div>

              {/* Summary */}
              {(() => {
                const recs = creditRecords.filter(r => r.customer_id === showStatement.id);
                const totalIssued = recs.reduce((s, r) => s + r.credit_amount, 0);
                const totalPaid = recs.reduce((s, r) => s + r.amount_paid + r.initial_payment, 0);
                const outstandingAmt = recs.reduce((s, r) => s + r.outstanding, 0);
                return (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="card p-3 text-center">
                      <div className="text-base font-bold text-amber-600 dark:text-amber-400 tabular-nums">{fmtCurrency(totalIssued)}</div>
                      <div className="text-xs text-gray-500 mt-0.5">Total Issued</div>
                    </div>
                    <div className="card p-3 text-center">
                      <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{fmtCurrency(totalPaid)}</div>
                      <div className="text-xs text-gray-500 mt-0.5">Total Paid</div>
                    </div>
                    <div className="card p-3 text-center">
                      <div className={`text-base font-bold tabular-nums ${outstandingAmt > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{fmtCurrency(outstandingAmt)}</div>
                      <div className="text-xs text-gray-500 mt-0.5">Outstanding</div>
                    </div>
                  </div>
                );
              })()}

              {/* Credit records table */}
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Credit Records</div>
                <div className="card overflow-hidden">
                  <div className="table-container rounded-none border-0 max-h-56">
                    <table className="data-table">
                      <thead><tr><th>Date</th><th>Description</th><th>Amount</th><th>Paid</th><th>Outstanding</th><th>Status</th></tr></thead>
                      <tbody>
                        {creditRecords.filter(r => r.customer_id === showStatement.id).length === 0 ? (
                          <tr><td colSpan={6} className="text-center text-xs text-gray-400 py-6">No credit records</td></tr>
                        ) : creditRecords.filter(r => r.customer_id === showStatement.id).map(r => (
                          <tr key={r.id}>
                            <td className="whitespace-nowrap">{formatDate(r.credit_date)}</td>
                            <td className="truncate max-w-xs">{r.description}</td>
                            <td className="tabular-nums text-amber-600 dark:text-amber-400 font-medium">{fmtCurrency(r.credit_amount)}</td>
                            <td className="tabular-nums text-emerald-600 dark:text-emerald-400">{fmtCurrency(r.amount_paid + r.initial_payment)}</td>
                            <td className={`tabular-nums font-bold ${r.outstanding > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400'}`}>{fmtCurrency(r.outstanding)}</td>
                            <td>{statusBadge(r.status)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Payment history */}
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Payment History</div>
                <div className="card overflow-hidden">
                  <div className="table-container rounded-none border-0 max-h-48">
                    <table className="data-table">
                      <thead><tr><th>Date</th><th>Description</th><th>Amount</th><th>Balance After</th></tr></thead>
                      <tbody>
                        {creditTransactions.filter(t => t.customer_id === showStatement.id).length === 0 ? (
                          <tr><td colSpan={4} className="text-center text-xs text-gray-400 py-6">No transactions</td></tr>
                        ) : creditTransactions
                            .filter(t => t.customer_id === showStatement.id)
                            .sort((a, b) => b.transaction_date.localeCompare(a.transaction_date))
                            .map(t => (
                              <tr key={t.id}>
                                <td className="whitespace-nowrap">{formatDate(t.transaction_date)}</td>
                                <td className="truncate max-w-xs">{t.description}</td>
                                <td className={`tabular-nums font-medium ${t.transaction_type === 'payment' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                                  {t.transaction_type === 'payment' ? '-' : '+'}{fmtCurrency(t.amount)}
                                </td>
                                <td className="tabular-nums text-gray-500">{fmtCurrency(t.balance_after)}</td>
                              </tr>
                            ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button onClick={() => setShowStatement(null)} className="btn btn-secondary"><X size={14} /> Close</button>
              </div>
            </div>
          </Modal>
        )}

        {/* ── CUSTOMER FORM MODAL ── */}
        {showCustomerForm && (
          <Modal title={editCustomer ? 'Edit Customer' : 'Add Customer'} onClose={() => setShowCustomerForm(false)}>
            <div className="space-y-4">
              <FormField label="Name" required error={errors.name}>
                <input type="text" value={customerForm.name} onChange={e => setCustomerForm(f => ({ ...f, name: e.target.value }))} className="input" autoFocus />
              </FormField>
              <FormField label="Phone">
                <input type="tel" value={customerForm.phone} onChange={e => setCustomerForm(f => ({ ...f, phone: e.target.value }))} className="input" placeholder="0712345678" />
              </FormField>
              {errors._ && <p className="text-xs text-red-500">{errors._}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowCustomerForm(false)} className="btn btn-secondary">Cancel</button>
                <button onClick={handleSaveCustomer} disabled={saving} className="btn btn-primary">
                  {saving ? <><Spinner size="sm" /> Saving&hellip;</> : editCustomer ? 'Update' : 'Add Customer'}
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* ── DELETE CREDIT CONFIRM ── */}
        {deleteCreditTarget && (
          <ConfirmModal
            title="Delete Credit Record"
            message={`Delete this credit record for "${customers.find(c => c.id === deleteCreditTarget.customer_id)?.name ?? 'customer'}"? The customer's outstanding balance will be reduced by ${fmtCurrency(deleteCreditTarget.outstanding)}.`}
            confirmLabel="Delete"
            onConfirm={handleDeleteCredit}
            onCancel={() => setDeleteCreditTarget(null)}
          />
        )}

        {/* ── DELETE CUSTOMER CONFIRM ── */}
        {deleteCustomerTarget && (
          <ConfirmModal
            title="Delete Customer"
            message={`Delete customer "${deleteCustomerTarget.name}"? Their credit transactions will be removed too.`}
            confirmLabel="Delete"
            onConfirm={async () => { await deleteCustomer(deleteCustomerTarget.id); setDeleteCustomerTarget(null); setSelectedCustomer(null); }}
            onCancel={() => setDeleteCustomerTarget(null)}
          />
        )}
      </div>
    </PageLayout>
  );
}
