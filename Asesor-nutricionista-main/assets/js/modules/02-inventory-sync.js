/* ===== v2.0: inventario por movimientos + sincronización ===== */
const LOCS = { 'despensa-cocina': 'Despensa Cocina', 'despensa-sotano': 'Despensa Sótano' };
['i', 'd'].forEach(l => [1, 2, 3].forEach(n => LOCS['cocina-' + l + n] = 'Cong. cocina · Cajón ' + n + (l === 'i' ? ' izquierda' : ' derecha')));
for (let n = 1; n <= 6; n++) LOCS['sotano-' + n] = 'Cong. sótano · Cajón ' + n;
const LOC_OLD = { despensa: 'despensa-cocina', frigo: 'despensa-cocina' };
const GN = { compra: 'Cesta de la compra', 'despensa-cocina': 'Despensa Cocina', 'despensa-sotano': 'Despensa Sótano', 'congelador-cocina': 'Congelador Cocina', 'congelador-sotano': 'Congelador Sótano' };
const GRP = { compra: [], 'despensa-cocina': ['despensa-cocina'], 'despensa-sotano': ['despensa-sotano'], 'congelador-cocina': ['cocina-i1', 'cocina-i2', 'cocina-i3', 'cocina-d1', 'cocina-d2', 'cocina-d3'], 'congelador-sotano': ['sotano-1', 'sotano-2', 'sotano-3', 'sotano-4', 'sotano-5', 'sotano-6'] };
const MAPC = { general: 'despensa-cocina', congelados: 'cocina-i1', despensa: 'despensa-cocina', frigo: 'despensa-cocina', 'congelador-cocina': 'cocina-i1', 'congelador-sotano': 'sotano-1' };
const normLoc = l => LOC_OLD[l] || l;
const nombreLoc = l => LOCS[normLoc(l)] || ({ limpieza: 'Limpieza (ubicación anterior)', mascotas: 'Mascotas (ubicación anterior)' }[l] || l);
const UDN = { ud: 'ud', rac: 'raciones', kg: 'kg', l: 'l' };
let MOVS = [], COMPRA = [], STOCK = [], VIS = [], USER = null, TAB = 'despensa-cocina', MV = null, CACHE = false;
const optsLoc = ex => Object.entries(LOCS).filter(([k]) => k !== normLoc(ex)).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('');
const fmtC = s => (Math.round(s.cant * 1000) / 1000) + ' ' + (UDN[s.ud] || s.ud);
const grupoDe = l => { l = normLoc(l); return Object.keys(GRP).find(k => GRP[k].includes(l)) || 'despensa-cocina'; };

function calcStock() {
  const m = {};
  const e = (x, l) => { const k = x.prod + '|' + l + '|' + (x.cad || ''); return m[k] = m[k] || { prod: x.prod, loc: l, cad: x.cad || '', cant: 0, ud: x.ud, cod: x.cod, fmt: x.fmt, img: x.img, ns: x.ns }; };
  MOVS.forEach(x => { if (x.de) e(x, normLoc(x.de)).cant -= x.cant; if (x.a) e(x, normLoc(x.a)).cant += x.cant; });
  STOCK = Object.values(m).filter(s => s.cant > 0.0001);
}
const mov = m => fb.addMov({ t: Date.now(), por: USER ? USER.email : '', ...m }).catch(e => alert('No se pudo guardar: ' + e.code));

