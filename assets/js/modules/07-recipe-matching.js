/* ===== v2.5: recetas con todo disponible frente a recetas a las que les falta algo ===== */
const BASICOS = /^(sal|aceite|agua|pimienta|vinagre|especias?)\b/;
const nombresStock = () => STOCK.filter(s => !['limpieza', 'mascotas'].includes(s.loc)).map(s => sinAc(s.prod));
const reqDe = r => {
  if (r.i && r.i.length) return clavesDe(r).filter(k => !BASICOS.test(k));
  const t = sinAc(r.n + ' ' + r.p.map(x => x.t).join(' '));
  return (r.k || []).filter(k => t.includes(k) && !BASICOS.test(k));
};
const faltantes = (r, ns) => reqDe(r).filter(k => !ns.some(n => n.includes(k) || (n.length > 2 && k.includes(n))));
const btnReceta = (x, extra) => { const t = TIPOI[x.tipo] || ['fa-utensils', '#566359'], k = (x.i || []).map(normIng).reduce((a, g) => a + (g.k || 0), 0), kc = k ? Math.round(k / (+x.rac || 2)) : 0; return `<button onclick="verReceta('${x.id}')" class="rec-tile w-full text-left ${extra ? 'rec-warn' : ''}"><span class="rec-ico" style="background:${t[1]}"><i class="fa-solid ${t[0]}"></i></span><span class="min-w-0"><b class="block truncate">${esc(x.n)}</b><span class="text-xs text-slate-500">${x.fav ? '♥ ' : ''}${esc(x.tipo || 'receta')}, ${+x.rac || 2} raciones${kc ? ', ' + kc + ' kcal' : ''}</span></span></button>`; };
function buscarRecetas(todo) {
  if (todo) { $('chef-res').innerHTML = todas().map(x => btnReceta(x)).join(''); return; }
  const sel = selActual().map(sinAc).filter(x => x.length > 2);
  if (sel.length < 2) return ($('chef-res').innerHTML = '<p class="text-xs text-amber-600">Selecciona al menos 2 ingredientes.</p>');
  const ns = nombresStock(), ok = [], falta = [];
  todas().forEach(x => {
    const c = clavesDe(x).filter(k => sel.some(s => s.includes(k) || k.includes(s))).length;
    if (c < 2) return;
    const f = faltantes(x, ns); (f.length ? falta : ok).push({ x, c, f });
  });
  ok.sort((a, b) => b.c - a.c); falta.sort((a, b) => a.f.length - b.f.length || b.c - a.c);
  let h = `<p class="font-bold text-emerald-700 text-sm mb-1">✅ Puedes cocinarlas ya (${ok.length})</p>` + (ok.length ? `<div class="space-y-2 mb-4">${ok.map(o => btnReceta(o.x)).join('')}</div>` : '<p class="text-xs text-slate-400 mb-4">Ninguna receta tiene todos sus ingredientes en el inventario.</p>');
  h += `<p class="font-bold text-amber-700 text-sm mb-1">🛒 Con tus ingredientes, pero te falta algo (${falta.length})</p>` + (falta.length ? falta.map(o => `<div class="mb-2">${btnReceta(o.x, 1)}<p class="text-[11px] text-amber-800 mt-1">Falta: ${esc(o.f.join(', '))} <button onclick="faltaCompra('${o.x.id}')" class="underline font-bold ml-1">Añadir a la compra</button></p></div>`).join('') : '<p class="text-xs text-slate-400">Ninguna.</p>');
  h += '<p class="text-[10px] text-slate-400 mt-3">En las recetas de ejemplo los ingredientes se estiman a partir de sus pasos y no incluyen cantidades. Sal, aceite, agua, pimienta y vinagre se dan por disponibles.</p>';
  $('chef-res').innerHTML = h;
}
function faltaCompra(id) {
  const r = getRec(id), ns = nombresStock(), f = faltantes(r, ns), ya = COMPRA.filter(c => !c.hecho).map(c => sinAc(c.n)); let n = 0;
  f.filter(k => !ya.some(y => y.includes(k))).forEach(k => { fb.addCompra({ n: k.charAt(0).toUpperCase() + k.slice(1), hecho: false, t: Date.now() }); n++; });
  alert(n ? n + ' producto(s) añadidos a la lista de la compra.' : 'Todo lo que falta ya estaba en la lista de la compra.');
}