
/* history notes for the old townships: shown in the township panel and in the shared township-only blocks (sources: Wikipedia articles citing Snyder, The Story of New Jersey's Civil Boundaries, and the other pages linked) */
/* data: served by /data.js */
/* data: served by /data.js *//* data: served by /data.js */
const histSrc=a=>a.map(([t,u])=>`<a href="${u}" target="_blank" rel="noopener">${t}</a>`).join('; ');
function tfHist(k){const mk=TFMUN[k];if(mk&&typeof MUN!=='undefined'&&MUN[mk])return`<p class="twh"><b>History.</b> ${MUN[mk].h}</p><p class="twsrc">Sources: ${histSrc(MUN[mk].s)}</p>`;const kk=k==='ny1'?'orangetown':k,o=OLDTW[kk];return o?`<p class="twh"><b>History.</b> ${o.h}</p><p class="twsrc">Sources: ${histSrc(o.s)}</p>`:''}
function shHist(b){const seen=new Set(),out=[];[...b.names].forEach(n=>{const k=OLDKEY[String(n).toLowerCase().replace(/ twp\.?.*$/,'').replace(/ \(.*$/,'').trim()];if(k&&!seen.has(k)&&OLDTW[k]){seen.add(k);out.push(OLDTW[k])}});return out.length?`<p class="twh"><b>History.</b> ${out.map(o=>o.h).join(' ')}</p><p class="twsrc">Sources: ${histSrc(out.flatMap(o=>o.s))}</p>`:''}
/* ---- Shared township-only blocks: a record given only by an old township (e.g. Caldwell Twp., Acquackanonk, Newark/Bloomfield) is listed ONCE per county
   in a block at the top, not repeated under every modern municipality it could lie in. Display only; no record data is changed. ---- */
const shTwName=t=>String(t).replace(/<[^>]+>/g,'').replace(/\s*\((?:the )?(?:old )?township.*\)$/i,'').replace(/ (Twp\.|Township|township)$/,'').trim();
function shPlan(ids,coll){/* coll(m) -> rows with .k (unique record key) and .sh (township only); returns {own:Map m->rows, blocks:[{sig,ms,rows,names}], of:Map m->[block]} */
  const own=new Map(),where=new Map(),first=new Map();
  ids.forEach(m=>{const rs=coll(m);own.set(m,rs.filter(r=>!r.sh));
    rs.filter(r=>r.sh).forEach(r=>{if(!where.has(r.k)){where.set(r.k,[]);first.set(r.k,r)}where.get(r.k).push(m)})});
  const bySig=new Map();
  where.forEach((ms,k)=>{const r=first.get(k);if(ms.length<2){own.get(ms[0]).push(r);return}
    const sig=ms.slice().sort().join('|');if(!bySig.has(sig))bySig.set(sig,{sig,ms:ms.slice(),rows:[],names:new Set()});const b=bySig.get(sig);b.rows.push(r);if(r.tw)b.names.add(shTwName(r.tw))});
  const blocks=[...bySig.values()].sort((a,b)=>b.ms.length-a.ms.length||b.rows.length-a.rows.length);
  const of=new Map();blocks.forEach((b,i)=>{b.id='sh-'+(window.__shN=(window.__shN||0)+1);b.ms.forEach(m=>{if(!of.has(m))of.set(m,[]);of.get(m).push(b)})});
  return{own,blocks,of}}
const shTitle=b=>{const n=[...b.names].filter(Boolean),pl=[...new Set(b.rows.filter(r=>r.pk).map(r=>'Place '+r.pk))];return n.length?'Historical '+n.slice(0,4).join(' / ')+(n.length>4?' and others':'')+' township-only records'+(pl.length?' (with '+pl.join(', ')+')':''):'Shared township-only records: '+pl.join(', ')};
const shApplies=b=>{const q=[...new Set(b.rows.map(r=>r.q).filter(Boolean))].sort((x,y)=>TFT.findIndex(z=>z[0]===x)-TFT.findIndex(z=>z[0]===y)).map(x=>TFLAB[x]||'Misc');return 'applies to '+b.ms.length+' modern municipalities'+(q.length?'; '+q.join(', '):'')};
const shRef=(bs,noun)=>{noun=noun||['record','records'];return bs.length?`<p class="shref">Plus ${bs.map(b=>`<a href="#${b.id}" data-sh="${b.id}">${b.rows.length} shared ${b.rows.length===1?noun[0]:noun[1]}</a> in “${shTitle(b)}” (${shApplies(b)})`).join('; ')}, listed once in the shared ${bs.length>1?'blocks':'block'} for this county and not counted above.</p>`:''};
document.addEventListener('click',e=>{const a=e.target.closest('a[data-sh]');if(!a)return;const d=document.getElementById(a.dataset.sh);if(d){e.preventDefault();d.open=true;d.scrollIntoView({behavior:'smooth',block:'start'})}});
/* county-only links from a location's notice: open the county block and go to it */
document.addEventListener('click',e=>{const a=e.target.closest('a[data-co]');if(!a)return;
  const c=a.dataset.co,h=document.getElementById('cosec-'+c);
  ['co-'+c,'co-np-'+c].forEach(id=>{const d=document.getElementById(id);if(d)d.open=true});
  if(h){e.preventDefault();h.scrollIntoView({behavior:'smooth',block:'start'})}});
/* data: served by /data.js */
/* data: served by /data.js */
/* data: served by /data.js */Object.entries(TG).forEach(([g,t])=>{const m=t.ids.map(i=>PL[i]);TGP[g]=[t.n,m.reduce((a,x)=>a+x[1],0)/m.length,m.reduce((a,x)=>a+x[2],0)/m.length,'deed',t.note,t.core]});
TGP.acquackanonk[1]=40.848;TGP.acquackanonk[2]=-74.180; /* marker set in the middle of old Acquackanonk, clear of the Little Falls section */
const rowsG=g=>TG[g].ids.flatMap(i=>rows(i));
/* data: served by /data.js */
/* data: served by /data.js */
/* hover pop-up for markers */
function tipEsc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function tipText(h,n){n=n||200;const d=document.createElement('div');d.innerHTML=h;const t=d.textContent.replace(/\s+/g,' ').trim();return t.length>n?t.slice(0,n).replace(/\s+\S*$/,'')+'…':t}
function tipShow(html,e){const t=document.getElementById('tip');t.innerHTML=html;t.style.display='block';tipMove(e)}
function tipMove(e){const t=document.getElementById('tip');if(t.style.display!=='block')return;const w=t.offsetWidth,h=t.offsetHeight;let x=e.clientX+16,y=e.clientY+16;if(x+w>innerWidth-8)x=e.clientX-w-16;if(x<8)x=8;if(y+h>innerHeight-8)y=e.clientY-h-16;if(y<8)y=8;t.style.left=x+'px';t.style.top=y+'px'}
function tipHide(){const t=document.getElementById('tip');if(t)t.style.display='none'}
function tipHook(g,fn){g.addEventListener('mouseenter',e=>tipShow(fn(),e));g.addEventListener('mousemove',tipMove);g.addEventListener('mouseleave',tipHide);
  g.addEventListener('focus',()=>{if(g.matches(':focus-visible')){const b=g.getBoundingClientRect();tipShow(fn(),{clientX:b.right,clientY:b.top})}});g.addEventListener('blur',tipHide);
  g.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse')tipHide()})}
function tipR(r){const all_=itemsOf(r),its=all_.filter(inYr),hid=all_.length-its.length,n=4;
  return `<div class="th"><span class="tn" style="background:${COL[r.b]}">${r.k}</span><span>${tipEsc(r.t)}</span></div><div class="tb">${BASIS[r.b]}</div><ul>${its.slice(0,n).map(i=>`<li>${tipEsc(tipText(i))}</li>`).join('')}</ul>${its.length>n?`<div class="tm">+${its.length-n} more. Click for the full entry.</div>`:'<div class="tm">Click to pin in the register.</div>'}${hid?`<div class="tm">${hid} more outside the selected years.</div>`:''}`}
function tipE(id,p,r){const n=6;
  const rs=r.slice().sort((a,b)=>a[1]-b[1]);
  return `<div class="th"><span class="tn" style="background:var(--accent)">&nbsp;</span><span>${tipEsc(p[0])}</span></div><div class="tb">Township as recorded in the deeds</div><div class="tw">Places named: ${tipEsc(TG[id].ids.map(i=>PL[i][0]).join('; '))}</div><ul>${rs.slice(0,n).map(x=>`<li>${x[1]} · ${tipEsc(tipText(x[3],110))} <span style="color:var(--muted)">(${tipEsc(x[2])}${x[4]?', '+tipEsc(x[4])+' ac':''})</span></li>`).join('')}</ul>${rs.length>n?`<div class="tm">+${rs.length-n} more. Click for the full list.</div>`:'<div class="tm">Click to pin in the register.</div>'}`}
/* data: served by /data.js */
/* data: served by /data.js */
/* people from the tax ratables (Pequannock ratable books and the ratable notes in the Morris records): township only, no lot */
/* data: served by /data.js */
/* RATS (in the dataset) holds every tax row, including Caldwell Books 504-512, Acquackanonk Book 498, the workbook "Tax Ratables" rows, "Tax List, Vol. 2" and the Morris and Timeline tax lists. Keep record data in datasets, not in this script. */
/* data: served by /data.js */
/* data: served by /data.js */
Object.assign(RTW,RTWX);
/* data: served by /data.js */
/* data: served by /data.js */
/* present townships each old ratable township could lie in (proposed, same logic as the deed filter) */
/* data: served by /data.js */
const ratTwOn=k=>RTM[k]?RTM[k].some(m=>munOn.has(m)):cActive(RTC[k]||'Essex');
const ratTw=k=>RATS.filter(r=>r[5]===k);
let ratOn=true;
const isRatItem=i=>/^(Pequannock ratables:|Ratables:)/.test(i.replace(/<[^>]+>/g,''));
let courtOn=true,miscOn=true;
const plain=i=>i.replace(/<[^>]+>/g,'');
const isWill=i=>/inventory of Helmer|^Will proved|will dated, Chatham/.test(plain(i));
const isCourt=i=>/Common Pleas|Orphans.{1,2}Court|3 Nov 1795: division/.test(plain(i))||isWill(i);
const isMisc=i=>/associators list|Rockaway church member|baptiz|marry at|m\. Penelope|pledges|church members|tax lists and census|^Nearby: the Aaron Kerris/.test(plain(i));
let bmdOn=true;const isBMD=i=>/baptiz|marry|m\. Penelope|m\. Mary Bastedo|marriage index/.test(plain(i));
/* data: served by /data.js */const bgOf=x=>/marry|\bm\. |marriage index/.test(plain(x))?'Marriages':'Births and baptisms';
const itemsOf=r=>r.items.filter(i=>(ratOn||!isRatItem(i))&&(courtOn||!isCourt(i))&&((isBMD(i)?bmdOn:miscOn)||!isMisc(i))&&(landOn||isRatItem(i)||isCourt(i)||isMisc(i)));
const ratRows=()=>RATS.filter(r=>(r[1]===0||(r[1]<=y1&&(r[4]||r[1])>=y0))&&ratTwOn(r[5])).sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:a[1]-b[1]);
const isTL=r=>/tax list/i.test(r[2]);const ratKind=r=>isTL(r)?'<span class="kd tl">tax list</span>':'<span class="kd">ratable</span>';
function renderRatList(){const rows=ratRows();document.getElementById('ratdet').hidden=!ratOn;
  const tws=RTO.filter(k=>rows.some(r=>r[5]===k));
  document.getElementById('ratn').textContent=rows.length+(rows.length===1?' entry':' entries')+' in '+tws.length+(tws.length===1?' township':' townships')+', years selected';
  document.getElementById('rattb').innerHTML=rows.length?tws.map(k=>{const rs=rows.filter(r=>r[5]===k),t=RTW[k];
    return `<tr><th colspan="4" class="twh" id="rat-${k}">${t.n} <span class="bs">${rs.length} ${rs.length===1?'entry':'entries'} &middot; ${t.w}${RTC[k]?' &middot; shown with '+RTC[k]+' County':''}</span> <a class="totop" href="#ratjump">top of list &uarr;</a></th></tr><tr><td colspan="4" class="why2">${t.note}</td></tr>`+rs.map(r=>`<tr><td class="y">${r[1]||'n.d.'}${r[4]?'–'+r[4]:''}</td><td>${r[0]}</td><td>${ratKind(r)} ${r[2].replace(/^tax list, /,'')}</td><td class="b">${r[3]||'—'}</td></tr>`).join('')}).join(''):'<tr><td colspan="4" class="empty">Nothing falls in the selected years and townships.</td></tr>';
  document.getElementById('ratjump').innerHTML=tws.length?'<span class="arrl">Jump to:</span>'+tws.map(k=>`<a class="chip" href="#rat-${k}">${RTW[k].n.replace(/ \((Essex|Bergen|Sussex) Co\.\)/,'')} <span class="jn">${rows.filter(r=>r[5]===k).length}</span></a>`).join(''):''}
/* one brown square per old township; Pequannock keeps its fixed spot, the others sit beside their marker */
const RPOS={westfield:{get ll(){return [TGP.westfield[1],TGP.westfield[2]]},dx:18,dy:-16,core:1},newprov:{get ll(){return [TGP.newprov[1],TGP.newprov[2]]},dx:18,dy:-16,core:1},saddle:{get ll(){return [TGP.saddle[1],TGP.saddle[2]]},dx:18,dy:-16,core:1},newark:{get ll(){return [TGP.newark[1],TGP.newark[2]]},dx:18,dy:-16,core:1},bloomfield:{get ll(){return [TGP.bloomfield[1],TGP.bloomfield[2]]},dx:18,dy:-16,core:1},livingston:{get ll(){return [TGP.livingston[1],TGP.livingston[2]]},dx:18,dy:-16,core:1},springfield:{get ll(){return [(TGP.westfield[1]+TGP.newprov[1])/2,(TGP.westfield[2]+TGP.newprov[2])/2]},dx:18,dy:-16,core:1},pequannock:{ll:[40.948,-74.395],dx:0,dy:0,c:['Morris'],core:0},hanover:{ll:[40.868,-74.5],dx:18,dy:-16,c:['Morris'],core:0},caldwell:{get ll(){return [TGP.caldwell[1],TGP.caldwell[2]]},dx:18,dy:-16,c:['Essex'],core:1},acquackanonk:{get ll(){return [TGP.acquackanonk[1],TGP.acquackanonk[2]]},dx:18,dy:-16,c:['Essex','Passaic'],core:1}};
function drawRat(W,H){if(!ratOn)return;
  RTO.forEach(k=>{const q=RPOS[k];if(!q)return;if(!q.core&&view==='core')return;if(!ratTwOn(k))return;
  const rows=ratRows().filter(r=>r[5]===k);if(!rows.length)return;
  const by=new Map();rows.forEach(r=>{const a=by.get(r[0])||{n:r[0],ys:[]};if(r[1])a.ys.push(r[1],r[4]||r[1]);by.set(r[0],a)});
  const ppl=[...by.values()].map(a=>{if(!a.ys.length)return a.n+' (undated)';const mn=Math.min(...a.ys),mx=Math.max(...a.ys);return a.n+' '+mn+(mx>mn?'–'+mx:'')});
  const yrs=rows.flatMap(r=>r[1]?[r[1],r[4]||r[1]]:[]),yr=yrs.length?Math.min(...yrs)+'–'+Math.max(...yrs):'';
  let[x,y]=P(q.ll[0],q.ll[1]);x+=q.dx;y+=q.dy;if(x<0||x>W||y<0||y>H)return;
  const nm=RTW[k].n;
  const g=el('g',{class:'mk oldtw','aria-hidden':'true'});
  el('rect',{x:x-9,y:y-9,width:18,height:18,rx:4,fill:'var(--twp)',stroke:'var(--paper)','stroke-width':2},g);
  const go=()=>{showTab('rat');const d=document.getElementById('ratdet');d.open=true;const t=document.getElementById('rat-'+k)||document.getElementById('ratbox');t.scrollIntoView({behavior:'smooth',block:'start'})};
  const pop=()=>{tipHide();popShow(nm+': tax ratables and tax lists',`<p>${rows.length} ${rows.length===1?'entry':'entries'}${yr?', '+yr:''}, in the years chosen in Filters. Township only; the records give no lot. Names are as written; one name may be several men.</p><ul>${ppl.map(t=>`<li>${tipEsc(t)}</li>`).join('')}</ul>`,go)};
  g.addEventListener('click',pop);g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pop()}});
  tipHook(g,()=>`<div class="th"><span class="tn" style="background:var(--twp)">&nbsp;</span><span>${nm}: tax ratables</span></div><div class="tb">Township only, no lot</div><ul>${ppl.map(t=>`<li>${tipEsc(t)}</li>`).join('')}</ul><div class="tm">Click for a window with all the names.</div>`);
  if(false){lnk(txt(x+14,y+4,nm,'placelabel'),go,'Open the tax records for this township');lnk(txt(x+14,y+16,'tax ratables '+yr,'yrlabel'),go,'Open the tax records for this township')}})}
/* Little Falls section: schematic outline, hand-placed (no surveyed boundary available). Sized to the published areas (Little Falls about 2.8 sq mi, Woodland Park about 3 sq mi), north edge follows the map's Passaic River. */
/* data: served by /data.js */
function drawLFZ(W,H){
  LFZ.forEach(z=>{if(!munOn.has(z.id))return;
    const xy=z.pts.map(q=>P(q[0],q[1]));if(xy.every(([x,y])=>x<0||x>W||y<0||y>H))return;
    const g=el('g',{class:z.cls});
    const pa=el('path',{d:'M'+xy.map(q=>q[0].toFixed(1)+' '+q[1].toFixed(1)).join('L')+'Z',class:'lfzp'},g);
    tipHook(pa,()=>`<div class="th"><span class="tn" style="background:var(--tag)">&nbsp;</span><span>${z.n}</span></div><div class="tb">${z.tip}</div><div class="tm">Outline approximate: drawn from the published area and neighbours, not from a survey.</div>`);
    if(showLbl){const[x,y]=P(z.lab[0],z.lab[1]);if(x>0&&x<W&&y>0&&y<H){const yy=y+(z.ldy||0),an=x>W-60?'end':(z.la||'middle');txt(x,yy,z.lt,'placelabel lfzl',an);if(z.sub)txt(x,yy+13,z.sub,'yrlabel',an)}}})}
/* data: served by /data.js */
const UCAT=t=>/Common Pleas|against Henry|, Supreme Court/.test(t)?'court':/census|militia|m\. Mary Bastedo|marriage index|tax list/.test(t)?'misc':'deed';
const SWINE='NJ Supreme Court No. 29971, Parker v. Simon Kent (1766–1770): the Swine Field marker, near Swinefield Road and its bridge over the Passaic.';
/* Row-level records from the compiler's research notes and the Morris marriage index: [cat, group, source label, county, township, date, year, given, surname, note, url, citation, township key, county key] */
/* data: served by /data.js */
let cenOn=true,milOn=true;
TLR.forEach(r=>{if(/^Timeline (row|workbook)/.test(r[11]))r[11]='';if(r[1]==='Wills and estates')r[0]='court'});
TLR.forEach(r=>{if(r[0]!=='misc')return;if(r[1]==='Marriages'||r[1]==='Deaths and burials')r[0]='bmd';else if(r[1]==='Church records'&&/bapt|born|birth/i.test(r[9])){r[0]='bmd';r[1]='Births and baptisms'}});
const tlVis=r=>(r[6]===0||(r[6]>=y0&&r[6]<=y1))&&(r[12]?ratTwOn(r[12]):cActive(r[13]));
const tlTag=r=>r[4]?'township only':'county only';
const tlRow=r=>`<tr><td class="y">${tipEsc(r[5])}</td><td>${tipEsc(r[7]+' '+r[8])}</td><td>${tipEsc([r[4],r[3]].filter(Boolean).join(', '))} <span class="kd tl">${tlTag(r)}</span></td><td>${tipEsc(r[2])}${r[9]?'. '+tipEsc(r[9]):''}</td><td class="b">${tipEsc(r[11])||(r[10]?'':'—')}${r[10]?(r[11]?' &middot; ':'')+'<a href="'+r[10]+'" target="_blank" rel="noopener">'+(/library\/books/.test(r[10])?'book':'image')+'</a>':''}</td></tr>`;
const tlTable=rs=>`<div class="tlw"><table class="ht tl"><thead><tr><th>Date</th><th>Name as written</th><th>Place</th><th>Record and note</th><th>Source</th></tr></thead><tbody>${rs.map(tlRow).join('')}</tbody></table></div>`;
const tlRows=(cat,grp)=>TLR.filter(r=>r[0]===cat&&(!grp||r[1]===grp)&&tlVis(r)).sort((a,b)=>(a[6]||9999)-(b[6]||9999));
/* data: served by /data.js */
function tlGroups(cat){return TLG[cat].map(g=>{const rs=tlRows(cat,g);return rs.length?`<h3 class="sub">${g} <span class="im">${rs.length}</span></h3>${tlTable(rs)}`:''}).join('')}
function renderTL(){
  [['cen','cenn','cenlist',cenOn],['mil','miln','millist',milOn]].forEach(([c,n,box,on])=>{const k=tlRows(c).length;
    document.getElementById(n).textContent=on?k+(k===1?' record':' records'):'switched off in Filters';
    document.getElementById(box).innerHTML=on?(tlGroups(c)||'<p class="zhint">Nothing falls in the selected years and townships.</p>'):'';
    const ex=document.getElementById(c+'extra');if(ex)ex.hidden=!on});
  document.getElementById('courttl').innerHTML=courtOn?tlGroups('court'):'';
}
/* data: served by /data.js */
const mgOf=x=>{const t=plain(x);return MG.find(([h,re])=>re.test(t))[0]};
function renderCM(){
  document.getElementById('unplacedm').innerHTML=UNPLACED_M.filter(u=>UCAT(u)==='deed').map(u=>`<li>${u}</li>`).join('');document.getElementById('nodeeds').hidden=!landOn;
  document.getElementById('swleg').hidden=!courtOn;
  const coll=cat=>{const f=cat==='court'?isCourt:cat==='bmd'?(i=>isMisc(i)&&isBMD(i)):(i=>isMisc(i)&&!isBMD(i)),out=[];
    R.forEach(r=>r.items.forEach(i=>{if(f(i)&&!(cat==='court'&&isWill(i)))out.push(`<b>${r.k}</b> ${r.t}: ${i}`)}));if(cat==='court')R.forEach(r=>r.items.forEach(i=>{if(isWill(i))out.push(`<span class="kd">will or estate</span> <b>${r.k}</b> ${r.t}: ${i}`)}));
    UNPLACED_M.forEach(u=>{if(cat==='court'?UCAT(u)==='court':(UCAT(u)==='misc'&&isBMD(u)===(cat==='bmd')))out.push('<span class="kd tl">'+(/Hanover|Pequannock/.test(u)?'township only':'no place')+'</span> '+u)});
    if(cat==='court')out.push('<b>◇</b> '+SWINE);return out};
  [['court','courtlist','courtn'],['bmd','bmdlist','bmdn'],['misc','misclist','miscn']].forEach(([cat,ul,n])=>{const a=coll(cat),on=cat==='court'?courtOn:cat==='bmd'?bmdOn:miscOn,GS=cat==='bmd'?BG:MG,gof=cat==='bmd'?bgOf:mgOf,k=a.length+tlRows(cat).length;
    document.getElementById(n).textContent=on?k+(k===1?' record':' records'):'switched off in Filters';
    document.getElementById(ul).innerHTML=!on?'':cat==='court'?a.map(x=>`<li>${x}</li>`).join(''):GS.map(([h,re])=>{const g=a.filter(x=>gof(x)===h),rs=tlRows(cat,h);return g.length+rs.length?`<h3 class="sub">${h} <span class="im">${g.length+rs.length}</span></h3>${g.length?`<ul class="notes">${g.map(x=>`<li>${x}</li>`).join('')}</ul>`:''}${rs.length?tlTable(rs):''}`:''}).join('')});
  renderTL();
}
/* data: served by /data.js */
/* Display-only nudges (SVG units) so crowded lettered markers stay separate and clickable; the records' coordinates are unchanged. */
/* data: served by /data.js */
/* Display-only town-label placement overrides: [dx,dy,anchor] */
/* data: served by /data.js */
/* data: served by /data.js */
const svg=document.getElementById('map'),NS='http://www.w3.org/2000/svg';
const el=(t,a,p=svg)=>{const e=document.createElementNS(NS,t);for(const k in a)e.setAttribute(k,a[k]);p.appendChild(e);return e};
let view='core',y0=1720,y1=1890,showLbl=true,showTwp=false,showRds=false,showJL=false,showWJ=false,showTer=true,sel=null,layer='all',grpSet=new Set(),P;
/* data: served by /data.js */
/* data: served by /data.js */
/* data: served by /data.js */
/* data: served by /data.js */

function proj(v){const{lat,lon,W,H}=VIEWS[v],K=Math.cos(40.85*Math.PI/180);
  const s=Math.min(W/((lon[1]-lon[0])*K),H/(lat[1]-lat[0]));
  return (a,b)=>[((b-lon[0])*K)*s,H-(a-lat[0])*s];}
const path=pts=>pts.map((p,i)=>(i?'L':'M')+P(...p).map(n=>n.toFixed(1)).join(',')).join(' ');
const txt=(x,y,t,c,anchor='start')=>{const e=el('text',{x,y,class:c,'text-anchor':anchor});e.textContent=t;return e};
/* Visual hierarchy of the geographic background, kept in one place so it stays consistent.
   Research records (markers, their labels, township names and count circles) are the
   foreground and are deliberately NOT touched by these: they keep full contrast. These
   values only soften the terrain the records sit on, and change no position or feature. */
const G_RIV_W=.85,      /* river line width, as a fraction of the drawn width */
      G_RIV_O=.72,      /* river line opacity */
      G_RIDGE_O=.13,    /* tan ridge band opacity (was .2) */
      G_CHEV_O=.5,      /* ridge chevron opacity (was .75) */
      G_BOUND_O=.55;    /* secondary boundary line opacity */
