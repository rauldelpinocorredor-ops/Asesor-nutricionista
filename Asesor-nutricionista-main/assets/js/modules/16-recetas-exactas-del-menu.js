/* Corrección: las recetas de los menús deben corresponder al plato pulsado. */
function menuDishWords(value) {
  const stop = new Set(['con','de','del','la','el','las','los','y','al','a','en','para','una','un','por','sin','tipo','casero','casera']);
  return [...new Set(sinAc(String(value||'')).replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(w=>w.length>2&&!stop.has(w)))];
}
function menuDishSimilarity(a,b) {
  const aa=menuDishWords(a), bb=menuDishWords(b); if(!aa.length||!bb.length)return 0;
  const common=aa.filter(w=>bb.some(v=>v===w || (w.length>=5&&v.length>=5&&(w.startsWith(v)||v.startsWith(w)))));
  return common.length/Math.min(aa.length,bb.length);
}
function verPlato(i) {
  const dish=String(PLT[i]||'').trim(); if(!dish)return; PTN=dish;
  const candidates=todas().map(r=>({r,score:menuDishSimilarity(dish,r.n)})).sort((a,b)=>b.score-a.score);
  if(candidates[0] && candidates[0].score>=0.75) return verReceta(candidates[0].r.id);
  $('mr-plato').textContent=dish;
  $('mr-prompt').value=`Actúa como chef. Necesito la receta del plato EXACTO: "${dish}".

No propongas otro plato ni lo sustituyas por huevos, tortillas u otra alternativa. El nombre de la receta debe corresponder claramente a "${dish}".

Prepara una receta casera para 2 personas, con ingredientes y cantidades concretas, pasos ordenados y tiempos de cocción. No inventes un plato distinto.

Responde SOLO con un objeto JSON válido, sin introducción ni markdown, con este formato: {"nombre":"${dish}","tipo":"desayuno|comida|cena|merienda|postre","dietas":["mediterránea"],"raciones":2,"ingredientes":["cantidad e ingrediente"],"pasos":[{"texto":"instrucción completa","minutos":10}]}. Cada paso debe tener texto completo; minutos debe ser un número entero o null.`;
  $('mr-respuesta').value=''; $('mr-estado').textContent=''; abrir('m-menu-receta');
}
async function copiarMenuRecipePrompt() {
  const v=$('mr-prompt').value;
  try { await navigator.clipboard.writeText(v); $('mr-estado').textContent='Petición copiada. Pégala en tu IA y después pega aquí la receta.'; }
  catch(e) { $('mr-prompt').focus(); $('mr-prompt').select(); $('mr-estado').textContent='No se pudo copiar automáticamente. Mantén pulsado el texto, cópialo y pégalo en tu IA.'; }
}
function importarMenuRecipe() {
  try {
    const r=parseReceta($('mr-respuesta').value);
    const sim=menuDishSimilarity(PTN,r.n);
    if(sim<0.5) throw new Error(`La IA ha devuelto «${r.n}», que no parece corresponder a «${PTN}». No se ha guardado. Vuelve a pedir la receta exacta.`);
    r.id='menu-'+Date.now();
    guardaRec(r); S.rec=[...S.rec,r];
    cerrar('m-menu-receta'); verReceta(r.id);
  } catch(e) { $('mr-estado').textContent='No se ha guardado: '+e.message; }
}