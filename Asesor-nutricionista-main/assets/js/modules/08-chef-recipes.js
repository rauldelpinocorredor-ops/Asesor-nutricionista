/* ===== v3.0: recetas en la nube con ingredientes estructurados, escalado, faltantes, favoritas, cocina guiada y copia ===== */
RECETAS.length = 0;
const SEM = [["Arroz con pollo", "comida", ["mediterránea"], 4, [["pechuga de pollo", 500, "g", 550], ["arroz", 300, "g", 1050], ["cebolla", 1, "ud", 60], ["pimiento rojo", 1, "ud", 45], ["tomate triturado", 200, "g", 40], ["caldo de pollo", 600, "ml", 15], ["aceite de oliva", 30, "ml", 270], ["sal", null, "", 0]], ["Trocea el pollo y dóralo con el aceite 6 min.", "Añade cebolla y pimiento picados y rehoga 5 min.", "Incorpora el tomate y el arroz y rehoga 1 min.", "Añade el caldo caliente y cuece 18 min.", "Deja reposar 5 min y sirve."]], ["Lentejas estofadas", "comida", ["vegetariana", "vegana", "mediterránea"], 4, [["lentejas", 300, "g", 1050], ["zanahoria", 2, "ud", 60], ["cebolla", 1, "ud", 60], ["patata", 1, "ud", 150], ["ajo", 2, "ud", 8], ["pimentón dulce", 1, "cdta", 6], ["aceite de oliva", 30, "ml", 270], ["agua", 1000, "ml", 0]], ["Sofríe cebolla, ajo y zanahoria picados con el aceite 8 min.", "Añade el pimentón, las lentejas, la patata en dados y el agua.", "Cuece a fuego suave 30 min (20 min en olla exprés).", "Rectifica de sal y sirve."]], ["Tortilla de patata", "cena", ["vegetariana", "mediterránea"], 4, [["huevos", 6, "ud", 430], ["patata", 600, "g", 460], ["cebolla", 1, "ud", 60], ["aceite de oliva", 60, "ml", 540], ["sal", null, "", 0]], ["Pela y corta la patata y la cebolla en láminas finas.", "Pocha ambas en el aceite 15 min a fuego medio y escurre.", "Mezcla con los huevos batidos y sal.", "Cuaja 4 min por cada lado."]], ["Merluza al horno con patatas", "cena", ["mediterránea"], 2, [["merluza", 400, "g", 320], ["patata", 400, "g", 300], ["cebolla", 1, "ud", 60], ["limón", 1, "ud", 20], ["aceite de oliva", 30, "ml", 270]], ["Precalienta el horno a 200 °C.", "Hornea la patata y la cebolla en rodajas con aceite 20 min.", "Coloca la merluza encima con el limón y hornea 12 min."]], ["Pasta con tomate", "comida", ["vegetariana", "vegana"], 4, [["pasta", 320, "g", 1120], ["tomate triturado", 400, "g", 80], ["ajo", 2, "ud", 8], ["aceite de oliva", 30, "ml", 270], ["sal", null, "", 0]], ["Cuece la pasta según el envase (unos 10 min).", "Sofríe el ajo laminado 1 min y añade el tomate; cuece 8 min.", "Mezcla con la pasta y sirve."]], ["Crema de calabacín", "cena", ["vegetariana", "mediterránea"], 4, [["calabacín", 800, "g", 136], ["patata", 200, "g", 150], ["cebolla", 1, "ud", 60], ["queso en porciones", 3, "ud", 150], ["aceite de oliva", 15, "ml", 135], ["agua", 600, "ml", 0]], ["Pocha la cebolla con el aceite 5 min.", "Añade calabacín y patata troceados y el agua; cuece 20 min.", "Tritura con el queso hasta obtener una crema fina."]], ["Salmón a la plancha con verduras", "cena", ["mediterránea"], 2, [["salmón", 300, "g", 600], ["calabacín", 1, "ud", 42], ["pimiento rojo", 1, "ud", 45], ["aceite de oliva", 15, "ml", 135], ["sal", null, "", 0]], ["Corta la verdura en tiras y saltéala 6 min.", "Cocina el salmón a la plancha 4 min por el lado de la piel.", "Dale la vuelta y cocina 2 min más; sirve con la verdura."]], ["Garbanzos con espinacas", "comida", ["vegetariana", "vegana", "mediterránea"], 4, [["garbanzos cocidos", 800, "g", 1120], ["espinacas", 400, "g", 92], ["ajo", 3, "ud", 12], ["pimentón dulce", 1, "cdta", 6], ["aceite de oliva", 30, "ml", 270]], ["Dora el ajo laminado con el aceite 1 min.", "Añade el pimentón y las espinacas y saltea 3 min.", "Incorpora los garbanzos y cuece 8 min."]], ["Avena con fruta", "desayuno", ["vegetariana"], 2, [["copos de avena", 80, "g", 300], ["leche", 400, "ml", 190], ["plátano", 1, "ud", 90]], ["Calienta la leche con la avena 5 min removiendo.", "Añade el plátano troceado y sirve."]], ["Pollo al horno con patatas", "comida", ["mediterránea"], 4, [["pollo troceado", 1000, "g", 1700], ["patata", 800, "g", 600], ["ajo", 4, "ud", 16], ["limón", 1, "ud", 20], ["aceite de oliva", 40, "ml", 360]], ["Precalienta el horno a 190 °C.", "Coloca el pollo y las patatas en una bandeja con ajo, limón y aceite.", "Hornea 50 min dándoles la vuelta a mitad."]]];
const parseIng = l => { const m = /^\s*(\d+(?:[.,]\d+)?)\s*(kg|g|ml|l|cdas?|cdtas?|uds?|unidades?|dientes?)?\.?\s*(?:de\s+)?(.+)$/i.exec(l); return m ? { n: m[3].trim(), c: +m[1].replace(',', '.'), u: (m[2] || 'ud').toLowerCase().replace(/^uds?$|^unidades?$/, 'ud'), k: null } : { n: String(l).trim(), c: null, u: '', k: null }; };
const num = v => (v == null || v === '' || isNaN(+v)) ? null : +v;
const normIng = x => typeof x === 'string' ? parseIng(x) : { n: String(x.n || x.nombre || '').slice(0, 80), c: num(x.c != null ? x.c : x.cantidad), u: String(x.u || x.unidad || '').slice(0, 12), k: num(x.k != null ? x.k : x.kcal) };
function fmtQ(c, u) {
  if (c == null) return ''; if (u === 'g' && c >= 1000) { c /= 1000; u = 'kg'; } else if (u === 'ml' && c >= 1000) { c /= 1000; u = 'l'; }
  const r = (u === 'g' || u === 'ml') ? (c >= 20 ? Math.round(c / 5) * 5 : Math.round(c * 10) / 10) : Math.round(c * 4) / 4;
  return String(r).replace('.', ',') + ' ' + (u || 'ud');
}
const ingTxt = g => (g.c != null ? fmtQ(g.c, g.u) + ' de ' : '') + g.n;
const aBase = (c, u) => u === 'kg' ? { v: c * 1000, u: 'g' } : u === 'l' ? { v: c * 1000, u: 'ml' } : u === 'rac' ? { v: c, u: 'ud' } : { v: c, u };
const stockDe = nom => { const k = sinAc(nom); return STOCK.filter(s => { const n = sinAc(s.prod); return n.includes(k) || (n.length > 2 && k.includes(n)); }); };
function estadoIng(g, f) {
  if (BASICOS.test(sinAc(g.n))) return { e: 'basico' };
  const L = stockDe(g.n); if (!L.length) return { e: 'falta' };
  const fr = L.every(s => /^(cocina|sotano)/.test(s.loc));
  if (g.c == null || !g.u) return { e: 'ok', fr };
  const nb = aBase(g.c * f, g.u); let tot = 0, comp = false;
  L.forEach(s => { const b = aBase(s.cant, s.ud); if (b.u === nb.u) { tot += b.v; comp = true; } });
  if (!comp) return { e: 'ok', nc: 1, fr };
  return tot + 1e-6 >= nb.v ? { e: 'ok', fr } : { e: 'poco', falta: nb.v - tot, u: nb.u, fr };
}

