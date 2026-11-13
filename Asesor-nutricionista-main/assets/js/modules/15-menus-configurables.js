/* ===== Menús configurables, editables y guardados (v3) ===== */
const MENU_STORE_KEY = 'asesor_nutri_menus_v1';
let MENU_DB = {};
try { MENU_DB = JSON.parse(localStorage.getItem(MENU_STORE_KEY) || '{}') || {}; } catch(e) { MENU_DB = {}; }
const menuPersist = () => { try { localStorage.setItem(MENU_STORE_KEY, JSON.stringify(MENU_DB)); } catch(e) { alert('No se pudo guardar en este dispositivo.'); } };
const MENU_ADULT_CATALOG = {
 desayuno: [
  ['Avena con yogur natural y fruta','Lácteo/proteína + cereal + fruta'],
  ['Tostada integral con tomate y huevo','Cereal integral + proteína + vegetal'],
  ['Yogur natural, avena y frutos rojos','Lácteo/proteína + cereal + fruta'],
  ['Pan integral con queso fresco y fruta','Cereal + lácteo + fruta']
 ],
 almuerzo: [
  ['Fruta fresca y un puñado de frutos secos','Fruta + grasa/proteína (frutos secos)'],
  ['Yogur natural con fruta','Lácteo/proteína + fruta'],
  ['Hummus con crudités y pan integral','Legumbre + vegetal + cereal'],
  ['Tostada integral con aguacate','Cereal + grasa vegetal']
 ],
 comida: [
  ['Pollo a la plancha, arroz integral y ensalada','Proteína + cereal/tubérculo + verduras'],
  ['Lentejas con verduras y huevo','Legumbre/proteína + verduras'],
  ['Pescado al horno, patata y verduras','Proteína + tubérculo + verduras'],
  ['Pasta integral con tomate y atún','Cereal + proteína + vegetal'],
  ['Garbanzos con espinacas y arroz','Legumbre + cereal + verduras'],
  ['Tofu salteado con quinoa y verduras','Proteína vegetal + cereal + verduras'],
  ['Tortilla de verduras con ensalada y pan integral','Huevo + verduras + cereal']
 ],
 merienda: [
  ['Fruta y yogur natural','Fruta + lácteo/proteína'],
  ['Pan integral con queso fresco','Cereal + lácteo/proteína'],
  ['Pera y frutos secos','Fruta + grasa/proteína (frutos secos)'],
  ['Hummus con zanahoria','Legumbre + vegetal']
 ],
 cena: [
  ['Crema de verduras, tortilla y pan integral','Verduras + proteína + cereal'],
  ['Merluza con patata y verduras','Proteína + tubérculo + verduras'],
  ['Ensalada completa con garbanzos y huevo','Legumbre/proteína + verduras'],
  ['Pollo con verduras salteadas y arroz','Proteína + verduras + cereal'],
  ['Berenjena al horno rellena de lentejas','Verduras + legumbre/proteína']
 ]
};
const MENU_BABY_CATALOG = {
 desayuno: ['Leche materna o fórmula; complementar según etapa con fruta o cereal apropiado','Avena/cereal apropiado preparado con leche materna o fórmula','Fruta madura adecuada a la textura y capacidad del bebé'],
 merienda: ['Fruta preparada en textura segura para el bebé','Yogur natural sin azúcar, si ya está introducido y tolerado','Fruta y cereal apropiado para su etapa'],
 cena: ['Verduras bien cocinadas con huevo bien cuajado, si ya está introducido','Verduras con pescado bien cocinado y sin espinas, si ya está introducido','Legumbre bien cocida y adaptada a textura segura con verduras','Pollo bien cocinado, desmenuzado/adaptado, con verduras']
};
function menuEscape(v) { return esc(String(v || '')); }
function menuInitControls() {
  document.querySelectorAll('.n-meal').forEach(el => { el.onchange = () => {}; });
  paintSavedMenuButtons();
}
function menuAdultos() {
  const selected = [...document.querySelectorAll('.n-meal:checked')].map(x=>x.value);
  if (!selected.length) { alert('Selecciona al menos una comida para generar el menú.'); return; }
  const p = Math.max(1, +$('n-pers').value || 1), days = Math.max(1, +$('n-dias').value || 7);
  let current = MENU_DB.adultCurrent;
  if (!current || current.days !== days || JSON.stringify(current.meals) !== JSON.stringify(selected)) {
    current = { id:'adult-'+Date.now(), days, meals:selected, servings:p, kcal:+$('n-kcal').value||2000, entries:[] };
    for (let d=0; d<days; d++) {
      const day = {};
      selected.forEach(meal => {
        const options = MENU_ADULT_CATALOG[meal] || [];
        day[meal] = options[(d + (meal==='cena'?2:0)) % options.length][0];
      });
      current.entries.push(day);
    }
    MENU_DB.adultCurrent = current;
  } else { current.servings=p; current.kcal=+$('n-kcal').value||2000; }
  paintAdultMenu(); menuPersist();
}
function adultAltOptions(meal, dish) {
  return (MENU_ADULT_CATALOG[meal]||[]).map(x=>x[0]).filter(x=>x!==dish);
}
function adultChange(day, meal, value) {
  const m = MENU_DB.adultCurrent; if (!m) return;
  const previous = m.entries[day][meal]; m.entries[day][meal] = value;
  const desc = (MENU_ADULT_CATALOG[meal]||[]).find(x=>x[0]===value)?.[1] || '';
  alert('Cambio aplicado. La alternativa conserva una estructura general similar ('+desc+'). No hay cálculo nutricional exacto en la app; revisa raciones y el equilibrio del resto del día. Si cambias la fuente principal de proteína o las cantidades, puede ser necesario ajustar otro plato.');
  paintAdultMenu(); menuPersist();
}
function paintAdultMenu() {
  const m=MENU_DB.adultCurrent; if(!m) return;
  const p=Math.max(1,+$('n-pers').value||m.servings||1), f=(+$('n-kcal').value||m.kcal||2000)/2000;
  let h=`<p class="text-xs text-slate-500 mb-2">Menú para ${p} comensal(es), ${m.days} días. Selecciona un plato para cambiarlo por otra opción del mismo tipo.</p>`;
  h+=`<p class="text-[11px] text-amber-700 bg-amber-50 rounded-lg p-2 mb-2">Equilibrio orientativo por grupos de alimentos, no un análisis de nutrientes. Los cambios entre grupos pueden requerir compensaciones; se indicará al elegir.</p>`;
  h+=m.entries.map((day,d)=>`<div class="bg-slate-50 rounded-xl p-3 text-xs mb-2"><p class="font-bold text-slate-700 mb-2">Día ${d+1}</p>${m.meals.map(meal=>{
    const dish=day[meal], opts=adultAltOptions(meal,dish);
    return `<label class="block mb-2"><b class="capitalize">${meal}:</b><div class="flex items-center gap-2 mt-1"><div class="min-w-0 flex-1"><select class="w-full p-2 border rounded-lg bg-white" onchange="adultChange(${d},'${meal}',this.value)"><option value="${menuEscape(dish)}">${menuEscape(dish)}</option>${opts.map(x=>`<option value="${menuEscape(x)}">${menuEscape(x)}</option>`).join('')}</select></div>${platoBtn(dish)}</div><span class="text-slate-500 text-[11px]">Ración orientativa por persona; adaptar cantidades según necesidades.</span></label>`;
  }).join('')}</div>`).join('');
  $('n-res').innerHTML=h+`<div class="grid grid-cols-2 gap-2"><button onclick="saveAdultMenu()" class="bg-indigo-600 text-white rounded-xl py-2 text-sm font-bold">Guardar menú</button><button onclick="MENU_DB.adultCurrent=null;menuAdultos()" class="bg-slate-700 text-white rounded-xl py-2 text-sm font-bold">Generar otro</button></div>`;
}
function saveAdultMenu() {
  const m=MENU_DB.adultCurrent; if(!m) return alert('Genera primero un menú.');
  const name=prompt('Nombre para guardar este menú:', 'Menú '+new Date().toLocaleDateString('es-ES')); if(!name) return;
  MENU_DB.adultSaved=MENU_DB.adultSaved||[]; MENU_DB.adultSaved.unshift({...JSON.parse(JSON.stringify(m)),name,savedAt:Date.now()});
  MENU_DB.adultSaved=MENU_DB.adultSaved.slice(0,30); menuPersist(); paintSavedMenuButtons(); alert('Menú guardado en este dispositivo.');
}
function loadAdultMenu(id) {
  const m=(MENU_DB.adultSaved||[]).find(x=>x.id===id); if(!m)return;
  MENU_DB.adultCurrent=JSON.parse(JSON.stringify(m));
  document.querySelectorAll('.n-meal').forEach(x=>x.checked=m.meals.includes(x.value));
  $('n-dias').value=String(m.days); $('n-pers').value=m.servings||2; $('n-kcal').value=m.kcal||2000;
  paintAdultMenu(); menuPersist();
}
function saveBabyMenu() {
  const meals=['desayuno','merienda','cena'].filter((x,i)=>$('b-'+({desayuno:'des',merienda:'mer',cena:'cen'}[x])).checked);
  const entries={}; meals.forEach(x=>entries[x]=MENU_DB.babyCurrent?.entries?.[x]||MENU_BABY_CATALOG[x][0]);
  MENU_DB.babyCurrent={id:'baby-'+Date.now(),meals,entries,schoolMenu:COLE.map(x=>({fecha:x.fecha,items:x.items}))};
  const name=prompt('Nombre para guardar este menú del bebé:','Menú bebé '+new Date().toLocaleDateString('es-ES')); if(!name)return;
  MENU_DB.babySaved=MENU_DB.babySaved||[]; MENU_DB.babySaved.unshift({...JSON.parse(JSON.stringify(MENU_DB.babyCurrent)),name,savedAt:Date.now()}); MENU_DB.babySaved=MENU_DB.babySaved.slice(0,30);
  menuPersist(); paintSavedMenuButtons(); alert('Menú del bebé guardado en este dispositivo. Revisa siempre texturas, alimentos ya introducidos y alergias con su pediatra.');
}
function babyChange(meal,value) {
  const current=MENU_DB.babyCurrent || {entries:{}};
  const old=current.entries[meal]; current.entries[meal]=value; current.meals=current.meals||[];
  if(!current.meals.includes(meal))current.meals.push(meal);
  MENU_DB.babyCurrent=current; menuPersist();
  const notes = value!==old ? 'La sustitución es una idea general, no una equivalencia nutricional. No se puede confirmar que compense la comida del colegio sin revisar el menú y las necesidades/etapa del bebé.' : '';
  if(notes) alert(notes+' Verifica que el alimento ya esté introducido y ofrece una textura segura; no incluyas alimentos con riesgo de atragantamiento.');
  paintBabyMenu();
}
function menuBebe() {
  const map=[['b-des','desayuno','Desayuno'],['b-mer','merienda','Merienda'],['b-cen','cena','Cena']];
  MENU_DB.babyCurrent=MENU_DB.babyCurrent||{id:'baby-current',entries:{}};
  const meals=map.filter(x=>$(x[0]).checked).map(x=>x[1]); MENU_DB.babyCurrent.meals=meals;
  meals.forEach(meal=>{if(!MENU_DB.babyCurrent.entries[meal]) MENU_DB.babyCurrent.entries[meal]=MENU_BABY_CATALOG[meal][0];});
  $('b-res').innerHTML=map.filter(x=>$(x[0]).checked).map(([id,meal,label])=>{
    const val=MENU_DB.babyCurrent.entries[meal]||MENU_BABY_CATALOG[meal][0];
    return `<div class="bg-slate-50 rounded-xl p-3 text-xs mb-2"><b>${label}:</b><select class="w-full p-2 border rounded-lg bg-white mt-1" onchange="babyChange('${meal}',this.value)"><option value="${menuEscape(val)}">${menuEscape(val)}</option>${MENU_BABY_CATALOG[meal].filter(v=>v!==val).map(v=>`<option value="${menuEscape(v)}">${menuEscape(v)}</option>`).join('')}</select><div class="mt-1">${platoBtn(val)}</div></div>`;
  }).join('')||'<p class="text-xs text-slate-400">Sin comidas en casa seleccionadas.</p>';
  $('b-res').insertAdjacentHTML('beforeend','<button onclick="saveBabyMenu()" class="w-full bg-indigo-600 text-white rounded-xl py-2 text-sm font-bold mt-2">Guardar menú del bebé</button>');
  menuPersist();
}
function loadBabyMenu(id) {
 const m=(MENU_DB.babySaved||[]).find(x=>x.id===id);if(!m)return;
 MENU_DB.babyCurrent=JSON.parse(JSON.stringify(m));
 [['b-des','desayuno'],['b-mer','merienda'],['b-cen','cena']].forEach(([id,meal])=>$(id).checked=m.meals.includes(meal));
 menuBebe(); menuPersist();
}
function paintSavedMenuButtons() {
 $('n-guardados').innerHTML=(MENU_DB.adultSaved||[]).length?'<p class="text-xs font-bold mb-1">Menús guardados (este dispositivo)</p>'+MENU_DB.adultSaved.map(m=>`<button onclick="loadAdultMenu('${m.id}')" class="block w-full text-left bg-indigo-50 rounded-lg p-2 text-xs mb-1">${menuEscape(m.name)} · ${m.days} días</button>`).join(''):'';
 $('b-guardados').innerHTML=(MENU_DB.babySaved||[]).length?'<p class="text-xs font-bold mb-1">Menús bebé guardados (este dispositivo)</p>'+MENU_DB.babySaved.map(m=>`<button onclick="loadBabyMenu('${m.id}')" class="block w-full text-left bg-indigo-50 rounded-lg p-2 text-xs mb-1">${menuEscape(m.name)}</button>`).join(''):'';
}
menuInitControls();
if(MENU_DB.adultCurrent) paintAdultMenu();
if(MENU_DB.babyCurrent) menuBebe();
paintSavedMenuButtons();