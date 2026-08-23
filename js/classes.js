// classes.js — gestion des classes, des élèves, et des catégories de points, via Supabase.
// Les lectures (all/forCurrentUser/get) restent SYNCHRONES en lisant un cache mémoire tenu
// à jour par refresh()/les mutations, pour ne pas casser tous les endroits du code (picker.js,
// dojo.js, main.js...) qui font `Classes.get(id).eleves` de façon synchrone. Toute mutation
// (create/update/addStudent/...) est ASYNCHRONE (appel réseau) et met à jour le cache ensuite.
const Classes = (function () {
  const AVATAR_COLORS = ['#4f8ef7','#f76c5e','#f7b32b','#57c785','#a259d9','#e94f9c','#2ec4b6','#ff9f1c','#5aa9e6','#c1121f'];

  let cache = []; // liste des classes du prof connecté, avec .eleves et .categories embarqués

  function all() { return cache; }
  function forCurrentUser() { return cache; } // déjà filtré par RLS + refresh() côté serveur
  function get(classId) { return cache.find(c => c.id === classId) || null; }

  function mapClassRow(row, students, categories) {
    return {
      id: row.id,
      owner: Auth.getSessionEmail(),
      nom: row.nom,
      createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
      eleves: (students || []).filter(s => s.class_id === row.id).map(mapStudentRow),
      categories: (categories || []).filter(c => c.class_id === row.id).map(mapCategoryRow),
    };
  }
  function mapStudentRow(row) {
    return {
      id: row.id, nom: row.nom, sexe: row.sexe, couleur: row.couleur, points: row.points || 0,
      avatarChar: row.avatar_char, avatarCharCol: row.avatar_char_col,
      avatarAcc: (row.avatar_acc === null || row.avatar_acc === undefined) ? null : row.avatar_acc,
      avatarAccCol: (row.avatar_acc_col === null || row.avatar_acc_col === undefined) ? null : row.avatar_acc_col,
    };
  }

  // Tire un avatar aléatoire : un personnage (6x6) obligatoire + un accessoire (6x6) optionnel.
  function randomAvatar() {
    const hasAcc = Math.random() < 0.6; // un peu plus d'élèves avec accessoire, pour un rendu vivant
    return {
      avatar_char: Math.floor(Math.random() * 6),
      avatar_char_col: Math.floor(Math.random() * 6),
      avatar_acc: hasAcc ? Math.floor(Math.random() * 6) : null,
      avatar_acc_col: hasAcc ? Math.floor(Math.random() * 6) : null,
    };
  }
  function mapCategoryRow(row) {
    return { id: row.id, nom: row.nom, points: row.points };
  }

  // Recharge tout le cache depuis Supabase (classes + élèves + catégories du prof connecté).
  async function refresh() {
    const userId = Auth.getUserId();
    if (!userId) { cache = []; return cache; }
    const { data: classRows, error: e1 } = await sb.from('classes').select('*').eq('owner_id', userId).order('created_at', { ascending: true });
    if (e1) throw new Error(friendlyError(e1));
    const classIds = (classRows || []).map(c => c.id);
    let studentRows = [], categoryRows = [];
    if (classIds.length) {
      const [sRes, cRes] = await Promise.all([
        sb.from('students').select('*').in('class_id', classIds).order('created_at', { ascending: true }),
        sb.from('points_categories').select('*').in('class_id', classIds).order('created_at', { ascending: true }),
      ]);
      if (sRes.error) throw new Error(friendlyError(sRes.error));
      if (cRes.error) throw new Error(friendlyError(cRes.error));
      studentRows = sRes.data || [];
      categoryRows = cRes.data || [];
    }
    cache = (classRows || []).map(row => mapClassRow(row, studentRows, categoryRows));
    return cache;
  }

  const DEFAULT_CATEGORIES = [
    { nom: 'Participation', points: 1 },
    { nom: 'Travail soigné', points: 1 },
    { nom: "Aide à un camarade", points: 2 },
    { nom: 'Bavardage', points: -1 },
    { nom: 'Devoirs non faits', points: -1 },
    { nom: 'Manque de respect', points: -2 },
  ];

  async function create(nom) {
    const userId = Auth.getUserId();
    if (!userId) throw new Error('Non connecté.');
    if (!nom || !nom.trim()) throw new Error('Le nom de la classe est obligatoire.');
    const { data: row, error } = await sb.from('classes').insert({ owner_id: userId, nom: nom.trim() }).select().single();
    if (error) throw new Error(friendlyError(error));
    const { error: catErr } = await sb.from('points_categories').insert(DEFAULT_CATEGORIES.map(c => ({ ...c, class_id: row.id })));
    if (catErr) throw new Error(friendlyError(catErr));
    await refresh();
    return get(row.id);
  }

  async function remove(classId) {
    const { error } = await sb.from('classes').delete().eq('id', classId);
    if (error) throw new Error(friendlyError(error));
    // nettoyage des données locales liées (outils restés en localStorage)
    localStorage.removeItem(Storage.DB_KEYS.picker + classId);
    localStorage.removeItem(Storage.DB_KEYS.quizHistory + classId);
    localStorage.removeItem(Storage.DB_KEYS.notes + classId);
    localStorage.removeItem(Storage.DB_KEYS.badges + classId);
    localStorage.removeItem(Storage.DB_KEYS.calendar + classId);
    localStorage.removeItem(Storage.DB_KEYS.seating + classId);
    await refresh();
  }

  async function update(classId, patch) {
    if (patch && patch.nom !== undefined) {
      const { error } = await sb.from('classes').update({ nom: patch.nom }).eq('id', classId);
      if (error) throw new Error(friendlyError(error));
    }
    await refresh();
    return get(classId);
  }

  async function addStudent(classId, nom, sexe) {
    const c = get(classId);
    if (!c) throw new Error('Classe introuvable.');
    if (!nom || !nom.trim()) throw new Error("Le nom de l'élève est obligatoire.");
    if (sexe !== 'F' && sexe !== 'M') throw new Error('Sexe invalide.');
    const couleur = AVATAR_COLORS[c.eleves.length % AVATAR_COLORS.length];
    const avatar = randomAvatar();
    const { data, error } = await sb.from('students').insert({ class_id: classId, nom: nom.trim(), sexe, couleur, points: 0, ...avatar }).select().single();
    if (error) throw new Error(friendlyError(error));
    await refresh();
    return mapStudentRow(data);
  }

  // Met à jour l'avatar (personnage + accessoire) d'un élève existant, choisi manuellement.
  async function setAvatar(classId, eleveId, avatarChar, avatarCharCol, avatarAcc, avatarAccCol) {
    const patch = {
      avatar_char: avatarChar, avatar_char_col: avatarCharCol,
      avatar_acc: (avatarAcc === null || avatarAcc === undefined) ? null : avatarAcc,
      avatar_acc_col: (avatarAccCol === null || avatarAccCol === undefined) ? null : avatarAccCol,
    };
    const { error } = await sb.from('students').update(patch).eq('id', eleveId);
    if (error) throw new Error(friendlyError(error));
    await refresh();
    return get(classId).eleves.find(e => e.id === eleveId);
  }

  async function removeStudent(classId, eleveId) {
    const { error } = await sb.from('students').delete().eq('id', eleveId);
    if (error) throw new Error(friendlyError(error));
    await refresh();
  }

  async function addCategory(classId, nom, points) {
    if (!nom || !nom.trim()) throw new Error('Nom de catégorie obligatoire.');
    const { error } = await sb.from('points_categories').insert({ class_id: classId, nom: nom.trim(), points: Number(points) || 1 });
    if (error) throw new Error(friendlyError(error));
    await refresh();
  }

  async function removeCategory(classId, catId) {
    const { error } = await sb.from('points_categories').delete().eq('id', catId);
    if (error) throw new Error(friendlyError(error));
    await refresh();
  }

  // Construit le HTML d'un avatar (personnage + accessoire superposé) pour un élève donné.
  // `size` en px (CSS), utilisé pour les différents contextes (carte élève, modale de points...).
  function avatarHtml(e, size) {
    const sz = size || 60;
    const hasChar = e && e.avatarChar !== null && e.avatarChar !== undefined
      && e.avatarCharCol !== null && e.avatarCharCol !== undefined;
    if (!hasChar) {
      // Repli sur l'ancien rendu (couleur + initiale) si l'élève n'a pas encore d'avatar assigné.
      const initiale = e && e.nom ? e.nom.slice(0, 1).toUpperCase() : '?';
      return `<div class="avatar-fallback" style="width:${sz}px;height:${sz}px;background:${e ? e.couleur : '#4f8ef7'}">${initiale}</div>`;
    }
    const charSrc = `assets/avatars/characters/char_${e.avatarCharCol}_${e.avatarChar}.png`;
    const hasAcc = e.avatarAcc !== null && e.avatarAcc !== undefined && e.avatarAccCol !== null && e.avatarAccCol !== undefined;
    const accSrc = hasAcc ? `assets/avatars/accessories/acc_${e.avatarAccCol}_${e.avatarAcc}.png` : '';
    return `
      <div class="avatar-combo" style="width:${sz}px;height:${sz}px;">
        <img class="avatar-layer avatar-layer-char" src="${charSrc}" alt="" draggable="false">
        ${hasAcc ? `<img class="avatar-layer avatar-layer-acc" src="${accSrc}" alt="" draggable="false">` : ''}
      </div>
    `;
  }

  return {
    all, forCurrentUser, get, refresh, create, remove, update, addStudent, removeStudent,
    addCategory, removeCategory, setAvatar, randomAvatar, avatarHtml, AVATAR_COLORS,
    AVATAR_GRID_SIZE: 6,
  };
})();