/* Visor de receta */
let VS = null, FAL = [], CK = null, WL2 = null;
function verReceta(id) { const r = getRec(id); if (!r) return; VR = r; VS = { id, rac: +r.rac || 2 }; pintaReceta(); abrir('m-receta'); }
function cambiaRac(d) { VS.rac = Math.max(1, Math.min(30, VS.rac + d)); pintaReceta(); }
function pintaReceta() {
  const r = VR, f = VS.rac / (+r.rac || 2), ing = (r.i || []).map(normIng), ia = VS.id === 'ia';
  const rows = ing.map(g => ({ g, e: estadoIng(g, f) })); FAL = rows.filter(x => x.e.e === 'falta' || x.e.e === 'poco');
  const kt = ing.reduce((a, g) => a + (g.k || 0), 0), conK = ing.some(g => g.k != null);
  $('m-tit').textContent = r.n;
  let h = ia ? '<p class="text-[11px] bg-amber-50 border border-amber-200 rounded-lg p-2 mb-2">Receta generada por IA: revisa alérgenos, cantidades, calorías y tiempos antes de cocinar.</p>' : '';
  h += `<div class="flex items-center justify-between mb-2">${ia ? '<span></span>' : `<button onclick="toggleFav()" class="text-3xl ${r.fav ? 'text-red-500' : 'text-slate-300'}">♥</button>`}<div class="flex items-center gap-2 text-sm"><button onclick="cambiaRac(-1)" class="w-9 h-9 rounded-full bg-slate-100 font-bold text-lg">−</button><b>${VS.rac}</b> raciones<button onclick="cambiaRac(1)" class="w-9 h-9 rounded-full bg-slate-100 font-bold text-lg">+</button></div></div>`;
  if (conK) h += `<p class="text-xs text-slate-500 mb-2">≈ ${Math.round(kt / (+r.rac || 2))} kcal por ración <span class="text-slate-400">(estimadas, sin verificar)</span></p>`;
  if (ing.length) {
    h += '<div class="bg-slate-50 rounded-xl p-3 text-xs mb-2"><p class="font-bold mb-1">Ingredientes</p>' + rows.map(x => {
      const q = x.g.c != null ? fmtQ(x.g.c * f, x.g.u) + ' de ' : '', i = FAL.indexOf(x), e = x.e;
      const cls = e.e === 'falta' ? 'text-red-700 font-bold' : e.e === 'poco' ? 'text-amber-700 font-bold' : e.e === 'basico' ? 'text-slate-400' : 'text-emerald-700';
      const nota = e.e === 'falta' ? ' · no lo tienes' : e.e === 'poco' ? ' · te faltan ' + fmtQ(e.falta, e.u) : e.fr ? ' · en el congelador' : e.nc ? ' · lo tienes (cantidad sin comparar)' : '';
      return `<div class="flex justify-between items-center py-0.5 ${cls}"><span>${esc(q + x.g.n)}${nota}</span>${i >= 0 ? `<button onclick="addFaltaUno(${i})" class="ml-2 underline shrink-0">+ compra</button>` : ''}</div>`;
    }).join('') + (FAL.length ? `<button onclick="addFaltaTodo()" class="w-full mt-2 bg-red-600 text-white rounded-lg py-1.5 font-bold">Añadir lo que falta a la lista de la compra (${FAL.length})</button>` : '') + '</div>';
  }
  if (!ia) h += `<textarea rows="2" placeholder="Notas de la familia (ej. menos sal)…" onchange="guardaNota(this.value)" class="w-full p-2 border rounded-lg text-xs mb-2">${esc(r.nota || '')}</textarea>`;
  h += r.p.map((st, i) => `<div class="flex gap-2 items-start py-1.5"><input type="checkbox" class="mt-0.5 w-5 h-5 accent-emerald-600 shrink-0" onchange="this.nextElementSibling.classList.toggle('line-through',this.checked)"><div class="flex-1"><p><b>${i + 1}.</b> ${esc(st.t)}</p>${st.m ? `<button onclick="iniciarTimerPaso(${i})" class="mt-1 text-xs bg-emerald-600 text-white rounded-full px-3 py-1 font-bold">⏱ Temporizador ${+st.m} min</button>` : ''}</div></div>`).join('');
  $('m-cuerpo').innerHTML = h;
  const id = VS.id;
  $('m-acc').innerHTML = `<button onclick="cocinaAbrir()" class="w-full bg-slate-900 text-white py-3 rounded-xl font-bold text-sm">👨‍🍳 Modo cocina (pantalla completa)</button>` + (ia ? '<button onclick="guardarIA()" class="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl font-bold text-sm">Guardar en mis recetas</button>' : `<button onclick="formReceta('${id}')" class="flex-1 bg-slate-100 py-2.5 rounded-xl font-bold text-sm">Editar</button><button onclick="borrarReceta('${id}')" class="px-4 bg-red-50 text-red-600 py-2.5 rounded-xl font-bold text-sm">Eliminar</button>`);
  $('m-acc').className = 'flex flex-wrap gap-2 mt-4 mb-16';
}
function guardaRec(r) { fb.setReceta(r.id, recData(r)); }
function toggleFav() { VR.fav = !VR.fav; guardaRec({ ...VR, id: VS.id }); pintaReceta(); }
function guardaNota(v) { VR.nota = v; guardaRec({ ...VR, id: VS.id }); }
function addCompraIng(x) {
  const ya = COMPRA.filter(c => !c.hecho).map(c => sinAc(c.n)), k = sinAc(x.g.n); if (ya.some(y => y.includes(k))) return false;
  const f = VS.rac / (+VR.rac || 2), t = x.e.e === 'poco' ? fmtQ(x.e.falta, x.e.u) : (x.g.c != null ? fmtQ(x.g.c * f, x.g.u) : '');
  fb.addCompra({ n: x.g.n.charAt(0).toUpperCase() + x.g.n.slice(1) + (t ? ' — ' + t : ''), hecho: false, t: Date.now() }); return true;
}
const addFaltaUno = i => alert(addCompraIng(FAL[i]) ? 'Añadido a la lista de la compra.' : 'Ya estaba en la lista de la compra.');
const addFaltaTodo = () => { const n = FAL.filter(x => addCompraIng(x)).length; alert(n ? n + ' producto(s) añadidos a la lista.' : 'Todo ya estaba en la lista.'); };
const verFavs = () => { const l = S.rec.filter(r => r.fav); $('chef-res').innerHTML = l.length ? l.map(x => btnReceta(x)).join('') : '<p class="text-xs text-slate-500">Aún no has marcado favoritas (♥ dentro de una receta).</p>'; };

