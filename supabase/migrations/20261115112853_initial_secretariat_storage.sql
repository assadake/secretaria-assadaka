-- Stockage privé de l'application Secrétariat Assedaka.
-- Schéma séparé de public pour ne pas entrer en collision avec d'autres tables
-- du projet et pour ne pas exposer les lettres via l'API REST Supabase.
CREATE SCHEMA IF NOT EXISTS secretariat;
REVOKE ALL ON SCHEMA secretariat FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS secretariat.docs (
    kind TEXT NOT NULL,
    id TEXT NOT NULL,
    json TEXT NOT NULL,
    updated_at BIGINT NOT NULL,
    PRIMARY KEY (kind, id)
);
CREATE TABLE IF NOT EXISTS secretariat.counters (
    name TEXT PRIMARY KEY,
    value BIGINT NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS secretariat.meta (
    k TEXT PRIMARY KEY,
    v TEXT
);
CREATE TABLE IF NOT EXISTS secretariat.revoked_sessions (
    nonce TEXT PRIMARY KEY,
    exp BIGINT NOT NULL
);

-- Defense in depth: the server connects with the database owner; browser roles
-- (anon/authenticated) cannot access the archive, even if this schema is later
-- added to Supabase's exposed schemas.
ALTER TABLE secretariat.docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE secretariat.counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE secretariat.meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE secretariat.revoked_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA secretariat FROM PUBLIC, anon, authenticated;
