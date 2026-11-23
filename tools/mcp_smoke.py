"""End-to-end smoke test of the MCP server against a local instance started with DEV_LOGIN_EMAIL.

Runs the OAuth flow (register, authorize, token with PKCE), then exercises the tools:
search, create and assign, publish, check the public data.js, preview, export, import dry run,
delete. Standard library only:  python3 tools/mcp_smoke.py [http://localhost:8080]
"""

import base64
import hashlib
import json
import re
import secrets
import sys
import urllib.error
import urllib.parse
import urllib.request

BASE = (sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8080').rstrip('/')


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        return None


def http(method, url, body=None, headers=None, form=False):
    data = None
    h = dict(headers or {})
    if body is not None:
        if form:
            data = urllib.parse.urlencode(body).encode()
            h['Content-Type'] = 'application/x-www-form-urlencoded'
        else:
            data = json.dumps(body).encode()
            h['Content-Type'] = 'application/json'
    req = urllib.request.Request(url, data=data, headers=h, method=method)
    opener = urllib.request.build_opener(NoRedirect)
    try:
        r = opener.open(req)
        return r.status, dict(r.headers), r.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), e.read().decode()


# 1. Unauthenticated /mcp must point at the metadata.
s, h, _ = http('POST', BASE + '/mcp', {'jsonrpc': '2.0', 'id': 0, 'method': 'ping'})
assert s == 401 and 'resource_metadata' in h.get('www-authenticate', h.get('WWW-Authenticate', '')), (s, h)

# 2. OAuth: register, authorize (dev login answers at once), token.
s, _, b = http('POST', BASE + '/register', {'redirect_uris': ['http://localhost:9/cb'], 'client_name': 'smoke'})
assert s == 201, (s, b)
client = json.loads(b)['client_id']
verifier = secrets.token_urlsafe(48)
challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b'=').decode()
q = urllib.parse.urlencode({'response_type': 'code', 'client_id': client, 'redirect_uri': 'http://localhost:9/cb',
                            'code_challenge': challenge, 'code_challenge_method': 'S256', 'state': 'xyz'})
def approve():
    """Dev login lands on the consent page; check what it names, then press Allow."""
    s, h, b = http('GET', BASE + '/authorize?' + q)
    assert s == 200 and 'smoke' in b and 'localhost' in b and "frame-ancestors 'none'" in h.get('content-security-policy', h.get('Content-Security-Policy', '')), (s, b)
    cid = re.search(r"name=id value='([^']+)'", b).group(1)
    s, h, b = http('POST', BASE + '/authorize/consent', {'id': cid, 'decision': 'allow'}, form=True)
    loc = h.get('location') or h.get('Location')
    assert s in (302, 303, 307) and loc, (s, b)
    s2, _, _ = http('POST', BASE + '/authorize/consent', {'id': cid, 'decision': 'allow'}, form=True)
    assert s2 == 400, 'a consent id is single use'
    return urllib.parse.parse_qs(urllib.parse.urlparse(loc).query)


params = approve()
assert params['state'] == ['xyz']
s, _, b = http('POST', BASE + '/token', {'grant_type': 'authorization_code', 'code': params['code'][0],
                                         'redirect_uri': 'http://localhost:9/cb', 'client_id': client,
                                         'code_verifier': 'wrong' + verifier}, form=True)
assert s == 400, 'bad verifier must fail'
s, _, b = http('POST', BASE + '/token', {'grant_type': 'authorization_code', 'code': params['code'][0],
                                         'redirect_uri': 'http://localhost:9/cb', 'client_id': client,
                                         'code_verifier': verifier}, form=True)
assert s == 400, 'a code is single use, even after a failed attempt'
code = approve()['code'][0]
s, _, b = http('POST', BASE + '/token', {'grant_type': 'authorization_code', 'code': code,
                                         'redirect_uri': 'http://localhost:9/cb', 'client_id': client,
                                         'code_verifier': verifier}, form=True)
assert s == 200, (s, b)
tok = json.loads(b)
s, _, b = http('POST', BASE + '/token', {'grant_type': 'refresh_token', 'refresh_token': tok['refresh_token']}, form=True)
assert s == 400, 'refresh needs client_id'
s, _, b = http('POST', BASE + '/token', {'grant_type': 'refresh_token', 'refresh_token': tok['refresh_token'],
                                         'client_id': client}, form=True)
assert s == 200, (s, b)
token = json.loads(b)['access_token']

# 3. MCP session.
session = {}
seq = [0]


def rpc(method, params=None, notify=False):
    msg = {'jsonrpc': '2.0', 'method': method}
    if params is not None:
        msg['params'] = params
    if not notify:
        seq[0] += 1
        msg['id'] = seq[0]
    hdr = {'Authorization': 'Bearer ' + token, 'Accept': 'application/json, text/event-stream'}
    if 'id' in session:
        hdr['Mcp-Session-Id'] = session['id']
        hdr['MCP-Protocol-Version'] = session['version']
    s, h, b = http('POST', BASE + '/mcp', msg, hdr)
    assert s in (200, 202), (method, s, b)
    sid = h.get('mcp-session-id') or h.get('Mcp-Session-Id')
    if sid:
        session['id'] = sid
    if notify:
        return None
    for line in b.splitlines():
        if line.startswith('data:') and line[5:].strip():
            m = json.loads(line[5:])
            if m.get('id') == msg['id']:
                b = line[5:]
                break
    m = json.loads(b)
    assert 'error' not in m, (method, m)
    return m['result']