function render() {
  $('subtabs').innerHTML = `<div class="loc-line loc-line-cart"><button onclick="TAB='compra';render()" class="loc-button loc-cart ${TAB === 'compra' ? 'loc-selected' : ''}"><i class="fa-solid fa-basket-shopping"></i><span>${GN.compra}</span></button></div><div class="loc-line"><button onclick="TAB='despensa-cocina';render()" class="loc-button ${TAB === 'despensa-cocina' ? 'loc-selected' : ''}"><i class="fa-solid fa-box-open"></i><span>${GN['despensa-cocina']}</span></button><button onclick="TAB='despensa-sotano';render()" class="loc-button ${TAB === 'despensa-sotano' ? 'loc-selected' : ''}"><i class="fa-solid fa-boxes-stacked"></i><span>${GN['despensa-sotano']}</span></button></div><div class="loc-line"><button onclick="TAB='congelador-cocina';render()" class="loc-button ${TAB === 'congelador-cocina' ? 'loc-selected' : ''}"><i class="fa-regular fa-snowflake"></i><span>${GN['congelador-cocina']}</span></button><button onclick="TAB='congelador-sotano';render()" class="loc-button ${TAB === 'congelador-sotano' ? 'loc-selected' : ''}"><i class="fa-regular fa-snowflake"></i><span>${GN['congelador-sotano']}</span></button></div>`;
  $('compra-form').classList.toggle('hidden', TAB !== 'compra');
  if (TAB === 'compra') return pintaCompra();
  VIS = STOCK.filter(s => GRP[TAB].includes(s.loc)).sort((a, b) => a.loc.localeCompare(b.loc) || a.prod.localeCompare(b.prod));
  let h = (S.inv && S.inv.length) ? `<button onclick="migrar()" class="w-full bg-amber-100 text-amber-800 rounded-xl p-3 text-xs font-bold">Importar ${S.inv.length} productos de la versión anterior (solo en este móvil)</button>` : '', last = '';
  VIS.forEach((s, i) => {
    if (GRP[TAB].length > 1 && s.loc !== last) { last = s.loc; h += `<p class="text-xs font-bold text-slate-500 mt-2">${esc(LOCS[s.loc])}</p>`; }
    h += `<div class="flex items-center gap-3 bg-white p-3 text-sm row-loc" style="--lc:${locCol(s.loc)}">
      ${okImg(s.img) ? `<img src="${esc(s.img)}" alt="" loading="lazy" class="w-12 h-12 object-contain rounded bg-white">` : `<div class="w-12 h-12 rounded bg-slate-200 flex items-center justify-center text-slate-400"><i class="fa-solid fa-box"></i></div>`}
      <button onclick="verHist(${i})" class="flex-1 text-left min-w-0"><p class="font-medium truncate">${esc(s.prod)}</p>
        <p class="text-xs text-slate-500">${fmtC(s)}${s.fmt ? ' · ' + esc(s.fmt) : ''}</p>
        <p class="text-xs">${caducBar(s.cad)}${caducidad(s.cad)}${NSC[s.ns] ? ` <span class="ml-1 text-white px-1.5 rounded uppercase font-bold ${NSC[s.ns]}">${esc(s.ns)}</span>` : ''}</p></button>
      <div class="flex gap-4 text-lg">${/^(cocina|sotano)-/.test(s.loc) ? `<button onclick="abrirPlan(${i})" title="Planificar descongelación" class="text-sky-600"><i class="fa-regular fa-snowflake"></i></button>` : ''}<button onclick="abrirMov(${i})" title="Mover" class="text-emerald-600"><i class="fa-solid fa-right-left"></i></button><button onclick="abrirMov(${i},'baja')" title="Consumido" class="text-slate-500"><i class="fa-solid fa-utensils"></i></button></div></div>`;
  });
  $('lista').innerHTML = h || '<p class="text-xs text-slate-400 text-center py-4">Sin productos aquí todavía.</p>';
}
function altaManual() {
  const n = $('p-nombre').value.trim(), q = +$('p-cant').value;
  if (!n || !(q > 0)) return alert('Pon nombre y cantidad.');
  const loc = normLoc($('p-cat').value);
  mov({ prod: n, cod: '', cant: q, ud: $('p-ud').value, cad: $('p-cad').value, fmt: '', img: '', ns: '', de: '', a: loc, tipo: 'alta', nota: '' });
  $('p-nombre').value = ''; $('p-cad').value = ''; TAB = grupoDe(loc); cerrar('m-add'); render();
}
function abrirAlta() {
  $('p-cat').value = TAB === 'congelador-cocina' ? 'cocina-i1' : TAB === 'congelador-sotano' ? 'sotano-1' : TAB !== 'compra' && LOCS[TAB] ? TAB : 'despensa-cocina';
  abrir('m-add');
}
function abrirMov(i, modo) {
  MV = VIS[i]; $('mv-tit').textContent = MV.prod; $('mv-inf').textContent = 'Hay ' + fmtC(MV) + ' en ' + nombreLoc(MV.loc); $('mv-cant').value = MV.cant;
  $('mv-dest').innerHTML = '<option value="@consumido">✅ Consumido (baja)</option><option value="@tirado">🗑️ Tirado (baja)</option>' + optsLoc(MV.loc);
  $('mv-dest').value = modo === 'baja' ? '@consumido' : (MV.loc === 'despensa-cocina' ? 'cocina-i1' : 'despensa-cocina'); abrir('m-mov');
}
function confirmarMov() {
  const q = +$('mv-cant').value;
  if (!(q > 0) || q > MV.cant + 0.0001) return alert('Cantidad no válida (máximo ' + MV.cant + ').');
  const d = $('mv-dest').value, b = { prod: MV.prod, cod: MV.cod || '', cant: q, ud: MV.ud, cad: MV.cad || '', fmt: MV.fmt || '', img: MV.img || '', ns: MV.ns || '', de: MV.loc };
  d[0] === '@' ? mov({ ...b, a: '', tipo: 'baja', nota: d.slice(1) }) : mov({ ...b, a: d, tipo: 'mov', nota: '' });
  cerrar('m-mov');
}
const txtMov = x => ({ alta: 'Alta en ' + nombreLoc(x.a), mov: 'Movido de ' + nombreLoc(x.de) + ' a ' + nombreLoc(x.a), baja: (x.nota === 'tirado' ? 'Tirado' : /^cocinado/.test(x.nota || '') ? 'Gastado al cocinar «' + String(x.nota).slice(9) + '»' : 'Consumido') + ' desde ' + nombreLoc(x.de), anula: 'Anulación' }[x.tipo] || x.tipo) + ' (' + fmtC(x) + ')';
function verHist(i) {
  const s = VIS[i], an = new Set(MOVS.filter(x => x.tipo === 'anula').map(x => x.ref));
  $('m-tit').textContent = 'Historial · ' + s.prod;
  $('m-cuerpo').innerHTML = MOVS.filter(x => x.prod === s.prod).reverse().map(x => `<div class="flex justify-between items-center bg-slate-50 rounded-lg p-2 text-xs"><span>${new Date(x.t).toLocaleDateString('es-ES')} · ${esc(txtMov(x))}${an.has(x.id) ? ' <i>(anulado)</i>' : ''}</span>${x.tipo !== 'anula' && !an.has(x.id) ? `<button onclick="deshacer('${x.id}')" class="text-red-500 font-bold ml-2">Deshacer</button>` : ''}</div>`).join('') || 'Sin movimientos.';
  $('m-acc').innerHTML = ''; abrir('m-receta');
}
function deshacer(id) {
  const x = MOVS.find(m => m.id === id); if (!x || !confirm('¿Anular este movimiento?')) return;
  mov({ prod: x.prod, cod: x.cod || '', cant: x.cant, ud: x.ud, cad: x.cad || '', fmt: x.fmt || '', img: x.img || '', ns: x.ns || '', de: x.a || '', a: x.de || '', tipo: 'anula', ref: id, nota: '' });
  cerrar('m-receta');
}

