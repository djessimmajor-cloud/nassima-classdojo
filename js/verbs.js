// verbs.js — module verbes irréguliers anglais : liste + entraînement QCM/saisie.
const Verbs = (function () {
  let data = [];
  let loaded = false;

  async function load() {
    if (loaded) return data;
    const res = await fetch('data/verbes-irreguliers.json');
    data = await res.json();
    loaded = true;
    return data;
  }

  function all() { return data; }

  function randomQuizItem(mode) {
    // mode: 'qcm' ou 'saisie'
    const v = data[Math.floor(Math.random() * data.length)];
    const champ = ['preterit', 'participe'][Math.floor(Math.random() * 2)];
    const bonne = v[champ];
    if (mode === 'saisie') {
      return { verbe: v, champ, bonne };
    }
    // QCM : 3 mauvaises réponses tirées d'autres verbes
    const autres = data.filter(x => x.base !== v.base);
    const wrongsSet = new Set();
    while (wrongsSet.size < 3 && wrongsSet.size < autres.length) {
      const r = autres[Math.floor(Math.random() * autres.length)][champ];
      if (r !== bonne) wrongsSet.add(r);
    }
    const choices = [bonne, ...wrongsSet];
    for (let i = choices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [choices[i], choices[j]] = [choices[j], choices[i]];
    }
    return { verbe: v, champ, bonne, choices };
  }

  return { load, all, randomQuizItem };
})();
