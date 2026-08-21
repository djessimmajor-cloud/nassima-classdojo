// icons.js — set d'icônes SVG inline, dessinées dans un style unique (trait 2px, arrondi,
// façon Feather/Tabler Icons, licence MIT), pour garder une cohérence visuelle totale
// dans toute l'application (sidebar, outils, modale de points, outil Consigne).
const Icons = (function () {
  const wrap = (inner, extra) => `<svg class="icon${extra ? ' ' + extra : ''}" viewBox="0 0 24 24">${inner}</svg>`;

  // Roue de la fortune / roulette : cercle segmenté + triangle indicateur en haut.
  function wheel(extra) {
    return wrap(`
      <path d="M12 2v10L4.6 6.4"/>
      <path d="M12 12 19.4 6.4"/>
      <path d="M12 12 4.9 17.4"/>
      <path d="M12 12l7.1 5.4"/>
      <path d="M12 12V22"/>
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none"/>
      <path d="M12 0.6 9.8 3.6h4.4Z" fill="currentColor" stroke="none"/>
    `, extra);
  }

  const DEFS = {
    wheel,
    book: (e) => wrap(`<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/><path d="M9 7h7M9 11h7"/>`, e),
    bulb: (e) => wrap(`<path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2Z"/>`, e),
    megaphone: (e) => wrap(`<path d="M3 11v3a1 1 0 0 0 1 1h1l4 4v-13l-4 4H4a1 1 0 0 0-1 1Z"/><path d="M13 5a9 9 0 0 1 0 14"/><path d="M13 9a4 4 0 0 1 0 6"/>`, e),
    clock: (e) => wrap(`<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>`, e),
    pencil: (e) => wrap(`<path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="M15 5l4 4"/>`, e),
    target: (e) => wrap(`<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/>`, e),
    star: (e) => wrap(`<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.9-6.2-3.3-6.2 3.3 1.2-6.9-5-4.9 6.9-1L12 2Z"/>`, e),
    speech: (e) => wrap(`<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10Z"/><path d="M8 9h8M8 13h5"/>`, e),
    flag: (e) => wrap(`<path d="M5 22V4"/><path d="M5 4h13l-3 4.5L18 13H5"/>`, e),
    globe: (e) => wrap(`<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z"/>`, e),
    ear: (e) => wrap(`<path d="M8 19a4 4 0 0 1-3-6.7 5 5 0 1 1 9-3.3 4.5 4.5 0 0 1 4 4.5 5 5 0 0 1-4.5 5"/><path d="M12 12a2.5 2.5 0 0 1 2.5 2.5c0 1.5-1 2.5-2 3.5"/>`, e),
    check: (e) => wrap(`<path d="M20 6 9 17l-5-5"/>`, e),
    image: (e) => wrap(`<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.6"/><path d="m21 15-5-5L5 21"/>`, e),
    upload: (e) => wrap(`<path d="M12 16V4"/><path d="m6 9 6-6 6 6"/><path d="M4 20h16"/>`, e),
    trash: (e) => wrap(`<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 15H6L5 6"/><path d="M10 11v6M14 11v6"/>`, e),
    close: (e) => wrap(`<path d="M18 6 6 18M6 6l12 12"/>`, e),
    plus: (e) => wrap(`<path d="M12 5v14M5 12h14"/>`, e),
    minus: (e) => wrap(`<path d="M5 12h14"/>`, e),
    play: (e) => wrap(`<path d="M6 3.5 20 12 6 20.5Z"/>`, e),
    user: (e) => wrap(`<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/>`, e),
    laptop: (e) => wrap(`<rect x="4" y="4" width="16" height="11" rx="1.5"/><path d="M2 19h20"/>`, e),
    ruler: (e) => wrap(`<path d="m3 16 5-5 3 3 9-9 3 3-12 12-3-3-3 3Z"/><path d="M13 7l2 2M10 10l2 2M7 13l2 2"/>`, e),
  };

  function svg(name, extraClass) {
    const fn = DEFS[name];
    return fn ? fn(extraClass) : '';
  }

  // Liste d'icônes proposées pour l'outil Consigne (nom + label FR).
  const CONSIGNE_ICONS = [
    { id: 'book', label: 'Livre' },
    { id: 'bulb', label: 'Ampoule' },
    { id: 'megaphone', label: 'Mégaphone' },
    { id: 'clock', label: 'Horloge' },
    { id: 'pencil', label: 'Stylo' },
    { id: 'target', label: 'Objectif' },
    { id: 'star', label: 'Étoile' },
    { id: 'speech', label: 'Discussion' },
    { id: 'flag', label: 'Drapeau' },
    { id: 'globe', label: 'Monde' },
    { id: 'ear', label: 'Écoute' },
    { id: 'check', label: 'Validé' },
  ];

  return { svg, DEFS, CONSIGNE_ICONS };
})();
