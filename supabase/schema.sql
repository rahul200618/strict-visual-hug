-- ============================================================
-- Skyward Properties CRM — Supabase Schema  (idempotent, re-run safe)
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. PROPERTIES
-- ============================================================
CREATE TABLE IF NOT EXISTS properties (
  id                  TEXT PRIMARY KEY,
  title               TEXT NOT NULL DEFAULT '',
  location            TEXT NOT NULL DEFAULT '',
  city                TEXT NOT NULL DEFAULT '',
  type                TEXT NOT NULL DEFAULT 'Villa',
  status              TEXT NOT NULL DEFAULT 'Available',
  price               NUMERIC NOT NULL DEFAULT 0,
  currency            TEXT NOT NULL DEFAULT '₹',
  bedrooms            INTEGER NOT NULL DEFAULT 0,
  bathrooms           INTEGER NOT NULL DEFAULT 0,
  area                INTEGER NOT NULL DEFAULT 0,
  parking             INTEGER NOT NULL DEFAULT 0,
  furnished           TEXT NOT NULL DEFAULT 'Unfurnished',
  facing              TEXT NOT NULL DEFAULT '',
  description         TEXT NOT NULL DEFAULT '',
  amenities           JSONB NOT NULL DEFAULT '[]',
  images              JSONB NOT NULL DEFAULT '[]',
  featured            BOOLEAN NOT NULL DEFAULT false,
  owner_name          TEXT NOT NULL DEFAULT '',
  owner_phone         TEXT NOT NULL DEFAULT '',
  owner_email         TEXT NOT NULL DEFAULT '',
  published           BOOLEAN NOT NULL DEFAULT false,
  hide_exact_location BOOLEAN NOT NULL DEFAULT false,
  show_contact        BOOLEAN NOT NULL DEFAULT true,
  seo_title           TEXT NOT NULL DEFAULT '',
  seo_description     TEXT NOT NULL DEFAULT '',
  internal_notes      TEXT NOT NULL DEFAULT '',
  documents           JSONB NOT NULL DEFAULT '[]',
  agent_name          TEXT NOT NULL DEFAULT '',
  agent_title         TEXT NOT NULL DEFAULT '',
  agent_phone         TEXT NOT NULL DEFAULT '',
  agent_email         TEXT NOT NULL DEFAULT '',
  agent_avatar        TEXT NOT NULL DEFAULT '',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. LEADS
-- ============================================================
CREATE TABLE IF NOT EXISTS leads (
  id             TEXT PRIMARY KEY,
  kind           TEXT NOT NULL DEFAULT 'Buyer',
  name           TEXT NOT NULL DEFAULT '',
  phone          TEXT NOT NULL DEFAULT '',
  email          TEXT NOT NULL DEFAULT '',
  message        TEXT NOT NULL DEFAULT '',
  property_id    TEXT REFERENCES properties(id) ON DELETE SET NULL,
  location       TEXT NOT NULL DEFAULT '',
  property_type  TEXT NOT NULL DEFAULT '',
  expected_price TEXT NOT NULL DEFAULT '',
  source         TEXT NOT NULL DEFAULT 'Website',
  status         TEXT NOT NULL DEFAULT 'New',
  priority       TEXT NOT NULL DEFAULT 'Warm',
  assignee       TEXT NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. INTERACTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS interactions (
  id      TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  by      TEXT NOT NULL DEFAULT '',
  kind    TEXT NOT NULL DEFAULT 'Note',
  text    TEXT NOT NULL DEFAULT ''
);

-- ============================================================
-- 4. FOLLOW-UPS
-- ============================================================
CREATE TABLE IF NOT EXISTS follow_ups (
  id           TEXT PRIMARY KEY,
  lead_id      TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  action       TEXT NOT NULL DEFAULT 'Call',
  notes        TEXT NOT NULL DEFAULT '',
  done         BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 5. NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id    TEXT PRIMARY KEY,
  at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  kind  TEXT NOT NULL DEFAULT 'system',
  title TEXT NOT NULL DEFAULT '',
  body  TEXT NOT NULL DEFAULT '',
  read  BOOLEAN NOT NULL DEFAULT false,
  href  TEXT NOT NULL DEFAULT ''
);

-- ============================================================
-- 6. ACTIVITY LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS activity (
  id    TEXT PRIMARY KEY,
  at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor TEXT NOT NULL DEFAULT '',
  text  TEXT NOT NULL DEFAULT ''
);

-- ============================================================
-- 7. WEBSITE CONTENT (single-row config)
-- ============================================================
CREATE TABLE IF NOT EXISTS website_content (
  id               TEXT PRIMARY KEY DEFAULT 'singleton',
  hero_headline    TEXT NOT NULL DEFAULT 'Skyward Properties',
  hero_sub         TEXT NOT NULL DEFAULT 'Premium real estate, expertly managed.',
  about_body       TEXT NOT NULL DEFAULT '',
  contact_email    TEXT NOT NULL DEFAULT '',
  contact_phone    TEXT NOT NULL DEFAULT '',
  contact_address  TEXT NOT NULL DEFAULT '',
  seo_title        TEXT NOT NULL DEFAULT 'Skyward Properties',
  seo_description  TEXT NOT NULL DEFAULT '',
  testimonials     JSONB NOT NULL DEFAULT '[]',
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed the singleton row if it doesn't exist yet
INSERT INTO website_content (id) VALUES ('singleton') ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_leads_status      ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at  ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_followups_lead_id ON follow_ups(lead_id);
CREATE INDEX IF NOT EXISTS idx_followups_sched   ON follow_ups(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_interactions_lead ON interactions(lead_id);
CREATE INDEX IF NOT EXISTS idx_activity_at       ON activity(at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_at  ON notifications(at DESC);

-- ============================================================
-- REALTIME — enable change tracking for live sync
-- ============================================================
ALTER TABLE properties    REPLICA IDENTITY FULL;
ALTER TABLE leads         REPLICA IDENTITY FULL;
ALTER TABLE follow_ups    REPLICA IDENTITY FULL;
ALTER TABLE notifications REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE properties;
ALTER PUBLICATION supabase_realtime ADD TABLE leads;
ALTER PUBLICATION supabase_realtime ADD TABLE follow_ups;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE properties     ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads          ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups     ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity       ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_content ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (safe to re-run)
DROP POLICY IF EXISTS "anon_all_properties"    ON properties;
DROP POLICY IF EXISTS "anon_all_leads"         ON leads;
DROP POLICY IF EXISTS "anon_all_interactions"  ON interactions;
DROP POLICY IF EXISTS "anon_all_follow_ups"    ON follow_ups;
DROP POLICY IF EXISTS "anon_all_notifications" ON notifications;
DROP POLICY IF EXISTS "anon_all_activity"      ON activity;
DROP POLICY IF EXISTS "anon_all_website"       ON website_content;

-- Allow all operations via anon key (CRM protected by Supabase Auth login)
CREATE POLICY "anon_all_properties"    ON properties      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_leads"         ON leads           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_interactions"  ON interactions    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_follow_ups"    ON follow_ups      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_notifications" ON notifications   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_activity"      ON activity        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_website"       ON website_content FOR ALL USING (true) WITH CHECK (true);
