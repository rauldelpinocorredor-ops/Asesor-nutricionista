/* ===== Batch Cooking MVP: vista previa combinada a partir de recetas existentes ===== */
(() => {
  const toggle = document.getElementById('bc-toggle');
  const panel = document.getElementById('bc-panel');
  const recipesBox = document.getElementById('bc-recipes');
  const previewBox = document.getElementById('bc-preview');
  const sourceToggle = document.getElementById('bc-source');
  const sourceNote = document.getElementById('bc-source-note');
  const searchBox = document.getElementById('bc-search');
  if (!toggle || !panel || !recipesBox || !previewBox || !sourceToggle || !searchBox) return;

  let allListed = [];
  let listed = [];
  let demoMode = false;
  const selectedById = new Map();
  const servingsById = new Map();
  let durationOverrides = new Map();
  const demoRecipes = [
    {
      id: 'bc-demo-arroz', n: '[DEMO] Arroz de prueba', rac: 4,
      i: [
        { n: 'arroz', c: 300, u: 'g' },
        { n: 'pollo', c: 500, u: 'g' },
        { n: 'aceite de oliva', c: 30, u: 'ml' },
        { n: 'caldo', c: 600, u: 'ml' }
      ],
      p: [
        { t: 'Dora el pollo con aceite 6 min.', m: 6 },
        { t: 'Cuece a fuego lento durante 20 min.', m: 20 },
        { t: 'Voltea el pollo y cocina 2 min más.', m: 2 }
      ]
    },
    {
      id: 'bc-demo-crema', n: '[DEMO] Crema de prueba', rac: 4,
      i: [
        { n: 'calabacín', c: 800, u: 'g' },
        { n: 'cebolla', c: 150, u: 'g' },
        { n: 'aceite de oliva', c: 15, u: 'ml' },
        { n: 'agua', c: 500, u: 'ml' }
      ],
      p: [
        { t: 'Sofríe la cebolla y el calabacín con aceite 6 min.', m: 6 },
        { t: 'Prepara los recipientes y las hierbas 2 min.', m: 2 },
        { t: 'Tritura la crema 3 min.', m: 3 }
      ]
    }
  ];
  const recipes = () => (typeof todas === 'function' ? todas() : [])
    .filter(r => r && r.id && r.id !== 'ia' && r.n && Array.isArray(r.p) && r.p.length)
    .sort((a, b) => String(a.n).localeCompare(String(b.n), 'es'));

  const recipeSearchText = recipe => [recipe.n, recipe.tipo, recipe.categoria, recipe.dietas || [], (recipe.i || []).map(ing => normIng(ing).n), (recipe.p || []).map(step => typeof step === 'string' ? step : step?.t || '')]
    .flat(Infinity).filter(Boolean).join(' ');
  const normalizeSearch = value => (typeof sinAc === 'function' ? sinAc(value) : value)
    .toLowerCase().replace(/\bexpress\b/g, 'expres');
  function renderRecipeList() {
    const tokens = normalizeSearch(searchBox.value).trim().split(/\s+/).filter(Boolean);
    listed = allListed.filter(recipe => {
      const source = normalizeSearch(recipeSearchText(recipe));
      return tokens.every(token => source.includes(token));
    });
    const count = selectedById.size;
    recipesBox.innerHTML = listed.length ? `<p class="text-[11px] text-slate-600">${count} seleccionada(s) · ${listed.length} resultado(s)</p>` + listed.map((r, i) => `
      <label class="flex items-center gap-2 bg-white rounded-lg p-2 text-xs">
        <input type="checkbox" data-bc-index="${i}" class="w-4 h-4 accent-amber-700" ${selectedById.has(r.id) ? 'checked' : ''}>
        <span class="flex-1 font-medium">${esc(r.n)}</span>
        <span class="text-slate-500">Raciones</span>
        <input type="number" data-bc-servings="${i}" min="1" max="30" value="${servingsById.get(r.id) || Math.max(1, +r.rac || 2)}" class="w-16 p-1 border rounded text-center" aria-label="Raciones de ${esc(r.n)}">
      </label>`).join('') : `<p class="text-xs text-slate-600">${tokens.length ? 'No hay recetas que coincidan con la búsqueda.' : 'Todavía no hay recetas con pasos disponibles.'}</p>`;
  }

  function renderRecipes() {
    allListed = demoMode ? demoRecipes : recipes();
    sourceToggle.textContent = demoMode ? 'Volver a mis recetas' : 'Usar recetas de demostración local';
    sourceNote.textContent = demoMode
      ? 'Modo demostración: estas recetas temporales solo están en esta página y no se guardan.'
      : 'Las recetas de demostración son temporales; puedes activarlas sin guardar nada en tu cuenta.';
    renderRecipeList();
    previewBox.innerHTML = '';
  }

  function selectedRecipes() {
    return [...selectedById.values()];
  }

  function scaledIngredients(selection) {
    const grouped = new Map(), unmeasured = [];
    selection.forEach(({ recipe, servings }) => {
      const base = Math.max(1, +recipe.rac || 2), factor = servings / base;
      (recipe.i || []).forEach(raw => {
        const item = normIng(raw), name = String(item.n || '').trim();
        if (!name) return;
        if (item.c == null || !item.u) { unmeasured.push(name); return; }
        let quantity = item.c * factor, unit = String(item.u).toLowerCase();
        if (unit === 'kg') { quantity *= 1000; unit = 'g'; }
        if (unit === 'l') { quantity *= 1000; unit = 'ml'; }
        const key = `${sinAc(name)}|${unit}`;
        const row = grouped.get(key) || { name, quantity: 0, unit };
        row.quantity += quantity;
        grouped.set(key, row);
      });
    });
    return { measured: [...grouped.values()], unmeasured: [...new Set(unmeasured)] };
  }

  const canonicalIngredientName = value => {
    let name = sinAc(value).replace(/\s+/g, ' ').trim();
    const aliases = typeof ALIAS !== 'undefined' && Array.isArray(ALIAS) ? ALIAS : [];
    const seen = new Set();
    for (let i = 0; i < aliases.length; i++) {
      if (seen.has(name)) break;
      seen.add(name);
      const alias = aliases.find(row => sinAc(row.de).replace(/\s+/g, ' ').trim() === name);
      if (!alias) break;
      name = sinAc(alias.a).replace(/\s+/g, ' ').trim();
    }
    return name;
  };
  function comparableQuantity(quantity, unit) {
    const normalized = sinAc(unit).trim().replace(/\.$/, '').replace(/\s+/g, ' ');
    if (!Number.isFinite(Number(quantity)) || !normalized) return null;
    if (normalized === 'kg') return { value: Number(quantity) * 1000, unit: 'g' };
    if (normalized === 'g') return { value: Number(quantity), unit: 'g' };
    if (normalized === 'l') return { value: Number(quantity) * 1000, unit: 'ml' };
    if (normalized === 'ml') return { value: Number(quantity), unit: 'ml' };
    if (['ud', 'uds', 'unidad', 'unidades'].includes(normalized)) return { value: Number(quantity), unit: 'ud' };
    return { value: Number(quantity), unit: normalized };
  }
  function ingredientAvailability(ingredient) {
    if (typeof STOCK === 'undefined' || !Array.isArray(STOCK) || typeof USER === 'undefined' || !USER || typeof STOCK_READY === 'undefined' || !STOCK_READY) {
      return { state: 'unverified', label: 'No validable', detail: 'Inicia sesión y espera a que cargue el inventario.' };
    }
    const name = canonicalIngredientName(ingredient.name);
    const matches = STOCK.filter(item => item && Number(item.cant) > 0 && canonicalIngredientName(item.prod) === name);
    if (!matches.length) return { state: 'missing', label: 'Falta', detail: 'No aparece en el inventario.' };
    if (ingredient.quantity == null || !ingredient.unit) {
      return { state: 'uncomparable', label: 'No comparable', detail: `Aparece en ${matches.length} ubicación(es), pero la receta no indica cantidad y unidad.` };
    }
    const needed = comparableQuantity(ingredient.quantity, ingredient.unit);
    if (!needed) return { state: 'uncomparable', label: 'No comparable', detail: 'La cantidad o la unidad de la receta no se pueden interpretar.' };
    const comparable = matches.map(item => comparableQuantity(item.cant, item.ud)).filter(item => item && item.unit === needed.unit);
    if (!comparable.length) {
      const stockUnits = [...new Set(matches.map(item => `${fmtQ(item.cant, item.ud)}`))].join(', ');
      return { state: 'uncomparable', label: 'No comparable', detail: `Hay existencias (${stockUnits}), pero usan unidades incompatibles con ${needed.unit}.` };
    }
    const available = comparable.reduce((sum, item) => sum + item.value, 0);
    const shortfall = Math.max(0, needed.value - available);
    const hasOtherUnits = comparable.length !== matches.length;
    if (shortfall <= 1e-6) return { state: 'available', label: 'Disponible', detail: `Hay ${fmtQ(available, needed.unit)} de ${fmtQ(needed.value, needed.unit)} necesarios${hasOtherUnits ? '; se han sumado solo unidades comparables' : ''}.` };
    if (available > 0) return { state: 'partial', label: 'Parcial', detail: `Hay ${fmtQ(available, needed.unit)}; faltan ${fmtQ(shortfall, needed.unit)}.${hasOtherUnits ? ' Hay otras existencias en unidades incompatibles que no se han sumado.' : ''}` };
    return { state: 'missing', label: 'Falta', detail: `No hay cantidad comparable; faltan ${fmtQ(needed.value, needed.unit)}.` };
  }
  const availabilityStyle = state => ({
    available: 'bg-emerald-100 text-emerald-800',
    partial: 'bg-amber-100 text-amber-900',
    missing: 'bg-rose-100 text-rose-800',
    uncomparable: 'bg-slate-100 text-slate-700',
    unverified: 'bg-slate-100 text-slate-700'
  }[state] || 'bg-slate-100 text-slate-700');

  const requiresManualAttention = text => /\b(?:dar(?:le|les|la|las|los)?\s+la vuelta|dale(?:s)?\s+la vuelta|d[áa]ndo(?:le|les)?\s+la vuelta|vuelta a mitad|a mitad de(?:l)? proceso|remover|remueve|removiendo|revolver|revuelve|revolviendo|girar|gira|girando|voltear|voltea|volteando|mover|mueve|moviendo|regar|riega|regando|mezclar|mezcla|mezclando|revisar|revisa|revisando|comprobar|comprueba|controlar|controla|vigilar|vigila|supervisar|supervisión)\b/i.test(text || '');
  const isWaitStep = text => !requiresManualAttention(text) && /\b(?:cuece|cocer|hornea|hornear|reposar|reposa|deja\s+(?:reposar|enfriar)|marina|marinar|enfr[ií]a|enfriar|fermenta|fermentar|a fuego lento|cocina a fuego)\b/i.test(text || '');
  const stepMinutes = step => {
    const text = typeof step === 'string' ? step : String(step?.t || '');
    const raw = typeof step === 'string' ? null : Number(step?.m);
    const fromText = typeof minDe === 'function' ? minDe(text) : null;
    const minutes = Number.isFinite(raw) && raw > 0 ? raw : fromText;
    return Number.isFinite(minutes) && minutes > 0 && minutes <= 600 ? Math.round(minutes) : null;
  };
  const durationKey = (recipe, index) => `${recipe.id}::${index}`;
  const minutesFor = (recipe, step, index, overrides) => overrides.has(durationKey(recipe, index))
    ? overrides.get(durationKey(recipe, index)) : stepMinutes(step);
  function missingDurations(selection, overrides) {
    const missing = [];
    selection.forEach(({ recipe }) => (recipe.p || []).forEach((step, index) => {
      if (minutesFor(recipe, step, index, overrides)) return;
      missing.push({ recipe, index, text: typeof step === 'string' ? step : String(step?.t || '') });
    }));
    return missing;
  }
  const formatClock = (offset, start) => {
    const [hour, minute] = String(start || '09:00').split(':').map(Number);
    const absolute = (hour * 60 + minute) + offset, days = Math.floor(absolute / 1440), inDay = ((absolute % 1440) + 1440) % 1440;
    return `${String(Math.floor(inDay / 60)).padStart(2, '0')}:${String(inDay % 60).padStart(2, '0')}${days ? ` (+${days} día${days === 1 ? '' : 's'})` : ''}`;
  };

  function planTimeline(selection, startTime, overrides) {
    const jobs = selection.map(({ recipe, servings }) => ({
      recipe: recipe.n,
      steps: (recipe.p || []).map((step, index) => ({
        text: typeof step === 'string' ? step : String(step.t || ''),
        minutes: minutesFor(recipe, step, index, overrides), estimated: overrides.has(durationKey(recipe, index)), index: index + 1, servings,
        requiresAttention: requiresManualAttention(typeof step === 'string' ? step : String(step.t || ''))
      })),
      next: 0, readyAt: 0
    }));
    if (jobs.some(job => job.steps.some(step => !step.minutes))) return { complete: false, reason: 'durations', entries: [], jobs };

    let now = 0, guard = 0;
    const entries = [];
    while (jobs.some(job => job.next < job.steps.length) && guard++ < 1000) {
      const openWaits = entries.filter(entry => entry.wait && entry.end > now);
      const ready = jobs.filter(job => job.next < job.steps.length && job.readyAt <= now);
      const activeReady = ready.filter(job => !isWaitStep(job.steps[job.next].text));

      if (activeReady.length) {
        let job = activeReady[0], window = null;
        if (openWaits.length) {
          job = activeReady.find(candidate => openWaits.some(wait => now + candidate.steps[candidate.next].minutes <= wait.end));
          if (!job) {
            now = Math.min(...openWaits.map(wait => wait.end));
            continue;
          }
          window = openWaits.find(wait => now + job.steps[job.next].minutes <= wait.end);
        }
        const step = job.steps[job.next], entry = { recipe: job.recipe, step, start: now, end: now + step.minutes, wait: false, during: window?.recipe || '' };
        entries.push(entry); job.next++; job.readyAt = entry.end; now = entry.end;
        continue;
      }

      if (ready.length) {
        const job = ready.find(candidate => isWaitStep(candidate.steps[candidate.next].text));
        if (job && !openWaits.length) {
          const step = job.steps[job.next], entry = { recipe: job.recipe, step, start: now, end: now + step.minutes, wait: true, during: '' };
          entries.push(entry); job.next++; job.readyAt = entry.end;
          continue;
        }
      }

      const nextReady = jobs.filter(job => job.next < job.steps.length).map(job => job.readyAt).filter(time => time > now);
      const nextWaitEnd = openWaits.map(wait => wait.end).filter(time => time > now);
      const next = [...nextReady, ...nextWaitEnd].sort((a, b) => a - b)[0];
      if (next == null) return { complete: false, reason: 'scheduler', entries: [], jobs };
      now = next;
    }
    if (guard >= 1000 || jobs.some(job => job.next < job.steps.length)) return { complete: false, reason: 'scheduler', entries: [], jobs };
    return { complete: true, entries: entries.sort((a, b) => a.start - b.start || (a.wait !== b.wait ? (a.wait ? -1 : 1) : a.end - b.end)), jobs };
  }

  function sequentialHtml(selection, overrides) {
    return selection.map(({ recipe }) => `<li class="mb-2"><b>${esc(recipe.n)}</b><ol class="list-decimal pl-5">${(recipe.p || []).map((step, i) => {
      const text = typeof step === 'string' ? step : String(step.t || ''), minutes = minutesFor(recipe, step, i, overrides), estimated = overrides.has(durationKey(recipe, i));
      const attention = requiresManualAttention(text) ? ' · <b class="text-amber-800">requiere atención manual</b>' : '';
      return `<li>${esc(text)} <span class="text-slate-500">(${minutes ? `${minutes} min ${estimated ? 'estimados para este plan' : 'indicados'}` : 'sin duración'})</span>${attention}</li>`;
    }).join('')}</ol></li>`).join('');
  }

  function timelineHtml(entries, startTime) {
    return entries.map(entry => `<li class="py-1"><span class="font-bold">${formatClock(entry.start, startTime)}–${formatClock(entry.end, startTime)}</span> · ${entry.wait ? 'espera' : entry.during ? `en paralelo con espera de «${esc(entry.during)}»` : 'preparación'} · <b>${esc(entry.recipe)}</b>: ${esc(entry.step.text)}${entry.step.estimated ? ' <span class="text-amber-800">(tiempo estimado para este plan)</span>' : ''}${entry.step.requiresAttention ? ' <b class="text-amber-800">(requiere atención manual; no se solapa)</b>' : ''}</li>`).join('');
  }

  function renderDurationPrompt(selection, missing) {
    previewBox.innerHTML = `
      <div class="bg-white rounded-lg p-3 text-xs">
        <h4 class="font-bold text-sm mb-1">Estima los pasos sin duración</h4>
        <p class="text-slate-600 mb-3">Indica los minutos que calculas para cada paso. Solo se usarán en esta vista previa; no modifican la receta guardada. Puedes dejar alguno vacío y continuar con un plan secuencial sin optimizar.</p>
        <div class="space-y-2">${missing.map((item, i) => `
          <label class="block rounded-lg border border-amber-200 bg-amber-50 p-2">
            <span class="block font-bold">${esc(item.recipe.n)} · Paso ${item.index + 1}</span>
            <span class="block text-slate-700 mt-1">${esc(item.text || 'Paso sin descripción')}</span>
            <span class="flex items-center gap-2 mt-2">Minutos estimados <input data-bc-duration="${i}" type="number" min="1" max="600" step="1" inputmode="numeric" class="w-20 p-1 border rounded bg-white" placeholder="min"></span>
          </label>`).join('')}</div>
        <div class="flex flex-col sm:flex-row gap-2 mt-3">
          <button id="bc-duration-calculate" type="button" class="flex-1 bg-amber-700 text-white py-2 rounded-lg font-bold">Calcular con estos tiempos</button>
          <button id="bc-duration-sequential" type="button" class="flex-1 bg-white border border-amber-300 text-amber-950 py-2 rounded-lg font-bold">Continuar sin estimar los pendientes</button>
        </div>
        <p id="bc-duration-error" class="text-red-700 mt-2" role="status"></p>
      </div>`;

    function captureInputs() {
      const next = new Map(durationOverrides);
      previewBox.querySelectorAll('[data-bc-duration]').forEach(input => {
        const item = missing[Number(input.dataset.bcDuration)];
        if (!item) return;
        const key = durationKey(item.recipe, item.index), raw = input.value.trim();
        const minutes = Number(raw);
        if (raw && Number.isInteger(minutes) && minutes >= 1 && minutes <= 600) next.set(key, minutes);
        else next.delete(key);
      });
      durationOverrides = next;
    }

    document.getElementById('bc-duration-calculate')?.addEventListener('click', () => {
      captureInputs();
      const pending = missingDurations(selection, durationOverrides);
      if (pending.length) {
        renderDurationPrompt(selection, pending);
        const error = document.getElementById('bc-duration-error');
        if (error) error.textContent = 'Completa un número de minutos entre 1 y 600 o continúa con los pasos pendientes sin estimar.';
        return;
      }
      buildPreview(selection, durationOverrides);
    });
    document.getElementById('bc-duration-sequential')?.addEventListener('click', () => {
      captureInputs();
      buildPreview(selection, durationOverrides);
    });
  }

  function buildPreview(selection, overrides = durationOverrides) {
    const { measured, unmeasured } = scaledIngredients(selection);
    const availabilityRows = [
      ...measured.map(item => ({ name: item.name, quantity: item.quantity, unit: item.unit })),
      ...unmeasured.map(name => ({ name, quantity: null, unit: '' }))
    ].map(item => ({ ...item, availability: ingredientAvailability(item) }));
    const timeline = planTimeline(selection, document.getElementById('bc-start')?.value || '09:00', overrides);
    const unknownSteps = timeline.jobs.flatMap(job => job.steps.filter(step => !step.minutes).map(step => ({ recipe: job.recipe, text: step.text })));
    const ingredientHtml = measured.length
      ? measured.map(item => `<li>${esc(fmtQ(item.quantity, item.unit))} de ${esc(item.name)}</li>`).join('')
      : '<li>No hay cantidades medibles en las recetas seleccionadas.</li>';
    const availabilityHtml = availabilityRows.length
      ? availabilityRows.map(item => `<li class="rounded-lg border border-slate-200 bg-white p-2"><div class="flex items-start justify-between gap-2"><span class="font-medium">${item.quantity == null ? '' : `${esc(fmtQ(item.quantity, item.unit))} de `}${esc(item.name)}</span><span class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${availabilityStyle(item.availability.state)}">${esc(item.availability.label)}</span></div><p class="mt-1 text-slate-600">${esc(item.availability.detail)}</p></li>`).join('')
      : '<li>No hay ingredientes para comparar.</li>';
    const hasParallel = timeline.entries.some(entry => entry.during);
    const schedule = timeline.complete
      ? `<p class="text-slate-600 mb-2">${hasParallel ? 'Cronograma provisional con tareas que caben dentro de esperas detectadas.' : 'Cronograma secuencial; no se detectaron tareas paralelas que encajen en una espera.'}</p><ol class="list-decimal pl-5 mb-3">${timelineHtml(timeline.entries, document.getElementById('bc-start')?.value || '09:00')}</ol>`
      : `<p class="bg-amber-50 text-amber-900 rounded p-2 mb-2"><b>Plan incompleto y no optimizado.</b> ${timeline.reason === 'durations' ? `Quedan ${unknownSteps.length} paso(s) sin duración estimada.` : 'No se pudo completar el cálculo del cronograma.'} Se conserva el orden de las recetas y no se proponen solapamientos ni horas calculadas.</p><ol class="list-decimal pl-5 mb-3">${sequentialHtml(selection, overrides)}</ol>`;

    previewBox.innerHTML = `
      <div class="bg-white rounded-lg p-3 text-xs">
        <div class="flex justify-between items-start gap-2"><h4 class="font-bold text-sm">Vista previa · ${selection.length} receta(s)</h4><button id="bc-clear" type="button" class="underline text-slate-500">Limpiar</button></div>
        <p class="text-slate-500 mt-1 mb-3">${selection.map(x => `${esc(x.recipe.n)} (${x.servings} raciones)`).join(' · ')}</p>
        <h5 class="font-bold">Ingredientes sumados</h5><ul class="list-disc pl-5 mb-3">${ingredientHtml}</ul>
        ${unmeasured.length ? `<p class="text-amber-800 mb-3">Cantidades por revisar: ${unmeasured.map(esc).join(', ')}.</p>` : ''}
        <h5 class="font-bold mb-1">Disponibilidad en inventario</h5><p class="text-slate-500 mb-2">Comparación informativa por nombre exacto o alias y unidades compatibles; suma ubicaciones y lotes sin modificar existencias.</p><ul class="space-y-2 mb-3">${availabilityHtml}</ul>
        <h5 class="font-bold">${timeline.complete ? 'Cronograma desde ' + esc(document.getElementById('bc-start')?.value || '09:00') : 'Secuencia por receta'}</h5>${schedule}
        <p class="bg-amber-50 text-amber-900 rounded p-2">Estimación provisional basada en los minutos escritos en cada receta y, cuando los indicas, en tiempos estimados solo para este plan. Los pasos que indican giros, mezclas, revisiones u otras intervenciones requieren atención manual y no se solapan. Revisa supervisión y equipo: el plan no modela conflictos de horno, fogones ni utensilios. La disponibilidad es orientativa; esta vista previa no descuenta stock, no modifica recetas y no guarda ni ejecuta el plan.</p>
      </div>`;
    document.getElementById('bc-clear')?.addEventListener('click', () => { previewBox.innerHTML = ''; });
  }

  toggle.addEventListener('click', () => {
    const open = panel.classList.contains('hidden');
    panel.classList.toggle('hidden', !open);
    if (open) renderRecipes();
  });
  sourceToggle.addEventListener('click', () => {
    demoMode = !demoMode;
    selectedById.clear();
    servingsById.clear();
    durationOverrides = new Map();
    searchBox.value = '';
    renderRecipes();
  });
  searchBox.addEventListener('input', renderRecipeList);
  recipesBox.addEventListener('change', event => {
    const target = event.target;
    const index = Number(target.dataset.bcIndex ?? target.dataset.bcServings);
    const recipe = listed[index];
    if (!recipe) return;
    if (target.matches('[data-bc-index]')) {
      const servings = servingsById.get(recipe.id) || Math.max(1, +recipe.rac || 2);
      if (target.checked) selectedById.set(recipe.id, { recipe, servings });
      else selectedById.delete(recipe.id);
    } else if (target.matches('[data-bc-servings]')) {
      const servings = Math.max(1, Math.min(30, Number(target.value) || +recipe.rac || 2));
      servingsById.set(recipe.id, servings);
      if (selectedById.has(recipe.id)) selectedById.set(recipe.id, { recipe, servings });
    } else return;
    durationOverrides = new Map();
    previewBox.innerHTML = '';
    renderRecipeList();
  });
  document.getElementById('bc-create')?.addEventListener('click', () => {
    const selection = selectedRecipes();
    if (!selection.length) { previewBox.innerHTML = '<p class="text-xs text-amber-800 bg-white rounded-lg p-3">Selecciona al menos una receta.</p>'; return; }
    const missing = missingDurations(selection, durationOverrides);
    if (missing.length) renderDurationPrompt(selection, missing);
    else buildPreview(selection, durationOverrides);
  });
})();
