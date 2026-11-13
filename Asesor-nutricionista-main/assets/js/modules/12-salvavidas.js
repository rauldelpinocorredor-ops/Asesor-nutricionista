/* ===== v3.2: selección de ingredientes desplegable y Menú Salvavidas ===== */
function updN() { const n = selActual().length; $('chef-n').textContent = n ? `(${n} seleccionados)` : '(ninguno seleccionado)'; }
const limpiaSel = () => { document.querySelectorAll('#chef-sel input').forEach(c => { c.checked = false; }); updN(); };
const _sc = selectorChef;
selectorChef = function () { const prev = new Set(selActual()); _sc(); document.querySelectorAll('#chef-sel input').forEach(c => { if (prev.has(c.value)) c.checked = true; }); updN(); };
$('chef-sel').addEventListener('change', updN); updN();

function salvavidas() {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const por = {};
  STOCK.filter(s => s.cad && !['limpieza', 'mascotas'].includes(s.loc)).forEach(s => {
    const d = Math.round((new Date(s.cad + 'T00:00:00') - hoy) / 864e5), k = sinAc(s.prod);
    if (d >= 0 && d < 14 && (!por[k] || d < por[k].d)) por[k] = { prod: s.prod, d, k };
  });
  const lista = Object.values(por).sort((a, b) => a.d - b.d), out = $('chef-res');
  const cab = '<p class="font-bold text-rose-700 text-sm mb-1">🛟 Menú Salvavidas</p>';
  if (!lista.length) return (out.innerHTML = cab + '<p class="text-xs text-slate-500">No hay productos con fecha de caducidad en los próximos 14 días (los ya caducados no se proponen). Las fechas se ponen al dar de alta o al editar el producto.</p>');
  if (!S.rec.length) return (out.innerHTML = cab + '<p class="text-xs text-slate-500">Aún no hay recetas guardadas. Carga las recetas base o importa algunas.</p>');
  const res = todas().map(r => {
    const ing = (r.i || []).map(normIng).filter(g => g.n && !BASICOS.test(sinAc(g.n)));
    const usa = lista.filter(e => ing.some(g => { const n = sinAc(g.n); return e.k.includes(n) || (e.k.length > 2 && n.includes(e.k)); }));
    if (!usa.length) return null;
    const falta = ing.filter(g => { const e = estadoIng(g, 1); return e.e === 'falta' || e.e === 'poco'; }).length;
    return { r, usa, falta };
  }).filter(Boolean).sort((a, b) => b.usa.length - a.usa.length || a.falta - b.falta || Math.min(...a.usa.map(u => u.d)) - Math.min(...b.usa.map(u => u.d))).slice(0, 5);
  const dd = d => d === 0 ? 'hoy' : d === 1 ? 'mañana' : 'en ' + d + ' d';
  out.innerHTML = cab + `<p class="text-[11px] text-slate-500 mb-2">A punto de caducar (menos de 14 días): ${lista.map(e => esc(e.prod) + ' (' + dd(e.d) + ')').join(', ')}</p>` +
    (res.length ? res.map(o => `<div class="mb-3">${btnReceta(o.r)}<p class="text-[11px] text-rose-700 mt-1">Aprovecha: ${o.usa.map(u => esc(u.prod) + ' (' + dd(u.d) + ')').join(', ')}</p><p class="text-[11px] ${o.falta ? 'text-amber-700' : 'text-emerald-700'}">${o.falta ? 'Te faltan ' + o.falta + ' ingrediente(s)' : 'Tienes todos los ingredientes'}</p></div>`).join('') : '<p class="text-xs text-slate-500">Ninguna de tus recetas usa esos productos. Prueba a pedir recetas a una IA con ellos.</p>') +
    '<p class="text-[10px] text-slate-400">Se cruzan los nombres de los ingredientes de las recetas con los productos del inventario que tienen fecha.</p>';
}