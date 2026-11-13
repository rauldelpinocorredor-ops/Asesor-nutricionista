/* ===== v2.4: menú del cole, búsquedas, compra seleccionada, recetas desde los menús ===== */
const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', PDFW = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
let COLE = [], PREV = null, PLT = [], CSQ = [], CSI = null, PTN = '';
const platoBtn = t => { PLT.push(t); return `<button onclick="verPlato(${PLT.length - 1})" class="underline text-left text-emerald-700">${esc(t)}</button>`; };

/* Plato -> receta */
function verPlato(i) {
  const n = sinAc(PLT[i]); PTN = PLT[i];
  const best = todas().map(r => ({ r, c: clavesDe(r).filter(k => n.includes(k)).length + (sinAc(r.n).split(' ').filter(w => w.length > 3 && n.includes(w)).length) })).sort((a, b) => b.c - a.c)[0];
  if (best && best.c >= 2 || (best && best.c >= 1 && clavesDe(best.r).length <= 3)) return verReceta(best.r.id);
  $('pt-tit').textContent = 'No tengo una receta de «' + PTN + '».'; abrir('m-plato');
}
const ptCrear = () => { cerrar('m-plato'); formReceta(); $('rf-n').value = PTN; };
const ptIA = () => { cerrar('m-plato'); $('lt-tema').value = PTN; $('lt-n').value = 3; abrir('m-lote'); };
function menuAdultos() {
  const p = +$('n-pers').value || 1, dias = +$('n-dias').value, f = (+$('n-kcal').value || 2000) / 2000; let h = '';
  for (let d = 0; d < dias; d++) {
    const c = COMIDAS[d % 7], ce = COMIDAS[(d + 3) % 7];
    h += `<div class="bg-slate-50 rounded-xl p-3 text-xs"><p class="font-bold text-slate-700 mb-1">Día ${d + 1}</p><p><b>Comida:</b> ${platoBtn(c[0])}<br><span class="text-slate-500">por persona: ${esc(escala(c[1], f))}</span></p><p class="mt-1"><b>Cena:</b> ${platoBtn(ce[0])}<br><span class="text-slate-500">por persona: ${esc(escala(ce[1], f * .8))}</span></p></div>`;
  }
  $('n-res').innerHTML = `<p class="text-xs text-slate-500">Para ${p} comensal(es). Pulsa un plato para ver su receta.</p>` + h;
}
function menuBebe() {
  const m = [['b-des', 'Desayuno', 'Leche o fórmula + fruta o cereales sin azúcar'], ['b-mer', 'Merienda', 'Fruta troceada o yogur natural'], ['b-cen', 'Cena', 'Verduras con proteína suave (pescado, huevo, pollo) + fruta']];
  $('b-res').innerHTML = m.filter(x => $(x[0]).checked).map(x => `<div class="bg-slate-50 rounded-xl p-3 text-xs"><b>${x[1]}:</b> ${platoBtn(x[2])}</div>`).join('') || '<p class="text-xs text-slate-400">Sin comidas en casa seleccionadas.</p>';
}

/* Buscar receta, editar copia */
function buscaReceta() {
  const q = sinAc($('ch-q').value.trim()); if (!q) { $('chef-res').innerHTML = ''; return; }
  const r = todas().filter(x => sinAc(x.n).includes(q));
  $('chef-res').innerHTML = r.length ? r.map(x => `<button onclick="verReceta('${x.id}')" class="w-full text-left bg-emerald-50 border border-emerald-100 rounded-xl p-3 font-medium text-emerald-800 text-sm">${esc(x.n)}</button>`).join('') : '<p class="text-xs text-slate-500">Ninguna receta con ese nombre.</p>';
}
const _vr = verReceta; verReceta = function (id) { _vr(id); if (id[0] === 'b') $('m-acc').innerHTML = `<button onclick="editarCopia('${id}')" class="flex-1 bg-slate-100 py-2.5 rounded-xl font-bold text-sm">Editar (guarda una copia tuya)</button>`; };
const editarCopia = id => { formReceta(id); editId = null; };

