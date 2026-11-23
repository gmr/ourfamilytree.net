"""Compare two records files from tools/extract/records.mjs: ids and every field the importer stores.

A table change must not change a record id (`id`) or the text the importer writes to `record`
(year, type, citation, details, place, marker keys, sections). `legacy` is not compared: the
importer keeps the stored `text_hash` of an existing record.
"""
import json
import sys

FIELDS = ('y', 't', 'c', 'd', 'p', 'mk', 'year')

a, b = (json.load(open(p)) for p in sys.argv[1:3])
A = {r['id']: r for r in a['records']}
B = {r['id']: r for r in b['records']}
diff = []
for k in sorted(A.keys() & B.keys()):
    for f in FIELDS:
        if A[k].get(f) != B[k].get(f):
            diff.append((k, f, A[k].get(f), B[k].get(f)))
    if sorted(A[k]['sections']) != sorted(B[k]['sections']):
        diff.append((k, 'sections', A[k]['sections'], B[k]['sections']))
for k, f, x, y in diff[:10]:
    print(f"  {k} {f}: {x!r} -> {y!r}")
print(f"rows {a['rowCount']} / {b['rowCount']}; records {len(A)} / {len(B)}; "
      f"missing {len(A.keys() - B.keys())}; extra {len(B.keys() - A.keys())}; changed fields {len(diff)}; "
      f"page errors {len(b['errors'])}")
sys.exit(1 if (a['rowCount'] != b['rowCount'] or A.keys() != B.keys() or diff or b['errors']) else 0)
