// twisters.js — module virelangues : liste + lecture aléatoire.
const Twisters = (function () {
  let data = [];
  let loaded = false;
  let bag = [];

  async function load() {
    if (loaded) return data;
    const res = await fetch('data/virelangues.json');
    data = await res.json();
    loaded = true;
    return data;
  }

  function all() { return data; }

  function randomOne() {
    if (bag.length === 0) bag = data.map((_, i) => i);
    const pick = Math.floor(Math.random() * bag.length);
    const idx = bag[pick];
    bag.splice(pick, 1);
    return data[idx];
  }

  return { load, all, randomOne };
})();
