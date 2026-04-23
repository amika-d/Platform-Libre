-- src/db/migrations/004_add_cycle_number.sql
ALTER TABLE outreach_status ADD COLUMN IF NOT EXISTS cycle_number_campaign INTEGER DEFAULT 1;