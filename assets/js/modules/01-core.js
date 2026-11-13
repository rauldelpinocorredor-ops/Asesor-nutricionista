const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEY = 'asesor_nutri_v2';
const CATS = {general:'Despensa', congelados:'Congelados', limpieza:'Limpieza', mascotas:'Mascotas', compra:'🛒 Compra'};

let S = {};
try { S = JSON.parse(localStorage.getItem(KEY)) || {}; } catch(e) {}
S.inv = S.inv || []; S.rec = S.rec || []; S.dep = S.dep || []; S.sub = S.sub || 'general'; S.mat = S.mat || ['Mancuernas','Bandas','Esterilla','Peso corporal'];
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch(e) {} };

/* ---------- Navegación ---------- */
function tab(t) {
  document.querySelectorAll('.tab').forEach(e => e.classList.remove('active'));
  document.querySelectorAll('nav button').forEach(b => { b.classList.remove('text-emerald-600'); b.classList.add('text-slate-400'); });
  $('s-' + t).classList.add('active');
  const nav = document.querySelector('nav');
  nav.classList.toggle('hidden', t === 'home');
  $('home-back').classList.toggle('hidden', t === 'home');
  $('home-back').classList.toggle('flex', t !== 'home');
  const navButton = $('n-' + t);
  if (navButton) navButton.classList.replace('text-slate-400', 'text-emerald-600');
  if (t === 'chef') selectorChef();
}
const abrir = id => { $(id).classList.remove('hidden'); $(id).classList.add('flex'); };
const cerrar = id => { $(id).classList.add('hidden'); $(id).classList.remove('flex'); };

/* ---------- Despensa ---------- */
const NSC = {a:'bg-green-600', b:'bg-lime-500', c:'bg-yellow-400', d:'bg-orange-500', e:'bg-red-600'};
function subtabs() {
  $('subtabs').innerHTML = Object.entries(CATS).map(([k, v]) =>
    `<button onclick="S.sub='${k}';save();render()" class="px-3 py-1.5 rounded-lg whitespace-nowrap font-medium ${S.sub === k ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}">${v}</button>`).join('');
}
function caducidad(f) {
  if (!f) return '';
  const d = Math.ceil((new Date(f) - new Date().setHours(0,0,0,0)) / 864e5);
  if (d < 0) return `<span class="text-red-600 font-bold">Caducado</span>`;
  if (d <= 7) return `<span class="text-amber-600 font-bold">Caduca en ${d} d</span>`;
  return `<span class="text-slate-400">Caduca ${esc(f)}</span>`;
}
const okImg = u => typeof u === 'string' && u.startsWith('https://');
function render() {
  subtabs();
  const items = S.sub === 'compra' ? S.inv.filter(i => i.buy) : S.inv.filter(i => i.cat === S.sub);
  $('lista').innerHTML = items.length ? items.map(i => `
    <div class="flex items-center gap-3 bg-slate-50 rounded-xl p-3 text-sm">
      ${okImg(i.img) ? `<img src="${esc(i.img)}" alt="" loading="lazy" class="w-12 h-12 object-contain rounded bg-white">` : `<div class="w-12 h-12 rounded bg-slate-200 flex items-center justify-center text-slate-400"><i class="fa-solid fa-box"></i></div>`}
      <button onclick="abrirFicha(${i.id})" class="flex-1 text-left min-w-0">
        <p class="font-medium truncate">${esc(i.n)}${i.ud > 1 ? ` <span class="text-xs text-slate-400">×${i.ud}</span>` : ''}</p>
        <p class="text-xs text-slate-500 truncate">${esc([i.marca, i.cant].filter(Boolean).join(' · '))}</p>
        <p class="text-xs">${caducidad(i.cad)}${NSC[i.ns] ? ` <span class="ml-1 text-white px-1.5 rounded uppercase font-bold ${NSC[i.ns]}">${i.ns}</span>` : ''}</p>
      </button>
      <div class="flex gap-3 text-lg">
        <button onclick="toggleBuy(${i.id})" title="Lista de la compra" class="${i.buy ? 'text-emerald-600' : 'text-slate-300'}"><i class="fa-solid fa-cart-shopping"></i></button>
        <button onclick="borrar(${i.id})" class="text-red-400"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>`).join('') : '<p class="text-xs text-slate-400 text-center py-4">Sin productos aquí todavía.</p>';
}
function addProducto(buy) {
  const n = $('p-nombre').value.trim(); if (!n) return;
  S.inv.push({ id: Date.now(), n, cat: $('p-cat').value, cad: $('p-cad').value, buy, ud: 1 });
  $('p-nombre').value = ''; $('p-cad').value = ''; save(); render();
}
const toggleBuy = id => { const i = S.inv.find(x => x.id === id); i.buy = !i.buy; save(); render(); };
const borrar = id => { S.inv = S.inv.filter(x => x.id !== id); save(); render(); };
function buscarTienda(t) {
  const l = S.inv.filter(i => i.buy);
  if (!l.length) return alert('Tu lista de la compra está vacía. Pulsa el carrito en un producto.');
  const base = t === 'carrefour' ? 'https://www.carrefour.es/?q=' : 'https://www.amazon.es/s?k=';
  l.slice(0, 5).forEach(i => window.open(base + encodeURIComponent(i.n), '_blank', 'noopener'));
  if (l.length > 5) alert('Se abrieron los 5 primeros productos para no saturar el navegador.');
}

