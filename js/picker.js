// picker.js — sélecteur aléatoire alterné fille/garçon, sans remise, avec remise à zéro par sexe.
const Picker = (function () {
  function key(classId) { return Storage.DB_KEYS.picker + classId; }

  function getState(classId) {
    let st = Storage.readJSON(key(classId), null);
    if (!st) {
      st = { poolF: [], poolM: [], lastSexe: null, history: [] };
      Storage.writeJSON(key(classId), st);
    }
    return st;
  }

  function saveState(classId, st) { Storage.writeJSON(key(classId), st); }

  function refillPool(classId, sexe, st) {
    const c = Classes.get(classId);
    const ids = c.eleves.filter(e => e.sexe === sexe).map(e => e.id);
    if (sexe === 'F') st.poolF = ids.slice();
    else st.poolM = ids.slice();
  }

  // Tire le prochain élève en alternant strictement F puis M puis F...
  function draw(classId) {
    const c = Classes.get(classId);
    if (!c) throw new Error('Classe introuvable.');
    const filles = c.eleves.filter(e => e.sexe === 'F');
    const garcons = c.eleves.filter(e => e.sexe === 'M');
    if (filles.length === 0 && garcons.length === 0) {
      throw new Error("Cette classe n'a aucun élève.");
    }
    const st = getState(classId);

    // Détermine le sexe à tirer cette fois (alternance stricte)
    let sexeATirer;
    if (st.lastSexe === null) {
      // Premier tirage : commence par une fille si possible, sinon garçon
      sexeATirer = filles.length > 0 ? 'F' : 'M';
    } else {
      const autre = st.lastSexe === 'F' ? 'M' : 'F';
      const autreDispo = autre === 'F' ? filles.length > 0 : garcons.length > 0;
      sexeATirer = autreDispo ? autre : st.lastSexe;
    }

    if (sexeATirer === 'F' && filles.length === 0) sexeATirer = 'M';
    if (sexeATirer === 'M' && garcons.length === 0) sexeATirer = 'F';
    if ((sexeATirer === 'F' && filles.length === 0) || (sexeATirer === 'M' && garcons.length === 0)) {
      throw new Error("Impossible de tirer : pas d'élève disponible.");
    }

    // Nettoie le pool des élèves supprimés puis complète si vide
    const validIds = (sexeATirer === 'F' ? filles : garcons).map(e => e.id);
    let pool = sexeATirer === 'F' ? st.poolF : st.poolM;
    pool = pool.filter(id => validIds.includes(id));
    let poolWasReset = false;
    if (pool.length === 0) {
      pool = validIds.slice();
      poolWasReset = true;
    }

    const idx = Math.floor(Math.random() * pool.length);
    const eleveId = pool[idx];
    pool.splice(idx, 1);

    if (sexeATirer === 'F') st.poolF = pool; else st.poolM = pool;
    st.lastSexe = sexeATirer;
    const eleve = c.eleves.find(e => e.id === eleveId);
    st.history.unshift({ eleveId, eleveNom: eleve.nom, sexe: sexeATirer, date: Date.now(), poolWasReset });
    st.history = st.history.slice(0, 300);
    saveState(classId, st);

    return { eleve, poolWasReset, restantsMemeSexe: (sexeATirer === 'F' ? st.poolF.length : st.poolM.length) };
  }

  function resetAll(classId) {
    saveState(classId, { poolF: [], poolM: [], lastSexe: null, history: [] });
  }

  function getHistory(classId) { return getState(classId).history; }

  return { draw, resetAll, getHistory, getState };
})();
