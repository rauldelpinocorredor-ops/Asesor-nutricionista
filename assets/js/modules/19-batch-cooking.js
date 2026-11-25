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
  let currentPurchaseRows = [];
  let purchaseSelectedKeys = new Set();
  const pendingPurchaseNames = new Map();
  let purchaseOwnerUid = null;
  let purchaseNotice = '';
  let purchaseBusy = false;
  let menuMealDate = '';
  const BASES_KEY = 'asesor_batch_preparations_v1';
  const PRESETS_KEY = 'asesor_batch_bases_v1';
  const LINKS_KEY = 'asesor_batch_preparation_links_v1';
  let editingPreparationId = null;
  const basesBox = document.createElement('div');
  basesBox.id = 'bc-bases';
  basesBox.className = 'mb-3';
  sourceNote?.insertAdjacentElement('afterend', basesBox);
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
    renderBases();
    previewBox.innerHTML = '';
  }

  function selectedRecipes() {
    return [...selectedById.values()];
  }

  const readBases = () => { try { const data = JSON.parse(localStorage.getItem(BASES_KEY) || '[]'); return Array.isArray(data) ? data : []; } catch (_) { return []; } };
  const readPresets = () => { try { const data = JSON.parse(localStorage.getItem(PRESETS_KEY) || '[]'); return Array.isArray(data) ? data : []; } catch (_) { return []; } };
  const readBaseLinks = () => { try { const data = JSON.parse(localStorage.getItem(LINKS_KEY) || '{}'); return data && typeof data === 'object' ? data : {}; } catch (_) { return {}; } };
  function renderBases() {
    const box = document.getElementById('bc-bases');
    if (!box) return;
    const bases = readBases(), presets = readPresets(), links = readBaseLinks(), selected = selectedRecipes();
    box.innerHTML = `<div class="rounded-lg border border-amber-200 bg-white p-2 space-y-3">
      <section><b class="text-xs">Preparaciones base</b><p class="text-[10px] text-slate-600 mt-1">Crea una preparación reutilizable con rendimiento, ingredientes y pasos. Asígnala a uno o varios platos seleccionados: se escala a la suma de sus raciones y se añade una sola vez al plan. Sus ingredientes se suman a los de los platos (no los reemplazan); revisa posibles duplicados. Los pasos se reutilizan como están escritos: revisa duración y equipo si aumenta el rendimiento. Solo se guarda en este dispositivo.</p>
      <div class="grid grid-cols-2 gap-2 mt-2"><label class="text-[10px]">Nombre<input id="bc-prep-name" maxlength="60" class="w-full p-1.5 border rounded bg-white text-xs" placeholder="Sofrito base"></label><label class="text-[10px]">Rendimiento (raciones)<input id="bc-prep-yield" type="number" min="1" max="100" value="4" class="w-full p-1.5 border rounded bg-white text-xs"></label><label class="col-span-2 text-[10px]">Ingredientes, uno por línea<textarea id="bc-prep-ingredients" rows="3" class="w-full p-1.5 border rounded bg-white text-xs" placeholder="200 g de cebolla\n30 ml de aceite"></textarea></label><label class="col-span-2 text-[10px]">Pasos de preparación, uno por línea<textarea id="bc-prep-steps" rows="3" class="w-full p-1.5 border rounded bg-white text-xs" placeholder="Pica la cebolla 5 min\nSofríe 10 min"></textarea></label></div>
      <div class="flex gap-2"><button id="bc-prep-save" type="button" class="flex-1 bg-emerald-700 text-white rounded py-1.5 text-xs font-bold">${editingPreparationId ? 'Guardar cambios' : 'Guardar preparación'}</button>${editingPreparationId ? '<button id="bc-prep-cancel" type="button" class="px-3 border rounded text-xs">Cancelar</button>' : ''}</div>
      ${bases.length ? `<div class="space-y-2 mt-2">${bases.map((base,index)=>`<div class="border rounded p-2 text-[10px]"><div class="flex justify-between gap-2"><b>${esc(base.name)} · rinde ${Number(base.yield)} raciones</b><span class="shrink-0"><button type="button" data-prep-edit="${index}" class="underline mr-2">Editar</button><button type="button" data-prep-delete="${index}" class="text-red-700 underline">Eliminar</button></span></div><p class="text-slate-500">${base.ingredients.length} ingredientes · ${base.steps.length} pasos</p></div>`).join('')}</div>` : '<p class="text-[10px] text-slate-400">Aún no hay preparaciones base.</p>'}
      ${selected.length ? `<div class="border-t pt-2"><b class="text-[10px]">Asignar a los platos seleccionados</b>${selected.map(({recipe})=>`<label class="flex items-center gap-2 mt-1 text-[10px]"><span class="flex-1">${esc(recipe.n)}</span><select data-prep-link="${esc(String(recipe.id))}" class="p-1 border rounded bg-white"><option value="">Sin base</option>${bases.map(base=>`<option value="${esc(base.id)}" ${links[recipe.id]===base.id?'selected':''}>${esc(base.name)}</option>`).join('')}</select></label>`).join('')}</div>` : '<p class="text-[10px] text-slate-400">Selecciona platos arriba para asignarles una preparación.</p>'}
      </section>
      <section class="border-t pt-2"><div class="flex items-center justify-between gap-2"><b class="text-xs">Presets de selección</b><button id="bc-base-save" type="button" class="text-xs underline font-bold" ${selectedById.size ? '' : 'disabled'}>Guardar selección actual</button></div><p class="text-[10px] text-slate-600 mt-1">Presets locales de recetas y raciones; no son preparaciones base.</p>${presets.length ? `<div class="flex flex-wrap gap-2 mt-2">${presets.map((base,index)=>`<span class="inline-flex items-center gap-1 bg-amber-50 rounded-lg px-2 py-1"><button type="button" data-preset-load="${index}" class="text-xs font-bold underline">${esc(base.name)} (${base.items.length})</button><button type="button" data-preset-delete="${index}" class="text-red-600 px-1" aria-label="Eliminar ${esc(base.name)}">×</button></span>`).join('')}</div>` : '<p class="text-[10px] text-slate-400 mt-2">Aún no hay presets.</p>'}</section></div>`;
    const editing = bases.find(item => item.id === editingPreparationId);
    if (editing) { box.querySelector('#bc-prep-name').value=editing.name; box.querySelector('#bc-prep-yield').value=editing.yield; box.querySelector('#bc-prep-ingredients').value=editing.ingredients.map(ing=>`${ing.c ?? ''} ${ing.u || ''} ${ing.n}`.trim()).join('\n'); box.querySelector('#bc-prep-steps').value=editing.steps.map(step=>step.t).join('\n'); }
    box.querySelector('#bc-prep-cancel')?.addEventListener('click',()=>{editingPreparationId=null;renderBases();});
    box.querySelector('#bc-prep-save')?.addEventListener('click',()=>{
      const name=box.querySelector('#bc-prep-name').value.trim().slice(0,60), yieldCount=Number(box.querySelector('#bc-prep-yield').value);
      const ingredients=box.querySelector('#bc-prep-ingredients').value.split(/\r?\n/).map(line=>line.trim()).filter(Boolean).map(line=>typeof parseIng==='function'?parseIng(line):null).filter(item=>item?.n).map(item=>({n:item.n,c:item.c,u:item.u,k:null}));
      const steps=box.querySelector('#bc-prep-steps').value.split(/\r?\n/).map(line=>line.trim()).filter(Boolean).map(t=>({t,m:typeof minDe==='function'?minDe(t):null}));
      if(!name||!Number.isInteger(yieldCount)||yieldCount<1||yieldCount>100||!ingredients.length||!steps.length){alert('Completa nombre, rendimiento, al menos un ingrediente interpretable y un paso.');return;}
      const old=readBases(), id=editingPreparationId||'prep-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7), next={id,name,yield:yieldCount,ingredients,steps,updatedAt:Date.now()};
      try{localStorage.setItem(BASES_KEY,JSON.stringify([next,...old.filter(item=>item.id!==id)].slice(0,30)));editingPreparationId=null;previewBox.innerHTML='';renderBases();}catch(_){alert('No se pudo guardar la preparación en este dispositivo.');}
    });
    box.querySelectorAll('[data-prep-edit]').forEach(button=>button.addEventListener('click',()=>{editingPreparationId=readBases()[Number(button.dataset.prepEdit)]?.id||null;renderBases();}));
    box.querySelectorAll('[data-prep-delete]').forEach(button=>button.addEventListener('click',()=>{const next=readBases(),item=next[Number(button.dataset.prepDelete)];if(!item||!confirm(`¿Eliminar la preparación «${item.name}»?`))return;next.splice(Number(button.dataset.prepDelete),1);try{localStorage.setItem(BASES_KEY,JSON.stringify(next));const map=readBaseLinks();Object.keys(map).forEach(id=>{if(map[id]===item.id)delete map[id];});localStorage.setItem(LINKS_KEY,JSON.stringify(map));previewBox.innerHTML='';renderBases();}catch(_){alert('No se pudo eliminar la preparación.');}}));
    box.querySelectorAll('[data-prep-link]').forEach(select=>select.addEventListener('change',()=>{const map=readBaseLinks(),id=select.dataset.prepLink;if(select.value)map[id]=select.value;else delete map[id];try{localStorage.setItem(LINKS_KEY,JSON.stringify(map));previewBox.innerHTML='';renderBases();}catch(_){alert('No se pudo guardar la asignación en este dispositivo.');}}));
    box.querySelector('#bc-base-save')?.addEventListener('click', () => {
      const selection = selectedRecipes(); if (!selection.length) return;
      const name = prompt('Nombre del preset de selección:', 'Batch ' + new Date().toLocaleDateString('es-ES'));
      if (!name?.trim()) return;
      const recipesNow = new Map(recipes().map(recipe => [String(recipe.id), recipe]));
      const entries = selection.map(({recipe, servings}) => ({ id:String(recipe.id), servings })).filter(item => recipesNow.has(item.id));
      if (!entries.length) return alert('No hay recetas disponibles para guardar en este preset.');
      const next = [{ id:'preset-'+Date.now(), name:name.trim().slice(0,60), items:entries, updatedAt:Date.now() }, ...readPresets()].slice(0,30);
      try { localStorage.setItem(PRESETS_KEY, JSON.stringify(next)); renderBases(); } catch (_) { alert('No se pudo guardar el preset en este dispositivo.'); }
    });
    box.querySelectorAll('[data-preset-load]').forEach(button => button.addEventListener('click', () => {
      const base = readPresets()[Number(button.dataset.presetLoad)]; if (!base) return;
      const available = new Map(recipes().map(recipe => [String(recipe.id), recipe]));
      for (const item of base.items || []) { const recipe = available.get(String(item.id)); if (recipe) { const servings = Math.max(1, Math.min(30, Number(item.servings) || Number(recipe.rac) || 2)); servingsById.set(recipe.id, servings); selectedById.set(recipe.id, {recipe, servings}); } }
      durationOverrides = new Map(); renderRecipeList(); renderBases(); previewBox.innerHTML = '';
    }));
    box.querySelectorAll('[data-preset-delete]').forEach(button => button.addEventListener('click', () => {
      const index = Number(button.dataset.presetDelete), next = readPresets(); if (!Number.isInteger(index) || !next[index] || !confirm(`¿Eliminar el preset «${next[index].name}»?`)) return;
      next.splice(index, 1); try { localStorage.setItem(PRESETS_KEY, JSON.stringify(next)); renderBases(); } catch (_) { alert('No se pudo actualizar los presets.'); }
    }));
  }

  function withAssignedBases(selection) {
    const links=readBaseLinks(), bases=new Map(readBases().map(base=>[base.id,base])), quantities=new Map();
    for(const item of selection){const id=links[item.recipe.id],base=bases.get(id);if(!base)continue;const row=quantities.get(id)||{base,servings:0};row.servings+=item.servings;quantities.set(id,row);}
    const shared=[...quantities.values()].map(({base,servings})=>({recipe:{id:`prep-base-${base.id}`,n:`Preparación base: ${base.name}`,rac:Number(base.yield)||1,i:base.ingredients,p:base.steps,basePreparation:true},servings}));
    return [...selection,...shared];
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
  const canonicalStockUnit = unit => {
    const normalized=sinAc(unit).trim().replace(/\.$/,'').replace(/\s+/g,' ');
    // Keep distinct stored units (kg vs g, l vs ml); comparisons convert only
    // within mass or volume, and plans retain each stock line's own unit.
    return normalized || 'ud';
  };
  const freezerLineKey = item => JSON.stringify([String(item.prod||''),String(item.loc||''),String(item.cad||''),canonicalStockUnit(item.ud)]);
  function ingredientAvailability(ingredient) {
    if (typeof STOCK === 'undefined' || !Array.isArray(STOCK) || typeof USER === 'undefined' || !USER || typeof STOCK_READY === 'undefined' || !STOCK_READY) {
      return { state: 'unverified', label: 'No validable', detail: 'Inicia sesión y espera a que cargue el inventario.' };
    }
    const name = canonicalIngredientName(ingredient.name);
    const matches = STOCK.filter(item => item && Number(item.cant) > 0 && canonicalIngredientName(item.prod) === name);
    const needed = ingredient.quantity != null && ingredient.unit ? comparableQuantity(ingredient.quantity, ingredient.unit) : null;
    if (!matches.length) return needed
      ? { state: 'missing', label: 'Falta', detail: `No aparece en el inventario; faltan ${fmtQ(needed.value, needed.unit)}.`, shortfall: needed.value, unit: needed.unit }
      : { state: 'uncomparable', label: 'No comparable', detail: 'No aparece en el inventario y la receta no indica cantidad y unidad.' };
    if (ingredient.quantity == null || !ingredient.unit) {
      return { state: 'uncomparable', label: 'No comparable', detail: `Aparece en ${matches.length} ubicación(es), pero la receta no indica cantidad y unidad.` };
    }
    if (!needed) return { state: 'uncomparable', label: 'No comparable', detail: 'La cantidad o la unidad de la receta no se pueden interpretar.' };
    const comparable = matches.map(item => comparableQuantity(item.cant, item.ud)).filter(item => item && item.unit === needed.unit);
    if (!comparable.length) {
      const stockUnits = [...new Set(matches.map(item => `${fmtQ(item.cant, item.ud)}`))].join(', ');
      return { state: 'uncomparable', label: 'No comparable', detail: `Hay existencias (${stockUnits}), pero usan unidades incompatibles con ${needed.unit}.` };
    }
    const available = comparable.reduce((sum, item) => sum + item.value, 0);
    const shortfall = Math.max(0, needed.value - available);
    const hasOtherUnits = comparable.length !== matches.length;
    if (shortfall <= 1e-6) return { state: 'available', label: 'Disponible', detail: `Hay ${fmtQ(available, needed.unit)} de ${fmtQ(needed.value, needed.unit)} necesarios${hasOtherUnits ? '; se han sumado solo unidades comparables' : ''}.`, shortfall: 0, unit: needed.unit };
    if (available > 0) return { state: 'partial', label: 'Parcial', detail: `Hay ${fmtQ(available, needed.unit)}; faltan ${fmtQ(shortfall, needed.unit)}.${hasOtherUnits ? ' Hay otras existencias en unidades incompatibles que no se han sumado.' : ''}`, shortfall, unit: needed.unit };
    return { state: 'missing', label: 'Falta', detail: `No hay cantidad comparable; faltan ${fmtQ(needed.value, needed.unit)}.`, shortfall: needed.value, unit: needed.unit };
  }
  const availabilityStyle = state => ({
    available: 'bg-emerald-100 text-emerald-800',
    partial: 'bg-amber-100 text-amber-900',
    missing: 'bg-rose-100 text-rose-800',
    uncomparable: 'bg-slate-100 text-slate-700',
    unverified: 'bg-slate-100 text-slate-700'
  }[state] || 'bg-slate-100 text-slate-700');

  function normalizePurchaseUnit(unit) {
    const normalized = sinAc(unit).trim().toLowerCase().replace(/\.$/, '').replace(/\s+/g, ' ');
    if (!normalized) return null;
    if (normalized === 'kg') return { key: 'g', label: 'g' };
    if (normalized === 'g') return { key: 'g', label: 'g' };
    if (normalized === 'l') return { key: 'ml', label: 'ml' };
    if (normalized === 'ml') return { key: 'ml', label: 'ml' };
    if (['ud', 'uds', 'unidad', 'unidades'].includes(normalized)) return { key: 'ud', label: 'ud' };
    return { key: normalized, label: normalized };
  }
  function parsePurchaseEntry(value) {
    const text = String(value || '').trim(), match = /\s+[—–]\s+/.exec(text);
    if (!match) return { name: canonicalIngredientName(text), unit: null, unitLabel: '', interpretable: false };
    const splitAt = match.index, suffix = text.slice(splitAt + match[0].length).trim();
    const name = canonicalIngredientName(text.slice(0, splitAt));
    if (/cantidad por revisar/i.test(suffix)) return { name, unit: null, unitLabel: '', interpretable: false };
    const amount = /^\d+(?:[.,]\d+)?\s+(.+?)\s*$/.exec(suffix);
    if (!amount) return { name, unit: null, unitLabel: '', interpretable: false };
    const unit = normalizePurchaseUnit(amount[1]);
    return { name, unit: unit?.key || null, unitLabel: unit?.label || '', interpretable: !!unit };
  }
  function purchaseRowIdentity(row) {
    const name = canonicalIngredientName(row.name);
    const unit = row.availability.shortfall > 0 && row.availability.unit ? normalizePurchaseUnit(row.availability.unit)?.key : null;
    return { name, unit, key: `${name}|${unit || 'sin-unidad'}` };
  }
  function pendingPurchaseMatches(row, list = typeof COMPRA !== 'undefined' && Array.isArray(COMPRA) ? COMPRA : []) {
    const wanted = purchaseRowIdentity(row);
    const sameName = list.filter(item => item && !item.hecho).map(item => parsePurchaseEntry(item.n)).filter(item => item.name === wanted.name);
    pendingPurchaseNames.forEach(item => { if (item.name === wanted.name) sameName.push(item); });
    const exact = wanted.unit
      ? sameName.filter(item => item.unit === wanted.unit && item.interpretable)
      : sameName.filter(item => !item.unit && !item.interpretable);
    const other = sameName.filter(item => !exact.includes(item));
    return { duplicate: exact.length > 0, otherUnits: [...new Set(other.map(item => item.unitLabel || 'cantidad/unidad no interpretable'))] };
  }
  const purchaseEntryKey = value => {
    const item = parsePurchaseEntry(value);
    return item.name ? `${item.name}|${item.unit || 'sin-unidad'}` : null;
  };
  function syncPurchaseOwner() {
    const uid = typeof USER !== 'undefined' && USER ? USER.uid || null : null;
    if (uid !== purchaseOwnerUid) { pendingPurchaseNames.clear(); purchaseOwnerUid = uid; }
  }
  function isPendingPurchase(row) {
    syncPurchaseOwner();
    return pendingPurchaseMatches(row);
  }
  const compraQuantityText = row => row.shortfall != null && row.unit ? fmtQ(row.shortfall, row.unit) : '';
  const compraDisplayName = row => {
    const name = String(row.name || '').trim();
    return name ? name.charAt(0).toLocaleUpperCase('es') + name.slice(1) : 'Ingrediente';
  };

  function renderPurchaseSection() {
    const box = document.getElementById('bc-shopping-section');
    if (!box) return;
    if (demoMode) {
      box.innerHTML = '<h5 class="font-bold mb-1">Lista de la compra</h5><p class="text-slate-600">Desactivada en modo demostración. Estas recetas no generan compras.</p>';
      return;
    }
    if (typeof STOCK_READY === 'undefined' || !STOCK_READY || typeof COMPRA_READY === 'undefined' || !COMPRA_READY || typeof USER === 'undefined' || !USER) {
      box.innerHTML = '<h5 class="font-bold mb-1">Lista de la compra</h5><p class="text-slate-600">No se puede preparar una compra hasta que se carguen el inventario y la lista de la compra.</p>';
      return;
    }

    const candidates = currentPurchaseRows.filter(row => row.availability.state === 'missing' || row.availability.state === 'partial' || row.availability.state === 'uncomparable');
    if (!candidates.length) {
      box.innerHTML = `<h5 class="font-bold mb-1">Lista de la compra</h5><p class="text-slate-600">${currentPurchaseRows.some(row => row.availability.state === 'available') ? 'No hay ingredientes faltantes.' : 'No hay ingredientes que se puedan añadir.'}</p>${purchaseNotice ? `<p class="mt-2 text-emerald-800" role="status">${esc(purchaseNotice)}</p>` : ''}`;
      return;
    }

    const comparableCandidates = candidates.filter(row => (row.availability.state === 'missing' || row.availability.state === 'partial') && Number.isFinite(row.availability.shortfall) && row.availability.shortfall > 0 && row.availability.unit);
    const rowsHtml = candidates.map(row => {
      const pending = isPendingPurchase(row), duplicate = pending.duplicate;
      const comparable = (row.availability.state === 'missing' || row.availability.state === 'partial') && Number.isFinite(row.availability.shortfall) && row.availability.shortfall > 0 && row.availability.unit;
      const index = currentPurchaseRows.indexOf(row);
      const amount = comparable ? `Faltan ${esc(compraQuantityText(row.availability))}` : 'Sin cantidad · revisar antes de comprar';
      const status = duplicate
        ? '<span class="text-slate-500 font-bold">Ya está en la lista con unidad compatible</span>'
        : pending.otherUnits.length ? `<span class="block text-amber-800">Hay otra línea con ${pending.otherUnits.map(esc).join(', ')}; esta se añadirá separada.</span>` : '';
      return `<label class="flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-2 ${duplicate ? 'opacity-70' : ''}">
        <input type="checkbox" data-bc-buy="${index}" class="mt-0.5 h-4 w-4 accent-amber-700" ${duplicate ? 'disabled' : ''} ${purchaseSelectedKeys.has(row.key) && !duplicate ? 'checked' : ''}>
        <span class="flex-1"><span class="block font-medium">${esc(compraDisplayName(row))}</span><span class="block text-slate-600">${amount}</span>${!comparable ? '<span class="block text-amber-800">La cantidad o unidad no se puede comparar; se añadirá sin cantidad.</span>' : ''}</span>${status}
      </label>`;
    }).join('');
    const selectableCount = candidates.filter(row => !isPendingPurchase(row).duplicate).length;
    box.innerHTML = `
      <h5 class="font-bold mb-1">Faltantes para la lista de la compra</h5>
      <p class="text-slate-600 mb-2">Revisa los faltantes. Los ingredientes sin unidad comparable solo se añaden si los marcas; aparecerán con la cantidad pendiente de revisar.</p>
      ${comparableCandidates.length ? '<button id="bc-buy-all" type="button" class="underline text-amber-900 font-bold mb-2">Seleccionar todo lo comprable</button>' : ''}
      <div class="space-y-2">${rowsHtml}</div>
      <button id="bc-buy-review" type="button" class="w-full bg-emerald-700 text-white rounded-lg py-2 mt-3 font-bold" ${selectableCount ? '' : 'disabled'}>Añadir seleccionados a la lista de la compra</button>
      <div id="bc-buy-confirm" class="hidden mt-2 rounded-lg border border-amber-300 bg-amber-50 p-3">
        <p id="bc-buy-summary" class="text-slate-800 mb-2"></p>
        <p class="text-xs text-amber-900 mb-2">Esta acción añadirá productos a la lista compartida. No cambiará las existencias.</p>
        <div class="flex gap-2"><button id="bc-buy-confirm-yes" type="button" class="flex-1 bg-emerald-700 text-white rounded-lg py-2 font-bold">Confirmar</button><button id="bc-buy-confirm-no" type="button" class="flex-1 bg-white border rounded-lg py-2">Cancelar</button></div>
      </div>
      <p id="bc-buy-status" class="mt-2 text-emerald-800" role="status">${esc(purchaseNotice)}</p>`;
  }

  function updatePurchaseReviewButton() {
    const button = document.getElementById('bc-buy-review');
    if (button) button.disabled = purchaseBusy || purchaseSelectedKeys.size === 0;
    const confirm = document.getElementById('bc-buy-confirm');
    if (confirm) confirm.classList.add('hidden');
  }

  async function addSelectedToPurchaseList() {
    if (purchaseBusy) return;
    if (demoMode || !USER || typeof STOCK_READY === 'undefined' || !STOCK_READY || typeof COMPRA_READY === 'undefined' || !COMPRA_READY || typeof fb === 'undefined' || typeof fb.addCompra !== 'function') {
      purchaseNotice = 'No se pudo confirmar la compra: inventario o lista no disponibles.';
      renderPurchaseSection();
      return;
    }
    const selected = currentPurchaseRows.filter(row => purchaseSelectedKeys.has(row.key));
    if (!selected.length) return;
    purchaseBusy = true;
    let added = 0, noLongerNeeded = 0, failed = 0, repeatedWithinOperation = 0, separateUnitAdds = 0;
    const alreadyBeforeMeasured = new Set(), alreadyBeforeUnmeasured = new Set();
    const recordAlreadyBefore = row => {
      const identity = purchaseRowIdentity(row);
      (identity.unit ? alreadyBeforeMeasured : alreadyBeforeUnmeasured).add(identity.key);
    };
    currentPurchaseRows.forEach(row => {
      if (['missing', 'partial', 'uncomparable'].includes(row.availability.state) && pendingPurchaseMatches(row).duplicate) recordAlreadyBefore(row);
    });
    const initialKeys = new Set((Array.isArray(COMPRA) ? COMPRA : []).filter(item => !item.hecho).map(item => purchaseEntryKey(item.n)).filter(Boolean));
    pendingPurchaseNames.forEach(item => { if (item.name) initialKeys.add(`${item.name}|${item.unit || 'sin-unidad'}`); });
    const seenKeys = new Set(initialKeys), addedRows = [];
    for (const row of selected) {
      const identity = purchaseRowIdentity(row);
      const batchKey = identity.key;
      if (initialKeys.has(batchKey)) { recordAlreadyBefore(row); continue; }
      if (seenKeys.has(batchKey)) { repeatedWithinOperation++; continue; }
      const latest = ingredientAvailability(row);
      if (latest.state === 'available') { noLongerNeeded++; continue; }
      if (latest.state === 'unverified') { failed++; continue; }
      const latestComparable = latest.state === 'missing' || latest.state === 'partial';
      if (latest.state !== 'uncomparable' && (!latestComparable || !(latest.shortfall > 0) || !latest.unit)) { failed++; continue; }
      const pending = pendingPurchaseMatches(row);
      const sameNameDifferentUnit = pending.otherUnits.length > 0;
      const sameNameFromBatch = addedRows.some(item => item.name === identity.name && item.unit !== identity.unit);
      const suffix = latestComparable ? ` — ${compraQuantityText(latest)}` : ' — cantidad por revisar';
      const name = `${compraDisplayName(row)}${suffix}`;
      try {
        await fb.addCompra({ n: name, hecho: false, t: Date.now() });
        added++;
        const latestUnit = latestComparable ? normalizePurchaseUnit(latest.unit) : null;
        const addedIdentity = { name: identity.name, unit: latestUnit?.key || null, unitLabel: latestUnit?.label || 'cantidad/unidad no interpretable', interpretable: !!latestUnit };
        pendingPurchaseNames.set(`${identity.name}|${addedIdentity.unit || 'sin-unidad'}`, addedIdentity);
        seenKeys.add(`${identity.name}|${addedIdentity.unit || 'sin-unidad'}`);
        if (sameNameDifferentUnit || sameNameFromBatch) separateUnitAdds++;
        addedRows.push({ name: identity.name, unit: addedIdentity.unit });
      } catch (error) {
        failed++;
      }
    }
    purchaseBusy = false;
    purchaseSelectedKeys = new Set();
    purchaseNotice = `${added} añadido(s)${alreadyBeforeMeasured.size ? `; ${alreadyBeforeMeasured.size} ya estaba(n) previamente en la lista con unidad compatible` : ''}${alreadyBeforeUnmeasured.size ? `; ${alreadyBeforeUnmeasured.size} ya tenía(n) una línea previa sin unidad interpretable` : ''}${repeatedWithinOperation ? `; ${repeatedWithinOperation} repetido(s) en esta operación no se añadieron` : ''}${separateUnitAdds ? `; ${separateUnitAdds} se añadió/añadieron como línea separada por usar otra unidad o no tener una interpretable` : ''}${noLongerNeeded ? `; ${noLongerNeeded} ya no faltaba(n)` : ''}${failed ? `; ${failed} no se pudieron añadir` : ''}.`;
    renderPurchaseSection();
  }

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
    syncPurchaseOwner();
    currentPurchaseRows = availabilityRows.map((row, index) => ({
      ...row,
      key: `${purchaseRowIdentity(row).key}|fila-${index}`
    }));
    purchaseSelectedKeys = new Set();
    purchaseNotice = '';
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
        <section id="bc-shopping-section" class="border-t border-slate-200 pt-3 mt-3"></section>
        ${menuMealDate ? '<section id="bc-defrost-section" class="border-t border-slate-200 pt-3 mt-3"></section>' : ''}
        <h5 class="font-bold">${timeline.complete ? 'Cronograma desde ' + esc(document.getElementById('bc-start')?.value || '09:00') : 'Secuencia por receta'}</h5>${schedule}
        ${selection.some(item=>item.recipe.basePreparation) ? '<p class="bg-indigo-50 text-indigo-900 rounded p-2 mb-3">Las preparaciones base se suman una vez al total de raciones asignadas. Sus ingredientes y pasos se añaden a los de los platos; no se infieren reemplazos y los ingredientes repetidos se suman. Revisa la cantidad total antes de cocinar.</p>' : ''}
        <p class="bg-amber-50 text-amber-900 rounded p-2">Estimación provisional basada en los minutos escritos en cada receta y, cuando los indicas, en tiempos estimados solo para este plan. Los pasos que indican giros, mezclas, revisiones u otras intervenciones requieren atención manual y no se solapan. Revisa supervisión y equipo: el plan no modela conflictos de horno, fogones ni utensilios. La disponibilidad es orientativa; esta vista previa no descuenta stock, no modifica recetas y no guarda ni ejecuta el plan.</p>
      </div>`;
    renderPurchaseSection();
    if (menuMealDate) renderMenuDefrost(selection, menuMealDate);
    updatePurchaseReviewButton();
    document.getElementById('bc-clear')?.addEventListener('click', () => { previewBox.innerHTML = ''; });
  }

  function renderMenuDefrost(selection, mealDate) {
    const box = document.getElementById('bc-defrost-section'); if (!box) return;
    const { measured } = scaledIngredients(selection), required = new Map();
    for (const ingredient of measured) {
      const need = comparableQuantity(ingredient.quantity, ingredient.unit); if (!need) continue;
      const key = `${canonicalIngredientName(ingredient.name)}|${need.unit}`;
      const row = required.get(key) || {name:ingredient.name, quantity:0, unit:need.unit}; row.quantity += need.value; required.set(key,row);
    }
    const frozen = (typeof STOCK !== 'undefined' && Array.isArray(STOCK) ? STOCK : []).filter(item => /^(cocina-|sotano-)/.test(item.loc) && Number(item.cant)>0);
    const remaining = new Map();
    for(const item of frozen){const key=freezerLineKey(item), quantity=comparableQuantity(item.cant,item.ud)?.value||0;remaining.set(key,(remaining.get(key)||0)+quantity);}
    const proposals = [];
    for (const need of required.values()) {
      const matches = frozen.filter(item => canonicalIngredientName(item.prod)===canonicalIngredientName(need.name) && comparableQuantity(item.cant,item.ud)?.unit===need.unit)
        .sort((a,b)=>(a.fechaCongelacion||0)-(b.fechaCongelacion||0));
      let left=need.quantity;
      for (const item of matches) {
        const key=freezerLineKey(item), available=remaining.get(key)||0, take=Math.min(left,available);
        if (take>0) {
          const stockUnit=comparableQuantity(1,item.ud), originalAmount=stockUnit?.unit===need.unit ? take/stockUnit.value : take;
          const old=proposals.find(p=>p.key===key);
          if(old) old.cant+=originalAmount;
          else proposals.push({key,prod:item.prod,loc:item.loc,cad:item.cad||'',ud:item.ud,cant:originalAmount});
          remaining.set(key,available-take); left-=take;
        }
        if(left<=0.0001) break;
      }
    }
    if (!proposals.length) {
      box.innerHTML='<p class="text-xs text-slate-500">No se encontraron ingredientes cuantificados en el congelador que coincidan exactamente con este menú. Revisa el plan de descongelación manualmente si hace falta.</p>'; return;
    }
    const defrostDate=new Date(`${mealDate}T12:00:00`); defrostDate.setDate(defrostDate.getDate()-1);
    const dateText=`${defrostDate.getFullYear()}-${String(defrostDate.getMonth()+1).padStart(2,'0')}-${String(defrostDate.getDate()).padStart(2,'0')}`;
    box.innerHTML=`<h5 class="font-bold mb-1">Descongelación sugerida para este menú</h5><p class="text-[10px] text-slate-600 mb-2">Coincidencia exacta por nombre y unidad con el inventario. Se propone pasar al frigorífico el día anterior; comprueba que, según la hora de la comida, haya al menos 12 h disponibles. La app no conoce la hora de la comida. Comprueba cantidades y etiquetas; no se crea nada hasta confirmar.</p><ul class="space-y-1 mb-2">${proposals.map(p=>`<li>${esc(fmtQ(p.cant,p.ud))} de ${esc(p.prod)} · ${esc(typeof nombreLoc==='function'?nombreLoc(p.loc):p.loc)}</li>`).join('')}</ul><button id="bc-defrost-confirm" type="button" class="w-full bg-sky-700 text-white rounded-lg py-2 font-bold">Crear ${proposals.length} aviso(s) para ${dateText.split('-').reverse().join('/')}</button><p id="bc-defrost-status" role="status" class="text-xs mt-2"></p>`;
    document.getElementById('bc-defrost-confirm')?.addEventListener('click', async event => {
      const button=event.currentTarget; if(!window.fb?.set || typeof USER==='undefined' || !USER) { document.getElementById('bc-defrost-status').textContent='Inicia sesión para sincronizar avisos de descongelación.'; return; }
      if(!confirm(`¿Crear ${proposals.length} aviso(s) para el día ${dateText.split('-').reverse().join('/')}?`)) return;
      button.disabled=true; let done=0;
      for(const p of proposals) {
        const planned=(typeof PLAN!=='undefined'&&Array.isArray(PLAN)?PLAN:[]).filter(x=>!x.hecho&&x.prod===p.prod&&x.loc===p.loc&&(x.cad||'')===p.cad&&canonicalStockUnit(x.ud)===canonicalStockUnit(p.ud)&&x.fecha===dateText).reduce((sum,x)=>sum+(Number(x.cant)||0),0);
        const stocks=(typeof STOCK!=='undefined'&&Array.isArray(STOCK)?STOCK:[]).filter(x=>x.prod===p.prod&&x.loc===p.loc&&(x.cad||'')===p.cad&&canonicalStockUnit(x.ud)===canonicalStockUnit(p.ud));
        const available=stocks.reduce((sum,row)=>sum+(Number(row.cant)||0),0), amount=Math.min(p.cant,Math.max(0,available-planned));
        if(amount<=0) continue;
        try { await fb.set('plan','p'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),{prod:p.prod,loc:p.loc,cad:p.cad,cant:amount,ud:p.ud,fecha:dateText,hecho:false,t:Date.now(),menuDate:mealDate,source:'family-menu'}); done++; } catch (_) {}
      }
      const status=document.getElementById('bc-defrost-status'); if(status) status.textContent=`Creados ${done} aviso(s). Revisa la sección Descongelación planificada.`;
      button.textContent='Avisos creados';
    });
  }

  previewBox.addEventListener('change', event => {
    const input = event.target.closest('[data-bc-buy]');
    if (!input) return;
    const row = currentPurchaseRows[Number(input.dataset.bcBuy)];
    if (!row) return;
        if (input.checked && !isPendingPurchase(row).duplicate) purchaseSelectedKeys.add(row.key);
    else purchaseSelectedKeys.delete(row.key);
    updatePurchaseReviewButton();
  });
  previewBox.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.id === 'bc-buy-all') {
      currentPurchaseRows.forEach(row => {
        const comparableMissing = ['missing', 'partial'].includes(row.availability.state) && Number.isFinite(row.availability.shortfall) && row.availability.shortfall > 0 && row.availability.unit;
        if (comparableMissing && !isPendingPurchase(row).duplicate) purchaseSelectedKeys.add(row.key);
      });
      previewBox.querySelectorAll('[data-bc-buy]').forEach(input => {
        const row = currentPurchaseRows[Number(input.dataset.bcBuy)];
        input.checked = !!row && purchaseSelectedKeys.has(row.key);
      });
      updatePurchaseReviewButton();
      return;
    }
    if (button.id === 'bc-buy-review') {
      const selected = currentPurchaseRows.filter(row => purchaseSelectedKeys.has(row.key) && !isPendingPurchase(row).duplicate);
      const confirmBox = document.getElementById('bc-buy-confirm');
      const summary = document.getElementById('bc-buy-summary');
      if (!selected.length || !confirmBox || !summary) return;
      const items = selected.map(row => {
        const quantity = Number.isFinite(row.availability.shortfall) && row.availability.shortfall > 0 && row.availability.unit
          ? compraQuantityText(row.availability) : 'cantidad por revisar';
        return `${compraDisplayName(row)} (${quantity})`;
      });
      summary.textContent = `Se añadirán ${items.length} producto(s): ${items.join('; ')}.`;
      confirmBox.classList.remove('hidden');
      return;
    }
    if (button.id === 'bc-buy-confirm-no') {
      document.getElementById('bc-buy-confirm')?.classList.add('hidden');
      return;
    }
    if (button.id === 'bc-buy-confirm-yes') {
      addSelectedToPurchaseList();
    }
  });

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
    renderBases();
  });
  document.getElementById('bc-create')?.addEventListener('click', () => {
    const selection = withAssignedBases(selectedRecipes());
    if (!selection.length) { previewBox.innerHTML = '<p class="text-xs text-amber-800 bg-white rounded-lg p-3">Selecciona al menos una receta.</p>'; return; }
    const missing = missingDurations(selection, durationOverrides);
    if (missing.length) renderDurationPrompt(selection, missing);
    else buildPreview(selection, durationOverrides);
  });

  window.openBatchCookingForMenu = (items, date) => {
    const available = new Map(recipes().map(recipe => [String(recipe.id), recipe]));
    selectedById.clear(); servingsById.clear(); durationOverrides = new Map(); menuMealDate = String(date || '');
    for (const item of items || []) {
      const recipe = available.get(String(item.id)); if (!recipe) continue;
      const servings = Math.max(1, Math.min(30, Number(item.servings) || Number(recipe.rac) || 2));
      servingsById.set(recipe.id, servings); selectedById.set(recipe.id, {recipe, servings});
    }
    if (!selectedById.size) { alert('No se encontraron recetas guardadas compatibles con ese día del menú.'); return; }
    if (typeof window.tab === 'function') window.tab('chef');
    demoMode = false; searchBox.value = ''; panel.classList.remove('hidden');
    const menuOrigin = document.getElementById('bc-menu-origin');
    if (menuOrigin) {
      const readableDate = /^\d{4}-\d{2}-\d{2}$/.test(menuMealDate)
        ? new Date(`${menuMealDate}T00:00:00`).toLocaleDateString('es-ES')
        : '';
      menuOrigin.textContent = `Selección cargada desde el menú${readableDate ? ` para el ${readableDate}` : ''}. Revisa las recetas, raciones y tiempos en la vista previa.`;
      menuOrigin.classList.remove('hidden');
    }
    renderRecipes(); renderBases();
    document.getElementById('bc-create')?.click();
    requestAnimationFrame(() => panel.scrollIntoView({behavior:'smooth',block:'start'}));
  };
})();