const lnk=(e,fn,tip)=>{if(!e)return e;e.classList.add('lk');e.addEventListener('click',ev=>{ev.stopPropagation();fn()});const ti=document.createElementNS(NS,'title');ti.textContent=tip;e.appendChild(ti);return e};
/* ---- land deeds by present-day township: municipalities, histories, and which deed places fall in each ---- */
const WP='https://en.wikipedia.org/wiki/';
/* data: served by /data.js */
/* place -> present townships. 'n' = a named place, township proposed; 't' = the record gives only an old township, so every present township it could lie in is listed */
/* data: served by /data.js */
/* data: served by /data.js */
/* data: served by /data.js */
/* data: served by /data.js */
let lbMode='county';
const munIds=cty=>Object.keys(MUN).filter(m=>!cty||MUN[m].c===cty).sort((a,b)=>MUN[a].n.localeCompare(MUN[b].n));
function updTwCount(){const e=document.getElementById('twcount');if(e){const n=[...munOn].length,t=Object.keys(MUN).length;e.textContent='('+n+'/'+t+' selected)'}}
function syncCounty(){updTwCount();document.querySelectorAll('input[data-c]').forEach(i=>{const ids=munIds(i.dataset.c),n=ids.filter(m=>munOn.has(m)).length;i.checked=n===ids.length;i.indeterminate=n>0&&n<ids.length})}
document.addEventListener('click',e=>{const b=e.target.closest('.arr button');if(b)setMode(b.dataset.m)});
const cActive=c=>munIds(c).some(m=>munOn.has(m));
function autoView(){const a=MUN_ORDER.filter(cActive),hasM=a.includes('Morris'),hasE=a.some(c=>['Essex','Passaic','Bergen','Union'].includes(c));
  if(!a.length)return;view=(a.includes('Sussex')||(hasM&&hasE))?'all':hasM?'morris':'core'}
let cAdd=false;
let nyShow=false;
const nyCount=c=>{try{return TFK.filter(k=>TF[k].c===c).reduce((n,k)=>n+Object.values(tfData(k,true)).reduce((a,b)=>a+b.length,0),0)}catch(e){return 0}};
function buildCBtns(){const box=document.getElementById('cbtns');box.querySelectorAll('button,.nonec,label,.nyw').forEach(b=>b.remove());document.querySelectorAll('#nybox .nyt,#nybox .nyw').forEach(b=>b.remove());
  const emp=MUN_ORDER.filter(c=>!munIds(c).length),nyOpen=nyShow||emp.some(c=>nyOn.has(c));let nyw=null;
  if(emp.length){const t=document.createElement('button');t.type='button';t.className='nyt';box.appendChild(t);t.setAttribute('aria-expanded',nyOpen);const nyN=emp.reduce((n,c)=>n+nyCount(c),0);t.textContent=nyOpen?'▾ Hide the '+emp.length+' NY counties':'▸ Show '+emp.length+' NY counties ('+(nyN?nyN+(nyN>1?' records':' record'):'0 records yet')+')';t.onclick=()=>{nyShow=!nyOpen;if(!nyShow&&emp.some(c=>nyOn.has(c))){emp.forEach(c=>nyOn.delete(c));draw();renderList()}buildCBtns()};
    nyw=document.createElement('span');nyw.className='nyw';nyw.hidden=!nyOpen;}
  MUN_ORDER.forEach(c=>{const ids=munIds(c),n=ids.filter(m=>munOn.has(m)).length,l=document.createElement('label');l.className='ck';
    l.innerHTML=`<input type="checkbox" data-cc="${c}"><b>${MUN_CTY[c]}</b>${ids.length?'':(()=>{const n=nyCount(c);return ' <span class="cty">('+(n?n+(n>1?' records':' record')+', no townships listed yet':'no records yet')+')</span>'})()}`;const i=l.querySelector('input');i.checked=n===ids.length;i.indeterminate=n>0&&n<ids.length;if(!ids.length){i.checked=nyOn.has(c);i.onchange=e=>{e.target.checked?nyOn.add(c):nyOn.delete(c);if(nyOn.size)view='all';draw();renderList();if(nyOn.size){fitTo([...nyOn].flatMap(k=>NYEXT[k]||[]));document.getElementById('mapsec').scrollIntoView({behavior:'smooth',block:'nearest'})}}}
    else i.onchange=e=>{ids.forEach(m=>e.target.checked?munOn.add(m):munOn.delete(m));refreshCounties(true)};(ids.length||!nyw?box:nyw).appendChild(l)});
  if(nyw){const nb=document.getElementById('nybox')||box;nb.appendChild(box.querySelector('.nyt'));nb.appendChild(nyw)}return;
  const mk=(c,on)=>{const b=document.createElement('button');b.type='button';b.dataset.c=c;b.textContent=MUN_CTY[c];b.setAttribute('aria-pressed',on);
    b.onclick=()=>{const ids=munIds(c);if(on)ids.forEach(m=>munOn.delete(m));else ids.forEach(m=>munOn.add(m));cAdd=false;refreshCounties(true)};box.appendChild(b)};
  const act=MUN_ORDER.filter(cActive),off=MUN_ORDER.filter(c=>!cActive(c));
  act.forEach(c=>mk(c,true));
  if(!act.length){const n=document.createElement('span');n.className='nonec';n.textContent='none selected';box.appendChild(n)}
  if(off.length){const a=document.createElement('button');a.type='button';a.className='addc';a.textContent=cAdd||!act.length?'Add county:':'+ Add county';a.setAttribute('aria-expanded',cAdd||!act.length);
    a.onclick=()=>{cAdd=!cAdd;buildCBtns()};box.appendChild(a);
    if(cAdd||!act.length)off.forEach(c=>mk(c,false))}}
function refreshCounties(rebuild){autoView();buildCBtns();if(rebuild)buildLandBox();else syncCounty();all()}
function setMode(m){lbMode=m;document.querySelectorAll('.arr button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m));buildLandBox();buildTwpList();buildYearList()}
let landOn=true;const munOn=new Set(Object.keys(MUN));
const munsOf=k=>(PMAP[k]||[]).slice(1);
/* Morris records that are land deeds, surveys or land records (D, K and R are an estate division, a will and church baptisms, so they stay on the map whatever is ticked) */
const landVis=k=>!PMAP[k]||munsOf(k).some(m=>munOn.has(m));

/* ---- township box (top) and per-township deed lists ---- */
const shortN=m=>MUN[m].n.replace(/ \(.*\)/,'');
function munCount(m){let d=0,t=0,p=0;D.forEach(x=>{const pm=PMAP[x[0]];if(pm&&pm.slice(1).includes(m)){pm[0]==='t'?t++:d++}});R.forEach(r=>{if((PMAP['m:'+r.k]||[]).slice(1).includes(m))p++});return{d,t,p}}
const cntLabel=c=>[c.d?c.d+(c.d>1?' deeds':' deed')+' at named places':'',c.t?c.t+' deeds recorded only by old township':'',c.p?c.p+(c.p>1?' Morris places':' Morris place'):''].filter(Boolean).join('; ');
const cntShort=c=>[c.d?c.d+(c.d>1?' deeds':' deed'):'',c.t?'+'+c.t+' more':'',c.p?c.p+(c.p>1?' places':' place'):''].filter(Boolean).join(' ')||'0';
function buildLandBox(){
  const cols=document.getElementById('lbcols');cols.innerHTML='';
  const lab=(m,showCty)=>{const c=munCount(m),l=document.createElement('label');l.className='ck lb';
    l.innerHTML=`<input type="checkbox" data-m="${m}" ${munOn.has(m)?'checked':''}><span>${MUN[m].n}${showCty?'<span class="cty"> · '+MUN_CTY[MUN[m].c]+'</span>':''}</span><a class="lbn" href="#tw-${m}" title="${cntLabel(c)}: open the list in the Records section">${cntShort(c)}</a>`;
    l.querySelector('input').onchange=e=>{e.target.checked?munOn.add(m):munOn.delete(m);refreshCounties(false)};
    l.querySelector('a').onclick=()=>{showTab('deeds');const d=document.getElementById('tw-'+m);if(d)d.open=true};
    return l};
  if(lbMode==='county'){
    MUN_ORDER.forEach(cty=>{const ids=munIds(cty);if(!ids.length)return;
      const col=document.createElement('div'),h=document.createElement('h4');
      h.innerHTML=`<label class="ck"><input type="checkbox" data-c="${cty}"><span>${MUN_CTY[cty]}</span></label>`;
      h.querySelector('input').onchange=e=>{ids.forEach(m=>e.target.checked?munOn.add(m):munOn.delete(m));refreshCounties(true)};
      col.appendChild(h);ids.forEach(m=>col.appendChild(lab(m,false)));cols.appendChild(col)});
  }else{
    const col=document.createElement('div');col.className='az';
    munIds().forEach(m=>col.appendChild(lab(m,true)));cols.appendChild(col);
  }
  syncCounty();
  const master=document.getElementById('landall');master.checked=landOn;
  master.onchange=e=>{landOn=e.target.checked;buildTwpList();all()};
  document.getElementById('lbAll').onclick=()=>{Object.keys(MUN).forEach(m=>munOn.add(m));refreshCounties(true)};
  document.getElementById('lbNone').onclick=()=>{munOn.clear();refreshCounties(true)};
}
function buildTwpList(){
  const box=document.getElementById('twplist');box.innerHTML='';
  const groups=lbMode==='county'?MUN_ORDER.map(cty=>[cty,munIds(cty)]):[[null,munIds()]];
  window.__shN=1000;
  groups.forEach(([cty,ids])=>{
    if(!ids.length)return;
    if(cty){const h=document.createElement('h3');h.className='sub';h.textContent=MUN_CTY[cty]+' ('+ids.length+' '+(ids.length>1?'townships and boroughs':'township')+')';box.appendChild(h)}
    /* shared township-only deeds and Morris places, listed once per county */
    const plan=shPlan(ids,m=>{const o=[];D.forEach((x,ix)=>{const pm=PMAP[x[0]];if(pm&&pm[0]==='t'&&pm.slice(1).includes(m))o.push({k:'D'+ix,sh:true,tw:PL[x[0]][0],x})});
      R.forEach(r=>{const pm=PMAP['m:'+r.k];if(pm&&pm[0]==='t'&&pm.slice(1).includes(m)&&itemsOf(r).length)o.push({k:'M'+r.k,sh:true,tw:'',pk:r.k,r})});return o});
    const shTbl=rs=>`<table class="twt"><thead><tr><th>Year</th><th>Deed</th><th>Parties</th><th>Acres</th><th>Place on the map</th></tr></thead><tbody>${rs.map(x=>`<tr><td class="y">${x[1]}</td><td class="b">${x[2]}</td><td>${x[3]}</td><td class="a">${x[4]||'—'}</td><td>${PL[x[0]][0]}<span class="bs">township only</span></td></tr>`).join('')}</tbody></table>`;
    plan.blocks.forEach(bk=>{/* this list shows every municipality whatever is ticked, so its shared blocks do too */
      const dx=bk.rows.filter(r=>r.x).map(r=>r.x).sort((p,q)=>p[1]-q[1]),mr=bk.rows.filter(r=>r.r).map(r=>r.r);
      const det=document.createElement('details');det.id=bk.id;det.className='shblk';
      det.innerHTML=`<summary><span>${shTitle(bk)} <span class="shap">(${shApplies(bk)})</span></span><span class="tc">${bk.rows.length} ${bk.rows.length===1?'entry':'entries'}</span></summary>
        <div class="twb">${shHist(bk)}<p class="twh"><b>Could lie in:</b> ${bk.ms.slice().sort((p,q)=>MUN[p].n.localeCompare(MUN[q].n)).map(m=>MUN[m].n).join(', ')}. Recorded only by old township, so listed here once rather than under every modern municipality.</p>
        ${[...new Set(dx.map(x=>x[0]))].map(id=>`<p class="why2"><b>${PL[id][0]}</b>: ${PL[id][4]}.</p>`).join('')}${dx.length?shTbl(dx):''}
        ${mr.length?`<h4 class="twm">Morris land records</h4>${mr.map(r=>`<div class="twr"><b>${r.k}</b> ${r.t}<span class="bs">township only</span><ul>${itemsOf(r).map(i=>`<li>${i}</li>`).join('')}</ul></div>`).join('')}`:''}</div>`;
      box.appendChild(det)});
    const shK=new Set();plan.blocks.forEach(bk=>bk.rows.forEach(r=>shK.add(r.k)));
    ids.forEach(m=>{
      const mu=MUN[m],c=munCount(m),det=document.createElement('details');det.id='tw-'+m;
      const rows=[],trows=[];D.forEach((x,ix)=>{const pm=PMAP[x[0]];if(pm&&pm.slice(1).includes(m)&&!shK.has('D'+ix))(pm[0]==='t'?trows:rows).push(x)});rows.sort((a,b)=>a[1]-b[1]);trows.sort((a,b)=>a[1]-b[1]);
      const tbl=(rs)=>`<table class="twt"><thead><tr><th>Year</th><th>Deed</th><th>Parties</th><th>Acres</th><th>Place on the map</th></tr></thead><tbody>${rs.map(x=>{const p=PL[x[0]];return `<tr><td class="y">${x[1]}</td><td class="b">${x[2]}</td><td>${x[3]}</td><td class="a">${x[4]||'—'}</td><td>${p[0]}<span class="bs">${PMAP[x[0]][0]==='n'?'named place':'township only'}</span>${PMAP[x[0]][0]==='n'?alsoIn(x[0]):''}</td></tr>`}).join('')}</tbody></table>`;
      const mor=R.filter(r=>(PMAP['m:'+r.k]||[]).slice(1).includes(m)&&itemsOf(r).length&&!shK.has('M'+r.k));const shb=plan.of.get(m)||[];
      const alsoIn=k=>{const o=munsOf(k).filter(z=>z!==m).map(shortN);return o.length?'<span class="also">also '+o.join(', ')+'</span>':''};
      const ratBlock=(ratOn&&m==='pequannock')?`<h4 class="twm">Tax ratables (${ratTw('pequannock').length} entries)</h4><p class="why2">Pequannock Twp. as recorded in the ratable books. Old Pequannock Twp. covered far more than today's township, and the books give no lot, so this is listed here as the township only.</p><table class="twt"><thead><tr><th>Year</th><th>Person</th><th>Acres or stock</th><th>Book and page</th></tr></thead><tbody>${ratTw('pequannock').sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:a[1]-b[1]).map(r=>`<tr><td class="y">${r[1]}${r[4]?'–'+r[4]:''}</td><td>${r[0]}</td><td>${r[2]}</td><td class="b">${r[3]||'—'}</td></tr>`).join('')}</tbody></table>`:'';
      const src=mu.s.map(([t,u])=>`<a href="${u}" target="_blank" rel="noopener">${t}</a>`).join('; ');
      det.innerHTML=`<summary><span>${mu.n}${cty?'':'<span class="cty"> · '+MUN_CTY[mu.c]+'</span>'}</span><span class="tc">${cntLabel(c)}</span></summary>
        <div class="twb"><p class="twh"><b>History.</b> ${mu.h}</p><p class="twsrc">Sources: ${src}</p>
        ${rows.length?`<h4 class="twm">Deeds at named places (${rows.length})</h4>${tbl(rows)}`:''}
        ${trows.length?`<details class="tonly"><summary>${trows.length} deeds recorded only by old township (could lie only here)</summary>${[...new Set(trows.map(x=>x[0]))].map(id=>`<p class="why2"><b>${PL[id][0]}</b>: ${PL[id][4]}. Could lie in: ${munsOf(id).map(z=>MUN[z].n).join(', ')}.</p>`).join('')}${tbl(trows)}</details>`:''}
        ${mor.length?`<h4 class="twm">Morris land records</h4>${mor.map(r=>`<div class="twr"><b>${r.k}</b> ${r.t}<span class="bs">${PMAP['m:'+r.k][0]==='n'?'named place':'township only'}</span>${alsoIn('m:'+r.k)}<ul>${itemsOf(r).map(i=>`<li>${i}</li>`).join('')}</ul></div>`).join('')}`:''}
        ${ratBlock}${shRef(shb,['entry','entries'])}
        </div>`;
      box.appendChild(det)});
  });
}

function rows(id){return D.filter(d=>d[0]===id&&d[1]>=y0&&d[1]<=y1&&landOn&&landVis(id))}
const yrsOf=t=>[...t.replace(/<[^>]+>/g,' ').matchAll(/\b(1[78]\d\d)\b/g)].map(m=>+m[1]);
const inYr=t=>{const ys=yrsOf(t);return !ys.length||ys.some(y=>y>=y0&&y<=y1)};
function mShow(r){const dated=itemsOf(r).filter(i=>yrsOf(i).length);
  return (!grpSet.size||grpSet.has(r.g))&&(!dated.length||dated.some(inYr))&&landVis('m:'+r.k)&&(PMAP['m:'+r.k]||cActive('Morris'))&&itemsOf(r).length>0}

/* ---- base map data (lat, lon), checked against modern geography and the 1801–1809 turnpike charters ---- */
const inPoly=(la,lo,poly)=>{let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const[yi,xi]=poly[i],[yj,xj]=poly[j];if((yi>la)!==(yj>la)&&lo<(xj-xi)*(la-yi)/(yj-yi)+xi)c=!c}return c};
/* data: served by /data.js */
/* data: served by /data.js */
/* data: served by /data.js */
/* terrain layer, schematic: ridges, Highlands upland, former Lake Passaic basin and meadows (sources in #tersec) */
/* data: served by /data.js */
function drawTerrain(g,w,h){
  g.setAttribute('pointer-events','none');
  const pts=a=>a.map((p,i)=>(i?'L':'M')+P(p[0],p[1]).map(n=>n.toFixed(1)).join(',')).join(' ');
  el('path',{d:pts(TER.hl)+'Z',fill:'var(--ridge)','fill-opacity':.09,stroke:'none'},g);
  el('path',{d:pts(TER.hl.slice(0,15)),fill:'none',stroke:'var(--ridge)','stroke-width':1.4,'stroke-dasharray':'6 4',opacity:.55},g);
  el('path',{d:pts(TER.lake)+'Z',fill:'var(--river)','fill-opacity':.07,stroke:'var(--river)','stroke-width':1,'stroke-dasharray':'3 4',opacity:.6},g);
  el('path',{d:pts(TER.meadow)+'Z',fill:'var(--river)','fill-opacity':.15,stroke:'var(--river)','stroke-width':1,'stroke-dasharray':'2 3','stroke-opacity':G_RIV_O},g);
  const s=TER.swamp,ep=[];for(let i=0;i<24;i++){const a=i/24*2*Math.PI;ep.push([s.c[0]+s.ry*Math.sin(a),s.c[1]+s.rx*Math.cos(a)])}
  el('path',{d:pts(ep)+'Z',fill:'var(--river)','fill-opacity':.15,stroke:'var(--river)','stroke-width':1,'stroke-dasharray':'2 3','stroke-opacity':G_RIV_O},g);
  TER.ridges.forEach(r=>{
    el('path',{d:pts(r),fill:'none',stroke:'var(--ridge)','stroke-width':11,'stroke-opacity':G_RIDGE_O,'stroke-linecap':'round','stroke-linejoin':'round'},g);
    const q=r.map(p=>P(p[0],p[1]));let carry=7;
    for(let i=0;i<q.length-1;i++){const[x0,y0]=q[i],[x1,y1]=q[i+1],d=Math.hypot(x1-x0,y1-y0);let t=carry;
      while(t<d){const x=x0+(x1-x0)*t/d,y=y0+(y1-y0)*t/d;el('path',{d:`M${(x-5).toFixed(1)},${(y+3.5).toFixed(1)}L${x.toFixed(1)},${(y-5).toFixed(1)}L${(x+5).toFixed(1)},${(y+3.5).toFixed(1)}Z`,fill:'var(--ridge)','fill-opacity':G_CHEV_O},g);t+=16}
      carry=t-d}});
  const lab=(la,lo,t,c,an,dx,dy)=>{const[x,y]=P(la,lo);if(x>6&&x<w-6&&y>12&&y<h-6){const e=el('text',{x:x+(dx||0),y:y+(dy||0),class:c,'text-anchor':an||'start'},g);e.textContent=t}};
  lab(41.064,-74.733,'HIGHLANDS','terbig','start');lab(41.064,-74.733,'upland: ridges up to','tersub','start',0,15);lab(41.064,-74.733,'about 1,500 ft','tersub','start',0,29);
  lab(40.990,-74.545,'Green Pond Mtn','terlabel zsec','end',-8,0);
  lab(40.988,-74.455,'Copperas Mtn','terlabel zsec','start',6,0);
  lab(40.968,-74.733,'Longwood & Berkshire valleys','terlabel zsec','start',0,3);
  lab(40.918,-74.368,'Hook Mtn','terlabel zsec','end',-8,0);
  lab(40.705,-74.490,'Long Hill','terlabel zsec','end',-8,0);
  lab(40.913,-74.215,'First Watchung Mtn','terlabel zsec','start',8,-6);
  lab(40.895,-74.232,'Second Watchung Mtn','terlabel zsec','end',-14,-3);
  lab(40.722,-74.470,'Great Swamp','terlabel zsec','middle',0,4);
  lab(40.683,-74.480,'Former Lake Passaic basin: flat valley floor','terlabel zsec','middle',0,0);
  lab(40.846,-74.392,'Passaic meadows','terlabel zsec','start',30,-10);
}
/* data: served by /data.js */
/* township lines c. 1830 */
/* data: served by /data.js */
/* data: served by /data.js */
/* data: served by /data.js */
/* roads: [points, label, labelLat, labelLon, anchor, where] where: c core-only label, m label outside core view, a always */
/* data: served by /data.js */
/* data: served by /data.js */
/* data: served by /data.js */
/* data: served by /data.js */
/* data: served by /data.js */
const nyOn=new Set();
/* data: served by /data.js */
/* data: served by /data.js */
/* data: served by /data.js */
/* data: served by /data.js */
/* data: served by /data.js */
function setFrame(){let la=[...FRAME0.lat],lo=[...FRAME0.lon];nyOn.forEach(c=>(NYEXT[c]||[]).forEach(p=>{la=[Math.min(la[0],p[0]),Math.max(la[1],p[0])];lo=[Math.min(lo[0],p[1]),Math.max(lo[1],p[1])]}));
  la=[Math.max(FRAMEMAX.lat[0],la[0]),Math.min(FRAMEMAX.lat[1],la[1])];lo=[Math.max(FRAMEMAX.lon[0],lo[0]),Math.min(FRAMEMAX.lon[1],lo[1])];
  const K=Math.cos(40.85*Math.PI/180);VIEWS.all={lat:la,lon:lo,W:1000,H:Math.round(1000*(la[1]-la[0])/((lo[1]-lo[0])*K))}}
function fitTo(pts){if(!pts.length)return;const A=VIEWS.all,xy=pts.map(p=>P(Math.min(A.lat[1],Math.max(A.lat[0],p[0])),Math.min(A.lon[1],Math.max(A.lon[0],p[1])))),xs=xy.map(q=>q[0]),ys=xy.map(q=>q[1]),{W,H}=VIEWS[view];
  const f=Math.min(1,Math.max(.25,1.1*Math.max((Math.max(...xs)-Math.min(...xs))/W,(Math.max(...ys)-Math.min(...ys))/H)));Z.zoomTo((Math.max(...xs)+Math.min(...xs))/2,(Math.max(...ys)+Math.min(...ys))/2,f)}
/* data: served by /data.js */
/* data: served by /data.js */
/* data: served by /data.js */
function drawNYTer(L){const any=cs=>cs.some(c=>nyOn.has(c));
  NYRIV.forEach(r=>{if(!any(r.c))return;el('path',{d:path(r.p),fill:'none',stroke:'var(--river)','stroke-width':r.w*G_RIV_W,'stroke-opacity':G_RIV_O,'stroke-linecap':'round','stroke-linejoin':'round'});L(r.la[0],r.la[1],r.n,'rivlabel','start',6,-4)});
  if(!showTer)return;
  NYRIDGE.forEach(r=>{if(!any(r.c))return;el('path',{d:path(r.p),fill:'none',stroke:'var(--ridge)','stroke-width':11,'stroke-opacity':G_RIDGE_O,'stroke-linecap':'round','stroke-linejoin':'round'});
    const q=r.p.map(p=>P(p[0],p[1]));let carry=7;
    for(let i=0;i<q.length-1;i++){const[x0,y0]=q[i],[x1,y1]=q[i+1],d=Math.hypot(x1-x0,y1-y0);let t=carry;
      while(t<d){const x=x0+(x1-x0)*t/d,y=y0+(y1-y0)*t/d;el('path',{d:`M${(x-5).toFixed(1)},${(y+3.5).toFixed(1)}L${x.toFixed(1)},${(y-5).toFixed(1)}L${(x+5).toFixed(1)},${(y+3.5).toFixed(1)}Z`,fill:'var(--ridge)','fill-opacity':G_CHEV_O});t+=16}
      carry=t-d}
    if(r.n)L(r.la[0],r.la[1],r.n,'terlabel','start',10,0)});
  NYVAL.forEach(v=>{if(any(v.c))L(v.la[0],v.la[1],v.n,'terlabel','middle')})}
function drawNY(L){if(!nyOn.size)return;const on=c=>nyOn.has(c);drawNYTer(L);
  el('path',{d:path([[41.357,-74.694],[41.000,-73.894]]),fill:'none',stroke:'var(--bound)','stroke-width':2,'stroke-dasharray':'10 4 2 4'});if(on('Orange')||on('Rockland'))L(41.215,-74.380,'NEW JERSEY – NEW YORK LINE (approx.)','maplabel','middle');
  const cs=new Set();nyOn.forEach(c=>(NYCOAST[c]||[]).forEach(i=>cs.add(i)));cs.forEach(i=>el('path',{d:path(NYC_COAST[i]),fill:'none',stroke:'var(--river)','stroke-width':1.6*G_RIV_W,'stroke-opacity':G_RIV_O,'stroke-linejoin':'round'}));
  if(on('Westchester')||on('Putnam')){el('path',{d:path(NYCT),fill:'none',stroke:'var(--bound)','stroke-width':2,'stroke-dasharray':'10 4 2 4'});L(41.300,-73.560,'N.Y. – CONN. LINE (approx.)','maplabel','end')}
  nyOn.forEach(c=>{const l=NYLAB[c];if(l)L(l[0],l[1],l[2],'cntylabel','middle');TFK.filter(k=>TF[k].ny&&TF[k].c===c).map(k=>[TF[k].ll[0],TF[k].ll[1],TF[k].n.replace(/ \(then .*\)/,'')]).forEach(([a,b,t])=>{const[x,y]=P(a,b);if(x<0||y<0)return;el('circle',{cx:x,cy:y,r:2.2,fill:'var(--muted)'});txt(x+5,y-5,t,'ctx')})})}
/* towns: lat, lon, name, core? */
/* data: served by /data.js */

function draw(){tipHide();
  svg.innerHTML='';setFrame();P=proj(view);const{W,H}=VIEWS[view];svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
  const core=view==='core';
  const inb=(a,b,m=0)=>{const[x,y]=P(a,b);return x>m&&x<W-m&&y>m&&y<H-m};
  const L=(a,b,t,c,an,dx=0,dy=0)=>{const[x,y]=P(a,b);if(x>0&&x<W&&y>0&&y<H)return txt(x+dx,y+dy,t,c,an)};
  if(showTer){const gt=el('g',{});drawTerrain(gt,W,H)}
  if(showWJ)el('path',{d:path(WJPOLY)+'Z',fill:'var(--jline)','fill-opacity':.1,stroke:'none'});
  RIVERS.forEach(([w,pts])=>el('path',{d:path(pts),fill:'none',stroke:'var(--river)','stroke-width':(core?w:w*.85)*G_RIV_W,'stroke-opacity':G_RIV_O,'stroke-linecap':'round','stroke-linejoin':'round'}));
  el('path',{d:path(POND)+'Z',fill:'var(--river)','fill-opacity':.28,stroke:'var(--river)','stroke-width':1,'stroke-opacity':G_RIV_O});
  drawLFZ(W,H);
  RIDGES.forEach(p=>el('path',{d:path(p),fill:'none',stroke:'var(--ridge)','stroke-width':2,'stroke-dasharray':'2 5','stroke-opacity':G_BOUND_O}));
  if(showTwp){
    BOUNDS.forEach(p=>el('path',{d:path(p),fill:'none',stroke:'var(--bound)','stroke-width':1.6,'stroke-dasharray':'1 4','stroke-linecap':'round','stroke-opacity':G_BOUND_O}));
    TWPL.forEach(([a,b,t])=>L(a,b,t,'twplabel'+(showWJ&&inPoly(a,b,WJPOLY)?' wj':''),'middle'));
    CNTY.forEach(([a,b,t])=>L(a,b,t,'cntylabel'+(showWJ&&inPoly(a,b,WJPOLY)?' wj':''),'middle'));
  }
  if(showRds){
    ROADS.forEach(([pts,lab,la,lo,an,wh])=>{
      el('path',{d:path(pts),fill:'none',stroke:'var(--road)','stroke-width':1.6,'stroke-dasharray':'7 4','stroke-linecap':'round'});
      if(lab&&(wh==='a'||(wh==='c'&&core)||(wh==='m'&&!core)))L(la,lo,lab,'roadlabel',an,0,-5)});
    el('path',{d:path(CANAL),fill:'none',stroke:'var(--river)','stroke-width':1.6,'stroke-dasharray':'1.5 4','stroke-linecap':'round'});
    if(core)L(40.850,-74.173,'Morris Canal (1831)','roadlabel','end');else L(40.912,-74.385,'Morris Canal (1831)','roadlabel','start',0,-6);
  }
  if(showJL){
    const jp=(pts,w,dash,op)=>el('path',{d:path(pts),fill:'none',stroke:'var(--jline)','stroke-width':w,'stroke-dasharray':dash||'none','stroke-linecap':'round','stroke-linejoin':'round',opacity:op||1});
    const LAWL=a=>[a,-74.740+0.321*(40.872-a)];
    jp([[41.000,-74.300],[41.003,-74.330],[41.012,-74.360],[41.022,-74.395],[41.035,-74.420],[41.047,-74.435],[41.060,-74.460],[41.085,-74.480]],2,'1 5',.7);
    jp([[40.897,-74.273],[40.893,-74.295],[40.880,-74.312],[40.862,-74.327],[40.845,-74.332],[40.822,-74.337],[40.800,-74.348],[40.778,-74.357],[40.757,-74.368],[40.738,-74.373],[40.722,-74.390],[40.703,-74.420],[40.685,-74.465],[40.675,-74.520],[40.684,-74.545]],core?3:2.2,'8 6');
    jp([[40.897,-74.273],[40.920,-74.278],[40.945,-74.283],[40.968,-74.281],[40.990,-74.283],[41.000,-74.300]],core?6:4.5);
    jp([[41.000,-74.300],[41.000,-74.050]],core?6:4.5);
    jp([LAWL(40.92),LAWL(40.60)],3,'3 6');
    L(41.000,-74.085,'Coxe–Barclay line (1688), due east along 41°N','jlabel','end',0,-8);
    L(41.000,-74.085,'Proposed 1688, rescinded 1718: not permanent','jlabel','end',0,-21);
    L(40.757,-74.330,'East Jersey side','jside','start',0,0);
    L(41.056,-74.540,'West Jersey side (proposed, 1688)','jside','start',0,0);
    if(view==='morris')L(40.835,-74.640,'West Jersey side (proposed, 1688)','jside','start',0,0);
    if(view==='core')L(40.915,-74.318,'West Jersey (proposed)','jside','start',0,0);
    L(40.700,-74.664,'Lawrence line (1743), approx.; accepted 1855','jlabel','start',0,0);
    L(40.690,-74.664,'East of it: East Jersey','jside','start',0,0);
    if(view!=='core'){txt(8,18,'Keith line (1687) lies west of this map.','maplabel');txt(8,31,'Coxe–Barclay continues SW to the Lamington R.','maplabel')}
  }
  /* water and ridge names */
  if(core){L(40.898,-74.140,'Passaic River','rivlabel');L(40.930,-74.280,'Pompton R.','rivlabel','end');L(40.803,-74.183,'Second R.','rivlabel');L(40.836,-74.172,'Third R.','rivlabel');L(40.852,-74.236,'Peckman R.','rivlabel','end');L(40.905,-74.100,'Saddle R.','rivlabel');
    L(40.790,-74.243,'FIRST MTN','ridgelabel');L(40.800,-74.279,'SECOND MTN','ridgelabel');}
  else{L(40.775,-74.360,'Passaic River','rivlabel','start',6);L(40.958,-74.283,'Pompton R.','rivlabel','end',-6);L(40.893,-74.440,'Rockaway R.','rivlabel','start',0,16);L(41.000,-74.360,'Pequannock R.','rivlabel zsec',view==='morris'?'end':'start',view==='morris'?-8:0,view==='morris'?10:0);
    L(41.018,-74.492,'Green Pond','rivlabel zsec','end',-8);L(40.955,-74.535,'Burnt Meadow Br.','rivlabel zsec','end',-6);L(40.962,-74.462,'Beaver Br.','rivlabel zsec','start',8);L(40.846,-74.542,'Den Br.','rivlabel zsec','start',6,14);L(40.806,-74.462,'Whippany R.','rivlabel zsec','start',14,view==='morris'?36:30);
    if(view==='all'){L(40.960,-74.092,'Saddle R.','rivlabel','start',6);L(40.930,-74.028,'Hackensack R.','rivlabel','start',6);L(41.000,-73.925,'Hudson R.','rivlabel','end',-8);}}
  /* towns */
  TOWNS.forEach(([a,b,t,c])=>{if(core?!c:c)return;if(!inb(a,b,4))return;const[x,y]=P(a,b);el('circle',{class:'tdot',cx:x,cy:y,r:2.2,fill:'var(--muted)'});
    const right=x>W-150,low=(t==='Chester'||t==='Mendham'||t==='Morris Plains'||t==='Charlottenburg'||t==='Madison'||t==='Whippany'||t==='Mt Pleasant');const tlo=TLO[t];if(tlo)txt(x+tlo[0],y+tlo[1],t,'ctx',tlo[2]);else txt(x+(right?-5:t==='Parsippany'?10:5),y+(low?14:-5),t,'ctx',right?'end':'start')});
  if(view==='all')drawNY(L);

  txt(8,H-10,'Approximate positions, not to survey. N ↑','maplabel');
  /* Swine Field */
  if(courtOn&&inb(40.824,-74.306)){const[x,y]=P(40.824,-74.306);const sg=el('g',{class:'mk',tabindex:0,role:'button','aria-label':'Swine Field court case'});el('rect',{x:x-6,y:y-6,width:12,height:12,transform:`rotate(45 ${x} ${y})`,fill:'var(--paper)',stroke:'var(--accent)','stroke-width':2},sg);const sp=()=>popShow('Swine Field (court case, not a deed)',`<p>Approximate position.</p><ul><li>${SWINE}</li></ul>`,()=>{showTab('court');document.getElementById('records').scrollIntoView({behavior:'smooth',block:'start'})},'Open the Court tab');sg.addEventListener('click',sp);sg.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();sp()}});
   if(showLbl){const rt=!core&&x>W-130;txt(x+(rt?-10:10),y+16,core?'Swine Field: Simon Kent, tenant 1766–70':'Swine Field 1766–70','yrlabel pinlab',rt?'end':'start')}}

  /* deed townships (one marker per township as recorded; no counts) */
  const labs=[];
  if(layer!=='morris')Object.entries(TGP).forEach(([id,p])=>{
    const r=rowsG(id);if(!r.length&&!(core&&p[5]))return;
    const[x,y]=P(p[1],p[2]);if(x<0||x>W||y<0||y>H)return;
    const key='e:'+id;
    const rad=r.length?12*(core?1:.8):6;
    const g=el('g',{class:'mk oldtw','aria-hidden':'true','data-mk':key});
    el('circle',{cx:x,cy:y,r:rad,fill:'var(--accent)',stroke:sel===key?'var(--ink)':'var(--paper)','stroke-width':sel===key?3:2},g);
    const goR=()=>{pick(key,true);setTimeout(()=>{const n=document.querySelector('.place.on');n&&n.scrollIntoView({block:'nearest',behavior:'smooth'})},80)};const pop=()=>{tipHide();const rs=r.slice().sort((a,b)=>a[1]-b[1]);popShow(p[0]+': land records',`<p>${rs.length} ${rs.length===1?'record':'records'} in the years chosen in Filters, by township as recorded. The marker is the middle of the township's named places, not a lot.</p><ul>${rs.map(d=>`<li><b>${d[1]}</b>, ${tipEsc(d[2])}: ${tipEsc(d[3])}${d[4]?' ('+tipEsc(d[4])+' ac)':''}</li>`).join('')}</ul>`,popHide,'Done')};
    g.addEventListener('click',pop);tipHook(g,()=>tipE(id,p,r));
    g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pop()}});
    if(false){
      const ys=r.map(d=>d[1]),yr=Math.min(...ys)===Math.max(...ys)?''+ys[0]:Math.min(...ys)+'–'+Math.max(...ys);
      const names=[...new Set(r.map(d=>firstNames(d[3])).flat())].slice(0,4).join(', ');
      labs.push({key,x:x+rad+4,y,rad,name:!core&&p[5]?p[0].replace(' Twp.',''):p[0],sub:yr+(names?' · '+names:'')});
    }
  });
  labs.sort((a,b)=>a.y-b.y);const placed=[];
  labs.forEach(l=>{const left=l.x>W-270;const ax=left?l.x-2*l.rad-8:l.x;const an=left?'end':'start';
    let ly=l.y;const span=[left?ax-210:ax,left?ax:ax+210];
    for(const q of placed){if(q.s[0]<span[1]&&span[0]<q.s[1]&&Math.abs(ly-q.y)<25)ly=q.y+25;}
    placed.push({y:ly,s:span});
    if(Math.abs(ly-l.y)>6)el('line',{x1:left?l.x-2*l.rad-4:l.x-4,y1:l.y,x2:ax,y2:ly-6,stroke:'var(--muted)','stroke-width':.8});
    const go=()=>{pick(l.key,true);setTimeout(()=>{const n=document.querySelector('.place.on');n&&n.scrollIntoView({block:'nearest',behavior:'smooth'})},80)},tp='Open the land records these years and names come from';lnk(txt(ax,ly-2,l.name,'placelabel',an),go,tp);lnk(txt(ax,ly+10,l.sub,'yrlabel',an),go,tp);});

  /* Morris places (lettered markers) */
  if(layer!=='deeds')R.forEach(r=>{
    let[x,y]=P(r.lat,r.lon);const mo=MKOFF[r.k];if(mo){x+=mo[0];y+=mo[1]}if(x<0||x>W||y<0||y>H)return;
    const key='m:'+r.k,show=mShow(r);
    const g=el('g',{class:'mk pin'+(show?'':' dim')+(sel===key?' pinsel':''),tabindex:0,role:'button','aria-label':r.k+': '+r.t,'data-mk':key});
    el('circle',{cx:x,cy:y,r:sel===key?14:10.5,fill:COL[r.b],stroke:sel===key?'var(--ink)':'var(--paper)','stroke-width':sel===key?3:2},g);
    const t=el('text',{x,y:y+4,'text-anchor':'middle',class:'k'},g);t.textContent=r.k;
    const goR=()=>{pick(key,true);setTimeout(()=>{const n=document.querySelector('.place.on');n&&n.scrollIntoView({block:'nearest',behavior:'smooth'})},80)};const pop=()=>{tipHide();const its=itemsOf(r).filter(inYr);popShow('Place '+r.k+': '+r.t,`<p>${BASIS[r.b]}. ${its.length} ${its.length===1?'record':'records'} in the years and record types chosen in Filters.</p><ul>${its.map(i=>`<li>${i}</li>`).join('')}</ul><p style="margin-top:8px">Source: ${r.src}</p>`,popHide,'Done')};
    g.addEventListener('click',pop);tipHook(g,()=>tipR(r));
    g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pop()}});
    const lb=LBL[r.k];if(showLbl&&lb){const flip=x>W-190&&(lb[3]||'start')==='start';const tl=txt(x+(flip?-14:lb[1]),y+lb[2],lb[0],'placelabel pinlab'+(show?'':' dim')+(sel===key?' pinsel':''),flip?'end':(lb[3]||'start'));try{if(tl.getAttribute('text-anchor')==='end'&&tl.getBBox().x<4){tl.setAttribute('text-anchor','start');tl.setAttribute('x',x+Math.abs(lb[1]));tl.setAttribute('y',+tl.getAttribute('y')+6)}}catch(e){}}
  });
  drawRat(W,H);
}
function firstNames(s){
  const kentSide=s.split('→').map(x=>x.trim()).filter(x=>/K(e|i)nt/.test(x));
  return kentSide.map(x=>{const m=x.match(/([A-Z][a-z]+(?: [A-Z]\.)?(?: & [A-Z][a-z]+)?) K(?:e|i)nt/);if(!m)return'';const p=m[1].split(' & ');return /[A-Z][a-z]+ $/.test(x.slice(0,m.index))&&p[1]?p[1]:p[0]}).filter(Boolean);
}