/* ---------- Búsqueda de producto por código ---------- */
const FIELDS = 'code,product_name,product_name_es,generic_name,brands,quantity,categories_tags,ingredients_text,allergens_tags,nutriscore_grade,nova_group,ecoscore_grade,nutriments,image_front_small_url,image_front_url,labels,countries';
const FUENTES = [['Open Food Facts', 'world.openfoodfacts.org', null], ['Open Beauty Facts', 'world.openbeautyfacts.org', 'limpieza'], ['Open Pet Food Facts', 'world.openpetfoodfacts.org', 'mascotas'], ['Open Products Facts', 'world.openproductsfacts.org', 'limpieza']];
const ALERG = { milk: 'leche', eggs: 'huevo', gluten: 'gluten', nuts: 'frutos secos', peanuts: 'cacahuetes', soybeans: 'soja', fish: 'pescado', crustaceans: 'crustáceos', molluscs: 'moluscos', celery: 'apio', mustard: 'mostaza', 'sesame-seeds': 'sésamo', 'sulphur-dioxide-and-sulphites': 'sulfitos', lupin: 'altramuces' };
const grado = g => { g = String(g || '').toLowerCase(); return 'abcde'.includes(g) && g.length === 1 ? g : ''; };
function parseProd(p, fuente, catFija, code) {
  const nu = p.nutriments || {}, n = k => (nu[k + '_100g'] != null && nu[k + '_100g'] !== '' ? +nu[k + '_100g'] : null);
  const tags = p.categories_tags || [];
  return {
    code, fuente,
    n: p.product_name_es || p.product_name || p.generic_name || '',
    marca: p.brands || '', cant: p.quantity || '',
    cat: catFija || (tags.some(t => /frozen/.test(t)) ? 'congelados' : 'general'),
    img: p.image_front_small_url || p.image_front_url || '',
    ingr: p.ingredients_text || '',
    alerg: (p.allergens_tags || []).map(a => { const k = a.replace(/^[a-z]{2}:/, ''); return ALERG[k] || k; }).join(', '),
    ns: grado(p.nutriscore_grade), eco: grado(p.ecoscore_grade), nova: p.nova_group || '',
    nut: { kcal: n('energy-kcal'), gr: n('fat'), az: n('sugars'), pr: n('proteins'), sal: n('salt') },
    labels: p.labels || '', paises: p.countries || ''
  };
}
async function fetchT(url) {
  const c = new AbortController(), t = setTimeout(() => c.abort(), 8000);
  try { return await fetch(url, { signal: c.signal }); } finally { clearTimeout(t); }
}
async function buscarProducto(code) {
  let fallo = false;
  for (const [nom, host, cat] of FUENTES) {
    try {
      const r = await fetchT(`https://${host}/api/v2/product/${encodeURIComponent(code)}.json?fields=${FIELDS}`);
      if (!r.ok) { fallo = true; continue; }
      const j = await r.json();
      if (j.status === 1 && j.product) return { prod: parseProd(j.product, nom, cat, code) };
    } catch (e) { fallo = true; }
  }
  return { prod: null, fallo };
}

