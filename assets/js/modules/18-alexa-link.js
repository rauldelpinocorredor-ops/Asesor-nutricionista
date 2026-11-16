let alexaCodeTimer = null;
let activeAlexaPairingCode = '';

function abrirAlexa() {
  const modal = document.getElementById('m-alexa');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function cerrarAlexa() {
  const modal = document.getElementById('m-alexa');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  if (alexaCodeTimer) clearInterval(alexaCodeTimer);
  alexaCodeTimer = null;
  if (activeAlexaPairingCode) fb.deleteAlexaPairingCode(activeAlexaPairingCode).catch(() => {});
  activeAlexaPairingCode = '';
}

async function crearCodigoAlexa() {
  const button = document.getElementById('alexa-code-button');
  const result = document.getElementById('alexa-code-result');
  const error = document.getElementById('alexa-code-error');
  button.disabled = true;
  button.textContent = 'Creando código…';
  error.textContent = '';
  result.classList.add('hidden');
  try {
    const pairing = await fb.createAlexaPairingCode();
    activeAlexaPairingCode = pairing.code;
    document.getElementById('alexa-code').textContent = pairing.code;
    const expiry = document.getElementById('alexa-code-expiry');
    const updateCountdown = () => {
      const seconds = Math.max(0, Math.ceil((pairing.expiresAt - Date.now()) / 1000));
      expiry.textContent = seconds ? `Caduca en ${seconds} segundos.` : 'El código ha caducado. Genera otro si no llegaste a vincularlo.';
      if (!seconds) {
        clearInterval(alexaCodeTimer);
        alexaCodeTimer = null;
        document.getElementById('alexa-code').textContent = '';
        fb.deleteAlexaPairingCode(activeAlexaPairingCode).catch(() => {});
        activeAlexaPairingCode = '';
      }
    };
    updateCountdown();
    alexaCodeTimer = setInterval(updateCountdown, 1000);
    result.classList.remove('hidden');
  } catch (err) {
    error.textContent = err?.message || 'No se pudo crear el código. Inténtalo de nuevo.';
  } finally {
    button.disabled = false;
    button.textContent = 'Generar otro código';
  }
}

window.abrirAlexa = abrirAlexa;
window.cerrarAlexa = cerrarAlexa;
window.crearCodigoAlexa = crearCodigoAlexa;
