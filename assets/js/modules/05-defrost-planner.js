/* ===== v2.3: descongelación planificada y sugerencias de reposición ===== */
let PLAN = [], IGN = [], SUG = [], PL = null;
const PLAN_BUSY = new Set();
const ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const enDias = n => { const d = new Date(); d.setDate(d.getDate() + n); return d; };
const ik = k => encodeURIComponent(k).slice(0, 200);

function abrirPlan(i) {
  PL = VIS[i]; $('pl-tit').textContent = PL.prod; $('pl-inf').textContent = 'Hay ' + fmtC(PL) + ' en ' + LOCS[PL.loc];
  $('pl-fecha').value = ymd(enDias(1)); $('pl-cant').value = Math.min(PL.cant, 1); abrir('m-plan');
}
function guardarPlan() {
  const q = +$('pl-cant').value, f = $('pl-fecha').value;
  if (!f || !(q > 0) || q > PL.cant + 0.0001) return alert('Revisa la fecha y la cantidad (máximo ' + PL.cant + ').');
  fb.set('plan', 'p' + Date.now(), { prod: PL.prod, loc: PL.loc, cad: PL.cad || '', cant: q, ud: PL.ud, fecha: f, hecho: false, t: Date.now() });
  cerrar('m-plan');
}
async function planHecho(id) {
  if (PLAN_BUSY.has(id)) return;
  const p = PLAN.find(x => x.id === id);
  if (!p || p.hecho) return;
  const loc = normLoc(p.loc), s = STOCK.find(x => x.prod === p.prod && x.loc === loc && x.cad === (p.cad || '') && (x.ud || 'ud') === (p.ud || 'ud'));
  if (!s || s.cant < p.cant - 0.0001) return alert('Ya no hay esa cantidad en ' + (LOCS[p.loc] || p.loc) + '. Revisa el inventario o quita el aviso.');
  PLAN_BUSY.add(id);
  const movementId = 'defrost-' + String(id).replace(/[^\w%.~-]/g, '').slice(0, 180);
  const movement = { t: Date.now(), por: USER ? USER.email : '', prod: s.prod, cod: s.cod || '', cant: p.cant, ud: s.ud, cad: s.cad, recordatorio: s.recordatorio || '', recordatorioFuente: s.recordatorioFuente || '', recordatorioCategoria: s.recordatorioCategoria || '', fmt: s.fmt || '', img: s.img || '', ns: s.ns || '', marca: s.marca || '', fechaCongelacion: null, de: loc, a: 'frigo', tipo: 'descongelar', nota: 'descongelación', sourcePlanId: id };
  try {
    // A stable document ID makes retries safe if movement write succeeded but
    // marking the plan complete failed or the client lost its response.
    await fb.set('mov', movementId, movement);
    const { id: _, ...d } = p;
    await fb.set('plan', id, { ...d, loc, hecho: true, thawMovementId: movementId });
  } catch (error) {
    alert('No se pudo completar la descongelación. El aviso sigue pendiente; vuelve a intentarlo.');
  } finally {
    PLAN_BUSY.delete(id);
    pintaAvisos();
  }
}
function pintaAvisos() {
  const hoy = ymd(new Date()), man = ymd(enDias(1)), L = PLAN.filter(p => !p.hecho).sort((a, b) => a.fecha.localeCompare(b.fecha));
  $('avisos').innerHTML = L.length ? `<div class="bg-sky-50 border border-sky-200 rounded-xl p-3 text-xs"><p class="font-bold text-sky-800 mb-2"><i class="fa-regular fa-snowflake mr-1"></i>Descongelación planificada</p>` + L.map(p => {
    const due = p.fecha <= man, et = p.fecha < hoy ? '⚠️ fecha pasada' : p.fecha === hoy ? 'para hoy' : p.fecha === man ? 'para mañana' : 'el ' + p.fecha.split('-').reverse().join('/');
    return `<div class="flex items-center justify-between gap-2 py-1 ${due ? '' : 'opacity-60'}"><span>${due ? '<b>Pasar hoy al frigorífico:</b> ' : ''}${esc(p.prod)} ×${+p.cant} ${UDN[p.ud] || ''} · ${et}<br><span class="text-slate-500">${esc(LOCS[p.loc] || p.loc)}</span></span><span class="flex gap-2 shrink-0 items-center">${due ? `<button onclick="planHecho('${p.id}')" class="bg-sky-600 text-white rounded px-2 py-1 font-bold">Pasar</button>` : ''}<button onclick="fb.del('plan','${p.id}')" class="text-slate-400 px-1"><i class="fa-solid fa-xmark"></i></button></span></div>`;
  }).join('') + `<p class="text-[10px] text-slate-400 mt-2">Tras descongelar, consume pronto y no vuelvas a congelar. Los avisos salen al abrir la app.</p></div>` : '';
}

