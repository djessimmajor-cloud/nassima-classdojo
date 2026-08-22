// storage.js — petite couche d'accès à localStorage, tout le stockage passe par ici.
// Comptes / classes / élèves / points vivent maintenant sur Supabase (voir supabase-client.js,
// auth.js, classes.js, dojo.js). Il ne reste ici que ce qui n'a pas besoin d'être synchronisé
// entre appareils : réglages purement locaux à ce navigateur.
const DB_KEYS = {
  picker: 'cdp_picker_',           // + classId -> état du tirage au sort (pool sans-remise, local)
  quizHistory: 'cdp_quizhist_',    // + classId -> historique des scores de quiz
  notes: 'cdp_notes_',             // + classId -> notes rapides par élève
  badges: 'cdp_badges_',           // + classId -> badges débloqués par élève
  calendar: 'cdp_calendar_',       // + classId -> événements du calendrier
  seating: 'cdp_seating_',         // + classId -> plan de classe
};

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Erreur lecture localStorage', key, e);
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error('Erreur écriture localStorage', key, e);
    alert("Erreur : impossible d'enregistrer les données (stockage local plein ou bloqué).");
    return false;
  }
}

const Storage = { DB_KEYS, readJSON, writeJSON };
