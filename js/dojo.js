// dojo.js — points façon ClassDojo (attribution, historique)
const Dojo = (function () {
  function historyKey(classId) { return Storage.DB_KEYS.points + classId; }

  function getHistory(classId) { return Storage.readJSON(historyKey(classId), []); }

  function addPoints(classId, eleveId, categorie, points) {
    const c = Classes.get(classId);
    if (!c) throw new Error('Classe introuvable.');
    const eleve = c.eleves.find(e => e.id === eleveId);
    if (!eleve) throw new Error('Élève introuvable.');
    eleve.points = (eleve.points || 0) + points;
    Classes.update(classId, { eleves: c.eleves });

    const hist = getHistory(classId);
    hist.unshift({
      id: 'h_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      eleveId, eleveNom: eleve.nom, categorie, points, date: Date.now(),
    });
    Storage.writeJSON(historyKey(classId), hist.slice(0, 2000));
    return eleve;
  }

  function historyForStudent(classId, eleveId) {
    return getHistory(classId).filter(h => h.eleveId === eleveId);
  }

  function resetPoints(classId) {
    const c = Classes.get(classId);
    if (!c) return;
    c.eleves.forEach(e => e.points = 0);
    Classes.update(classId, { eleves: c.eleves });
    Storage.writeJSON(historyKey(classId), []);
  }

  function exportCSV(classId) {
    const c = Classes.get(classId);
    if (!c) return null;
    let csv = 'Nom;Sexe;Points totaux\n';
    c.eleves.forEach(e => { csv += `${e.nom};${e.sexe};${e.points || 0}\n`; });
    csv += '\nHistorique\nDate;Élève;Catégorie;Points\n';
    getHistory(classId).forEach(h => {
      csv += `${new Date(h.date).toLocaleString('fr-FR')};${h.eleveNom};${h.categorie};${h.points}\n`;
    });
    return csv;
  }

  return { getHistory, addPoints, historyForStudent, resetPoints, exportCSV };
})();