/* Buscar alimento */
function abrirBus() { $('bus-q').value = ''; busca(); abrir('m-bus'); setTimeout(() => $('bus-q').focus(), 60); }
function busca() {
  const raw = $('bus-q').value.trim(), q = sinAc(raw);
  if (!q) return ($('bus-res').innerHTML = '<p class="text-xs text-slate-400">Escribe el nombre de un alimento.</p>');
  const r = STOCK.filter(s => sinAc(s.prod).includes(q)).sort((a, b) => a.prod.localeCompare(b.prod));
  const enLista = COMPRA.some(c => !c.hecho && sinAc(c.n).includes(q));
  $('bus-res').innerHTML = r.length ? r.map(s => `<div class="bg-slate-50 rounded-lg p-2 text-sm"><b>${esc(s.prod)}</b> · ${fmtC(s)}<br><span class="text-xs text-slate-500">${esc(LOCS[s.loc])}${s.cad ? ' · caduca ' + esc(s.cad) : ''}</span></div>`).join('')
    : `<p class="text-sm text-amber-700">No hay «${esc(raw)}» en el inventario.${enLista ? ' Está en la lista de la compra.' : ''}</p>`;
}

/* Compra seleccionada -> inventario */
function compraSel() { CSQ = COMPRA.filter(c => c.hecho); if (!CSQ.length) return alert('Marca primero con la casilla lo que ya has comprado.'); CSN = CSQ.length; csNext(); }
let CSN = 0;
function csNext() {
  CSI = CSQ.shift(); if (!CSI) { cerrar('m-cs'); return render(); }
  $('cs-pos').textContent = (CSN - CSQ.length) + ' de ' + CSN; $('cs-tit').textContent = CSI.n;
  $('cs-loc').innerHTML = optsLoc(); $('cs-loc').value = tkLoc(CSI.n); $('cs-cant').value = 1; $('cs-ud').value = 'ud'; $('cs-cad').value = ''; abrir('m-cs');
}
function csOk() {
  const q = +$('cs-cant').value; if (!(q > 0)) return alert('Pon una cantidad.');
  mov({ prod: CSI.n, cod: '', cant: q, ud: $('cs-ud').value, cad: $('cs-cad').value, fmt: '', img: '', ns: '', de: '', a: $('cs-loc').value, tipo: 'alta', nota: 'compra' });
  fb.delCompra(CSI.id); csNext();
}

