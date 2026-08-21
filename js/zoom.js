// zoom.js — contrôle du zoom global de l'interface (--ui-scale), persistant en localStorage.
// Utile pour un prof qui veut agrandir le contenu pendant une projection en classe.
const Zoom = (function () {
  const KEY = 'cdp_ui_scale';
  const MIN = 80, MAX = 160, STEP = 5;

  function get() {
    const v = parseInt(localStorage.getItem(KEY), 10);
    return (v && v >= MIN && v <= MAX) ? v : 100;
  }

  function set(value) {
    const v = Math.max(MIN, Math.min(MAX, Math.round(value / STEP) * STEP));
    localStorage.setItem(KEY, String(v));
    apply(v);
    return v;
  }

  function apply(v) {
    document.documentElement.style.setProperty('--ui-scale', (v / 100).toFixed(2));
    document.querySelectorAll('.zoom-level, #zoomSliderVal').forEach(el => el.textContent = v + '%');
    const slider = document.getElementById('zoomSlider');
    if (slider && parseInt(slider.value, 10) !== v) slider.value = v;
  }

  function init() {
    apply(get());
    const zin = document.getElementById('zoomIn');
    const zout = document.getElementById('zoomOut');
    const slider = document.getElementById('zoomSlider');
    if (zin) zin.addEventListener('click', () => set(get() + STEP));
    if (zout) zout.addEventListener('click', () => set(get() - STEP));
    if (slider) {
      slider.value = get();
      slider.addEventListener('input', () => set(parseInt(slider.value, 10)));
    }
  }

  document.addEventListener('DOMContentLoaded', init);
  return { get, set, apply };
})();
