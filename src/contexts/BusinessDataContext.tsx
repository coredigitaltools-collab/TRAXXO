import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Product, Sale, Expense, Customer, CreditTransaction } from '../types';
import { supabase } from '../lib/supabase';
import { ls } from '../lib/storage';
import { useAuth } from './AuthContext';

interface BusinessData {
  products: Product[];
  sales: Sale[];
  expenses: Expense[];
  customers: Customer[];
  creditTransactions: CreditTransaction[];
  syncing: boolean;
  lastSync: string | null;
}

interface BusinessDataContextType extends BusinessData {
  addProduct: (p: Omit<Product, 'id' | 'business_id' | 'created_at' | 'updated_at'>) => Promise<Product>;
  updateProduct: (id: string, p: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addSale: (s: Omit<Sale, 'id' | 'business_id' | 'created_at' | 'updated_at'>) => Promise<Sale>;
  updateSale: (id: string, s: Partial<Sale>) => Promise<void>;
  deleteSale: (id: string) => Promise<void>;
  addExpense: (e: Omit<Expense, 'id' | 'business_id' | 'created_at' | 'updated_at'>) => Promise<Expense>;
  updateExpense: (id: string, e: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  addCustomer: (c: Omit<Customer, 'id' | 'business_id' | 'created_at' | 'updated_at'>) => Promise<Customer>;
  updateCustomer: (id: string, c: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  addCreditTransaction: (ct: Omit<CreditTransaction, 'id' | 'business_id' | 'created_at'>) => Promise<void>;
  refresh: () => Promise<void>;
}

const BusinessDataContext = createContext<BusinessDataContextType | null>(null);

const cacheKey = (businessId: string) => `data_${businessId}`;

export function BusinessDataProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const businessId = session?.businessId ?? '';
  const actorName = session?.role === 'owner' ? 'Owner' : (session?.staffName ?? 'Staff');
  const actorRole = session?.role === 'owner' ? 'owner' : (session?.staffRole ?? 'cashier');

  const [data, setData] = useState<BusinessData>(() => {
    if (!businessId) return { products: [], sales: [], expenses: [], customers: [], creditTransactions: [], syncing: false, lastSync: null };
    const cached = ls.get<BusinessData>(cacheKey(businessId));
    return cached ?? { products: [], sales: [], expenses: [], customers: [], creditTransactions: [], syncing: false, lastSync: null };
  });

  const setField = <K extends keyof BusinessData>(key: K, value: BusinessData[K]) =>
    setData(d => ({ ...d, [key]: value }));

  const logActivity = useCallback(async (action: string, entityType?: string, entityId?: string) => {
    if (!businessId) return;
    await supabase.from('activity_log').insert({
      business_id: businessId,
      staff_name: actorName,
      staff_role: actorRole,
      action,
      entity_type: entityType,
      entity_id: entityId,
    });
  }, [businessId, actorName, actorRole]);

  const refresh = useCallback(async () => {
    if (!businessId) return;
    setField('syncing', true);
    try {
      const [{ data: products }, { data: sales }, { data: expenses }, { data: customers }, { data: creditTransactions }] =
        await Promise.all([
          supabase.from('products').select('*').eq('business_id', businessId).order('created_at', { ascending: false }),
          supabase.from('sales').select('*').eq('business_id', businessId).order('sale_date', { ascending: false }),
          supabase.from('expenses').select('*').eq('business_id', businessId).order('expense_date', { ascending: false }),
          supabase.from('customers').select('*').eq('business_id', businessId).order('name'),
          supabase.from('credit_transactions').select('*').eq('business_id', businessId).order('transaction_date', { ascending: false }),
        ]);

      const newData: BusinessData = {
        products: (products ?? []) as Product[],
        sales: (sales ?? []) as Sale[],
        expenses: (expenses ?? []) as Expense[],
        customers: (customers ?? []) as Customer[],
        creditTransactions: (creditTransactions ?? []) as CreditTransaction[],
        syncing: false,
        lastSync: new Date().toISOString(),
      };
      setData(newData);
      ls.set(cacheKey(businessId), newData);
    } catch {
      setField('syncing', false);
    }
  }, [businessId]);

  useEffect(() => {
    if (businessId) refresh();
    else setData({ products: [], sales: [], expenses: [], customers: [], creditTransactions: [], syncing: false, lastSync: null });
  }, [businessId, refresh]);

  const insertRow = async <T extends { id: string }>(table: string, row: Record<string, unknown>): Promise<T> => {
    const { data, error } = await supabase.from(table).insert(row).select().single();
    if (error) throw new Error(error.message);
    return data as T;
  };

  const updateRow = async (table: string, id: string, row: Record<string, unknown>): Promise<void> => {
    const { error } = await supabase.from(table).update({ ...row, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) throw new Error(error.message);
  };

  const deleteRow = async (table: string, id: string): Promise<void> => {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw new Error(error.message);
  };

  const addProduct = async (p: Omit<Product, 'id' | 'business_id' | 'created_at' | 'updated_at'>): Promise<Product> => {
    const product = await insertRow<Product>('products', { ...p, business_id: businessId });
    await supabase.from('stock_movements').insert({
      business_id: businessId, product_id: product.id,
      movement_type: 'opening', quantity: p.quantity, note: 'Initial stock',
    });
    await logActivity(`Added product: ${p.name}`, 'product', product.id);
    await refresh();
    return product;
  };

  const updateProduct = async (id: string, p: Partial<Product>): Promise<void> => {
    await updateRow('products', id, p);
    await logActivity(`Updated product: ${p.name ?? id}`, 'product', id);
    await refresh();
  };

  const deleteProduct = async (id: string): Promise<void> => {
    const product = data.products.find(p => p.id === id);
    await deleteRow('products', id);
    await logActivity(`Deleted product: ${product?.name ?? id}`, 'product', id);
    await refresh();
  };

  const addSale = async (s: Omit<Sale, 'id' | 'business_id' | 'created_at' | 'updated_at'>): Promise<Sale> => {
    const sale = await insertRow<Sale>('sales', { ...s, business_id: businessId });

    if (s.product_id) {
      const product = data.products.find(p => p.id === s.product_id);
      if (product) {
        const newQty = Math.max(0, product.quantity - s.quantity_sold);
        await supabase.from('products').update({ quantity: newQty, updated_at: new Date().toISOString() }).eq('id', s.product_id);
        await supabase.from('stock_movements').insert({
          business_id: businessId, product_id: s.product_id,
          movement_type: 'sale', quantity: -s.quantity_sold,
          reference_id: sale.id, note: `Sale to ${s.customer_name || 'customer'}`,
        });
      }
    }

    if (s.payment_method === 'credit' && s.customer_id) {
      const customer = data.customers.find(c => c.id === s.customer_id);
      if (customer) {
        const newBalance = customer.credit_balance + s.total_sale;
        await supabase.from('customers').update({ credit_balance: newBalance, total_purchases: customer.total_purchases + s.total_sale, updated_at: new Date().toISOString() }).eq('id', s.customer_id);
        await supabase.from('credit_transactions').insert({
          business_id: businessId, customer_id: s.customer_id,
          transaction_type: 'credit_sale', amount: s.total_sale, balance_after: newBalance,
          description: `Credit sale: ${s.product_name}`, sale_id: sale.id,
          transaction_date: s.sale_date,
        });
      }
    }

    await logActivity(`Recorded sale: ${s.product_name} (${s.quantity_sold} units)`, 'sale', sale.id);
    await refresh();
    return sale;
  };

  const updateSale = async (id: string, s: Partial<Sale>): Promise<void> => {
    await updateRow('sales', id, s);
    await logActivity(`Updated sale: ${s.product_name ?? id}`, 'sale', id);
    await refresh();
  };

  const deleteSale = async (id: string): Promise<void> => {
    const sale = data.sales.find(s => s.id === id);
    if (sale?.product_id) {
      const product = data.products.find(p => p.id === sale.product_id);
      if (product) {
        const newQty = product.quantity + sale.quantity_sold;
        await supabase.from('products').update({ quantity: newQty, updated_at: new Date().toISOString() }).eq('id', sale.product_id);
      }
    }
    await deleteRow('sales', id);
    await logActivity(`Deleted sale: ${sale?.product_name ?? id}`, 'sale', id);
    await refresh();
  };

  const addExpense = async (e: Omit<Expense, 'id' | 'business_id' | 'created_at' | 'updated_at'>): Promise<Expense> => {
    const expense = await insertRow<Expense>('expenses', { ...e, business_id: businessId });
    await logActivity(`Added expense: ${e.description} (${e.category})`, 'expense', expense.id);
    await refresh();
    return expense;
  };

  const updateExpense = async (id: string, e: Partial<Expense>): Promise<void> => {
    await updateRow('expenses', id, e);
    await logActivity(`Updated expense: ${e.description ?? id}`, 'expense', id);
    await refresh();
  };

  const deleteExpense = async (id: string): Promise<void> => {
    const expense = data.expenses.find(ex => ex.id === id);
    await deleteRow('expenses', id);
    await logActivity(`Deleted expense: ${expense?.description ?? id}`, 'expense', id);
    await refresh();
  };

  const addCustomer = async (c: Omit<Customer, 'id' | 'business_id' | 'created_at' | 'updated_at'>): Promise<Customer> => {
    const customer = await insertRow<Customer>('customers', { ...c, business_id: businessId });
    await logActivity(`Added customer: ${c.name}`, 'customer', customer.id);
    await refresh();
    return customer;
  };

  const updateCustomer = async (id: string, c: Partial<Customer>): Promise<void> => {
    await updateRow('customers', id, c);
    await logActivity(`Updated customer: ${c.name ?? id}`, 'customer', id);
    await refresh();
  };

  const deleteCustomer = async (id: string): Promise<void> => {
    const customer = data.customers.find(c => c.id === id);
    await deleteRow('customers', id);
    await logActivity(`Deleted customer: ${customer?.name ?? id}`, 'customer', id);
    await refresh();
  };

  const addCreditTransaction = async (ct: Omit<CreditTransaction, 'id' | 'business_id' | 'created_at'>): Promise<void> => {
    await supabase.from('credit_transactions').insert({ ...ct, business_id: businessId });
    await supabase.from('customers').update({ credit_balance: ct.balance_after, updated_at: new Date().toISOString() }).eq('id', ct.customer_id);
    const customer = data.customers.find(c => c.id === ct.customer_id);
    await logActivity(
      `${ct.transaction_type === 'payment' ? 'Recorded payment from' : 'Created credit for'} ${customer?.name ?? ct.customer_id}`,
      'credit_transaction'
    );
    await refresh();
  };

  return (
    <BusinessDataContext.Provider value={{ ...data, addProduct, updateProduct, deleteProduct, addSale, updateSale, deleteSale, addExpense, updateExpense, deleteExpense, addCustomer, updateCustomer, deleteCustomer, addCreditTransaction, refresh }}>
      {children}
    </BusinessDataContext.Provider>
  );
}

export function useBusinessData() {
  const ctx = useContext(BusinessDataContext);
  if (!ctx) throw new Error('useBusinessData must be used within BusinessDataProvider');
  return ctx;
}