/* ---------- Ficha de producto ---------- */
let F = null; // datos del producto en edición (no editables en pantalla + id)
const fmt = v => v == null ? '—' : (Math.round(v * 10) / 10).toString().replace('.', ',');
function abrirFicha(id, aviso, datos) {
  const it = id ? S.inv.find(x => x.id === id) : null;
  F = it ? { ...it } : { id: null, ud: 1, buy: false, ...datos };
  $('f-aviso').textContent = aviso || (F.fuente ? 'Datos de ' + F.fuente + ' · revisa y completa la caducidad.' : '');
  $('f-n').value = F.n || ''; $('f-marca').value = F.marca || ''; $('f-cant').value = F.cant || '';
  $('f-ud').value = F.ud || 1; $('f-cat').value = F.cat || 'general'; $('f-cad').value = F.cad || '';
  const im = $('f-img'); if (okImg(F.img)) { im.src = F.img; im.classList.remove('hidden'); } else im.classList.add('hidden');
  const nt = F.nut || {}, partes = [];
  const ins = [F.ns && `Nutri-Score ${F.ns.toUpperCase()}`, F.nova && `NOVA ${F.nova}`, F.eco && `Eco-Score ${F.eco.toUpperCase()}`].filter(Boolean);
  if (ins.length) partes.push(`<p class="font-bold">${esc(ins.join(' · '))}</p>`);
  if (F.alerg) partes.push(`<p class="bg-amber-50 border border-amber-200 rounded-lg p-2"><b>Alérgenos:</b> ${esc(F.alerg)}</p>`);
  if (F.nut) partes.push(`<table class="w-full text-center"><tr class="text-slate-400"><td>Kcal</td><td>Grasas</td><td>Azúcares</td><td>Proteínas</td><td>Sal</td></tr><tr class="font-bold text-slate-700"><td>${fmt(nt.kcal)}</td><td>${fmt(nt.gr)}</td><td>${fmt(nt.az)}</td><td>${fmt(nt.pr)}</td><td>${fmt(nt.sal)}</td></tr></table><p class="text-[10px] text-slate-400 text-center">por 100 g/ml (g, salvo kcal)</p>`);
  if (F.ingr) partes.push(`<details><summary class="font-bold cursor-pointer">Ingredientes</summary><p class="mt-1">${esc(F.ingr)}</p></details>`);
  if (F.labels) partes.push(`<p><b>Sellos:</b> ${esc(F.labels)}</p>`);
  if (F.paises) partes.push(`<p><b>Se vende en:</b> ${esc(F.paises)}</p>`);
  if (F.code) partes.push(`<p class="text-slate-400">Código: ${esc(F.code)}</p>`);
  $('f-info').innerHTML = partes.join('');
  $('f-del').classList.toggle('hidden', !it);
  abrir('m-ficha');
}
function sumaCad(d) { const x = new Date(); x.setDate(x.getDate() + d); $('f-cad').value = x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); }
function guardarFicha() {
  const n = $('f-n').value.trim(); if (!n) return alert('Ponle un nombre al producto.');
  const o = { ...F, n, marca: $('f-marca').value.trim(), cant: $('f-cant').value.trim(), cat: $('f-cat').value, cad: $('f-cad').value, ud: Math.max(1, +$('f-ud').value || 1) };
  if (o.id) S.inv = S.inv.map(x => x.id === o.id ? o : x);
  else { o.id = Date.now(); S.inv.push(o); }
  S.sub = o.cat; save(); cerrar('m-ficha'); render();
}
function borrarFicha() { if (F && F.id && confirm('¿Eliminar este producto?')) { borrar(F.id); cerrar('m-ficha'); } }

/* ---------- Escáner de códigos de barras ---------- */
const ZX = 'https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js';
let stream = null, zxing = null, scanning = false;
const msg = t => { $('scan-msg').textContent = t; };
async function abrirScanner() {
  abrir('m-scan'); $('scan-manual').value = ''; msg('Iniciando cámara…'); scanning = true;
  if (!navigator.mediaDevices || !window.isSecureContext) { msg('La cámara requiere HTTPS. Usa la foto o escribe el código.'); return; }
  try {
    if ('BarcodeDetector' in window) {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      $('video').srcObject = stream; await $('video').play();
      const det = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
      msg('Apunta al código de barras…');
      (async function loop() {
        if (!scanning) return;
        try { const r = await det.detect($('video')); if (r.length) return procesarCodigo(r[0].rawValue); } catch (e) {}
        setTimeout(loop, 250);
      })();
    } else {
      await cargarScript(ZX);
      zxing = new ZXing.BrowserMultiFormatReader();
      msg('Apunta al código de barras…');
      zxing.decodeFromConstraints({ video: { facingMode: { ideal: 'environment' } } }, 'video', res => { if (res && scanning) procesarCodigo(res.getText()); });
    }
  } catch (e) { msg('No se pudo abrir la cámara (permiso denegado o no disponible). Usa la foto o escribe el código.'); }
}
const cargarScript = src => new Promise((ok, ko) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = ko; document.head.appendChild(s); });
function pararCamara() {
  scanning = false;
  if (zxing) { try { zxing.reset(); } catch (e) {} zxing = null; }
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
  $('video').srcObject = null;
}
function cerrarScanner() { pararCamara(); cerrar('m-scan'); }
async function decodeFoto(inp) {
  const f = inp.files[0]; if (!f) return; msg('Analizando foto…');
  try {
    if ('BarcodeDetector' in window) { const r = await new BarcodeDetector().detect(await createImageBitmap(f)); if (r.length) return procesarCodigo(r[0].rawValue); }
    await cargarScript(ZX);
    const r = await new ZXing.BrowserMultiFormatReader().decodeFromImageUrl(URL.createObjectURL(f));
    return procesarCodigo(r.getText());
  } catch (e) { msg('No se detectó ningún código en la foto. Prueba con más luz o más cerca.'); }
  inp.value = '';
}
async function procesarCodigo(raw) {
  const code = String(raw || '').replace(/\D/g, '');
  if (code.length < 8) return msg('Código no válido (mínimo 8 dígitos).');
  pararCamara(); msg('Código ' + code + ' — buscando producto…');
  const ya = S.inv.find(i => i.code === code);
  if (ya) { ya.ud = (ya.ud || 1) + 1; save(); render(); cerrar('m-scan'); return abrirFicha(ya.id, 'Ya estaba en tu despensa: sumada 1 unidad (ajústalo si no era lo que querías).'); }
  const { prod, fallo } = await buscarProducto(code);
  cerrar('m-scan');
  if (prod) abrirFicha(null, '', prod);
  else abrirFicha(null, fallo ? 'No se pudo consultar la base de datos (¿sin conexión?). Completa los datos a mano.' : 'Producto no encontrado en las bases abiertas. Completa los datos a mano.', { code, n: '', cat: typeof TAB !== 'undefined' && TAB !== 'compra' ? TAB : 'despensa-cocina' });
}

