/* Household profiles, planning preferences and cross-device menu storage.
   Firestore schema: family/main = {schemaVersion, settings, diners, planner,
   menus, updatedAt}. Legacy menus in asesor_nutri_menus_v1 are imported once. */
(() => {
  const STORE_KEY = 'asesor_family_planning_v1';
  const MENU_KEY = 'asesor_nutri_menus_v1';
  const root = document.getElementById('np-adultos');
  if (!root) return;
  const copy = value => JSON.parse(JSON.stringify(value));
  const clean = value => String(value || '').trim().slice(0, 120);
  const normalize = value => typeof sinAc === 'function' ? sinAc(value) : String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const escHtml = value => typeof esc === 'function' ? esc(String(value ?? '')) : String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fortnightAnchorDefault = () => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const uid = () => 'd-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  const defaults = () => ({
    schemaVersion: 1,
    settings: { shoppingDay: 'saturday', noRepeatDays: 7, horizonDays: 7, fortnightStartMode: 'cuchara', fortnightAnchor: fortnightAnchorDefault() },
    diners: [{ id: uid(), name: 'Comensal 1', kcalTarget: 2000, diet: '', dislikes: '' }],
    planner: { current: null, recent: [], saved: [] },
    menus: {}
  });
  const parseJson = (raw, fallback) => { try { const v = JSON.parse(raw); return v && typeof v === 'object' ? v : fallback; } catch (_) { return fallback; } };
  let family = { ...defaults(), ...parseJson(localStorage.getItem(STORE_KEY), {}) };
  family.settings = { ...defaults().settings, ...(family.settings || {}) };
  family.diners = Array.isArray(family.diners) && family.diners.length ? family.diners : defaults().diners;
  family.planner = { current: null, recent: [], saved: [], ...(family.planner || {}) };
  family.planner.recent = Array.isArray(family.planner.recent) ? family.planner.recent : [];
  family.planner.saved = Array.isArray(family.planner.saved) ? family.planner.saved : [];
  let cloudReady = false, applyingRemote = false, pendingTimer = null, statusText = 'Guardado en este dispositivo';

  function snapshot() {
    const menus = parseJson(localStorage.getItem(MENU_KEY), family.menus || {});
    return { schemaVersion: 1, settings: family.settings, diners: family.diners, planner: family.planner, menus, updatedAt: Date.now() };
  }
  function saveLocal() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(snapshot())); } catch (_) { statusText = 'No se pudo guardar en este dispositivo'; }
  }
  function persistNow() {
    saveLocal();
    if (!cloudReady || !window.fb?.set) return;
    clearTimeout(pendingTimer);
    pendingTimer = setTimeout(() => {
      window.fb.set('family', 'main', snapshot())
        .then(() => { statusText = 'Sincronizado con el hogar'; renderStatus(); })
        .catch(() => { statusText = 'Sin conexión: guardado local; se sincronizará al volver'; renderStatus(); });
    }, 250);
  }
  function renderStatus() {
    const el = document.getElementById('family-sync');
    if (el) el.textContent = statusText;
  }
  function applyRemote(data) {
    family = { ...defaults(), ...data };
    family.settings = { ...defaults().settings, ...(data.settings || {}) };
    family.diners = Array.isArray(data.diners) && data.diners.length ? data.diners : defaults().diners;
    family.planner = { current: null, recent: [], saved: [], ...(data.planner || {}) };
    family.planner.recent = Array.isArray(family.planner.recent) ? family.planner.recent : [];
    family.planner.saved = Array.isArray(family.planner.saved) ? family.planner.saved : [];
    family.menus = data.menus && typeof data.menus === 'object' ? data.menus : {};
    applyingRemote = true;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(family));
      localStorage.setItem(MENU_KEY, JSON.stringify(family.menus));
      if (typeof MENU_DB !== 'undefined') {
        for (const key of Object.keys(MENU_DB)) delete MENU_DB[key];
        Object.assign(MENU_DB, family.menus);
        if (typeof paintSavedMenuButtons === 'function') paintSavedMenuButtons();
        if (MENU_DB.adultCurrent && typeof paintAdultMenu === 'function') paintAdultMenu();
        if (MENU_DB.babyCurrent && typeof menuBebe === 'function') menuBebe();
      }
    } catch (_) {}
    applyingRemote = false;
    statusText = 'Sincronizado con el hogar';
    paint();
  }
  window.onFamilyData = (data, metaOrError) => {
    if (metaOrError?.signedOut) { cloudReady = false; statusText = 'Sin sesión: se conserva la configuración local'; paint(); return; }
    if (metaOrError instanceof Error) { cloudReady = false; statusText = 'Firebase no disponible; cambios locales se conservan'; paint(); return; }
    if (!data) {
      if (metaOrError?.fromCache) { cloudReady = false; statusText = 'Cargando ajustes compartidos…'; paint(); return; }
      cloudReady = true;
      statusText = 'Nuevo hogar: configuración guardada en este dispositivo';
      const oldMenus = parseJson(localStorage.getItem(MENU_KEY), {});
      if (Object.keys(oldMenus).length) family.menus = oldMenus;
      persistNow();
      paint();
      return;
    }
    cloudReady = !metaOrError?.fromCache;
    if (cloudReady) applyRemote(data);
    else { statusText = 'Cargando la versión compartida…'; paint(); }
  };
  if (Array.isArray(window.__pendingFamilyData)) {
    const pending = window.__pendingFamilyData;
    delete window.__pendingFamilyData;
    window.onFamilyData(...pending);
  }

  const card = document.createElement('section');
  card.id = 'family-planning';
  card.className = 'bg-white border rounded-2xl shadow-sm p-4 mb-4';
  card.innerHTML = '<div class="flex items-start justify-between gap-3"><div><h3 class="font-bold text-slate-800">Plan familiar</h3><p class="text-xs text-slate-500">Perfiles, preferencias y menús compartidos entre dispositivos.</p></div><span id="family-sync" class="text-[10px] text-slate-400 text-right"></span></div><div id="family-settings" class="mt-3"></div><div id="family-diners" class="space-y-2 mt-3"></div><div class="grid grid-cols-2 gap-2 mt-3"><button id="family-add-diner" type="button" class="bg-slate-100 rounded-lg py-2 text-xs font-bold">Añadir comensal</button><button id="family-save" type="button" class="bg-emerald-600 text-white rounded-lg py-2 text-xs font-bold">Guardar perfiles y ajustes</button></div><div class="border-t mt-4 pt-4"><div class="flex justify-between items-center gap-2"><div><h4 class="font-bold text-sm">Menú por comensal</h4><p class="text-[11px] text-slate-500">Rota recetas disponibles y filtra dietas y alimentos que no gustan.</p></div><button id="family-generate" type="button" class="bg-indigo-600 text-white rounded-lg px-3 py-2 text-xs font-bold">Generar</button></div><div id="family-menu" class="mt-3"></div></div><p class="text-[10px] text-slate-400 mt-3">Las kcal se muestran solo cuando la receta contiene valores estimados. No son una valoración nutricional profesional. Las alergias no están incluidas en estos filtros.</p>';
  root.insertBefore(card, root.firstChild);

  function settingsHtml() {
    const s = family.settings;
    return `<div class="grid grid-cols-3 gap-2 text-[11px]"><label>Día de compra<select id="family-shopping-day" class="w-full p-2 border rounded-lg mt-1 bg-white">${[['monday','Lunes'],['tuesday','Martes'],['wednesday','Miércoles'],['thursday','Jueves'],['friday','Viernes'],['saturday','Sábado'],['sunday','Domingo']].map(([v,n])=>`<option value="${v}" ${s.shoppingDay===v?'selected':''}>${n}</option>`).join('')}</select></label><label>Sin repetir (días)<input id="family-no-repeat" type="number" min="0" max="60" value="${Math.max(0,Math.min(60,+s.noRepeatDays||0))}" class="w-full p-2 border rounded-lg mt-1"></label><label>Plan (días)<input id="family-horizon" type="number" min="1" max="14" value="${Math.max(1,Math.min(14,+s.horizonDays||7))}" class="w-full p-2 border rounded-lg mt-1"></label></div><div class="grid grid-cols-2 gap-2 mt-2 text-[11px]"><label>Alternancia quincenal<select id="family-fortnight-mode" class="w-full p-2 border rounded-lg mt-1 bg-white"><option value="off" ${s.fortnightStartMode==='off'?'selected':''}>Desactivada</option><option value="cuchara" ${s.fortnightStartMode==='cuchara'?'selected':''}>Cuchara 1.ª semana, fresco 2.ª</option><option value="fresco" ${s.fortnightStartMode==='fresco'?'selected':''}>Fresco 1.ª semana, cuchara 2.ª</option></select></label><label>Fecha de referencia<input id="family-fortnight-anchor" type="date" value="${escHtml(s.fortnightAnchor || fortnightAnchorDefault())}" class="w-full p-2 border rounded-lg mt-1 bg-white"></label></div><p class="text-[10px] text-slate-400 mt-1">El patrón se invierte en cada quincena. Solo clasifica recetas con palabras explícitas en su nombre; las demás quedan como neutras.</p>`;
  }
  function dinerHtml(d, i) {
    return `<article class="border rounded-xl p-3" data-diner-index="${i}"><div class="flex justify-between items-center mb-2"><b class="text-xs">Comensal ${i+1}</b><button type="button" class="family-remove text-xs text-red-600" data-remove="${i}" ${family.diners.length===1?'disabled':''}>Quitar</button></div><div class="grid grid-cols-2 gap-2 text-[11px]"><label>Nombre<input data-diner-field="name" value="${escHtml(d.name)}" maxlength="40" class="w-full p-2 border rounded-lg mt-1"></label><label>Objetivo kcal/día<input data-diner-field="kcalTarget" type="number" min="0" max="10000" value="${Math.max(0,+d.kcalTarget||0)}" class="w-full p-2 border rounded-lg mt-1"></label><label>Dieta o patrón<input data-diner-field="diet" placeholder="p. ej. vegetariana" value="${escHtml(d.diet)}" maxlength="40" class="w-full p-2 border rounded-lg mt-1"></label><label>Alimentos que no le gustan<input data-diner-field="dislikes" placeholder="separados por comas" value="${escHtml(d.dislikes)}" maxlength="200" class="w-full p-2 border rounded-lg mt-1"></label></div></article>`;
  }
  function paint() {
    document.getElementById('family-settings').innerHTML = settingsHtml();
    document.getElementById('family-diners').innerHTML = family.diners.map(dinerHtml).join('');
    renderStatus();
    paintCurrent();
  }
  function readForm() {
    family.settings = {
      shoppingDay: document.getElementById('family-shopping-day')?.value || 'saturday',
      noRepeatDays: Math.max(0, Math.min(60, Number(document.getElementById('family-no-repeat')?.value) || 0)),
      horizonDays: Math.max(1, Math.min(14, Number(document.getElementById('family-horizon')?.value) || 7)),
      fortnightStartMode: document.getElementById('family-fortnight-mode')?.value || 'off',
      fortnightAnchor: document.getElementById('family-fortnight-anchor')?.value || fortnightAnchorDefault()
    };
    family.diners = [...document.querySelectorAll('#family-diners [data-diner-index]')].map((el, i) => {
      const old = family.diners[i] || {};
      const value = key => el.querySelector(`[data-diner-field="${key}"]`)?.value || '';
      return { id: old.id || uid(), name: clean(value('name')) || `Comensal ${i+1}`, kcalTarget: Math.max(0, Math.min(10000, +value('kcalTarget') || 0)), diet: clean(value('diet')), dislikes: clean(value('dislikes')) };
    }).slice(0, 8);
    if (!family.diners.length) family.diners = defaults().diners;
    persistNow();
    paint();
  }
  document.getElementById('family-save').addEventListener('click', readForm);
  document.getElementById('family-add-diner').addEventListener('click', () => {
    if (family.diners.length >= 8) return alert('Puedes configurar hasta 8 comensales.');
    readForm(); family.diners.push({ id: uid(), name: `Comensal ${family.diners.length+1}`, kcalTarget: 2000, diet: '', dislikes: '' });
    persistNow(); paint();
  });
  document.getElementById('family-diners').addEventListener('click', event => {
    const index = Number(event.target.dataset.remove);
    if (Number.isInteger(index) && index >= 0 && family.diners.length > 1) { readForm(); family.diners.splice(index, 1); persistNow(); paint(); }
  });
  document.getElementById('family-generate').addEventListener('click', () => { readForm(); generate(); });

  const mealAliases = { desayuno:['desayuno'], almuerzo:['almuerzo','merienda'], comida:['comida'], merienda:['merienda','almuerzo'], cena:['cena'] };
  const recipeType = r => normalize(r.tipo || r.type || '');
  const recipeIngredients = r => Array.isArray(r.i) ? r.i.map(x => typeof normIng === 'function' ? normIng(x) : x) : [];
  const kcalPerServing = r => {
    const ingredients = recipeIngredients(r);
    if (!ingredients.length || ingredients.some(x => !Number.isFinite(Number(x.k)) || x.k == null)) return null;
    const total = ingredients.reduce((sum, x) => sum + Number(x.k), 0), servings = Math.max(1, Number(r.rac) || 2);
    return Math.round(total / servings);
  };
  const mealRecipes = meal => (typeof todas === 'function' ? todas() : []).filter(r => r?.n && mealAliases[meal]?.includes(recipeType(r)));
  const dishStyle = recipe => {
    const title = normalize(recipe?.n || '');
    if (/\b(sopa|crema|pure|caldo|guiso|estofado|potaje|cocido)\b/.test(title)) return 'cuchara';
    if (/\b(ensalada|gazpacho|salmorejo|tabule|poke|tartar|ceviche|crudites)\b/.test(title)) return 'fresco';
    return 'neutro';
  };
  const baseIdOf = recipe => String(recipe?.baseId || '').trim();
  const explicitlySharesBase = (recipe, base) => !!baseIdOf(recipe) && !!baseIdOf(base) && baseIdOf(recipe) === baseIdOf(base);
  function styleForDay(dayOffset) {
    const mode = family.settings.fortnightStartMode || 'off';
    if (mode === 'off') return null;
    const anchor = new Date((family.settings.fortnightAnchor || fortnightAnchorDefault()) + 'T00:00:00');
    const date = new Date(); date.setHours(0,0,0,0); date.setDate(date.getDate() + dayOffset);
    const offset = Math.floor((date.getTime() - anchor.getTime()) / 86400000);
    const period = Math.floor(offset / 14), within = ((offset % 14) + 14) % 14;
    const secondWeek = within >= 7;
    let first = mode;
    if (Math.abs(period) % 2 === 1) first = first === 'cuchara' ? 'fresco' : 'cuchara';
    return secondWeek ? (first === 'cuchara' ? 'fresco' : 'cuchara') : first;
  }
  function rotationOrder(list, meal) {
    return [...list].sort((a,b) => recentScore(a,meal) - recentScore(b,meal) || String(a.n).localeCompare(String(b.n),'es'));
  }
  function candidatesFor(diner, meal) {
    const dislikeTokens = String(diner.dislikes || '').split(',').map(normalize).map(x=>x.trim()).filter(Boolean);
    const dietToken = normalize(diner.diet);
    return mealRecipes(meal).filter(r => {
      if (!r?.n || !mealAliases[meal].includes(recipeType(r))) return false;
      const blob = normalize([r.n, ...recipeIngredients(r).map(x=>x.n), ...(r.k || [])].join(' '));
      if (dislikeTokens.some(token => token && blob.includes(token))) return false;
      if (dietToken) {
        const diets = Array.isArray(r.dietas) ? r.dietas.map(normalize) : [];
        if (!diets.some(d => d.includes(dietToken) || dietToken.includes(d))) return false;
      }
      return true;
    });
  }
  function recentScore(recipe, meal) {
    const cutoff = Date.now() - family.settings.noRepeatDays * 86400000;
    const use = family.planner.recent.find(x => x.recipeId === recipe.id && x.meal === meal && x.at >= cutoff);
    return use ? use.at : 0;
  }
  function generate() {
    const meals = [...document.querySelectorAll('.n-meal:checked')].map(el => el.value);
    if (!meals.length) { document.getElementById('family-menu').innerHTML = '<p class="text-xs text-amber-800">Selecciona al menos una comida en la sección de menús.</p>'; return; }
    const days = Math.max(1, Math.min(14, +family.settings.horizonDays || 7));
    const recentCutoff = Date.now() - family.settings.noRepeatDays * 86400000;
    const nextRecent = family.planner.recent.filter(x => x.at >= recentCutoff);
    const plan = { id: 'family-plan-' + Date.now(), days, meals, generatedAt: Date.now(), alternation: { mode: family.settings.fortnightStartMode || 'off', anchor: family.settings.fortnightAnchor || '' }, entries: [] };
    const chosenThisRun = new Set();
    for (let day = 0; day < days; day++) for (const meal of meals) {
      const targetStyle = styleForDay(day);
      const optionsByDiner = new Map();
      const allCandidates = new Map();
      const fallbackByDiner = new Map();
      for (const diner of family.diners) {
        const notUsed = candidatesFor(diner, meal).filter(r => !chosenThisRun.has(`${diner.id}|${meal}|${r.id}`));
        const classified = targetStyle ? notUsed.filter(r => dishStyle(r) === targetStyle) : notUsed;
        fallbackByDiner.set(diner.id, !!targetStyle && !classified.length && !!notUsed.length);
        const chosenPool = classified.length ? classified : notUsed;
        optionsByDiner.set(diner.id, rotationOrder(chosenPool, meal));
        chosenPool.forEach(r => allCandidates.set(r.id, r));
      }
      const coverage = recipe => [...optionsByDiner.values()].filter(list => list.some(r => r.id === recipe.id)).length;
      const commonBase = [...allCandidates.values()].sort((a,b) => coverage(b)-coverage(a) || recentScore(a,meal)-recentScore(b,meal) || String(a.n).localeCompare(String(b.n),'es'))[0] || null;
      for (const diner of family.diners) {
        const candidates = optionsByDiner.get(diner.id) || [];
        const recipe = commonBase && candidates.some(r => r.id === commonBase.id) ? commonBase
          : commonBase ? candidates.find(r => explicitlySharesBase(r, commonBase)) || candidates[0] || null
          : candidates[0] || null;
        if (recipe) chosenThisRun.add(`${diner.id}|${meal}|${recipe.id}`);
        const entry = { dinerId: diner.id, dinerName: diner.name, day: day+1, meal, recipeId: recipe?.id || null, recipeName: recipe?.n || null, kcal: recipe ? kcalPerServing(recipe) : null, target: diner.kcalTarget || null, baseRecipeName: commonBase?.n || null, isSharedBaseVariant: !!recipe && !!commonBase && recipe.id !== commonBase.id && explicitlySharesBase(recipe, commonBase), isProfileAlternative: !!recipe && !!commonBase && recipe.id !== commonBase.id, requestedStyle: targetStyle, styleFallback: fallbackByDiner.get(diner.id) || false };
        plan.entries.push(entry);
        if (recipe) nextRecent.unshift({ recipeId: recipe.id, meal, at: Date.now() + (day * 100 + meals.indexOf(meal)) });
      }
    }
    family.planner.current = plan;
    family.planner.recent = nextRecent.slice(0, 500);
    persistNow();
    paintCurrent();
  }
  function paintCurrent() {
    const box = document.getElementById('family-menu');
    const plan = family.planner.current;
    if (!plan?.entries?.length) { box.innerHTML = '<p class="text-xs text-slate-400">Configura los perfiles y genera un menú para verlo aquí.</p>'; return; }
    const rows = [];
    for (const diner of family.diners) {
      const entries = plan.entries.filter(x=>x.dinerId===diner.id);
      let html = `<div class="rounded-xl bg-slate-50 p-3 mb-2"><p class="font-bold text-xs mb-2">${escHtml(diner.name)}</p>`;
      for (let day=1; day<=plan.days; day++) {
        const dayRows = entries.filter(x=>x.day===day);
        const known = dayRows.every(x=>x.kcal != null);
        const total = dayRows.reduce((sum,x)=>sum+(x.kcal||0),0);
        html += `<div class="border-t py-2 text-xs"><div class="flex justify-between"><b>Día ${day}</b><span class="text-slate-500">${known ? `${total} kcal estimadas` : 'kcal incompletas'}</span></div>`;
        html += dayRows.map(x=>`<p><span class="capitalize text-slate-500">${escHtml(x.meal)}:</span> ${x.recipeName ? escHtml(x.recipeName) : '<span class="text-amber-800">Sin receta compatible guardada</span>'}${x.baseRecipeName ? (x.isSharedBaseVariant ? ` <span class="text-indigo-700">· variante con base indicada (${escHtml(x.baseRecipeName)})</span>` : x.isProfileAlternative ? ` <span class="text-indigo-700">· alternativa por perfil; comprueba si puede compartir el plato común (${escHtml(x.baseRecipeName)})</span>` : ' <span class="text-emerald-700">· plato común</span>') : ''}${x.requestedStyle ? ` <span class="text-slate-500">· preferencia ${x.requestedStyle==='cuchara'?'cuchara':'fresco'}${x.styleFallback?' no disponible para este perfil; se usó alternativa':''}</span>` : ''}${x.kcal!=null ? ` <span class="text-slate-500">(${x.kcal} kcal/ración estimadas)</span>` : ''}</p>`).join('');
        if (diner.kcalTarget) html += `<p class="text-[10px] text-slate-400">Objetivo individual: ${diner.kcalTarget} kcal/día; la suma cubre solo las comidas seleccionadas.</p>`;
        html += '</div>';
      }
      html += '</div>'; rows.push(html);
    }
    const saved = family.planner.saved || [];
    const shoppingLabel = { monday:'lunes', tuesday:'martes', wednesday:'miércoles', thursday:'jueves', friday:'viernes', saturday:'sábado', sunday:'domingo' }[family.settings.shoppingDay] || 'sábado';
    const savedHtml = saved.length ? `<div class="mt-3"><p class="text-xs font-bold mb-1">Planes guardados</p>${saved.map((item,i)=>`<button type="button" data-load-plan="${i}" class="block w-full text-left bg-indigo-50 rounded-lg p-2 text-xs mb-1">${escHtml(item.name || `Menú de ${new Date(item.generatedAt).toLocaleDateString('es-ES')}`)} · ${item.days} días</button>`).join('')}</div>` : '';
    const fortnightLabel = plan.alternation?.mode && plan.alternation.mode !== 'off' ? `Alterna cuchara/fresco cada semana desde ${escHtml(plan.alternation.anchor || '')}; cambia el orden en la quincena siguiente. ` : '';
    box.innerHTML = `<p class="text-[10px] text-slate-500 mb-2">Plan de ${plan.days} días · compra prevista: ${shoppingLabel} · rotación de ${family.settings.noRepeatDays} días. ${fortnightLabel}Si faltan datos nutricionales o recetas para una dieta, se indica en lugar de inventarlos.</p><p class="text-[10px] text-amber-900 bg-amber-50 rounded-lg p-2 mb-2">Las kcal son estimaciones introducidas en cada receta. El plan solo suma las comidas seleccionadas y no ajusta automáticamente cantidades ni raciones para alcanzar el objetivo individual.</p>${rows.join('')}<div class="grid grid-cols-2 gap-2"><button id="family-save-plan" class="bg-slate-800 text-white rounded-lg py-2 text-xs font-bold">Guardar este plan</button><button id="family-batch-prepare" class="bg-amber-600 text-white rounded-lg py-2 text-xs font-bold">Preparar un día</button></div><label class="block text-[11px] mt-2">Día del menú que quieres preparar<select id="family-batch-day" class="w-full p-2 border rounded-lg mt-1 bg-white">${Array.from({length:plan.days},(_,i)=>`<option value="${i+1}">Día ${i+1}</option>`).join('')}</select></label>${savedHtml}`;
    document.getElementById('family-batch-prepare')?.addEventListener('click', () => {
      const day = Number(document.getElementById('family-batch-day')?.value) || 1;
      const portions = new Map();
      plan.entries.filter(entry=>entry.day===day&&entry.recipeId).forEach(entry=>{
        const id=String(entry.recipeId), existing=portions.get(id)||{id,servings:0}; existing.servings+=1; portions.set(id,existing);
      });
      if (!portions.size) { alert('Ese día no tiene recetas guardadas compatibles para preparar.'); return; }
      const mealDate=new Date(); mealDate.setDate(mealDate.getDate()+day-1);
      const iso=`${mealDate.getFullYear()}-${String(mealDate.getMonth()+1).padStart(2,'0')}-${String(mealDate.getDate()).padStart(2,'0')}`;
      if (typeof window.openBatchCookingForMenu !== 'function') { alert('El planificador Batch Cooking no está disponible.'); return; }
      window.openBatchCookingForMenu([...portions.values()],iso);
    });
    document.getElementById('family-save-plan')?.addEventListener('click', () => {
      const name = prompt('Nombre para guardar este menú:', 'Menú ' + new Date().toLocaleDateString('es-ES'));
      if (!name?.trim()) return;
      family.planner.saved = [{ ...copy(plan), name: clean(name) }, ...(family.planner.saved || []).filter(x=>x.id!==plan.id)].slice(0, 20);
      persistNow(); statusText = cloudReady ? 'Plan guardado y sincronizado' : 'Plan guardado en este dispositivo'; paintCurrent(); renderStatus();
    });
    box.querySelectorAll('[data-load-plan]').forEach(button => button.addEventListener('click', () => {
      const savedPlan = family.planner.saved[Number(button.dataset.loadPlan)];
      if (!savedPlan) return;
      family.planner.current = copy(savedPlan); persistNow(); paintCurrent();
    }));
  }

  // Keep the legacy configurable menu UI intact while mirroring its local data to Firestore.
  for (const name of ['menuAdultos','adultChange','saveAdultMenu','loadAdultMenu','menuBebe','babyChange','saveBabyMenu','loadBabyMenu']) {
    const original = window[name];
    if (typeof original !== 'function' || original.__familyWrapped) continue;
    const wrapped = function(...args) {
      const result = original.apply(this, args);
      if (!applyingRemote) { family.menus = parseJson(localStorage.getItem(MENU_KEY), family.menus || {}); persistNow(); }
      return result;
    };
    wrapped.__familyWrapped = true;
    window[name] = wrapped;
  }
  paint();
  saveLocal();
})();
