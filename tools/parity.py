"""Compare two records files from tools/extract/records.mjs: ids, marker keys and sections."""
import json
import sys

a, b = (json.load(open(p)) for p in sys.argv[1:3])
A = {r['id']: r for r in a['records']}
B = {r['id']: r for r in b['records']}
diff = [k for k in A.keys() & B.keys() if A[k]['mk'] != B[k]['mk'] or sorted(A[k]['sections']) != sorted(B[k]['sections'])]
print(f"rows {a['rowCount']} / {b['rowCount']}; records {len(A)} / {len(B)}; "
      f"missing {len(A.keys() - B.keys())}; extra {len(B.keys() - A.keys())}; changed {len(diff)}; page errors {len(b['errors'])}")
sys.exit(1 if (a['rowCount'] != b['rowCount'] or A.keys() != B.keys() or diff or b['errors']) else 0)
