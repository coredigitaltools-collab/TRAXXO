-- Credit records: dedicated credit issuance tracking (separate from credit_transactions)
CREATE TABLE IF NOT EXISTS credit_records (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id    uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id    uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  credit_date    date NOT NULL DEFAULT CURRENT_DATE,
  due_date       date,
  description    text NOT NULL DEFAULT '',
  credit_amount  numeric(12,2) NOT NULL DEFAULT 0,
  initial_payment numeric(12,2) NOT NULL DEFAULT 0,
  amount_paid    numeric(12,2) NOT NULL DEFAULT 0,
  outstanding    numeric(12,2) NOT NULL DEFAULT 0,
  status         text NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active', 'partial', 'settled', 'overdue')),
  notes          text DEFAULT '',
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

ALTER TABLE credit_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "credit_records_select" ON credit_records FOR SELECT USING (true);
CREATE POLICY "credit_records_insert" ON credit_records FOR INSERT WITH CHECK (true);
CREATE POLICY "credit_records_update" ON credit_records FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "credit_records_delete" ON credit_records FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS idx_credit_records_business_id  ON credit_records(business_id);
CREATE INDEX IF NOT EXISTS idx_credit_records_customer_id  ON credit_records(customer_id);
CREATE INDEX IF NOT EXISTS idx_credit_records_status       ON credit_records(business_id, status);
CREATE INDEX IF NOT EXISTS idx_credit_records_due_date     ON credit_records(due_date);
