/* ===== v2.0: inventario por movimientos + sincronización ===== */
const LOCS = { frigo: 'Frigorífico', 'despensa-cocina': 'Despensa Cocina', 'despensa-sotano': 'Despensa Sótano' };
['i', 'd'].forEach(l => [1, 2, 3].forEach(n => LOCS['cocina-' + l + n] = 'Cong. cocina · Cajón ' + n + (l === 'i' ? ' izquierda' : ' derecha')));
for (let n = 1; n <= 6; n++) LOCS['sotano-' + n] = 'Cong. sótano · Cajón ' + n;
const LOC_OLD = { despensa: 'despensa-cocina' };
const GN = { compra: 'Cesta de la compra', frigo: 'Frigorífico', 'despensa-cocina': 'Despensa Cocina', 'despensa-sotano': 'Despensa Sótano', 'congelador-cocina': 'Congelador Cocina', 'congelador-sotano': 'Congelador Sótano' };
const GRP = { compra: [], frigo: ['frigo'], 'despensa-cocina': ['despensa-cocina'], 'despensa-sotano': ['despensa-sotano'], 'congelador-cocina': ['cocina-i1', 'cocina-i2', 'cocina-i3', 'cocina-d1', 'cocina-d2', 'cocina-d3'], 'congelador-sotano': ['sotano-1', 'sotano-2', 'sotano-3', 'sotano-4', 'sotano-5', 'sotano-6'] };
const MAPC = { general: 'despensa-cocina', congelados: 'cocina-i1', despensa: 'despensa-cocina', 'congelador-cocina': 'cocina-i1', 'congelador-sotano': 'sotano-1' };
const normLoc = l => LOC_OLD[l] || l;
const nombreLoc = l => LOCS[normLoc(l)] || ({ limpieza: 'Limpieza (ubicación anterior)', mascotas: 'Mascotas (ubicación anterior)' }[l] || l);
const UDN = { ud: 'ud', rac: 'raciones', kg: 'kg', g: 'g', l: 'l', ml: 'ml' };
let MOVS = [], COMPRA = [], STOCK = [], VIS = [], USER = null, TAB = 'despensa-cocina', MV = null, CACHE = false, STOCK_READY = false, COMPRA_READY = false;
const optsLoc = ex => Object.entries(LOCS).filter(([k]) => k !== normLoc(ex)).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('');
const fmtC = s => (Math.round(s.cant * 1000) / 1000) + ' ' + (UDN[s.ud] || s.ud);
const grupoDe = l => { l = normLoc(l); return Object.keys(GRP).find(k => GRP[k].includes(l)) || 'despensa-cocina'; };