/* Modo cocina */
function cocinaAbrir() { CK = { i: -1 }; $('m-ck').classList.remove('hidden'); $('m-ck').classList.add('flex'); $('timers').style.zIndex = 95; try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then(w => { WL2 = w; }).catch(() => {}); } catch (e) {} pintaCK(); }
function cocinaCerrar() { $('m-ck').classList.add('hidden'); $('m-ck').classList.remove('flex'); $('timers').style.zIndex = ''; if (WL2) { WL2.release().catch(() => {}); WL2 = null; } }
function ckMov(d) { const n = VR.p.length; if (CK.i >= n && d > 0) return cocinaCerrar(); CK.i = Math.max(-1, Math.min(n, CK.i + d)); pintaCK(); }
function pintaCK() {
  const n = VR.p.length, i = CK.i, f = VS.rac / (+VR.rac || 2); let b = '', t = '';
  if (i < 0) b = `<p class="text-xl font-bold mb-3">Ingredientes · ${VS.rac} raciones</p>` + (VR.i || []).map(normIng).map(g => `<p class="text-2xl mb-1">• ${esc((g.c != null ? fmtQ(g.c * f, g.u) + ' de ' : '') + g.n)}</p>`).join('');
  else if (i >= n) b = '<p class="text-4xl font-bold text-center mt-16">¡Listo! 🎉</p>';
  else { const s = VR.p[i]; b = `<p class="text-sm text-slate-400 mb-2">Paso ${i + 1} de ${n}</p><p class="text-3xl leading-snug">${esc(s.t)}</p>`; if (s.m) t = `<button onclick="iniciarTimerPaso(${i})" class="w-full bg-emerald-600 rounded-2xl py-5 text-2xl font-bold">⏱ Temporizador ${+s.m} min</button>`; }
  $('ck-body').innerHTML = b; $('ck-tm').innerHTML = t; $('ck-t').textContent = VR.n;
}

