/* Optional refrigerated storage reminders from a primary public food-safety source. */
(() => {
  const SOURCE = 'https://www.foodsafety.gov/food-safety-charts/cold-food-storage-charts';
  const guidanceFor = category => ({
    poultry_raw: { days:1, category:'pollo o pavo crudo' },
    ground_raw: { days:1, category:'carne picada cruda' },
    fish_fresh: { days:1, category:'pescado o marisco fresco' },
    meat_cut_raw: { days:3, category:'corte fresco de vacuno, cerdo o cordero' },
    cooked_leftovers: { days:3, category:'sopa, guiso o sobras cocinadas' }
  })[String(category || '')] || null;
  const dateAfter = days => { const d=new Date(); d.setDate(d.getDate()+days); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const dateLabel = iso => iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('es-ES') : '';
  function apply(input, category, location, sourceField) {
    if (!input) return;
    if (location !== 'frigo') { alert('Esta orientación solo se aplica a conservación en frigorífico a 4 °C o menos. Selecciona Frigorífico y vuelve a intentarlo.'); return; }
    const suggestion=guidanceFor(category);
    if (!suggestion) { alert('Selecciona explícitamente el estado/categoría del alimento. El nombre por sí solo no permite distinguir crudo, cocinado o envasado; sin esa información no se propone un plazo. Usa la fecha de etiqueta o un recordatorio manual.'); return; }
    const date=dateAfter(suggestion.days);
    if (input.value && !confirm(`El recordatorio actual es ${dateLabel(input.value)}. ¿Quieres sustituirlo por ${dateLabel(date)}?`)) return;
    input.value=date;
    if (sourceField) sourceField.value=SOURCE;
    alert(`Recordatorio orientativo para revisar/consumir: ${suggestion.category}, ${dateLabel(date)} (plazo contado desde hoy). Solo para frigorífico a 4 °C o menos. No es fecha de caducidad; la etiqueta e instrucciones del fabricante prevalecen. Fuente oficial: FoodSafety.gov.`);
  }
  window.sugerirCaducidadManual = () => apply(document.getElementById('p-rec'), document.getElementById('p-rec-category')?.value, document.getElementById('p-cat')?.value, document.getElementById('p-rec-source'));
  window.sugerirCaducidadVoz = () => apply(document.getElementById('voice-add-reminder'), document.getElementById('voice-add-category')?.value, document.getElementById('voice-add-loc')?.value, document.getElementById('voice-add-source'));
  window.sugerirCaducidadTicket = index => {
    const row=typeof TKROWS!=='undefined'&&Array.isArray(TKROWS)?TKROWS[index]:null; if(!row) return;
    const suggestion=guidanceFor(row.recordatorioCategoria);
    if (!suggestion) return alert('Selecciona explícitamente el estado/categoría del alimento. El nombre por sí solo no permite distinguir crudo, cocinado o envasado; sin esa información no se propone un plazo. Usa la fecha de etiqueta o un recordatorio manual.');
    if (row.loc !== 'frigo') {
      if (!confirm('Esta orientación solo se aplica al frigorífico a 4 °C o menos. ¿Cambiar la ubicación de esta línea a Frigorífico?')) return;
      row.loc='frigo';
    }
    const date=dateAfter(suggestion.days);
    if (row.recordatorio && !confirm(`¿Sustituir el recordatorio actual por ${dateLabel(date)}?`)) return;
    row.recordatorio=date; row.recordatorioFuente=SOURCE; row.recordatorioCategoria=suggestion.category;
    if (typeof tkPintaLista==='function') tkPintaLista();
    alert(`Recordatorio orientativo: ${suggestion.category}, revisar/consumir antes de ${dateLabel(date)} (contado desde hoy). Solo para frigorífico a 4 °C o menos; no sustituye la fecha de etiqueta. Fuente oficial: FoodSafety.gov.`);
  };
  document.addEventListener('click', event => {
    const link=event.target.closest('[data-storage-source]');
    if (link) window.open(SOURCE,'_blank','noopener');
  });
  if (typeof pintaAvisos === 'function') {
    const previousNotices = pintaAvisos;
    pintaAvisos = function (...args) {
      const result = previousNotices.apply(this,args);
      const box=document.getElementById('avisos');
      if (!box || typeof STOCK==='undefined' || !Array.isArray(STOCK)) return result;
      const today=new Date(); today.setHours(0,0,0,0);
      const soon=new Date(today); soon.setDate(soon.getDate()+3);
      const due=STOCK.filter(item=>item.recordatorio && !item.cad && new Date(`${item.recordatorio}T12:00:00`)<=soon)
        .sort((a,b)=>String(a.recordatorio).localeCompare(String(b.recordatorio)));
      if (due.length) box.insertAdjacentHTML('beforeend',`<div class="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-xs mt-2"><p class="font-bold text-indigo-900 mb-1">Recordatorios de consumo próximos</p>${due.map(item=>`<p class="py-1">${typeof esc==='function'?esc(item.prod):String(item.prod)} · ${item.recordatorioFuente===SOURCE?`orientativo (${typeof esc==='function'?esc(item.recordatorioCategoria||''):String(item.recordatorioCategoria||'')})`: 'manual'} · revisar antes de ${dateLabel(item.recordatorio)}${item.recordatorioFuente===SOURCE?' · FoodSafety.gov':''}</p>`).join('')}<p class="text-[10px] text-indigo-800 mt-1">Los recordatorios orientativos no son fechas de caducidad ni sustituyen la etiqueta; la referencia presupone frigorífico a 4 °C o menos.</p></div>`);
      return result;
    };
  }
  window.STORAGE_GUIDANCE_SOURCE = SOURCE;
})();
