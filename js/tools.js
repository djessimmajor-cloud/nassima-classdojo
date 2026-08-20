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

  // ---- Groupes aléatoires équilibrés (mixité filles/garçons si possible) ----
  function makeGroups(eleves, nbGroupes) {
    nbGroupes = Math.max(1, Math.min(nbGroupes, eleves.length || 1));
    const filles = shuffle(eleves.filter(e => e.sexe === 'F'));
    const garcons = shuffle(eleves.filter(e => e.sexe === 'M'));
    const groups = Array.from({ length: nbGroupes }, () => []);
    let gi = 0;
    filles.concat(garcons).forEach(() => {}); // no-op keep structure clear
    let mixed = [];
    // alterne F/M pour répartir équitablement
    let fi = 0, mi = 0;
    while (fi < filles.length || mi < garcons.length) {
      if (fi < filles.length) mixed.push(filles[fi++]);
      if (mi < garcons.length) mixed.push(garcons[mi++]);
    }
    mixed.forEach((e) => { groups[gi % nbGroupes].push(e); gi++; });
    return groups;
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
    startTimer, stopTimer, makeGroups, shuffle,
    getNotes, addNote, deleteNote,
    BADGE_DEFS, getBadges, computeBadges,
    getEvents, addEvent, removeEvent,
    getSeating, saveSeating, generateSeating,
  };
})();