/* Prompts y lectura de recetas de IA con ingredientes estructurados */
const FMT = 'Cada ingrediente es un objeto {"nombre":"arroz","cantidad":200,"unidad":"g","kcal":700} donde "unidad" es g, ml, ud, cda o cdta y "kcal" son las kcal totales estimadas de esa cantidad (null si no aplica). Cada paso es {"texto":"...","minutos":10} con "minutos" entero si hay cocción o espera y null si no. Pasos cortos y claros. Indica alérgenos comunes en el último paso.';
const _pi = promptIA; promptIA = () => _pi().replace(/Responde SOLO[\s\S]*$/, 'Responde SOLO con JSON válido, sin texto adicional, con este formato exacto: {"nombre":"...","tipo":"desayuno|comida|cena|merienda|postre","dietas":["mediterránea"],"raciones":2,"ingredientes":[...],"pasos":[...]}. ' + FMT);
const _pl = promptLote; promptLote = () => _pl().replace(/Responde SOLO[\s\S]*$/, 'Responde SOLO con un array JSON válido, sin texto adicional, de objetos con este formato exacto: {"nombre":"...","tipo":"desayuno|comida|cena|merienda|postre","dietas":["mediterránea"],"raciones":2,"ingredientes":[...],"pasos":[...]}. ' + FMT + ' No repitas recetas. Pon una dieta en "dietas" solo si la receta la cumple de verdad.');
function parseReceta(txt) {
  const a = txt.indexOf('{'), b = txt.lastIndexOf('}'); if (a < 0 || b <= a) throw new Error('no encuentro una receta en JSON.');
  const j = JSON.parse(txt.slice(a, b + 1));
  const p = (Array.isArray(j.pasos) ? j.pasos : []).slice(0, 30).map(x => { let t = String(typeof x === 'string' ? x : (x && x.texto) || '').trim().slice(0, 400); const m0 = x && typeof x === 'object' ? Math.round(+x.minutos) : NaN; if (Number.isFinite(m0) && m0 > 0 && m0 <= 600 && !minDe(t)) t += ` (${m0} min)`; return { t, m: minDe(t) }; }).filter(x => x.t);
  if (!j.nombre || !p.length) throw new Error('la receta está incompleta.');
  return { id: 'ia', n: String(j.nombre).slice(0, 80), rac: +j.raciones || 2, i: (Array.isArray(j.ingredientes) ? j.ingredientes : []).slice(0, 40).map(normIng).filter(g => g.n), p, tipo: String(j.tipo || '').slice(0, 20), dietas: Array.isArray(j.dietas) ? j.dietas.slice(0, 6).map(v => String(v).slice(0, 20)) : [] };
}
function formReceta(id) { editId = id || null; const r = id ? getRec(id) : null; $('rf-n').value = r ? r.n : ''; $('rf-i').value = r && r.i ? r.i.map(normIng).map(ingTxt).join('\n') : ''; $('rf-p').value = r ? r.p.map(x => x.t).join('\n') : ''; cerrar('m-receta'); abrir('m-form'); }
function guardarForm() {
  const n = $('rf-n').value.trim(), i = lineas($('rf-i').value).map(parseIng), p = lineas($('rf-p').value);
  if (!n || !p.length) return alert('Pon un nombre y al menos un paso.');
  const old = editId ? getRec(editId) : null, prev = old ? (old.i || []).map(normIng) : [];
  const r = { ...(old || {}), id: editId || 'c' + Date.now(), n, rac: old ? (+old.rac || 2) : 2, i: i.map(g => { const o = prev.find(x => sinAc(x.n) === sinAc(g.n)); return { ...g, k: o ? o.k : null }; }), p: p.map(t => ({ t, m: minDe(t) })) };
  guardaRec(r); S.rec = editId ? S.rec.map(x => x.id === editId ? r : x) : [...S.rec, r]; cerrar('m-form'); verReceta(r.id);
}
function guardarIA() { const r = { ...RIA, id: 'c' + Date.now() }; guardaRec(r); S.rec = [...S.rec, r]; verReceta(r.id); }