const list=document.getElementById('list');
function renderList(){
  list.innerHTML='';let any=false;
  const head=t=>{const h=document.createElement('h3');h.className='sec';h.textContent=t;list.appendChild(h)};
  if(layer!=='deeds'){let first=true;
    R.forEach(r=>{if(!mShow(r))return;any=true;if(first){head('Morris County records');first=false}
      const all_=itemsOf(r),its=all_.filter(inYr),hid=all_.length-its.length,key='m:'+r.k;
      const d=document.createElement('article');d.className='place'+(sel===key?' on':'');d.id='pl-'+key.replace(':','-');d.tabIndex=0;
      d.innerHTML=`<h3><span class="key" style="background:${COL[r.b]}">${r.k}</span>${r.t}</h3><div class="basis">${BASIS[r.b]}</div><ul>${its.map(i=>`<li>${i}</li>`).join('')}</ul>${hid?`<div class="hid">${hid} more outside the selected years</div>`:''}<div class="src">Source: ${r.src}</div>`;
      d.addEventListener('click',()=>pick(key,false));d.addEventListener('keydown',e=>{if(e.key==='Enter')pick(key,false)});
      list.appendChild(d)})}
  if(layer!=='morris'){
    const ids=Object.keys(TG).map(id=>[id,rowsG(id)]).filter(([,r])=>r.length).sort((a,b)=>b[1].length-a[1].length);
    if(ids.length)head('Land deeds by township as recorded');
    ids.forEach(([id,r])=>{any=true;const p=TGP[id],key='e:'+id;
      const placeRows=pid=>r.filter(x=>x[0]===pid);
      const places=TG[id].ids.filter(pid=>placeRows(pid).length).map(pid=>{const q=PL[pid],basis={deed:'deed wording',tag:'workbook tag',twp:'township only'}[q[3]];return `${q[0]} <span style="color:var(--muted)">(${basis}${NOW[pid]?'; now '+NOW[pid].replace(/\.$/,''):''})</span>`});
      const d=document.createElement('article');d.className='place'+(sel===key?' on':'');d.id='pl-'+key.replace(':','-');d.tabIndex=0;
      d.innerHTML=`<h3><i class="dot" style="background:var(--accent)"></i>${p[0]}<span class="basis">Township as recorded</span></h3><p class="why">${p[4]}</p><p class="why"><b>Places named in the deeds:</b></p><ul class="why">${places.map(x=>`<li>${x}</li>`).join('')}</ul>
        <table><tbody>${r.sort((a,b)=>a[1]-b[1]).map(x=>`<tr class="${x[5]?'v':''}"><td class="y">${x[1]}</td><td>${x[3]}<span class="also">${PL[x[0]][0]}</span></td><td class="b">${x[2]}</td><td class="a">${x[4]||'—'}</td></tr>`).join('')}</tbody></table>`;
      d.addEventListener('click',()=>pick(key,false));d.addEventListener('keydown',e=>{if(e.key==='Enter')pick(key,false)});
      list.appendChild(d);});}
  if(!any)list.innerHTML='<p class="empty">Nothing falls in the selected years and filters.</p>';
}
function pick(key,scroll){sel=scroll?(sel===key?null:key):key;
  draw();renderList();
  if(scroll&&sel){const n=document.getElementById('pl-'+key.replace(':','-'));n&&n.scrollIntoView({block:'nearest',behavior:'smooth'})}
  if(!scroll&&sel)focusKey(key)}
/* a click in the place register centres and zooms the map on that place (switching to the Essex or Morris view if the place is off the current view) */
function focusKey(key){const isE=key[0]==='e',id=key.slice(2),pl=isE?TGP[id]:R.find(r=>r.k===id);if(!pl)return;
  const lat=isE?pl[1]:pl.lat,lon=isE?pl[2]:pl.lon;let[x,y]=P(lat,lon);const{W,H}=VIEWS[view];
  if(x<0||x>W||y<0||y>H){const fits=v=>{const{lat:a,lon:o}=VIEWS[v];return lat>=a[0]&&lat<=a[1]&&lon>=o[0]&&lon<=o[1]};view=['core','morris'].find(fits)||'all';document.querySelectorAll('#views button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.v===view));draw();renderList();[x,y]=P(lat,lon)}
  Z.focus(x,y);
  document.getElementById('map').scrollIntoView({block:window.innerWidth<=900?'center':'nearest',behavior:'smooth'})}
function all(){draw();renderList();renderRatList();renderCM()}

const seg=(id,fn)=>document.querySelectorAll('#'+id+' button').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('#'+id+' button').forEach(x=>x.setAttribute('aria-pressed',x===b));fn(b.dataset.v)});

const r0=document.getElementById('y0'),r1=document.getElementById('y1');
function yrs(){y0=Math.min(+r0.value,+r1.value);y1=Math.max(+r0.value,+r1.value);
  document.getElementById('o0').textContent=y0;document.getElementById('o1').textContent=y1;all()}
r0.oninput=r1.oninput=yrs;
document.getElementById('twpl').onchange=e=>{showTwp=e.target.checked;draw()};
document.getElementById('rds').onchange=e=>{showRds=e.target.checked;draw()};
document.getElementById('ter').onchange=e=>{showTer=e.target.checked;draw()};
document.getElementById('jl').onchange=e=>{showJL=e.target.checked;draw()};
document.getElementById('wjs').onchange=e=>{showWJ=e.target.checked;draw()};
document.getElementById('unplaced').innerHTML=UNPLACED.map(u=>`<li>${u}</li>`).join('');


/* zoom and pan: wheel or pinch to zoom, drag to move, double-click to zoom in */
const Z=(()=>{
  let base=null,vb=null,drag=null,moved=false,pinch=null;const pts=new Map();
  const lvl=document.getElementById('zlvl');
  const rd=()=>{const v=svg.viewBox.baseVal;return[v.x,v.y,v.width,v.height]};
  let animId=null,aFrom=null,aTo=null,aStart=0,aDur=220;
  function stopAnim(){if(animId){cancelAnimationFrame(animId);animId=null}}
  /* Progressive detail. T2/T3 are the tier thresholds: T2 keeps the existing 125% step (one press of + from 100%),
     T3 sits at 200% so the second press of + (225%) and a pick from the place list (which zooms to 220%) both reach it.
     H is a hysteresis margin: a tier is only left once the zoom passes the far side of the boundary, so a slow
     pinch or wheel zoom that sits on a threshold cannot flicker between tiers. */
  const T2=1.245,T3=2,T4=3.5,H=.06;let tier=1;
  function tierFor(k){
    const up=t=>t===1?(k<T2+H?1:(k<T3+H?2:(k<T4+H?3:4))):t===2?(k<T2-H?1:(k<T3+H?2:(k<T4+H?3:4))):
      t===3?(k<T2-H?1:(k<T3-H?2:(k<T4+H?3:4))):(k<T2-H?1:(k<T3-H?2:(k<T4-H?3:4)));
    return up(tier)}
  function render(v){svg.setAttribute('viewBox',v.map(n=>+n.toFixed(3)).join(' '));
    const k=base[2]/v[2];
    lvl.textContent=Math.round(k*100)+'%';document.getElementById('zout').disabled=!vb;svg.classList.toggle('zoomed',!!vb);
    const was=tier;tier=tierFor(k);svg.classList.toggle('zlo',tier===1);svg.classList.toggle('zmid',tier<3);svg.classList.toggle('zfar',tier>=4);
    /* a new tier means a different set of labels is on the map, so lay them out again */
    if(was!==tier&&typeof declutterSoon==='function')declutterSoon()}
  function show(){stopAnim();render(vb||base)}
  function tick(ts){if(!aStart)aStart=ts;const t=Math.min(1,(ts-aStart)/aDur),e=1-Math.pow(1-t,3);
    render([0,1,2,3].map(i=>aFrom[i]+(aTo[i]-aFrom[i])*e));
    if(t<1)animId=requestAnimationFrame(tick);else{animId=null;render(aTo)}}
  function animateTo(target,dur){stopAnim();aFrom=rd();aTo=target;aStart=0;aDur=dur||220;animId=requestAnimationFrame(tick)}
  function set(n,anim,dur){const[bx,by,bw,bh]=base;let[x,y,w]=n;w=Math.max(bw/40,Math.min(bw,w));const h=w*bh/bw;const mx=w*.45,my=h*.45;
    x=Math.max(bx-mx,Math.min(bx+bw-w+mx,x));y=Math.max(by-my,Math.min(by+bh-h+my,y));
    vb=(Math.abs(w-bw)<.5&&Math.abs(x-bx)<.5&&Math.abs(y-by)<.5)?null:[x,y,w,h];
    if(anim===false){stopAnim();render(vb||base)}else animateTo(vb||base,dur)}
  function nudge(fx,fy){const[x,y,w,h]=vb||base;set([x+fx*w,y+fy*h,w],false)}
  function at(f,cx,cy,anim,dur){const[x,y,w]=vb||base;set([cx-(cx-x)/f,cy-(cy-y)/f,w/f],anim,dur)}
  function pt(e){const r=svg.getBoundingClientRect(),[x,y,w,h]=vb||base;return[x+(e.clientX-r.left)/r.width*w,y+(e.clientY-r.top)/r.height*h]}
  const mid=()=>{const[x,y,w,h]=vb||base;return[x+w/2,y+h/2]};
  function sync(){const n=rd();if(base&&vb&&Math.abs(n[2]-base[2])<.5&&Math.abs(n[3]-base[3])<.5)show();else{base=n;vb=null;show()}}
  let zt=0;const zm=document.getElementById('zmsg');
  svg.addEventListener('wheel',e=>{if(!(e.ctrlKey||e.metaKey)){if(zm){zm.classList.add('on');clearTimeout(zt);zt=setTimeout(()=>zm.classList.remove('on'),1200)}return}
    e.preventDefault();const[cx,cy]=pt(e);const k=e.deltaMode?0.05:(e.ctrlKey&&Math.abs(e.deltaY)<40?0.01:0.0018);at(Math.exp(-e.deltaY*k),cx,cy,true,160)},{passive:false});
  /* Drop any pointer the browser no longer reports as down. Without this a press that is
     released off the map (or outside the window) leaves its id in `pts` for good, the next
     press looks like a second finger, and from then on every drag pinch-zooms instead of
     panning until the page is reloaded. */
  const prune=e=>{
    /* a mouse or pen has only one pointer down at a time, so any earlier one of that kind
       is finished whatever we were told; a stale touch is cleared by the window listeners */
    if(e.pointerType!=='touch')pts.forEach((q,id)=>{if(q.pointerType===e.pointerType&&id!==e.pointerId)pts.delete(id)})};
  svg.addEventListener('pointerdown',e=>{
    prune(e);pts.set(e.pointerId,e);
    /* NB: the pointer is deliberately NOT captured here. Capturing on pointerdown retargets
       the later pointer events AND the click that follows to this <svg>, so a marker's own
       click listener never runs and its records pop-up never opens. Capture is taken only
       once a drag has actually started (below); a press released off the map is cleaned up
       by the prune above and by the window listeners further down. */
    if(pts.size===2){const[a,b]=[...pts.values()];pinch={d:Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)};drag=null;return}
    stopAnim();drag={x:e.clientX,y:e.clientY,vb:(vb||base).slice(),id:e.pointerId};moved=false});
  svg.addEventListener('pointermove',e=>{if(!pts.has(e.pointerId))return;pts.set(e.pointerId,e);
    if(pinch&&pts.size===2){const[a,b]=[...pts.values()];const d=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
      const m=pt({clientX:(a.clientX+b.clientX)/2,clientY:(a.clientY+b.clientY)/2});if(pinch.d>0)at(d/pinch.d,m[0],m[1],false);pinch.d=d;moved=true;return}
    if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(!moved&&Math.hypot(dx,dy)<5)return;
    if(!moved){moved=true;try{svg.setPointerCapture(e.pointerId)}catch(_){}svg.classList.add('grabbing')}
    const r=svg.getBoundingClientRect(),[x,y,w]=drag.vb;const h=drag.vb[3];set([x-dx/r.width*w,y-dy/r.height*h,w],false)});
  const end=e=>{pts.delete(e.pointerId);if(pts.size<2)pinch=null;if(drag&&drag.id===e.pointerId){drag=null;svg.classList.remove('grabbing')}};
  svg.addEventListener('pointerup',end);svg.addEventListener('pointercancel',end);
  /* backstop: a release that happens off the map, or outside the window entirely, still
     clears the pointer, so the map can never be left believing a finger is still down */
  addEventListener('pointerup',end,true);addEventListener('pointercancel',end,true);
  addEventListener('blur',()=>{pts.clear();pinch=null;if(drag){drag=null;svg.classList.remove('grabbing')}});
  svg.addEventListener('click',e=>{if(moved){e.stopPropagation();e.preventDefault();moved=false}},true);
  svg.addEventListener('dblclick',e=>{if(e.target.closest&&e.target.closest('g.mk'))return;e.preventDefault();const[cx,cy]=pt(e);at(2,cx,cy,true,240)});
  document.getElementById('zin').onclick=()=>at(1.5,...mid(),true,240);
  document.getElementById('zout').onclick=()=>at(1/1.5,...mid(),true,240);
  document.getElementById('zreset').onclick=()=>{vb=null;animateTo(base,280)};
  document.getElementById('pl').onclick=()=>nudge(-.25,0);document.getElementById('pr').onclick=()=>nudge(.25,0);
  document.getElementById('pu').onclick=()=>nudge(0,-.25);document.getElementById('pd').onclick=()=>nudge(0,.25);
  svg.tabIndex=0;svg.addEventListener('keydown',e=>{const m={ArrowLeft:[-.15,0],ArrowRight:[.15,0],ArrowUp:[0,-.15],ArrowDown:[0,.15]}[e.key];if(m){e.preventDefault();nudge(...m)}else if(e.key==='+'||e.key==='='){at(1.5,...mid(),true,240)}else if(e.key==='-'){at(1/1.5,...mid(),true,240)}});
  const wb=document.getElementById('zwide');
  /* the map is full width unless a township or county is picked (then its records open beside the map, as before); the button overrides */
  let wideUser=null,lastTf=null;
  window.sideSync=()=>{const g=document.querySelector('.grid'),cur=typeof tfCur!=='undefined'?tfCur:'';if(cur!==lastTf){wideUser=null;lastTf=cur}
    const wide=wideUser!==null?wideUser:!cur;g.classList.toggle('wide',wide);g.classList.toggle('noside',!cur);
    wb.setAttribute('aria-pressed',wide);wb.textContent=wide?'Side by side':'Full width';wb.hidden=!cur};
  wb.onclick=()=>{wideUser=!document.querySelector('.grid').classList.contains('wide');sideSync()};
  function focus(x,y){const[bx,by,bw,bh]=base;const w=Math.min((vb||base)[2],bw/2.2);set([x-w/2,y-w*bh/bw/2,w],true,280)}
  function zoomTo(x,y,f){const[bx,by,bw,bh]=base;const w=bw*f;set([x-w/2,y-w*bh/bw/2,w],true,280)}
  return{sync,focus,zoomTo,reset:()=>{vb=null;animateTo(base,280)}};
})();

