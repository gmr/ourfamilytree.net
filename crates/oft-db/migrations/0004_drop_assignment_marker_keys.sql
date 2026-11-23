-- Research reads marker keys from the record, so a changed record moves its research on the map.
ALTER TABLE assignment DROP COLUMN marker_keys;
