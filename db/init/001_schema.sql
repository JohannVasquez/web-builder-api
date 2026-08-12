CREATE TABLE pages (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(255) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE page_sections (
  id SERIAL PRIMARY KEY,
  page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  type VARCHAR(100) NOT NULL,
  position INTEGER NOT NULL,
  props JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (page_id, position)
);

CREATE INDEX idx_page_sections_page_id ON page_sections(page_id);

CREATE TABLE global_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL
);
