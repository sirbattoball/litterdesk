-- Migration: create contact_messages table
-- This is a brand-new table, so it will actually be auto-created by
-- Base.metadata.create_all() on the next backend deploy/restart —
-- create_all() only fails to add COLUMNS to EXISTING tables, it's fine
-- with entirely new tables. No manual ALTER needed for this one.
-- This file is just here for the record / in case you want to run it
-- manually ahead of a deploy.

CREATE TABLE IF NOT EXISTS contact_messages (
    id VARCHAR PRIMARY KEY,
    name VARCHAR,
    email VARCHAR NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_contact_messages_email ON contact_messages (email);