function calcStock() {
  const m = {};
  const esCongelador = l => /^(cocina-|sotano-)/.test(normLoc(l));
  const e = (x, l) => {
    // The same product/date/location can hold separate quantities in different units.
    const unit = String(x.ud || 'ud');
    const k = JSON.stringify([x.prod || '', l || '', x.cad || '', unit]);
    return m[k] = m[k] || { prod: x.prod, loc: l, cad: x.cad || '', recordatorio: x.recordatorio || '', recordatorioFuente: x.recordatorioFuente || '', recordatorioCategoria: x.recordatorioCategoria || '', cant: 0, ud: unit, cod: x.cod || '', fmt: x.fmt || '', img: x.img || '', ns: x.ns || '', marca: x.marca || '', fechaCongelacion: null };
  };
  const applyEditedFields = (row, next, previous) => {
    for (const field of ['cod','fmt','img','ns','marca','recordatorio','recordatorioFuente','recordatorioCategoria','fechaCongelacion']) {
      if (Object.prototype.hasOwnProperty.call(next, field)) row[field] = field === 'fechaCongelacion' ? (Number(next[field]) || null) : String(next[field] || '');
      else if (previous && !row[field] && previous[field]) row[field] = previous[field];
    }
    row.ud = String(next.ud || row.ud || 'ud');
  };
  MOVS.forEach(x => {
    if (x.tipo === 'edicion' && x.anterior) {
      const anterior = x.anterior, prevRow = e({ ...x, ...anterior }, normLoc(anterior.loc));
      const loc = normLoc(x.a || x.loc), nextRow = e(x, loc);
      if (prevRow === nextRow) {
        // The edit addresses the same stock line: adjust by the difference so the
        // shared object is not subtracted and re-added as two aliased references.
        applyEditedFields(nextRow, x, prevRow);
        nextRow.cant += (Number(x.cant) || 0) - (Number(anterior.cant) || 0);
      } else {
        prevRow.cant -= Number(anterior.cant) || 0;
        applyEditedFields(nextRow, x, prevRow);
        nextRow.cant += Number(x.cant) || 0;
      }
      if (esCongelador(loc)) {
        const fecha = Object.prototype.hasOwnProperty.call(x, 'fechaCongelacion') ? Number(x.fechaCongelacion) || null : prevRow.fechaCongelacion || Number(x.t) || null;
        if (fecha && (!nextRow.fechaCongelacion || fecha < nextRow.fechaCongelacion)) nextRow.fechaCongelacion = fecha;
        else if (Object.prototype.hasOwnProperty.call(x, 'fechaCongelacion') && !x.fechaCongelacion) nextRow.fechaCongelacion = null;
      }
      return;
    }
    const origen = x.de ? e(x, normLoc(x.de)) : null;
    if (origen) origen.cant -= x.cant;
    if (x.a) {
      const loc = normLoc(x.a), row = e(x, loc);
      row.cant += x.cant;
      const nextReminder = x.recordatorio || origen?.recordatorio || '';
      if (nextReminder) {
        const sameOriginReminder = !!origen && nextReminder === origen.recordatorio;
        const nextSource = Object.prototype.hasOwnProperty.call(x,'recordatorioFuente')
          ? (x.recordatorioFuente || '') : (sameOriginReminder ? origen.recordatorioFuente || '' : '');
        const nextCategory = Object.prototype.hasOwnProperty.call(x,'recordatorioCategoria')
          ? (x.recordatorioCategoria || '') : (sameOriginReminder ? origen.recordatorioCategoria || '' : '');
        if (row.recordatorio === nextReminder && ((row.recordatorioFuente || '') !== nextSource || (row.recordatorioCategoria || '') !== nextCategory)) {
          // A merged line with mixed provenance must not claim one official source.
          row.recordatorioFuente = ''; row.recordatorioCategoria = '';
        } else if (row.recordatorio !== nextReminder) {
          row.recordatorio = nextReminder; row.recordatorioFuente = nextSource; row.recordatorioCategoria = nextCategory;
        }
      }
      if (esCongelador(loc)) {
        const fecha = Number(x.fechaCongelacion) || (origen && esCongelador(origen.loc) ? origen.fechaCongelacion : null) || Number(x.t) || null;
        if (fecha && (!row.fechaCongelacion || fecha < row.fechaCongelacion)) row.fechaCongelacion = fecha;
      }
    }
  });
  STOCK = Object.values(m).filter(s => s.cant > 0.0001);
}
const mov = m => fb.addMov({ t: Date.now(), por: USER ? USER.email : '', ...m }).catch(e => alert('No se pudo guardar: ' + e.code));

