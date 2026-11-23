-- Record ids come from the source entry, not from the row text (PRD §7.1, revised).
-- `legacy_hash` stays the id the page uses for a row; the importer changes it from the old
-- text id to the source id. `text_hash` keeps the old text id, so v1 research exports still find
-- their records. Different source entries can have the same text, so `text_hash` is not unique.
ALTER TABLE record ADD COLUMN text_hash text;
CREATE INDEX record_text_hash ON record (text_hash);
