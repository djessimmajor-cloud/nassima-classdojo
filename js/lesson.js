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

  return { generate, mdToHtml, pollinationsUrl, DEFAULT_API_KEY, getApiKey };
})();
