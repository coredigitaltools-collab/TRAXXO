/*
  # Traxxo ProPlus - Enhanced Schema

  ## New tables and columns for:
  1. Business settings (logo, address, contact, currency)
  2. Receipt templates and customization
  3. Receipt history
  4. Enhanced customer tracking
  5. Product analytics

  This migration adds to the existing schema without breaking changes.
*/

-- Business Settings Table
CREATE TABLE IF NOT EXISTS business_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE UNIQUE,
  logo_url text DEFAULT '',
  address text DEFAULT '',
  phone text DEFAULT '',
  email text DEFAULT '',
  website text DEFAULT '',
  tax_number text DEFAULT '',
  currency text NOT NULL DEFAULT 'UGX',
  date_format text NOT NULL DEFAULT 'DD/MM/YYYY',
  time_format text NOT NULL DEFAULT 'HH:mm',
  receipt_header text DEFAULT '',
  receipt_footer text DEFAULT 'Thank you for your business!',
  thank_you_message text DEFAULT 'Thank you for shopping with us',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_select" ON business_settings FOR SELECT USING (true);
CREATE POLICY "settings_insert" ON business_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "settings_update" ON business_settings FOR UPDATE USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_business_settings_business_id ON business_settings(business_id);

-- Receipt History Table
CREATE TABLE IF NOT EXISTS receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  receipt_number text NOT NULL,
  receipt_data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "receipts_select" ON receipts FOR SELECT USING (true);
CREATE POLICY "receipts_insert" ON receipts FOR INSERT WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_receipts_business_id ON receipts(business_id);
CREATE INDEX IF NOT EXISTS idx_receipts_sale_id ON receipts(sale_id);

-- Add enhanced customer fields if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'address'
  ) THEN
    ALTER TABLE customers ADD COLUMN address text DEFAULT '';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'notes'
  ) THEN
    ALTER TABLE customers ADD COLUMN notes text DEFAULT '';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'date_created'
  ) THEN
    ALTER TABLE customers ADD COLUMN date_created date NOT NULL DEFAULT CURRENT_DATE;
  END IF;
END $$;

-- Add time field to sales if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'sale_time'
  ) THEN
    ALTER TABLE sales ADD COLUMN sale_time text DEFAULT '00:00';
  END IF;
END $$;

-- Create view for top-selling products
CREATE OR REPLACE VIEW v_top_selling_products AS
SELECT
  business_id,
  product_name,
  SUM(quantity_sold) as total_quantity_sold,
  SUM(total_sale) as total_revenue,
  SUM(quantity_sold * buying_price) as total_cogs,
  SUM(total_sale - (quantity_sold * buying_price)) as gross_profit,
  COUNT(*) as sale_count
FROM sales
GROUP BY business_id, product_name
ORDER BY total_revenue DESC;

-- Create view for product performance
CREATE OR REPLACE VIEW v_product_performance AS
SELECT
  p.id,
  p.business_id,
  p.name,
  p.quantity as remaining_stock,
  p.buying_price,
  p.selling_price,
  COALESCE(SUM(s.quantity_sold), 0) as quantity_sold,
  COALESCE(SUM(s.total_sale), 0) as revenue,
  COALESCE(SUM(s.quantity_sold * s.buying_price), 0) as cogs,
  COALESCE(SUM(s.total_sale) - SUM(s.quantity_sold * s.buying_price), 0) as gross_profit,
  (p.quantity * p.buying_price) as stock_value,
  ((p.quantity * p.buying_price) + COALESCE(SUM(s.quantity_sold * s.buying_price), 0)) as total_purchase_value
FROM products p
LEFT JOIN sales s ON s.product_id = p.id
GROUP BY p.id, p.business_id, p.name, p.quantity, p.buying_price, p.selling_price;
