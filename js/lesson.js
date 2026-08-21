// lesson.js — cours express généré via l'API Groq (appel direct depuis le navigateur).
const Lesson = (function () {
  const MODEL = 'llama-3.2-3b-preview';
  const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
  const POLLINATIONS_ENDPOINT = 'https://image.pollinations.ai/prompt/';
  // Clé Groq par défaut pré-remplie dans les réglages (l'utilisateur peut la remplacer).
  // Rappel : toute clé stockée côté client (localStorage) reste visible dans le navigateur,
  // et codée en dur ici elle est aussi visible dans le code source de la page.
  const DEFAULT_API_KEY = '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';

  function getApiKey() {
    const user = Auth.getCurrentUser();
    const stored = user && user.settings && user.settings.groqApiKey;
    return (stored && stored.trim()) || DEFAULT_API_KEY;
  }

  async function callGroq(prompt, maxTokens) {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error("Aucune clé API Groq renseignée. Ajoutez-la dans Réglages > Compte.");
    }
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.6,
        max_tokens: maxTokens || 900,
      }),
    });
    if (!res.ok) {
      let msg = `Erreur API Groq (${res.status})`;
      try { const j = await res.json(); if (j.error && j.error.message) msg += ' : ' + j.error.message; } catch (e) {}
      throw new Error(msg);
    }
    const data = await res.json();
    const text = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!text) throw new Error('Réponse vide de Groq.');
    return text;
  }

  async function generate(sujet) {
    if (!sujet || !sujet.trim()) throw new Error('Veuillez saisir un sujet de cours.');
    const s = sujet.trim();

    const prompt = `Tu es un professeur d'anglais en collège. Rédige un mini-cours d'anglais structuré et clair en français (avec des exemples en anglais) sur le sujet suivant : "${s}".
Le sujet doit être traité uniquement sous l'angle de l'apprentissage de l'anglais : grammaire anglaise, conjugaison (tenses), vocabulaire, expressions idiomatiques, phrasal verbs, prépositions, phonétique, ou civilisation des pays anglophones (UK, USA, Canada, Australie, Irlande...).

Réponds STRICTEMENT en suivant cette structure, avec ces titres Markdown exacts (##), dans cet ordre, sans rien ajouter avant ou après :

## Introduction
(2-3 phrases d'introduction)

## Notions clés
(liste à puces avec "-", 4 à 6 points, avec des exemples en anglais entre guillemets)

## Exemple concret
(phrases ou dialogue en anglais avec traduction)

## Ce qu'il faut retenir
(résumé en 2-3 phrases)

## QUICK_EXERCISES
(20 exercices COURTS et RAPIDES en anglais liés au sujet : QCM, mots à trous, réponse en un mot. Numérote-les de 1 à 20, un exercice par ligne, format "1. texte de l'exercice". Les exercices doivent etre en anglais.)

## DEEP_EXERCISES
(4 à 6 consignes LONGUES et SUBSTANTIELLES en anglais liées au sujet, dont la réalisation par un élève prend environ 1 HEURE de travail au total. Ce ne sont PAS des questions rapides mais de vraies productions écrites, par exemple : écrire un paragraphe argumenté ou descriptif sur un sujet lié au cours, écrire une courte histoire (short story) utilisant le vocabulaire vu, rédiger un dialogue complet, écrire une lettre ou un email, faire l'analyse d'un court texte, etc. Choisis 4 à 6 consignes de ce type adaptées au sujet, numérote-les en partant de 1, un exercice par ligne, format "1. texte de la consigne". Les consignes doivent etre en anglais.)

## IMAGE
(Si une illustration serait vraiment utile pour ce cours — par exemple un lieu, un objet concret, une scène de vie ou de civilisation — écris UNE SEULE courte description en ANGLAIS de l'image a generer, sans guillemets, en une seule ligne. Si le sujet est abstrait et qu'une image n'apporterait rien - par exemple une regle de grammaire pure comme les temps verbaux ou les prepositions - ecris uniquement le mot NONE.)

Adapte le niveau à des élèves de collège (11-15 ans) apprenant l'anglais. Sois précis, concis, et respecte bien la structure demandée.`;

    const raw = await callGroq(prompt, 2200);
    return parseLessonResponse(raw);
  }

  function parseLessonResponse(raw) {
    // Découpe la réponse en sections sur les titres "## ..."
    const sections = {};
    const parts = raw.split(/\n(?=##\s)/);
    for (const part of parts) {
      const m = part.match(/^##\s*([^\n]+)\n?([\s\S]*)$/);
      if (!m) continue;
      const key = m[1].trim().toUpperCase();
      const body = m[2].trim();
      sections[key] = body;
    }

    // Reconstruit le markdown "cours" (les 4 premières sections) pour mdToHtml
    const courseKeys = ['INTRODUCTION', 'NOTIONS CLÉS', 'NOTIONS CLES', 'EXEMPLE CONCRET', 'CE QU\'IL FAUT RETENIR'];
    let courseMd = '';
    const titleMap = [
      ['INTRODUCTION', 'Introduction'],
      ['NOTIONS CLÉS', 'Notions clés'],
      ['NOTIONS CLES', 'Notions clés'],
      ['EXEMPLE CONCRET', 'Exemple concret'],
      ["CE QU'IL FAUT RETENIR", 'Ce qu\'il faut retenir'],
    ];
    const seen = new Set();
    for (const [key, title] of titleMap) {
      if (sections[key] && !seen.has(title)) {
        courseMd += `## ${title}\n${sections[key]}\n\n`;
        seen.add(title);
      }
    }
    if (!courseMd.trim()) {
      // Repli : si le parsing echoue, on garde tout le texte brut comme cours.
      courseMd = raw;
    }

    const quickRaw = sections['QUICK_EXERCISES'] || sections['QUICK EXERCISES'] || '';
    const deepRaw = sections['DEEP_EXERCISES'] || sections['DEEP EXERCISES'] || '';
    const quickExercises = parseNumberedList(quickRaw);
    const deepExercises = parseNumberedList(deepRaw);

    let imagePrompt = null;
    const imageRaw = (sections['IMAGE'] || '').trim();
    if (imageRaw && !/^none\.?$/i.test(imageRaw)) {
      imagePrompt = imageRaw.replace(/^["']|["']$/g, '').split('\n')[0].trim();
      if (!imagePrompt || /^none$/i.test(imagePrompt)) imagePrompt = null;
    }

    return { markdown: courseMd.trim(), quickExercises, deepExercises, imagePrompt };
  }

  function parseNumberedList(text) {
    if (!text) return [];
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const items = [];
    for (const line of lines) {
      const m = line.match(/^\d+[\.\)]\s*(.+)$/);
      if (m) items.push(m[1].trim());
      else if (line.startsWith('-')) items.push(line.replace(/^-\s*/, '').trim());
    }
    return items;
  }

  // ================= GÉNÉRATION PDF D'EXERCICES (via Groq + jsPDF) =================
  // Types d'exercices attendus dans le JSON retourné par Groq (mélange volontaire) :
  // qcm, texte_a_trous, correction_erreurs, remise_en_ordre, association, redaction
  async function generateExercises(sujet) {
    if (!sujet || !sujet.trim()) throw new Error('Veuillez saisir un sujet de cours.');
    const s = sujet.trim();

    const prompt = `Tu es un professeur d'anglais en collège. Génère un jeu de 8 exercices d'anglais VARIÉS liés au sujet suivant : "${s}".
Mélange réellement les types d'exercices parmi cette liste : "qcm" (choix multiple), "texte_a_trous" (fill in the blanks), "correction_erreurs" (repérer et corriger une erreur dans une phrase), "remise_en_ordre" (remettre des mots ou une phrase dans l'ordre), "association" (associer des éléments deux à deux), "redaction" (courte production écrite en 2-4 phrases).
Utilise au moins 4 types différents parmi cette liste sur les 8 exercices.

Réponds UNIQUEMENT avec un JSON valide, sans aucun texte avant ou après, sans balises markdown, au format suivant exactement :
{
  "titre": "titre court du jeu d'exercices en francais",
  "exercices": [
    {
      "type": "qcm",
      "consigne": "consigne en francais expliquant quoi faire",
      "contenu": "le texte de la question ou de la phrase en anglais, avec pour qcm les choix listes sous forme 'A) ... B) ... C) ...' inclus dans ce champ",
      "reponse": "la reponse correcte, courte"
    }
  ]
}
Adapte le niveau à des élèves de collège (11-15 ans) apprenant l'anglais. Les consignes sont en français, le contenu des exercices est en anglais. N'ajoute aucun commentaire, uniquement le JSON.`;

    const raw = await callGroq(prompt, 2200);
    return parseExercisesResponse(raw, s);
  }

  function parseExercisesResponse(raw, fallbackTitle) {
    let jsonStr = raw.trim();
    // Retire d'éventuelles balises markdown ```json ... ``` que le modèle ajoute parfois
    // malgré la consigne stricte de ne renvoyer que du JSON.
    jsonStr = jsonStr.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
    // Si du texte entoure quand même le JSON, on isole le premier bloc { ... } complet.
    const first = jsonStr.indexOf('{');
    const last = jsonStr.lastIndexOf('}');
    if (first !== -1 && last !== -1 && last > first) jsonStr = jsonStr.slice(first, last + 1);

    let data;
    try {
      data = JSON.parse(jsonStr);
    } catch (e) {
      throw new Error("Impossible d'analyser la réponse de Groq (JSON invalide).");
    }
    const exercices = Array.isArray(data.exercices) ? data.exercices.filter(x => x && x.consigne && x.contenu) : [];
    if (!exercices.length) throw new Error('Aucun exercice exploitable dans la réponse de Groq.');
    return {
      titre: (data.titre && String(data.titre).trim()) || fallbackTitle,
      exercices: exercices.map(x => ({
        type: String(x.type || 'exercice').trim(),
        consigne: String(x.consigne || '').trim(),
        contenu: String(x.contenu || '').trim(),
        reponse: String(x.reponse || '').trim(),
      })),
    };
  }

  const TYPE_LABELS = {
    qcm: 'QCM',
    texte_a_trous: 'Texte à trous',
    correction_erreurs: "Correction d'erreurs",
    remise_en_ordre: 'Remise en ordre',
    association: 'Association',
    redaction: 'Rédaction courte',
  };

  // Construit un vrai PDF (jsPDF) : page de garde/en-tête, consignes numérotées avec
  // espace pour répondre, et une page de corrigé à la fin. Retourne l'objet jsPDF (doc),
  // à qui l'appelant peut faire doc.save(filename) ou doc.output('blob').
  function buildExercisesPdf(headerTitle, data) {
    if (!window.jspdf || !window.jspdf.jsPDF) throw new Error('jsPDF n\'est pas chargé.');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 18;
    const maxWidth = pageWidth - marginX * 2;
    let y = 20;

    function ensureSpace(needed) {
      if (y + needed > pageHeight - 18) { doc.addPage(); y = 20; }
    }
    function writeParagraph(text, opts) {
      opts = opts || {};
      doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
      doc.setFontSize(opts.size || 11);
      const lines = doc.splitTextToSize(text, maxWidth);
      lines.forEach(line => {
        ensureSpace(6);
        doc.text(line, marginX, y);
        y += 6;
      });
    }

    // En-tête
    doc.setFillColor(79, 142, 247);
    doc.rect(0, 0, pageWidth, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('EnglishDojo — Feuille d\'exercices', marginX, 14);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(headerTitle, marginX, 23);
    doc.setTextColor(0, 0, 0);
    y = 40;

    writeParagraph(data.titre, { bold: true, size: 15 });
    y += 2;
    writeParagraph(`Date : ________________     Nom : ____________________________`, { size: 10 });
    y += 4;

    data.exercices.forEach((ex, i) => {
      ensureSpace(16);
      const label = TYPE_LABELS[ex.type] || ex.type;
      writeParagraph(`${i + 1}. [${label}] ${ex.consigne}`, { bold: true, size: 11.5 });
      writeParagraph(ex.contenu, { size: 11 });
      // Lignes pour répondre (espace pour l'élève)
      const linesToDraw = /redaction|association|remise_en_ordre/.test(ex.type) ? 3 : 2;
      for (let l = 0; l < linesToDraw; l++) {
        ensureSpace(8);
        doc.setDrawColor(180, 180, 180);
        doc.line(marginX, y, pageWidth - marginX, y);
        y += 7;
      }
      y += 3;
    });

    // Page de corrigé
    doc.addPage();
    y = 20;
    doc.setFillColor(87, 199, 133);
    doc.rect(0, 0, pageWidth, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Corrigé', marginX, 14);
    doc.setTextColor(0, 0, 0);
    y = 34;

    data.exercices.forEach((ex, i) => {
      ensureSpace(14);
      const label = TYPE_LABELS[ex.type] || ex.type;
      writeParagraph(`${i + 1}. [${label}]`, { bold: true, size: 11 });
      writeParagraph(ex.reponse || 'Réponse libre / à apprécier selon la production de l\'élève.', { size: 10.5 });
      y += 2;
    });

    return doc;
  }

  function pollinationsUrl(prompt) {
    // On interdit systématiquement tout texte/lettres dans l'image générée, car Pollinations
    // essaie parfois d'ajouter du texte halluciné (souvent illisible ou incorrect) dans l'image.
    const finalPrompt = prompt.trim().replace(/[.,;]+$/, '') + ', no text, no letters, no words, no writing in the image';
    return POLLINATIONS_ENDPOINT + encodeURIComponent(finalPrompt) + '?width=768&height=512&nologo=true&seed=' + Math.floor(Math.random() * 1000000);
  }

  // Convertisseur Markdown -> HTML minimal (titres ##, listes -, gras **)
  function mdToHtml(md) {
    const lines = md.split('\n');
    let html = '';
    let inList = false;
    for (let line of lines) {
      line = line.trim();
      if (line.startsWith('## ')) {
        if (inList) { html += '</ul>'; inList = false; }
        html += `<h3>${escapeHtml(line.slice(3))}</h3>`;
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        if (!inList) { html += '<ul>'; inList = true; }
        html += `<li>${inlineMd(escapeHtml(line.slice(2)))}</li>`;
      } else if (line === '') {
        if (inList) { html += '</ul>'; inList = false; }
      } else {
        if (inList) { html += '</ul>'; inList = false; }
        html += `<p>${inlineMd(escapeHtml(line))}</p>`;
      }
    }
    if (inList) html += '</ul>';
    return html;
  }
  function escapeHtml(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function inlineMd(s) { return s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'); }

  return { generate, mdToHtml, pollinationsUrl, DEFAULT_API_KEY, getApiKey, generateExercises, buildExercisesPdf };
})();