/* ---- Label declutter -------------------------------------------------------
   Runs after every draw and whenever the zoom tier changes (the tier decides which
   labels are on the map at all). Everything is measured in viewBox units, which scale
   with the map, so a layout that reads clearly at one zoom reads the same at every
   zoom, and panning cannot change it. Markers are never moved, never hidden and never
   measured except as obstacles: only text moves, only when it actually clashes, and a
   label that still has nowhere to sit is hidden rather than left overlapping.
   Priority: 1 township names (fixed, always kept) · 2 record name/date labels ·
   3 context town names · 4 river and terrain labels (first to go). ----------- */
const L_PAD=1.6;
/* nudges tried in order, in viewBox units; the first clear one wins, so a label that
   does not clash keeps exactly the position it was drawn at */
const L_CAND=[[0,0],[0,-11],[0,11],[0,-21],[0,21],[-16,0],[16,0],[0,-31],[0,31],[-16,-12],[16,-12],[-16,12],[16,12]];
/* township names only ever shift vertically, so they stay beside their own count circle */
const L_TWP=[[0,0],[0,-10],[0,10],[0,-19],[0,19],[0,-28],[0,28],
  [15,0],[-15,0],[15,-19],[-15,-19],[15,19],[-15,19],[0,-38],[0,38],[26,-28],[-26,-28],[26,28],[-26,28]];
/* past this much displacement a township name gets a thin leader line back to its circle */
const L_LEAD=15;
/* extra room searched for record name/date labels, which are never hidden */
const L_WIDE=[[0,-42],[0,42],[-30,0],[30,0],[-30,-22],[30,-22],[-30,22],[30,22],[0,-53],[0,53],[-44,0],[44,0]];
/* the record labels' full search, ordered nearest-first so a label always takes the closest
   clear spot to its own marker and only drifts as far as it actually has to */
const L_REC=L_CAND.concat(L_WIDE).sort((a,b)=>Math.hypot(a[0],a[1])-Math.hypot(b[0],b[1]));
const lHit=(a,b)=>a.x<b.x+b.w+L_PAD&&b.x<a.x+a.w+L_PAD&&a.y<b.y+b.h+L_PAD&&b.y<a.y+a.h+L_PAD;
function lBox(e,dx,dy){try{const b=e.getBBox();if(!b||!b.width)return null;return{x:b.x+dx,y:b.y+dy,w:b.width,h:b.height}}catch(_){return null}}
function lVis(e){try{return e.checkVisibility?e.checkVisibility():e.getClientRects().length>0}catch(_){return e.getClientRects().length>0}}
/* 1 township names (never hidden) · 2 geographic place names · 3 record name/date labels
   · 4 river and terrain names. Place names outrank record labels: a town is how a reader
   orients themselves, and a record label that loses here comes back on zooming in. */
function lRank(e){const c=e.classList;
  if(c.contains('pinlab'))return 3;
  if(c.contains('placelabel')||c.contains('twplabel'))return 1;
  if(c.contains('ctx'))return 2;
  return 4}
/* A thin line from a moved township name back to the edge of its own count circle, so the
   two still read as one thing. Drawn only when the name had to move; never for markers. */
function lead(e,b){
  const svg=document.getElementById('map');if(!svg||e.dataset.tx===undefined)return;
  const cx=+e.dataset.tx,cy=+e.dataset.ty;
  /* aim at the nearest point on the label box, and start just outside the circle */
  const lx=Math.max(b.x,Math.min(cx,b.x+b.w)),ly=Math.max(b.y,Math.min(cy,b.y+b.h));
  const d=Math.hypot(lx-cx,ly-cy);if(d<14)return;
  const r=13.5,sx=cx+(lx-cx)/d*r,sy=cy+(ly-cy)/d*r;
  let g=svg.querySelector('g.leads');
  if(!g){g=document.createElementNS('http://www.w3.org/2000/svg','g');g.setAttribute('class','leads');svg.appendChild(g)}
  const ln=document.createElementNS('http://www.w3.org/2000/svg','line');
  ln.setAttribute('x1',sx.toFixed(1));ln.setAttribute('y1',sy.toFixed(1));
  ln.setAttribute('x2',lx.toFixed(1));ln.setAttribute('y2',ly.toFixed(1));
  g.appendChild(ln)}
function declutter(){
  const svg=document.getElementById('map');if(!svg)return;
  const lg=svg.querySelector('g.leads');if(lg)lg.remove();
  const all=[...svg.querySelectorAll('text.placelabel,text.pinlab,text.ctx,text.rivlabel,text.terlabel,text.twplabel')];
  /* put every label back where it was drawn, so repeated passes cannot drift */
  all.forEach(e=>{
    if(e.dataset.lx===undefined){e.dataset.lx=e.getAttribute('x')||'0';e.dataset.ly=e.getAttribute('y')||'0'}
    else{e.setAttribute('x',e.dataset.lx);e.setAttribute('y',e.dataset.ly)}
    e.classList.remove('lhide')});
  /* obstacles: the marker shapes themselves and the small town dots. Never altered. */
  const obst=[];
  svg.querySelectorAll('g.mk circle,g.mk rect,circle.tdot').forEach(s=>{
    if(!lVis(s))return;const b=lBox(s,0,0);if(b)obst.push(b)});
  /* ---- One name per township -------------------------------------------------------
     With the Township Boundaries layer on, a township can be named twice: inside its own
     boundary (twplabel) and again beside its numbered record circle (placelabel). Exactly
     one of the pair is ever shown. Up to the close-up step the name sits beside its circle,
     where the reader is looking; from close-up the interior name is preferred, since there
     is then room to read it within its boundary. A township whose interior label falls off
     the drawn map has no interior label at all, so it keeps the one beside its circle. The
     loop below adds the last condition: if the interior name has nowhere clear to sit, it
     gives up and the name beside the circle comes back instead. -------------------------- */
  const mate=new Map(),pair=new Map();
  all.forEach(e=>{const k=e.dataset.tf;if(!k)return;
    const o=pair.get(k)||{};
    if(e.classList.contains('twplabel'))o.inside=e;else if(e.classList.contains('placelabel'))o.beside=e;
    pair.set(k,o)});
  const preferInside=!svg.classList.contains('zmid');
  pair.forEach(o=>{if(!o.inside||!o.beside)return;
    mate.set(o.inside,o.beside);mate.set(o.beside,o.inside);
    (preferInside?o.beside:o.inside).classList.add('lhide')});
  const items=all.filter(lVis).map(e=>({e,r:lRank(e)}));
  items.sort((a,b)=>a.r-b.r);
  const placed=[];
  items.forEach(({e,r})=>{
    /* A label the reader has just picked, or that a research selection has ringed, is
       always kept exactly where it is, whatever else is there. */
    if(e.classList.contains('pinsel')||e.classList.contains('rson')){
      const b=lBox(e,0,0);if(b)placed.push(b);return}
    /* Township names are never hidden and never move sideways, so each stays beside its
       own count circle; they may shift a line up or down to clear a marker. */
    if(r===1){
      for(const[dx,dy]of L_TWP){
        const b=lBox(e,dx,dy);if(!b)continue;
        if(obst.some(o=>lHit(b,o))||placed.some(p=>lHit(b,p)))continue;
        if(dx)e.setAttribute('x',+e.dataset.lx+dx);
        if(dy)e.setAttribute('y',+e.dataset.ly+dy);
        if(Math.hypot(dx,dy)>=L_LEAD)lead(e,b);
        placed.push(b);return}
      /* an interior township name with nowhere clear to sit hands back to the name beside
         its own count circle, so the township is still named exactly once */
      const back=mate.get(e);
      if(back&&e.classList.contains('twplabel')){
        e.classList.add('lhide');back.classList.remove('lhide');
        for(const[dx,dy]of L_TWP){
          const b=lBox(back,dx,dy);if(!b)continue;
          if(obst.some(o=>lHit(b,o))||placed.some(p=>lHit(b,p)))continue;
          if(dx)back.setAttribute('x',+back.dataset.lx+dx);
          if(dy)back.setAttribute('y',+back.dataset.ly+dy);
          if(Math.hypot(dx,dy)>=L_LEAD)lead(back,b);
          placed.push(b);return}
        const bb=lBox(back,0,0);if(bb)placed.push(bb);return}
      const b=lBox(e,0,0);if(b)placed.push(b);return}
    /* A record label may only take a spot near its own marker until the reader has zoomed
       right in (350%+), where the map is spread out enough for a further one to stay clear.
       So in a crowded spot it yields to the place name and returns on zooming in, instead of
       pushing the place name off the map. */
    const far=svg.classList.contains('zfar');
    /* place names get the wide nearest-first search too, so a crowded one drifts a little
       rather than dropping off the map */
    const cands=(r===2||(r===3&&far))?L_REC:L_CAND;
    for(const[dx,dy]of cands){
      const b=lBox(e,dx,dy);if(!b)continue;
      if(obst.some(o=>lHit(b,o))||placed.some(p=>lHit(b,p)))continue;
      if(dx||dy){e.setAttribute('x',+e.dataset.lx+dx);e.setAttribute('y',+e.dataset.ly+dy)}
      placed.push(b);return}
    e.classList.add('lhide')})}
let lPend=0;
function declutterSoon(){if(lPend)return;lPend=requestAnimationFrame(()=>{lPend=0;declutter()})}
const _draw=draw;draw=function(){_draw();Z.sync()};
buildLandBox();buildTwpList();autoView();buildCBtns();document.getElementById('ratall').onchange=e=>{ratOn=e.target.checked;buildTwpList();all()};document.getElementById('cenall').onchange=e=>{cenOn=e.target.checked;all()};document.getElementById('milall').onchange=e=>{milOn=e.target.checked;all()};document.getElementById('courtall').onchange=e=>{courtOn=e.target.checked;buildTwpList();all()};document.getElementById('bmdall').onchange=e=>{bmdOn=e.target.checked;buildTwpList();all()};document.getElementById('miscall').onchange=e=>{miscOn=e.target.checked;buildTwpList();all()};

let ordMode='year';
function showTab(id){if(ordMode==='year'&&id!=='idx')id='year';else if(ordMode==='all'&&id!=='idx')id='all';else if(ordMode==='type'&&(id==='year'||id==='all'))id='deeds';document.querySelectorAll('#records [role=tab]').forEach(b=>{const on=b.dataset.t===id;b.setAttribute('aria-selected',on);b.tabIndex=on?0:-1});document.querySelectorAll('#records .tp').forEach(p=>{p.hidden=p.id!=='p-'+id})}
document.querySelectorAll('#records [role=tab]').forEach(b=>{b.onclick=()=>showTab(b.dataset.t);b.onkeydown=e=>{const t=[...document.querySelectorAll('#records [role=tab]')],i=t.indexOf(b);let n=null;if(e.key==='ArrowRight')n=t[(i+1)%t.length];if(e.key==='ArrowLeft')n=t[(i+t.length-1)%t.length];if(n){e.preventDefault();showTab(n.dataset.t);n.focus()}}});
function revealEl(el){for(let n=el;n&&n!==document.body;n=n.parentElement){if(n.classList&&n.classList.contains('tp')&&n.hidden)showTab(n.id.slice(2));if(n.tagName==='DETAILS'&&!n.open)n.open=true}}
document.addEventListener('click',e=>{const a=e.target.closest('a[href^="#"]');if(!a)return;if(a.dataset.tab)showTab(a.dataset.tab);const t=document.getElementById(a.getAttribute('href').slice(1));if(t)revealEl(t)},true);

/* ---- Index of individuals: built from the names as written in every record on the page ---- */
const IDX=(()=>{
  const SUR='(Kent|Kint|Kindt|Kintt)';
  const G="[A-Z][a-z]+(?: [A-Z]\\.)*";               // given name + initials
  const RE=new RegExp("((?:"+G+"(?:, | & | and ))*"+G+"(?: [A-Z][a-z]+)?) "+SUR+"(?:'s|s)?\\b((?:,)? (?:Jr|Sr)\\.?)?","g");
  const STOP=new Set(['Hero','Price','The','Widow','Said','Mr','Mrs','Agnes','Williams','Francisco','Thomas Kent','Old','Any','And','Of','To','For','Both','Only','No','Two','Three','Other','Early','Named','That','This','These','Morris','Essex','Bergen','Sussex','Passaic','Nearby','Proposed','All','Each','Which','Whether']);
  const FIX={'Chas':'Charles','Kaziah':'Casiah'};
  const m=new Map();
  /* wives and widows: listed as their own entries, "Kent, Name (maiden), wife of X Kent", or "Kent, [Wife of X]" when no name is given */
  const FEM=new Set(['Abigail','Affey','Amanda','Angenitje','Angnitie','Ann','Anna','Antje','Betsey','Betsy','Catharine','Catherine','Cornelia','Dolly','Effie','Eliza','Elizabeth','Ellen','Eunice','Fanny','Hannah','Hester','Jane','Joanna','Keziah','Leatie','Lydia','Margaret','Margriet','Maria','Maritje','Mareytie','Martha','Mary','Matilda','Nancy','Nelly','Peggy','Phebe','Polly','Racheal','Rachel','Rhoda','Ruth','Sally','Sara','Sarah','Susan']);
  const MAID={'helmer|sarah':'Cook','helemigh|sara':'Cook','jacob|angenitje':'Jeralemon','elias|rachel':'Ellenthorn','symon|maritje':'Spier','symon|mareytie':'Spier','david|mary':'Freeman',"elias j.|matilda":'Taylor','elias|elizabeth':'Sindlebox','jonathan|elizabeth':'Lewis'};
  const wm=new Map();
  const addW=(h,w,maid,sp,ref,widow)=>{h=h.replace(/\s+/g,' ').trim();w=w?w.trim():'';const key=(h+'|'+w+(w?'':(widow?'|w':'|f'))).toLowerCase();
    let e=wm.get(key);if(!e){e={h,w,maid:maid||MAID[(h+'|'+w).toLowerCase()]||'',widow:!!widow,sp:new Set(),refs:[],wife:true};wm.set(key,e)}
    if(maid&&!e.maid)e.maid=maid;if(widow)e.widow=true;(sp||[]).forEach(x=>e.sp.add(x));
    if(!e.refs.some(r=>r.t===ref.t&&r.y===ref.y&&r.k===ref.k))e.refs.push(ref)};
  const HUS="([A-Z][a-z]+(?: [A-Z]\\.?)*(?: (?:Jr|Sr)\\.)?)",NM="([A-Z][a-z]+(?: [A-Z]\\.)?)";
  const scanW=(text,ref)=>{const t=text.replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/\[([A-Z]\.)\]/g,'$1');let x,used=[];
    const P1=new RegExp(HUS+" (Kent|Kint|Kindt|Kintt)(?:, [A-Za-z]+,)? (?:&|and) "+NM+" his wife","g");
    while((x=P1.exec(t)))if(FEM.has(x[3].split(' ')[0])){addW(x[1],x[3],'',[x[2]],ref);used.push(x.index)}
    const P2=new RegExp(HUS+" (Kent|Kint|Kindt|Kintt)(?:, [A-Za-z]+,)? (?:&|and|,) ?(wife|ux)\\b(?: "+NM+")?","g");
    while((x=P2.exec(t))){if(used.includes(x.index))continue;const nm=x[4]&&FEM.has(x[4].split(' ')[0])?x[4]:'';addW(x[1],nm,'',[x[2]],ref)}
    const P3=new RegExp("\\(wife "+NM+" released dower","g");
    while((x=P3.exec(t))){const hm=t.match(new RegExp(HUS+" (Kent|Kint|Kindt|Kintt)"));if(hm&&FEM.has(x[1]))addW(hm[1],x[1],'',[hm[2]],ref)}};
  const add=(given,sp,ref)=>{given=given.replace(/\s+/g,' ').trim();if(!given||STOP.has(given))return;
    const key=given.toLowerCase();let e=m.get(key);if(!e){e={g:given,sp:new Set(),refs:[]};m.set(key,e)}
    sp.forEach(x=>e.sp.add(x));if(!e.refs.some(r=>r.t===ref.t&&r.y===ref.y&&r.k===ref.k))e.refs.push(ref)};
  const scan=(text,ref)=>{scanW(text,ref);const t=text.replace(/<[^>]+>/g,'').replace(/&amp;/g,'&');let x;RE.lastIndex=0;
    while((x=RE.exec(t))){const suf=x[3]?' '+x[3].replace(/[, ]/g,'').replace(/\.?$/,'.'):'';
      let parts=x[1].split(/, | & | and /);
      // "Joseph Williams & Calvin" style: a two-word element is another surname unless it is the last one
      parts.forEach((p,i)=>{p=p.trim();const last=i===parts.length-1;
        if(/ [A-Z][a-z]+$/.test(p)){if(!last)return;const w=p.split(' ');if(!/^(Ann|Jane|Maria|May)$/.test(w[w.length-1])||w.length>2){p=w[w.length-1];}}
        if(STOP.has(p))return;p=FIX[p]||p;add(p+(last?suf:''),[x[2]],ref)})}};
  const yr=t=>{const y=(t.replace(/<[^>]+>/g,'').match(/\b1[78]\d\d\b/)||[])[0];return y?+y:0};
  const cut=t=>{t=t.replace(/<[^>]+>/g,'');return t.length>230?t.slice(0,228).replace(/\s+\S*$/,'')+' …':t};
  // deeds
  D.forEach(d=>{const p=PL[d[0]];scan(d[3],{k:'Land deed',tab:'deeds',y:d[1],t:(p?p[0]:'')+', '+d[1]+', '+d[2]+': '+d[3]+(d[4]?' ('+d[4]+' ac)':'')})});
  UNPLACED.forEach(u=>scan(u,{k:'Land deed, no township',tab:'deeds',a:'nodeeds',y:yr(u),t:cut(u)}));
  // Morris lettered places
  R.forEach(r=>{r.items.forEach(i=>{const c=isRatItem(i)?['Tax ratable','rat']:isCourt(i)?['Court record','court']:isMisc(i)?(isBMD(i)?['B/M/D record','bmd']:['Miscellaneous','misc']):['Morris place record','deeds'];
    scan(i,{k:c[0],tab:c[1],y:yr(i),t:'Place '+r.k+' ('+r.t+'): '+cut(i)})})});
  UNPLACED_M.forEach(u=>{const c=UCAT(u);scan(u,{k:c==='court'?'Court record, no place':c==='misc'?(isBMD(u)?'B/M/D record':'Miscellaneous, no place'):'Land record, no place',tab:c==='court'?'court':c==='misc'?(isBMD(u)?'bmd':'misc'):'deeds',a:c==='deed'?'nodeeds':'',y:yr(u),t:cut(u)})});
  scan(SWINE,{k:'Court record',tab:'court',y:1766,t:SWINE});
  const TK={cen:'Census record',mil:'Military record',court:'Court record',misc:'Miscellaneous',bmd:'B/M/D record'};
  TLR.forEach(r=>{const sp=(r[8].match(/K[ei]n(?:t|et)t?/g)||['Kent']);
    const ref={k:TK[r[0]]+' ('+r[1]+')',tab:r[0],y:r[6],t:r[5]+': '+r[7]+' '+r[8]+([r[4],r[3]].filter(Boolean).length?', '+[r[4],r[3]].filter(Boolean).join(', '):'')+'. '+r[2]+(r[9]?'. '+r[9]:'')+(r[11]?' ('+r[11]+')':'')};
    const skipW=new Set(),c7=r[7].replace(/\s+/g,' ').trim();let cm;
    if(/^Sarah \(widow of David\)$|^Sarah \(Shipman\) \(Ellis\)$/.test(c7)){addW('David','Sarah','Shipman',sp,ref,true);skipW.add('Sarah')}
    else if((cm=c7.match(/^([A-Z][a-z]+(?: [A-Z]\.?)?),? (?:&|and) (?:wife )?([A-Z][a-z]+)(?: \(([A-Z][a-z]+)\)| ([A-Z][a-z]+))?$/))&&!FEM.has(cm[1])&&FEM.has(cm[2])){addW(cm[1],cm[2],cm[3]||cm[4]||'',sp,ref);skipW.add(cm[2])}
    else if((cm=c7.match(/^([A-Z][a-z]+) (?:&|and) wife$/))&&!FEM.has(cm[1]))addW(cm[1],'','',sp,ref);
    r[7].replace(/\([^)]*\)|\[[^\]]*\]/g,' ').replace(/,\s*(Jr|Sr)\b\.?/g,' $1.').replace(/\b(dec'd|Dec'd|decd|ux|wife|mother|Sgt)\b/g,' ').split(/,|&|\/| and /).forEach(p=>{p=p.replace(/\s+/g,' ').trim().replace(/\b(Jr|Sr)$/,'$1.');
      if(/^[A-Z][a-z]+( [A-Z]\.?)*( (Jr|Sr)\.)?$/.test(p)&&!STOP.has(p)&&!skipW.has(p))add(p,sp,ref)})});
  // ratables and tax lists: the name is its own field
  RATS.forEach(r=>{let n=r[0];const sp=[];n.replace(/\b(Kent|Kintt|Kint|Kindt)\b/g,(a)=>{sp.push(a);return a});
    let g=n.replace(/\([^)]*\)/g,' ').replace(/\b(Kent|Kintt|Kint|Kindt)\b/g,' ').replace(/[\/,]/g,' ').replace(/& brother/,' ').replace(/\s+/g,' ').trim();
    const w=/^Widow /.test(g);if(w)g=g.replace(/^Widow /,'')+' (widow of)';
    if(/^Sarah \(widow of\)$/.test(g))g='Sarah (widow)';
    if(!sp.length)sp.push('surname not given');
    const tl=isTL(r),isW=/^Widow /.test(r[0].trim())||/\(widow\)/i.test(r[0]),g0=g.replace(/ \(widow(?: of)?\)$/,'');
    const rref={k:tl?'Tax list':'Tax ratable',tab:'rat',a:'rat-'+r[5],y:r[1],t:RTW[r[5]].n+', '+(r[1]||'n.d.')+(r[4]?'–'+r[4]:'')+': '+r[0]+', '+r[2].replace(/^tax list, /,'')+(r[3]?' ('+r[3]+')':'')};
    if(isW){if(FEM.has(g0))addW('',g0,'',sp,rref,true);else addW(g0,'','',sp,rref,true);return}
    add(g,sp,{k:tl?'Tax list':'Tax ratable',tab:'rat',a:'rat-'+r[5],y:r[1],t:RTW[r[5]].n+', '+(r[1]||'n.d.')+(r[4]?'–'+r[4]:'')+': '+r[0]+', '+r[2].replace(/^tax list, /,'')+(r[3]?' ('+r[3]+')':'')})});
  const all=[...m.values()].map(e=>({g:e.g,sp:e.sp,refs:e.refs,label:'Kent, '+e.g,sk:'Kent, '+e.g}));
  wm.forEach(e=>{const hus=e.h?e.h+' Kent':'';let label,sk;
    if(e.w){label='Kent, '+e.w+' ('+(e.maid||'____')+')'+(hus?', '+(e.widow?'widow':'wife')+' of '+hus:(e.widow?', widow':''));sk='Kent, '+e.w}
    else{label='Kent, ['+(e.widow?'Widow':'Wife')+' of '+e.h+']';sk='Kent, '+(e.widow?'Widow':'Wife')+' of '+e.h}
    all.push({g:e.w||e.h,sp:e.sp,refs:e.refs,label,sk,wife:true,widow:e.widow})});
  const cmp=new Intl.Collator('en',{sensitivity:'base',ignorePunctuation:true});
  return all.sort((a,b)=>cmp.compare(a.sk,b.sk)||(a.wife?1:0)-(b.wife?1:0)||cmp.compare(a.label,b.label));
})();
function renderIdx(){const q=(document.getElementById('idxq').value||'').trim().toLowerCase().replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
  const norm=t=>t.toLowerCase().replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ');
  const es=IDX.filter(e=>!q||q.split(' ').every(w=>norm(e.label).includes(w)));
  document.getElementById('idxn').textContent=es.length+(es.length===1?' name':' names')+(q?' matching':'')+', '+es.reduce((n,e)=>n+e.refs.length,0)+' references';
  document.getElementById('idxlist').innerHTML=es.length?es.map(e=>{const ys=e.refs.map(r=>r.y).filter(Boolean),vs=[...e.sp],wr=vs.filter(x=>x!=='Kent'&&x!=='surname not given'),nos=vs.length===1&&vs[0]==='surname not given'||!vs.length;
    const refs=e.refs.slice().sort((a,b)=>(a.y||9999)-(b.y||9999));
    return `<details${q&&es.length<4?' open':''}><summary><span>${tipEsc(e.label)}</span><span class="im">${nos?'surname not written &middot; ':wr.length?'written '+wr.join(', ')+' &middot; ':''}${refs.length} ${refs.length===1?'record':'records'}${ys.length?' &middot; '+Math.min(...ys)+(Math.max(...ys)>Math.min(...ys)?'–'+Math.max(...ys):''):''}</span></summary><ul>${refs.map(r=>`<li><b>${r.k}.</b> ${tipEsc(r.t)} <button type="button" class="go" data-tab="${r.tab}" data-a="${r.a||''}">open</button></li>`).join('')}</ul></details>`}).join(''):'<p class="zhint">No name matches.</p>'}
