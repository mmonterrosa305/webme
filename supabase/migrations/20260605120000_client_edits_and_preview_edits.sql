-- Track client dashboard publishes (Basic plan monthly edit limit).
CREATE TABLE IF NOT EXISTS client_edits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  edited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  month_year TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_client_edits_client_month
  ON client_edits(client_id, month_year);

-- Track free preview edits before checkout.
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS preview_edits_used INT NOT NULL DEFAULT 0;