function calcSug() {
  const m = {}, tot = {};
  MOVS.forEach(x => {
    const k = sinAc(x.prod), e = m[k] = m[k] || { prod: x.prod, altas: 0, cons: 0, lastAlta: 0, ud: x.ud };
    if (x.tipo === 'alta') { e.altas++; e.lastAlta = Math.max(e.lastAlta, x.t); }
    if (x.tipo === 'baja' && (x.nota === 'consumido' || /^cocinado/.test(x.nota || ''))) e.cons++;
  });
  STOCK.forEach(s => { const k = sinAc(s.prod); tot[k] = (tot[k] || 0) + s.cant; });
  const lista = COMPRA.filter(c => !c.hecho).map(c => sinAc(c.n));
  SUG = Object.entries(m).map(([k, e]) => {
    const q = tot[k] || 0; let r = '';
    if (q <= 0.0001 && e.cons > 0) r = 'Se ha acabado';
    else if (q > 0 && q <= 1 && ['ud', 'rac'].includes(e.ud) && e.altas >= 2) r = 'Queda ' + fmtC({ cant: q, ud: e.ud });
    if (!r) return null;
    const ig = IGN.find(g => g.id === ik(k)); if (ig && ig.t >= e.lastAlta) return null;
    if (lista.some(n => n.includes(k) || k.includes(n))) return null;
    return { k, prod: e.prod, r };
  }).filter(Boolean);
}
const sugHTML = () => SUG.length ? `<div class="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs mb-3"><p class="font-bold text-amber-800 mb-2">Sugerencias de reposición</p>` + SUG.map((s, i) => `<div class="flex items-center justify-between py-1"><span>${esc(s.prod)} <span class="text-slate-500">· ${esc(s.r)}</span></span><span class="flex gap-3 items-center"><button onclick="sugAdd(${i})" class="bg-amber-600 text-white rounded px-2 py-1 font-bold">Añadir</button><button onclick="sugIgn(${i})" class="text-slate-400">Ignorar</button></span></div>`).join('') + '</div>' : '';
const sugAdd = i => fb.addCompra({ n: SUG[i].prod, hecho: false, t: Date.now() });
const sugIgn = i => fb.set('ignorados', ik(SUG[i].k), { t: Date.now() });

const _render = render; render = function () { calcSug(); GN.compra = '🛒 Compra' + (SUG.length ? ' · ' + SUG.length : ''); _render(); pintaAvisos(); };
const _pintaCompra = pintaCompra; pintaCompra = function () { _pintaCompra(); $('lista').insertAdjacentHTML('afterbegin', sugHTML()); };
window.onPlan = l => { PLAN = l.map(p => ({ ...p, loc: normLoc(p.loc) })); render(); };
window.onIgn = l => { IGN = l; render(); };

/* Antigüedad en congelador: umbral elegido por el hogar, no una fecha de seguridad. */
const FREEZER_ALERT_KEY = 'asesor_nutri_freezer_alert_days_v1';
function freezerAlertDays() {
  try { const n = Number(localStorage.getItem(FREEZER_ALERT_KEY)); return Number.isInteger(n) && n >= 1 && n <= 3650 ? n : 0; } catch (e) { return 0; }
}
function guardarAvisoCongelacion() {
  const n = Number($('freezer-alert-days')?.value);
  if (!Number.isInteger(n) || n < 1 || n > 3650) return alert('Indica un umbral entre 1 y 3650 días.');
  try { localStorage.setItem(FREEZER_ALERT_KEY, String(n)); } catch (e) { return alert('No se pudo guardar el umbral en este dispositivo.'); }
  pintaAvisos();
}
function quitarAvisoCongelacion() {
  try { localStorage.removeItem(FREEZER_ALERT_KEY); } catch (e) {}
  pintaAvisos();
}
const _pintaAvisosFreezer = pintaAvisos;
pintaAvisos = function () {
  _pintaAvisosFreezer();
  const dias = freezerAlertDays(), hoy = Date.now();
  const congelados = (STOCK || []).filter(s => /^(cocina-|sotano-)/.test(normLoc(s.loc)) && Number(s.fechaCongelacion));
  const antiguos = dias ? congelados.filter(s => Math.floor((hoy - Number(s.fechaCongelacion)) / 86400000) >= dias).sort((a,b) => a.fechaCongelacion - b.fechaCongelacion) : [];
  const html = `<div class="bg-sky-50 border border-sky-200 rounded-xl p-3 text-xs mt-2"><p class="font-bold text-sky-900 mb-1">Antigüedad en el congelador</p>
    <p class="text-sky-900 mb-2">${dias ? `Aviso configurado a partir de ${dias} días. Es un recordatorio doméstico, no una fecha de caducidad ni una garantía de seguridad.` : 'Configura cuántos días quieres que pasen antes de mostrar un recordatorio. No se asigna un plazo universal.'}</p>
    <div class="flex gap-2"><input id="freezer-alert-days" type="number" min="1" max="3650" value="${dias || ''}" placeholder="Días" class="w-24 p-2 border rounded-lg bg-white"><button onclick="guardarAvisoCongelacion()" class="bg-sky-700 text-white px-3 rounded-lg font-bold">Guardar</button>${dias ? '<button onclick="quitarAvisoCongelacion()" class="underline text-slate-600">Quitar</button>' : ''}</div>
    ${antiguos.length ? `<div class="mt-3 border-t border-sky-200 pt-2"><p class="font-bold text-amber-800 mb-1">Revisa estos alimentos</p>${antiguos.map(s => `<p class="py-1">${esc(s.prod)} · ${Math.floor((hoy - Number(s.fechaCongelacion)) / 86400000)} días · ${esc(nombreLoc(s.loc))}</p>`).join('')}</div>` : ''}
    <p class="text-[10px] text-sky-800 mt-2">Se muestra la fecha del movimiento más antiguo registrado para esa ubicación y producto. Los plazos orientativos varían por alimento y se refieren a calidad: consulta <a class="underline" href="https://www.aesan.gob.es/AECOSAN/docs/documentos/publicaciones/seguridad_alimentaria/congelar_descongelar.pdf" target="_blank" rel="noopener">la guía de AESAN</a>.</p></div>`;
  $('avisos')?.insertAdjacentHTML('beforeend', html);
};