document.getElementById('idxq').addEventListener('input',renderIdx);
document.getElementById('idxopen').onclick=()=>document.querySelectorAll('#idxlist details').forEach(d=>d.open=true);
document.getElementById('idxclose').onclick=()=>document.querySelectorAll('#idxlist details').forEach(d=>d.open=false);
document.getElementById('idxlist').addEventListener('click',e=>{const b=e.target.closest('button.go');if(!b)return;showTab(b.dataset.tab);const t=(b.dataset.a&&document.getElementById(b.dataset.a))||document.getElementById('records');t.scrollIntoView({behavior:'smooth',block:'start'})});
renderIdx();
/* ---- Resolved individuals & family groups: curated from the compiler's research notes (not generated) ---- */
/* data: served by /data.js */
function renderProfiles(){const B={pv:'Proven',pb:'Probable',pp:'Proposed',hy:'Hypothesis'};
  document.getElementById('resgrp').innerHTML=PROF.map((g,i)=>`<details class="rg"${i===0?' open':''}><summary><span>${g.t}</span></summary><div class="rgb"><p>${g.intro}</p><ul>${g.m.map(x=>`<li><b>${x[0]}</b> <span class="cfb ${x[1]}">${B[x[1]]}</span> ${x[2]}</li>`).join('')}</ul><div class="rgf">${g.maps.map(p=>`<button type="button" class="chip resmap" data-tf="${p[1]}">Show on map: ${p[0]}</button>`).join('')}<button type="button" class="chip resfind" data-q="${g.q}">Find &ldquo;${g.q}&rdquo; in the index</button></div><p class="rgs">${g.src}</p></div></details>`).join('')}
renderProfiles();
document.getElementById('resgrp').addEventListener('click',e=>{const m=e.target.closest('button.resmap'),f=e.target.closest('button.resfind');
  if(m){if(typeof tfGo==='function')tfGo(m.dataset.tf);const mp=document.getElementById('map');if(mp)window.scrollTo({top:mp.getBoundingClientRect().top+window.scrollY-90,behavior:'smooth'})}
  if(f){const q=document.getElementById('idxq');q.value=f.dataset.q;renderIdx();document.getElementById('idx-all').scrollIntoView({behavior:'smooth',block:'start'})}});

document.getElementById('morefilters').open=true;
(()=>{const q=document.getElementById('quick');let seen=false;try{seen=localStorage.getItem('kentmap-quick')==='closed'}catch(e){}
  if(seen||window.innerWidth<=760)q.open=false;
  q.addEventListener('toggle',()=>{try{localStorage.setItem('kentmap-quick',q.open?'open':'closed')}catch(e){}})})();
/* ---- Township focus: zoom to an old township (as the records name it) and list the records that name it ---- */
/* data: served by /data.js */
const TFK=Object.keys(TF);let tfCur='';
const tfLL=k=>{const t=TF[k];if(t.off)return null;if(t.ll)return t.ll;const w=t.lab&&TWPL.find(x=>x[2]===t.lab);if(w)return[w[0],w[1]];if(t.tg&&TGP[t.tg[0]])return[TGP[t.tg[0]][1],TGP[t.tg[0]][2]];const rs=R.filter(r=>(t.pl||'').includes(r.k));return rs.length?[rs.reduce((a,r)=>a+r.lat,0)/rs.length,rs.reduce((a,r)=>a+r.lon,0)/rs.length]:null};
const tfYr=y=>y===0||(y>=y0&&y<=y1);
function tfData(k,allYears){const t=TF[k],o={deeds:[],rat:[],cen:[],mil:[],court:[],bmd:[],misc:[]};const yr=allYears?(()=>true):tfYr;
  const ids=(t.tg||[]).flatMap(g=>TG[g].ids);
  D.forEach(d=>{if(ids.includes(d[0])&&yr(d[1]))o.deeds.push([d[1],`<b>${d[1]}</b>, ${tipEsc(d[2])}: ${tipEsc(d[3])}${d[4]?' ('+tipEsc(d[4])+' ac)':''} <span class="im">${tipEsc(PL[d[0]][0])}</span>`])});
  R.forEach(r=>{if(!(t.pl||'').includes(r.k))return;r.items.forEach(i=>{if(!allYears&&!inYr(i))return;const c=isRatItem(i)?'rat':isCourt(i)?'court':isMisc(i)?(isBMD(i)?'bmd':'misc'):'deeds';
    o[c].push([yrsOf(i)[0]||0,`<b>Place ${r.k}</b> (${r.t}): ${i}`])})});
  RATS.forEach(r=>{if((t.rat||[]).includes(r[5])&&(allYears||r[1]===0||(r[1]<=y1&&(r[4]||r[1])>=y0)))o.rat.push([r[1],`<b>${r[1]||'n.d.'}${r[4]?'–'+r[4]:''}</b> ${tipEsc(r[0])}: ${r[2]}${r[3]?' <span class="im">'+tipEsc(r[3])+'</span>':''}`])});
  TLR.forEach(r=>{if(!((t.rat||[]).includes(r[12])||(t.tn&&!r[12]&&t.tn.test(r[4]))))return;if(!yr(r[6]))return;
    (o[r[0]]||o.misc).push([r[6],`<b>${tipEsc(r[5])}</b> ${tipEsc(r[7]+' '+r[8])}: ${tipEsc(r[2])}${r[9]?'. '+tipEsc(r[9]):''} <span class="im">${tipEsc(r[11])}</span>${r[10]?' <a href="'+r[10]+'" target="_blank" rel="noopener">'+(/library\/books/.test(r[10])?'book':'image')+'</a>':''}`])});
  Object.values(o).forEach(a=>a.sort((x,y)=>(x[0]||9999)-(y[0]||9999)));return o}
/* data: served by /data.js */
const tbg=q=>`<span class="tbg" style="--tc:var(--c-${(TFT.find(x=>x[0]===q)||TFT[6])[3]})">${TFLAB[q]||'Misc'}</span>`;
function chronoRows(o){const a=[];TFT.forEach(([q,,on])=>{if(on())(o[q]||[]).forEach(x=>a.push([x[0],q,x[1],x[2]]))});a.sort((p,q)=>(p[0]||9999)-(q[0]||9999));return a}
function chronoUL(o){const a=chronoRows(o);return a.length?`<ul class="chrono">${a.map(x=>`<li><span class="cy">${x[0]||'n.d.'}</span>${tbg(x[1])}<span class="ct">${x[2]}</span></li>`).join('')}</ul>`:''}
const TFT=[['deeds','Land',()=>landOn,'land'],['rat','Tax Ratables/Lists',()=>ratOn,'tax'],['cen','Census',()=>cenOn,'cen'],['mil','Military',()=>milOn,'mil'],['court','Court',()=>courtOn,'court'],['bmd','B/M/D Records',()=>bmdOn,'bmd'],['misc','Miscellaneous',()=>miscOn,'misc']];
function tfRender(){const out=document.getElementById('tfout');const _s=document.getElementById('tfsel');_s.value=tfCur;if(tfCur&&_s.value!==tfCur&&TF[tfCur]){const og=document.getElementById('tfother');if(og){og.insertAdjacentHTML('beforeend',`<option value="${tfCur}">${TF[tfCur].n}</option>`);_s.value=tfCur}}if(window.sideSync)sideSync();
  if(!tfCur){out.innerHTML='';return}
  if(tfCur.slice(0,2)==='c:'){const c=tfCur.slice(2),ks=TFK.filter(k=>TF[k].c===c||(({Passaic:['acquackanonk','saddle']})[c]||[]).includes(k)),o={deeds:[],rat:[],cen:[],mil:[],court:[],bmd:[],misc:[]},seen=new Set();
    const add=d=>Object.keys(o).forEach(q=>(d[q]||[]).forEach(x=>{if(!seen.has(x[1])){seen.add(x[1]);o[q].push(x)}}));
    ks.forEach(k=>add(tfData(k)));if(window.cmData)add(window.cmData(c));Object.values(o).forEach(a=>a.sort((x,y)=>(x[0]||9999)-(y[0]||9999)));
    const tot=TFT.reduce((n,[q,,on])=>n+(on()?o[q].length:0),0);
    out.innerHTML=`<h3>${c} County</h3><p class="zhint" style="margin:0 0 6px">All records for the county's townships plus records that name only the county: <b>${tot} ${tot===1?'record':'records'}</b> in the years and record types chosen in Filters, in order of year. These are AI-assisted transcriptions; check the original.</p>`+
      (chronoUL(o)||'<p class="zhint">No record names this county in the selected years.</p>');return}
  const t=TF[tfCur],o=tfData(tfCur),tot=TFT.reduce((n,[c,,on])=>n+(on()?o[c].length:0),0);
  out.innerHTML=`<h3>${t.n}</h3>${tfHist(tfCur)}<p class="zhint" style="margin:0 0 6px">${t.c} County${t.off?'. West of the map edge, so the map is not zoomed':''}. <b>${tot} ${tot===1?'record':'records'}</b> in the years and record types chosen in Filters, in order of year. Records that name only the county, or no place, are in the Records section below and not here. These are AI-assisted transcriptions; check the original.</p>`+
    (chronoUL(o)||'<p class="zhint">No record names this township in the selected years.</p>')}
function tfMark(){document.querySelectorAll('#map text.twplabel').forEach(n=>{const lb=(n.firstChild&&n.firstChild.nodeType===3?n.firstChild.textContent:n.textContent).trim().toLowerCase();const k=n.dataset.tf||TFK.find(q=>TF[q].lab&&TF[q].lab.toLowerCase()===lb);if(!k)return;n.classList.add('tfc');n.dataset.tf=k;n.classList.toggle('tfon',k===tfCur);if(!n.querySelector('title')){const ti=document.createElementNS(NS,'title');ti.textContent='Zoom to '+TF[k].n+' and list its records';n.appendChild(ti)}})}
function tfGo(k,zoom){tfCur=k||'';
  if(tfCur.slice(0,2)==='c:'){{const cc=tfCur.slice(2);if(NYSET.includes(cc)&&!nyOn.has(cc)){nyOn.add(cc);buildCBtns();view='all';draw();renderList()}}if(zoom!==false&&window.CMLL&&CMLL[tfCur.slice(2)]){const c=tfCur.slice(2),ext=(({Bergen:[[40.78,-74.25],[41.13,-73.91]],Essex:[[40.70,-74.38],[40.91,-74.12]],Passaic:[[40.84,-74.50],[41.20,-74.11]],Morris:[[40.67,-74.79],[41.08,-74.27]],Union:[[40.60,-74.47],[40.77,-74.20]],Rockland:[[41.00,-74.25],[41.35,-73.88]],Orange:[[41.15,-74.76],[41.62,-73.95]],Putnam:[[41.32,-73.98],[41.53,-73.51]],Westchester:[[40.88,-73.98],[41.37,-73.48]],Bronx:[[40.79,-73.93],[40.92,-73.75]],'New York':[[40.70,-74.02],[40.88,-73.91]],Kings:[[40.57,-74.04],[40.74,-73.83]],Queens:[[40.54,-73.96],[40.80,-73.70]],Richmond:[[40.49,-74.26],[40.65,-74.05]],Nassau:[[40.54,-73.77],[40.90,-73.42]],Suffolk:[[40.60,-73.50],[41.10,-71.85]]})[c]||[]).map(p=>[Math.min(VIEWS.all.lat[1],Math.max(VIEWS.all.lat[0],p[0])),Math.min(VIEWS.all.lon[1],Math.max(VIEWS.all.lon[0],p[1]))]),pts=[CMLL[c].ll].concat(ext,TFK.filter(k=>TF[k].c===c||(({Passaic:['acquackanonk','saddle']})[c]||[]).includes(k)).map(tfLL).filter(Boolean));
      const inV=v=>{const{lat:a,lon:o}=VIEWS[v];return pts.every(p=>p[0]>=a[0]&&p[0]<=a[1]&&p[1]>=o[0]&&p[1]<=o[1])};if(view!=='all'){view='all';draw();renderList()}
      const xy=pts.map(p=>P(p[0],p[1])),xs=xy.map(q=>q[0]),ys=xy.map(q=>q[1]),{W,H}=VIEWS[view];
      const f=Math.min(.55,Math.max(.3,(ext.length?1.1:1.4)*Math.max((Math.max(...xs)-Math.min(...xs))/W,(Math.max(...ys)-Math.min(...ys))/H)));
      Z.zoomTo((Math.max(...xs)+Math.min(...xs))/2,(Math.max(...ys)+Math.min(...ys))/2,f)}
    tfMark();tfRender();return}
  {const t=TF[tfCur];if(t&&t.ny&&!nyOn.has(t.c)){nyOn.add(t.c);buildCBtns();view='all';draw();renderList()}}if(tfCur&&zoom!==false){const ll=tfLL(tfCur);if(ll){const fits=v=>{const{lat:a,lon:o}=VIEWS[v];return ll[0]>=a[0]+.02&&ll[0]<=a[1]-.02&&ll[1]>=o[0]+.02&&ll[1]<=o[1]-.02};const nv=['core','morris'].find(fits)||'all';
    if(nv!==view){view=nv;draw();renderList()}const[x,y]=P(ll[0],ll[1]);Z.zoomTo(x,y,view==='core'?.55:.5)}}
  if(!tfCur&&zoom!==false){const NJX={Bergen:[[40.78,-74.25],[41.13,-73.91]],Essex:[[40.70,-74.38],[40.91,-74.12]],Passaic:[[40.84,-74.50],[41.20,-74.11]],Morris:[[40.67,-74.79],[41.08,-74.27]],Union:[[40.60,-74.47],[40.77,-74.20]],Sussex:[[41.09,-74.66],[41.14,-74.54]]},pts=MUN_ORDER.filter(c=>cActive(c)||nyOn.has(c)).flatMap(c=>NJX[c]||NYEXT[c]||[]);if(view!=='all'){view='all';draw();renderList()}if(pts.length)fitTo(pts);else Z.reset()}
  tfMark();tfRender()}
(()=>{const sel=document.getElementById('tfsel'),PSC={acquackanonk:'(then Essex Co.)',saddle:'(part; Bergen Co.)'};
  /* grouped: entire map; NJ counties; NJ townships with records, by county; NY counties (their towns have no records yet, so are left out) */
  const NJC=['Essex','Morris','Passaic','Bergen','Union','Sussex'],NYC=['Rockland','Orange','Putnam','Westchester','Bronx','New York','Kings','Queens','Richmond','Nassau','Suffolk'];
  const cnt=k=>Object.values(tfData(k,true)).reduce((a,b)=>a+b.length,0);
  let h='<optgroup label="Entire map"><option value="">Currently Entire Map</option></optgroup>';
  h+='<optgroup label="New Jersey — Counties">'+NJC.map(c=>`<option value="c:${c}">${c} County</option>`).join('')+'</optgroup>';
  NJC.forEach(c=>{const ks=TFK.filter(k=>!TF[k].ny&&(TF[k].c===c||(c==='Passaic'&&PSC[k]))).map(k=>[k,cnt(k)]).filter(x=>x[1]>0);
    if(ks.length)h+=`<optgroup label="New Jersey — ${c} County townships">`+ks.map(([k,n])=>`<option value="${k}">${TF[k].n.replace(/ Twp\.| Township/g,'')} ${c==='Passaic'?PSC[k]+' ':''}(${n})</option>`).join('')+'</optgroup>'});
  h+='<optgroup label="New York — Counties">'+NYC.map(c=>{const n=nyCount(c);return `<option value="c:${c}">${c} County, N.Y.${({Rockland:' (then Orange Co.)',Putnam:' (then Dutchess Co.)'}[c]||'')} ${n?'('+n+')':'(no records yet)'}</option>`}).join('')+'</optgroup>';
  setTimeout(()=>{try{buildCBtns()}catch(e){}},0);
  h+='<optgroup label="Other" id="tfother"></optgroup>';
  sel.innerHTML=h;document.getElementById('tfgo').onclick=()=>tfGo(sel.value);sel.onchange=()=>tfGo(sel.value);
  const step=d=>{const L=[...new Set([...sel.querySelectorAll('option')].map(o=>o.value).filter(v=>v&&v.slice(0,2)!=='c:'))],i=L.indexOf(tfCur);tfGo(L[(i<0?(d>0?0:L.length-1):(i+d+L.length)%L.length)])};
  document.getElementById('tfclose').onclick=()=>tfGo('');document.getElementById('tfprev').onclick=()=>step(-1);document.getElementById('tfnext').onclick=()=>step(1);
  svg.addEventListener('click',e=>{const n=e.target.closest&&e.target.closest('text.twplabel.tfc');if(n){tfGo(n.dataset.tf);if(window.innerWidth<=900)document.getElementById('tfsec').scrollIntoView({behavior:'smooth',block:'start'})}});
  document.getElementById('tfout').addEventListener('click',e=>{const b=e.target.closest('button.go');if(!b)return;e.preventDefault();showTab(b.dataset.tab);document.getElementById('records').scrollIntoView({behavior:'smooth',block:'start'})});

  /* one marker per township: count of records naming it, coloured dots for the kinds of record, pop-up with all of them */
  const tmPos=k=>{const t=TF[k];if(t.off)return null;if(t.tg&&TGP[t.tg[0]])return[TGP[t.tg[0]][1],TGP[t.tg[0]][2],0];if(RPOS[k])return[RPOS[k].ll[0],RPOS[k].ll[1],0];const w=t.lab&&TWPL.find(x=>x[2]===t.lab);if(w)return[w[0],w[1],17];return t.ll?[t.ll[0],t.ll[1],0]:null};
  const tmCty=k=>[TF[k].c].concat({newprov:['Union'],westfield:['Union'],springfield:['Union'],acquackanonk:['Passaic'],saddle:['Passaic']}[k]||[]).some(c=>cActive(c)||(typeof nyOn!=='undefined'&&nyOn.has(c)));
  const tmShort=k=>TF[k].n.replace(' and the Horseneck Tract','').replace(' and Morristown','').replace(' Twp.','').replace(' (Hardiston)','');
  function tmPop(k){tipHide();const t=TF[k],o=tfData(k),on=TFT.filter(x=>x[2]()&&o[x[0]].length),tot=on.reduce((n,x)=>n+o[x[0]].length,0);
    popShow(t.n,`<p>${t.c} County. <b>${tot} ${tot===1?'record':'records'}</b> name this township in the years and record types chosen in Filters, in order of year. Township only: the marker is not a lot. AI-assisted transcriptions; check the original. Names are as written; one name may be several men.</p>`+
      chronoUL(o),
      ()=>{tfGo(k);document.getElementById('tfsec').scrollIntoView({behavior:'smooth',block:'nearest'})},'Zoom to this township')}
  function drawTM(){const{W,H}=VIEWS[view];
    TFK.forEach(k=>{const q=tmPos(k);if(!q||!tmCty(k))return;let[x,y]=P(q[0],q[1]);y+=q[2];if(k==='hanover'){x-=34;y-=26}if(x<14||x>W-14||y<14||y>H-14)return;
      const o=tfData(k),on=TFT.filter(z=>z[2]()&&o[z[0]].length),tot=on.reduce((n,z)=>n+o[z[0]].length,0);if(!tot)return;
      const g=el('g',{class:'mk tm'+(k===tfCur?' on':''),'data-mk':'t:'+k,tabindex:0,role:'button','aria-label':`${TF[k].n}: ${tot} ${tot===1?'record':'records'}. Open the list.`});
      el('circle',{class:'c',cx:x,cy:y,r:tot>99?14:12},g);const n=el('text',{class:'n',x,y:y+3.7,'text-anchor':'middle'},g);n.textContent=tot;
      
      g.addEventListener('click',()=>tmPop(k));g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();tmPop(k)}});
      tipHook(g,()=>`<div class="th"><span>${tipEsc(TF[k].n)}</span></div><div class="tb">${tot} ${tot===1?'record':'records'} · township only</div><ul style="list-style:none;padding-left:0">${on.map(z=>`<li><i class="cdot" style="background:var(--c-${z[3]})"></i>${z[1]}: ${o[z[0]].length}</li>`).join('')}</ul><div class="tm">Click for a window listing them all.</div>`);
      if(showLbl&&!q[2]&&!TF[k].ny){const left=x>W-150;const tl=lnk(txt(x+(left?-18:18),y+4,tmShort(k),'placelabel',left?'end':'start'),()=>tmPop(k),'Open the records for this township');
        /* remember the circle this name belongs to, so the declutter pass can draw a leader
           line back to it if the name has to move to stay clear of a marker */
        tl.dataset.tx=x;tl.dataset.ty=y;tl.dataset.tf=k}})}
  document.getElementById('popb').addEventListener('click',e=>{const b=e.target.closest('button.go');if(!b)return;e.preventDefault();popHide();showTab(b.dataset.tab==='deeds'?'deeds':b.dataset.tab);document.getElementById('records').scrollIntoView({behavior:'smooth',block:'start'})});
  /* one square marker per county for records that name only the county, or no place */
  const CM={Essex:{n:'Essex County',ll:[40.806,-74.290]},Morris:{n:'Morris County',ll:[40.930,-74.345]},Bergen:{n:'Bergen County',ll:[40.955,-74.112]},Sussex:{n:'Sussex County',ll:[41.105,-74.630]},Passaic:{n:'Passaic County',ll:[40.945,-74.215]},Union:{n:'Union County',ll:[40.672,-74.385]},Rockland:{n:'Rockland County, N.Y.',ll:[41.150,-74.020]},Orange:{n:'Orange County, N.Y.',ll:[41.400,-74.310]},Putnam:{n:'Putnam County, N.Y.',ll:[41.430,-73.750]},Westchester:{n:'Westchester County, N.Y.',ll:[41.120,-73.780]},Bronx:{n:'Bronx County, N.Y.',ll:[40.850,-73.860]},'New York':{n:'New York County, N.Y.',ll:[40.780,-73.965]},Kings:{n:'Kings County, N.Y.',ll:[40.650,-73.950]},Queens:{n:'Queens County, N.Y.',ll:[40.710,-73.820]},Richmond:{n:'Richmond County, N.Y.',ll:[40.580,-74.150]},Nassau:{n:'Nassau County, N.Y.',ll:[40.730,-73.590]},Suffolk:{n:'Suffolk County, N.Y.',ll:[40.850,-73.450]}};
  const tfHas=r=>TFK.some(k=>{const t=TF[k];return (t.rat||[]).includes(r[12])||(t.tn&&!r[12]&&t.tn.test(r[4]))});
  function cmData(c){const o={deeds:[],rat:[],cen:[],mil:[],court:[],bmd:[],misc:[]};
    TLR.forEach((r,ix)=>{if(r[13]!==c||tfHas(r)||!tfYr(r[6]))return;(o[r[0]]||o.misc).push([r[6],`<b>${tipEsc(r[5])}</b> ${tipEsc(r[7]+' '+r[8])}${r[4]?' ('+tipEsc(r[4])+')':''}: ${tipEsc(r[2])}${r[9]?'. '+tipEsc(r[9]):''} <span class="im">${tipEsc(r[11])}</span>${r[10]?' <a href="'+r[10]+'" target="_blank" rel="noopener">'+(/library\/books/.test(r[10])?'book':'image')+'</a>':''}`,sids().T[ix]])});
    if(c==='Essex')RATS.forEach((r,ix)=>{if(r[5]==='essexnos'&&(r[1]===0||(r[1]<=y1&&(r[4]||r[1])>=y0)))o.rat.push([r[1],`<b>${r[1]||'n.d.'}</b> ${tipEsc(r[0])}: ${r[2]}`,sids().A[ix]])});
    if(c==='Morris'){UNPLACED.forEach((u,ix)=>{if(inYr(u))o.deeds.push([yrsOf(u)[0]||0,u,sids().U[ix]])});
      UNPLACED_M.forEach((u,ix)=>{if(!inYr(u))return;const k=UCAT(u);o[k==='court'?'court':k==='misc'?(isBMD(u)?'bmd':'misc'):'deeds'].push([yrsOf(u)[0]||0,u,sids().V[ix]])})}
    Object.values(o).forEach(a=>a.sort((x,y)=>(x[0]||9999)-(y[0]||9999)));return o}
  function cmPop(c){tipHide();const o=cmData(c),on=TFT.filter(x=>x[2]()&&o[x[0]].length),tot=on.reduce((n,x)=>n+o[x[0]].length,0);
    popShow(CM[c].n+': county-only records',`<p><b>${tot} ${tot===1?'record':'records'}</b> that name ${CM[c].n} but no township (or a place this map does not mark), in the years and record types chosen in Filters. They are listed in the bar below the map, not placed on it. AI-assisted transcriptions; check the original. Names are as written; one name may be several men.</p>`+
      chronoUL(o),popHide,'Done')}
  window.cmData=cmData;window.CMLL=CM;
  /* county-only records: square badges in a bar below the map (not on the map, since they are not locations) */
  function drawCM(){const bar=document.getElementById('cmbar');if(!bar)return;
    const items=Object.keys(CM).filter(cActive).map(c=>{const o=cmData(c),on=TFT.filter(z=>z[2]()&&o[z[0]].length),tot=on.reduce((n,z)=>n+o[z[0]].length,0);return{c,o,on,tot}}).filter(x=>x.tot).sort((p,q)=>q.tot-p.tot);
    bar.innerHTML='';bar.hidden=!items.length;if(!items.length)return;
    const lab=document.createElement('span');lab.className='cmlab';lab.textContent='County-level records (no township named) — click a county to view:';bar.appendChild(lab);
    items.forEach(({c,o,on,tot})=>{const b=document.createElement('button');b.type='button';b.className='cmb';
      b.setAttribute('aria-label',`${CM[c].n}: ${tot} county-only ${tot===1?'record':'records'}. Open the list.`);
      b.innerHTML=`<i class="tmk sq" aria-hidden="true">${tot}</i><span>${CM[c].n}</span>`;
      b.addEventListener('click',()=>cmPop(c));
      tipHook(b,()=>`<div class="th"><span>${CM[c].n}</span></div><div class="tb">${tot} county-only ${tot===1?'record':'records'} · no location</div><ul style="list-style:none;padding-left:0">${on.map(z=>`<li><i class="cdot" style="background:var(--c-${z[3]})"></i>${z[1]}: ${o[z[0]].length}</li>`).join('')}</ul><div class="tm">Click for a window listing them all.</div>`);
      bar.appendChild(b)})}
  /* declutter runs last, once the township circles, county markers and research rings are
     all on the map, so the label pass sees every marker it has to keep clear of */
  const _d=draw;draw=function(){_d();drawTM();drawCM();tfMark();declutter()};
  const _a=all;all=function(){_a();tfRender()};
  const _p=pick;pick=function(key,scroll){_p(key,scroll);if(!sel0())return;const id=key.slice(2),k=key[0]==='e'?(TF[id]?id:''):TFK.find(q=>(TF[q].pl||'').includes(id));if(k)tfGo(k,false)};
  function sel0(){return typeof sel!=='undefined'}
})();

