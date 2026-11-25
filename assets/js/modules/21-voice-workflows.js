/* ===== Entrada por voz/texto y controles de voz para cocina guiada ===== */
(() => {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const speechAvailable = !!Recognition;
  const lower = value => String(value || '').toLocaleLowerCase('es-ES').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const numberWords = {
    cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9,
    diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17,
    dieciocho: 18, diecinueve: 19, veinte: 20, treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60,
    setenta: 70, ochenta: 80, noventa: 90
  };
  const parseNumber = raw => {
    const s = lower(raw).replace(/,/g, '.');
    if (/^\d+(?:\.\d+)?$/.test(s)) return Number(s);
    if (numberWords[s] != null) return numberWords[s];
    const tens = /^(treinta|cuarenta|cincuenta|sesenta|setenta|ochenta|noventa) y (uno|una|un|dos|tres|cuatro|cinco|seis|siete|ocho|nueve)$/.exec(s);
    if (tens) return numberWords[tens[1]] + numberWords[tens[2]];
    const veinti = /^veinti(uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve)$/.exec(s);
    if (veinti) return 20 + numberWords[veinti[1]];
    return null;
  };
  const numWords = Object.keys(numberWords).filter(k => numberWords[k] > 0).concat(['veintiuno','veintiuna','veintidos','veintitres','veinticuatro','veinticinco','veintiseis','veintisiete','veintiocho','veintinueve']);
  const quantityPattern = `(?:\\d+(?:[.,]\\d+)?|${numWords.join('|')}|(?:treinta|cuarenta|cincuenta|sesenta|setenta|ochenta|noventa)\\s+y\\s+(?:uno|una|un|dos|tres|cuatro|cinco|seis|siete|ocho|nueve))`;
  const locs = () => typeof LOCS === 'object' ? LOCS : {};
  const get = id => document.getElementById(id);
  const safe = value => typeof esc === 'function' ? esc(value) : String(value || '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
  let addRecognition = null, cookRecognition = null, saving = false, addOperationId = null;

  function parseLocation(text) {
    const t = lower(text);
    const drawer = /cajon\s*(\d)\s*(izquierda|izq\.?|derecha|der\.?)/.exec(t);
    if (drawer && /congelador/.test(t) && /(cocina|cocinas)/.test(t)) {
      const side = /izq/.test(drawer[2]) ? 'i' : 'd';
      return { key: `cocina-${side}${drawer[1]}`, phrase: drawer[0] };
    }
    if (drawer && /congelador/.test(t) && /(sotano|bodega)/.test(t)) return { key: `sotano-${drawer[1]}`, phrase: drawer[0] };
    if (/congelador\s+(?:del?\s+)?sotano|congelador sotano|congelador de bodega/.test(t)) return { key: 'sotano-1', phrase: 'congelador del sótano' };
    if (/congelador\s+(?:de\s+la\s+)?cocina|congelador cocina/.test(t)) return { key: 'cocina-i1', phrase: 'congelador de la cocina' };
    if (/frigorifico|frigo/.test(t)) return { key: 'frigo', phrase: 'frigorífico' };
    if (/despensa\s+(?:del?\s+)?sotano/.test(t)) return { key: 'despensa-sotano', phrase: 'despensa del sótano' };
    if (/despensa/.test(t) || /armario/.test(t)) return { key: 'despensa-cocina', phrase: 'despensa' };
    return { key: '', phrase: '' };
  }

  function parseCommand(raw) {
    const original = String(raw || '').trim();
    const normalized = lower(original);
    const location = parseLocation(normalized);
    const clean = normalized
      .replace(/\b(?:he\s+)?(?:congelado|congelada|guardado|guardada|metido|metida|anadido|anadida|comprado|comprada|puesto|puesta|registrado|registrada|añadido|añadida|compré|guarde|guarde|meti|metí)\b/g, ' ')
      .replace(/\b(?:en\s+el|en\s+la|en\s+los|en\s+las|al|a\s+la|a\s+los|a\s+las)\s+(?:cajon\s+\d+[^,]*)?\s*(?:del?\s+)?(?:congelador|frigorifico|frigo|despensa)?(?:\s+de\s+la\s+cocina|\s+de\s+la\s+bodega|\s+del\s+sotano)?\b/g, ' ')
      .replace(/\b(?:cajon\s*\d\s*(?:izquierda|izq\.?|derecha|der\.?))\b/g, ' ')
      .replace(/[.,;:!?]/g, ' ').replace(/\s+/g, ' ').trim();
    const qtyRe = new RegExp(`\\b(${quantityPattern})\\s*(raciones?|porciones?|unidades?|uds?\\.?|kg|kilos?|gramos?|gr|g|litros?|l|mililitros?|ml)\\s+(?:de\\s+)?`, 'i');
    const match = qtyRe.exec(clean);
    let qty = null, unit = '', product = clean;
    if (match) {
      qty = parseNumber(match[1]);
      const rawUnit = lower(match[2]).replace(/\.?$/, '');
      unit = /^(racion|raciones|porcion|porciones)$/.test(rawUnit) ? 'rac' : /^(kg|kilo|kilos)$/.test(rawUnit) ? 'kg' : /^(g|gr|gramo|gramos)$/.test(rawUnit) ? 'g' : /^(l|litro|litros)$/.test(rawUnit) ? 'l' : /^(ml|mililitro|mililitros)$/.test(rawUnit) ? 'ml' : 'ud';
      product = clean.slice(match.index + match[0].length).trim();
    }
    product = product.replace(/^(?:de\s+)?/i, '').replace(/\b(?:en|al|a la)\s*$/i, '').trim();
    const freeze = /\b(congelad[oa]s?|congelar|congel[eé])\b/.test(normalized);
    return { raw: original, product, qty, unit, loc: locs()[location.key] ? location.key : '', freeze, locationPhrase: location.phrase };
  }

  function renderAddPanel() {
    const pantry = get('s-despensa');
    if (!pantry || get('voice-add-panel')) return;
    const anchor = get('sync-estado');
    const panel = document.createElement('section');
    panel.id = 'voice-add-panel';
    panel.className = 'bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-3';
    panel.innerHTML = `<details><summary class="font-bold text-sm text-emerald-900 cursor-pointer">🎙️ Añadir por voz o texto natural</summary>
      <p class="text-xs text-emerald-900 mt-2">Describe una nueva entrada, por ejemplo: «He congelado seis raciones de lentejas en el cajón 1 derecha del congelador de la cocina». Se revisa antes de guardar. Para mover una existencia ya registrada, usa el botón Mover.</p>
      <textarea id="voice-add-text" rows="2" maxlength="300" placeholder="¿Qué alimento has añadido y dónde?" class="w-full p-2 border rounded-lg bg-white text-sm mt-2"></textarea>
      <div class="flex gap-2 mt-2"><button id="voice-add-mic" type="button" class="flex-1 bg-slate-800 text-white p-2 rounded-lg text-xs font-bold">🎤 Dictar</button><button id="voice-add-parse" type="button" class="flex-1 bg-emerald-700 text-white p-2 rounded-lg text-xs font-bold">Interpretar</button></div>
      <p id="voice-add-status" role="status" aria-live="polite" class="text-xs text-slate-600 mt-2"></p>
      <div id="voice-add-review" class="hidden bg-white rounded-lg p-3 mt-2"><p class="text-xs font-bold text-emerald-900 mb-2">Revisa los datos antes de guardar</p>
        <label class="block text-xs mb-2">Alimento<input id="voice-add-product" maxlength="80" class="w-full p-2 border rounded-lg mt-1 text-sm"></label>
        <div class="grid grid-cols-2 gap-2 mb-2"><label class="text-xs">Cantidad<input id="voice-add-qty" type="number" min="0.001" step="any" class="w-full p-2 border rounded-lg mt-1 text-sm"></label><label class="text-xs">Unidad<select id="voice-add-unit" class="w-full p-2 border rounded-lg mt-1 text-sm"><option value="rac">raciones</option><option value="ud">unidades</option><option value="kg">kg</option><option value="g">g</option><option value="l">litros</option><option value="ml">ml</option></select></label></div>
        <label class="block text-xs mb-2">Ubicación<select id="voice-add-loc" class="w-full p-2 border rounded-lg mt-1 text-sm"><option value="">Selecciona ubicación</option>${Object.entries(locs()).map(([key, label]) => `<option value="${safe(key)}">${safe(label)}</option>`).join('')}</select></label>
        <label class="block text-xs mb-1">Estado/categoría para sugerir orientación<select id="voice-add-category" class="w-full p-2 border rounded-lg mt-1 text-sm"><option value="">No especificado</option><option value="poultry_raw">Pollo o pavo crudo</option><option value="ground_raw">Carne picada cruda</option><option value="fish_fresh">Pescado o marisco fresco</option><option value="meat_cut_raw">Corte fresco de vacuno, cerdo o cordero</option><option value="cooked_leftovers">Sopa, guiso o sobras cocinadas</option></select></label><label class="block text-xs mb-1">Fecha de caducidad de la etiqueta (opcional)<input id="voice-add-expiry" type="date" class="w-full p-2 border rounded-lg mt-1 text-sm"></label><label class="block text-xs mb-1">Recordatorio de consumo (manual/orientativo)<input id="voice-add-reminder" type="date" onchange="document.getElementById('voice-add-source').value=''" class="w-full p-2 border rounded-lg mt-1 text-sm"></label><input type="hidden" id="voice-add-source"><button type="button" onclick="sugerirCaducidadVoz()" class="text-[10px] underline text-sky-800 mb-2">Sugerir recordatorio refrigerado</button>
        <p id="voice-add-kind" class="text-[11px] text-slate-500 mb-2"></p>
        <button id="voice-add-save" type="button" class="w-full bg-emerald-700 text-white p-2 rounded-lg text-xs font-bold">Confirmar y guardar entrada</button>
      </div></details>`;
    if (anchor?.parentNode) anchor.insertAdjacentElement('afterend', panel); else pantry.prepend(panel);
    get('voice-add-mic').addEventListener('click', beginAddDictation);
    get('voice-add-parse').addEventListener('click', showAddReview);
    get('voice-add-save').addEventListener('click', saveAdd);
    panel.querySelector('details')?.addEventListener('toggle', event => { if (!event.currentTarget.open) stopAddRecognition(); });
  }

  function showAddReview(text) {
    const input = get('voice-add-text');
    if (text != null) input.value = text;
    const result = parseCommand(input.value);
    const review = get('voice-add-review'), status = get('voice-add-status');
    review.classList.remove('hidden');
    get('voice-add-product').value = result.product;
    if (result.qty != null) get('voice-add-qty').value = String(result.qty); else get('voice-add-qty').value = '';
    if (result.unit) get('voice-add-unit').value = result.unit;
    get('voice-add-loc').value = result.loc;
    const freezerLocation = /^(?:cocina-|sotano-)/.test(result.loc);
    get('voice-add-kind').textContent = result.freeze && freezerLocation
      ? 'Se registrará como una entrada ya congelada. La fecha del movimiento quedará como momento de congelación.'
      : result.freeze ? 'La frase menciona congelación, pero la ubicación no es un congelador; se guardará como alta normal.'
      : 'Se registrará como una nueva entrada en la ubicación elegida.';
    const missing = [];
    if (!result.product) missing.push('alimento');
    if (!(result.qty > 0)) missing.push('cantidad');
    if (!result.unit) missing.push('unidad');
    if (!result.loc) missing.push('ubicación');
    status.textContent = missing.length ? `Completa o corrige: ${missing.join(', ')}.` : 'Interpretación lista. Comprueba todos los campos; no se guarda hasta confirmar.';
    get('voice-add-save').disabled = missing.length > 0 || !USER;
  }

  async function saveAdd() {
    if (saving) return;
    const product = get('voice-add-product').value.trim().slice(0, 80), qty = Number(get('voice-add-qty').value), unit = get('voice-add-unit').value, loc = get('voice-add-loc').value;
    if (!USER) { get('voice-add-status').textContent = 'Inicia sesión antes de guardar.'; return; }
    if (!product || !(qty > 0) || !Object.hasOwn(locs(), loc)) { get('voice-add-status').textContent = 'Revisa alimento, cantidad y ubicación antes de guardar.'; return; }
    if (typeof mov !== 'function') { get('voice-add-status').textContent = 'No se pudo conectar con el guardado del inventario.'; return; }
    saving = true;
    const button = get('voice-add-save'); button.disabled = true;
    const parsed = parseCommand(get('voice-add-text').value);
    const isFrozenEntry = parsed.freeze && /^(?:cocina-|sotano-)/.test(loc);
    const note = isFrozenEntry ? 'congelado por voz' : 'alta por voz o texto';
    if (!addOperationId) addOperationId = 'voice-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,10);
    const movement = { t: Date.now(), por: USER.email || '', prod: product, cod: '', cant: qty, ud: unit, cad: get('voice-add-expiry').value || '', recordatorio: get('voice-add-reminder').value || '', recordatorioFuente: get('voice-add-source').value || '', recordatorioCategoria: get('voice-add-category').value || '', fmt: '', img: '', ns: '', marca: '', fechaCongelacion: isFrozenEntry ? Date.now() : null, de: '', a: loc, tipo: isFrozenEntry ? 'congelar' : 'alta', nota: note, sourceOperationId: addOperationId };
    try {
      if (typeof window.fb?.set !== 'function') throw new Error('Firebase no disponible');
      await window.fb.set('mov', addOperationId, movement);
      addOperationId = null;
      get('voice-add-status').textContent = 'Entrada guardada para sincronizar. Comprueba que aparezca en la ubicación indicada.';
      get('voice-add-review').classList.add('hidden');
      get('voice-add-text').value = '';
    } catch (error) {
      get('voice-add-status').textContent = 'No se pudo confirmar la escritura. El borrador se conserva; vuelve a intentar guardar para repetir la misma operación sin crear otra entrada.';
    } finally {
      saving = false;
      button.disabled = !USER;
    }
  }

  function beginAddDictation() {
    const status = get('voice-add-status');
    if (!speechAvailable) { status.textContent = 'Este navegador no ofrece dictado por voz. Puedes escribir la frase en el campo de texto.'; return; }
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') { status.textContent = 'El dictado requiere una página segura (HTTPS o localhost). Usa el campo de texto mientras tanto.'; return; }
    stopAddRecognition();
    try {
      addRecognition = new Recognition(); addRecognition.lang = 'es-ES'; addRecognition.interimResults = false; addRecognition.maxAlternatives = 1;
      addRecognition.onstart = () => { status.textContent = 'Escuchando…'; get('voice-add-mic').disabled = true; };
      addRecognition.onresult = event => { const phrase = event.results?.[0]?.[0]?.transcript || ''; showAddReview(phrase); };
      addRecognition.onerror = event => { status.textContent = event.error === 'not-allowed' ? 'No se concedió permiso para el micrófono. Puedes escribir la frase.' : `No se pudo reconocer la voz (${event.error || 'error'}). Prueba a escribirla.`; };
      addRecognition.onend = () => { get('voice-add-mic').disabled = false; };
      addRecognition.start();
    } catch (error) { status.textContent = 'No se pudo iniciar el micrófono. Escribe la frase en el campo de texto.'; get('voice-add-mic').disabled = false; }
  }
  function stopAddRecognition() { if (addRecognition) { try { addRecognition.abort(); } catch (e) {} addRecognition = null; } }

  function speakCurrentStep() {
    const status = get('voice-cook-status');
    if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') { status.textContent = 'La lectura en voz alta no está disponible en este navegador.'; return; }
    if (typeof VR === 'undefined' || !VR || typeof CK === 'undefined' || !CK) return;
    const steps = VR.p || [];
    const text = CK.i < 0 ? `Ingredientes para ${VS?.rac || 2} raciones: ${(VR.i || []).map(x => typeof normIng === 'function' ? normIng(x).n : x.n || x).join(', ')}.` : CK.i >= steps.length ? 'Receta terminada.' : `Paso ${CK.i + 1}. ${typeof steps[CK.i] === 'string' ? steps[CK.i] : steps[CK.i]?.t || ''}`;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text); utterance.lang = 'es-ES';
    window.speechSynthesis.speak(utterance); status.textContent = 'Leyendo el paso actual.';
  }

  function interpretCookCommand(phrase) {
    const text = lower(phrase), status = get('voice-cook-status');
    if (/\b(siguiente|avanza|continuar|continua|contin[uú]a|adelante)\b/.test(text)) { ckMov(1); status.textContent = 'Paso siguiente.'; }
    else if (/\b(atras|anterior|vuelve|retrocede)\b/.test(text)) { ckMov(-1); status.textContent = 'Paso anterior.'; }
    else if (/\b(repite|repetir|lee|leer|otra vez)\b/.test(text)) speakCurrentStep();
    else if (/\b(cerrar|salir|terminar|acabar)\b/.test(text)) { cocinaCerrar(); }
    else if (/\b(temporizador|timer|cronometro)\b/.test(text)) {
      if (typeof CK !== 'undefined' && CK && CK.i >= 0 && CK.i < VR.p.length && VR.p[CK.i]?.m) { iniciarTimerPaso(CK.i); status.textContent = 'Temporizador iniciado.'; }
      else status.textContent = 'El paso actual no tiene un temporizador disponible.';
    } else status.textContent = 'No entendí la orden. Di «siguiente», «atrás», «repite», «temporizador» o «salir».';
  }

  function beginCookDictation() {
    const status = get('voice-cook-status');
    if (!speechAvailable) { status.textContent = 'Este navegador no ofrece reconocimiento de voz. Usa los botones grandes.'; return; }
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') { status.textContent = 'El control por voz requiere HTTPS o localhost. Puedes seguir usando los botones.'; return; }
    stopCookRecognition();
    try {
      cookRecognition = new Recognition(); cookRecognition.lang = 'es-ES'; cookRecognition.interimResults = false; cookRecognition.maxAlternatives = 1;
      cookRecognition.onstart = () => { status.textContent = 'Escuchando una orden…'; get('voice-cook-mic').disabled = true; };
      cookRecognition.onresult = event => interpretCookCommand(event.results?.[0]?.[0]?.transcript || '');
      cookRecognition.onerror = event => { status.textContent = event.error === 'not-allowed' ? 'No se concedió permiso para el micrófono.' : `No se pudo reconocer la orden (${event.error || 'error'}).` ; };
      cookRecognition.onend = () => { const mic = get('voice-cook-mic'); if (mic) mic.disabled = false; };
      cookRecognition.start();
    } catch (error) { status.textContent = 'No se pudo activar el micrófono. Usa los botones grandes.'; get('voice-cook-mic').disabled = false; }
  }
  function stopCookRecognition() { if (cookRecognition) { try { cookRecognition.abort(); } catch (e) {} cookRecognition = null; } }

  function mountCookControls() {
    const modal = get('m-ck');
    if (!modal || get('voice-cook-controls')) return;
    const nav = modal.querySelector('.grid.grid-cols-2');
    if (!nav) return;
    const controls = document.createElement('div'); controls.id = 'voice-cook-controls'; controls.className = 'mt-3';
    controls.innerHTML = `<div class="grid grid-cols-2 gap-2"><button id="voice-cook-mic" type="button" class="bg-emerald-700 rounded-xl py-3 text-sm font-bold">🎙️ Escuchar orden</button><button id="voice-cook-repeat" type="button" class="bg-slate-700 rounded-xl py-3 text-sm font-bold">🔊 Repetir paso</button></div><p id="voice-cook-status" role="status" aria-live="polite" class="text-xs text-slate-300 mt-2"></p>`;
    nav.insertAdjacentElement('afterend', controls);
    get('voice-cook-mic').addEventListener('click', beginCookDictation);
    get('voice-cook-repeat').addEventListener('click', speakCurrentStep);
    if (!speechAvailable) get('voice-cook-mic').disabled = true;
  }

  function init() {
    renderAddPanel();
    const originalOpen = window.cocinaAbrir;
    if (typeof originalOpen === 'function') window.cocinaAbrir = function (...args) { const result = originalOpen.apply(this, args); mountCookControls(); return result; };
    const originalClose = window.cocinaCerrar;
    if (typeof originalClose === 'function') window.cocinaCerrar = function (...args) { stopCookRecognition(); if ('speechSynthesis' in window) window.speechSynthesis.cancel(); return originalClose.apply(this, args); };
    const mic = get('voice-add-mic');
    if (!speechAvailable && mic) mic.title = 'Dictado no disponible; puedes usar texto.';
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();
