// quiz.js — quiz façon Kahoot : chargement des banques, mode diaporama, mode téléphone à distance (PeerJS).
const Quiz = (function () {
  let index = [];
  let cache = {};

  async function loadIndex() {
    if (index.length) return index;
    const res = await fetch('data/quiz/index.json');
    index = await res.json();
    return index;
  }

  async function loadQuiz(id) {
    if (cache[id]) return cache[id];
    const item = index.find(q => q.id === id);
    if (!item) throw new Error('Quiz introuvable.');
    const res = await fetch('data/quiz/' + item.file);
    const quiz = await res.json();
    cache[id] = quiz;
    return quiz;
  }

  function historyKey(classId) { return Storage.DB_KEYS.quizHistory + classId; }
  function saveScore(classId, entry) {
    const hist = Storage.readJSON(historyKey(classId), []);
    hist.unshift(entry);
    Storage.writeJSON(historyKey(classId), hist.slice(0, 500));
  }
  function getScores(classId) { return Storage.readJSON(historyKey(classId), []); }

  // ---------- Mode téléphone à distance via PeerJS ----------
  // Le prof "host" une connexion P2P avec un code (peer id). Chaque élève ouvre
  // remote.html?code=XXXX sur son téléphone et se connecte directement au prof (WebRTC).
  // Limite connue : PeerJS utilise le serveur de signalisation public gratuit (0.peerjs.com).
  // Ce service est parfois instable ou saturé, et les connexions multi-élèves simultanées
  // (30 élèves = 30 connexions P2P directes vers le prof) peuvent être limitées par la
  // bande passante montante du prof. En cas d'instabilité, utilisez plutôt le mode
  // "diaporama" (projeté, réponses à main levée / ardoise) qui ne dépend d'aucun réseau.
  function createHost(onStudentJoin, onAnswer, onError) {
    if (typeof Peer === 'undefined') {
      onError && onError(new Error('La librairie PeerJS n’a pas pu être chargée (pas de connexion internet ?). Le mode à distance est indisponible ; utilisez le mode diaporama.'));
      return null;
    }
    const code = 'cdp-' + Math.random().toString(36).slice(2, 8);
    const peer = new Peer(code);
    const connections = {};
    peer.on('open', () => {});
    peer.on('connection', (conn) => {
      conn.on('open', () => {});
      conn.on('data', (data) => {
        if (data.type === 'join') {
          connections[conn.peer] = { conn, pseudo: data.pseudo || 'Élève' };
          onStudentJoin && onStudentJoin(conn.peer, data.pseudo);
        } else if (data.type === 'answer') {
          onAnswer && onAnswer(conn.peer, data.choiceIndex, data.timeMs);
        }
      });
      conn.on('close', () => { delete connections[conn.peer]; });
    });
    peer.on('error', (err) => { onError && onError(err); });
    return {
      code, peer, connections,
      broadcast(msg) { Object.values(connections).forEach(c => { try { c.conn.send(msg); } catch (e) {} }); },
      destroy() { try { peer.destroy(); } catch (e) {} },
    };
  }

  return { loadIndex, loadQuiz, saveScore, getScores, createHost };
})();