/* pop-up window (used by the tax squares) */
let popFn=null,popBack=null;
function popShow(title,html,fn,lab){document.getElementById('popgo').textContent=lab||'Open the full list';popFn=fn;popBack=document.activeElement;document.getElementById('poph').textContent=title;document.getElementById('popb').innerHTML=html;const p=document.getElementById('pop');p.hidden=false;document.getElementById('popc').focus()}
function popSize(big){const w=document.querySelector('#pop .popin'),b=document.getElementById('popz');w.style.width='';w.style.height='';w.classList.remove('sized');w.classList.toggle('big',big);b.setAttribute('aria-pressed',big);b.textContent=big?'⤡ Restore':'⤢ Expand';b.setAttribute('aria-label',big?'Restore the window to its normal size':'Expand the window')}
function popHide(){const p=document.getElementById('pop');if(p.hidden)return;p.hidden=true;popSize(false);if(popBack&&popBack.focus)try{popBack.focus()}catch(e){}}
document.getElementById('popx').onclick=popHide;
document.getElementById('popz').onclick=()=>popSize(!document.querySelector('#pop .popin').classList.contains('big'));
try{new ResizeObserver(()=>{const w=document.querySelector('#pop .popin');w.classList.toggle('sized',!!(w.style.width||w.style.height))}).observe(document.querySelector('#pop .popin'))}catch(e){}
document.getElementById('popc').onclick=popHide;
document.getElementById('popgo').onclick=()=>{const f=popFn;popHide();f&&f()};
let popDownBg=false;document.getElementById('pop').addEventListener('pointerdown',e=>{popDownBg=e.target.id==='pop'});
document.getElementById('pop').addEventListener('click',e=>{if(e.target.id==='pop'&&popDownBg)popHide();popDownBg=false});
document.addEventListener('keydown',e=>{if(e.key==='Escape')popHide()});


/* ---- Records section, by year: every record type in one chronological table per township ---- */
function setOrd(o){ordMode=o;document.querySelectorAll('.ordseg button[data-o]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.o===o));
  document.getElementById('records').classList.toggle('ord-year',o==='year');
  document.getElementById('records').classList.toggle('ord-all',o==='all');
  buildYearList();buildAllList();
  const cur=document.querySelector('#records .tp:not([hidden])');if(cur&&cur.id==='p-idx')return;
  showTab(o==='year'?'year':o==='all'?'all':'deeds')}
document.addEventListener('click',e=>{const b=e.target.closest('.ordseg button');if(b&&b.dataset.o)setOrd(b.dataset.o)});
document.getElementById('idxback').onclick=()=>showTab(ordMode==='year'?'year':ordMode==='all'?'all':'deeds');
const TFKEYS_OF=m=>TFK.filter(k=>{const t=TF[k];if(t.ny||t.off)return false;
  if((t.rat||[]).some(rk=>(RTM[rk]||[]).includes(m)))return true;
  if((t.tg||[]).some(g=>TG[g]&&TG[g].ids.some(id=>(PMAP[id]||[]).slice(1).includes(m))))return true;
  if((t.pl||'').split('').some(p=>(PMAP['m:'+p]||[]).slice(1).includes(m)))return true;return false});
const yLink=u=>u?' <a href="'+u+'" target="_blank" rel="noopener">'+(/library\/books/.test(u)?'book':'image')+'</a>':'';
/* Record ids. An id comes from the source entry (its list and its data), not from the text a table
   shows, so a change to a table cannot change the id. A row that shows one entry in more than one
   place has the same id each time. Identical entries in one list get "-2", "-3" in list order. */
let SIDS=null;
function sids(){if(SIDS)return SIDS;
  const FN=s=>{let h=2166136261,g=5381;for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);h^=c;h=Math.imul(h,16777619);g=((g<<5)+g+c)|0}const x=n=>(n>>>0).toString(16).padStart(8,'0');return x(h)+x(g)};
  const seen=new Map(),id=(src,v)=>{const b=FN(src+'|'+JSON.stringify(v)),n=(seen.get(b)||0)+1;seen.set(b,n);return 's'+b+(n>1?'-'+n:'')};
  return SIDS={D:D.map(x=>id('D',x)),A:RATS.map(x=>id('A',x)),T:TLR.map(x=>id('T',x)),U:UNPLACED.map(x=>id('U',x)),V:UNPLACED_M.map(x=>id('V',x)),
    M:Object.fromEntries(R.map(r=>[r.k,r.items.map(i=>id('M'+r.k,i))]))}}
const on=q=>TFT.find(x=>x[0]===q)[2]();
const th='<table class="twt"><thead><tr><th>Year</th><th>Type</th><th>Citation / deed</th><th>Parties / details</th><th>Place on the map</th></tr></thead><tbody>';
const mkOf=r=>{const o=[];if(r.pk)o.push('m:'+r.pk);if(r.k&&r.k[0]==='D'&&D[+r.k.slice(1)]){const pid=D[+r.k.slice(1)][0];Object.keys(TF).forEach(k=>{if((TF[k].tg||[]).some(g=>TG[g].ids.includes(pid)))o.push('t:'+k)})}if(r.tf)o.push('t:'+r.tf);return o.join(',')};
const tr=r=>`<tr data-rid="${r.id}" data-mk="${mkOf(r)}"><td class="y">${r.y}</td><td class="t">${tbg(r.q)}</td><td class="b">${r.c||'\u2014'}</td><td>${r.d}</td><td>${r.p}</td></tr>`;
const sortRows=a=>a.sort((p,q)=>(p.n||9999)-(q.n||9999));
const coll=m=>{
  const alsoIn=k=>{const o=munsOf(k).filter(z=>z!==m).map(shortN);return o.length?'<span class="also">also '+o.join(', ')+'</span>':''};
  const rows=[];
  /* land deeds */
  if(on('deeds'))D.forEach((x,ix)=>{const pm=PMAP[x[0]];if(!(pm&&pm.slice(1).includes(m))||!tfYr(x[1]))return;const named=pm[0]==='n';
    rows.push({k:'D'+ix,id:sids().D[ix],sh:!named,tw:PL[x[0]][0],n:x[1],y:x[1],q:'deeds',c:tipEsc(x[2]),d:tipEsc(x[3])+(x[4]?' ('+tipEsc(x[4])+' ac)':''),nm:'',en:tipEsc(x[2]),ti:'Land deed',ds:tipEsc(x[3])+(x[4]?' ('+tipEsc(x[4])+' ac)':''),ct:tipEsc(x[2]),ur:'',dt:String(x[1]),p:tipEsc(PL[x[0]][0])+`<span class="bs">${named?'named place':'township only'}</span>`+(named?'':' <span class="also">could lie in: '+munsOf(x[0]).map(shortN).join(', ')+'</span>')+(named?alsoIn(x[0]):'')})});
  /* Morris places: items of every kind. ii indexes r.items, which is what sids() hashes. */
  R.filter(r=>(PMAP['m:'+r.k]||[]).slice(1).includes(m)).forEach(r=>{const keep=new Set(itemsOf(r));r.items.forEach((i,ii)=>{if(!keep.has(i)||!inYr(i))return;
    const q=isRatItem(i)?'rat':isCourt(i)?'court':isMisc(i)?(isBMD(i)?'bmd':'misc'):'deeds',yy=yrsOf(i)[0]||0,named=PMAP['m:'+r.k][0]==='n';
    rows.push({k:'M'+r.k+':'+ii,id:sids().M[r.k][ii],sh:!named,tw:'',pk:r.k,n:yy,y:yy||'n.d.',q,c:'Place '+r.k,d:i,nm:'',en:'Place '+r.k,ti:'',ds:i,ct:'',ur:'',dt:String(yy||'n.d.'),p:tipEsc(r.t)+`<span class="bs">${named?'named place':'township only'}</span>`+alsoIn('m:'+r.k)})})});
  /* tax lists, census, military, court, B/M/D and miscellaneous rows for the old townships that lie in this one */
  const ks=TFKEYS_OF(m),seenT=new Set(),seenR=new Set();
  ks.forEach(k=>{const t=TF[k];
    RATS.forEach((r,ix)=>{if(!(t.rat||[]).includes(r[5])||seenR.has(ix)||!on('rat'))return;if(!(r[1]===0||(r[1]<=y1&&(r[4]||r[1])>=y0)))return;seenR.add(ix);
      rows.push({k:'A'+ix,id:sids().A[ix],sh:true,tf:k,tw:t.n,n:r[1],y:(r[1]||'n.d.')+(r[4]?'\u2013'+r[4]:''),q:'rat',c:r[2],d:tipEsc(r[0])+(r[3]?' <span class="im">'+tipEsc(r[3])+'</span>':''),nm:tipEsc(r[0]),en:'',ti:'',ds:r[2],ct:r[3]?tipEsc(r[3]):'',ur:'',dt:(r[1]||'n.d.')+(r[4]?'\u2013'+r[4]:''),p:tipEsc(t.n)+'<span class="bs">township only</span>'})});
    TLR.forEach((r,ix)=>{if(seenT.has(ix))return;if(!((t.rat||[]).includes(r[12])||(t.tn&&!r[12]&&t.tn.test(r[4]))))return;
      const q=TFLAB[r[0]]?r[0]:'misc';if(!on(q)||!tfYr(r[6]))return;seenT.add(ix);
      rows.push({k:'T'+ix,id:sids().T[ix],sh:true,tf:k,tw:t.n,n:r[6],y:tipEsc(r[5]||r[6]||'n.d.'),q,c:tipEsc(r[2])+(r[11]?' <span class="im">'+tipEsc(r[11])+'</span>':''),d:tipEsc((r[7]+' '+r[8]).trim())+(r[9]?'. '+tipEsc(r[9]):'')+yLink(r[10]),nm:tipEsc((r[7]+' '+r[8]).trim()),en:'',ti:tipEsc(r[2]),ds:tipEsc(r[9]||''),ct:tipEsc(r[11]||''),ur:r[10]||'',dt:tipEsc(r[5]||r[6]||'n.d.'),p:tipEsc(t.n)+'<span class="bs">township only</span>'})})});
  return rows};
function buildYearList(){
  const box=document.getElementById('yrlist'),cbox=document.getElementById('yrcty');if(!box||!cbox)return;
  if(ordMode!=='year'){box.innerHTML='';cbox.innerHTML='';return}
  const frag=document.createDocumentFragment();
  const groups=lbMode==='county'?MUN_ORDER.map(cty=>[cty,munIds(cty)]):[[null,munIds()]];
  window.__shN=0;
  /* Which state a county sits in, taken from its own label rather than a second list. */
  const stOf=c=>/N\.Y\./.test(MUN_CTY[c]||'')?'New York':'New Jersey';
  /* County-only records, built per county so they can sit inside that county's section
     (PRD: display only; no record, citation or geographic classification is changed). */
  const ctyOnly=c=>{
    if(!window.cmData)return{html:'',nc:0,nn:0};
    const o=window.cmData(c),UA=new Set(UNPLACED),UB=new Set(UNPLACED_M);
    const split={deeds:[],rat:[],cen:[],mil:[],court:[],bmd:[],misc:[]},none={deeds:[],rat:[],cen:[],mil:[],court:[],bmd:[],misc:[]};
    Object.keys(o).forEach(q=>o[q].forEach(x=>((UA.has(x[1])||UB.has(x[1]))?none:split)[q].push(x)));
    const rws=oo=>chronoRows(oo).map(x=>`<tr data-rid="${x[3]}"><td class="y">${x[0]||'n.d.'}</td><td class="t">${tbg(x[1])}</td><td colspan="3">${x[2]}</td></tr>`);
    const a=rws(split),b=rws(none);
    /* data-sec carries the section name the record extractor stores. It is made from the data,
       not from the heading above it, so the headings here can be reworded without moving records. */
    const tbl=(r,sec)=>`<table class="twt" data-sec="${tipEsc(sec)}"><thead><tr><th>Year</th><th>Type</th><th colspan="3">Record</th></tr></thead><tbody>${r.join('')}</tbody></table>`;
    const SEC_CO=MUN_CTY[c]+': records that name only the county, or no township',SEC_NP='Land and other records with no township given';
    let html='';
    if(a.length)html+=`<details class="ctyblk" id="co-${c}"><summary><span>${MUN_CTY[c]}: records that name only the county, or no township</span><span class="tc">${a.length} ${a.length===1?'record':'records'}</span></summary>`
      +`<div class="twb"><p class="why2">These give only the county, so they are listed here rather than under a township. Any of them may relate to a location within ${MUN_CTY[c]}; none is counted in a township's own total.</p>${tbl(a,SEC_CO)}</div></details>`;
    if(b.length)html+=`<details class="ctyblk" id="co-np-${c}"><summary><span>Land and other records with no township given</span><span class="tc">${b.length} ${b.length===1?'record':'records'}</span></summary>`
      +`<div class="twb"><p class="why2">The deed index gives no township for these, or they name no place; they are not all on the map.</p>${tbl(b,SEC_NP)}</div></details>`;
    return{html,nc:a.length,nn:b.length}};
  const sect=(t,n)=>{const h=document.createElement('h4');h.className='gsec';
    h.innerHTML=t+(n?`<span class="tc">${n}</span>`:'');return h};
  const coN={};MUN_ORDER.forEach(c=>{if(cActive(c)){const o=ctyOnly(c);coN[c]={nc:o.nc,nn:o.nn}}});
  let curState='';
  groups.forEach(([cty,all])=>{
    const ids=all.filter(m=>munOn.has(m));if(!ids.length)return;
    const cfrag=document.createDocumentFragment();
    const co=cty?ctyOnly(cty):{html:'',nc:0,nn:0};
    /* coll is now defined once, above, so All Records can use the same rows. */
    const plan=shPlan(all,coll);
    /* Section A: records that name only the county. Placed first and open by default so a
       visitor looking at a location sees them, per Michelle's Batch 1 Prompt 1 Step 2. */
    if(co.html){const h=sect('Records naming only the county',co.nc+co.nn?String(co.nc+co.nn):'');
      if(cty)h.id='cosec-'+cty;cfrag.appendChild(h);
      const w=document.createElement('div');w.className='gwrap';w.innerHTML=co.html;cfrag.appendChild(w)}
    /* Section C is assembled here but appended after Section B. */
    const cBlocks=[];
    plan.blocks.forEach(bk=>{if(!bk.ms.some(m=>munOn.has(m)))return;
      const rows=sortRows(bk.rows.slice()),det=document.createElement('details');det.id=bk.id;det.className='shblk';
      /* data-sec: the section name the record extractor stores (tools/extract/records.mjs); made from the data, not the heading */
      det.dataset.sec=shTitle(bk)+' ('+shApplies(bk)+')';
      det.innerHTML=`<summary><span>${shTitle(bk)} <span class="shap">(${shApplies(bk)})</span></span><span class="tc">${rows.length} ${rows.length===1?'record':'records'}</span></summary>
        <div class="twb">${shHist(bk)}<p class="twh"><b>Could lie in:</b> ${bk.ms.slice().sort((p,q)=>MUN[p].n.localeCompare(MUN[q].n)).map(m=>MUN[m].n+(munOn.has(m)?'':' <i>(not ticked)</i>')).join(', ')}. These records give only the old township, so each is listed here once rather than under every modern municipality.</p>
        ${th+rows.map(tr).join('')+'</tbody></table>'}</div>`;
      cBlocks.push(det)});
    /* Section B: records tied to a specific location. */
    cfrag.appendChild(sect('Records associated with specific locations',String(ids.length)+(ids.length===1?' location':' locations')));
    ids.forEach(m=>{
      const mu=MUN[m],det=document.createElement('details');det.id='tw-'+m;det.dataset.sec=mu.n+(cty?'':' · '+MUN_CTY[mu.c]);
      const rows=sortRows(plan.own.get(m)||[]),bs=plan.of.get(m)||[],nsh=bs.reduce((n,b)=>n+b.rows.length,0);
      const src=mu.s.map(([t,u])=>`<a href="${u}" target="_blank" rel="noopener">${t}</a>`).join('; ');
      const cc=cty||mu.c,cn=coN[cc]||{nc:0,nn:0},con=cn.nc+cn.nn;
      det.innerHTML=`<summary><span>${mu.n}${cty?'':'<span class="cty"> · '+MUN_CTY[mu.c]+'</span>'}</span><span class="tc">${rows.length} located here${nsh?' · '+nsh+' shared':''}</span></summary>
        <div class="twb"><p class="twh"><b>History.</b> ${mu.h}</p><p class="twsrc">Sources: ${src}</p>
        ${rows.length?th+rows.map(tr).join('')+'</tbody></table>':(nsh?'':'<p class="why2">No record in the years and record types chosen in Filters.</p>')}${shRef(bs)}
        ${con?`<p class="conote">${cn.nc?`Additional records identify ${MUN_CTY[cc]} only and may be relevant to this location.`:''}${cn.nn?`${cn.nc?' A further '+cn.nn+' give no township at all, so no location can be read from them.':`${cn.nn} records for ${MUN_CTY[cc]} give no township at all, so no location can be read from them.`}`:''} <a href="#cosec-${cc}" data-co="${cc}">See all ${con} ${con===1?'record':'records'}</a> &mdash; none is included in the count above.</p>`:''}</div>`;
      cfrag.appendChild(det)});
    /* Section C: records that name a historical jurisdiction only. */
    if(cBlocks.length){cfrag.appendChild(sect('Records naming historical jurisdictions only',String(cBlocks.length)+(cBlocks.length===1?' block':' blocks')));
      cBlocks.forEach(d=>cfrag.appendChild(d))}
    /* State heading above the first county of each state. */
    if(cty){const st=stOf(cty);
      if(st!==curState){curState=st;const h2=document.createElement('h3');h2.className='stsec';h2.textContent=st;frag.appendChild(h2)}
      const h=document.createElement('h3');h.className='sub';
      const loc=ids.reduce((n,m)=>n+(plan.own.get(m)||[]).length,0);
      h.innerHTML=`${MUN_CTY[cty]} <span class="im">${ids.length} ${ids.length>1?'townships and boroughs':'township'} &middot; ${loc} located &middot; ${co.nc} county-only${co.nn?' &middot; '+co.nn+' no township given':''}</span>`;
      frag.appendChild(h)}
    frag.appendChild(cfrag)});
  box.innerHTML='';box.appendChild(frag);
  /* County-only records now sit inside their own county above, so this box stays empty in
     county view. In A-Z view there are no county sections, so they are listed here. */
  let h='';
  if(lbMode!=='county')MUN_ORDER.forEach(c=>{if(!cActive(c))return;const o=ctyOnly(c);if(o.html)h+=o.html});
  cbox.innerHTML=h;
}

/* ---- All Records: every record once, in one chronological list, whatever its kind and
   wherever it is placed. Built from the same rows as the geographic view (coll) plus the
   county-only rows, deduplicated by each record's own source key, so the two views cannot
   drift apart. Columns are unchanged: record identity still comes from them. ---- */
let allSort='old';
function buildAllList(){
  const box=document.getElementById('alllist'),cnt=document.getElementById('allcount');
  if(!box)return;
  if(ordMode!=='all'){box.innerHTML='';if(cnt)cnt.textContent='';return}
  const seen=new Set(),rows=[];
  munIds().forEach(m=>{if(!munOn.has(m))return;
    coll(m).forEach(r=>{if(seen.has(r.k))return;seen.add(r.k);rows.push(r)})});
  /* county-only records: they belong to no township, so they are gathered per county */
  const extra=[];
  MUN_ORDER.forEach(c=>{if(!cActive(c)||!window.cmData)return;
    /* Each county's list already holds its own records once, and a record belongs to one
       county, so these are taken in order. They are deliberately NOT deduplicated by their
       text: two separate records can read identically, and collapsing them would repeat the
       record-id fault rather than count what is there. */
    chronoRows(window.cmData(c)).forEach(x=>extra.push({n:x[0]||0,y:x[0]||'n.d.',q:x[1],html:x[2],cty:c}))});
  const all=rows.map(r=>({n:r.n,q:r.q,row:tr(r)}))
    .concat(extra.map(e=>({n:e.n,q:e.q,
      row:`<tr><td class="y">${e.y}</td><td class="t">${tbg(e.q)}</td><td colspan="2">${e.html}</td><td>${MUN_CTY[e.cty]}<span class="bs">county only</span></td></tr>`})));
  all.sort((p,q)=>{const a=p.n||0,b=q.n||0;
    if(!a!==!b)return a?-1:1;              /* undated always last, both directions */
    return allSort==='new'?b-a:a-b});
  box.innerHTML=all.length
    ? th+all.map(x=>x.row).join('')+'</tbody></table>'
    : '<p class="why2">No record in the years and record types chosen in Filters.</p>';
  if(cnt)cnt.textContent=all.length+' '+(all.length===1?'record':'records');
}
document.addEventListener('click',e=>{const b=e.target.closest('#allbar .sortseg button');if(!b)return;
  allSort=b.dataset.s;document.querySelectorAll('#allbar .sortseg button').forEach(x=>x.setAttribute('aria-pressed',x.dataset.s===allSort));
  buildAllList()});

const _allY=all;all=function(){_allY();buildYearList();buildAllList()};
setOrd('year');
all();

