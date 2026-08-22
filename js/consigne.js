// consigne.js — outil "Consigne" : texte stylisé par le prof, affiché en plein écran
// pendant le cours (vidéoprojecteur). Réglages mémorisés en localStorage.
const Consigne = (function () {
  const KEY = 'cdp_consigne_settings';

  const DEFAULTS = {
    text: '',
    font: "'Sora', sans-serif",
    size: 56,
    color: '#ffffff',
    bgColor: '#000000',
    posV: 'center', // top | center | bottom
    posH: 'center',  // left | center | right
    icon: '',
    image: null, // data URL
  };

  function getSettings() {
    const s = Storage.readJSON(KEY, {});
    return Object.assign({}, DEFAULTS, s);
  }

  function saveSettings(patch) {
    const s = Object.assign(getSettings(), patch);
    Storage.writeJSON(KEY, s);
    return s;
  }

  function alignItems(posV) {
    return posV === 'top' ? 'flex-start' : posV === 'bottom' ? 'flex-end' : 'center';
  }
  function justifyItems(posH) {
    return posH === 'left' ? 'flex-start' : posH === 'right' ? 'flex-end' : 'center';
  }

  // Construit le HTML intérieur (utilisé pour l'aperçu ET le plein écran).
  function buildContentHTML(s) {
    const iconSvg = s.icon && Icons.DEFS[s.icon] ? Icons.svg(s.icon) : '';
    return `
      <div class="consigne-fs-content" style="justify-content:${alignItems(s.posV)}; align-items:${justifyItems(s.posH)};">
        ${iconSvg ? `<div class="consigne-fs-icon" style="color:${s.color}; font-size:${Math.round(s.size * 0.9)}px;">${iconSvg}</div>` : ''}
        <p class="consigne-fs-text" style="font-family:${s.font}; font-size:${s.size}px; color:${s.color};">${escapeHtmlLocal(s.text || 'Votre consigne apparaîtra ici…')}</p>
      </div>
    `;
  }

  function escapeHtmlLocal(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function renderPreview(el, s) {
    el.style.backgroundColor = s.bgColor || DEFAULTS.bgColor;
    el.style.backgroundImage = s.image ? `url("${s.image}")` : 'none';
    el.style.backgroundSize = 'cover';
    el.style.backgroundPosition = 'center';
    el.innerHTML = buildContentHTML(s);
  }

  function showFullscreen(s) {
    const overlay = document.createElement('div');
    overlay.className = 'consigne-fullscreen';
    overlay.style.background = s.bgColor || DEFAULTS.bgColor;
    if (s.image) {
      overlay.style.backgroundImage = `url("${s.image}")`;
      overlay.style.backgroundSize = 'cover';
      overlay.style.backgroundPosition = 'center';
    }
    overlay.innerHTML = `
      <button class="consigne-fs-close" id="consigneFsClose" aria-label="Fermer">${Icons.svg('close')}</button>
      ${buildContentHTML(s)}
    `;
    document.body.appendChild(overlay);
    if (overlay.requestFullscreen) overlay.requestFullscreen().catch(() => {});

    function close() {
      overlay.remove();
      document.removeEventListener('keydown', onKey);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
    overlay.querySelector('#consigneFsClose').addEventListener('click', close);
    return { close };
  }

  // ================= BRUIT "CRAIE QUI CRISSE" (Web Audio API, 100% procédural) =================
  // Aucun fichier audio : on génère le son à la volée avec un AudioContext — un oscillateur
  // en dents de scie dont la fréquence varie de façon rapide/erratique dans les aigus (effet
  // "crissement"), additionné d'un peu de bruit blanc filtré passe-haut pour la dissonance,
  // le tout enveloppé sur ~1.4s avec un volume raisonnable pour ne pas abîmer les oreilles.
  let sharedAudioCtx = null;
  function getAudioCtx() {
    if (!sharedAudioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) throw new Error("L'API Web Audio n'est pas disponible sur ce navigateur.");
      sharedAudioCtx = new Ctx();
    }
    if (sharedAudioCtx.state === 'suspended') sharedAudioCtx.resume().catch(() => {});
    return sharedAudioCtx;
  }

  function playChalkScreech() {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    const duration = 1.4;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(0.22, now + 0.03);
    masterGain.gain.setValueAtTime(0.22, now + duration - 0.15);
    masterGain.gain.linearRampToValueAtTime(0, now + duration);
    masterGain.connect(ctx.destination);

    // Oscillateur principal : forme d'onde en dents de scie, riche en harmoniques aigües,
    // dont la fréquence "zigzague" de façon erratique entre ~1800 et ~4200 Hz pour imiter
    // le crissement irrégulier d'une craie sur un tableau.
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    const steps = 40;
    for (let i = 0; i <= steps; i++) {
      const t = now + (i / steps) * duration;
      const freq = 1800 + Math.random() * 2400;
      osc.frequency.setValueAtTime(freq, t);
    }
    // Léger filtre passe-bande pour concentrer l'énergie dans les aigus stridents.
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 2800;
    bandpass.Q.value = 1.1;
    osc.connect(bandpass);
    bandpass.connect(masterGain);

    // Un second oscillateur légèrement désaccordé pour ajouter de la dissonance ("battements").
    const osc2 = ctx.createOscillator();
    osc2.type = 'sawtooth';
    for (let i = 0; i <= steps; i++) {
      const t = now + (i / steps) * duration;
      const freq = 1900 + Math.random() * 2500;
      osc2.frequency.setValueAtTime(freq, t);
    }
    const gain2 = ctx.createGain();
    gain2.gain.value = 0.6;
    osc2.connect(gain2);
    gain2.connect(bandpass);

    // Bruit blanc filtré passe-haut, en fond, pour la texture "rêche" de la craie.
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 3500;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.12;
    noiseSource.connect(highpass);
    highpass.connect(noiseGain);
    noiseGain.connect(masterGain);

    osc.start(now);
    osc.stop(now + duration);
    osc2.start(now);
    osc2.stop(now + duration);
    noiseSource.start(now);
    noiseSource.stop(now + duration);
  }

  return { getSettings, saveSettings, buildContentHTML, renderPreview, showFullscreen, playChalkScreech, DEFAULTS };
})();
