// auth.js — comptes profs (inscription/connexion via Supabase Auth) + paramètres du compte
// (clé API, thème...) stockés dans la table profiles. Le SDK Supabase persiste la session
// automatiquement (reconnecté au rechargement) : c'est voulu, seul le choix de "classe du
// jour" doit être redemandé à chaque entrée (géré séparément dans main.js).
const Auth = (function () {
  let currentProfile = null; // cache en mémoire du profil (nom + settings) du prof connecté

  async function init() {
    const { data, error } = await sb.auth.getSession();
    if (error || !data.session) { currentProfile = null; return null; }
    await loadProfile(data.session.user.id, data.session.user.email);
    return currentProfile;
  }

  async function loadProfile(userId, email) {
    let { data, error } = await sb.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (error) throw new Error(friendlyError(error));
    if (!data) {
      // Filet de sécurité si le trigger de création automatique n'a pas encore tourné.
      const ins = await sb.from('profiles').insert({ id: userId, nom: email }).select().maybeSingle();
      data = ins.data;
    }
    currentProfile = {
      id: userId,
      email,
      nom: (data && data.nom) || email,
      settings: Object.assign({ theme: 'normal', darkMode: false, groqApiKey: '' }, (data && data.settings) || {}),
    };
    return currentProfile;
  }

  function getCurrentUser() { return currentProfile; }
  function getSessionEmail() { return currentProfile ? currentProfile.email : null; }
  function getUserId() { return currentProfile ? currentProfile.id : null; }

  async function register(nom, email, motdepasse) {
    nom = (nom || '').trim();
    email = (email || '').trim().toLowerCase();
    if (!nom || !email || !motdepasse) throw new Error('Tous les champs sont obligatoires.');
    if (motdepasse.length < 6) throw new Error('Le mot de passe doit contenir au moins 6 caractères.');
    const { data, error } = await sb.auth.signUp({
      email, password: motdepasse, options: { data: { nom } }
    });
    if (error) throw new Error(friendlyError(error));
    if (!data.session) {
      // Confirmation email activée côté projet : pas de session immédiate.
      throw new Error("Compte créé. Vérifiez votre boîte mail pour confirmer votre adresse avant de vous connecter.");
    }
    await loadProfile(data.user.id, data.user.email);
    // Le nom saisi peut ne pas encore être dans profiles si le trigger vient de tourner sans lire raw_user_meta_data à temps.
    if (currentProfile.nom !== nom) {
      await sb.from('profiles').update({ nom }).eq('id', data.user.id);
      currentProfile.nom = nom;
    }
    return currentProfile;
  }

  async function login(email, motdepasse) {
    email = (email || '').trim().toLowerCase();
    const { data, error } = await sb.auth.signInWithPassword({ email, password: motdepasse });
    if (error) throw new Error(friendlyError(error));
    await loadProfile(data.user.id, data.user.email);
    return currentProfile;
  }

  async function logout() {
    await sb.auth.signOut();
    currentProfile = null;
  }

  async function updateSettings(patch) {
    if (!currentProfile) return null;
    currentProfile.settings = Object.assign({}, currentProfile.settings, patch);
    const { error } = await sb.from('profiles').update({ settings: currentProfile.settings }).eq('id', currentProfile.id);
    if (error) throw new Error(friendlyError(error));
    return currentProfile;
  }

  // Supprime définitivement le compte connecté (auth + toutes ses classes/élèves/points,
  // supprimés en cascade côté base de données) via la fonction RPC delete_own_account.
  async function deleteMyAccount() {
    if (!currentProfile) return;
    const { error } = await sb.rpc('delete_own_account');
    if (error) throw new Error(friendlyError(error));
    currentProfile = null;
    await sb.auth.signOut();
  }

  return { init, register, login, logout, getCurrentUser, getSessionEmail, getUserId, updateSettings, deleteMyAccount };
})();