function render() {
  $('subtabs').innerHTML = `<div class="loc-line loc-line-cart"><button onclick="TAB='compra';render()" class="loc-button loc-cart ${TAB === 'compra' ? 'loc-selected' : ''}"><i class="fa-solid fa-basket-shopping"></i><span>${GN.compra}</span></button></div><div class="loc-line loc-line-cart"><button onclick="TAB='frigo';render()" class="loc-button loc-fridge ${TAB === 'frigo' ? 'loc-selected' : ''}"><i class="fa-solid fa-temperature-low"></i><span>${GN.frigo}</span></button></div><div class="loc-line"><button onclick="TAB='despensa-cocina';render()" class="loc-button ${TAB === 'despensa-cocina' ? 'loc-selected' : ''}"><i class="fa-solid fa-box-open"></i><span>${GN['despensa-cocina']}</span></button><button onclick="TAB='despensa-sotano';render()" class="loc-button ${TAB === 'despensa-sotano' ? 'loc-selected' : ''}"><i class="fa-solid fa-boxes-stacked"></i><span>${GN['despensa-sotano']}</span></button></div><div class="loc-line"><button onclick="TAB='congelador-cocina';render()" class="loc-button ${TAB === 'congelador-cocina' ? 'loc-selected' : ''}"><i class="fa-regular fa-snowflake"></i><span>${GN['congelador-cocina']}</span></button><button onclick="TAB='congelador-sotano';render()" class="loc-button ${TAB === 'congelador-sotano' ? 'loc-selected' : ''}"><i class="fa-regular fa-snowflake"></i><span>${GN['congelador-sotano']}</span></button></div>`;
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
        <p class="text-xs">${caducBar(s.cad)}${caducidad(s.cad)}${NSC[s.ns] ? ` <span class="ml-1 text-white px-1.5 rounded uppercase font-bold ${NSC[s.ns]}">${esc(s.ns)}</span>` : ''}</p>${s.recordatorio ? `<p class="text-[10px] text-sky-700">Recordatorio ${s.recordatorioFuente === 'https://www.foodsafety.gov/food-safety-charts/cold-food-storage-charts' ? 'orientativo · ' + esc(s.recordatorioCategoria || '') + ' · FoodSafety.gov' : 'manual'} · ${new Date(`${s.recordatorio}T12:00:00`).toLocaleDateString('es-ES')}</p>` : ''}${s.marca ? `<p class="text-[10px] text-slate-400">${esc(s.marca)}</p>` : ''}${/^(cocina|sotano)-/.test(s.loc) && s.fechaCongelacion ? `<p class="text-[10px] text-sky-700">Congelado el ${new Date(s.fechaCongelacion).toLocaleDateString('es-ES')}</p>` : ''}</button>
      <div class="flex gap-4 text-lg"><button onclick="editarStock(${i})" title="Editar alimento" class="text-indigo-600"><i class="fa-solid fa-pen"></i></button>${/^(cocina|sotano)-/.test(s.loc) ? `<button onclick="abrirPlan(${i})" title="Planificar descongelación" class="text-sky-600"><i class="fa-regular fa-snowflake"></i></button>` : ''}<button onclick="abrirMov(${i})" title="Mover" class="text-emerald-600"><i class="fa-solid fa-right-left"></i></button><button onclick="abrirMov(${i},'baja')" title="Consumido" class="text-slate-500"><i class="fa-solid fa-utensils"></i></button></div></div>`;
  });
  $('lista').innerHTML = h || '<p class="text-xs text-slate-400 text-center py-4">Sin productos aquí todavía.</p>';
}
function altaManual() {
  const n = $('p-nombre').value.trim(), q = +$('p-cant').value;
  if (!n || !(q > 0)) return alert('Pon nombre y cantidad.');
  const loc = normLoc($('p-cat').value);
  const vaCongelador = /^(cocina-|sotano-)/.test(loc);
  mov({ prod: n, cod: '', cant: q, ud: $('p-ud').value, cad: $('p-cad').value, recordatorio: $('p-rec')?.value || '', recordatorioFuente: $('p-rec-source')?.value || '', recordatorioCategoria: $('p-rec-category')?.value || '', fmt: '', img: '', ns: '', fechaCongelacion: vaCongelador ? Date.now() : null, de: '', a: loc, tipo: vaCongelador ? 'congelar' : 'alta', nota: '' });
  $('p-nombre').value = ''; $('p-cad').value = ''; if ($('p-rec')) $('p-rec').value = ''; if ($('p-rec-source')) $('p-rec-source').value = ''; if ($('p-rec-category')) $('p-rec-category').value = ''; TAB = grupoDe(loc); cerrar('m-add'); render();
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
  const d = $('mv-dest').value, oldFreezer = /^(cocina-|sotano-)/.test(normLoc(MV.loc)), newFreezer = d[0] !== '@' && /^(cocina-|sotano-)/.test(normLoc(d));
  const fechaCongelacion = newFreezer ? (oldFreezer ? (MV.fechaCongelacion || null) : Date.now()) : null;
  const b = { prod: MV.prod, cod: MV.cod || '', cant: q, ud: MV.ud, cad: MV.cad || '', recordatorio: MV.recordatorio || '', recordatorioFuente: MV.recordatorioFuente || '', recordatorioCategoria: MV.recordatorioCategoria || '', fmt: MV.fmt || '', img: MV.img || '', ns: MV.ns || '', marca: MV.marca || '', fechaCongelacion, de: MV.loc };
  if (d[0] === '@') mov({ ...b, a: '', tipo: 'baja', nota: d.slice(1) });
  else mov({ ...b, a: d, tipo: newFreezer && !oldFreezer ? 'congelar' : oldFreezer && d === 'frigo' ? 'descongelar' : 'mov', nota: '' });
  cerrar('m-mov');
}
const txtMov = x => ({ alta: 'Alta en ' + nombreLoc(x.a), mov: 'Movido de ' + nombreLoc(x.de) + ' a ' + nombreLoc(x.a), congelar: 'Congelado en ' + nombreLoc(x.a), descongelar: 'Descongelado y pasado a ' + nombreLoc(x.a), edicion: 'Corrección del inventario', ajuste: 'Ajuste de inventario', baja: (x.nota === 'tirado' ? 'Tirado' : /^cocinado/.test(x.nota || '') ? 'Gastado al cocinar «' + String(x.nota).slice(9) + '»' : 'Consumido') + ' desde ' + nombreLoc(x.de), anula: 'Anulación' }[x.tipo] || x.tipo) + ' (' + fmtC(x) + ')';
function verHist(i) {
  const s = VIS[i], an = new Set(MOVS.filter(x => x.tipo === 'anula').map(x => x.ref));
  $('m-tit').textContent = 'Historial · ' + s.prod;
  MOVS.filter(x => x.tipo === 'edicion' && x.ref).forEach(x => an.add(x.ref));
  $('m-cuerpo').innerHTML = MOVS.filter(x => x.prod === s.prod || x.anterior?.prod === s.prod).reverse().map(x => `<div class="flex justify-between items-center bg-slate-50 rounded-lg p-2 text-xs"><span>${new Date(x.t).toLocaleDateString('es-ES')} · ${esc(txtMov(x))}${an.has(x.id) ? ' <i>(anulado)</i>' : ''}</span>${x.tipo !== 'anula' && !an.has(x.id) ? `<button onclick="deshacer('${x.id}')" class="text-red-500 font-bold ml-2">Deshacer</button>` : ''}</div>`).join('') || 'Sin movimientos.';
  $('m-acc').innerHTML = ''; abrir('m-receta');
}
function deshacer(id) {
  const x = MOVS.find(m => m.id === id); if (!x || !confirm('¿Anular este movimiento?')) return;
  if (x.tipo === 'edicion' && x.anterior) {
    const a = x.anterior;
    mov({ prod: a.prod, cod: a.cod || '', cant: a.cant, ud: a.ud, cad: a.cad || '', recordatorio: a.recordatorio || '', recordatorioFuente: a.recordatorioFuente || '', recordatorioCategoria: a.recordatorioCategoria || '', fmt: a.fmt || '', img: a.img || '', ns: a.ns || '', marca: a.marca || '', fechaCongelacion: a.fechaCongelacion || null, de: x.a || '', a: a.loc || '', tipo: 'edicion', ref: id, nota: 'Corrección anulada', anterior: { prod: x.prod, cod: x.cod || '', cant: x.cant, ud: x.ud, cad: x.cad || '', recordatorio: x.recordatorio || '', recordatorioFuente: x.recordatorioFuente || '', recordatorioCategoria: x.recordatorioCategoria || '', fmt: x.fmt || '', img: x.img || '', ns: x.ns || '', marca: x.marca || '', fechaCongelacion: x.fechaCongelacion || null, loc: x.a || '' } });
    cerrar('m-receta'); return;
  }
  mov({ prod: x.prod, cod: x.cod || '', cant: x.cant, ud: x.ud, cad: x.cad || '', recordatorio: x.recordatorio || '', recordatorioFuente: x.recordatorioFuente || '', recordatorioCategoria: x.recordatorioCategoria || '', fmt: x.fmt || '', img: x.img || '', ns: x.ns || '', de: x.a || '', a: x.de || '', tipo: 'anula', ref: id, nota: '' });
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
  const vaCongelador = /^(cocina-|sotano-)/.test(loc);
  mov({ prod: n, cod: (F && F.code) || '', cant: Math.max(1, +$('f-ud').value || 1), ud: 'ud', cad: $('f-cad').value, fmt: $('f-cant').value.trim(), img: okImg(F && F.img) ? F.img : '', ns: (F && F.ns) || '', marca: $('f-marca').value.trim(), fechaCongelacion: vaCongelador ? Date.now() : null, de: '', a: loc, tipo: vaCongelador ? 'congelar' : 'alta', nota: '' });
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
window.onUser = u => { USER = u; if (!u) { STOCK_READY = false; COMPRA_READY = false; } $('m-login').classList.toggle('hidden', !!u); $('m-login').classList.toggle('flex', !u); estado(); };
window.onMovs = (l, c) => { MOVS = l; CACHE = c; calcStock(); STOCK_READY = !!USER; render(); estado(); };
window.onCompra = l => { COMPRA = l.sort((a, b) => (a.hecho - b.hecho) || (a.t - b.t)); COMPRA_READY = !!USER; render(); };
addEventListener('online', estado); addEventListener('offline', estado);
async function entrar() { try { await fb.login($('l-e').value.trim(), $('l-p').value); $('l-p').value = ''; $('l-err').textContent = ''; } catch (e) { $('l-err').textContent = 'No se pudo entrar: ' + (e.code || e.message); } }
$('p-cat').innerHTML = optsLoc(); $('f-cat').innerHTML = optsLoc(); render();