/* ---------- Chef ---------- */
const MODELO_IA = 'claude-haiku-5-5';
const sinAc = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const minDe = t => { const m = /(\d+)(?:\s*-\s*(\d+))?\s*(?:min|minutos)\b/i.exec(t || ''); return m ? +(m[2] || m[1]) : null; };
const lineas = t => String(t || '').split('\n').map(x => x.trim()).filter(Boolean);
const RECETAS = [
 ['Arroz con pollo','pollo,arroz',['Dora el pollo troceado en una sartén con aceite 6 min.','Añade el arroz y rehoga 1 min.','Cubre con caldo (2 partes por 1 de arroz) y cuece 18 min.','Deja reposar 5 min y sirve.']],
 ['Pasta con tomate','pasta,tomate',['Cuece la pasta según el envase (unos 10 min).','Calienta el tomate con una pizca de sal 5 min.','Mezcla y sirve.']],
 ['Tortilla de patata','huevo,patata',['Pocha la patata en rodajas finas en aceite 15 min.','Mezcla con los huevos batidos.','Cuaja 3-4 min por cada lado.']],
 ['Revuelto de verduras','huevo,verdura,espinaca,champi,calabac',['Saltea la verdura troceada 5 min.','Añade los huevos batidos y remueve a fuego suave 2 min.']],
 ['Salteado de pollo y verduras','pollo,verdura,pimiento,cebolla,calabac',['Corta todo en tiras.','Saltea el pollo a fuego fuerte 6 min.','Añade la verdura y cocina 5 min más.']],
 ['Pizza rápida','pizza,queso',['Precalienta el horno a 220 °C.','Añade queso extra si quieres.','Hornea 10-12 min hasta que esté dorada.']],
 ['Lentejas estofadas','lenteja,zanahoria,patata,cebolla',['Sofríe cebolla y zanahoria 8 min.','Añade las lentejas, la patata en dados y cubre con agua.','Cuece tapado 30 min (20 min en olla exprés).','Rectifica de sal y sirve.']],
 ['Garbanzos con espinacas','garbanzo,espinaca,ajo',['Dora el ajo laminado 1 min.','Añade las espinacas y saltea 3 min.','Incorpora los garbanzos cocidos y cuece 5 min.']],
 ['Merluza al horno con patatas','merluza,pescado,patata,limon',['Precalienta el horno a 200 °C.','Hornea las patatas en rodajas con aceite 20 min.','Coloca el pescado encima con limón y hornea 12 min.']],
 ['Salmón a la plancha con verduras','salmon,verdura,brocoli,esparrago',['Saltea la verdura 6 min.','Cocina el salmón en plancha 4 min por el lado de la piel.','Dale la vuelta y cocina 2-3 min más.']],
 ['Pasta con atún','pasta,atun,tomate',['Cuece la pasta 10 min.','Calienta el tomate con el atún escurrido 5 min.','Mezcla con la pasta y sirve.']],
 ['Macarrones con carne','pasta,macarron,carne,ternera,tomate',['Sofríe la carne picada 8 min.','Añade el tomate y cuece 10 min.','Cuece los macarrones 10 min y mezcla.']],
 ['Arroz tres delicias','arroz,huevo,jamon,guisante,zanahoria',['Cuece el arroz 15 min y escúrrelo.','Saltea guisantes, zanahoria y jamón 5 min.','Añade el huevo revuelto y el arroz y saltea 3 min.']],
 ['Crema de calabacín','calabac,patata,cebolla,queso',['Pocha la cebolla 5 min.','Añade calabacín y patata troceados, cubre con agua y cuece 20 min.','Tritura y añade el queso.']],
 ['Sopa de pollo con fideos','pollo,fideo,zanahoria,puerro',['Cuece el pollo con zanahoria y puerro en agua 25 min.','Añade los fideos y cuece 5 min.','Desmenuza el pollo y sirve.']],
 ['Hamburguesas caseras','carne,ternera,picada,pan,huevo',['Mezcla la carne con sal y un huevo; forma las hamburguesas.','Cocina a la plancha 4 min por lado.','Sirve en el pan.']],
 ['Pollo al horno con patatas','pollo,patata,ajo,limon',['Precalienta el horno a 190 °C.','Coloca pollo y patatas con ajo, limón y aceite.','Hornea 50 min dándoles la vuelta a mitad.']],
 ['Huevos al plato con tomate','huevo,tomate',['Calienta el tomate en una cazuela de horno 5 min.','Casca los huevos encima.','Hornea 8-10 min a 200 °C.']],
 ['Ensalada de pasta','pasta,atun,tomate,maiz,huevo',['Cuece la pasta 10 min y enfríala con agua.','Cuece los huevos 10 min.','Mezcla todo con tomate, maíz y atún; aliña.']],
 ['Quesadillas','tortilla,queso,pollo,pimiento',['Saltea pollo y pimiento troceados 6 min.','Rellena la tortilla con queso y el salteado.','Dora 2 min por cada lado.']],
 ['Avena con fruta','avena,leche,platano,fruta',['Calienta la leche con la avena 5 min removiendo.','Añade la fruta troceada y sirve.']],
 ['Tostadas de aguacate y huevo','pan,aguacate,huevo',['Tuesta el pan 2 min.','Cocina el huevo a la plancha 3 min.','Aplasta el aguacate sobre el pan y corona con el huevo.']],
 ['Albóndigas en salsa','carne,picada,tomate,huevo,pan',['Mezcla carne, huevo y pan rallado; forma bolas.','Dóralas 5 min en sartén.','Cuece en salsa de tomate 15 min.']],
 ['Judías verdes con patata y huevo','judia,patata,huevo',['Cuece judías y patata en dados 20 min.','Cuece el huevo 10 min.','Escurre, aliña y sirve con el huevo picado.']],
 ['Brócoli gratinado','brocoli,coliflor,queso,leche',['Cuece el brócoli 6 min.','Colócalo en una fuente con leche y queso.','Gratina en el horno 8 min a 220 °C.']],
 ['Crepes','harina,huevo,leche',['Bate harina, huevos y leche hasta que no haya grumos; reposa 15 min.','Cocina una cucharada en sartén caliente 1-2 min por lado.']],
 ['Cuscús con verduras','cuscus,verdura,garbanzo',['Hidrata el cuscús con agua caliente 5 min.','Saltea la verdura 6 min con los garbanzos.','Mezcla y sirve.']],
 ['Pollo al curry con arroz','pollo,curry,arroz,coco,cebolla',['Cuece el arroz 15 min.','Sofríe cebolla y pollo 8 min con curry.','Añade leche de coco y cuece 10 min; sirve con el arroz.']]
].map(([n, k, p], i) => ({ id: 'b' + i, n, k: k.split(','), p: p.map(t => ({ t, m: minDe(t) })) }));