/* ---- Records keyword search: hides rows that do not contain the words typed (display only) ---- */
(function(){const q=document.getElementById('rsq'),x=document.getElementById('rsx'),n=document.getElementById('rsn'),box=document.getElementById('rsrch');if(!q)return;
  const panels=()=>[...document.querySelectorAll('#records .tp')].filter(p=>p.id!=='p-idx');
  function place(){/* keep the box in the bar that is showing: beside "Order records" in either mode */
    const yr=document.querySelector('#p-year .yrbar'),top=document.getElementById('ordtop');const tgt=ordMode==='year'?yr:top;if(tgt&&box.parentNode!==tgt)tgt.insertBefore(box,tgt.firstChild)}
  let busy=false;
  function run(){if(busy)return;busy=true;try{place();
    const idx=document.getElementById('p-idx');box.hidden=!!(idx&&!idx.hidden);/* the Index of individuals has its own Find a name box */
    const words=q.value.toLowerCase().split(/[\s,;:()"“”]+/).map(w=>w.replace(/^[.'’]+|[.'’]+$/g,'')).filter(Boolean);x.hidden=!words.length;
    const hit=t=>{t=t.toLowerCase();return words.every(w=>t.includes(w))};const af=window.__asFilter?window.__asFilter():null,act=words.length||af;
    let shown=0,total=0;
    panels().forEach(p=>{
      p.querySelectorAll('tbody tr, ul.notes > li, ul.chrono > li, .twr').forEach(r=>{const ok=(!words.length||hit(r.textContent))&&(!af||af(r));r.classList.toggle('rs-off',!ok);if(!p.hidden){total++;if(ok)shown++}});
      p.querySelectorAll('details').forEach(d=>{if(!act){d.classList.remove('rs-off');if(d.dataset.rsOpen){d.open=false;delete d.dataset.rsOpen}return}
        const rows=d.querySelectorAll('tbody tr, ul.notes > li, ul.chrono > li, .twr');if(!rows.length){d.classList.toggle('rs-off',!hit(d.querySelector('summary')?d.querySelector('summary').textContent:''));return}
        const any=[...rows].some(r=>!r.classList.contains('rs-off'));d.classList.toggle('rs-off',!any);if(any&&!d.open){d.open=true;d.dataset.rsOpen='1'}});
      p.querySelectorAll('table.twt').forEach(t=>{const rs=t.querySelectorAll('tbody tr');if(rs.length)t.classList.toggle('rs-off',act&&![...rs].some(r=>!r.classList.contains('rs-off')))})});
    /* Hide a heading when nothing beneath it matches. Walks every level of the Records tab's
       hierarchy - state (h3.stsec), county (h3.sub) and section (h4.gsec) - and looks at the
       rows inside the whole run beneath each heading, wrappers included, rather than only at
       its immediate siblings. */
    const ROWSEL='tbody tr, ul.notes > li, ul.chrono > li, .twr';
    const LV={'H3:stsec':1,'H3:sub':2,'H4:gsec':3};
    const lvlOf=e=>{if(e.tagName==='H3'&&e.classList.contains('stsec'))return 1;
      if(e.tagName==='H3'&&e.classList.contains('sub'))return 2;
      if(e.tagName==='H4'&&e.classList.contains('gsec'))return 3;return 0};
    panels().forEach(p=>{
      const heads=[...p.querySelectorAll('h3.stsec, h3.sub, h4.gsec')];
      if(!act){heads.forEach(h=>h.classList.remove('rs-off'));return}
      heads.forEach(h=>{const lv=lvlOf(h);let e=h.nextElementSibling,has=false,any=false;
        while(e){const el=lvlOf(e);if(el&&el<=lv)break;
          const rows=e.matches(ROWSEL)?[e]:[...e.querySelectorAll(ROWSEL)];
          if(rows.length){has=true;if(rows.some(r=>!r.classList.contains('rs-off')))any=true}
          e=e.nextElementSibling}
        h.classList.toggle('rs-off',has&&!any)})});
    /* A plain message when a search matches nothing at all, so the tab is never just headings. */
    panels().forEach(p=>{if(p.hidden)return;
      let m=p.querySelector('p.rsnone');
      if(!m){m=document.createElement('p');m.className='rsnone';m.textContent='No matching records found.';p.appendChild(m)}
      const none=act&&![...p.querySelectorAll(ROWSEL)].some(r=>!r.classList.contains('rs-off'));
      m.hidden=!none});
    n.textContent=!act||box.hidden?'':total?shown+' of '+total+' rows match':'no rows to search here'}finally{busy=false}}
  window.rsRun=run;
  let tm=0;q.addEventListener('input',()=>{clearTimeout(tm);tm=setTimeout(run,150)});
  q.addEventListener('keydown',e=>{if(e.key==='Escape'&&q.value){e.stopPropagation();q.value='';run()}});
  x.onclick=()=>{q.value='';run();q.focus()};
  /* re-apply after the lists are rebuilt (filters, year slider, ordering) */
  let mt=0;new MutationObserver(()=>{if(busy)return;clearTimeout(mt);mt=setTimeout(run,60)}).observe(document.getElementById('records'),{childList:true,subtree:true});
  document.addEventListener('click',e=>{if(e.target.closest('.ordseg button, #records .tabs button, a[data-tab], #idxback'))setTimeout(run,0)});
  run()})();

/* ---- Research management, Phase 1: Admin / Research Mode, record assignment, profiles, family groups, saving ---- */
const RESEARCH_SEED=null; /* paste the "JS Data Snippet" here to ship saved research with the page */
const RS=(()=>{
  const KEY='kentmap-research-v1';
  let curSet=null,selKey='',hiMap=null,hiFound=0,lastG=null,bypass=false,db={version:1,profiles:[],familyGroups:[]},storeOK=true,adm=false,filt='all',sel=new Map(),mg={tab:'profiles',edit:null,draft:null};
  const $=id=>document.getElementById(id);
  const esc=t=>String(t==null?'':t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const uid=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
  const S=(v,n)=>String(v==null?'':v).slice(0,n||2000);
  const CF=v=>v==='Proven'?'Proven':'Probable';
  const list=v=>Array.isArray(v)?v.map(x=>S(x,200)).filter(Boolean):String(v||'').split(/[,;\n]/).map(x=>x.trim()).filter(Boolean);
  function clean(d){if(!d||typeof d!=='object'||(!Array.isArray(d.profiles)&&!Array.isArray(d.familyGroups)))throw new Error('This is not a Research JSON file (no profiles or familyGroups).');
    const seen=new Set();
    const profiles=(d.profiles||[]).filter(p=>p&&typeof p==='object').map(p=>{let id=S(p.id,60)||uid('p_');while(seen.has(id))id=uid('p_');seen.add(id);
      return {id,fullName:S(p.fullName,200),spellingVariants:list(p.spellingVariants),birthDeathDates:S(p.birthDeathDates,200),locations:list(p.locations),bioSummary:S(p.bioSummary,4000),
        assignedRecords:(Array.isArray(p.assignedRecords)?p.assignedRecords:[]).filter(a=>a&&a.recordId).map(a=>({recordId:S(a.recordId,60),confidence:CF(a.confidence),explanation:S(a.explanation,600),ref:{y:S(a.ref&&a.ref.y,60),t:S(a.ref&&a.ref.t,60),c:S(a.ref&&a.ref.c,300),d:S(a.ref&&a.ref.d,400),p:S(a.ref&&a.ref.p,200),mk:list(a.ref&&a.ref.mk).slice(0,12)}}))}});
    const gs=new Set();
    const familyGroups=(d.familyGroups||[]).filter(g=>g&&typeof g==='object').map(g=>{let id=S(g.id,60)||uid('fg_');while(gs.has(id))id=uid('fg_');gs.add(id);
      return {id,title:S(g.title,200),dates:S(g.dates,200),locations:list(g.locations),summary:S(g.summary,4000),
        members:(Array.isArray(g.members)?g.members:[]).filter(m=>m&&typeof m==='object').map(m=>({profileId:S(m.profileId,60),name:S(m.name,200),relationship:S(m.relationship,300),confidence:CF(m.confidence),citation:S(m.citation,600)}))}});
    return {version:1,profiles,familyGroups}}
  /* ourfamilytree.net: research comes from the server (RESEARCH in data.js); the site has no editing */
  function load(){try{db=clean(RESEARCH)}catch(e){}}
  function save(){db.savedAt=new Date().toISOString();try{localStorage.setItem(KEY,JSON.stringify(db));storeOK=true}catch(e){storeOK=false}status();refresh()}
  const nAssign=()=>{const s=new Set();db.profiles.forEach(p=>p.assignedRecords.forEach(a=>s.add(a.recordId)));return s.size};
  function status(msg){const el=$('rsstat');if(!el)return;el.textContent=(msg?msg+' · ':'')+db.profiles.length+' profile'+(db.profiles.length===1?'':'s')+' · '+db.familyGroups.length+' family group'+(db.familyGroups.length===1?'':'s')+' · '+nAssign()+' assigned record'+(nAssign()===1?'':'s');
    const w=$('rswarn');if(w)w.hidden=storeOK}
  const assignedOf=rid=>{const o=[];db.profiles.forEach(p=>p.assignedRecords.forEach(a=>{if(a.recordId===rid)o.push({p,a})}));return o};
  /* ----- record rows ----- */
  /* each row carries its record id (data-rid, from sids()) */
  const rowInfo=tr=>tr.dataset.rid?{id:tr.dataset.rid}:null;
  function decorate(){document.querySelectorAll('#p-year tbody tr').forEach(tr=>{tr.querySelectorAll('.rsw,.asl').forEach(n=>n.remove());tr.classList.remove('rs-sel');
    const info=rowInfo(tr);if(!info)return;if(!adm)return;
    const w=document.createElement('label');w.className='rsw';w.innerHTML='<input type="checkbox" class="rsel" aria-label="Select this record for assignment">';w.firstChild.checked=sel.has(info.id);tr.children[0].insertBefore(w,tr.children[0].firstChild);
    tr.classList.toggle('rs-sel',sel.has(info.id));
    const as=assignedOf(info.id);if(as.length){const d=document.createElement('div');d.className='asl';d.textContent='Assigned: '+as.map(x=>(x.p.fullName||'(unnamed)')+' ('+x.a.confidence+')').join('; ');tr.children[Math.min(3,tr.children.length-1)].appendChild(d)}})}
  window.__asFilter=()=>{const a=adm&&filt!=='all'?(r=>{const id=r.dataset&&r.dataset.rid;if(!id)return true;const x=assignedOf(id).length>0;return filt==='assigned'?x:!x}):null,q=curSet?(r=>{const id=r.dataset&&r.dataset.rid;return !id||curSet.has(id)}):null;return a||q?(r=>(!a||a(r))&&(!q||q(r))):null};
  const rerun=()=>{if(window.rsRun)window.rsRun()};
  /* ----- admin mode ----- */
  function setAdm(on){adm=on;$('rsadm').setAttribute('aria-pressed',on);$('rsadm').textContent=on?'Admin / Research Mode: On':'Admin / Research Mode';$('rstools').hidden=!on;
    if(!on){sel.clear();filt='all';document.querySelectorAll('#rspills button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.f==='all'))}
    if(on&&typeof ordMode!=='undefined'&&ordMode!=='year')setOrd('year');else buildYearList();
    updBar();rerun()}
  /* ----- assignment bar ----- */
  function proSel(){const cur=$('aspro').value;$('aspro').innerHTML='<option value="">Choose a profile…</option>'+db.profiles.map(p=>`<option value="${esc(p.id)}">${esc(p.fullName||'(unnamed)')}</option>`).join('')+'<option value="__new">＋ Create a new profile…</option>';if([...$('aspro').options].some(o=>o.value===cur))$('aspro').value=cur;$('asnew').hidden=$('aspro').value!=='__new'}
  function updBar(){const bar=$('asbar');const n=sel.size;bar.hidden=!(adm&&n);if(!adm||!n){document.body.classList.remove('hasbar');return}
    document.body.classList.add('hasbar');setTimeout(fitBar,0);$('asn').textContent=n+' record'+(n===1?'':'s')+' selected';proSel();
    $('aspanel').innerHTML=[...sel.entries()].map(([id,s])=>`<div class="asrow" data-rid="${id}"><div class="asm"><b>${esc(s.y)}</b> ${esc(s.t)} &middot; ${esc((s.c+' '+s.d).slice(0,170))}${(s.c+s.d).length>170?'…':''}</div><select class="ascf" aria-label="Confidence for this record"><option${s.cf==='Probable'?' selected':''}>Probable</option><option${s.cf==='Proven'?' selected':''}>Proven</option></select><input class="asex" maxlength="300" placeholder="One-sentence explanation (required)" value="${esc(s.ex||'')}"></div>`).join('')}
  const fitBar=()=>{const b=$('asbar');if(b&&!b.hidden)document.body.style.setProperty('--asbh',(b.offsetHeight+16)+'px')};
  function assignGo(){const err=$('aserr');err.textContent='';let pid=$('aspro').value,p=null;
    if(!pid){err.textContent='Choose a profile, or choose “Create a new profile…”.';return}
    if(pid==='__new'){const nm=$('asnew').value.trim();if(!nm){err.textContent='Type the new profile’s full name.';$('asnew').focus();return}}
    const miss=[...sel.entries()].find(([id,s])=>!(s.ex||'').trim());if(miss){err.textContent='Each record needs a one-sentence explanation.';const r=document.querySelector(`#aspanel .asrow[data-rid="${miss[0]}"] .asex`);if(r)r.focus();return}
    if(pid==='__new'){p={id:uid('p_'),fullName:$('asnew').value.trim(),spellingVariants:[],birthDeathDates:'',locations:[],bioSummary:'',assignedRecords:[]};db.profiles.push(p);$('asnew').value=''}
    else p=db.profiles.find(x=>x.id===pid);if(!p){err.textContent='That profile no longer exists.';return}
    sel.forEach((s,id)=>{const rec={recordId:id,confidence:CF(s.cf),explanation:S(s.ex.trim(),600),ref:{y:S(s.y,60),t:S(s.t,60),c:S(s.c,300),d:S(s.d,400),p:S(s.p,200),mk:(s.mk||[]).slice(0,12).map(x=>S(x,40))}};const i=p.assignedRecords.findIndex(a=>a.recordId===id);if(i>=0)p.assignedRecords[i]=rec;else p.assignedRecords.push(rec)});
    const n=sel.size;sel.clear();save();status('Assigned '+n+' to '+(p.fullName||'profile'));decorate();updBar();rerun()}
  /* ----- dialogs ----- */
  const M=()=>$('rsm');
  function dlg(html,wide){const m=M();m.querySelector('.rsmin').classList.toggle('wide',!!wide);m.querySelector('.rsmc').innerHTML=html;m.hidden=false}
  function closeDlg(){M().hidden=true;M().querySelector('.rsmc').innerHTML=''}
  function confirmBox(msg,ok){return new Promise(res=>{const c=$('rsc');c.querySelector('.rscm').textContent=msg;c.querySelector('.rsok').textContent=ok||'Delete';c.hidden=false;const done=v=>{c.hidden=true;c.querySelector('.rsok').onclick=c.querySelector('.rsno').onclick=null;res(v)};c.querySelector('.rsok').onclick=()=>done(true);c.querySelector('.rsno').onclick=()=>done(false)})}
  const prn=p=>esc(p.fullName||'(unnamed)');
  /* manager */
  function mgTabs(){return `<div class="rstabs" role="tablist"><button type="button" class="chip" data-mg="tab:profiles" aria-pressed="${mg.tab==='profiles'}">Individual Profiles (${db.profiles.length})</button><button type="button" class="chip" data-mg="tab:groups" aria-pressed="${mg.tab==='groups'}">Family Groups (${db.familyGroups.length})</button></div>`}
  function mgRender(){let h='<div class="rsmh"><h3>Profiles &amp; Family Groups</h3><button type="button" class="chip" data-mg="close">Close</button></div>'+mgTabs();
    if(mg.edit)h+=mg.tab==='profiles'?profForm():grpForm();else h+=mg.tab==='profiles'?profList():grpList();dlg(h,true)}
  function profList(){return `<p class="zhint">Profiles are research conclusions you create. Assigning a record never changes the record itself.</p><p><button type="button" class="chip prim" data-mg="newp">＋ New profile</button></p>`+(db.profiles.length?`<ul class="rslist">${db.profiles.map(p=>`<li><b>${prn(p)}</b> <span class="im">${esc(p.birthDeathDates)}${p.birthDeathDates&&p.locations.length?' · ':''}${esc(p.locations.join(', '))} · ${p.assignedRecords.length} record${p.assignedRecords.length===1?'':'s'}</span> <button type="button" class="chip" data-mg="editp:${esc(p.id)}">Edit</button></li>`).join('')}</ul>`:'<p class="zhint">No profiles yet. Create one here, or from the “Assign Selected Records” bar in Admin mode.</p>')}
  function profForm(){const d=mg.draft,p=d;const grp=db.familyGroups.filter(g=>g.members.some(m=>m.profileId===p.id));
    const recs=p.assignedRecords.map((a,i)=>`<div class="asrow mgrec" data-i="${i}"><div class="asm"><b>${esc(a.ref.y)}</b> ${esc(a.ref.t)} &middot; ${esc((a.ref.c+' '+a.ref.d).slice(0,200))}</div><select class="ascf"><option${a.confidence==='Probable'?' selected':''}>Probable</option><option${a.confidence==='Proven'?' selected':''}>Proven</option></select><input class="asex" maxlength="300" value="${esc(a.explanation)}" placeholder="Explanation"><div class="rsrr"><select class="rsre" aria-label="Reassign this record to another profile"><option value="">Reassign to…</option>${db.profiles.filter(x=>x.id!==p.id).map(x=>`<option value="${esc(x.id)}">${prn(x)}</option>`).join('')}</select><button type="button" class="chip" data-mg="reas:${i}">Reassign</button><button type="button" class="chip" data-mg="unas:${i}">Unassign</button></div></div>`).join('');
    return `<h4>${mg.edit==='new'?'New profile':'Edit profile'}</h4><div class="rsform"><label>Full name<input id="pf-name" value="${esc(p.fullName)}"></label><label>Spelling variants (comma-separated)<input id="pf-var" value="${esc(p.spellingVariants.join(', '))}"></label><label>Birth / death dates<input id="pf-dates" value="${esc(p.birthDeathDates)}" placeholder="e.g. b. c1757; d. c1833"></label><label>Locations (comma-separated)<input id="pf-loc" value="${esc(p.locations.join(', '))}"></label><label>Biographical summary<textarea id="pf-bio" rows="4">${esc(p.bioSummary)}</textarea></label></div>
    <h4>Assigned records (${p.assignedRecords.length})</h4>${recs||'<p class="zhint">No records assigned. Use Admin mode on the Records tab to assign some.</p>'}
    ${grp.length?`<p class="zhint">In family groups: ${grp.map(g=>esc(g.title||'(untitled)')).join('; ')}</p>`:''}<p id="rserr" class="aserr"></p><p class="rsact"><button type="button" class="chip prim" data-mg="savep">Save profile</button><button type="button" class="chip" data-mg="cancel">Cancel</button>${mg.edit!=='new'?'<button type="button" class="chip dng" data-mg="delp">Delete profile…</button>':''}</p>`}
  function readProf(){const d=mg.draft;if(!$('pf-name'))return;d.fullName=$('pf-name').value.trim();d.spellingVariants=list($('pf-var').value);d.birthDeathDates=$('pf-dates').value.trim();d.locations=list($('pf-loc').value);d.bioSummary=$('pf-bio').value.trim();
    document.querySelectorAll('.mgrec').forEach(r=>{const a=d.assignedRecords[+r.dataset.i];if(a){a.confidence=CF(r.querySelector('.ascf').value);a.explanation=r.querySelector('.asex').value.trim()}})}
  function grpList(){return `<p class="zhint">Family groups hold the relationships you document. Nothing is inferred from names or dates, and one person may be in several groups (for example family of origin and marital family).</p><p><button type="button" class="chip prim" data-mg="newg">＋ New family group</button></p>`+(db.familyGroups.length?`<ul class="rslist">${db.familyGroups.map(g=>`<li><b>${esc(g.title||'(untitled)')}</b> <span class="im">${esc(g.dates)}${g.dates&&g.locations.length?' · ':''}${esc(g.locations.join(', '))} · ${g.members.length} member${g.members.length===1?'':'s'}</span> <button type="button" class="chip" data-mg="editg:${esc(g.id)}">Edit</button></li>`).join('')}</ul>`:'<p class="zhint">No family groups yet.</p>')}
  function memRow(m,i){return `<div class="asrow mgmem" data-i="${i}"><div class="rsrr"><select class="mpro" aria-label="Person"><option value="">Not a profile (type a name)</option>${db.profiles.map(p=>`<option value="${esc(p.id)}"${p.id===m.profileId?' selected':''}>${prn(p)}</option>`).join('')}</select><input class="mnm" placeholder="Name (if not a profile)" value="${esc(m.name)}"></div><div class="rsrr"><input class="mrel" placeholder="Documented relationship (e.g. husband of, son of)" value="${esc(m.relationship)}"><select class="ascf mcf"><option${m.confidence==='Probable'?' selected':''}>Probable</option><option${m.confidence==='Proven'?' selected':''}>Proven</option></select></div><input class="mcit asex" placeholder="Supporting citation (required)" value="${esc(m.citation)}"><div class="rsrr"><button type="button" class="chip" data-mg="delm:${i}">Remove member</button></div></div>`}
  function grpForm(){const g=mg.draft;return `<h4>${mg.edit==='new'?'New family group':'Edit family group'}</h4><div class="rsform"><label>Title<input id="gf-title" value="${esc(g.title)}" placeholder="e.g. Family of origin of …"></label><label>Dates<input id="gf-dates" value="${esc(g.dates)}"></label><label>Locations (comma-separated)<input id="gf-loc" value="${esc(g.locations.join(', '))}"></label><label>Summary<textarea id="gf-sum" rows="3">${esc(g.summary)}</textarea></label></div><h4>Members (${g.members.length})</h4><p class="zhint">Enter only relationships a record documents. Confidence applies to the relationship.</p>${g.members.map(memRow).join('')}<p><button type="button" class="chip" data-mg="addm">＋ Add member</button></p><p id="rserr" class="aserr"></p><p class="rsact"><button type="button" class="chip prim" data-mg="saveg">Save family group</button><button type="button" class="chip" data-mg="cancel">Cancel</button>${mg.edit!=='new'?'<button type="button" class="chip dng" data-mg="delg">Delete family group…</button>':''}</p>`}
  function readGrp(){const g=mg.draft;if(!$('gf-title'))return;g.title=$('gf-title').value.trim();g.dates=$('gf-dates').value.trim();g.locations=list($('gf-loc').value);g.summary=$('gf-sum').value.trim();
    document.querySelectorAll('.mgmem').forEach(r=>{const m=g.members[+r.dataset.i];if(!m)return;m.profileId=r.querySelector('.mpro').value;m.name=r.querySelector('.mnm').value.trim();m.relationship=r.querySelector('.mrel').value.trim();m.confidence=CF(r.querySelector('.mcf').value);m.citation=r.querySelector('.mcit').value.trim()})}
  const clone=o=>JSON.parse(JSON.stringify(o));
  async function mgAct(a){const t=mg.tab;
    if(a==='close'){closeDlg();decorate();return}
    if(a.startsWith('tab:')){mg.tab=a.slice(4);mg.edit=null;mgRender();return}
    if(a==='cancel'){mg.edit=null;mg.draft=null;mgRender();return}
    if(a==='newp'){mg.edit='new';mg.draft={id:uid('p_'),fullName:'',spellingVariants:[],birthDeathDates:'',locations:[],bioSummary:'',assignedRecords:[]};mgRender();return}
    if(a.startsWith('editp:')){const p=db.profiles.find(x=>x.id===a.slice(6));if(p){mg.edit=p.id;mg.draft=clone(p);mgRender()}return}
    if(a==='savep'){readProf();const d=mg.draft;if(!d.fullName){$('rserr').textContent='A profile needs a full name.';return}
      if(d.assignedRecords.some(r=>!r.explanation)){$('rserr').textContent='Every assigned record needs an explanation.';return}
      const i=db.profiles.findIndex(x=>x.id===d.id);if(i>=0)db.profiles[i]=d;else db.profiles.push(d);save();mg.edit=null;mg.draft=null;mgRender();return}
    if(a==='delp'){readProf();const d=mg.draft,n=db.familyGroups.filter(g=>g.members.some(m=>m.profileId===d.id)).length;
      if(await confirmBox('Delete the profile “'+(d.fullName||'unnamed')+'”? Its '+d.assignedRecords.length+' record assignment(s) will be removed'+(n?' and it will be unlinked from '+n+' family group(s) (names kept)':'')+'. The original records are not changed.','Delete profile')){
        db.familyGroups.forEach(g=>g.members.forEach(m=>{if(m.profileId===d.id){m.profileId='';if(!m.name)m.name=d.fullName}}));db.profiles=db.profiles.filter(x=>x.id!==d.id);save();mg.edit=null;mg.draft=null;mgRender()}return}
    if(a.startsWith('unas:')){readProf();mg.draft.assignedRecords.splice(+a.slice(5),1);mgRender();return}
    if(a.startsWith('reas:')){readProf();const i=+a.slice(5),row=document.querySelector(`.mgrec[data-i="${i}"] .rsre`),to=row&&row.value;if(!to){$('rserr').textContent='Choose the profile to reassign to.';return}
      const q=db.profiles.find(x=>x.id===to),rec=mg.draft.assignedRecords[i];if(!q||!rec)return;
      const j=q.assignedRecords.findIndex(x=>x.recordId===rec.recordId);if(j>=0)q.assignedRecords[j]=rec;else q.assignedRecords.push(rec);
      mg.draft.assignedRecords.splice(i,1);const k=db.profiles.findIndex(x=>x.id===mg.draft.id);if(k>=0)db.profiles[k]=mg.draft;save();status('Reassigned to '+(q.fullName||'profile'));mgRender();return}
    if(a==='newg'){mg.edit='new';mg.draft={id:uid('fg_'),title:'',dates:'',locations:[],summary:'',members:[]};mgRender();return}
    if(a.startsWith('editg:')){const g=db.familyGroups.find(x=>x.id===a.slice(6));if(g){mg.edit=g.id;mg.draft=clone(g);mgRender()}return}
    if(a==='addm'){readGrp();mg.draft.members.push({profileId:'',name:'',relationship:'',confidence:'Probable',citation:''});mgRender();return}
    if(a.startsWith('delm:')){readGrp();mg.draft.members.splice(+a.slice(5),1);mgRender();return}
    if(a==='saveg'){readGrp();const g=mg.draft;if(!g.title){$('rserr').textContent='A family group needs a title.';return}
      const bad=g.members.findIndex(m=>!(m.profileId||m.name)||!m.relationship||!m.citation);if(bad>=0){$('rserr').textContent='Member '+(bad+1)+': give a person, the documented relationship, and a supporting citation.';return}
      g.members.forEach(m=>{if(m.profileId&&!m.name){const p=db.profiles.find(x=>x.id===m.profileId);if(p)m.name=p.fullName}});
      const i=db.familyGroups.findIndex(x=>x.id===g.id);if(i>=0)db.familyGroups[i]=g;else db.familyGroups.push(g);save();mg.edit=null;mg.draft=null;mgRender();return}
    if(a==='delg'){readGrp();const g=mg.draft;if(await confirmBox('Delete the family group “'+(g.title||'untitled')+'”? Profiles and records are not changed.','Delete family group')){db.familyGroups=db.familyGroups.filter(x=>x.id!==g.id);save();mg.edit=null;mg.draft=null;mgRender()}return}}
  /* ----- export / import / snippet ----- */
  const exportObj=()=>({version:1,exportedAt:new Date().toISOString(),profiles:db.profiles,familyGroups:db.familyGroups});
  function dataDlg(title,note,text,fname,mime){dlg(`<div class="rsmh"><h3>${esc(title)}</h3><button type="button" class="chip" data-mg="close">Close</button></div><p class="zhint">${note}</p><textarea id="rsdata" class="rsdata" rows="12" readonly>${esc(text)}</textarea><p class="rsact"><button type="button" class="chip prim" id="rscopy">Copy to clipboard</button><span id="rscs" class="im"></span></p>`);
    $('rscopy').onclick=async()=>{const ta=$('rsdata');ta.select();let ok=false;try{await navigator.clipboard.writeText(text);ok=true}catch(e){try{ok=document.execCommand('copy')}catch(e2){}}$('rscs').textContent=ok?'Copied.':'Copy was blocked here: the text is selected, press Ctrl/Cmd+C.'};}
  const stamp=()=>new Date().toISOString().slice(0,10);
  function doExport(){dataDlg('Export Research JSON','Saves every profile, family group and record assignment. Copy this text into a .json file (Notepad, TextEdit) as your backup: browser storage can be lost when the page is republished.',JSON.stringify(exportObj(),null,2),'kent-research-'+stamp()+'.json','application/json')}
  function doSnippet(){const js='/* Paste this over the line  const RESEARCH_SEED=null;  in the artifact source (or ask Claude to). It loads only when this browser has no saved research. */\nconst RESEARCH_SEED = '+JSON.stringify(exportObj(),null,2)+';\n';dataDlg('Copy JS Data Snippet','Pasting this into the page source makes the research ship with the page, so it survives republishing. A browser that already has saved research keeps its own copy.',js,'research-seed-'+stamp()+'.js','text/javascript')}
  function doImport(){dlg(`<div class="rsmh"><h3>Import Research JSON</h3><button type="button" class="chip" data-mg="close">Close</button></div><p class="zhint">Choose a file exported earlier, or paste its text. Records are never changed; only profiles, family groups and assignments are read.</p><p><input type="file" id="rsfile" accept=".json,application/json"></p><textarea id="rsin" class="rsdata" rows="9" placeholder="…or paste the JSON here"></textarea><p class="rsact"><label><input type="radio" name="rsmode" value="merge" checked> Merge (add new items, keep mine when an id matches)</label> <label><input type="radio" name="rsmode" value="replace"> Replace everything</label></p><p id="rserr" class="aserr"></p><p class="rsact"><button type="button" class="chip prim" id="rsgo">Import</button></p>`);
    $('rsfile').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{$('rsin').value=String(r.result||'')};r.readAsText(f)};
    $('rsgo').onclick=async()=>{let inc;try{inc=clean(JSON.parse($('rsin').value))}catch(e){$('rserr').textContent='Could not import: '+(e.message||'invalid JSON')+'.';return}
      const mode=document.querySelector('input[name=rsmode]:checked').value;
      if(mode==='replace'){if(!await confirmBox('Replace all current research ('+db.profiles.length+' profiles, '+db.familyGroups.length+' family groups) with '+inc.profiles.length+' profiles and '+inc.familyGroups.length+' family groups from the file?','Replace')) return;db={version:1,profiles:inc.profiles,familyGroups:inc.familyGroups}}
      else{const pi=new Set(db.profiles.map(p=>p.id)),gi=new Set(db.familyGroups.map(g=>g.id));inc.profiles.forEach(p=>{if(!pi.has(p.id))db.profiles.push(p)});inc.familyGroups.forEach(g=>{if(!gi.has(g.id))db.familyGroups.push(g)})}
      save();closeDlg();decorate();updBar();rerun();status('Imported')}}
  /* ----- Phase 2: selector, summary card, index sections ----- */
  const normP=t=>String(t||'').toLowerCase().replace(/\(.*?\)/g,'').replace(/[.,]/g,'').replace(/\s*(twp|township|tract)\s*$/,'').trim();
  function keysFor(profs){const idx=new Map(),m=new Map();Object.keys(TF).forEach(k=>{const n=normP(TF[k].n);if(n&&!idx.has(n))idx.set(n,k)});
    const add=t=>{const k=idx.get(normP(t));if(k&&!m.has(k))m.set(k,TF[k].n)};
    profs.forEach(p=>{p.assignedRecords.forEach(a=>add(a.ref&&a.ref.p));p.locations.forEach(add)});return [...m]}
  const profOf=key=>{if(!key)return[];if(key.startsWith('p:')){const p=db.profiles.find(x=>x.id===key.slice(2));return p?[p]:[]}
    const g=db.familyGroups.find(x=>x.id===key.slice(2));return g?g.members.map(m=>db.profiles.find(p=>p.id===m.profileId)).filter(Boolean):[]};
  const exists=key=>key.startsWith('p:')?db.profiles.some(x=>x.id===key.slice(2)):db.familyGroups.some(x=>x.id===key.slice(2));
  const recSet=key=>{const s=new Set();profOf(key).forEach(p=>p.assignedRecords.forEach(a=>s.add(a.recordId)));return s};
  const bdg=c=>`<span class="cfb ${c==='Proven'?'pv':'pb'}">${esc(c)}</span>`;
  const mapBtns=(keys,sk)=>`<button type="button" class="chip rsmap" data-sm="${esc(sk)}">Show on Map</button>`;
  const recLi=a=>`<li class="rsli"><b>${esc(a.ref.y)}</b> ${esc(a.ref.t)} &middot; ${esc((a.ref.c||'').slice(0,120))} ${bdg(a.confidence)} <span class="ex">${esc(a.explanation)}</span></li>`;
  const groupsOf=p=>db.familyGroups.filter(g=>g.members.some(m=>m.profileId===p.id));
  const uniqRecs=profs=>{const m=new Map();profs.forEach(p=>p.assignedRecords.forEach(a=>{const o=m.get(a.recordId);if(!o||(a.confidence==='Proven'&&o.confidence!=='Proven'))m.set(a.recordId,a)}));return [...m.values()]};
  function buildSel(){const q=$('rsselq').value.trim().toLowerCase();
    const gs=db.familyGroups.filter(g=>!q||('g:'+g.id)===selKey||(g.title+' '+g.members.map(m=>m.name).join(' ')).toLowerCase().includes(q));
    const ps=db.profiles.filter(p=>!q||('p:'+p.id)===selKey||(p.fullName+' '+p.spellingVariants.join(' ')).toLowerCase().includes(q));
    let h='<option value="">All Records</option>';
    if(gs.length)h+='<optgroup label="Family Groups">'+gs.map(g=>`<option value="g:${esc(g.id)}">${esc(g.title||'(untitled)')}</option>`).join('')+'</optgroup>';
    if(ps.length)h+='<optgroup label="Identified Individuals">'+ps.map(p=>`<option value="p:${esc(p.id)}">${esc(p.fullName||'(unnamed)')}</option>`).join('')+'</optgroup>';
    if(!db.profiles.length&&!db.familyGroups.length)h+='<option value="" disabled>(none published yet)</option>';
    else if(q&&!gs.length&&!ps.length)h+='<option value="" disabled>(no match)</option>';
    $('rssel').innerHTML=h;$('rssel').value=selKey&&[...$('rssel').options].some(o=>o.value===selKey)?selKey:''}
  function card(){const el=$('rscard');if(!selKey||!exists(selKey)){el.hidden=true;el.innerHTML='';return}
    const isG=selKey[0]==='g',profs=profOf(selKey);let title,kind,dates,locs,sum,mem='';
    if(isG){const g=db.familyGroups.find(x=>x.id===selKey.slice(2));title=g.title;kind='Family group';dates=g.dates;locs=g.locations;sum=g.summary;
      mem=`<p><b>Members:</b> ${g.members.map(m=>esc(m.name||'?')+(m.relationship?' ('+esc(m.relationship)+')':'')).join('; ')||'none yet'}</p>`}
    else{const p=profs[0];title=p.fullName;kind='Individual';dates=p.birthDeathDates;locs=p.locations;sum=p.bioSummary}
    const recs=uniqRecs(profs),pv=recs.filter(a=>a.confidence==='Proven').length,here=new Set();
    document.querySelectorAll('#p-year tr[data-rid]').forEach(r=>{if(curSet&&curSet.has(r.dataset.rid))here.add(r.dataset.rid)});
    el.hidden=false;el.innerHTML=`<h4>${esc(title||'(unnamed)')} <span class="im">${kind}</span></h4><p><b>Dates:</b> ${esc(dates)||'—'} &middot; <b>Locations:</b> ${esc(locs.join(', '))||'—'}</p>${sum?`<p>${esc(sum)}</p>`:''}${mem}
      <p><b>Linked records:</b> ${recs.length} (${pv} Proven, ${recs.length-pv} Probable). The records list below shows only these${recs.length?'; '+here.size+' of them fall inside the current Years, Counties and Record-types filters':''}.</p>
      ${recs.length?`<details><summary>List the linked records</summary><ul>${recs.map(recLi).join('')}</ul></details>`:''}
      <div class="rgf"><button type="button" class="chip prim" id="rsclr">Clear Selection</button><button type="button" class="chip" id="rsview">View Records</button><button type="button" class="chip rsmap" data-sm="${esc(selKey)}">Zoom to these locations</button></div>${mapNote()}`}
  function setSel(key,go,fit){selKey=key&&exists(key)?key:'';curSet=selKey?recSet(selKey):null;hiMap=selKey?locsFor(selKey):null;
    if(selKey&&typeof ordMode!=='undefined'&&ordMode!=='year')setOrd('year');
    buildSel();applyHi();card();rerun();
    setTimeout(()=>{if(!selKey)return;hiMap=locsFor(selKey);applyHi();card();if(fit!==false)fitHi()},350);
    if(go){showTab('year');const r=$('records');if(r)window.scrollTo({top:r.getBoundingClientRect().top+window.scrollY-70,behavior:'smooth'})}}
  function refresh(){if(selKey&&!exists(selKey)){selKey='';curSet=null;hiMap=null}else if(selKey){curSet=recSet(selKey);hiMap=locsFor(selKey)}buildSel();applyHi();card();renderIdxRes();if(curSet||selKey)rerun()}
  function renderIdxRes(){const fg=$('famgrp'),ig=$('indgrp');if(!fg||!ig)return;
    const open=new Set([...document.querySelectorAll('#famgrp details[open],#indgrp details[open]')].map(d=>d.dataset.k));
    fg.innerHTML=db.familyGroups.length?db.familyGroups.map(g=>{const profs=g.members.map(m=>db.profiles.find(p=>p.id===m.profileId)).filter(Boolean),n=uniqRecs(profs).length;
      return `<details class="rg" data-k="g:${esc(g.id)}"${open.has('g:'+g.id)?' open':''}><summary><span>${esc(g.title||'(untitled)')}</span> <span class="im">${esc(g.dates)}${g.dates?' &middot; ':''}${g.members.length} member${g.members.length===1?'':'s'} &middot; ${n} linked record${n===1?'':'s'}</span></summary><div class="rgb">${g.summary?`<p>${esc(g.summary)}</p>`:''}${g.locations.length?`<p class="zhint">Locations: ${esc(g.locations.join(', '))}</p>`:''}
        <ul>${g.members.map(m=>`<li><b>${esc(m.name||'?')}</b> ${m.relationship?'&mdash; '+esc(m.relationship):''} ${bdg(m.confidence)} <span class="ex">Citation: ${esc(m.citation)}</span></li>`).join('')}</ul>
        <div class="rgf"><button type="button" class="chip prim" data-ra="g:${esc(g.id)}">View Family Group</button>${mapBtns(0,'g:'+g.id)}</div></div></details>`}).join(''):'<p class="zhint">No published family groups yet.</p>';
    const q=($('indq').value||'').toLowerCase().replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim(),words=q?q.split(' '):[];
    const hay=p=>(p.fullName+' '+p.spellingVariants.join(' ')+' '+p.birthDeathDates+' '+p.locations.join(' ')+' '+p.bioSummary+' '+p.assignedRecords.map(a=>a.explanation+' '+a.ref.c).join(' ')).toLowerCase().replace(/[^a-z0-9\s]/g,' ');
    const shown=db.profiles.filter(p=>words.every(w=>hay(p).includes(w)));
    ig.innerHTML=shown.length?shown.map(p=>{const n=p.assignedRecords.length,pv=p.assignedRecords.filter(a=>a.confidence==='Proven').length,gs=groupsOf(p);
      return `<details class="rg" data-k="p:${esc(p.id)}"${open.has('p:'+p.id)?' open':''}><summary><span>${esc(p.fullName||'(unnamed)')}</span> <span class="im">${esc(p.birthDeathDates)}${p.birthDeathDates?' &middot; ':''}${n} linked record${n===1?'':'s'} (${pv} Proven, ${n-pv} Probable)</span></summary><div class="rgb">
        ${p.spellingVariants.length?`<p class="zhint">Also written: ${esc(p.spellingVariants.join(', '))}</p>`:''}${p.locations.length?`<p class="zhint">Locations: ${esc(p.locations.join(', '))}</p>`:''}${p.bioSummary?`<p>${esc(p.bioSummary)}</p>`:''}
        ${n?`<ul>${p.assignedRecords.map(recLi).join('')}</ul>`:'<p class="zhint">No records assigned yet.</p>'}
        <p class="zhint">Family groups: ${gs.length?gs.map(g=>esc(g.title||'(untitled)')).join('; '):'none'}</p>
        <div class="rgf"><button type="button" class="chip prim" data-ra="p:${esc(p.id)}">View Records</button>${mapBtns(0,'p:'+p.id)}</div></div></details>`}).join(''):(db.profiles.length?'<p class="zhint">No profile matches that search.</p>':'<p class="zhint">No published individual profiles yet.</p>');
    $('indn').textContent=words.length?shown.length+' of '+db.profiles.length:''}
  function wireP2(){
    $('rssel').onchange=()=>setSel($('rssel').value,false,true);
    wireMap();
    $('rsselq').oninput=buildSel;
    $('rscard').addEventListener('click',e=>{if(e.target.closest('#rsclr')){setSel('',false);return}if(e.target.closest('#rsview')){const r=$('records');if(r)window.scrollTo({top:r.getBoundingClientRect().top+window.scrollY-70,behavior:'smooth'});showTab('year');return}
      const m=e.target.closest('.rsmap');if(m)showOnMap(m.dataset.sm)});
    $('p-idx').addEventListener('click',e=>{const v=e.target.closest('[data-ra]');if(v){setSel(v.dataset.ra,true);return}const m=e.target.closest('.rsmap');if(m)showOnMap(m.dataset.sm)});
    $('indq').oninput=renderIdxRes}
  function goMap(k){if(typeof tfGo==='function')tfGo(k);const mp=$('map');if(mp)window.scrollTo({top:mp.getBoundingClientRect().top+window.scrollY-90,behavior:'smooth'})}
  /* ----- Phase 3: map highlighting, proof rings, filtered pop-up ----- */
  const NS='http://www.w3.org/2000/svg',mel=(n,a,p)=>{const e=document.createElementNS(NS,n);for(const k in a)e.setAttribute(k,a[k]);if(p)p.appendChild(e);return e};
  function mkKeys(a){if(a.ref.mk&&a.ref.mk.length)return a.ref.mk;
    const row=document.querySelector('#p-year tr[data-rid="'+a.recordId+'"]');if(row&&row.dataset.mk)return row.dataset.mk.split(',').filter(Boolean);
    const o=[],pm=/^Place ([A-Z])$/.exec(a.ref.c||'');if(pm)o.push('m:'+pm[1]);
    const n=normP(a.ref.p);if(n)Object.keys(TF).forEach(k=>{if(normP(TF[k].n)===n&&!o.includes('t:'+k))o.push('t:'+k)});return o}
  function locsFor(key){const m=new Map();uniqRecs(profOf(key)).forEach(a=>{mkKeys(a).forEach(k=>{if(k.startsWith('e:'))return;let o=m.get(k);if(!o){o={pv:0,pb:0,recs:[]};m.set(k,o)}if(a.confidence==='Proven')o.pv++;else o.pb++;o.recs.push(a)})});return m}
  function applyHi(){const svg=$('map');if(!svg)return;
    svg.querySelectorAll('.rsring,.rsbadge').forEach(n=>n.remove());svg.querySelectorAll('g.mk').forEach(g=>g.classList.remove('rslo','rson'));hiFound=0;
    if(!hiMap||!hiMap.size)return;
    svg.querySelectorAll('g.mk').forEach(g=>{const k=g.dataset.mk,o=k&&hiMap.get(k),c=g.querySelector('circle');
      if(!o||!c){g.classList.add('rslo');return}
      hiFound++;g.classList.add('rson');
      const cx=+c.getAttribute('cx'),cy=+c.getAttribute('cy'),r=+c.getAttribute('r')||10,rr=r+5;
      const ring=mel('circle',{cx,cy,r:rr,fill:'none',stroke:'var(--accent)','stroke-width':2.5,class:'rsring '+(o.pv?'pv':'pb')});if(!o.pv)ring.setAttribute('stroke-dasharray','4 3');g.appendChild(ring);
      const n=o.pv+o.pb,bg=mel('g',{class:'rsbadge'},g),bx=cx+rr*.72,by=cy-rr*.72;
      mel('circle',{cx:bx,cy:by,r:n>9?9:7.5,fill:'var(--accent)',stroke:'var(--paper)','stroke-width':1.5},bg);const t=mel('text',{x:bx,y:by+3.2,'text-anchor':'middle',class:'rsbn'},bg);t.textContent=n;
      g.setAttribute('aria-label',(g.getAttribute('aria-label')||'').replace(/ · \d+ linked.*$/,'')+' · '+n+' linked record'+(n===1?'':'s')+' ('+(o.pv?'Proven':'Probable only')+')')});
    svg.querySelectorAll('g.mk').forEach(g=>{if(!g.classList.contains('rson'))g.classList.add('rslo')})}
  function fitHi(){const xs=[],ys=[];document.querySelectorAll('#map g.mk.rson').forEach(g=>{const c=g.querySelector('circle');if(c){xs.push(+c.getAttribute('cx'));ys.push(+c.getAttribute('cy'))}});
    if(!xs.length||typeof Z==='undefined')return;const{W,H}=VIEWS[view],sx=Math.max(...xs)-Math.min(...xs),sy=Math.max(...ys)-Math.min(...ys);
    Z.zoomTo((Math.max(...xs)+Math.min(...xs))/2,(Math.max(...ys)+Math.min(...ys))/2,Math.min(1,Math.max(.3,1.2*Math.max(sx/W,sy/H))))}
  function mapNote(){if(!selKey)return'';if(!hiMap||!hiMap.size)return'<p class="zhint">None of these records has a marker on the map (they may name only a county, or no place).</p>';
    let pv=0,pb=0;hiMap.forEach(o=>{if(o.pv)pv++;else pb++});
    return `<p class="zhint">On the map: ${hiFound} marker${hiFound===1?'':'s'} ringed at the current filters (${pv} solid for Proven, ${pb} dashed for Probable only)${hiFound<hiMap.size?'; '+(hiMap.size-hiFound)+' more are hidden by the Years, Counties or Record-types filters':''}. Click a ringed marker for just these records.</p>`}
  function showOnMap(key){setSel(key,false,true);const mp=$('map');if(mp)window.scrollTo({top:mp.getBoundingClientRect().top+window.scrollY-90,behavior:'smooth'})}
  const yOf=a=>{const m=/(1[6-9]\d\d)/.exec(a.ref.y||'');return m?+m[1]:9999};
  function selName(){const p=selKey[0]==='g'?db.familyGroups.find(x=>x.id===selKey.slice(2)):db.profiles.find(x=>x.id===selKey.slice(2));return p?(p.title||p.fullName||'selection'):'selection'}
  function openSelPop(g,o){lastG=g;const lab=g.getAttribute('aria-label')||'',isT=g.classList.contains('tm'),ttl=(isT?lab.split(':')[0]:lab.replace(/ · \d+ linked.*$/,'')),nm=selName();
    const recs=o.recs.slice().sort((a,b)=>yOf(a)-yOf(b));
    const tk=(g.dataset.mk||'').startsWith('t:')?g.dataset.mk.slice(2):'';
    popShow(ttl,`<p><b>${recs.length} linked record${recs.length===1?'':'s'}</b> for <b>${esc(nm)}</b> at this location, oldest first. Ring: ${o.pv?'solid (at least one Proven record)':'dashed (Probable records only)'}. Names are as written; one name may be several men.</p><ul class="rspoplist">${recs.map(a=>`<li><b>${esc(a.ref.y)}</b> ${esc(a.ref.t)} &middot; ${esc(a.ref.c)} ${esc(a.ref.d)} ${bdg(a.confidence)}<br><span class="ex">${esc(a.explanation)}</span></li>`).join('')}</ul><p><button type="button" class="chip prim rspopall">Show all records at this location</button></p>`,()=>{if(tk&&typeof tfGo==='function')tfGo(tk)},tk?'Zoom to this township':'Done')}
  function wireMap(){const svg=$('map');if(!svg)return;
    const pick=e=>{if(!hiMap||bypass||e.defaultPrevented)return null;const g=e.target.closest&&e.target.closest('g.mk[data-mk]');if(!g)return null;const o=hiMap.get(g.dataset.mk);return o?{g,o}:null};
    svg.addEventListener('click',e=>{const h=pick(e);if(!h)return;e.stopPropagation();e.preventDefault();openSelPop(h.g,h.o)},true);
    svg.addEventListener('keydown',e=>{if(e.key!=='Enter'&&e.key!==' ')return;const h=pick(e);if(!h)return;e.stopPropagation();e.preventDefault();openSelPop(h.g,h.o)},true);
    $('popb').addEventListener('click',e=>{const b=e.target.closest('.rspopall'),f=e.target.closest('.rspopsel');
      if(b&&lastG){const g=lastG;bypass=true;try{g.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}))}finally{bypass=false}
        const o=hiMap&&hiMap.get(g.dataset.mk);if(o){const d=document.createElement('p');d.innerHTML='<button type="button" class="chip prim rspopsel">Show only '+esc(selName())+'&rsquo;s records here</button>';$('popb').appendChild(d)}}
      if(f&&lastG&&hiMap){const o=hiMap.get(lastG.dataset.mk);if(o)openSelPop(lastG,o)}});
    const _dr=draw;draw=function(){_dr();applyHi()}}
  /* ----- wire up ----- */
  function init(){load();
    wireP2();refresh();status();decorate();
    /* MCP App preview: the host delivers research (drafts included) and the selection after load */
    window.__oftResearch=(d,key)=>{try{db=clean(d)}catch(e){return}refresh();decorate();if(key)setSel(key,false,true)};
    if(typeof PREVIEW_SELECT==='string'&&PREVIEW_SELECT)setSel(PREVIEW_SELECT,false,true)}
  const _by=buildYearList;buildYearList=function(){_by();decorate()};
  return {init,get db(){return db}};
})();
(document.readyState==='loading'?document.addEventListener('DOMContentLoaded',RS.init):RS.init());

/* open at the top of the page (unless the link names a section), whatever scroll position the browser remembers */
/* ---- Where the page starts -------------------------------------------------------------
   The page must open at the heading, not part-way down at the map or the records. Content is
   built by script after the HTML parses, so the document grows for a second or so after load;
   without this the browser can restore an old scroll position or settle at the wrong place.
   Two rules only, and both stop the moment the reader does anything:
     - no hash in the address: hold the top until the page has finished growing, on a first
       visit and on a refresh alike;
     - a hash naming a real section (a shared link, or one of the nav links): go there, and
       put it right again once the late content has changed the offsets. This holds on a
       refresh too, so a link sent to someone still lands where it says it will.
   Nothing here touches scrolling inside the map, the dropdowns or the record tables, all of
   which scroll in their own containers. ------------------------------------------------- */
(function(){
  try{if('scrollRestoration' in history)history.scrollRestoration='manual'}catch(e){}
  /* The address decides, not how the visitor arrived: a plain address opens at the top and
     stays there on refresh; an address naming a section goes to that section, and keeps
     going there when the page is refreshed or the link is shared. */
  let target=null;
  try{if(location.hash.length>1)target=document.getElementById(decodeURIComponent(location.hash.slice(1)))}catch(e){}
  /* the reader is in charge from their first gesture or keypress */
  let free=false;const release=()=>{free=true};
  ['wheel','touchstart','pointerdown','keydown'].forEach(t=>addEventListener(t,release,{once:true,passive:true}));
  const settle=()=>{
    if(free)return;
    if(target){const t=document.getElementById(target.id);if(t)t.scrollIntoView({block:'start'})}
    else window.scrollTo(0,0)};
  settle();
  /* re-apply only while the page is still being built, then stop */
  requestAnimationFrame(settle);
  addEventListener('load',()=>{settle();setTimeout(settle,250);setTimeout(()=>{settle();free=true},900)});
  /* coming back via the back button restores a built page: honour the same rule once */
  addEventListener('pageshow',e=>{if(e.persisted){free=false;settle();setTimeout(()=>{settle();free=true},200)}})})();

/* ourfamilytree.net (site mockup): the View buttons set the map view by hand (choosing counties still
   picks one automatically), and on phones the Filters button shows or hides the filter panel. */
(function(){const box=document.getElementById('vbtns');
  const sync=()=>box&&box.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.v===view));
  if(box)box.addEventListener('click',e=>{const b=e.target.closest('button[data-v]');if(!b||b.dataset.v===view)return;view=b.dataset.v;draw()});
  const _d=draw;draw=function(){_d();sync()};sync();
  const fb=document.getElementById('fbtn');
  if(fb)fb.onclick=()=>{const on=document.body.classList.toggle('fopen');fb.setAttribute('aria-expanded',on);fb.textContent=on?'Hide filters':'Filters'}})();

/* ourfamilytree.net: colour theme switch (System follows the device). The choice is kept in this
   browser only; map colours are CSS variables, so nothing is redrawn. */
(function(){const box=document.getElementById('thm');if(!box)return;const root=document.documentElement;
  const sync=()=>box.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',(root.dataset.theme||'')===b.dataset.t));
  box.addEventListener('click',e=>{const b=e.target.closest('button[data-t]');if(!b)return;
    if(b.dataset.t)root.dataset.theme=b.dataset.t;else delete root.dataset.theme;
    try{if(b.dataset.t)localStorage.setItem('oft-theme',b.dataset.t);else localStorage.removeItem('oft-theme')}catch(e){}
    sync()});sync()})();
