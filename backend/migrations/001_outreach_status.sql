-- run this once against your growth_db
-- psql -U postgres -d growth_db -f migrations/001_outreach_status.sql

CREATE TABLE IF NOT EXISTS outreach_status (
    id            SERIAL PRIMARY KEY,
    campaign_id   VARCHAR        NOT NULL,
    prospect_name VARCHAR,
    email         VARCHAR        NOT NULL,
    company       VARCHAR,
    channel       VARCHAR        DEFAULT 'email',

    -- lifecycle: queued → sent → opened → replied → bounced
    status        VARCHAR        DEFAULT 'queued',

    variant_used  VARCHAR,                          -- e.g. "A", "B"
    touch_number  INTEGER        DEFAULT 1,         -- 1, 2, or 3

    -- Resend message id — used to match webhook events back to this row
    resend_id     VARCHAR        UNIQUE,

    sent_at       TIMESTAMPTZ,
    opened_at     TIMESTAMPTZ,
    replied_at    TIMESTAMPTZ,
    error_msg     VARCHAR,
    created_at    TIMESTAMPTZ    DEFAULT NOW()
);

-- index for the scheduler queries (find un-replied sent rows older than N days)
CREATE INDEX IF NOT EXISTS idx_outreach_status_lookup
    ON outreach_status (status, touch_number, sent_at);

-- index for webhook lookups by resend_id
CREATE INDEX IF NOT EXISTS idx_outreach_resend_id
    ON outreach_status (resend_id);