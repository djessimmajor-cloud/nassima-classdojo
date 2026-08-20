// theme.js — applique le thème (normal / nature / néon) et le mode sombre/clair.
const Theme = (function () {
  function apply(theme, darkMode) {
    document.documentElement.setAttribute('data-theme', theme || 'normal');
    document.documentElement.setAttribute('data-mode', darkMode ? 'dark' : 'light');
  }
  function applyFromUser() {
    const user = Auth.getCurrentUser();
    const s = (user && user.settings) || { theme: 'normal', darkMode: false };
    apply(s.theme, s.darkMode);
  }
  return { apply, applyFromUser };
})();
