CREATE TABLE IF NOT EXISTS discovery_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_type TEXT NOT NULL CHECK(source_type IN ('Company Website/Careers','RFP/RFQ Portal')),
  name TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  enabled INTEGER NOT NULL DEFAULT 1,
  last_run_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_discovery_sources_type_enabled ON discovery_sources(source_type, enabled);

CREATE TABLE IF NOT EXISTS excluded_domains (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain TEXT NOT NULL UNIQUE,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO excluded_domains(domain,reason) VALUES('archengineeringservices.com','Arch Engineering Services own company domain');
