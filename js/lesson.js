// lesson.js — cours express généré via l'API Groq (appel direct depuis le navigateur).
const Lesson = (function () {
  // Groq a retiré tous les modeles Llama de son catalogue ; gpt-oss-20b est
  // desormais le modele texte le moins cher disponible (verifie via /v1/models).
  const MODEL = 'openai/gpt-oss-20b';
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
        // gpt-oss-20b est un modele de raisonnement : reasoning_effort bas
        // limite les tokens depenses a "reflechir" avant de repondre.
        reasoning_effort: 'low',
        max_tokens: (maxTokens || 900) + 400,
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
  // qcm, texte_a_trous, correction_erreurs, remise_en_ordre, association, redaction, relier
  // La feuille doit tenir sur 1 page A4 (exercices) + 1 page A4 (corrigé) avec une police
  // confortable : on demande donc un nombre limité d'exercices COURTS — 4 — plus 3 "gros"
  // exercices qui sont désormais systématiquement des exercices de RÉDACTION (production
  // écrite d'un ou plusieurs paragraphes en anglais), et non des exercices "à relier" ou
  // "remise en ordre".
  async function generateExercises(sujet) {
    if (!sujet || !sujet.trim()) throw new Error('Veuillez saisir un sujet de cours.');
    const s = sujet.trim();

    const prompt = `Tu es un professeur d'anglais en collège. Génère un jeu de 7 exercices d'anglais liés au sujet suivant : "${s}", conçu pour tenir sur UNE SEULE page A4 avec une police confortable (donc reste concis sur les exercices courts).
Le jeu doit contenir EXACTEMENT :
- 4 exercices COURTS (taille "court") : rapides, 1 à 2 lignes de contenu maximum chacun. Choisis leurs types parmi : "qcm" (choix multiple), "texte_a_trous" (fill in the blanks), "correction_erreurs" (repérer et corriger une erreur dans une phrase), "association" (associer des éléments deux à deux en une ligne de texte), "relier" (deux courtes colonnes à relier, 3-4 paires max). Mélange au moins 3 types différents parmi les 4 exercices courts.
- 3 GROS exercices de RÉDACTION (taille "grand", type OBLIGATOIREMENT "redaction") : ce sont de vraies consignes d'écriture où l'élève doit rédiger un texte en anglais, PAS des exercices "à relier" ni "remise en ordre". Varie les 3 consignes parmi par exemple : écrire un paragraphe argumenté ou descriptif sur le sujet (5-8 phrases), écrire une courte histoire liée au sujet, écrire un dialogue entre deux personnes sur le sujet, ou écrire une lettre/un e-mail informel en lien avec le sujet. Chaque consigne doit être claire, motivante et donner un cadre précis (nombre de phrases attendu, ce dont il faut parler) pour guider l'élève.

N'utilise JAMAIS le type "redaction" pour du contenu à trous ou une phrase à corriger : "redaction" signifie toujours "écris un texte" avec un champ "contenu" vide (l'élève écrit directement sur la feuille).

Réponds UNIQUEMENT avec un JSON valide, sans aucun texte avant ou après, sans balises markdown, au format suivant exactement :
{
  "titre": "titre court du jeu d'exercices en francais",
  "exercices": [
    {
      "type": "qcm",
      "taille": "court",
      "consigne": "consigne en francais expliquant quoi faire",
      "contenu": "le texte de la question ou de la phrase en anglais, avec pour qcm les choix listes sous forme 'A) ... B) ... C) ...' inclus dans ce champ",
      "reponse": "la reponse correcte, courte"
    },
    {
      "type": "redaction",
      "taille": "grand",
      "consigne": "consigne en francais claire et precise demandant d'ecrire un paragraphe/une histoire/un dialogue/une lettre en anglais sur le sujet, avec une indication de longueur attendue (ex: 5 a 8 phrases)",
      "contenu": "",
      "reponse": "quelques idees/points cles attendus dans une bonne reponse, a titre de correction indicative"
    },
    {
      "type": "relier",
      "taille": "court",
      "consigne": "consigne en francais expliquant quoi faire (relier chaque element de gauche a celui qui correspond a droite)",
      "contenu": "",
      "gauche": ["mot ou expression 1 en anglais", "mot ou expression 2 en anglais"],
      "droite": ["traduction ou definition A (dans le desordre par rapport a gauche)", "traduction ou definition B"],
      "reponse": "1-B, 2-A (indique la bonne correspondance numero-lettre pour chaque paire)"
    }
  ]
}
Pour le type "relier" uniquement, remplis "gauche" et "droite" (3-4 éléments chacun, même longueur), laisse "contenu" vide, et donne la correspondance dans "reponse" au format "1-B, 2-A, ...". Pour le type "redaction", laisse "contenu" vide. Pour tous les autres types, n'utilise pas les champs "gauche"/"droite".
Adapte le niveau à des élèves de collège (11-15 ans) apprenant l'anglais. Les consignes sont en français, le contenu des exercices est en anglais. N'ajoute aucun commentaire, uniquement le JSON.`;

    const raw = await callGroq(prompt, 2600);
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
    const exercices = Array.isArray(data.exercices)
      ? data.exercices.filter(x => x && x.consigne && (x.contenu || (Array.isArray(x.gauche) && Array.isArray(x.droite))))
      : [];
    if (!exercices.length) throw new Error('Aucun exercice exploitable dans la réponse de Groq.');

    let parsed = exercices.map(x => ({
      type: String(x.type || 'exercice').trim(),
      taille: /^grand/i.test(String(x.taille || '')) ? 'grand' : 'court',
      consigne: String(x.consigne || '').trim(),
      contenu: String(x.contenu || '').trim(),
      reponse: String(x.reponse || '').trim(),
      gauche: Array.isArray(x.gauche) ? x.gauche.map(v => String(v).trim()).filter(Boolean) : null,
      droite: Array.isArray(x.droite) ? x.droite.map(v => String(v).trim()).filter(Boolean) : null,
    }));

    // Garantit exactement 3 "gros" exercices, et que les gros exercices soient bien des
    // exercices de RÉDACTION (le prof ne veut plus de "à relier"/"remise en ordre" en gros
    // exercice) : on force le type à "redaction" pour tout gros exercice qui ne l'est pas déjà.
    let big = parsed.filter(x => x.taille === 'grand');
    let small = parsed.filter(x => x.taille !== 'grand');
    if (big.length !== 3) {
      // Priorise les exercices déjà de type "redaction" pour composer les 3 gros exercices ;
      // complète avec les autres si besoin (ils seront convertis en "redaction" ci-dessous).
      const all = parsed.slice().sort((a, b) => (b.type === 'redaction' ? 1 : 0) - (a.type === 'redaction' ? 1 : 0));
      big = all.slice(0, Math.min(3, all.length)).map(x => Object.assign({}, x, { taille: 'grand' }));
      small = all.slice(Math.min(3, all.length)).map(x => Object.assign({}, x, { taille: 'court' }));
    }
    // Les 3 gros exercices doivent être des exercices de rédaction : si Groq a renvoyé un
    // "relier"/"remise_en_ordre" en gros exercice, on le convertit en consigne de rédaction
    // générique pour respecter la consigne du prof plutôt que de casser la mise en page PDF.
    big = big.map(x => {
      if (x.type === 'redaction') return x;
      return Object.assign({}, x, {
        type: 'redaction',
        contenu: '',
        consigne: x.consigne || 'Écris un paragraphe en anglais (5 à 8 phrases) en lien avec le sujet du cours.',
      });
    });
    // Limite à 4 exercices courts + 3 gros pour tenir sur une page avec une police confortable.
    small = small.slice(0, 4);
    parsed = small.concat(big);

    return {
      titre: (data.titre && String(data.titre).trim()) || fallbackTitle,
      exercices: parsed,
    };
  }

  const TYPE_LABELS = {
    qcm: 'QCM',
    texte_a_trous: 'Texte à trous',
    correction_erreurs: "Correction d'erreurs",
    remise_en_ordre: 'Remise en ordre',
    association: 'Association',
    redaction: 'Rédaction courte',
    relier: 'À relier',
  };

  // Construit un vrai PDF (jsPDF) tenant sur 1 page A4 pour les exercices + 1 page A4
  // pour le corrigé (2 pages au total), avec une police confortable (10-11pt pour le
  // corps des consignes). Pour tenir sur 1 page malgré la police plus grande, le nombre
  // d'exercices est limité (4 courts + 3 gros, cf. parseExercisesResponse) plutôt que
  // d'écraser la taille du texte. Les gros exercices sont des exercices de rédaction et
  // reçoivent un espace généreux de lignes vides pour écrire un paragraphe. Retourne
  // l'objet jsPDF (doc), à qui l'appelant peut faire doc.save(filename) ou doc.output('blob').
  function buildExercisesPdf(headerTitle, data) {
    if (!window.jspdf || !window.jspdf.jsPDF) throw new Error('jsPDF n\'est pas chargé.');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 13;
    const maxWidth = pageWidth - marginX * 2;
    const bottomLimit = pageHeight - 9;
    let y = 16;

    // Filet de sécurité : si malgré le réglage compact le contenu déborde quand même
    // (sujet très long, etc.), on ajoute une page plutôt que de couper le texte —
    // mais avec les tailles/nombres d'exercices fixés ici, ça ne devrait normalement
    // pas arriver.
    function ensureSpace(needed) {
      if (y + needed > bottomLimit) { doc.addPage(); y = 14; }
    }
    function writeLines(text, opts) {
      opts = opts || {};
      doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
      doc.setFontSize(opts.size || 10);
      const lh = opts.lh || (opts.size ? opts.size * 0.52 : 5.2);
      const lines = doc.splitTextToSize(text, opts.width || maxWidth);
      lines.forEach(line => {
        ensureSpace(lh);
        doc.text(line, opts.x || marginX, y);
        y += lh;
      });
      return lines.length * lh;
    }

    // ---- En-tête ----
    doc.setFillColor(79, 142, 247);
    doc.rect(0, 0, pageWidth, 16, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text("EnglishDojo — Feuille d'exercices", marginX, 7.5);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.text(String(headerTitle).slice(0, 70), marginX, 12.8);
    doc.setTextColor(0, 0, 0);
    y = 21;

    writeLines(data.titre, { bold: true, size: 14, lh: 6 });
    writeLines('Date : ______________     Nom : ________________________________', { size: 9, lh: 4.6 });
    y += 1.5;

    // ---- Exercices ----
    // Le type d'exercice reste disponible en interne (ex.type) pour la logique de mise en
    // page (relier / redaction) mais n'est plus affiché en préfixe "[Type]" dans la consigne :
    // le prof ne veut plus voir ces étiquettes de type dans le PDF.
    data.exercices.forEach((ex, i) => {
      const isBig = ex.taille === 'grand';
      const isRedaction = ex.type === 'redaction';
      const consigneSize = isBig ? 11 : 10.5;
      writeLines(`${i + 1}. ${ex.consigne}`, { bold: true, size: consigneSize, lh: consigneSize * 0.52 });

      if (ex.type === 'relier' && ex.gauche && ex.droite && ex.gauche.length) {
        drawRelierColumns(doc, ex, marginX, maxWidth, () => y, (v) => { y = v; }, ensureSpace);
      } else if (ex.contenu) {
        writeLines(ex.contenu, { size: isBig ? 10.5 : 10, lh: isBig ? 5.2 : 4.8 });
      }

      // Espace pour répondre : généreux (plusieurs lignes) pour les gros exercices de
      // rédaction, où l'élève doit écrire un paragraphe complet ; plus réduit pour les
      // exercices courts.
      if (ex.type !== 'relier') {
        const nLines = isRedaction ? 6 : (isBig ? 3 : 1);
        for (let l = 0; l < nLines; l++) {
          ensureSpace(6.2);
          doc.setDrawColor(180, 180, 180);
          doc.line(marginX, y, pageWidth - marginX, y);
          y += 5.8;
        }
      }
      y += isBig ? 2.5 : 1.5;
    });

    // ---- Page de corrigé (compacte, 1 page) ----
    doc.addPage();
    y = 16;
    doc.setFillColor(87, 199, 133);
    doc.rect(0, 0, pageWidth, 14, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Corrigé — ' + String(data.titre || '').slice(0, 55), marginX, 9.5);
    doc.setTextColor(0, 0, 0);
    y = 20;

    data.exercices.forEach((ex, i) => {
      writeLines(`${i + 1}.`, { bold: true, size: 10, lh: 4.6 });
      if (ex.type === 'relier' && ex.gauche && ex.droite && ex.gauche.length) {
        const pairs = describeRelierAnswer(ex);
        writeLines(pairs, { size: 9.5, lh: 4.4 });
      } else {
        writeLines(ex.reponse || "Réponse libre / à apprécier selon la production de l'élève.", { size: 9.5, lh: 4.4 });
      }
      y += 1.5;
    });

    return doc;
  }

  // Dessine un exercice "à relier" : deux colonnes (gauche / droite dans le désordre)
  // avec un espace central pour que l'élève trace les traits de liaison au stylo.
  // Ne dessine pas les traits lui-même — seulement l'espace et les repères numérotés/lettrés.
  function drawRelierColumns(doc, ex, marginX, maxWidth, getY, setY, ensureSpace) {
    const n = Math.max(ex.gauche.length, ex.droite.length);
    const rowH = 5.4;
    ensureSpace(n * rowH + 2);
    let y = getY();
    const colGap = 26; // espace central réservé pour tracer les traits
    const colWidth = (maxWidth - colGap) / 2;
    const leftX = marginX + 2;
    const rightX = marginX + colWidth + colGap;
    const startY = y;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    for (let r = 0; r < n; r++) {
      const rowY = startY + r * rowH;
      if (ex.gauche[r] != null) {
        const t = doc.splitTextToSize(`${r + 1}. ${ex.gauche[r]}`, colWidth - 4)[0] || '';
        doc.text(t, leftX, rowY);
        // Petit repère (point) côté droit de la colonne gauche pour ancrer le trait.
        doc.setFillColor(90, 90, 90);
        doc.circle(marginX + colWidth, rowY - 1.2, 0.5, 'F');
      }
      if (ex.droite[r] != null) {
        const letter = String.fromCharCode(65 + r);
        const t = doc.splitTextToSize(`${letter}. ${ex.droite[r]}`, colWidth - 4)[0] || '';
        doc.setFillColor(90, 90, 90);
        doc.circle(rightX - 3, rowY - 1.2, 0.5, 'F');
        doc.text(t, rightX, rowY);
      }
    }
    // Ligne pointillée verticale légère au centre pour suggérer l'espace de traçage.
    doc.setDrawColor(210, 210, 210);
    doc.setLineDashPattern([1, 1], 0);
    doc.line(marginX + colWidth + colGap / 2, startY - 3, marginX + colWidth + colGap / 2, startY + n * rowH - 2);
    doc.setLineDashPattern([], 0);

    setY(startY + n * rowH + 1);
  }

  function describeRelierAnswer(ex) {
    if (ex.reponse && ex.reponse.trim()) return ex.reponse.trim();
    // Repli : associe par ordre si aucune réponse fournie.
    return ex.gauche.map((g, idx) => `${idx + 1}-${String.fromCharCode(65 + idx)}`).join(', ');
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
