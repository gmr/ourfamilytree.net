// One-off: split the v114 single-file page into
//   frontend/index.html  markup and CSS, loading data.js then app.js
//   frontend/app.js      the page's script without its data literals
//   seed/datasets.json   every top-level `const X = <array|object literal>` as JSON, in page order
// The server later serves the datasets back as data.js (`const X=...;`), so app.js runs unchanged.
// A literal moves only when it can be evaluated statically (literals, + and unary -, and
// identifiers that name a primitive const), so its value is exactly what the page computed.
// Regex literals are stored as {"$re": [source, flags]}.
import fs from 'node:fs';
import path from 'node:path';
import * as acorn from 'acorn';

const [src = '../../plans/source/Kent_and_Kint_Records_Map_v114.html', root = '../..'] = process.argv.slice(2);
const html = fs.readFileSync(src, 'utf8');
const m = /<script>([\s\S]*?)<\/script>/.exec(html);
if (!m) throw new Error('no inline <script> in page');
const js = m[1];
const ast = acorn.parse(js, { ecmaVersion: 'latest', sourceType: 'script' });

const prims = new Map(); // primitive consts usable by later literals (for example WP)
class Impure extends Error {}

function ev(n) {
  switch (n.type) {
    case 'Literal':
      // JSON has no regex: encode it; the server writes it back as a regex literal in data.js
      if (n.regex) return { $re: [n.regex.pattern, n.regex.flags] };
      return n.value;
    case 'TemplateLiteral':
      return n.quasis.map((q, i) => q.value.cooked + (i < n.expressions.length ? String(ev(n.expressions[i])) : '')).join('');
    case 'ArrayExpression':
      return n.elements.map((e) => {
        if (!e || e.type === 'SpreadElement') throw new Impure();
        return ev(e);
      });
    case 'ObjectExpression': {
      const o = {};
      for (const p of n.properties) {
        if (p.type !== 'Property' || p.kind !== 'init' || p.method || p.shorthand) throw new Impure();
        const k = p.computed ? ev(p.key) : p.key.type === 'Identifier' ? p.key.name : p.key.value;
        o[k] = ev(p.value);
      }
      return o;
    }
    case 'UnaryExpression':
      if (n.operator === '-') return -ev(n.argument);
      if (n.operator === '+') return +ev(n.argument);
      if (n.operator === '!') return !ev(n.argument);
      throw new Impure();
    case 'BinaryExpression':
      if (n.operator === '+') return ev(n.left) + ev(n.right);
      throw new Impure();
    case 'Identifier':
      if (n.name === 'undefined' || !prims.has(n.name)) throw new Impure();
      return prims.get(n.name);
    default:
      throw new Impure();
  }
}

const datasets = [];
const cuts = [];
for (const st of ast.body) {
  if (st.type !== 'VariableDeclaration' || st.kind !== 'const') continue;
  const vals = [];
  try {
    for (const d of st.declarations) {
      if (d.id.type !== 'Identifier' || !d.init) throw new Impure();
      vals.push([d.id.name, d.init.type, ev(d.init)]);
    }
  } catch (e) {
    if (e instanceof Impure) continue;
    throw e;
  }
  for (const [name, , v] of vals) if (v === null || typeof v !== 'object') prims.set(name, v);
  if (!vals.every(([, t]) => t === 'ArrayExpression' || t === 'ObjectExpression')) continue;
  for (const [name, , value] of vals) {
    if (JSON.stringify(value).includes('undefined')) throw new Error(`${name}: value not JSON-safe`);
    datasets.push({ name, value });
  }
  cuts.push([st.start, st.end]);
}

let app = '';
let at = 0;
for (const [s, e] of cuts) {
  app += js.slice(at, s) + '/* data: served by /data.js */';
  at = e;
}
app += js.slice(at);

const page = html.slice(0, m.index) + '<script src="data.js"></script>\n<script src="app.js"></script>' + html.slice(m.index + m[0].length);
fs.mkdirSync(path.join(root, 'frontend'), { recursive: true });
fs.mkdirSync(path.join(root, 'seed'), { recursive: true });
fs.writeFileSync(path.join(root, 'frontend/index.html'), page);
fs.writeFileSync(path.join(root, 'frontend/app.js'), app);
fs.writeFileSync(path.join(root, 'seed/datasets.json'), JSON.stringify(datasets));
console.log(`moved ${datasets.length} datasets:`, datasets.map((d) => d.name).join(' '));
console.log(`app.js ${app.length} bytes (page script ${js.length})`);
