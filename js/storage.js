// storage.js — petite couche d'accès à localStorage, tout le stockage passe par ici.
const DB_KEYS = {
  users: 'cdp_users',              // tableau de comptes profs
  session: 'cdp_session',          // email du prof connecté
  classes: 'cdp_classes',          // tableau de classes (toutes, filtrées par ownerEmail)
  points: 'cdp_points_',           // + classId -> historique des points
  picker: 'cdp_picker_',           // + classId -> état du tirage au sort
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
