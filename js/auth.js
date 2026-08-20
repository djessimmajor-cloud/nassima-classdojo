// auth.js — comptes profs (inscription/connexion) + paramètres du compte (clé API, thème...)
const Auth = (function () {
  function getUsers() { return Storage.readJSON(Storage.DB_KEYS.users, []); }
  function saveUsers(u) { return Storage.writeJSON(Storage.DB_KEYS.users, u); }

  function getSessionEmail() { return localStorage.getItem(Storage.DB_KEYS.session); }
  function setSessionEmail(email) {
    if (email) localStorage.setItem(Storage.DB_KEYS.session, email);
    else localStorage.removeItem(Storage.DB_KEYS.session);
  }

  function getCurrentUser() {
    const email = getSessionEmail();
    if (!email) return null;
    return getUsers().find(u => u.email === email) || null;
  }

  async function register(nom, email, motdepasse) {
    email = email.trim().toLowerCase();
    if (!nom.trim() || !email || !motdepasse) throw new Error('Tous les champs sont obligatoires.');
    if (motdepasse.length < 4) throw new Error('Le mot de passe doit contenir au moins 4 caractères.');
    const users = getUsers();
    if (users.some(u => u.email === email)) throw new Error('Un compte existe déjà avec cet email.');
    const hash = await sha256(motdepasse);
    const user = {
      nom: nom.trim(), email, hash,
      createdAt: Date.now(),
      settings: { theme: 'normal', darkMode: false, groqApiKey: '' }
    };
    users.push(user);
    saveUsers(users);
    setSessionEmail(email);
    return user;
  }

  async function login(email, motdepasse) {
    email = email.trim().toLowerCase();
    const users = getUsers();
    const user = users.find(u => u.email === email);
    if (!user) throw new Error('Aucun compte trouvé avec cet email.');
    const hash = await sha256(motdepasse);
    if (hash !== user.hash) throw new Error('Mot de passe incorrect.');
    setSessionEmail(email);
    return user;
  }

  function logout() { setSessionEmail(null); }

  function updateSettings(patch) {
    const email = getSessionEmail();
    const users = getUsers();
    const idx = users.findIndex(u => u.email === email);
    if (idx === -1) return null;
    users[idx].settings = Object.assign({}, users[idx].settings, patch);
    saveUsers(users);
    return users[idx];
  }

  return { register, login, logout, getCurrentUser, getSessionEmail, updateSettings, getUsers };
})();
