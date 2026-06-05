-- Receipt records table for persistent receipt history
CREATE TABLE IF NOT EXISTS receipt_records (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  sale_id      uuid REFERENCES sales(id) ON DELETE SET NULL,
  receipt_number text NOT NULL,
  receipt_data jsonb NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS receipt_records_business_id_idx ON receipt_records (business_id);
CREATE INDEX IF NOT EXISTS receipt_records_sale_id_idx     ON receipt_records (sale_id);
CREATE INDEX IF NOT EXISTS receipt_records_created_at_idx  ON receipt_records (business_id, created_at DESC);

ALTER TABLE receipt_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_receipts" ON receipt_records FOR SELECT
  TO authenticated USING (
    business_id IN (SELECT id FROM businesses WHERE credential_hash IS NOT NULL)
  );

CREATE POLICY "insert_own_receipts" ON receipt_records FOR INSERT
  TO authenticated WITH CHECK (
    business_id IN (SELECT id FROM businesses WHERE credential_hash IS NOT NULL)
  );

CREATE POLICY "delete_own_receipts" ON receipt_records FOR DELETE
  TO authenticated USING (
    business_id IN (SELECT id FROM businesses WHERE credential_hash IS NOT NULL)
  );

-- Anon access (app uses anon key)
CREATE POLICY "anon_select_receipts" ON receipt_records FOR SELECT TO anon
  USING (true);

CREATE POLICY "anon_insert_receipts" ON receipt_records FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "anon_delete_receipts" ON receipt_records FOR DELETE TO anon
  USING (true);
