// main.js — orchestration de l'interface : navigation, rendu des vues, événements.
(function () {
  let currentClassId = null;

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    wireAuthScreen();
    wireSidebar();
    wireModalClose();

    const user = Auth.getCurrentUser();
    if (user) showApp(); else showAuth();
  }

  // ================= AUTH =================
  function wireAuthScreen() {
    const tabLogin = document.getElementById('tabLogin');
    const tabRegister = document.getElementById('tabRegister');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    tabLogin.addEventListener('click', () => {
      tabLogin.classList.add('active'); tabRegister.classList.remove('active');
      loginForm.style.display = 'block'; registerForm.style.display = 'none';
    });
    tabRegister.addEventListener('click', () => {
      tabRegister.classList.add('active'); tabLogin.classList.remove('active');
      registerForm.style.display = 'block'; loginForm.style.display = 'none';
    });

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = document.getElementById('loginError');
      err.textContent = '';
      try {
        await Auth.login(document.getElementById('loginEmail').value, document.getElementById('loginPass').value);
        showApp();
      } catch (ex) { err.textContent = ex.message; }
    });

    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = document.getElementById('registerError');
      err.textContent = '';
      try {
        await Auth.register(document.getElementById('regNom').value, document.getElementById('regEmail').value, document.getElementById('regPass').value);
        showApp();
      } catch (ex) { err.textContent = ex.message; }
    });
  }

  function showAuth() {
    document.getElementById('authScreen').style.display = 'flex';
    document.getElementById('appScreen').style.display = 'none';
    Theme.apply('normal', false);
  }

  function showApp() {
    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('appScreen').style.display = 'grid';
    Theme.applyFromUser();
    const user = Auth.getCurrentUser();
    document.getElementById('userNameDisplay').innerHTML = '<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/></svg> ' + escapeHtml(user.nom);
    const themeSel = document.getElementById('themeSelect');
    const darkToggle = document.getElementById('darkModeToggle');
    themeSel.value = user.settings.theme || 'normal';
    darkToggle.checked = !!user.settings.darkMode;
    document.getElementById('groqKeyInput').value = user.settings.groqApiKey || Lesson.DEFAULT_API_KEY;

    switchView('viewClasses');
    renderClasses();
  }

  document.getElementById('logoutBtn') && document.getElementById('logoutBtn').addEventListener('click', () => {
    Auth.logout(); currentClassId = null; showAuth();
  });

  // ================= NAVIGATION =================
  function wireSidebar() {
    document.querySelectorAll('.sidebar .nav-item').forEach(item => {
      item.addEventListener('click', () => {
        switchView(item.dataset.view);
      });
    });
    document.getElementById('logoutBtn').addEventListener('click', () => { Auth.logout(); currentClassId = null; showAuth(); });
  }

  function switchView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.sidebar .nav-item').forEach(n => n.classList.remove('active'));
    const el = document.getElementById(viewId);
    if (el) el.classList.add('active');
    const nav = document.querySelector(`.sidebar .nav-item[data-view="${viewId}"]`);
    if (nav) nav.classList.add('active');

    if (viewId === 'viewClasses') renderClasses();
    if (viewId === 'viewDashboard') renderDashboard();
    if (viewId === 'viewDojo') renderDojo();
    if (viewId === 'viewPicker') renderPicker();
    if (viewId === 'viewTools') renderTools('timer');
    if (viewId === 'viewQuiz') renderQuizList();
    if (viewId === 'viewVerbs') renderVerbs('list');
    if (viewId === 'viewTwisters') renderTwisters('list');
  }

  function requireClass() {
    if (!currentClassId || !Classes.get(currentClassId)) {
      alert('Veuillez sélectionner une classe dans "Mes classes" avant d’utiliser cette section.');
      switchView('viewClasses');
      return null;
    }
    return Classes.get(currentClassId);
  }

  // ================= MODALE GÉNÉRIQUE =================
  function openModal(html) {
    const root = document.getElementById('modalRoot');
    root.innerHTML = `<div class="modal-overlay" id="modalOverlay"><div class="modal-box">${html}</div></div>`;
  }
  function closeModal() { document.getElementById('modalRoot').innerHTML = ''; }
  function wireModalClose() {
    document.getElementById('modalRoot').addEventListener('click', (e) => {
      if (e.target.id === 'modalOverlay') closeModal();
    });
  }

  // ================= MES CLASSES =================
  function renderClasses() {
    const grid = document.getElementById('classGrid');
    const list = Classes.forCurrentUser();
    if (list.length === 0) {
      grid.innerHTML = '<p class="hint">Aucune classe pour le moment. Cliquez sur "+ Nouvelle classe" pour commencer.</p>';
    } else {
      grid.innerHTML = list.map(c => `
        <div class="card class-card" data-id="${c.id}">
          <h3>${escapeHtml(c.nom)}</h3>
          <p class="hint">${c.eleves.length} élève(s)${currentClassId === c.id ? ' · <strong>classe active</strong>' : ''}</p>
          <div style="display:flex; gap:6px; margin-top:8px;">
            <button class="btn btn-sm btn-primary selectClassBtn" data-id="${c.id}">Sélectionner</button>
            <button class="btn btn-sm btn-danger deleteClassBtn" data-id="${c.id}">Supprimer</button>
          </div>
        </div>`).join('');
    }
    grid.querySelectorAll('.selectClassBtn').forEach(b => b.addEventListener('click', () => {
      currentClassId = b.dataset.id;
      renderClasses();
      switchView('viewDashboard');
    }));
    grid.querySelectorAll('.deleteClassBtn').forEach(b => b.addEventListener('click', () => {
      if (confirm('Supprimer définitivement cette classe et toutes ses données ?')) {
        Classes.remove(b.dataset.id);
        if (currentClassId === b.dataset.id) currentClassId = null;
        renderClasses();
      }
    }));
  }

  document.getElementById('btnNewClass').addEventListener('click', () => {
    openModal(`
      <h3>Nouvelle classe</h3>
      <label>Nom de la classe <input type="text" id="newClassName" placeholder="ex: 5eB"></label>
      <button class="btn btn-primary" id="confirmNewClass" style="margin-top:12px;">Créer</button>
    `);
    document.getElementById('confirmNewClass').addEventListener('click', () => {
      try {
        const c = Classes.create(document.getElementById('newClassName').value);
        currentClassId = c.id;
        closeModal();
        renderClasses();
      } catch (ex) { alert(ex.message); }
    });
  });

  // ================= TABLEAU DE BORD =================
  function renderDashboard() {
    const c = requireClass(); if (!c) return;
    document.getElementById('dashClassLabel').textContent = c.nom;
    const cont = document.getElementById('dashboardContent');
    if (c.eleves.length === 0) {
      cont.innerHTML = '<p class="hint">Cette classe n’a pas encore d’élèves. Ajoutez-en depuis "Points".</p>';
      return;
    }
    const sorted = c.eleves.slice().sort((a, b) => (b.points || 0) - (a.points || 0));
    const top = sorted[0];
    const totalPts = c.eleves.reduce((s, e) => s + (e.points || 0), 0);
    const pickHist = Picker.getHistory(c.id);
    const dernierTirage = pickHist[0];
    const scores = Quiz.getScores(c.id);

    cont.innerHTML = `
      <div class="grid-cards">
        <div class="card"><h3><svg class="icon" viewBox="0 0 24 24"><path d="m3 18 1.5-9L9 13l3-7 3 7 4.5-4L21 18Z"/><path d="M5 21h14"/></svg> Meilleur score</h3><p style="font-size:1.6rem;font-weight:800;">${escapeHtml(top.nom)}</p><p class="hint">${top.points || 0} points</p></div>
        <div class="card"><h3><svg class="icon" viewBox="0 0 24 24"><path d="M3 17 9 11l4 4 8-8"/><path d="M15 7h6v6"/></svg> Total classe</h3><p style="font-size:1.6rem;font-weight:800;">${totalPts} pts</p><p class="hint">${c.eleves.length} élèves</p></div>
        <div class="card"><h3><svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/></svg> Dernier tirage</h3><p style="font-size:1.3rem;font-weight:800;">${dernierTirage ? escapeHtml(dernierTirage.eleveNom) : '—'}</p><p class="hint">${dernierTirage ? new Date(dernierTirage.date).toLocaleString('fr-FR') : 'Aucun tirage encore'}</p></div>
        <div class="card"><h3><svg class="icon" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10Z"/><path d="M8 9h8M8 13h5"/></svg> Quiz joués</h3><p style="font-size:1.6rem;font-weight:800;">${scores.length}</p><p class="hint">${scores[0] ? escapeHtml(scores[0].titre) : 'Aucun quiz encore'}</p></div>
      </div>
      <h3 style="margin-top:22px;">Classement</h3>
      <table><thead><tr><th>#</th><th>Élève</th><th>Sexe</th><th>Points</th></tr></thead>
      <tbody>${sorted.map((e, i) => `<tr><td>${i + 1}</td><td>${escapeHtml(e.nom)}</td><td><span class="pill ${e.sexe === 'F' ? 'pill-f' : 'pill-m'}">${e.sexe === 'F' ? 'Fille' : 'Garçon'}</span></td><td>${e.points || 0}</td></tr>`).join('')}</tbody></table>
    `;
  }

  // ================= POINTS (DOJO) =================
  function renderDojo() {
    const c = requireClass(); if (!c) return;
    const grid = document.getElementById('studentGrid');
    const emptyMsg = document.getElementById('dojoEmptyMsg');
    emptyMsg.style.display = c.eleves.length === 0 ? 'block' : 'none';

    grid.innerHTML = c.eleves.map(e => `
      <div class="student-card">
        <div class="avatar" style="background:${e.couleur}">${escapeHtml(e.nom.slice(0, 1).toUpperCase())}</div>
        <div><strong>${escapeHtml(e.nom)}</strong> <span class="pill ${e.sexe === 'F' ? 'pill-f' : 'pill-m'}">${e.sexe === 'F' ? 'F' : 'G'}</span></div>
        <div class="student-points">${e.points || 0}</div>
        <div class="point-buttons">
          ${c.categories.map(cat => `<button class="catBtn" data-eleve="${e.id}" data-cat="${cat.id}" data-pts="${cat.points}" title="${escapeHtml(cat.nom)}">${cat.points > 0 ? '+' : ''}${cat.points} ${escapeHtml(cat.nom)}</button>`).join('')}
        </div>
        <button class="btn btn-sm btn-danger" style="margin-top:8px;" data-remove="${e.id}">Retirer l'élève</button>
      </div>
    `).join('');

    grid.querySelectorAll('.catBtn').forEach(b => b.addEventListener('click', () => {
      const cat = c.categories.find(x => x.id === b.dataset.cat);
      Dojo.addPoints(c.id, b.dataset.eleve, cat.nom, cat.points);
      renderDojo();
    }));
    grid.querySelectorAll('[data-remove]').forEach(b => b.addEventListener('click', () => {
      if (confirm('Retirer cet élève de la classe ?')) { Classes.removeStudent(c.id, b.dataset.remove); renderDojo(); }
    }));

    const hist = Dojo.getHistory(c.id).slice(0, 60);
    document.querySelector('#dojoHistoryTable tbody').innerHTML = hist.map(h => `
      <tr><td>${new Date(h.date).toLocaleString('fr-FR')}</td><td>${escapeHtml(h.eleveNom)}</td><td>${escapeHtml(h.categorie)}</td><td>${h.points > 0 ? '+' : ''}${h.points}</td></tr>
    `).join('') || '<tr><td colspan="4" class="hint">Aucun historique.</td></tr>';
  }

  document.getElementById('btnAddStudent').addEventListener('click', () => {
    const c = requireClass(); if (!c) return;
    openModal(`
      <h3>Ajouter un élève</h3>
      <label>Nom <input type="text" id="newStudentName"></label>
      <label>Sexe
        <select id="newStudentSexe"><option value="F">Fille</option><option value="M">Garçon</option></select>
      </label>
      <button class="btn btn-primary" id="confirmAddStudent" style="margin-top:12px;">Ajouter</button>
    `);
    document.getElementById('confirmAddStudent').addEventListener('click', () => {
      try {
        Classes.addStudent(c.id, document.getElementById('newStudentName').value, document.getElementById('newStudentSexe').value);
        closeModal(); renderDojo();
      } catch (ex) { alert(ex.message); }
    });
  });

  document.getElementById('btnManageCats').addEventListener('click', () => {
    const c = requireClass(); if (!c) return;
    renderCatsModal(c);
  });
  function renderCatsModal(c) {
    openModal(`
      <h3>Catégories de points</h3>
      <div id="catList">${c.categories.map(cat => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid var(--border);">
          <span>${escapeHtml(cat.nom)} (${cat.points > 0 ? '+' : ''}${cat.points})</span>
          <button class="btn btn-sm btn-danger" data-catdel="${cat.id}"><svg class="icon" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
        </div>`).join('')}</div>
      <h4 style="margin-top:14px;">Ajouter une catégorie</h4>
      <label>Nom <input type="text" id="newCatName"></label>
      <label>Points (positif ou négatif) <input type="number" id="newCatPts" value="1"></label>
      <button class="btn btn-primary" id="confirmAddCat" style="margin-top:10px;">Ajouter</button>
    `);
    document.querySelectorAll('[data-catdel]').forEach(b => b.addEventListener('click', () => {
      Classes.removeCategory(c.id, b.dataset.catdel);
      renderCatsModal(Classes.get(c.id));
    }));
    document.getElementById('confirmAddCat').addEventListener('click', () => {
      try {
        Classes.addCategory(c.id, document.getElementById('newCatName').value, document.getElementById('newCatPts').value);
        renderCatsModal(Classes.get(c.id));
      } catch (ex) { alert(ex.message); }
    });
  }

  document.getElementById('btnResetPoints').addEventListener('click', () => {
    const c = requireClass(); if (!c) return;
    if (confirm('Remettre tous les points à zéro et effacer l’historique de cette classe ?')) { Dojo.resetPoints(c.id); renderDojo(); }
  });

  document.getElementById('btnExportCsv').addEventListener('click', () => {
    const c = requireClass(); if (!c) return;
    const csv = Dojo.exportCSV(c.id);
    downloadFile(`points_${c.nom}.csv`, csv, 'text/csv;charset=utf-8;');
  });

  // ================= SÉLECTEUR ALÉATOIRE =================
  function renderPicker() {
    const c = requireClass(); if (!c) return;
    document.getElementById('pickerName').textContent = '—';
    document.getElementById('pickerMeta').textContent = '';
    renderPickerHistory(c.id);
  }
  function renderPickerHistory(classId) {
    const hist = Picker.getHistory(classId);
    document.querySelector('#pickerHistoryTable tbody').innerHTML = hist.map(h => `
      <tr><td>${escapeHtml(h.eleveNom)}</td><td><span class="pill ${h.sexe === 'F' ? 'pill-f' : 'pill-m'}">${h.sexe === 'F' ? 'Fille' : 'Garçon'}</span></td><td>${new Date(h.date).toLocaleTimeString('fr-FR')}</td></tr>
    `).join('') || '<tr><td colspan="3" class="hint">Aucun tirage.</td></tr>';
  }
  document.getElementById('btnDraw').addEventListener('click', () => {
    const c = requireClass(); if (!c) return;
    try {
      const res = Picker.draw(c.id);
      document.getElementById('pickerAnim').textContent = res.eleve.sexe === 'F' ? `<svg class="icon-lg" viewBox="0 0 24 24" style="fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;"><circle cx="12" cy="7" r="4"/><path d="M8 9c-2 3-2 6-1 9h10c1-3 1-6-1-9"/><path d="M9 18v3M15 18v3"/></svg>` : `<svg class="icon-lg" viewBox="0 0 24 24" style="fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;"><circle cx="12" cy="7" r="4"/><path d="M6 21v-5a6 6 0 0 1 12 0v5"/></svg>`;
      document.getElementById('pickerName').textContent = res.eleve.nom;
      document.getElementById('pickerMeta').textContent = res.poolWasReset ? 'Nouveau cycle démarré pour ce sexe.' : `Encore ${res.restantsMemeSexe} élève(s) de ce sexe dans le cycle actuel.`;
      renderPickerHistory(c.id);
    } catch (ex) { alert(ex.message); }
  });
  document.getElementById('btnResetPicker').addEventListener('click', () => {
    const c = requireClass(); if (!c) return;
    if (confirm('Réinitialiser complètement le tirage aléatoire de cette classe ?')) { Picker.resetAll(c.id); renderPicker(); }
  });

  // ================= OUTILS =================
  document.querySelectorAll('.toolTab').forEach(t => t.addEventListener('click', () => {
    document.querySelectorAll('.toolTab').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    renderTools(t.dataset.tool);
  }));

  function renderTools(tool) {
    const cont = document.getElementById('toolContent');
    if (tool === 'timer') return renderTimer(cont);
    const c = requireClass();
    if (!c) { cont.innerHTML = ''; return; }
    if (tool === 'groups') return renderGroups(cont, c);
    if (tool === 'seating') return renderSeating(cont, c);
    if (tool === 'calendar') return renderCalendar(cont, c);
    if (tool === 'notes') return renderNotes(cont, c);
    if (tool === 'badges') return renderBadgesTool(cont, c);
  }

  function renderTimer(cont) {
    cont.innerHTML = `
      <h3>⏱️ Minuteur de classe</h3>
      <label>Durée (minutes) <input type="number" id="timerMinutes" value="5" min="1"></label>
      <button class="btn btn-primary" id="btnStartTimer" style="margin-top:10px;">Démarrer</button>
      <button class="btn" id="btnStopTimer">Arrêter</button>
      <div style="font-size:3rem; font-weight:900; text-align:center; margin-top:20px;" id="timerDisplay">--:--</div>
    `;
    document.getElementById('btnStartTimer').addEventListener('click', () => {
      const min = parseInt(document.getElementById('timerMinutes').value, 10) || 1;
      Tools.startTimer(min * 60, (r) => {
        const m = Math.floor(r / 60), s = r % 60;
        document.getElementById('timerDisplay').textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      }, () => { document.getElementById('timerDisplay').textContent = "⏰ Terminé !"; try { new AudioContext(); } catch (e) {} alert('Le temps est écoulé !'); });
    });
    document.getElementById('btnStopTimer').addEventListener('click', Tools.stopTimer);
  }

  function renderGroups(cont, c) {
    cont.innerHTML = `
      <h3><svg class="icon" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.2"/><path d="M2.5 20c0-3.3 2.9-5.5 6.5-5.5s6.5 2.2 6.5 5.5"/><circle cx="17.5" cy="8.5" r="2.6"/><path d="M15.8 14.7c2.9.4 5.2 2.3 5.2 5.3"/></svg> Groupes aléatoires équilibrés</h3>
      <label>Nombre de groupes <input type="number" id="nbGroupes" value="4" min="1"></label>
      <button class="btn btn-primary" id="btnMakeGroups" style="margin-top:10px;">Générer</button>
      <div id="groupsResult" style="margin-top:16px;"></div>
    `;
    document.getElementById('btnMakeGroups').addEventListener('click', () => {
      if (c.eleves.length === 0) { alert('Cette classe n’a pas d’élèves.'); return; }
      const n = parseInt(document.getElementById('nbGroupes').value, 10) || 1;
      const groups = Tools.makeGroups(c.eleves, n);
      document.getElementById('groupsResult').innerHTML = `<div class="grid-cards">${groups.map((g, i) => `
        <div class="card"><h4>Groupe ${i + 1}</h4>${g.map(e => `<p>${escapeHtml(e.nom)}</p>`).join('') || '<p class="hint">Vide</p>'}</div>`).join('')}</div>`;
    });
  }

  function renderSeating(cont, c) {
    const plan = Tools.getSeating(c.id);
    cont.innerHTML = `
      <h3><svg class="icon" viewBox="0 0 24 24"><path d="M6 4h12v9H6Z"/><path d="M6 13v7M18 13v7M6 8h12"/></svg> Plan de classe</h3>
      <label>Rangées <input type="number" id="seatRows" value="${plan ? plan.rows : 4}" min="1"></label>
      <label>Colonnes <input type="number" id="seatCols" value="${plan ? plan.cols : 5}" min="1"></label>
      <button class="btn btn-primary" id="btnGenSeating" style="margin-top:10px;">Générer un plan aléatoire</button>
      <div id="seatingResult" style="margin-top:16px;"></div>
    `;
    function draw(p) {
      if (!p) { document.getElementById('seatingResult').innerHTML = ''; return; }
      document.getElementById('seatingResult').innerHTML = `<div class="seating-grid" style="grid-template-columns:repeat(${p.cols}, 1fr);">
        ${p.cells.map(id => { const e = id ? c.eleves.find(x => x.id === id) : null; return `<div class="seat ${!e ? 'empty' : ''}">${e ? escapeHtml(e.nom) : '—'}</div>`; }).join('')}
      </div>`;
    }
    draw(plan);
    document.getElementById('btnGenSeating').addEventListener('click', () => {
      if (c.eleves.length === 0) { alert('Cette classe n’a pas d’élèves.'); return; }
      const rows = parseInt(document.getElementById('seatRows').value, 10) || 1;
      const cols = parseInt(document.getElementById('seatCols').value, 10) || 1;
      draw(Tools.generateSeating(c.id, rows, cols));
    });
  }

  function renderCalendar(cont, c) {
    const events = Tools.getEvents(c.id);
    cont.innerHTML = `
      <h3><svg class="icon" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg> Calendrier de classe</h3>
      <label>Titre <input type="text" id="evTitre"></label>
      <label>Date <input type="date" id="evDate"></label>
      <button class="btn btn-primary" id="btnAddEvent" style="margin-top:10px;">Ajouter</button>
      <table style="margin-top:16px;"><thead><tr><th>Date</th><th>Événement</th><th></th></tr></thead>
      <tbody>${events.map(ev => `<tr><td>${new Date(ev.date).toLocaleDateString('fr-FR')}</td><td>${escapeHtml(ev.titre)}</td><td><button class="btn btn-sm btn-danger" data-evdel="${ev.id}"><svg class="icon" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg></button></td></tr>`).join('') || '<tr><td colspan="3" class="hint">Aucun événement.</td></tr>'}</tbody></table>
    `;
    document.getElementById('btnAddEvent').addEventListener('click', () => {
      const titre = document.getElementById('evTitre').value.trim();
      const date = document.getElementById('evDate').value;
      if (!titre || !date) { alert('Titre et date obligatoires.'); return; }
      Tools.addEvent(c.id, titre, date);
      renderCalendar(cont, c);
    });
    cont.querySelectorAll('[data-evdel]').forEach(b => b.addEventListener('click', () => { Tools.removeEvent(c.id, b.dataset.evdel); renderCalendar(cont, c); }));
  }

  function renderNotes(cont, c) {
    if (c.eleves.length === 0) { cont.innerHTML = '<p class="hint">Aucun élève dans cette classe.</p>'; return; }
    const notes = Tools.getNotes(c.id);
    cont.innerHTML = `
      <h3><svg class="icon" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/><path d="M9 7h7M9 11h7"/></svg> Notes rapides par élève</h3>
      <label>Élève <select id="noteEleve">${c.eleves.map(e => `<option value="${e.id}">${escapeHtml(e.nom)}</option>`).join('')}</select></label>
      <label>Note <textarea id="noteText" rows="2"></textarea></label>
      <button class="btn btn-primary" id="btnAddNote" style="margin-top:10px;">Ajouter la note</button>
      <div id="notesList" style="margin-top:16px;"></div>
    `;
    function refresh() {
      const eleveId = document.getElementById('noteEleve').value;
      const list = (Tools.getNotes(c.id)[eleveId]) || [];
      document.getElementById('notesList').innerHTML = list.map((n, i) => `
        <div class="card" style="margin-bottom:8px;"><p>${escapeHtml(n.texte)}</p><p class="hint">${new Date(n.date).toLocaleString('fr-FR')} <button class="btn btn-sm btn-danger" data-ndel="${i}">Supprimer</button></p></div>`).join('') || '<p class="hint">Aucune note pour cet élève.</p>';
      document.querySelectorAll('[data-ndel]').forEach(b => b.addEventListener('click', () => { Tools.deleteNote(c.id, eleveId, parseInt(b.dataset.ndel, 10)); refresh(); }));
    }
    document.getElementById('noteEleve').addEventListener('change', refresh);
    document.getElementById('btnAddNote').addEventListener('click', () => {
      const eleveId = document.getElementById('noteEleve').value;
      const txt = document.getElementById('noteText').value.trim();
      if (!txt) return;
      Tools.addNote(c.id, eleveId, txt);
      document.getElementById('noteText').value = '';
      refresh();
    });
    refresh();
  }

  function renderBadgesTool(cont, c) {
    if (c.eleves.length === 0) { cont.innerHTML = '<p class="hint">Aucun élève dans cette classe.</p>'; return; }
    const badges = Tools.computeBadges(c.id);
    cont.innerHTML = `<h3><svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="15" r="6"/><path d="M9 10 6 3M15 10l3-7M9.5 15.5l1.7 1.7 3.3-3.3"/></svg> Badges débloqués (selon les points cumulés)</h3>
      <p class="hint">${Tools.BADGE_DEFS.map(d => `${d.emoji} ${d.label}`).join(' · ')}</p>
      <div class="grid-cards" style="margin-top:12px;">
        ${c.eleves.map(e => `<div class="card"><strong>${escapeHtml(e.nom)}</strong><div class="badge-row">${(badges[e.id] || []).map(bid => `<span class="badge">${Tools.BADGE_DEFS.find(d => d.id === bid).emoji}</span>`).join('') || '<span class="hint">Aucun badge encore</span>'}</div></div>`).join('')}
      </div>`;
  }

  // ================= QUIZ KAHOOT =================
  async function renderQuizList() {
    const zone = document.getElementById('quizListZone');
    zone.innerHTML = '<p class="hint">Chargement des quiz…</p>';
    const index = await Quiz.loadIndex();
    zone.innerHTML = `<div class="grid-cards">${index.map(q => `
      <div class="card">
        <h3>${escapeHtml(q.titre)}</h3>
        <p class="pill">${escapeHtml(q.categorie)}</p>
        <p class="hint">${q.nbQuestions} questions</p>
        <div style="display:flex; gap:6px; margin-top:10px; flex-wrap:wrap;">
          <button class="btn btn-sm btn-primary" data-play="${q.id}" data-mode="diapo">Diaporama</button>
          <button class="btn btn-sm" data-play="${q.id}" data-mode="remote">À distance</button>
        </div>
      </div>`).join('')}</div>`;
    zone.querySelectorAll('[data-play]').forEach(b => b.addEventListener('click', () => startQuiz(b.dataset.play, b.dataset.mode)));
  }

  async function startQuiz(quizId, mode) {
    const quiz = await Quiz.loadQuiz(quizId);
    const overlay = document.createElement('div');
    overlay.className = 'quiz-fullscreen';
    document.body.appendChild(overlay);

    let qIndex = 0;
    let scores = {}; // pour mode remote
    let host = null;
    const classe = currentClassId ? Classes.get(currentClassId) : null;

    function closeQuiz() {
      if (host) host.destroy();
      overlay.remove();
    }

    if (mode === 'remote') {
      host = Quiz.createHost(
        (peerId, pseudo) => { updateLobby(); },
        (peerId, choiceIndex) => { registerAnswer(peerId, choiceIndex); },
        (err) => { alert('Erreur mode à distance : ' + err.message); }
      );
      if (!host) { closeQuiz(); return; }
      renderLobby();
    } else {
      renderQuestion();
    }

    function updateLobby() {
      const n = Object.keys(host.connections).length;
      const el = overlay.querySelector('#lobbyCount');
      if (el) el.textContent = n;
    }

    function renderLobby() {
      overlay.innerHTML = `
        <div class="quiz-topbar"><button class="btn btn-sm" id="closeQuizBtn"><svg class="icon" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg> Fermer</button></div>
        <h2>${escapeHtml(quiz.titre)}</h2>
        <p>Les élèves rejoignent sur leur téléphone via <strong>remote.html</strong> avec le code :</p>
        <p style="font-size:2rem; font-weight:900;" class="mono">${host.code}</p>
        <p class="hint">Ou l'URL complète : <span class="mono">remote.html?code=${host.code}</span></p>
        <p>Élèves connectés : <strong id="lobbyCount">0</strong></p>
        <button class="btn btn-primary" id="startRemoteQuizBtn" style="margin-top:16px; font-size:1.2rem; padding:14px 30px;">Démarrer le quiz</button>
        <p class="hint" style="max-width:600px; text-align:center; margin-top:14px;">ℹ️ Cette connexion utilise le serveur public gratuit PeerJS pour établir une connexion directe (WebRTC) entre le téléphone de chaque élève et cet ordinateur — pas besoin d'être sur le même Wi-Fi. En cas d'instabilité avec de nombreux élèves connectés en même temps, préférez le mode "Diaporama".</p>
      `;
      overlay.querySelector('#closeQuizBtn').addEventListener('click', closeQuiz);
      overlay.querySelector('#startRemoteQuizBtn').addEventListener('click', () => renderQuestion());
    }

    let answersThisQuestion = {};
    function registerAnswer(peerId, choiceIndex) {
      answersThisQuestion[peerId] = choiceIndex;
      const correct = quiz.questions[qIndex].correct;
      if (choiceIndex === correct) scores[peerId] = (scores[peerId] || 0) + 1;
      const cnt = overlay.querySelector('#answerCount');
      if (cnt) cnt.textContent = Object.keys(answersThisQuestion).length;
    }

    function renderQuestion() {
      answersThisQuestion = {};
      const q = quiz.questions[qIndex];
      const colors = ['qc0', 'qc1', 'qc2', 'qc3'];
      overlay.innerHTML = `
        <div class="quiz-topbar"><button class="btn btn-sm" id="closeQuizBtn"><svg class="icon" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg> Fermer</button></div>
        <p class="hint">Question ${qIndex + 1} / ${quiz.questions.length}${mode === 'remote' ? ' — Réponses reçues : <strong id="answerCount">0</strong>' : ''}</p>
        <div class="quiz-question">${escapeHtml(q.question)}</div>
        <div class="quiz-choices">
          ${q.choices.map((ch, i) => `<button class="quiz-choice ${colors[i]}" data-idx="${i}">${escapeHtml(ch)}</button>`).join('')}
        </div>
        <button class="btn" id="revealBtn" style="margin-top:20px;">Afficher la réponse</button>
      `;
      overlay.querySelector('#closeQuizBtn').addEventListener('click', closeQuiz);
      if (mode === 'diapo') {
        overlay.querySelectorAll('.quiz-choice').forEach(b => b.addEventListener('click', () => reveal(parseInt(b.dataset.idx, 10))));
      }
      if (mode === 'remote') {
        host.broadcast({ type: 'question', num: qIndex + 1, total: quiz.questions.length, choices: q.choices });
      }
      overlay.querySelector('#revealBtn').addEventListener('click', () => reveal(null));
    }

    function reveal(clickedIdx) {
      const q = quiz.questions[qIndex];
      overlay.querySelectorAll('.quiz-choice').forEach((b, i) => {
        if (i === q.correct) b.classList.add('correct'); else b.classList.add('wrong');
      });
      if (mode === 'remote') host.broadcast({ type: 'reveal', correctText: q.choices[q.correct] });
      const btn = overlay.querySelector('#revealBtn');
      btn.textContent = qIndex + 1 < quiz.questions.length ? 'Question suivante →' : 'Terminer le quiz';
      btn.onclick = () => {
        qIndex++;
        if (qIndex < quiz.questions.length) renderQuestion();
        else finishQuiz();
      };
    }

    function finishQuiz() {
      if (mode === 'remote' && host) host.broadcast({ type: 'end' });
      let bodyHtml = `<h2><svg class="icon" viewBox="0 0 24 24"><path d="M5 21V4"/><path d="M5 4h13l-3 4 3 4H5"/></svg> Quiz terminé : ${escapeHtml(quiz.titre)}</h2>`;
      if (mode === 'remote') {
        const ranking = Object.entries(scores).sort((a, b) => b[1] - a[1]);
        bodyHtml += `<table><thead><tr><th>Élève</th><th>Score</th></tr></thead><tbody>${ranking.map(([pid, sc]) => `<tr><td>${escapeHtml((host.connections[pid] && host.connections[pid].pseudo) || 'Élève')}</td><td>${sc} / ${quiz.questions.length}</td></tr>`).join('') || '<tr><td colspan="2" class="hint">Aucune réponse reçue.</td></tr>'}</tbody></table>`;
      } else {
        bodyHtml += `<p class="hint">Mode diaporama : notez les scores à main levée / sur ardoise.</p>`;
      }
      if (classe) {
        Quiz.saveScore(classe.id, { titre: quiz.titre, date: Date.now(), mode });
      }
      overlay.innerHTML = `<div class="quiz-topbar"><button class="btn btn-sm" id="closeQuizBtn"><svg class="icon" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg> Fermer</button></div>${bodyHtml}`;
      overlay.querySelector('#closeQuizBtn').addEventListener('click', closeQuiz);
    }
  }

  // ================= COURS EXPRESS =================
  document.getElementById('btnGenLesson').addEventListener('click', async () => {
    const err = document.getElementById('lessonError');
    const result = document.getElementById('lessonResult');
    err.textContent = ''; result.innerHTML = '<p class="hint">Génération en cours…</p>';
    try {
      const lesson = await Lesson.generate(document.getElementById('lessonSubject').value);
      renderLesson(result, lesson);
    } catch (ex) {
      err.textContent = ex.message;
      result.innerHTML = '';
    }
  });

  function renderLesson(container, lesson) {
    let html = Lesson.mdToHtml(lesson.markdown);

    if (lesson.imagePrompt) {
      html += `<div class="card lesson-image-card" style="margin-top:16px;">
        <h3><svg class="icon" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg> Illustration disponible</h3>
        <p class="hint">Une image liée au sujet peut être générée (via Pollinations).</p>
        <button class="btn btn-sm" id="btnGenLessonImage">Générer l'image</button>
        <div id="lessonImageZone" style="margin-top:10px;"></div>
      </div>`;
    }

    if (lesson.quickExercises.length) {
      html += `<div class="card" style="margin-top:16px;">
        <h3>Exercices rapides</h3>
        <ol>${lesson.quickExercises.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ol>
      </div>`;
    }
    if (lesson.deepExercises.length) {
      html += `<div class="card" style="margin-top:16px;">
        <h3>Exercices approfondis</h3>
        <ol>${lesson.deepExercises.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ol>
      </div>`;
    }

    container.innerHTML = html;

    const imgBtn = container.querySelector('#btnGenLessonImage');
    if (imgBtn) {
      imgBtn.addEventListener('click', () => {
        const zone = container.querySelector('#lessonImageZone');
        zone.innerHTML = '<p class="hint">Génération de l\'image…</p>';
        const url = Lesson.pollinationsUrl(lesson.imagePrompt);
        const img = new Image();
        img.style.maxWidth = '100%';
        img.style.borderRadius = 'var(--radius)';
        img.alt = escapeHtml(lesson.imagePrompt);
        img.onload = () => { zone.innerHTML = ''; zone.appendChild(img); };
        img.onerror = () => { zone.innerHTML = '<p class="error-msg">Impossible de générer l\'image pour le moment.</p>'; };
        img.src = url;
        imgBtn.textContent = 'Régénérer l\'image';
      });
    }
  }

  // ================= VERBES IRRÉGULIERS =================
  document.querySelectorAll('.verbTab').forEach(t => t.addEventListener('click', () => {
    document.querySelectorAll('.verbTab').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    renderVerbs(t.dataset.mode);
  }));

  async function renderVerbs(mode) {
    await Verbs.load();
    const cont = document.getElementById('verbsContent');
    if (mode === 'list') {
      cont.innerHTML = `<table><thead><tr><th>Base</th><th>Prétérit</th><th>Participe passé</th><th>Traduction</th></tr></thead>
        <tbody>${Verbs.all().map(v => `<tr><td>${v.base}</td><td>${v.preterit}</td><td>${v.participe}</td><td>${escapeHtml(v.traduction)}</td></tr>`).join('')}</tbody></table>`;
      return;
    }
    nextVerbQuestion(mode, cont);
  }

  function nextVerbQuestion(mode, cont) {
    const item = Verbs.randomQuizItem(mode);
    const champLabel = item.champ === 'preterit' ? 'prétérit' : 'participe passé';
    if (mode === 'qcm') {
      cont.innerHTML = `
        <h3>Quel est le ${champLabel} de "${item.verbe.base}" ?</h3>
        <div class="grid-cards">${item.choices.map(c => `<button class="btn" data-choice="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join('')}</div>
        <p id="verbFeedback" style="margin-top:12px; font-weight:700;"></p>
      `;
      cont.querySelectorAll('[data-choice]').forEach(b => b.addEventListener('click', () => {
        const fb = document.getElementById('verbFeedback');
        if (b.dataset.choice === item.bonne) { fb.textContent = '<svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.15em;fill:none;stroke:currentColor;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round;"><path d="M20 6 9 17l-5-5"/></svg> Correct !'; fb.style.color = 'var(--success)'; }
        else { fb.textContent = `<svg class="icon" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg> Faux. La bonne réponse était : ${item.bonne}`; fb.style.color = 'var(--danger)'; }
        setTimeout(() => nextVerbQuestion(mode, cont), 1400);
      }));
    } else {
      cont.innerHTML = `
        <h3>Écris le ${champLabel} de "${item.verbe.base}"</h3>
        <input type="text" id="verbInput" autocomplete="off">
        <button class="btn btn-primary" id="verbSubmit" style="margin-top:10px;">Valider</button>
        <p id="verbFeedback" style="margin-top:12px; font-weight:700;"></p>
      `;
      const submit = () => {
        const val = document.getElementById('verbInput').value.trim().toLowerCase();
        const fb = document.getElementById('verbFeedback');
        if (val === item.bonne.toLowerCase()) { fb.textContent = '<svg viewBox="0 0 24 24" style="width:1em;height:1em;vertical-align:-0.15em;fill:none;stroke:currentColor;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round;"><path d="M20 6 9 17l-5-5"/></svg> Correct !'; fb.style.color = 'var(--success)'; }
        else { fb.textContent = `<svg class="icon" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg> Faux. La bonne réponse était : ${item.bonne}`; fb.style.color = 'var(--danger)'; }
        setTimeout(() => nextVerbQuestion(mode, cont), 1400);
      };
      document.getElementById('verbSubmit').addEventListener('click', submit);
      document.getElementById('verbInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
    }
  }

  // ================= VIRELANGUES =================
  document.querySelectorAll('.twistTab').forEach(t => t.addEventListener('click', () => {
    document.querySelectorAll('.twistTab').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    renderTwisters(t.dataset.mode);
  }));

  async function renderTwisters(mode) {
    await Twisters.load();
    const cont = document.getElementById('twistersContent');
    if (mode === 'list') {
      cont.innerHTML = `<table><thead><tr><th>#</th><th>Virelangue</th><th>Sons travaillés</th></tr></thead>
        <tbody>${Twisters.all().map((v, i) => `<tr><td>${i + 1}</td><td>${escapeHtml(v.texte)}</td><td>${escapeHtml(v.sons)}</td></tr>`).join('')}</tbody></table>`;
      return;
    }
    drawTwister(cont);
  }
  function drawTwister(cont) {
    const t = Twisters.randomOne();
    cont.innerHTML = `
      <div style="text-align:center; padding:30px;">
        <p style="font-size:1.7rem; font-weight:700; line-height:1.5;">${escapeHtml(t.texte)}</p>
        <p class="hint">Sons travaillés : ${escapeHtml(t.sons)}</p>
        <button class="btn btn-primary" id="nextTwisterBtn" style="margin-top:18px;">Suivant →</button>
      </div>
    `;
    document.getElementById('nextTwisterBtn').addEventListener('click', () => drawTwister(cont));
  }

  // ================= RÉGLAGES =================
  document.getElementById('btnSaveSettings').addEventListener('click', () => {
    const theme = document.getElementById('themeSelect').value;
    const darkMode = document.getElementById('darkModeToggle').checked;
    const groqApiKey = document.getElementById('groqKeyInput').value.trim();
    Auth.updateSettings({ theme, darkMode, groqApiKey });
    Theme.applyFromUser();
    const msg = document.getElementById('settingsMsg');
    msg.textContent = 'Réglages enregistrés !';
    setTimeout(() => msg.textContent = '', 2000);
  });

  // ================= UTILITAIRES =================
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function downloadFile(filename, content, mime) {
    const blob = new Blob(['﻿' + content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }
})();
