/*
  # Traxxo ProPlus - Complete Business Management Schema

  ## Overview
  Full schema for Traxxo ProPlus. Authentication uses credential hashing:
  SHA-256(business_name + pin + secret_word) creates a unique workspace key.
  Same credentials = same business data. Different = separate workspace.

  ## Tables
  1. businesses - workspace identity
  2. products - inventory items
  3. stock_movements - stock audit trail
  4. customers - customer registry with credit balance
  5. sales - sales transactions
  6. expenses - business expenses
  7. credit_transactions - credit sale and payment history

  ## Security
  RLS enabled on all tables. Access filtered by business_id at application layer
  via credential hash lookup.
*/

-- BUSINESSES
CREATE TABLE IF NOT EXISTS businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  credential_hash text UNIQUE NOT NULL,
  owner_hash text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "businesses_select" ON businesses FOR SELECT USING (true);
CREATE POLICY "businesses_insert" ON businesses FOR INSERT WITH CHECK (true);
CREATE POLICY "businesses_update" ON businesses FOR UPDATE USING (true) WITH CHECK (true);

-- PRODUCTS / INVENTORY
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  quantity numeric(12,2) NOT NULL DEFAULT 0,
  buying_price numeric(12,2) NOT NULL DEFAULT 0,
  selling_price numeric(12,2) NOT NULL DEFAULT 0,
  date_added date NOT NULL DEFAULT CURRENT_DATE,
  purchase_month text NOT NULL DEFAULT to_char(CURRENT_DATE, 'YYYY-MM'),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_select" ON products FOR SELECT USING (true);
CREATE POLICY "products_insert" ON products FOR INSERT WITH CHECK (true);
CREATE POLICY "products_update" ON products FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "products_delete" ON products FOR DELETE USING (true);
CREATE INDEX IF NOT EXISTS idx_products_business_id ON products(business_id);

-- STOCK MOVEMENTS
CREATE TABLE IF NOT EXISTS stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  movement_type text NOT NULL CHECK (movement_type IN ('purchase', 'sale', 'adjustment', 'return', 'opening')),
  quantity numeric(12,2) NOT NULL,
  reference_id uuid,
  note text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock_movements_select" ON stock_movements FOR SELECT USING (true);
CREATE POLICY "stock_movements_insert" ON stock_movements FOR INSERT WITH CHECK (true);
CREATE POLICY "stock_movements_delete" ON stock_movements FOR DELETE USING (true);
CREATE INDEX IF NOT EXISTS idx_stock_movements_business_id ON stock_movements(business_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id);

-- CUSTOMERS (must be before sales for FK)
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text DEFAULT '',
  credit_balance numeric(12,2) NOT NULL DEFAULT 0,
  total_purchases numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customers_select" ON customers FOR SELECT USING (true);
CREATE POLICY "customers_insert" ON customers FOR INSERT WITH CHECK (true);
CREATE POLICY "customers_update" ON customers FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "customers_delete" ON customers FOR DELETE USING (true);
CREATE INDEX IF NOT EXISTS idx_customers_business_id ON customers(business_id);

-- SALES
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  quantity_sold numeric(12,2) NOT NULL DEFAULT 0,
  buying_price numeric(12,2) NOT NULL DEFAULT 0,
  selling_price numeric(12,2) NOT NULL DEFAULT 0,
  discount numeric(12,2) NOT NULL DEFAULT 0,
  total_sale numeric(12,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'credit', 'mobile_money', 'bank_transfer', 'card')),
  amount_paid numeric(12,2) NOT NULL DEFAULT 0,
  change_amount numeric(12,2) NOT NULL DEFAULT 0,
  customer_name text DEFAULT '',
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  staff_member text DEFAULT '',
  sale_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sales_select" ON sales FOR SELECT USING (true);
CREATE POLICY "sales_insert" ON sales FOR INSERT WITH CHECK (true);
CREATE POLICY "sales_update" ON sales FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "sales_delete" ON sales FOR DELETE USING (true);
CREATE INDEX IF NOT EXISTS idx_sales_business_id ON sales(business_id);
CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_product_id ON sales(product_id);

-- EXPENSES
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'General',
  description text NOT NULL DEFAULT '',
  amount numeric(12,2) NOT NULL DEFAULT 0,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expenses_select" ON expenses FOR SELECT USING (true);
CREATE POLICY "expenses_insert" ON expenses FOR INSERT WITH CHECK (true);
CREATE POLICY "expenses_update" ON expenses FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "expenses_delete" ON expenses FOR DELETE USING (true);
CREATE INDEX IF NOT EXISTS idx_expenses_business_id ON expenses(business_id);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);

-- CREDIT TRANSACTIONS
CREATE TABLE IF NOT EXISTS credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  transaction_type text NOT NULL CHECK (transaction_type IN ('credit_sale', 'payment', 'adjustment')),
  amount numeric(12,2) NOT NULL DEFAULT 0,
  balance_after numeric(12,2) NOT NULL DEFAULT 0,
  description text DEFAULT '',
  sale_id uuid REFERENCES sales(id) ON DELETE SET NULL,
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "credit_transactions_select" ON credit_transactions FOR SELECT USING (true);
CREATE POLICY "credit_transactions_insert" ON credit_transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "credit_transactions_update" ON credit_transactions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "credit_transactions_delete" ON credit_transactions FOR DELETE USING (true);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_business_id ON credit_transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_customer_id ON credit_transactions(customer_id);
