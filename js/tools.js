// tools.js — fonctionnalités complémentaires : minuteur, groupes aléatoires, notes rapides,
// badges, calendrier de classe, plan de classe.
const Tools = (function () {
  // ---- Minuteur ----
  let timerInterval = null;
  function startTimer(seconds, onTick, onDone) {
    stopTimer();
    let remaining = seconds;
    onTick(remaining);
    timerInterval = setInterval(() => {
      remaining--;
      onTick(remaining);
      if (remaining <= 0) { stopTimer(); onDone && onDone(); }
    }, 1000);
  }
  function stopTimer() { if (timerInterval) { clearInterval(timerInterval); timerInterval = null; } }

  // ---- Groupes aléatoires ----
  // Répartit une liste d'élèves en `nbGroupes` groupes, en tournant (round-robin) sur une
  // liste mélangée aléatoirement.
  function distribute(list, nbGroupes) {
    const shuffled = shuffle(list);
    const groups = Array.from({ length: nbGroupes }, () => []);
    shuffled.forEach((e, i) => { groups[i % nbGroupes].push(e); });
    return groups;
  }

  // mode: 'mixte' (filles + garçons mélangés dans chaque groupe, réparti équitablement)
  //    ou 'non-mixte' (groupes 100% filles séparés des groupes 100% garçons)
  // nbGroupes est utilisé tel quel pour le mode mixte ; pour le mode non-mixte, nbGroupes
  // représente le nombre de groupes PAR SEXE (ex: 2 filles + 2 garçons si les deux sexes sont
  // présents).
  function makeGroups(eleves, nbGroupes, mode) {
    mode = mode === 'non-mixte' ? 'non-mixte' : 'mixte';
    nbGroupes = Math.max(1, Math.floor(nbGroupes) || 1);
    const filles = eleves.filter(e => e.sexe === 'F');
    const garcons = eleves.filter(e => e.sexe === 'M');

    if (mode === 'mixte') {
      const n = Math.max(1, Math.min(nbGroupes, eleves.length || 1));
      const groups = Array.from({ length: n }, () => []);
      const shuffledF = shuffle(filles);
      const shuffledM = shuffle(garcons);
      let mixed = [];
      let fi = 0, mi = 0;
      while (fi < shuffledF.length || mi < shuffledM.length) {
        if (fi < shuffledF.length) mixed.push(shuffledF[fi++]);
        if (mi < shuffledM.length) mixed.push(shuffledM[mi++]);
      }
      mixed.forEach((e, i) => { groups[i % n].push(e); });
      return { groupesFilles: [], groupesGarcons: [], groupesMixtes: groups };
    }

    // mode non-mixte : un lot de groupes pour les filles, un lot pour les garçons
    const groupesFilles = filles.length ? distribute(filles, Math.max(1, Math.min(nbGroupes, filles.length))) : [];
    const groupesGarcons = garcons.length ? distribute(garcons, Math.max(1, Math.min(nbGroupes, garcons.length))) : [];
    return { groupesFilles, groupesGarcons, groupesMixtes: [] };
  }

  // Calcule le nombre de groupes à partir soit d'un nombre de groupes souhaité, soit d'une
  // taille de groupe souhaitée. Retourne { nbGroupes, error } — error est un message lisible
  // si la configuration est impossible (classe vide, pas assez d'élèves, etc.).
  function computeNbGroupes(count, byMode, eleves, mode) {
    count = parseInt(count, 10);
    if (!count || count < 1) return { error: 'Merci d’indiquer un nombre valide (au moins 1).' };
    if (mode === 'non-mixte') {
      const filles = eleves.filter(e => e.sexe === 'F').length;
      const garcons = eleves.filter(e => e.sexe === 'M').length;
      if (filles === 0 && garcons === 0) return { error: 'Cette classe n’a aucun élève.' };
      let nbGroupes;
      if (byMode === 'taille') {
        // taille souhaitée par groupe : on prend le sexe le plus nombreux pour dimensionner
        const maxSexe = Math.max(filles, garcons);
        nbGroupes = Math.max(1, Math.ceil(maxSexe / count));
      } else {
        nbGroupes = count;
        if (filles > 0 && filles < nbGroupes) return { error: `Il n’y a que ${filles} fille(s) pour ${nbGroupes} groupes non-mixtes demandés côté filles.` };
        if (garcons > 0 && garcons < nbGroupes) return { error: `Il n’y a que ${garcons} garçon(s) pour ${nbGroupes} groupes non-mixtes demandés côté garçons.` };
      }
      return { nbGroupes };
    } else {
      const total = eleves.length;
      if (total === 0) return { error: 'Cette classe n’a aucun élève.' };
      let nbGroupes;
      if (byMode === 'taille') {
        nbGroupes = Math.max(1, Math.ceil(total / count));
      } else {
        nbGroupes = count;
        if (total < nbGroupes) return { error: `Il n’y a que ${total} élève(s) dans la classe pour ${nbGroupes} groupes demandés.` };
      }
      return { nbGroupes };
    }
  }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ---- Notes rapides par élève ----
  function notesKey(classId) { return Storage.DB_KEYS.notes + classId; }
  function getNotes(classId) { return Storage.readJSON(notesKey(classId), {}); }
  function addNote(classId, eleveId, texte) {
    const notes = getNotes(classId);
    if (!notes[eleveId]) notes[eleveId] = [];
    notes[eleveId].unshift({ texte, date: Date.now() });
    Storage.writeJSON(notesKey(classId), notes);
  }
  function deleteNote(classId, eleveId, index) {
    const notes = getNotes(classId);
    if (notes[eleveId]) { notes[eleveId].splice(index, 1); Storage.writeJSON(notesKey(classId), notes); }
  }

  // ---- Badges débloquables ----
  const BADGE_DEFS = [
    { id: 'b10', label: '10 points', seuil: 10, emoji: '<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="15" r="6"/><path d="M9 10 6 3M15 10l3-7"/></svg>' },
    { id: 'b25', label: '25 points', seuil: 25, emoji: '<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="15" r="6"/><path d="M9 10 6 3M15 10l3-7"/><path d="M9.5 15.5l1.7 1.7 3.3-3.3"/></svg>' },
    { id: 'b50', label: '50 points', seuil: 50, emoji: '<svg class="icon" viewBox="0 0 24 24"><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.9-6.2-3.3-6.2 3.3 1.2-6.9-5-4.9 6.9-1L12 2Z"/></svg>' },
    { id: 'b100', label: '100 points', seuil: 100, emoji: '<svg class="icon" viewBox="0 0 24 24"><path d="M8 4h8v6a4 4 0 0 1-8 0Z"/><path d="M8 5H4v2a4 4 0 0 0 4 3.6M16 5h4v2a4 4 0 0 1-4 3.6"/><path d="M12 14v3M9 21h6M10 17.5h4"/></svg>' },
  ];
  function badgesKey(classId) { return Storage.DB_KEYS.badges + classId; }
  function getBadges(classId) { return Storage.readJSON(badgesKey(classId), {}); }
  function computeBadges(classId) {
    const c = Classes.get(classId);
    if (!c) return {};
    const badges = getBadges(classId);
    c.eleves.forEach(e => {
      if (!badges[e.id]) badges[e.id] = [];
      BADGE_DEFS.forEach(def => {
        if ((e.points || 0) >= def.seuil && !badges[e.id].includes(def.id)) {
          badges[e.id].push(def.id);
        }
      });
    });
    Storage.writeJSON(badgesKey(classId), badges);
    return badges;
  }

  // ---- Calendrier de classe ----
  function calKey(classId) { return Storage.DB_KEYS.calendar + classId; }
  function getEvents(classId) { return Storage.readJSON(calKey(classId), []); }
  function addEvent(classId, titre, date) {
    const events = getEvents(classId);
    events.push({ id: 'ev_' + Date.now(), titre, date });
    events.sort((a, b) => a.date.localeCompare(b.date));
    Storage.writeJSON(calKey(classId), events);
  }
  function removeEvent(classId, id) {
    Storage.writeJSON(calKey(classId), getEvents(classId).filter(e => e.id !== id));
  }

  // ---- Plan de classe ----
  function seatingKey(classId) { return Storage.DB_KEYS.seating + classId; }
  function getSeating(classId) { return Storage.readJSON(seatingKey(classId), null); }
  function saveSeating(classId, plan) { Storage.writeJSON(seatingKey(classId), plan); }
  function generateSeating(classId, rows, cols) {
    const c = Classes.get(classId);
    const shuffled = shuffle(c.eleves);
    const plan = { rows, cols, cells: Array.from({ length: rows * cols }, () => null) };
    shuffled.forEach((e, i) => { if (i < plan.cells.length) plan.cells[i] = e.id; });
    saveSeating(classId, plan);
    return plan;
  }

  return {
    startTimer, stopTimer, makeGroups, computeNbGroupes, shuffle,
    getNotes, addNote, deleteNote,
    BADGE_DEFS, getBadges, computeBadges,
    getEvents, addEvent, removeEvent,
    getSeating, saveSeating, generateSeating,
  };
})();