/* Recetas base en la nube */
function pintaSem() { $('sem-box').innerHTML = S.rec.length ? '' : `<button onclick="cargarSem()" class="w-full bg-amber-100 text-amber-800 rounded-xl p-3 text-xs font-bold">Cargar las ${SEM.length} recetas base (ingredientes con cantidades y kcal estimadas)</button>`; }
function cargarSem() { SEM.forEach(([n, tipo, dietas, rac, ing, pasos], i) => { const r = { id: 'c-sem' + (i + 1), n, tipo, dietas, rac, i: ing.map(([n2, c, u, k]) => ({ n: n2, c, u, k })), p: pasos.map(t => ({ t, m: minDe(t) })) }; guardaRec(r); S.rec.push(r); }); pintaSem(); }
const _or = window.onRecetas; window.onRecetas = l => { _or(l); pintaSem(); };
pintaSem();

/* Copia de seguridad */
function exportar() { const d = { v: 3, t: Date.now(), mov: MOVS, compra: COMPRA, recetas: S.rec, plan: PLAN, colegio: COLE, ignorados: IGN, alias: ALIAS }, a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(d)], { type: 'application/json' })); a.download = 'asesor-copia-' + ymd(new Date()) + '.json'; a.click(); }
async function importar(inp) {
  const f = inp.files[0]; if (!f) return;
  try {
    const d = JSON.parse(await f.text()); if (!confirm('Se restaurarán los datos de la copia (no se borra lo que ya hay). ¿Continuar?')) return;
    let n = 0; Object.entries({ mov: d.mov, compra: d.compra, recetas: d.recetas, plan: d.plan, colegio: d.colegio, ignorados: d.ignorados, alias: d.alias }).forEach(([c, l]) => (l || []).forEach(x => { const { id, ...r } = x; if (id && /^[\w%.~-]{1,210}$/.test(id)) { fb.set(c, id, r); n++; } }));
    alert(n + ' registros restaurados.');
  } catch (e) { alert('Archivo no válido.'); }
  inp.value = '';
}
const _est = estado; estado = function () { _est(); $('sync-estado').insertAdjacentHTML('beforeend', ' · <button onclick="exportar()" class="underline">copia</button> · <label class="underline cursor-pointer">restaurar<input type="file" accept="application/json" class="hidden" onchange="importar(this)"></label>'); };