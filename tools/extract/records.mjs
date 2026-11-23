// Open a page (the v114 file or the new site) in Chromium, with every county, township and
// record type ticked and the full year range, and list every row of the By-year view with the
// page's own record id (PRD §7.1). Also used as the parity check: run it on both and compare.
//   node records.mjs <url> <out.json>
import fs from 'node:fs';
import { chromium } from 'playwright';

const [url, out] = process.argv.slice(2);
if (!url || !out) throw new Error('usage: node records.mjs <url> <out.json>');

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || 'chrome' });
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(url, { waitUntil: 'load' });
await page.waitForSelector('#p-year tbody tr', { state: 'attached' });

const result = await page.evaluate(() => {
  // Tick every NJ county (NY counties have no records), every township and every type.
  const click = (sel) => document.querySelectorAll(sel).forEach((b) => b.click());
  document.querySelectorAll('#cbtns button[aria-pressed="false"]').forEach((b) => b.click());
  click('#lbAll');
  for (const id of ['landall', 'ratall', 'cenall', 'milall', 'courtall', 'bmdall', 'miscall']) {
    const c = document.getElementById(id);
    if (c && !c.checked) c.click();
  }
  // `id` is the page's own record id (data-rid, from the source entry). `legacy` is the old id
  // from the row text (PRD 7.1, v114 layout); the importer only uses it to find records that
  // were stored under it, and never changes it on a stored record.
  const FN = (s) => {
    let h = 2166136261, g = 5381;
    for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h ^= c; h = Math.imul(h, 16777619); g = ((g << 5) + g + c) | 0; }
    return 'r' + (h >>> 0).toString(16) + (g >>> 0).toString(16);
  };
  function rowInfo(tr) {
    const cells = [...tr.children].filter((c) => c.tagName === 'TD');
    if (!cells.length) return null;
    const txt = (c) => { const k = c.cloneNode(true); k.querySelectorAll('.rsw,.asl').forEach((n) => n.remove()); return k.textContent.replace(/\s+/g, ' ').trim(); };
    const parts = (cells.length >= 5 ? cells.slice(0, -1) : cells).map(txt);
    let pl = '';
    if (cells.length >= 5) { const lc = cells[cells.length - 1], f = lc.firstChild; pl = ((f && f.nodeType === 3 ? f.textContent : lc.textContent) || '').replace(/\s+/g, ' ').trim(); }
    // The compact row shows a shortened date, name and description, so the citation, details and
    // place are read from the canon-* spans in the expanded row beneath it, and the year and type
    // from their own cell classes. Nothing here depends on which column a value happens to sit in,
    // so the table can be reordered or reworded without changing what the importer stores.
    const det = tr.nextElementSibling && tr.nextElementSibling.classList.contains('det') ? tr.nextElementSibling : null;
    if (!det) {
      // County-only rows keep the original three-cell layout and have no expanded row.
      return { id: tr.dataset.rid, legacy: FN(parts.join('|').toLowerCase()), y: parts[0], t: parts[1] || '', c: parts[2] || '', d: parts.slice(3).join(' '), p: pl, mk: (tr.dataset.mk || '').split(',').filter(Boolean) };
    }
    const canon = (sel) => { const e = det.querySelector(sel); return e ? (e.textContent || '').replace(/\s+/g, ' ').trim() : ''; };
    const cell = (sel, fb) => { const e = tr.querySelector(sel); return e ? txt(e) : fb; };
    // The place badge ("named place", "township only") is a child element, as it was in the
    // original last column, so only the leading text node is the place itself.
    const place = () => { const e = det.querySelector('.canon-p'); if (!e) return pl; const f = e.firstChild; return ((f && f.nodeType === 3 ? f.textContent : e.textContent) || '').replace(/\s+/g, ' ').trim(); };
    const y = cell('td.y', parts[0]), t = cell('td.t', parts[1] || '');
    const c = canon('.canon-c'), d = canon('.canon-d'), p = place();
    // legacy keeps the v114 row-text id: that layout's first four columns were year, type,
    // citation and details, so it is rebuilt from the canonical values, not from the new cells.
    return { id: tr.dataset.rid, legacy: FN([y, t, c, d].join('|').toLowerCase()), y, t, c, d, p, mk: (tr.dataset.mk || '').split(',').filter(Boolean) };
  }
  const section = (tr) => {
    // The page writes the section name in data-sec, from the data, so a heading change cannot change it.
    const s = tr.closest('[data-sec]');
    return s ? s.dataset.sec.replace(/\s+/g, ' ').trim() : null;
  };
  const y0 = document.getElementById('y0'), y1 = document.getElementById('y1');
  // tr.det is the expanded half of the row above it, not a record of its own.
  const rows = [...document.querySelectorAll('#p-year tbody tr:not(.det)')].map((tr) => {
    const i = rowInfo(tr);
    return i && { ...i, section: section(tr), year: (/(1[6-9]\d\d)/.exec(i.y) || [])[1] || null };
  }).filter(Boolean);
  return { range: [y0.value, y1.value], rows };
});
await browser.close();

for (const r of result.rows) {
  if (!r.id) errors.push(`row without a record id: ${r.y} | ${r.t} | ${r.c}`);
  if (r.section == null) errors.push(`row without a section (data-sec): ${r.id}`);
}
const byId = new Map();
for (const r of result.rows) {
  const o = byId.get(r.id);
  if (o) {
    // A cross-reference shows the same source entry, so its row must say the same thing.
    for (const f of ['y', 't', 'c', 'd', 'p', 'mk']) {
      if (JSON.stringify(o[f]) !== JSON.stringify(r[f])) errors.push(`record ${r.id}: ${f} differs between sections ${o.sections[0]} and ${r.section}`);
    }
    o.sections.includes(r.section) || o.sections.push(r.section);
  }
  else byId.set(r.id, { ...r, sections: [r.section], section: undefined });
}
fs.writeFileSync(out, JSON.stringify({ errors, range: result.range, rowCount: result.rows.length, records: [...byId.values()] }, null, 1));
console.log(`${result.rows.length} rows, ${byId.size} distinct records, years ${result.range.join('-')}, ${errors.length} page errors`);
for (const e of errors.slice(0, 5)) console.log('  page error:', e);
