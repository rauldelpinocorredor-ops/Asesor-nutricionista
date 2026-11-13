/* ===== v4.0: identidad visual ===== */
const TIPOI = { desayuno: ['fa-mug-hot', '#B7791F'], comida: ['fa-bowl-food', '#1F7A4D'], cena: ['fa-moon', '#2C79B5'], merienda: ['fa-cookie-bite', '#8F6B3D'], postre: ['fa-cake-candles', '#7A2E5F'] };
const locCol = l => l === 'despensa-cocina' ? '#B7791F' : l === 'despensa-sotano' ? '#8F6B3D' : /^cocina-/.test(l) ? '#2C79B5' : /^sotano-/.test(l) ? '#1D5885' : '#8F6B3D';
function caducBar(f) {
  if (!f) return '';
  const d = Math.ceil((new Date(f + 'T00:00:00') - new Date().setHours(0, 0, 0, 0)) / 864e5), pct = Math.max(6, Math.min(100, 100 - d / 14 * 100));
  return `<span class="cad-bar" title="Caducidad"><i style="width:${d < 0 ? 100 : pct}%;background:${d <= 2 ? '#C93B2B' : d <= 7 ? '#B7791F' : '#1F7A4D'}"></i></span>`;
}
function pintaHero() {
  const hoy = new Date().setHours(0, 0, 0, 0);
  const n = new Set(STOCK.filter(s => s.cad && !['limpieza', 'mascotas'].includes(s.loc) && (new Date(s.cad + 'T00:00:00') - hoy) / 864e5 >= 0 && (new Date(s.cad + 'T00:00:00') - hoy) / 864e5 < 7).map(s => sinAc(s.prod))).size;
  $('hero-s').textContent = n ? (n === 1 ? '1 producto caduca esta semana. Hay recetas para aprovecharlo.' : n + ' productos caducan esta semana. Hay recetas para aprovecharlos.') : 'Nada caduca esta semana. Elige ingredientes y busca receta.';
}
const _sc2 = selectorChef; selectorChef = function () { _sc2(); pintaHero(); };
const _om2 = window.onMovs; window.onMovs = (l, c) => { _om2(l, c); pintaHero(); };
pintaHero();