/* Menú del cole: lectura del PDF por posiciones */
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
function parseCole(items) {
  const it = items.map(t => ({ s: String(t.str || '').trim(), x: t.transform[4], y: t.transform[5], h: Math.abs(t.transform[3]) })).filter(t => t.s);
  const hs = it.map(t => t.h).sort((a, b) => a - b), med = hs[hs.length >> 1], thr = med * 1.15;
  const mm = new RegExp('(' + MESES.join('|') + ')\\s+(20\\d\\d)', 'i').exec(it.map(t => t.s).join(' '));
  if (!mm) throw new Error('no encuentro el mes y el año en el PDF');
  const mes = MESES.indexOf(mm[1].toLowerCase()) + 1, anio = +mm[2];
  const nums = it.filter(t => /^\d{1,2}$/.test(t.s) && +t.s >= 1 && +t.s <= 31 && t.h >= thr && t.h <= med * 1.6);
  const cl = (arr, tol) => { const o = []; arr.forEach(v => { if (!o.some(c => Math.abs(c - v) < tol)) o.push(v); }); return o; };
  const cx = cl(nums.map(n => n.x), 6).sort((a, b) => a - b), ry = cl(nums.map(n => n.y), 4).sort((a, b) => b - a);
  if (cx.length !== 5) throw new Error('el calendario no tiene el formato esperado (' + cx.length + ' columnas)');
  const w = cx[1] - cx[0], out = {};
  nums.forEach(n => {
    const c = cx.findIndex(v => Math.abs(v - n.x) < 6), r = ry.findIndex(v => Math.abs(v - n.y) < 4), yBot = r + 1 < ry.length ? ry[r + 1] + 4 : 70;
    const cell = it.filter(t => t.h < thr && t.x >= cx[c] - 3 && t.x < cx[c] + w - 2 && t.y < n.y - 6 && t.y > yBot);
    const lines = {}; cell.forEach(t => { (lines[Math.round(t.y / 2)] = lines[Math.round(t.y / 2)] || []).push(t); });
    const L = Object.keys(lines).map(Number).sort((a, b) => b - a).map(k => lines[k].sort((a, b) => a.x - b.x).map(t => t.s).join(' ').replace(/\s+/g, ' ').trim());
    const items2 = []; L.forEach(l => { if (items2.length && (/^[a-záéíóúñ(]/.test(l))) items2[items2.length - 1] += ' ' + l; else items2.push(l); });
    out[+n.s] = items2;
  });
  return { anio, mes, dias: out };
}
async function colePDF(inp) {
  const f = inp.files[0]; if (!f) return; $('co-est').textContent = 'Leyendo PDF…';
  try {
    if (!window.pdfjsLib) { await cargarScript(PDFJS); pdfjsLib.GlobalWorkerOptions.workerSrc = PDFW; }
    const pdf = await pdfjsLib.getDocument({ data: await f.arrayBuffer(), isEvalSupported: false }).promise, tc = await (await pdf.getPage(1)).getTextContent();
    PREV = parseCole(tc.items); const n = Object.keys(PREV.dias).length;
    $('co-est').textContent = `${n} días de ${MESES[PREV.mes - 1]} ${PREV.anio}. Revisa y guarda:`;
    $('co-prev').innerHTML = Object.keys(PREV.dias).map(Number).sort((a, b) => a - b).map(d => `<div class="bg-white rounded-lg p-2 mb-1 text-[11px]"><b>${d}</b>: ${esc(PREV.dias[d].join(' · '))}</div>`).join('') + `<button onclick="coleGuardar()" class="w-full bg-emerald-600 text-white py-2 rounded-lg text-xs font-bold mt-1 mb-2">Guardar menú del mes</button>`;
  } catch (e) { $('co-est').textContent = 'No se pudo leer el PDF: ' + (e.message || e) + '. Puedes añadir los días a mano.'; }
  inp.value = '';
}
function coleGuardar() {
  Object.keys(PREV.dias).forEach(d => { const it = PREV.dias[d]; if (!it.length) return; const f = PREV.anio + '-' + String(PREV.mes).padStart(2, '0') + '-' + String(d).padStart(2, '0'); fb.set('colegio', f, { fecha: f, items: it, t: Date.now() }); });
  $('co-prev').innerHTML = ''; $('co-est').textContent = 'Menú guardado y sincronizado.'; PREV = null;
}
function coleManual() { const f = $('co-f').value, it = lineas($('co-t').value); if (!f || !it.length) return alert('Pon la fecha y al menos un plato.'); fb.set('colegio', f, { fecha: f, items: it, t: Date.now() }); $('co-t').value = ''; }
function cenaEspejo(items) {
  const t = sinAc(items.join(' ')), r = [];
  if (/pescad|merluza|rape|bacalao|salmon|lubina|dorada/.test(t)) r.push('huevo o carne blanca (pollo, pavo o conejo)');
  if (/pollo|lomo|cerdo|ternera|carne|hamburguesa|albondiga|ragout|filete|jamon/.test(t)) r.push('pescado (blanco o azul) o huevo');
  if (/pasta|macarron|arroz|lenteja|garbanzo|alubia|fideua|cous|codito|cocido/.test(t)) r.push('verdura cocinada u hortalizas (ensalada, crema o puré)');
  if (!r.length && /verdura|judias|crema|pure|brocoli|espinaca|coliflor|calabaz|zanahoria/.test(t)) r.push('cereal o tubérculo (arroz, pasta, patata o pan integral)');
  return r;
}
function pintaCole() {
  const hoy = ymd(new Date()), L = COLE.filter(d => d.fecha >= hoy).sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(0, 7);
  $('co-lista').innerHTML = L.length ? L.map(d => {
    const dt = new Date(d.fecha + 'T12:00:00'), plato = d.items.filter(x => !/^pan( integral)? y agua$/i.test(x)), fest = d.items.length === 1 && /festivo/i.test(d.items[0]), ce = fest ? [] : cenaEspejo(plato);
    return `<div class="bg-white rounded-lg p-2 mb-2 text-xs"><p class="font-bold text-slate-700">${dt.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}</p>${plato.map(x => '<p>• ' + (fest ? esc(x) : platoBtn(x)) + '</p>').join('')}${ce.length ? `<p class="mt-1 text-sky-800"><b>Cena sugerida:</b> ${esc(ce.join(' / '))}</p>` : ''}</div>`;
  }).join('') : '<p class="text-[11px] text-slate-400">Aún no hay menú del cole guardado para los próximos días.</p>';
}
window.onCole = l => { COLE = l; pintaCole(); };