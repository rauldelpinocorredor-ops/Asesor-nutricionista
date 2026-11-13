/* ===== v3.1: renombrar alimentos (alias que no toca el historial) ===== */
let ALIAS = [], RAWMOVS = null, RAWPLAN = null, CACHE_ = false, HN = '';
const ik2 = k => ik(k).replace(/[!*'()]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
const resolver = () => { const m = {}; ALIAS.forEach(a => { m[sinAc(a.de)] = a.a; }); return n => { const seen = new Set(); let c = n; for (let k = sinAc(c); m[k] !== undefined && !seen.has(k); k = sinAc(c)) { seen.add(k); c = m[k]; } return c; }; };
const _om = window.onMovs; window.onMovs = (l, c) => { RAWMOVS = l; CACHE_ = c; const r = resolver(); _om(l.map(x => ({ ...x, prod: r(x.prod) })), c); };
const _op = window.onPlan; window.onPlan = l => { RAWPLAN = l; const r = resolver(); _op(l.map(p => ({ ...p, prod: r(p.prod) }))); };
window.onAlias = l => { ALIAS = l.filter(a => a.de && a.a); if (RAWMOVS) window.onMovs(RAWMOVS, CACHE_); if (RAWPLAN) window.onPlan(RAWPLAN); };
const _vh = verHist;
verHist = function (i) {
  HN = VIS[i].prod; _vh(i);
  $('m-cuerpo').insertAdjacentHTML('afterbegin', `<div class="bg-sky-50 border border-sky-200 rounded-xl p-3 mb-3"><label class="text-xs font-bold text-sky-800">Nombre del alimento<input id="rn-n" value="${esc(HN)}" maxlength="80" class="w-full p-2 border rounded-lg mt-1 font-normal text-sm bg-white"></label><button onclick="renombrar()" class="w-full mt-2 bg-sky-600 text-white py-2 rounded-lg font-bold text-xs">Guardar nombre</button><p class="text-[10px] text-slate-400 mt-1">Se aplica al inventario y a todo el historial; no se borra ningún movimiento.</p></div>`);
};
function renombrar() {
  const nuevo = $('rn-n').value.trim().slice(0, 80); if (!nuevo || nuevo === HN) return;
  const k = sinAc(nuevo), mismo = sinAc(HN) === k;
  if (!mismo && STOCK.some(s => sinAc(s.prod) === k) && !confirm('Ya existe «' + nuevo + '» en el inventario: se unirán los dos productos. ¿Continuar?')) return;
  const ex = ALIAS.find(a => sinAc(a.de) === k); if (ex && !mismo) fb.del('alias', ex.id);
  fb.set('alias', ik2(sinAc(HN)), { de: HN, a: nuevo, t: Date.now() }); cerrar('m-receta');
}