const todas = () => [...S.rec, ...RECETAS];
let RIA = null, VR = null, editId = null;
const getRec = id => id === 'ia' ? RIA : todas().find(r => r.id === id);
const clavesDe = r => r.k || (r.i || []).map(x => (typeof x === 'object' ? sinAc(x.n) : sinAc(x)).replace(/^[\d.,\/\s]*(kg|g|ml|l|cucharadas?|cucharaditas?|cdas?|cdtas?|uds?|unidades?|dientes?|lonchas?|latas?)?\s*(de\s+)?/, '').trim()).filter(k => k.length > 2);
const selActual = () => [...document.querySelectorAll('#chef-sel input:checked')].map(c => c.value);

function selectorChef() {
  const it = S.inv.filter(i => i.cat === 'general' || i.cat === 'congelados');
  $('chef-sel').innerHTML = it.length ? it.map(i => `<label class="text-xs bg-white border rounded-full px-3 py-1.5"><input type="checkbox" value="${esc(i.n)}" class="accent-emerald-600 mr-1">${esc(i.n)}</label>`).join('') : '<span class="text-xs text-slate-400">Añade productos a la despensa.</span>';
}
function buscarRecetas(todo) {
  const sel = selActual().map(sinAc).filter(x => x.length > 2); let r;
  if (todo) r = todas().map(x => ({ x }));
  else {
    if (sel.length < 2) return ($('chef-res').innerHTML = '<p class="text-xs text-amber-600">Selecciona al menos 2 ingredientes.</p>');
    r = todas().map(x => ({ x, c: clavesDe(x).filter(k => sel.some(s => s.includes(k) || k.includes(s))).length })).filter(o => o.c >= 2).sort((a, b) => b.c - a.c);
  }
  $('chef-res').innerHTML = r.length ? r.map(({ x }) => `<button onclick="verReceta('${x.id}')" class="w-full text-left bg-emerald-50 border border-emerald-100 rounded-xl p-3 font-medium text-emerald-800 text-sm">${x.id[0] === 'c' ? '<i class="fa-solid fa-user mr-1 text-xs"></i>' : ''}${esc(x.n)}</button>`).join('')
    : '<p class="text-xs text-slate-500">Ninguna receta coincide. Prueba a <button onclick="abrirIA()" class="underline text-indigo-600">preguntar a una IA</button> o añade la tuya.</p>';
}
function verReceta(id) {
  const r = getRec(id); if (!r) return; VR = r; $('m-tit').textContent = r.n;
  let h = '';
  if (id === 'ia') h += '<p class="text-[11px] bg-amber-50 border border-amber-200 rounded-lg p-2 mb-2">Receta generada por IA: revisa alérgenos, cantidades y tiempos de cocción antes de cocinar (sobre todo si es para bebés).</p>';
  if (r.rac) h += `<p class="text-xs text-slate-400">${esc(r.rac)} raciones</p>`;
  h += r.i && r.i.length ? `<div class="bg-slate-50 rounded-xl p-3 text-xs mb-2"><p class="font-bold mb-1">Ingredientes</p>${r.i.map(x => `<p>• ${esc(x)}</p>`).join('')}</div>`
    : `<p class="text-xs text-slate-400 mb-2">Ingredientes principales: ${esc(r.k.join(', '))}. Ajusta las cantidades a tu gusto.</p>`;
  h += r.p.map((st, i) => `<div class="flex gap-2 items-start py-1.5"><input type="checkbox" class="mt-0.5 w-5 h-5 accent-emerald-600 shrink-0" onchange="this.nextElementSibling.classList.toggle('line-through',this.checked)"><div class="flex-1"><p><b>${i + 1}.</b> ${esc(st.t)}</p>${st.m ? `<button onclick="iniciarTimerPaso(${i})" class="mt-1 text-xs bg-emerald-600 text-white rounded-full px-3 py-1 font-bold"><i class="fa-solid fa-stopwatch mr-1"></i>Temporizador ${+st.m} min</button>` : ''}</div></div>`).join('');
  $('m-cuerpo').innerHTML = h;
  $('m-acc').innerHTML = id === 'ia' ? '<button onclick="guardarIA()" class="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl font-bold text-sm">Guardar en mis recetas</button>'
    : id[0] === 'c' ? `<button onclick="formReceta('${id}')" class="flex-1 bg-slate-100 py-2.5 rounded-xl font-bold text-sm">Editar</button><button onclick="borrarReceta('${id}')" class="px-4 bg-red-50 text-red-600 py-2.5 rounded-xl font-bold text-sm">Eliminar</button>` : '';
  abrir('m-receta');
}

