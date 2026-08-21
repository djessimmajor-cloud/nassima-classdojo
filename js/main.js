// main.js — orchestration de l'interface : navigation, rendu des vues, événements.
(function () {
  let currentClassId = null;

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    wireAuthScreen();
    wireSidebar();
    wireModalClose();

    wireDailyClassScreen();

    const user = Auth.getCurrentUser();
    if (user) enterAppFlow(); else showAuth();
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
        enterAppFlow();
      } catch (ex) { err.textContent = ex.message; }
    });

    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = document.getElementById('registerError');
      err.textContent = '';
      try {
        await Auth.register(document.getElementById('regNom').value, document.getElementById('regEmail').value, document.getElementById('regPass').value);
        enterAppFlow();
      } catch (ex) { err.textContent = ex.message; }
    });
  }

  function showAuth() {
    document.getElementById('authScreen').style.display = 'flex';
    document.getElementById('dailyClassScreen').style.display = 'none';
    document.getElementById('appScreen').style.display = 'none';
    Theme.apply('normal', false);
  }

  function showApp() {
    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('dailyClassScreen').style.display = 'none';
    document.getElementById('appScreen').style.display = 'grid';
    Theme.applyFromUser();
    const user = Auth.getCurrentUser();
    document.getElementById('userNameDisplay').innerHTML = Icons.svg('user') + ' ' + escapeHtml(user.nom);
    const themeSel = document.getElementById('themeSelect');
    const darkToggle = document.getElementById('darkModeToggle');
    themeSel.value = user.settings.theme || 'normal';
    darkToggle.checked = !!user.settings.darkMode;
    document.getElementById('groqKeyInput').value = user.settings.groqApiKey || Lesson.DEFAULT_API_KEY;

    updateDailyClassLabel();
    switchView('viewClasses');
    renderClasses();
  }

  document.getElementById('logoutBtn') && document.getElementById('logoutBtn').addEventListener('click', () => {
    Auth.logout(); currentClassId = null; showAuth();
  });

  // ================= CLASSE DU JOUR =================
  // Ecran affiché juste après connexion : le prof choisit sa classe active du jour.
  // Ce choix n'est volontairement PAS persisté d'un jour à l'autre (variable en mémoire
  // uniquement) : à chaque nouvelle connexion / rechargement de page, l'écran est redemandé,
  // sauf si le prof n'a qu'une seule classe (sélection automatique pour ne pas l'embêter).
  // Le seul moyen de revenir sur ce choix ensuite est le bouton "Changer de classe" du header.
  function updateDailyClassLabel() {
    const label = document.getElementById('dailyClassLabel');
    if (!label) return;
    const c = currentClassId ? Classes.get(currentClassId) : null;
    label.textContent = c ? c.nom : 'Aucune';
  }

  function enterAppFlow() {
    const list = Classes.forCurrentUser();
    if (list.length === 0) {
      showDailyClassScreen({ forceEmpty: true });
      return;
    }
    if (list.length === 1) {
      currentClassId = list[0].id;
      showApp();
      return;
    }
    showDailyClassScreen();
  }

  function showDailyClassScreen(opts) {
    opts = opts || {};
    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('appScreen').style.display = 'none';
    document.getElementById('dailyClassScreen').style.display = 'flex';
    Theme.applyFromUser();

    const list = Classes.forCurrentUser();
    const grid = document.getElementById('dailyClassGrid');
    const createZone = document.getElementById('dailyClassCreate');
    const hint = document.getElementById('dailyClassHint');
    document.getElementById('dailyClassError').textContent = '';

    if (list.length === 0) {
      grid.style.display = 'none';
      createZone.style.display = 'block';
      hint.textContent = "Vous n'avez encore aucune classe. Créez votre première classe pour commencer.";
      return;
    }

    grid.style.display = '';
    createZone.style.display = 'none';
    hint.textContent = 'Choisissez la classe avec laquelle vous travaillez aujourd\'hui.';
    grid.innerHTML = list.map(c => `
      <div class="card class-card" data-id="${c.id}" style="cursor:pointer;">
        <h3>${escapeHtml(c.nom)}</h3>
        <p class="hint">${c.eleves.length} élève(s)</p>
        <button class="btn btn-primary btn-block dailyPickBtn" data-id="${c.id}" style="margin-top:8px;">Choisir cette classe</button>
      </div>`).join('');
    grid.querySelectorAll('.dailyPickBtn').forEach(b => b.addEventListener('click', () => {
      currentClassId = b.dataset.id;
      showApp();
    }));
  }

  function wireDailyClassScreen() {
    const createBtn = document.getElementById('dailyCreateClassBtn');
    if (createBtn) {
      createBtn.addEventListener('click', () => {
        const err = document.getElementById('dailyClassError');
        err.textContent = '';
        try {
          const c = Classes.create(document.getElementById('dailyNewClassName').value);
          currentClassId = c.id;
          showApp();
        } catch (ex) { err.textContent = ex.message; }
      });
    }
    const changeBtn = document.getElementById('btnChangeDailyClass');
    if (changeBtn) {
      changeBtn.addEventListener('click', () => { showDailyClassScreen(); });
    }
  }

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
    if (viewId === 'viewTools') {
      document.querySelectorAll('.toolTab').forEach(x => x.classList.remove('active'));
      const first = document.querySelector('.toolTab[data-tool="timer"]');
      if (first) first.classList.add('active');
      populateToolsClassSelect();
      renderTools('timer');
    }
    if (viewId === 'viewConsigne') renderConsigne();
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
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.getElementById('modalOverlay')) closeModal();
    });
  }

  // ================= MES CLASSES (fusion : classes + tableau de bord + points) =================
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
          <div style="display:flex; gap:6px; margin-top:8px; flex-wrap:wrap;">
            <button class="btn btn-sm btn-primary selectClassBtn" data-id="${c.id}">${currentClassId === c.id ? 'Classe active' : 'Sélectionner'}</button>
            <button class="btn btn-sm btn-danger deleteClassBtn" data-id="${c.id}">Supprimer</button>
          </div>
        </div>`).join('');
    }
    grid.querySelectorAll('.selectClassBtn').forEach(b => b.addEventListener('click', () => {
      currentClassId = b.dataset.id;
      updateDailyClassLabel();
      renderClasses();
    }));
    grid.querySelectorAll('.deleteClassBtn').forEach(b => b.addEventListener('click', () => {
      if (confirm('Supprimer définitivement cette classe et toutes ses données ?')) {
        Classes.remove(b.dataset.id);
        if (currentClassId === b.dataset.id) currentClassId = null;
        renderClasses();
      }
    }));

    const detail = document.getElementById('classDetail');
    if (!currentClassId || !Classes.get(currentClassId)) {
      detail.style.display = 'none';
      return;
    }
    detail.style.display = 'block';
    renderClassDetail();
  }

  function renderClassDetail() {
    const c = Classes.get(currentClassId);
    if (!c) return;
    document.getElementById('classDetailNameText').textContent = c.nom;

    const statsGrid = document.getElementById('classStatsGrid');
    if (c.eleves.length === 0) {
      statsGrid.innerHTML = '';
    } else {
      const sorted = c.eleves.slice().sort((a, b) => (b.points || 0) - (a.points || 0));
      const top = sorted[0];
      const totalPts = c.eleves.reduce((s, e) => s + (e.points || 0), 0);
      const scores = Quiz.getScores(c.id);
      statsGrid.innerHTML = `
        <div class="card"><h3>${Icons.svg('star')} Meilleur score</h3><p style="font-size:1.6rem;font-weight:800;">${escapeHtml(top.nom)}</p><p class="hint">${top.points || 0} points</p></div>
        <div class="card"><h3>${Icons.svg('chartBar')} Total classe</h3><p style="font-size:1.6rem;font-weight:800;">${totalPts} pts</p><p class="hint">${c.eleves.length} élèves</p></div>
        <div class="card"><h3>${Icons.svg('speech')} Quiz joués</h3><p style="font-size:1.6rem;font-weight:800;">${scores.length}</p><p class="hint">${scores[0] ? escapeHtml(scores[0].titre) : 'Aucun quiz encore'}</p></div>
      `;
    }

    const grid = document.getElementById('studentGrid');
    const emptyMsg = document.getElementById('dojoEmptyMsg');
    emptyMsg.style.display = c.eleves.length === 0 ? 'block' : 'none';

    grid.innerHTML = c.eleves.map(e => `
      <div class="student-card">
        <div class="avatar" style="background:${e.couleur}">${escapeHtml(e.nom.slice(0, 1).toUpperCase())}</div>
        <div class="student-name">${escapeHtml(e.nom)} <span class="pill ${e.sexe === 'F' ? 'pill-f' : 'pill-m'}">${e.sexe === 'F' ? 'F' : 'G'}</span></div>
        <div class="student-points">${e.points || 0}</div>
        <div class="student-card-actions">
          <button class="btn btn-sm btn-points" data-points="${e.id}">${Icons.svg('trophy')} Points</button>
          <button class="btn btn-sm btn-danger" data-remove="${e.id}">${Icons.svg('trash')}</button>
        </div>
      </div>
    `).join('');

    grid.querySelectorAll('[data-points]').forEach(b => b.addEventListener('click', () => {
      openPointsModal(c.id, b.dataset.points);
    }));
    grid.querySelectorAll('[data-remove]').forEach(b => b.addEventListener('click', () => {
      if (confirm('Retirer cet élève de la classe ?')) { Classes.removeStudent(c.id, b.dataset.remove); renderClassDetail(); }
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
        updateDailyClassLabel();
        closeModal();
        renderClasses();
      } catch (ex) { alert(ex.message); }
    });
  });

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
        closeModal(); renderClassDetail();
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
          <button class="btn btn-sm btn-danger" data-catdel="${cat.id}">${Icons.svg('close')}</button>
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

  // ---- Modale de points par élève ----
  function openPointsModal(classId, eleveId) {
    const c = Classes.get(classId);
    if (!c) return;
    const e = c.eleves.find(x => x.id === eleveId);
    if (!e) return;

    openModal(`
      <div class="points-modal-box">
        <div class="points-modal-head">
          <button class="points-modal-close" id="pmClose" aria-label="Fermer">${Icons.svg('close')}</button>
          <div class="pm-avatar" style="background:${e.couleur}">${escapeHtml(e.nom.slice(0, 1).toUpperCase())}</div>
          <div class="pm-name">${escapeHtml(e.nom)}</div>
          <div class="pm-total" id="pmTotal">${e.points || 0}</div>
          <div class="hint" style="color:rgba(255,255,255,.85); justify-content:center;">points au total</div>
        </div>
        <div class="points-modal-body">
          <div id="pmCatList">${c.categories.map(cat => `
            <div class="pm-cat-row">
              <div class="pm-cat-name">${escapeHtml(cat.nom)}<br><span class="pm-cat-val">± ${Math.abs(cat.points)} pt${Math.abs(cat.points) > 1 ? 's' : ''}</span></div>
              <div class="pm-cat-actions">
                <button class="pm-minus" data-cat="${cat.id}" title="Retirer">${Icons.svg('minus')}</button>
                <button class="pm-plus" data-cat="${cat.id}" title="Ajouter">${Icons.svg('plus')}</button>
              </div>
            </div>`).join('') || '<p class="hint">Aucune catégorie. Ajoutez-en une ci-dessous.</p>'}
          </div>
          <div class="pm-add-cat">
            <label style="margin:0 0 6px;">Nouvelle catégorie</label>
            <div class="pm-add-cat-row">
              <input type="text" id="pmNewCatName" placeholder="Nom de la catégorie">
              <input type="number" id="pmNewCatPts" value="1" title="Valeur en points">
              <button class="btn btn-sm btn-primary" id="pmAddCat">${Icons.svg('plus')}</button>
            </div>
          </div>
        </div>
      </div>
    `);

    function refreshTotal() {
      const fresh = Classes.get(classId).eleves.find(x => x.id === eleveId);
      document.getElementById('pmTotal').textContent = fresh ? (fresh.points || 0) : 0;
    }
    function wireCatButtons() {
      document.querySelectorAll('#pmCatList .pm-plus').forEach(b => b.addEventListener('click', () => {
        const cat = Classes.get(classId).categories.find(x => x.id === b.dataset.cat);
        if (!cat) return;
        Dojo.addPoints(classId, eleveId, cat.nom, Math.abs(cat.points));
        refreshTotal(); renderClassDetail();
      }));
      document.querySelectorAll('#pmCatList .pm-minus').forEach(b => b.addEventListener('click', () => {
        const cat = Classes.get(classId).categories.find(x => x.id === b.dataset.cat);
        if (!cat) return;
        Dojo.addPoints(classId, eleveId, cat.nom, -Math.abs(cat.points));
        refreshTotal(); renderClassDetail();
      }));
    }
    wireCatButtons();

    document.getElementById('pmClose').addEventListener('click', closeModal);
    document.getElementById('pmAddCat').addEventListener('click', () => {
      try {
        Classes.addCategory(classId, document.getElementById('pmNewCatName').value, document.getElementById('pmNewCatPts').value);
        openPointsModal(classId, eleveId); // ré-ouvre la modale rafraîchie avec la nouvelle catégorie
      } catch (ex) { alert(ex.message); }
    });
  }

  document.getElementById('btnResetPoints').addEventListener('click', () => {
    const c = requireClass(); if (!c) return;
    if (confirm('Remettre tous les points à zéro pour cette classe ?')) { Dojo.resetPoints(c.id); renderClassDetail(); }
  });

  document.getElementById('btnExportCsv').addEventListener('click', () => {
    const c = requireClass(); if (!c) return;
    const csv = Dojo.exportCSV(c.id);
    downloadFile(`points_${c.nom}.csv`, csv, 'text/csv;charset=utf-8;');
  });

  // ================= CONSIGNE (affichage diaporama) =================
  const CG_POS = [
    { v: 'top', h: 'left' }, { v: 'top', h: 'center' }, { v: 'top', h: 'right' },
    { v: 'center', h: 'left' }, { v: 'center', h: 'center' }, { v: 'center', h: 'right' },
    { v: 'bottom', h: 'left' }, { v: 'bottom', h: 'center' }, { v: 'bottom', h: 'right' },
  ];
  function renderConsigne() {
    const s = Consigne.getSettings();

    document.getElementById('cgText').value = s.text || '';
    document.getElementById('cgFont').value = s.font;
    document.getElementById('cgSize').value = s.size;
    document.getElementById('cgSizeVal').textContent = s.size + 'px';
    document.getElementById('cgColor').value = s.color;
    document.getElementById('cgColorVal').textContent = s.color;
    document.getElementById('cgBgColor').value = s.bgColor;
    document.getElementById('cgBgColorVal').textContent = s.bgColor;

    // grille de positions
    const posGrid = document.getElementById('cgPosGrid');
    posGrid.innerHTML = CG_POS.map(p => `<button type="button" class="consigne-pos-btn${p.v === s.posV && p.h === s.posH ? ' active' : ''}" data-v="${p.v}" data-h="${p.h}" title="${p.v}/${p.h}"></button>`).join('');

    // grille d'icônes
    const iconGrid = document.getElementById('cgIconGrid');
    iconGrid.innerHTML = `<button type="button" class="consigne-icon-btn${!s.icon ? ' active' : ''}" data-icon="" title="Aucune">${Icons.svg('close')}</button>` +
      Icons.CONSIGNE_ICONS.map(ic => `<button type="button" class="consigne-icon-btn${s.icon === ic.id ? ' active' : ''}" data-icon="${ic.id}" title="${ic.label}">${Icons.svg(ic.id)}</button>`).join('');

    const imgActions = document.getElementById('cgImageActions');
    imgActions.style.display = s.image ? 'block' : 'none';

    function updatePreview() { Consigne.renderPreview(document.getElementById('cgPreview'), Consigne.getSettings()); }
    updatePreview();

    document.getElementById('cgText').oninput = (e) => { Consigne.saveSettings({ text: e.target.value }); updatePreview(); };
    document.getElementById('cgFont').onchange = (e) => { Consigne.saveSettings({ font: e.target.value }); updatePreview(); };
    document.getElementById('cgSize').oninput = (e) => {
      document.getElementById('cgSizeVal').textContent = e.target.value + 'px';
      Consigne.saveSettings({ size: Number(e.target.value) }); updatePreview();
    };
    document.getElementById('cgColor').oninput = (e) => {
      document.getElementById('cgColorVal').textContent = e.target.value;
      Consigne.saveSettings({ color: e.target.value }); updatePreview();
    };
    document.getElementById('cgBgColor').oninput = (e) => {
      document.getElementById('cgBgColorVal').textContent = e.target.value;
      Consigne.saveSettings({ bgColor: e.target.value }); updatePreview();
    };
    posGrid.querySelectorAll('.consigne-pos-btn').forEach(b => b.addEventListener('click', () => {
      Consigne.saveSettings({ posV: b.dataset.v, posH: b.dataset.h });
      renderConsigne();
    }));
    iconGrid.querySelectorAll('.consigne-icon-btn').forEach(b => b.addEventListener('click', () => {
      Consigne.saveSettings({ icon: b.dataset.icon });
      renderConsigne();
    }));
    document.getElementById('cgImageInput').onchange = (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => { Consigne.saveSettings({ image: reader.result }); renderConsigne(); };
      reader.readAsDataURL(file);
    };
    document.getElementById('cgImageRemove').onclick = () => { Consigne.saveSettings({ image: null }); renderConsigne(); };
    document.getElementById('cgShowBtn').onclick = () => { Consigne.showFullscreen(Consigne.getSettings()); };
  }

  // ================= OUTILS =================
  document.querySelectorAll('.toolTab').forEach(t => t.addEventListener('click', () => {
    document.querySelectorAll('.toolTab').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    renderTools(t.dataset.tool);
  }));

  // Dropdown de sélection de classe directement dans l'onglet Outils, pour ne pas avoir
  // besoin d'aller sur "Mes classes" avant d'utiliser un outil (sélecteur, groupes, etc.).
  function populateToolsClassSelect() {
    const sel = document.getElementById('toolsClassSelect');
    if (!sel) return;
    const list = Classes.forCurrentUser();
    if (list.length === 0) {
      sel.innerHTML = '<option value="">Aucune classe — créez-en une dans "Mes classes"</option>';
      sel.value = '';
      return;
    }
    sel.innerHTML = list.map(c => `<option value="${c.id}">${escapeHtml(c.nom)}</option>`).join('');
    if (currentClassId && list.some(c => c.id === currentClassId)) sel.value = currentClassId;
    else { currentClassId = list[0].id; sel.value = currentClassId; }
  }
  const toolsClassSelectEl = document.getElementById('toolsClassSelect');
  if (toolsClassSelectEl) {
    toolsClassSelectEl.addEventListener('change', (e) => {
      currentClassId = e.target.value || null;
      const activeTab = document.querySelector('.toolTab.active');
      renderTools(activeTab ? activeTab.dataset.tool : 'timer');
    });
  }

  function renderTools(tool) {
    const cont = document.getElementById('toolContent');
    if (tool === 'timer') return renderTimer(cont);
    const c = requireClass();
    if (!c) { cont.innerHTML = ''; return; }
    if (tool === 'picker') return renderPickerTool(cont, c);
    if (tool === 'groups') return renderGroups(cont, c);
    if (tool === 'seating') return renderSeating(cont, c);
    if (tool === 'calendar') return renderCalendar(cont, c);
    if (tool === 'notes') return renderNotes(cont, c);
    if (tool === 'badges') return renderBadgesTool(cont, c);
  }

  // ---- Sélecteur aléatoire (alterné fille/garçon, sans répétition) ----
  // Animation "défilement de noms qui ralentit et atterrit sur un élève", façon machine
  // à sous : une colonne de noms défile verticalement, ralentit progressivement puis
  // s'arrête pile sur le nom tiré par Picker.draw() (logique métier inchangée).
  function renderPickerTool(cont, c) {
    cont.innerHTML = `
      <h3>${Icons.svg('dice')} Sélecteur aléatoire (alterné fille/garçon)</h3>
      <p class="hint">Tire un élève au hasard en alternant filles et garçons, sans répétition tant que tout le monde n'est pas passé.</p>
      <div class="card picker-stage">
        <div class="picker-reel-wrap" id="pickerReelWrap">
          <div class="picker-reel" id="pickerReel"></div>
          <div class="picker-reel-shade"></div>
        </div>
        <div id="pickerMeta" class="hint" style="justify-content:center; margin-top:10px;"></div>
        <div style="display:flex; gap:10px; justify-content:center; margin-top:18px; flex-wrap:wrap;">
          <button class="btn btn-primary" id="btnDraw" style="font-size:1.1rem; padding:14px 28px;">${Icons.svg('dice')} Tirer un élève</button>
          <button class="btn btn-sm btn-danger" id="btnResetPicker">Réinitialiser le tirage</button>
        </div>
      </div>
    `;

    const reel = document.getElementById('pickerReel');
    function setReelNames(names) {
      reel.innerHTML = names.map(n => `<div class="picker-reel-item">${escapeHtml(n)}</div>`).join('');
    }
    setReelNames(['—']);

    document.getElementById('btnDraw').addEventListener('click', () => {
      if (c.eleves.length === 0) { alert('Cette classe n’a pas d’élèves.'); return; }
      const drawBtn = document.getElementById('btnDraw');
      let res;
      try {
        res = Picker.draw(c.id);
      } catch (ex) { alert(ex.message); return; }
      drawBtn.disabled = true;

      // Bande de noms aléatoires (façon machine à sous) se terminant sur le nom tiré.
      const pool = c.eleves.length ? c.eleves : [{ nom: '—' }];
      const REEL_LEN = 26;
      const names = [];
      for (let i = 0; i < REEL_LEN - 1; i++) names.push(pool[Math.floor(Math.random() * pool.length)].nom);
      names.push(res.eleve.nom);
      setReelNames(names);

      const firstItem = reel.querySelector('.picker-reel-item');
      const itemH = firstItem ? firstItem.getBoundingClientRect().height : 84;
      const finalOffset = (REEL_LEN - 1) * itemH;
      reel.style.transition = 'none';
      reel.style.transform = 'translateY(0)';
      // force reflow puis lance la transition d'easing qui ralentit progressivement.
      void reel.offsetHeight;
      reel.style.transition = 'transform 3.2s cubic-bezier(.12,.72,.14,1)';
      reel.style.transform = `translateY(-${finalOffset}px)`;

      const onEnd = () => {
        reel.removeEventListener('transitionend', onEnd);
        drawBtn.disabled = false;
        document.getElementById('pickerMeta').textContent = res.poolWasReset
          ? 'Nouveau cycle démarré pour ce sexe.'
          : `Encore ${res.restantsMemeSexe} élève(s) de ce sexe dans le cycle actuel.`;
      };
      reel.addEventListener('transitionend', onEnd);
    });

    document.getElementById('btnResetPicker').addEventListener('click', () => {
      if (confirm('Réinitialiser complètement le tirage aléatoire de cette classe ?')) {
        Picker.resetAll(c.id);
        setReelNames(['—']);
        document.getElementById('pickerMeta').textContent = '';
      }
    });
  }

  function renderTimer(cont) {
    cont.innerHTML = `
      <h3>${Icons.svg('clock')} Minuteur de classe</h3>
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
      <h3>${Icons.svg('users')} Groupes aléatoires équilibrés</h3>
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
      <h3>${Icons.svg('seating')} Plan de classe</h3>
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
      <h3>${Icons.svg('calendar')} Calendrier de classe</h3>
      <label>Titre <input type="text" id="evTitre"></label>
      <label>Date <input type="date" id="evDate"></label>
      <button class="btn btn-primary" id="btnAddEvent" style="margin-top:10px;">Ajouter</button>
      <table style="margin-top:16px;"><thead><tr><th>Date</th><th>Événement</th><th></th></tr></thead>
      <tbody>${events.map(ev => `<tr><td>${new Date(ev.date).toLocaleDateString('fr-FR')}</td><td>${escapeHtml(ev.titre)}</td><td><button class="btn btn-sm btn-danger" data-evdel="${ev.id}">${Icons.svg('close')}</button></td></tr>`).join('') || '<tr><td colspan="3" class="hint">Aucun événement.</td></tr>'}</tbody></table>
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
      <h3>${Icons.svg('notes')} Notes rapides par élève</h3>
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
    cont.innerHTML = `<h3>${Icons.svg('award')} Badges débloqués (selon les points cumulés)</h3>
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

    // Vrai plein écran (API Fullscreen) pour le mode diaporama, en plus de l'overlay CSS.
    if (overlay.requestFullscreen) {
      overlay.requestFullscreen().catch(() => {}); // ignoré si refusé/non supporté (ex: iframe)
    }

    let qIndex = 0;
    let scores = {}; // pour mode remote
    let host = null;
    let timerInterval = null;
    const QUESTION_SECONDS = 20;
    const classe = currentClassId ? Classes.get(currentClassId) : null;

    function stopTimer() { if (timerInterval) { clearInterval(timerInterval); timerInterval = null; } }

    // Doit être déclaré avant le premier appel à renderQuestion() ci-dessous (sinon TDZ/ReferenceError
    // sur "answersThisQuestion avant initialisation" — c'était le bug qui cassait le mode diaporama).
    let answersThisQuestion = {};

    function closeQuiz() {
      stopTimer();
      if (host) host.destroy();
      if (document.fullscreenElement) { document.exitFullscreen().catch(() => {}); }
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
      const remoteUrl = new URL('remote.html', location.href);
      remoteUrl.searchParams.set('code', host.code);
      overlay.innerHTML = `
        <div class="quiz-topbar"><button class="btn btn-sm" id="closeQuizBtn">${Icons.svg('close')} Fermer</button></div>
        <h2>${escapeHtml(quiz.titre)}</h2>
        <div class="remote-lobby-grid">
          <div style="text-align:center;">
            <p>Les élèves scannent ce QR code avec leur téléphone pour rejoindre :</p>
            <div id="qrZone" class="qr-box" style="margin:0 auto;"></div>
          </div>
          <div style="text-align:center;">
            <p class="hint">Ou saisie manuelle sur <strong>remote.html</strong> avec le code :</p>
            <p style="font-size:2rem; font-weight:900;" class="mono">${host.code}</p>
            <p class="hint">URL complète : <span class="mono">${remoteUrl.href}</span></p>
          </div>
        </div>
        <p style="margin-top:18px;">Élèves connectés : <strong id="lobbyCount">0</strong></p>
        <button class="btn btn-primary" id="startRemoteQuizBtn" style="margin-top:16px; font-size:1.2rem; padding:14px 30px;">Démarrer le quiz</button>
        <p class="hint" style="max-width:600px; text-align:center; margin-top:14px;">Cette connexion utilise le serveur public gratuit PeerJS pour établir une connexion directe (WebRTC) entre le téléphone de chaque élève et cet ordinateur — pas besoin d'être sur le même Wi-Fi. En cas d'instabilité avec de nombreux élèves connectés en même temps, préférez le mode "Diaporama".</p>
      `;
      overlay.querySelector('#closeQuizBtn').addEventListener('click', closeQuiz);
      overlay.querySelector('#startRemoteQuizBtn').addEventListener('click', () => renderQuestion());
      renderQrCode(overlay.querySelector('#qrZone'), remoteUrl.href);
    }

    function renderQrCode(container, text) {
      if (!container) return;
      try {
        const qr = qrcode(0, 'M'); // typeNumber 0 = auto, correction 'M'
        qr.addData(text);
        qr.make();
        const cellSize = 5;
        const margin = 3;
        const canvas = document.createElement('canvas');
        const count = qr.getModuleCount();
        const size = (count + margin * 2) * cellSize;
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = '#000';
        for (let r = 0; r < count; r++) {
          for (let c = 0; c < count; c++) {
            if (qr.isDark(r, c)) ctx.fillRect((c + margin) * cellSize, (r + margin) * cellSize, cellSize, cellSize);
          }
        }
        container.innerHTML = '';
        container.appendChild(canvas);
      } catch (ex) {
        container.innerHTML = '<p class="hint">QR code indisponible, utilisez le code texte.</p>';
      }
    }

    function registerAnswer(peerId, choiceIndex) {
      answersThisQuestion[peerId] = choiceIndex;
      const correct = quiz.questions[qIndex].correct;
      if (choiceIndex === correct) scores[peerId] = (scores[peerId] || 0) + 1;
      const cnt = overlay.querySelector('#answerCount');
      if (cnt) cnt.textContent = Object.keys(answersThisQuestion).length;
    }

    function renderQuestion() {
      stopTimer();
      answersThisQuestion = {};
      const q = quiz.questions[qIndex];
      const colors = ['qc0', 'qc1', 'qc2', 'qc3'];
      const dots = quiz.questions.map((_, i) => `<span class="${i < qIndex ? 'done' : (i === qIndex ? 'done' : '')}"></span>`).join('');
      overlay.innerHTML = `
        <div class="quiz-topbar"><button class="btn btn-sm" id="closeQuizBtn">${Icons.svg('close')} Fermer</button></div>
        <div class="quiz-timer" id="quizTimer">${QUESTION_SECONDS}</div>
        <div class="quiz-progress-dots">${dots}</div>
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

      // Décompte : affiché en permanence, colore en rouge dans les 5 dernières secondes,
      // révèle automatiquement la réponse à 0 (le prof garde la main via "Afficher la réponse" avant ça).
      let secondsLeft = QUESTION_SECONDS;
      const timerEl = overlay.querySelector('#quizTimer');
      timerInterval = setInterval(() => {
        secondsLeft--;
        if (!timerEl) { stopTimer(); return; }
        timerEl.textContent = String(Math.max(secondsLeft, 0));
        if (secondsLeft <= 5) timerEl.classList.add('low');
        if (secondsLeft <= 0) { stopTimer(); reveal(null); }
      }, 1000);
    }

    function reveal(clickedIdx) {
      stopTimer();
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
      let bodyHtml = `<h2>${Icons.svg('trophy')} Quiz terminé : ${escapeHtml(quiz.titre)}</h2>`;
      if (mode === 'remote') {
        const ranking = Object.entries(scores).sort((a, b) => b[1] - a[1]);
        bodyHtml += `<table><thead><tr><th>Élève</th><th>Score</th></tr></thead><tbody>${ranking.map(([pid, sc]) => `<tr><td>${escapeHtml((host.connections[pid] && host.connections[pid].pseudo) || 'Élève')}</td><td>${sc} / ${quiz.questions.length}</td></tr>`).join('') || '<tr><td colspan="2" class="hint">Aucune réponse reçue.</td></tr>'}</tbody></table>`;
      } else {
        bodyHtml += `<p class="hint">Mode diaporama : notez les scores à main levée / sur ardoise.</p>`;
      }
      if (classe) {
        Quiz.saveScore(classe.id, { titre: quiz.titre, date: Date.now(), mode });
      }
      overlay.innerHTML = `<div class="quiz-topbar"><button class="btn btn-sm" id="closeQuizBtn">${Icons.svg('close')} Fermer</button></div>${bodyHtml}`;
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

  document.getElementById('btnGenLessonPdf').addEventListener('click', async () => {
    const err = document.getElementById('lessonPdfError');
    const btn = document.getElementById('btnGenLessonPdf');
    const subject = document.getElementById('lessonSubject').value;
    err.textContent = '';
    if (!subject || !subject.trim()) { err.textContent = 'Veuillez saisir un sujet de cours.'; return; }
    btn.disabled = true;
    const originalLabel = btn.textContent;
    btn.textContent = 'Génération du PDF…';
    try {
      const data = await Lesson.generateExercises(subject);
      const classe = currentClassId ? Classes.get(currentClassId) : null;
      const headerTitle = classe ? classe.nom : subject.trim();
      const doc = Lesson.buildExercisesPdf(headerTitle, data);
      const safeName = (data.titre || subject).trim().replace(/[^a-z0-9\-_ ]/gi, '').slice(0, 60) || 'exercices';
      doc.save(`${safeName}.pdf`);
    } catch (ex) {
      err.textContent = ex.message;
    } finally {
      btn.disabled = false;
      btn.textContent = originalLabel;
    }
  });

  function renderLesson(container, lesson) {
    let html = Lesson.mdToHtml(lesson.markdown);

    if (lesson.imagePrompt) {
      html += `<div class="card lesson-image-card" style="margin-top:16px;">
        <h3>${Icons.svg('image')} Illustration disponible</h3>
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
        else { fb.textContent = `${Icons.svg('close')} Faux. La bonne réponse était : ${item.bonne}`; fb.style.color = 'var(--danger)'; }
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
        else { fb.textContent = `${Icons.svg('close')} Faux. La bonne réponse était : ${item.bonne}`; fb.style.color = 'var(--danger)'; }
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
