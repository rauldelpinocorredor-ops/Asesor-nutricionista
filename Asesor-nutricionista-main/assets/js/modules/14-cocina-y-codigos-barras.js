/* ===== v4.1: descontar al cocinar y baja por código de barras ===== */
let CKD = [], SCAN_MODO = 'alta';
const ordLoc = l => l === 'despensa-cocina' ? 0 : l === 'despensa-sotano' ? 1 : /^cocina-/.test(l) ? 2 : 3;
const denom = u => (u === 'kg' || u === 'l') ? 1000 : 1;
function planDescuento(g, f) {
  const L = stockDe(g.n).filter(s => !['limpieza', 'mascotas'].includes(s.loc)).sort((a, b) => (a.cad || '9999').localeCompare(b.cad || '9999') || ordLoc(a.loc) - ordLoc(b.loc));
  if (!L.length) return { g, sin: true, items: [], on: false };
  if (g.c == null || !g.u) return { g, manual: true, L, sel: 0, q: '', on: false };
  const nb = aBase(g.c * f, g.u); let falta = nb.v, comp = false; const items = [];
  L.forEach(s => { const b = aBase(s.cant, s.ud); if (b.u !== nb.u) return; comp = true; if (falta <= 0) return; const usar = Math.min(falta, b.v); items.push({ s, cant: usar / denom(s.ud), txt: fmtQ(usar, nb.u) }); falta -= usar; });
  if (!comp) return { g, manual: true, L, sel: 0, q: '', on: false };
  return { g, items, falta: Math.max(0, falta), u: nb.u, on: true };
}
function cocinadoAbrir() {
  const f = VS.rac / (+VR.rac || 2);
  CKD = (VR.i || []).map(normIng).filter(g => g.n && !BASICOS.test(sinAc(g.n))).map(g => planDescuento(g, f));
  $('cd-tit').textContent = VR.n + ', ' + VS.rac + ' raciones. Revisa lo que se descontará del inventario.';
  $('cd-sobloc').innerHTML = optsLoc(); $('cd-sobloc').value = 'despensa-cocina'; $('cd-sob').value = 0; pintaCD(); abrir('m-cocinado');
}
function pintaCD() {
  $('cd-body').innerHTML = CKD.map((r, i) => {
    let d;
    if (r.sin) d = '<span class="text-slate-400">No lo tienes en el inventario: no se descuenta.</span>';
    else if (r.manual) d = `<span class="text-amber-700">No puedo comparar unidades. Elige de dónde y cuánto restar:</span><div class="grid grid-cols-3 gap-1 mt-1"><select onchange="CKD[${i}].sel=+this.value" class="col-span-2 p-1.5 border rounded bg-white text-xs">${r.L.map((s, j) => `<option value="${j}">${esc(s.prod + ' en ' + LOCS[s.loc] + ' (' + fmtC(s) + ')')}</option>`).join('')}</select><input type="number" step="any" min="0" placeholder="cantidad" oninput="CKD[${i}].q=+this.value;CKD[${i}].on=+this.value>0;this.closest('label').querySelector('input[type=checkbox]').checked=CKD[${i}].on" class="p-1.5 border rounded bg-white text-xs"></div>`;
    else d = r.items.map(x => `<span class="text-emerald-700">${esc(x.txt)} de ${esc(x.s.prod)} (${esc(LOCS[x.s.loc])})</span>`).join('<br>') + (r.falta > 0 ? `<br><span class="text-red-700">Te faltaban ${esc(fmtQ(r.falta, r.u))}: no había suficiente.</span>` : '');
    return `<label class="flex gap-2 items-start bg-slate-50 rounded-lg p-2"><input type="checkbox" ${r.on ? 'checked' : ''} ${r.sin ? 'disabled' : ''} onchange="CKD[${i}].on=this.checked" class="mt-1 w-5 h-5 accent-emerald-600"><span class="flex-1"><b>${esc(r.g.n)}</b><br>${d}</span></label>`;
  }).join('') || '<p class="text-xs text-slate-500">Esta receta no tiene ingredientes estructurados que descontar.</p>';
}
function cocinadoOk() {
  const nota = 'cocinado:' + VR.n; let n = 0;
  const baja = (s, c) => { if (!(c > 0)) return; mov({ prod: s.prod, cod: s.cod || '', cant: Math.min(c, s.cant), ud: s.ud, cad: s.cad || '', fmt: s.fmt || '', img: s.img || '', ns: s.ns || '', de: s.loc, a: '', tipo: 'baja', nota }); n++; };
  CKD.filter(r => r.on).forEach(r => { if (r.manual) baja(r.L[r.sel], r.q); else r.items.forEach(x => baja(x.s, x.cant)); });
  const sob = +$('cd-sob').value;
  if (sob > 0) mov({ prod: VR.n + ' (cocinado)', cod: '', cant: sob, ud: 'rac', cad: '', fmt: '', img: '', ns: '', de: '', a: $('cd-sobloc').value, tipo: 'alta', nota });
  cerrar('m-cocinado'); cerrar('m-receta');
  alert(n + ' producto(s) descontados' + (sob > 0 ? ' y ' + sob + ' ración(es) guardadas en ' + LOCS[$('cd-sobloc').value] : '') + '.');
}
const _pr3 = pintaReceta;
pintaReceta = function () { _pr3(); $('m-acc').insertAdjacentHTML('afterbegin', '<button onclick="cocinadoAbrir()" class="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold text-sm">✅ ¡Ya la he cocinado! Descontar del inventario</button>'); };

/* Baja por código de barras */
function scanModo(m) { SCAN_MODO = m; $('sm-alta').className = 'py-2 rounded-lg text-xs font-bold ' + (m === 'alta' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'); $('sm-baja').className = 'py-2 rounded-lg text-xs font-bold ' + (m === 'baja' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'); }
const _as = abrirScanner; abrirScanner = function () { scanModo('alta'); return _as(); };
const _pc = procesarCodigo;
procesarCodigo = async function (raw) {
  if (SCAN_MODO !== 'baja') return _pc(raw);
  const code = String(raw || '').replace(/\D/g, ''); if (code.length < 8) return msg('Código no válido (mínimo 8 dígitos).');
  pararCamara(); cerrar('m-scan');
  const L = STOCK.filter(s => s.cod === code).sort((a, b) => (a.cad || '9999').localeCompare(b.cad || '9999') || ordLoc(a.loc) - ordLoc(b.loc));
  if (!L.length) { alert('No hay ningún producto con ese código en el inventario. Los añadidos a mano no llevan código: búscalo por nombre.'); return abrirBus(); }
  VIS = [L[0]]; abrirMov(0, 'baja'); if (['ud', 'rac'].includes(L[0].ud)) $('mv-cant').value = Math.min(1, L[0].cant);
};
scanModo('alta');