/* Recetas propias */
function formReceta(id) {
  editId = id || null; const r = id ? getRec(id) : null;
  $('rf-n').value = r ? r.n : ''; $('rf-i').value = r && r.i ? r.i.join('\n') : ''; $('rf-p').value = r ? r.p.map(x => x.t).join('\n') : '';
  cerrar('m-receta'); abrir('m-form');
}
function guardarForm() {
  const n = $('rf-n').value.trim(), i = lineas($('rf-i').value), p = lineas($('rf-p').value);
  if (!n || !p.length) return alert('Pon un nombre y al menos un paso.');
  const r = { id: editId || 'c' + Date.now(), n, i, p: p.map(t => ({ t, m: minDe(t) })) };
  S.rec = editId ? S.rec.map(x => x.id === editId ? r : x) : [...S.rec, r];
  save(); cerrar('m-form'); verReceta(r.id);
}
function borrarReceta(id) { if (confirm('¿Eliminar esta receta?')) { S.rec = S.rec.filter(x => x.id !== id); save(); cerrar('m-receta'); $('chef-res').innerHTML = ''; } }
function guardarIA() { const r = { ...RIA, id: 'c' + Date.now() }; S.rec.push(r); save(); verReceta(r.id); }

/* ---------- Temporizadores ---------- */
let TM = [], tmInt = null, AC = null, WL = null, tid = 0;
function iniciarTimerPaso(i) { iniciarTimer(VR.n + ' · paso ' + (i + 1), VR.p[i].m); }
function iniciarTimer(label, min) {
  try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch (e) {}
  TM.push({ id: ++tid, label, fin: Date.now() + min * 60000, done: false, last: 0 });
  if (!tmInt) tmInt = setInterval(tick, 1000);
  try { if ('wakeLock' in navigator && !WL) navigator.wakeLock.request('screen').then(w => { WL = w; w.addEventListener('release', () => { WL = null; }); }).catch(() => {}); } catch (e) {}
  pintaTimers();
}
function pitar() {
  try { [0, .35, .7].forEach(d => { const o = AC.createOscillator(), g = AC.createGain(); o.frequency.value = 880; g.gain.value = .2; o.connect(g); g.connect(AC.destination); o.start(AC.currentTime + d); o.stop(AC.currentTime + d + .2); }); } catch (e) {}
  if (navigator.vibrate) navigator.vibrate([300, 150, 300]);
}
function tick() { const now = Date.now(); TM.forEach(t => { if (now >= t.fin) { t.done = true; if (now - t.last > 4000) { t.last = now; pitar(); } } }); pintaTimers(); }
function quitarTimer(id) { TM = TM.filter(t => t.id !== id); if (!TM.length) { clearInterval(tmInt); tmInt = null; if (WL) { WL.release().catch(() => {}); WL = null; } } pintaTimers(); }
function masUno(id) { const t = TM.find(x => x.id === id); if (t) { t.fin = Math.max(t.fin, Date.now()) + 60000; t.done = false; } pintaTimers(); }
function pintaTimers() {
  $('timers').innerHTML = TM.map(t => { const s = Math.max(0, Math.ceil((t.fin - Date.now()) / 1000));
    return `<div class="flex items-center justify-between rounded-xl shadow-lg px-3 py-2 text-sm text-white ${t.done ? 'bg-red-600 animate-pulse' : 'bg-slate-900'}"><span class="truncate pr-2">${esc(t.label)}</span><span class="font-mono font-bold">${t.done ? '¡Listo!' : Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0')}</span><span class="flex gap-3 ml-3 items-center"><button onclick="masUno(${t.id})" class="text-xs bg-white/20 rounded px-2 py-0.5">+1</button><button onclick="quitarTimer(${t.id})"><i class="fa-solid fa-xmark"></i></button></span></div>`; }).join('');
}

