/* ===== v3.1.1: importación de recetas tolerante a los formatos de cada IA ===== */
function extraeObjetos(txt) {
  const t = txt.replace(/```[a-zA-Z]*/g, ''), out = []; let depth = 0, inStr = false, esc = false, buf = '';
  for (const ch of t) {
    if (depth === 0) { if (ch === '{') { depth = 1; buf = '{'; } continue; }
    if (inStr) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') inStr = false; buf += /[\n\r\t]/.test(ch) ? ' ' : ch; continue; }
    buf += ch;
    if (ch === '"') inStr = true; else if (ch === '{') depth++; else if (ch === '}') { depth--; if (!depth) { out.push(buf); buf = ''; } }
  }
  return out;
}
const arreglaJSON = x => x.replace(/(^|[\s,])\/\/[^\n]*$/gm, '$1').replace(/,\s*([}\]])/g, '$1').replace(/:\s*(\d+)\s*\/\s*(\d+)(?=\s*[,}\]])/g, (m, a, b) => ': ' + (a / b)).replace(/:\s*(\d+),(\d+)(?=\s*[,}\]])/g, ': $1.$2');
function extraeRecetas(txt) {
  let obs = extraeObjetos(txt); if (!obs.length) obs = extraeObjetos(txt.replace(/[“”]/g, '"'));
  const recs = [], errs = [];
  obs.forEach(o => {
    let j = null, er = null; for (const f of [x => x, arreglaJSON, x => arreglaJSON(x.replace(/[“”]/g, '"'))]) { try { j = JSON.parse(f(o)); break; } catch (e) { er = e; } }
    if (!j) return errs.push('JSON no válido (' + (er && er.message ? er.message.slice(0, 70) : '?') + ')');
    const arr = j.recetas || j.recipes; if (Array.isArray(arr)) arr.forEach(r => { if (r && typeof r === 'object') recs.push(r); }); else recs.push(j);
  });
  return { objs: recs, errs };
}
const listaDe = (v, sep) => typeof v === 'string' ? v.split(sep).map(x => x.replace(/^\s*(?:\d+[.)]|[-•*])\s*/, '').trim()).filter(Boolean) : (Array.isArray(v) ? v : []);
function parseReceta(txt) {
  const a = txt.indexOf('{'), b = txt.lastIndexOf('}'); if (a < 0 || b <= a) throw new Error('no encuentro una receta en JSON.');
  const j = JSON.parse(txt.slice(a, b + 1)), pasos = listaDe(j.pasos || j.steps || j.instrucciones || j.preparacion || [], /\n+/), ings = listaDe(j.ingredientes || j.ingredients || [], /\n+|;/);
  const p = pasos.slice(0, 30).map(x => {
    let t = String(textoPaso(x)).trim().slice(0, 400); if (!t || PASO_VACIO.test(t)) return null;
    const m0 = minPaso(x); if (m0 > 0 && m0 <= 600 && !minDe(t)) t += ` (${m0} min)`; return { t, m: minDe(t) };
  }).filter(Boolean);
  const nombre = j.nombre || j.name || j.titulo || j.receta;
  if (!nombre || !p.length) throw new Error((nombre ? '«' + String(nombre).slice(0, 30) + '»' : 'una receta') + ' no tiene pasos con texto');
  return { id: 'ia', n: String(nombre).slice(0, 80), rac: +j.raciones || +j.porciones || 2, i: ings.slice(0, 40).map(normIng).filter(g => g.n), p, tipo: String(j.tipo || '').slice(0, 20), dietas: Array.isArray(j.dietas) ? j.dietas.slice(0, 6).map(v => String(v).slice(0, 20)) : [] };
}
function importarIA() {
  try { const { objs, errs } = extraeRecetas($('ia-resp').value); if (!objs.length) throw new Error(errs[0] || 'no encuentro una receta en el texto pegado.'); RIA = parseReceta(JSON.stringify(objs[0])); cerrar('m-ia'); verReceta('ia'); }
  catch (e) { $('ia-estado').textContent = 'No se pudo importar: ' + e.message; }
}
function importarLote() {
  const { objs, errs } = extraeRecetas($('lt-resp').value);
  if (!objs.length) return ($('lt-est').textContent = 'No encontré ninguna receta en el texto pegado. ' + (errs[0] ? 'Primer error: ' + errs[0] + '.' : 'Pega la respuesta completa de la IA.'));
  const nombres = new Set(todas().map(r => sinAc(r.n))); let ok = 0, dup = 0; const mal = errs.slice();
  objs.slice(0, 25).forEach(x => {
    try {
      const r = parseReceta(JSON.stringify(x));
      if (nombres.has(sinAc(r.n))) { dup++; return; }
      r.tipo = String(x.tipo || '').slice(0, 20); r.dietas = Array.isArray(x.dietas) ? x.dietas.slice(0, 6).map(v => String(v).slice(0, 20)) : [];
      r.id = 'c' + Date.now() + ok; guardaRec(r); S.rec.push(r); nombres.add(sinAc(r.n)); ok++;
    } catch (e) { mal.push(e.message); }
  });
  $('lt-est').textContent = `Importadas ${ok} · repetidas ${dup} · con error ${mal.length}` + (mal.length ? '. Primer error: ' + mal[0] : '') + (objs.length > 25 ? '. Solo se importan 25 por vez.' : '');
}