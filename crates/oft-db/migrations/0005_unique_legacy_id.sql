-- An import finds earlier imports by legacy_id, so each legacy_id must name one item.
-- Keep the legacy_id on the oldest item and clear it on the others.
UPDATE profile p SET legacy_id = NULL
 WHERE EXISTS (SELECT 1 FROM profile o
                WHERE o.legacy_id = p.legacy_id
                  AND (o.created_at, o.id) < (p.created_at, p.id));
UPDATE family_group g SET legacy_id = NULL
 WHERE EXISTS (SELECT 1 FROM family_group o
                WHERE o.legacy_id = g.legacy_id
                  AND (o.created_at, o.id) < (g.created_at, g.id));

-- Two imports at the same time cannot both add an item with one legacy_id; the second fails.
CREATE UNIQUE INDEX profile_legacy_id ON profile (legacy_id) WHERE legacy_id IS NOT NULL;
CREATE UNIQUE INDEX family_group_legacy_id ON family_group (legacy_id) WHERE legacy_id IS NOT NULL;
