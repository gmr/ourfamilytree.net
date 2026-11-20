-- Map data: every data literal of the v114 page, served back to the browser as data.js.
-- Read-only in version 1 (PRD §11 #7). `position` keeps the page's declaration order.
CREATE TABLE dataset (
    name       text PRIMARY KEY,
    position   int NOT NULL UNIQUE,
    value      json NOT NULL, -- json, not jsonb: the page depends on object key order
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- One row per distinct record of the By-year list (PRD §5.3, §7.1). Research links to these.
-- `legacy_hash` is the page's own row id, so v1 research exports and the browser agree.
CREATE TABLE record (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_hash text NOT NULL UNIQUE,
    year_text   text NOT NULL,
    year        int,
    type_label  text NOT NULL,
    citation    text NOT NULL,
    details     text NOT NULL,
    place       text NOT NULL,
    marker_keys text[] NOT NULL DEFAULT '{}',
    sections    text[] NOT NULL DEFAULT '{}',
    search_text text NOT NULL,
    status      text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'removed')),
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX record_type_year ON record (type_label, year);

CREATE TABLE app_user (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email        text NOT NULL UNIQUE CHECK (email = lower(email)),
    display_name text NOT NULL DEFAULT '',
    role         text NOT NULL CHECK (role IN ('admin', 'co_admin')),
    active       boolean NOT NULL DEFAULT true,
    created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE profile (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name         text NOT NULL CHECK (length(full_name) BETWEEN 1 AND 200),
    spelling_variants text[] NOT NULL DEFAULT '{}',
    birth_death_dates text NOT NULL DEFAULT '' CHECK (length(birth_death_dates) <= 200),
    locations         text[] NOT NULL DEFAULT '{}',
    bio_summary       text NOT NULL DEFAULT '' CHECK (length(bio_summary) <= 4000),
    visibility        text NOT NULL DEFAULT 'draft' CHECK (visibility IN ('draft', 'published')),
    research_scope    text NOT NULL DEFAULT 'general' CHECK (research_scope IN ('general', 'project', 'own_line')),
    legacy_id         text,
    created_by        uuid REFERENCES app_user (id) ON DELETE SET NULL,
    updated_by        uuid REFERENCES app_user (id) ON DELETE SET NULL,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE assignment (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id  uuid NOT NULL REFERENCES profile (id) ON DELETE CASCADE,
    record_id   uuid NOT NULL REFERENCES record (id) ON DELETE RESTRICT,
    confidence  text NOT NULL CHECK (confidence IN ('Proven', 'Probable')),
    explanation text NOT NULL CHECK (length(explanation) BETWEEN 1 AND 600),
    snapshot    jsonb NOT NULL,
    marker_keys text[] NOT NULL DEFAULT '{}',
    created_by  uuid REFERENCES app_user (id) ON DELETE SET NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (profile_id, record_id)
);
CREATE INDEX assignment_record ON assignment (record_id);

CREATE TABLE family_group (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title          text NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
    dates          text NOT NULL DEFAULT '' CHECK (length(dates) <= 200),
    locations      text[] NOT NULL DEFAULT '{}',
    summary        text NOT NULL DEFAULT '' CHECK (length(summary) <= 4000),
    visibility     text NOT NULL DEFAULT 'draft' CHECK (visibility IN ('draft', 'published')),
    research_scope text NOT NULL DEFAULT 'general' CHECK (research_scope IN ('general', 'project', 'own_line')),
    legacy_id      text,
    created_by     uuid REFERENCES app_user (id) ON DELETE SET NULL,
    updated_by     uuid REFERENCES app_user (id) ON DELETE SET NULL,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now()
);

-- Deleting a profile keeps the member and its typed name (PRD §4.2).
CREATE TABLE family_group_member (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    family_group_id         uuid NOT NULL REFERENCES family_group (id) ON DELETE CASCADE,
    profile_id              uuid REFERENCES profile (id) ON DELETE SET NULL,
    name                    text NOT NULL CHECK (length(name) BETWEEN 1 AND 200),
    relationship            text NOT NULL CHECK (length(relationship) BETWEEN 1 AND 300),
    relationship_confidence text NOT NULL CHECK (relationship_confidence IN ('Proven', 'Probable')),
    citation                text NOT NULL CHECK (length(citation) BETWEEN 1 AND 600),
    sort_order              int NOT NULL DEFAULT 0
);
CREATE INDEX family_group_member_group ON family_group_member (family_group_id);

CREATE TABLE audit_log (
    id        bigserial PRIMARY KEY,
    user_id   uuid REFERENCES app_user (id) ON DELETE SET NULL,
    action    text NOT NULL CHECK (action IN ('create', 'update', 'delete', 'import', 'export', 'restore')),
    entity    text NOT NULL,
    entity_id text,
    before    jsonb,
    after     jsonb,
    at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_at ON audit_log (at DESC);

CREATE TABLE research_backup (
    id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    taken_at timestamptz NOT NULL DEFAULT now(),
    taken_by uuid REFERENCES app_user (id) ON DELETE SET NULL,
    kind     text NOT NULL CHECK (kind IN ('nightly', 'manual', 'pre_import', 'pre_restore')),
    payload  jsonb NOT NULL,
    counts   jsonb NOT NULL
);

-- OAuth 2.1 for the MCP endpoint. Codes and tokens are stored as SHA-256 hashes.
CREATE TABLE oauth_client (
    id            text PRIMARY KEY,
    name          text NOT NULL DEFAULT '',
    redirect_uris text[] NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE oauth_request (
    id             text PRIMARY KEY,
    client_id      text NOT NULL REFERENCES oauth_client (id) ON DELETE CASCADE,
    redirect_uri   text NOT NULL,
    code_challenge text NOT NULL,
    client_state   text,
    expires_at     timestamptz NOT NULL
);

CREATE TABLE oauth_code (
    code_hash      text PRIMARY KEY,
    client_id      text NOT NULL REFERENCES oauth_client (id) ON DELETE CASCADE,
    user_id        uuid NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    redirect_uri   text NOT NULL,
    code_challenge text NOT NULL,
    expires_at     timestamptz NOT NULL
);

CREATE TABLE oauth_token (
    token_hash text PRIMARY KEY,
    kind       text NOT NULL CHECK (kind IN ('access', 'refresh')),
    client_id  text NOT NULL REFERENCES oauth_client (id) ON DELETE CASCADE,
    user_id    uuid NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
