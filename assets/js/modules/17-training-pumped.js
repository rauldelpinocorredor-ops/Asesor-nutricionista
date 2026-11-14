/* 17 · Training: el botón de la barra inferior abre la app Pumped.
   Mantener pulsado (más de medio segundo) abre la sección de entrenamiento interna. */
(function () {
  const PKG = 'app.pumped.workout.log.tracker.strong.gym.exercise';
  const PLAY = 'https://play.google.com/store/apps/details?id=' + PKG;
  const IOS = 'https://apps.apple.com/app/id6474732457';
  const ua = navigator.userAgent;
  const android = /Android/i.test(ua);
  const ios = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  window.abrirPumped = function () {
    if (android) location.href = 'intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=' + PKG + ';S.browser_fallback_url=' + encodeURIComponent(PLAY) + ';end';
    else window.open(ios ? IOS : PLAY, '_blank', 'noopener');
  };

  const b = document.getElementById('n-training');
  if (!b) return;
  let t = null, largo = false;
  const fin = () => clearTimeout(t);
  b.addEventListener('pointerdown', () => { largo = false; t = setTimeout(() => { largo = true; tab('training'); }, 600); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(e => b.addEventListener(e, fin));
  b.addEventListener('click', () => { if (largo) { largo = false; return; } abrirPumped(); });
  b.addEventListener('contextmenu', e => e.preventDefault());
  b.title = 'Toca para abrir Pumped. Mantén pulsado para el entrenamiento interno.';

  // Atajo de vuelta a Pumped desde la sección interna
  const card = document.querySelector('#s-training > div');
  if (card) card.insertAdjacentHTML('afterbegin', '<button onclick="abrirPumped()" class="w-full mb-3 bg-slate-900 text-white rounded-xl py-3 font-bold text-sm"><i class="fa-solid fa-dumbbell mr-2"></i>Abrir Pumped</button>');
})();
