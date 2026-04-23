CREATE TABLE IF NOT EXISTS campaign_memory (
    id              SERIAL PRIMARY KEY,
    campaign_id     VARCHAR        NOT NULL,
    cycle_number    INTEGER        NOT NULL,

    -- The confirmed learning
    hypothesis      TEXT           NOT NULL,
    confirmed       BOOLEAN        DEFAULT true,
    confidence      VARCHAR,                      -- 'high' | 'medium'

    -- What failed
    failed_angle    TEXT,                         -- the losing angle, if any

    -- Context
    segment         VARCHAR,                      -- who this applies to
    best_channel    VARCHAR,                      -- 'email' | 'linkedin'
    rule_for_next_cycle TEXT,                     -- CONSTRAINT injected into next research query

    -- Raw metrics that produced this learning
    variant_a_open_rate   NUMERIC,
    variant_a_reply_rate  NUMERIC,                -- <-- ADDED COMMA HERE
    variant_a_meetings    INTEGER,
    variant_b_open_rate   NUMERIC,
    variant_b_reply_rate  NUMERIC,
    variant_b_meetings    INTEGER,
    winner                VARCHAR,                -- 'A' | 'B' | 'neither'

    created_at      TIMESTAMPTZ    DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_memory_lookup
    ON campaign_memory (campaign_id, cycle_number);