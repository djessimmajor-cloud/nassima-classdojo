// consigne.js — outil "Consigne" : texte stylisé par le prof, affiché en plein écran
// pendant le cours (vidéoprojecteur). Réglages mémorisés en localStorage.
const Consigne = (function () {
  const KEY = 'cdp_consigne_settings';

  const DEFAULTS = {
    text: '',
    font: "'Sora', sans-serif",
    size: 56,
    color: '#ffffff',
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
    el.style.backgroundImage = s.image ? `url("${s.image}")` : 'none';
    el.style.backgroundColor = s.image ? '#101a14' : '';
    el.style.backgroundSize = 'cover';
    el.style.backgroundPosition = 'center';
    el.innerHTML = buildContentHTML(s);
  }

  function showFullscreen(s) {
    const overlay = document.createElement('div');
    overlay.className = 'consigne-fullscreen';
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

  return { getSettings, saveSettings, buildContentHTML, renderPreview, showFullscreen, DEFAULTS };
})();
