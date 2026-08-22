// dojo.js — points façon ClassDojo (attribution + historique interne, via Supabase).
// L'historique (points_events) est conservé côté serveur même si l'UI n'en affiche plus le détail
// (garde une trace exploitable / export CSV).
const Dojo = (function () {
  async function getHistory(classId) {
    const { data, error } = await sb.from('points_events').select('*').eq('class_id', classId).order('created_at', { ascending: false }).limit(2000);
    if (error) throw new Error(friendlyError(error));
    return (data || []).map(h => ({ id: h.id, eleveId: h.student_id, eleveNom: h.categorie_nom, categorie: h.categorie_nom, points: h.points, date: new Date(h.created_at).getTime() }));
  }

  async function addPoints(classId, eleveId, categorie, points) {
    const c = Classes.get(classId);
    if (!c) throw new Error('Classe introuvable.');
    const eleve = c.eleves.find(e => e.id === eleveId);
    if (!eleve) throw new Error('Élève introuvable.');
    const newTotal = (eleve.points || 0) + points;

    const { error: upErr } = await sb.from('students').update({ points: newTotal }).eq('id', eleveId);
    if (upErr) throw new Error(friendlyError(upErr));
    const { error: evErr } = await sb.from('points_events').insert({ class_id: classId, student_id: eleveId, categorie_nom: categorie, points });
    if (evErr) throw new Error(friendlyError(evErr));

    await Classes.refresh();
    return Classes.get(classId).eleves.find(e => e.id === eleveId);
  }

  async function historyForStudent(classId, eleveId) {
    const { data, error } = await sb.from('points_events').select('*').eq('class_id', classId).eq('student_id', eleveId).order('created_at', { ascending: false });
    if (error) throw new Error(friendlyError(error));
    return (data || []).map(h => ({ id: h.id, eleveId: h.student_id, categorie: h.categorie_nom, points: h.points, date: new Date(h.created_at).getTime() }));
  }

  async function resetPoints(classId) {
    const c = Classes.get(classId);
    if (!c) return;
    const { error: e1 } = await sb.from('students').update({ points: 0 }).eq('class_id', classId);
    if (e1) throw new Error(friendlyError(e1));
    const { error: e2 } = await sb.from('points_events').delete().eq('class_id', classId);
    if (e2) throw new Error(friendlyError(e2));
    await Classes.refresh();
  }

  async function exportCSV(classId) {
    const c = Classes.get(classId);
    if (!c) return null;
    let csv = 'Nom;Sexe;Points totaux\n';
    c.eleves.forEach(e => { csv += `${e.nom};${e.sexe};${e.points || 0}\n`; });
    csv += '\nHistorique\nDate;Élève;Catégorie;Points\n';
    const hist = await getHistory(classId);
    const nomById = {}; c.eleves.forEach(e => nomById[e.id] = e.nom);
    hist.forEach(h => {
      csv += `${new Date(h.date).toLocaleString('fr-FR')};${nomById[h.eleveId] || '?'};${h.categorie};${h.points}\n`;
    });
    return csv;
  }

  return { getHistory, addPoints, historyForStudent, resetPoints, exportCSV };
})();
