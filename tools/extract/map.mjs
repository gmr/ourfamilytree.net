// Parity check for the map (PRD §10.2 #3, §12.11): render the v114 page and the new site in each
// map view and compare the SVG and the county badge bar.
//   node map.mjs <old url> <new url>
import { chromium } from 'playwright';

const [oldUrl, newUrl] = process.argv.slice(2);
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || 'chrome' });

async function snap(url) {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(500);
  const out = { errors, views: {} };
  for (const v of ['core', 'morris', 'all']) {
    out.views[v] = await page.evaluate((v) => {
      // `view` and `draw` are globals of the page script.
      // eslint-disable-next-line no-undef
      view = v; draw();
      const svg = document.getElementById('map');
      return { svg: svg ? svg.innerHTML : '', bar: document.getElementById('cmbar')?.innerText || '', marks: svg ? svg.querySelectorAll('g.mk').length : 0 };
    }, v);
  }
  await page.close();
  return out;
}

const a = await snap(oldUrl), b = await snap(newUrl);
await browser.close();
let bad = a.errors.length + b.errors.length;
for (const e of [...a.errors, ...b.errors]) console.log('page error:', e);
for (const v of Object.keys(a.views)) {
  const x = a.views[v], y = b.views[v];
  const same = x.svg === y.svg && x.bar === y.bar;
  if (!same) bad++;
  console.log(`${v}: ${x.marks} markers, svg ${x.svg.length} bytes: ${same ? 'identical' : 'DIFFERENT'}`);
}
process.exit(bad ? 1 : 0);