/* ---------- Receta con IA ---------- */
const IAK = 'asesor_nutri_ia_key';
const getKey = () => { try { return localStorage.getItem(IAK) || ''; } catch (e) { return ''; } };
function abrirIA() {
  const sel = selActual();
  if (!sel.length) {
    alert('Marca al menos 1 ingrediente de la despensa antes de preguntar a una IA.');
    const panel = $('chef-det'); if (panel) panel.open = true;
    return;
  }
  // El flujo de esta ventana es copiar la petición a una IA externa y pegar aquí su respuesta.
  // No debe depender de campos de API que no existen en el formulario.
  $('ia-res').textContent = sel.join(', ');
  $('ia-estado').textContent = '1. Copia la petición. 2. Pégala en ChatGPT, Claude o Gemini. 3. Pega aquí la receta y pulsa «Importar receta».';
  $('ia-resp').value = '';
  abrir('m-ia');
}
function promptIA() {
  const notas = $('ia-notas').value.trim();
  return `Eres un chef. Dame UNA receta casera para ${+$('ia-pers').value || 2} personas usando principalmente estos ingredientes que tengo: ${selActual().join(', ')}. ` +
    ($('ia-basic').checked ? 'Puedes añadir básicos de cocina (aceite, sal, agua, especias comunes). ' : 'Usa solo esos ingredientes. ') + (notas ? `Notas: ${notas}. ` : '') +
    `Responde SOLO con JSON válido, sin texto adicional, con este formato exacto: {"nombre":"...","raciones":2,"ingredientes":["200 g de arroz"],"pasos":[{"texto":"...","minutos":10}]}. ` +
    `Cada paso que implique cocción o espera debe llevar "minutos" (número entero); si no hay tiempo, usa null. Pasos cortos y claros. Si algún ingrediente es alérgeno común, indícalo en el último paso.`;
}
function parseReceta(txt) {
  const a = txt.indexOf('{'), b = txt.lastIndexOf('}'); if (a < 0 || b <= a) throw new Error('No encuentro una receta en JSON en esa respuesta.');
  const j = JSON.parse(txt.slice(a, b + 1));
  const p = (Array.isArray(j.pasos) ? j.pasos : []).slice(0, 30).map(x => {
    let t = String(typeof x === 'string' ? x : (x && x.texto) || '').trim().slice(0, 400);
    const m0 = x && typeof x === 'object' ? Math.round(+x.minutos) : NaN;
    if (Number.isFinite(m0) && m0 > 0 && m0 <= 600 && !minDe(t)) t += ` (${m0} min)`;
    return { t, m: minDe(t) };
  }).filter(x => x.t);
  if (!j.nombre || !p.length) throw new Error('La receta está incompleta.');
  return { id: 'ia', n: String(j.nombre).slice(0, 80), rac: j.raciones ? String(j.raciones).slice(0, 10) : '', i: (Array.isArray(j.ingredientes) ? j.ingredientes : []).slice(0, 40).map(x => String(x).slice(0, 120)), p };
}
async function pedirIA() {
  const typed = $('ia-key').value.trim(), key = typed || getKey();
  if (!key) return ($('ia-estado').textContent = 'Introduce tu clave de API, o usa la opción B.');
  if (typed && $('ia-rec').checked) { try { localStorage.setItem(IAK, typed); } catch (e) {} }
  $('ia-estado').textContent = 'Preguntando a Claude…';
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model: MODELO_IA, max_tokens: 1500, messages: [{ role: 'user', content: promptIA() }] }) });
    const j = await r.json();
    if (!r.ok) throw new Error((j.error && j.error.message) || 'Error ' + r.status);
    RIA = parseReceta((j.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n'));
    cerrar('m-ia'); verReceta('ia');
  } catch (e) { $('ia-estado').textContent = 'No se pudo obtener la receta: ' + e.message; }
}
function importarIA() {
  try { RIA = parseReceta($('ia-resp').value); cerrar('m-ia'); verReceta('ia'); }
  catch (e) { $('ia-estado').textContent = 'No se pudo importar: ' + e.message; }
}
async function copiarPrompt() {
  try { await navigator.clipboard.writeText(promptIA()); $('ia-estado').textContent = 'Petición copiada. Pégala en Claude y luego pega aquí su respuesta.'; }
  catch (e) { $('ia-resp').value = promptIA(); $('ia-estado').textContent = 'No pude copiar automáticamente: la petición está en el cuadro de abajo; cópiala a mano.'; }
}
function borrarKey() { try { localStorage.removeItem(IAK); } catch (e) {} $('ia-key').value = ''; $('ia-tk').textContent = ''; $('ia-estado').textContent = 'Clave borrada de este dispositivo.'; }

