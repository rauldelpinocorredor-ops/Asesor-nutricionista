/* Editor de lotes actuales. Cada corrección se conserva como un evento reversible. */
(() => {
  const escHtml = value => typeof esc === 'function' ? esc(String(value ?? '')) : String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const modal = document.createElement('div');
  modal.id = 'm-stock-edit';
  modal.className = 'fixed inset-0 bg-black/60 hidden z-[90] items-end sm:items-center justify-center p-3';
  modal.innerHTML = `<div class="bg-white rounded-t-2xl sm:rounded-2xl max-w-lg w-full p-4 max-h-[92vh] overflow-y-auto">
    <div class="flex justify-between items-center mb-3"><h3 class="font-bold">Editar alimento</h3><button type="button" id="stock-edit-close" class="text-slate-400 text-2xl" aria-label="Cerrar">×</button></div>
    <p class="text-xs text-slate-500 mb-3">La corrección quedará anotada en el historial y se podrá deshacer. La imagen se indica mediante una URL HTTPS.</p>
    <div class="grid grid-cols-2 gap-2 text-xs">
      <label class="col-span-2">Nombre<input id="stock-edit-name" maxlength="80" class="w-full p-2 border rounded-lg mt-1 text-sm"></label>
      <label>Cantidad<input id="stock-edit-qty" type="number" min="0.001" step="any" class="w-full p-2 border rounded-lg mt-1 text-sm"></label>
      <label>Unidad<select id="stock-edit-unit" class="w-full p-2 border rounded-lg mt-1 bg-white text-sm"><option value="ud">unidades</option><option value="rac">raciones</option><option value="kg">kg</option><option value="g">g</option><option value="l">litros</option><option value="ml">ml</option></select></label>
      <label class="col-span-2">Ubicación<select id="stock-edit-loc" class="w-full p-2 border rounded-lg mt-1 bg-white text-sm"></select></label>
      <label>Caducidad<input id="stock-edit-expiry" type="date" class="w-full p-2 border rounded-lg mt-1 text-sm"></label>
      <label>Recordatorio orientativo<input id="stock-edit-reminder" type="date" class="w-full p-2 border rounded-lg mt-1 text-sm"></label>
      <label>Marca<input id="stock-edit-brand" maxlength="80" class="w-full p-2 border rounded-lg mt-1 text-sm"></label>
      <label class="col-span-2">Código de barras<input id="stock-edit-code" maxlength="32" inputmode="numeric" class="w-full p-2 border rounded-lg mt-1 text-sm"></label>
      <label class="col-span-2">Formato o descripción<input id="stock-edit-format" maxlength="120" class="w-full p-2 border rounded-lg mt-1 text-sm"></label>
      <label class="col-span-2">URL de foto<input id="stock-edit-image" type="url" maxlength="500" placeholder="https://…" class="w-full p-2 border rounded-lg mt-1 text-sm"></label>
    </div>
    <p id="stock-edit-status" class="text-xs text-slate-500 mt-2" role="status" aria-live="polite"></p>
    <div class="grid grid-cols-2 gap-2 mt-3"><button type="button" id="stock-edit-cancel" class="bg-slate-100 rounded-xl py-2.5 font-bold text-sm">Cancelar</button><button type="button" id="stock-edit-save" class="bg-emerald-700 text-white rounded-xl py-2.5 font-bold text-sm">Guardar corrección</button></div>
  </div>`;
  document.body.appendChild(modal);
  let selected = null, submitting = false;
  const el = id => document.getElementById(id);
  const close = () => { modal.classList.add('hidden'); modal.classList.remove('flex'); selected = null; };
  el('stock-edit-close').addEventListener('click', close);
  el('stock-edit-cancel').addEventListener('click', close);
  window.editarStock = index => {
    selected = typeof VIS !== 'undefined' && Array.isArray(VIS) ? VIS[index] : null;
    if (!selected) return;
    if (typeof STOCK_READY === 'undefined' || !STOCK_READY) { alert('El inventario todavía se está cargando.'); return; }
    el('stock-edit-name').value = selected.prod || '';
    el('stock-edit-qty').value = String(selected.cant ?? '');
    el('stock-edit-unit').value = selected.ud || 'ud';
    el('stock-edit-loc').innerHTML = Object.entries(typeof LOCS !== 'undefined' ? LOCS : {}).map(([key, label]) => `<option value="${escHtml(key)}">${escHtml(label)}</option>`).join('');
    el('stock-edit-loc').value = selected.loc || 'despensa-cocina';
    el('stock-edit-expiry').value = selected.cad || '';
    el('stock-edit-reminder').value = selected.recordatorio || '';
    el('stock-edit-brand').value = selected.marca || '';
    el('stock-edit-code').value = selected.cod || '';
    el('stock-edit-format').value = selected.fmt || '';
    el('stock-edit-image').value = selected.img || '';
    el('stock-edit-status').textContent = '';
    modal.classList.remove('hidden'); modal.classList.add('flex');
  };
  el('stock-edit-save').addEventListener('click', async () => {
    if (!selected || submitting) return;
    const name = el('stock-edit-name').value.trim().slice(0, 80), qty = Number(el('stock-edit-qty').value), unit = el('stock-edit-unit').value;
    const loc = el('stock-edit-loc').value, expiry = el('stock-edit-expiry').value, reminder = el('stock-edit-reminder').value, brand = el('stock-edit-brand').value.trim().slice(0, 80);
    const code = el('stock-edit-code').value.trim().slice(0, 32), format = el('stock-edit-format').value.trim().slice(0, 120), image = el('stock-edit-image').value.trim().slice(0, 500);
    if (!name || !(qty > 0) || !Number.isFinite(qty) || !Object.hasOwn(typeof LOCS !== 'undefined' ? LOCS : {}, loc)) { el('stock-edit-status').textContent = 'Revisa nombre, cantidad, unidad y ubicación.'; return; }
    if (image && !image.startsWith('https://')) { el('stock-edit-status').textContent = 'La foto debe tener una dirección HTTPS válida.'; return; }
    if (typeof USER === 'undefined' || !USER || !window.fb?.addMov) { el('stock-edit-status').textContent = 'Inicia sesión para guardar la corrección.'; return; }
    const freezer = value => /^(cocina-|sotano-)/.test(value || '');
    const anterior = {
      prod: selected.prod, cant: selected.cant, ud: selected.ud, cad: selected.cad || '',
      cod: selected.cod || '', fmt: selected.fmt || '', img: selected.img || '', ns: selected.ns || '', marca: selected.marca || '',
      recordatorio: selected.recordatorio || '', recordatorioFuente: selected.recordatorioFuente || '', recordatorioCategoria: selected.recordatorioCategoria || '', fechaCongelacion: selected.fechaCongelacion || null, loc: selected.loc
    };
    const fechaCongelacion = freezer(loc) ? (freezer(selected.loc) ? (selected.fechaCongelacion || null) : Date.now()) : null;
    const reminderChanged = reminder !== (selected.recordatorio || '');
    const next = { prod: name, cant: qty, ud: unit, cad: expiry, recordatorio: reminder, recordatorioFuente: reminderChanged ? '' : (selected.recordatorioFuente || ''), recordatorioCategoria: reminderChanged ? '' : (selected.recordatorioCategoria || ''), cod: code, fmt: format, img: image, ns: selected.ns || '', marca: brand, fechaCongelacion, loc };
    const equal = Object.keys(next).every(key => String(next[key] ?? '') === String(anterior[key] ?? ''));
    if (equal) { el('stock-edit-status').textContent = 'No hay cambios que guardar.'; return; }
    const summary = `${name} · ${qty} ${unit} · ${typeof nombreLoc === 'function' ? nombreLoc(loc) : loc}`;
    if (!confirm(`Guardar corrección del inventario?\n\n${summary}\n\nLa operación aparecerá en el historial y se podrá deshacer.`)) return;
    submitting = true; el('stock-edit-save').disabled = true; el('stock-edit-status').textContent = 'Guardando…';
    try {
      await window.fb.addMov({ t: Date.now(), por: USER.email || '', ...next, de: anterior.loc, a: loc, tipo: 'edicion', nota: 'Corrección manual', anterior });
      el('stock-edit-status').textContent = 'Corrección guardada. El inventario se actualizará al recibir la sincronización.';
      setTimeout(close, 900);
    } catch (error) {
      el('stock-edit-status').textContent = `No se guardó la corrección (${error?.code || 'error'}). No se modificó el inventario.`;
    } finally { submitting = false; el('stock-edit-save').disabled = false; }
  });
})();