/* Lista de la compra (sincronizada) */
function pintaCompra() {
  $('lista').innerHTML = COMPRA.map(c => `<div class="flex items-center gap-3 bg-slate-50 rounded-xl p-3 text-sm"><input type="checkbox" ${c.hecho ? 'checked' : ''} onchange="fb.setCompra('${c.id}',{hecho:this.checked})" class="w-5 h-5 accent-emerald-600"><span class="flex-1 ${c.hecho ? 'line-through text-slate-400' : ''}">${esc(c.n)}</span><button onclick="fb.delCompra('${c.id}')" class="text-red-400"><i class="fa-solid fa-trash"></i></button></div>`).join('') || '<p class="text-xs text-slate-400 text-center py-4">Lista vacía.</p>';
}
function addCompra() { const n = $('c-n').value.trim(); if (!n) return; fb.addCompra({ n, hecho: false, t: Date.now() }); $('c-n').value = ''; }
const textoLista = () => '🛒 Lista de la compra\n' + COMPRA.filter(c => !c.hecho).map(c => '• ' + c.n).join('\n');
async function compartir() {
  const t = textoLista();
  if (navigator.share) { try { await navigator.share({ text: t }); return; } catch (e) {} }
  try { await navigator.clipboard.writeText(t); alert('Lista copiada. Pégala donde quieras.'); } catch (e) { alert(t); }
}
const waLista = () => window.open('https://wa.me/?text=' + encodeURIComponent(textoLista()), '_blank', 'noopener');

