-- Tags absent from this table are reported as `unknown`, so it is not a stored status.
CREATE TABLE hashtags (
  tag TEXT PRIMARY KEY NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('banned', 'restricted', 'reported', 'clear')),
  source TEXT NOT NULL,
  notes TEXT,
  last_verified_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
