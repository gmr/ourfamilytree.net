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
  // Copied from the page (RS.FN and RS.rowInfo) so the ids are the page's own.
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
    return { id: FN(parts.join('|').toLowerCase()), y: parts[0], t: parts[1] || '', c: parts[2] || '', d: parts.slice(3).join(' '), p: pl, mk: (tr.dataset.mk || '').split(',').filter(Boolean) };
  }
  const section = (tr) => {
    const d = tr.closest('details');
    if (d) return d.querySelector('summary > span')?.textContent.replace(/\s+/g, ' ').trim() || d.id;
    let h = tr.closest('table')?.previousElementSibling;
    while (h && h.tagName !== 'H3') h = h.previousElementSibling;
    return h ? h.textContent.trim() : '';
  };
  const y0 = document.getElementById('y0'), y1 = document.getElementById('y1');
  const rows = [...document.querySelectorAll('#p-year tbody tr')].map((tr) => {
    const i = rowInfo(tr);
    return i && { ...i, section: section(tr), year: (/(1[6-9]\d\d)/.exec(i.y) || [])[1] || null };
  }).filter(Boolean);
  return { range: [y0.value, y1.value], rows };
});
await browser.close();

const byId = new Map();
for (const r of result.rows) {
  const o = byId.get(r.id);
  if (o) o.sections.includes(r.section) || o.sections.push(r.section);
  else byId.set(r.id, { ...r, sections: [r.section], section: undefined });
}
fs.writeFileSync(out, JSON.stringify({ errors, range: result.range, rowCount: result.rows.length, records: [...byId.values()] }, null, 1));
console.log(`${result.rows.length} rows, ${byId.size} distinct records, years ${result.range.join('-')}, ${errors.length} page errors`);
for (const e of errors.slice(0, 5)) console.log('  page error:', e);