/* ---------- Nutrición ---------- */
function subNutri(s) {
  ['adultos', 'bebe'].forEach(x => {
    $('np-' + x).classList.toggle('hidden', x !== s);
    $('nb-' + x).className = 'px-4 py-2 rounded-lg text-sm font-medium ' + (x === s ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600');
  });
}
// Gramos base por persona para ~2000 kcal/día (valores orientativos)
const COMIDAS = [
  ['Pollo a la plancha + arroz + ensalada', '150 g pollo, 70 g arroz (crudo), 150 g ensalada'],
  ['Lentejas con verduras', '80 g lentejas (crudas), 150 g verdura'],
  ['Pescado al horno + patata', '170 g pescado, 200 g patata, 100 g verdura'],
  ['Pasta integral con tomate y atún', '80 g pasta (cruda), 80 g atún, 150 g tomate'],
  ['Tortilla de verduras + ensalada', '2 huevos, 150 g verdura, 150 g ensalada'],
  ['Ternera salteada con verduras', '130 g ternera, 200 g verdura, 60 g arroz (crudo)'],
  ['Garbanzos con espinacas', '80 g garbanzos (crudos), 150 g espinacas']
];
function escala(txt, f) { return txt.replace(/(\d+) g/g, (_, n) => Math.round(n * f / 5) * 5 + ' g'); }
function menuAdultos() {
  const p = +$('n-pers').value || 1, dias = +$('n-dias').value, f = (+$('n-kcal').value || 2000) / 2000;
  let h = '';
  for (let d = 0; d < dias; d++) {
    const c = COMIDAS[d % 7], ce = COMIDAS[(d + 3) % 7];
    h += `<div class="bg-slate-50 rounded-xl p-3 text-xs"><p class="font-bold text-slate-700 mb-1">Día ${d + 1}</p>
      <p><b>Comida:</b> ${esc(c[0])}<br><span class="text-slate-500">por persona: ${esc(escala(c[1], f))}</span></p>
      <p class="mt-1"><b>Cena:</b> ${esc(ce[0])}<br><span class="text-slate-500">por persona: ${esc(escala(ce[1], f * .8))}</span></p></div>`;
  }
  $('n-res').innerHTML = `<p class="text-xs text-slate-500">Para ${p} comensal(es). Multiplica las cantidades por persona.</p>` + h;
}
function menuBebe() {
  const m = [['b-des', 'Desayuno', 'Leche/fórmula o pecho + fruta o cereales sin azúcar'],
             ['b-mer', 'Merienda', 'Fruta troceada o yogur natural'],
             ['b-cen', 'Cena', 'Verduras con proteína suave (pescado, huevo, pollo) + fruta']];
  $('b-res').innerHTML = m.filter(x => $(x[0]).checked).map(x => `<div class="bg-slate-50 rounded-xl p-3 text-xs"><b>${x[1]}:</b> ${esc(x[2])}</div>`).join('') || '<p class="text-xs text-slate-400">Sin comidas en casa seleccionadas.</p>';
}

/* ---------- Training ---------- */
const MATS = ['Mancuernas', 'Bandas', 'Esterilla', 'Kettlebell', 'Peso corporal'];
const EJ = [
  ['Sentadillas', 'Peso corporal'], ['Flexiones', 'Peso corporal'], ['Zancadas', 'Peso corporal'], ['Plancha 30 s', 'Esterilla'],
  ['Press de hombro', 'Mancuernas'], ['Remo con mancuerna', 'Mancuernas'], ['Curl de bíceps', 'Mancuernas'],
  ['Remo con banda', 'Bandas'], ['Press pecho con banda', 'Bandas'], ['Swing', 'Kettlebell'], ['Goblet squat', 'Kettlebell'], ['Abdominales', 'Esterilla']
];
function pintaMaterial() {
  $('material').innerHTML = MATS.map(m => `<label><input type="checkbox" ${S.mat.includes(m) ? 'checked' : ''} onchange="toggleMat('${m}',this.checked)" class="accent-emerald-600 mr-1">${m}</label>`).join('');
}
function toggleMat(m, on) { S.mat = on ? [...new Set([...S.mat, m])] : S.mat.filter(x => x !== m); save(); }
function rutina(min) {
  const ok = EJ.filter(e => S.mat.includes(e[1]) || e[1] === 'Peso corporal'); 
  const n = Math.min(ok.length, Math.round(min / 4)), series = min >= 30 ? 3 : 2;
  const sel = ok.slice().sort(() => Math.random() - .5).slice(0, n);
  $('rutina').innerHTML = `<p class="font-bold mb-2">${min} min · ${series} series × 12 reps (descanso 30-45 s)</p>` + sel.map(e => `<p>• ${esc(e[0])} <span class="text-xs text-emerald-700">(${esc(e[1])})</span></p>`).join('') + '<p class="text-[11px] text-slate-500 mt-2">Calienta 3-5 min antes. Detente si sientes dolor.</p>';
}
function addDeporte() {
  const m = +$('d-min').value; if (!m) return;
  S.dep.unshift({ t: $('d-tipo').value, m, f: new Date().toLocaleDateString('es-ES') }); S.dep = S.dep.slice(0, 30);
  $('d-min').value = ''; save(); pintaDep();
}
function pintaDep() { $('d-lista').innerHTML = S.dep.map(d => `<p>${esc(d.f)} — ${esc(d.t)}: ${+d.m} min</p>`).join(''); }

/* ---------- Service worker (uso sin conexión) ---------- */
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});

render(); pintaMaterial(); pintaDep(); subNutri('adultos');
