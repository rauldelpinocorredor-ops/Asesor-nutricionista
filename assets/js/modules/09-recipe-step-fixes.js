/* ===== v3.0.1: pasos importados sin texto (solo el tiempo) ===== */
const PASO_VACIO = /^\(?\s*\d+\s*(?:-\s*\d+\s*)?(?:min|minutos?)\s*\)?\.?$/i;
const dañada = r => (r.p || []).some(x => PASO_VACIO.test(String(x.t).trim()));
function textoPaso(x) {
  if (typeof x === 'string') return x; if (!x || typeof x !== 'object') return '';
  for (const k of ['texto', 'instruccion', 'instrucción', 'descripcion', 'descripción', 'paso', 'accion', 'acción', 'detalle', 'text', 'step', 'instruction', 'description']) if (typeof x[k] === 'string' && x[k].trim().length > 3) return x[k];
  const v = Object.values(x).filter(y => typeof y === 'string' && y.trim().length > 3).sort((a, b) => b.length - a.length); return v[0] || '';
}
function minPaso(x) { if (!x || typeof x !== 'object') return NaN; for (const k of ['minutos', 'minutes', 'tiempo', 'duracion', 'duración', 'min']) if (x[k] != null && x[k] !== '' && isFinite(+x[k])) return Math.round(+x[k]); return NaN; }
function parseReceta(txt) {
  const a = txt.indexOf('{'), b = txt.lastIndexOf('}'); if (a < 0 || b <= a) throw new Error('no encuentro una receta en JSON.');
  const j = JSON.parse(txt.slice(a, b + 1)), pasos = j.pasos || j.steps || j.instrucciones || j.preparacion || [], ings = j.ingredientes || j.ingredients || [];
  const p = (Array.isArray(pasos) ? pasos : []).slice(0, 30).map(x => {
    let t = String(textoPaso(x)).trim().slice(0, 400); if (!t || PASO_VACIO.test(t)) return null;
    const m0 = minPaso(x); if (m0 > 0 && m0 <= 600 && !minDe(t)) t += ` (${m0} min)`; return { t, m: minDe(t) };
  }).filter(Boolean);
  const nombre = j.nombre || j.name || j.titulo;
  if (!nombre || !p.length) throw new Error('la receta está incompleta (sin pasos con texto).');
  return { id: 'ia', n: String(nombre).slice(0, 80), rac: +j.raciones || 2, i: (Array.isArray(ings) ? ings : []).slice(0, 40).map(normIng).filter(g => g.n), p, tipo: String(j.tipo || '').slice(0, 20), dietas: Array.isArray(j.dietas) ? j.dietas.slice(0, 6).map(v => String(v).slice(0, 20)) : [] };
}
const _pi2 = promptIA; promptIA = () => _pi2() + ' IMPORTANTE: el campo "texto" de cada paso debe contener la instrucción completa; nunca pongas solo el tiempo.';
const _pl2 = promptLote; promptLote = () => _pl2() + ' IMPORTANTE: el campo "texto" de cada paso debe contener la instrucción completa; nunca pongas solo el tiempo.';
const _pr = pintaReceta; pintaReceta = function () { _pr(); if (VS.id !== 'ia' && dañada(VR)) $('m-cuerpo').insertAdjacentHTML('afterbegin', '<p class="text-[11px] bg-red-50 border border-red-200 text-red-700 rounded-lg p-2 mb-2">Esta receta tiene pasos sin descripción (fallo al importarla). Elimínala y vuelve a importarla.</p>'); };
function pintaDan() { const n = S.rec.filter(dañada).length; $('dan-box').innerHTML = n ? `<button onclick="verDan()" class="w-full bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-xs font-bold">⚠️ ${n} receta(s) con pasos sin texto: revisar</button>` : ''; }
function verDan() { const l = S.rec.filter(dañada); $('chef-res').innerHTML = l.map(x => btnReceta(x)).join('') + `<button onclick="borrarDan()" class="w-full bg-red-600 text-white rounded-lg py-2 text-xs font-bold mt-3">Eliminar estas ${l.length} recetas dañadas</button>`; }
function borrarDan() { const l = S.rec.filter(dañada); if (!l.length || !confirm('¿Eliminar ' + l.length + ' recetas con pasos sin texto? Podrás volver a importarlas.')) return; l.forEach(r => fb.delReceta(r.id)); S.rec = S.rec.filter(r => !dañada(r)); $('chef-res').innerHTML = ''; pintaDan(); }
const _or2 = window.onRecetas; window.onRecetas = l => { _or2(l); pintaDan(); }; pintaDan();