/* Migración desde la versión 1 (datos locales de este móvil) */
function migrar() {
  S.inv.forEach(i => {
    mov({ prod: i.n, cod: i.code || '', cant: i.ud || 1, ud: 'ud', cad: i.cad || '', fmt: i.cant || '', img: i.img || '', ns: i.ns || '', de: '', a: MAPC[i.cat] || i.cat || 'despensa', tipo: 'alta', nota: 'migrado v1' });
    if (i.buy) fb.addCompra({ n: i.n, hecho: false, t: Date.now() });
  });
  S.inv = []; save(); render();
}

/* Escáner y ficha: ahora generan altas en el inventario */
const _pp = parseProd; parseProd = function () { const r = _pp.apply(null, arguments); r.cat = MAPC[r.cat] || r.cat; return r; };
const _af = abrirFicha; abrirFicha = function (id, av, d) { if (d && d.cat) { d.cat = MAPC[d.cat] || d.cat; if (TAB === 'congelador-cocina' && d.cat === 'despensa-cocina') d.cat = 'cocina-i1'; if (TAB === 'congelador-sotano' && d.cat === 'despensa-cocina') d.cat = 'sotano-1'; } if (id) { const old = S.inv.find(x => x.id === id); if (old && old.cat) old.cat = MAPC[old.cat] || old.cat; } _af(id, av, d); };
function guardarFicha() {
  const n = $('f-n').value.trim(); if (!n) return alert('Ponle un nombre al producto.');
  const loc = normLoc($('f-cat').value || 'despensa-cocina');
  mov({ prod: n, cod: (F && F.code) || '', cant: Math.max(1, +$('f-ud').value || 1), ud: 'ud', cad: $('f-cad').value, fmt: $('f-cant').value.trim(), img: okImg(F && F.img) ? F.img : '', ns: (F && F.ns) || '', de: '', a: loc, tipo: 'alta', nota: $('f-marca').value.trim() });
  cerrar('m-ficha'); TAB = grupoDe(loc); render();
}
function selectorChef() {
  const n = [...new Set(STOCK.filter(s => !['limpieza', 'mascotas'].includes(s.loc)).map(s => s.prod))];
  $('chef-sel').innerHTML = n.length ? n.map(x => `<label class="text-xs bg-white border rounded-full px-3 py-1.5"><input type="checkbox" value="${esc(x)}" class="accent-emerald-600 mr-1">${esc(x)}</label>`).join('') : '<span class="text-xs text-slate-400">Añade productos al inventario.</span>';
}

/* Sesión y estado */
function estado() {
  $('sync-estado').innerHTML = USER ? esc(USER.email) + ' · ' + (!navigator.onLine ? 'sin red (se enviará al volver)' : CACHE ? 'sincronizando…' : 'sincronizado') + ' · <button onclick="fb.logout()" class="underline">salir</button>' : 'Sin sesión';
}
window.onUser = u => { USER = u; $('m-login').classList.toggle('hidden', !!u); $('m-login').classList.toggle('flex', !u); estado(); };
window.onMovs = (l, c) => { MOVS = l; CACHE = c; calcStock(); render(); estado(); };
window.onCompra = l => { COMPRA = l.sort((a, b) => (a.hecho - b.hecho) || (a.t - b.t)); render(); };
addEventListener('online', estado); addEventListener('offline', estado);
async function entrar() { try { await fb.login($('l-e').value.trim(), $('l-p').value); $('l-p').value = ''; $('l-err').textContent = ''; } catch (e) { $('l-err').textContent = 'No se pudo entrar: ' + (e.code || e.message); } }
$('p-cat').innerHTML = optsLoc(); $('f-cat').innerHTML = optsLoc(); render();
