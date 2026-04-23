-- migrations/add_linkedin_outreach.sql

CREATE TABLE IF NOT EXISTS linkedin_outreach (
    id                SERIAL PRIMARY KEY,
    outreach_id       INT REFERENCES outreach_status(id) ON DELETE SET NULL,
    campaign_id       TEXT        NOT NULL,
    linkedin_url      TEXT        NOT NULL UNIQUE,
    profile_name      TEXT        DEFAULT '',
    company           TEXT        DEFAULT '',
    variant_used      TEXT        DEFAULT 'A',

    -- invite tracking
    invite_status     TEXT        DEFAULT 'pending',   -- pending / accepted / failed
    invite_sent_at    TIMESTAMPTZ,
    accepted_at       TIMESTAMPTZ,

    -- dm tracking
    message_text      TEXT        DEFAULT '',
    message_sent_at   TIMESTAMPTZ,
    message_status    TEXT        DEFAULT 'not_sent',  -- not_sent / sent / failed

    -- reply tracking
    reply_body        TEXT,
    replied_at        TIMESTAMPTZ,

    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_linkedin_campaign   ON linkedin_outreach(campaign_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_invite_status ON linkedin_outreach(invite_status);
CREATE INDEX IF NOT EXISTS idx_linkedin_message_status ON linkedin_outreach(message_status);

-- auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_linkedin_updated_at ON linkedin_outreach;
CREATE TRIGGER trg_linkedin_updated_at
  BEFORE UPDATE ON linkedin_outreach
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();