init = rpc('initialize', {'protocolVersion': '2025-06-18', 'capabilities': {},
                          'clientInfo': {'name': 'smoke', 'version': '1'}})
session['version'] = init['protocolVersion']
rpc('notifications/initialized', notify=True)
tools = {t['name']: t for t in rpc('tools/list')['tools']}
assert tools['preview'].get('_meta', {}).get('ui', {}).get('resourceUri'), tools['preview']


def call(name, args=None):
    r = rpc('tools/call', {'name': name, 'arguments': args or {}})
    if r.get('isError'):
        return r, r['content'][0]['text']
    return r, r.get('structuredContent') or json.loads(r['content'][0]['text'])


r, found = call('search_records', {'query': 'jacob caldwell', 'types': ['B/M/D']})
assert found['total'] >= 1, found
rec = found['records'][0]

# Record ids come from the source entry. An old text id (v1 exports) still finds its record,
# unless several source entries share it.
assert rec['legacy_id'].startswith('s'), rec
seed = json.load(open('seed/records.json'))['records']
old = {}
for s in seed:
    old.setdefault(s['legacy'], []).append(s['id'])
text_id = next(s['legacy'] for s in seed if s['id'] == rec['legacy_id'])
assert len(old[text_id]) == 1, 'pick a record whose old text id is unique'
r, out = call('get_record', {'id': text_id})
assert out['record']['id'] == rec['id'], out
shared = next(k for k, v in old.items() if len(v) > 1)
r, out = call('get_record', {'id': shared})
assert r.get('isError'), 'an old text id shared by several records must not pick one'
for sid in old[shared]:
    r, out = call('get_record', {'id': sid})
    assert out['record']['legacy_hash'] == sid, out

r, out = call('assign_records', {'records': [{'record_id': rec['id'], 'confidence': 'Probable', 'explanation': ''}],
                                 'new_profile_name': 'Smoke Test Kent'})
assert r.get('isError'), 'empty explanation must be refused'
r, out = call('assign_records', {'new_profile_name': 'Smoke Test Kent', 'records': [
    {'record_id': rec['legacy_id'], 'confidence': 'Proven', 'explanation': 'Smoke test.'}]})
pid = out['profile_id']
r, out = call('save_profile', {'id': pid, 'birth_death_dates': 'b. 1931'})
assert r.get('isError'), 'living-person check must refuse'

public = urllib.request.urlopen(BASE + '/data.js').read().decode()
assert 'Smoke Test Kent' not in public, 'drafts must not reach visitors'
call('set_visibility', {'kind': 'profile', 'id': pid, 'visibility': 'published'})
public = urllib.request.urlopen(BASE + '/data.js').read().decode()
assert 'Smoke Test Kent' in public and rec['legacy_id'] in public, 'published profile and its record id in data.js'

r, out = call('preview', {'profile_id': pid})
assert out['select'] == 'p:' + pid
res = rpc('resources/read', {'uri': tools['preview']['_meta']['ui']['resourceUri']})
assert res['contents'][0]['mimeType'].startswith('text/html') and 'window.__oftResearch' in res['contents'][0]['text']

r, out = call('export_research')
exported = out['export']
r, rep = call('import_research', {'data': exported})
assert rep['dry_run'] and rep['skipped_existing'] >= 1, rep
# A v1 file (non-UUID ids) imported twice adds its items once; the second run links to them.
v1 = {'version': 1, 'profiles': [{'id': 'p_smoke_v1', 'fullName': 'Smoke Test V1', 'assignedRecords': [
          {'recordId': text_id, 'confidence': 'Probable', 'explanation': 'Smoke test.'}]}],
      'familyGroups': [{'id': 'fg_smoke_v1', 'title': 'Smoke Test V1 group', 'members': [
          {'profileId': 'p_smoke_v1', 'name': '', 'relationship': 'self', 'confidence': 'Proven', 'citation': 'c'}]}]}
r, rep = call('import_research', {'data': v1, 'dry_run': False})
assert rep['profiles_added'] == 1 and rep['family_groups_added'] == 1 and rep['assignments_attached'] == 1, rep
r, rep = call('import_research', {'data': v1, 'dry_run': False})
assert rep['profiles_added'] == 0 and rep['family_groups_added'] == 0 and rep['skipped_existing'] == 2, rep
r, lr = call('list_research')
v1p = [p for p in lr['profiles'] if p['full_name'] == 'Smoke Test V1']
v1g = [g for g in lr['family_groups'] if g['title'] == 'Smoke Test V1 group']
assert len(v1p) == 1 and len(v1g) == 1, lr
call('delete_family_group', {'id': v1g[0]['id'], 'confirm': True})
call('delete_profile', {'id': v1p[0]['id'], 'confirm': True})

r, out = call('delete_profile', {'id': pid})
assert r.get('isError'), 'delete needs confirm'
r, out = call('delete_profile', {'id': pid, 'confirm': True})
r, log = call('get_audit_log', {'entity_id': pid})
assert len(log['events']) >= 3, log
public = urllib.request.urlopen(BASE + '/data.js').read().decode()
assert 'Smoke Test Kent' not in public
print('MCP smoke test passed:', len(tools), 'tools')
