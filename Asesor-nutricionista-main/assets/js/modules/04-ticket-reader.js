/* ===== v2.2: alta por ticket (lector de texto en el móvil) ===== */
const TESS = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
let TKIMG = null, TKROT = 0, TKROWS = [];
async function tkFoto(inp) {
  const f = inp.files[0]; if (!f) return;
  try { TKIMG = await createImageBitmap(f, { imageOrientation: 'from-image' }); } catch (e) { try { TKIMG = await createImageBitmap(f); } catch (e2) { return ($('tk-est').textContent = 'No pude abrir esa imagen.'); } }
  TKROT = 0; tkPinta(); inp.value = ''; TKROWS = []; $('tk-lista').innerHTML = ''; $('tk-conf').classList.add('hidden');
  $('tk-est').textContent = 'Gira la foto hasta que el texto se lea en horizontal y pulsa «Leer ticket».';
}
function tkPinta() {
  const cv = $('tk-cv'), sc = Math.min(1, 2200 / Math.max(TKIMG.width, TKIMG.height)), w = Math.round(TKIMG.width * sc), h = Math.round(TKIMG.height * sc), r = TKROT % 2;
  cv.width = r ? h : w; cv.height = r ? w : h;
  const c = cv.getContext('2d'); c.save(); c.translate(cv.width / 2, cv.height / 2); c.rotate(TKROT * Math.PI / 2); c.drawImage(TKIMG, -w / 2, -h / 2, w, h); c.restore();
  cv.classList.remove('hidden'); $('tk-btns').classList.remove('hidden');
}
const tkGirar = () => { TKROT = (TKROT + 1) % 4; tkPinta(); };
function tkGris(cv) {
  const c = cv.getContext('2d'), d = c.getImageData(0, 0, cv.width, cv.height), a = d.data, h = new Uint32Array(256);
  for (let i = 0; i < a.length; i += 4) { const g = (a[i] * .299 + a[i + 1] * .587 + a[i + 2] * .114) | 0; a[i] = g; h[g]++; }
  const n = a.length / 4; let lo = 0, hi = 255, s = 0;
  while (lo < 254 && (s += h[lo]) < n * .02) lo++; s = 0; while (hi > 1 && (s += h[hi]) < n * .02) hi--;
  const k = 255 / Math.max(1, hi - lo);
  for (let i = 0; i < a.length; i += 4) { const v = Math.max(0, Math.min(255, (a[i] - lo) * k)); a[i] = a[i + 1] = a[i + 2] = v; }
  c.putImageData(d, 0, 0);
}
async function tkLeer() {
  if (!TKIMG) return; $('tk-est').textContent = 'Cargando el lector (la primera vez descarga varios MB)…';
  try {
    if (!window.Tesseract) await cargarScript(TESS);
    const cv = $('tk-cv'), t = document.createElement('canvas'); t.width = cv.width; t.height = cv.height; t.getContext('2d').drawImage(cv, 0, 0); tkGris(t);
    const w = await Tesseract.createWorker('spa', 1, { logger: m => { if (m.status === 'recognizing text') $('tk-est').textContent = 'Leyendo… ' + Math.round(m.progress * 100) + '%'; } });
    await w.setParameters({ tessedit_pageseg_mode: '4', preserve_interword_spaces: '1' });
    const { data } = await w.recognize(t); await w.terminate();
    TKROWS = tkParse(data.text); tkPintaLista();
    $('tk-est').textContent = TKROWS.length ? `Encontradas ${TKROWS.length} líneas. Revísalas: el lector puede equivocarse en nombres y cantidades.` : 'No encontré productos. Prueba con una foto más recta y con más luz, o añade las líneas a mano.';
  } catch (e) { $('tk-est').textContent = 'No se pudo leer el ticket: ' + (e.message || e) + '. Comprueba la conexión (la primera vez se descarga el lector).'; }
}
const TK_SKIP = /TOTAL|TICKET|TIQUE|CAJA|\bIVA\b|EUR|TARJETA|ENTREGADO|CAMBIO|FACTURA|\bNIF\b|\bCIF\b|TLF|TEL[EÉ]F|GRACIAS|DESCUENTO|AHORRO|ART[IÍ]CULOS|\bTR\b|S\.?A\.?\b|MADRID|C\/|\d{2}[-\/.]\d{2}[-\/.]\d{2,4}|\d{1,2}:\d{2}/i;
function tkLoc(n) {
  const u = sinAc(n).toUpperCase();
  if (/CONGEL|HELAD|PIZZA|NUGGET/.test(u)) return 'cocina-i1';
  if (/HIGIENIC|LEJIA|DETERG|SUAVIZ|FREGA|LAVAVAJ|BASURA|JABON|CHAMPU|DESODOR|DENTAL|SERVILL|PAPEL COC|FREGONA|PIENSO|PERRO|GATO|ARENA/.test(u)) return 'despensa-cocina';
  if (/YOGUR|QUESO|JAMON|PAVO|CHORIZO|SALCHIC|LOMO|POLLO|PECHUGA|TERNERA|CERDO|CONEJO|CARNE|PESCADO|MERLUZA|SALMON|HUEVO|MANTEQ|NATA\b|TOMATE|UVA|CALABAC|AGUACATE|PLATANO|MANZANA|MELON|ESPARRAGO|MANDARINA|NARANJA|LIMA|LIMON|APIO|ACELGA|PIMIENTO|PUERRO|CEBOLLETA|LECHUGA|ZANAHORIA|ESPINACA|BROCOLI|COLIFLOR|FRESA|PERA\b|KIWI|BERENJENA|PEPINO|FRESCO/.test(u)) return 'despensa-cocina';
  return 'despensa-cocina';
}
function tkParse(txt) {
  const rows = [];
  for (const raw of txt.split('\n')) {
    let l = raw.replace(/[|_]/g, ' ').replace(/\s+/g, ' ').trim(); if (l.length < 3) continue;
    const q = /(\d+(?:[.,]\d{1,3})?)\s*(kg|un|u)\b[^\n]*?(?:\sx\s|€\s*\/|\/\s*(?:kg|un))/i.exec(l);
    if (q && !/[A-Za-zÁÉÍÓÚÑ]{4,}/.test(l.slice(0, q.index))) {
      const last = rows[rows.length - 1];
      if (last && !last.q) { last.q = 1; last.cant = parseFloat(q[1].replace(',', '.')); last.ud = /kg/i.test(q[2]) ? 'kg' : 'ud'; }
      continue;
    }
    if (TK_SKIP.test(l)) continue;
    l = l.replace(/\d+[.,]\d{2}\s*€?/g, ' ').replace(/€\/?\w*/g, ' ').replace(/[£%¡"'`´\\]/g, ' ').replace(/\s[A-C]$/, '').replace(/(\s+\S{1,2})+$/, '').replace(/\s+/g, ' ').trim();
    let cant = 1; const m = /^(\d{1,2})\s+(?=[A-ZÁÉÍÓÚÑ])/.exec(l); if (m) { cant = +m[1]; l = l.slice(m[0].length); }
    if (!/[A-Za-zÁÉÍÓÚÑáéíóúñ]{4,}/.test(l)) continue;
    rows.push({ n: l.charAt(0) + l.slice(1).toLowerCase(), cant, ud: 'ud', q: cant > 1 ? 1 : 0, loc: tkLoc(l), on: true });
  }
  return rows;
}
function tkPintaLista() {
  $('tk-lista').innerHTML = TKROWS.map((r, i) => `<div class="bg-slate-50 rounded-lg p-2 mb-2 grid grid-cols-6 gap-1 items-center">
    <input type="checkbox" ${r.on ? 'checked' : ''} onchange="TKROWS[${i}].on=this.checked" class="w-5 h-5 accent-emerald-600">
    <input value="${esc(r.n)}" onchange="TKROWS[${i}].n=this.value" class="col-span-5 p-1.5 border rounded bg-white">
    <span></span><input type="number" step="any" value="${+r.cant || 0}" onchange="TKROWS[${i}].cant=+this.value" class="col-span-2 p-1.5 border rounded bg-white">
    <select onchange="TKROWS[${i}].ud=this.value" class="p-1.5 border rounded bg-white">${['ud', 'kg', 'l'].map(u => `<option ${r.ud === u ? 'selected' : ''}>${u}</option>`).join('')}</select>
    <select onchange="TKROWS[${i}].loc=this.value" class="col-span-2 p-1.5 border rounded bg-white">${optsLoc().replace('value="' + r.loc + '"', 'value="' + r.loc + '" selected')}</select></div>`).join('') +
    `<button onclick="TKROWS.push({n:'',cant:1,ud:'ud',loc:'despensa-cocina',on:true});tkPintaLista()" class="text-xs underline text-slate-600 mb-2">+ añadir línea</button>`;
  $('tk-conf').classList.toggle('hidden', !TKROWS.length);
}
function tkConfirmar() {
  const cad = $('tk-cad').value; let n = 0;
  TKROWS.filter(r => r.on && r.n.trim() && r.cant > 0).forEach(r => { mov({ prod: r.n.trim(), cod: '', cant: r.cant, ud: r.ud, cad, fmt: '', img: '', ns: '', de: '', a: r.loc, tipo: 'alta', nota: 'ticket' }); n++; });
  cerrar('m-tk'); TKROWS = []; TKIMG = null; $('tk-cv').classList.add('hidden'); $('tk-btns').classList.add('hidden'); $('tk-lista').innerHTML = ''; $('tk-conf').classList.add('hidden');
  render(); alert(n + ' productos añadidos al inventario.');
}
