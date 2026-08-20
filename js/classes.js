// classes.js — gestion des classes, des élèves, et des catégories de points.
const Classes = (function () {
  const AVATAR_COLORS = ['#4f8ef7','#f76c5e','#f7b32b','#57c785','#a259d9','#e94f9c','#2ec4b6','#ff9f1c','#5aa9e6','#c1121f'];

  function all() { return Storage.readJSON(Storage.DB_KEYS.classes, []); }
  function saveAll(list) { return Storage.writeJSON(Storage.DB_KEYS.classes, list); }

  function forCurrentUser() {
    const email = Auth.getSessionEmail();
    return all().filter(c => c.owner === email);
  }

  function get(classId) { return all().find(c => c.id === classId) || null; }

  function create(nom) {
    const email = Auth.getSessionEmail();
    if (!email) throw new Error('Non connecté.');
    if (!nom || !nom.trim()) throw new Error('Le nom de la classe est obligatoire.');
    const list = all();
    const c = {
      id: 'c_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      owner: email,
      nom: nom.trim(),
      eleves: [],
      categories: [
        { id: 'cat_part', nom: 'Participation', points: 1 },
        { id: 'cat_soin', nom: 'Travail soigné', points: 1 },
        { id: 'cat_aide', nom: "Aide à un camarade", points: 2 },
        { id: 'cat_bavard', nom: 'Bavardage', points: -1 },
        { id: 'cat_devoir', nom: 'Devoirs non faits', points: -1 },
        { id: 'cat_irrespect', nom: 'Manque de respect', points: -2 },
      ],
      createdAt: Date.now(),
    };
    list.push(c);
    saveAll(list);
    return c;
  }

  function remove(classId) {
    const list = all().filter(c => c.id !== classId);
    saveAll(list);
    // nettoyage des données liées
    localStorage.removeItem(Storage.DB_KEYS.points + classId);
    localStorage.removeItem(Storage.DB_KEYS.picker + classId);
    localStorage.removeItem(Storage.DB_KEYS.quizHistory + classId);
    localStorage.removeItem(Storage.DB_KEYS.notes + classId);
    localStorage.removeItem(Storage.DB_KEYS.badges + classId);
    localStorage.removeItem(Storage.DB_KEYS.calendar + classId);
    localStorage.removeItem(Storage.DB_KEYS.seating + classId);
  }

  function update(classId, patch) {
    const list = all();
    const idx = list.findIndex(c => c.id === classId);
    if (idx === -1) return null;
    list[idx] = Object.assign({}, list[idx], patch);
    saveAll(list);
    return list[idx];
  }

  function addStudent(classId, nom, sexe) {
    const c = get(classId);
    if (!c) throw new Error('Classe introuvable.');
    if (!nom || !nom.trim()) throw new Error("Le nom de l'élève est obligatoire.");
    if (sexe !== 'F' && sexe !== 'M') throw new Error('Sexe invalide.');
    const eleve = {
      id: 'e_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      nom: nom.trim(), sexe,
      couleur: AVATAR_COLORS[c.eleves.length % AVATAR_COLORS.length],
      points: 0,
    };
    c.eleves.push(eleve);
    update(classId, { eleves: c.eleves });
    return eleve;
  }

  function removeStudent(classId, eleveId) {
    const c = get(classId);
    if (!c) return;
    c.eleves = c.eleves.filter(e => e.id !== eleveId);
    update(classId, { eleves: c.eleves });
  }

  function addCategory(classId, nom, points) {
    const c = get(classId);
    if (!c) return;
    if (!nom || !nom.trim()) throw new Error('Nom de catégorie obligatoire.');
    c.categories.push({ id: 'cat_' + Date.now(), nom: nom.trim(), points: Number(points) || 1 });
    update(classId, { categories: c.categories });
  }

  function removeCategory(classId, catId) {
    const c = get(classId);
    if (!c) return;
    c.categories = c.categories.filter(cat => cat.id !== catId);
    update(classId, { categories: c.categories });
  }

  return { all, forCurrentUser, get, create, remove, update, addStudent, removeStudent, addCategory, removeCategory, AVATAR_COLORS };
})();
