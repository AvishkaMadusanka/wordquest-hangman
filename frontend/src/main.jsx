import { StrictMode, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "../styles.css";

const LIVE_API_URL = "https://wordquest-hangman-production.up.railway.app";
const API_BASE_URL = (import.meta.env.VITE_API_URL || (import.meta.env.PROD ? LIVE_API_URL : "")).replace(/\/+$/, "");
const apiUrl = (path) => `${API_BASE_URL}${path}`;

const WORDS = [
  { word: "MEADOW", category: "Nature", icon: "✦", difficulty: "Medium", hint: "A field of grass and wildflowers." },
  { word: "THUNDER", category: "Nature", icon: "ϟ", difficulty: "Medium", hint: "A loud rumble after a flash in the sky." },
  { word: "ORCHARD", category: "Nature", icon: "✿", difficulty: "Medium", hint: "A place where fruit trees grow." },
  { word: "COMPASS", category: "Adventure", icon: "✧", difficulty: "Medium", hint: "It always helps you find your way." },
  { word: "JOURNEY", category: "Adventure", icon: "➵", difficulty: "Medium", hint: "The act of traveling from one place to another." },
  { word: "TUNNEL", category: "Adventure", icon: "➵", difficulty: "Medium", hint: "A passage through or under something." },
  { word: "MARIMBA", category: "Music", icon: "♪", difficulty: "Medium", hint: "A wooden percussion instrument with bars." },
  { word: "MELODY", category: "Music", icon: "♪", difficulty: "Medium", hint: "A sequence of notes that sounds musical." },
  { word: "RHYTHM", category: "Music", icon: "♫", difficulty: "Medium", hint: "The pattern of beats in music." },
  { word: "CINEMA", category: "Culture", icon: "▣", difficulty: "Medium", hint: "A place where moving pictures are shown." },
  { word: "MUSEUM", category: "Culture", icon: "◇", difficulty: "Medium", hint: "A building where fascinating things are kept." },
  { word: "NOVEL", category: "Culture", icon: "▤", difficulty: "Easy", hint: "A long fictional story in book form." },
  { word: "TIGER", category: "Animals", icon: "◈", difficulty: "Easy", hint: "A striped big cat and powerful hunter." },
  { word: "PENGUIN", category: "Animals", icon: "◈", difficulty: "Medium", hint: "A flightless bird that loves cold seas." },
  { word: "BUTTERFLY", category: "Animals", icon: "◈", difficulty: "Hard", hint: "An insect with colorful wings." },
  { word: "ROBOT", category: "Technology", icon: "⌘", difficulty: "Easy", hint: "A machine that can carry out instructions." },
  { word: "ALGORITHM", category: "Technology", icon: "⌘", difficulty: "Hard", hint: "A clear set of steps for solving a problem." },
  { word: "SATELLITE", category: "Technology", icon: "⌘", difficulty: "Hard", hint: "An object sent into orbit around a planet." },
  { word: "INDIA", category: "Countries", icon: "◎", difficulty: "Easy", hint: "A country known for the Taj Mahal." },
  { word: "BRAZIL", category: "Countries", icon: "◎", difficulty: "Medium", hint: "The largest country in South America." },
  { word: "AUSTRALIA", category: "Countries", icon: "◎", difficulty: "Hard", hint: "A country and continent surrounded by ocean." }
];
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const KEYBOARD_ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"].map((row) => row.split(""));
const HUMAN_PARTS = 6;
const CATEGORIES = ["All", "Animals", "Technology", "Countries", "Nature", "Adventure", "Music", "Culture"];
const DIFFICULTIES = ["All", "Easy", "Medium", "Hard"];
const LEVELS = { Easy: 1, Medium: 2, Hard: 3 };
const DIFFICULTY_POINTS = { Easy: 10, Medium: 20, Hard: 35 };
const INITIAL_STATS = { played: 0, won: 0, lost: 0, streak: 0, best: 0, score: 0 };

function randomWord(category = "All", difficulty = "All") {
  const categoryMatches = WORDS.filter((entry) => category === "All" || entry.category === category);
  const matches = categoryMatches.filter((entry) => difficulty === "All" || entry.difficulty === difficulty);
  const pool = matches.length ? matches : categoryMatches.length ? categoryMatches : WORDS;
  return pool[Math.floor(Math.random() * pool.length)];
}

function getDailyChallenge() {
  const date = new Date().toISOString().slice(0, 10);
  const seed = [...date].reduce((value, character) => (value * 31 + character.charCodeAt(0)) >>> 0, 7);
  return { date, entry: WORDS[seed % WORDS.length] };
}

function playTone(type) {
  try {
    const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioContext) return;
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const isPositive = type === "correct" || type === "win";
    oscillator.type = "sine";
    oscillator.frequency.value = type === "win" ? 660 : isPositive ? 520 : 180;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.06, context.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + (type === "win" ? 0.28 : 0.12));
    oscillator.connect(gain); gain.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + 0.3);
  } catch {
    // Sound is an enhancement and may be unavailable in restricted browsers.
  }
}

function createCalmMusic(musicRef) {
  if (musicRef.current) return;
  try {
    const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioContext) return;
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const notes = [220, 261.63, 329.63, 392, 329.63, 293.66, 246.94, 293.66];
    let noteIndex = 0;
    oscillator.type = "triangle";
    oscillator.frequency.value = notes[0];
    gain.gain.value = 0.018;
    oscillator.connect(gain); gain.connect(context.destination); oscillator.start();
    const timer = setInterval(() => {
      noteIndex = (noteIndex + 1) % notes.length;
      oscillator.frequency.exponentialRampToValueAtTime(notes[noteIndex], context.currentTime + 0.35);
    }, 1800);
    musicRef.current = { context, oscillator, gain, timer };
  } catch {
    // Background music is optional and may be unavailable in restricted browsers.
  }
}

function stopCalmMusic(musicRef) {
  const music = musicRef.current;
  if (!music) return;
  clearInterval(music.timer);
  musicRef.current = null;
  try {
    music.gain.gain.cancelScheduledValues(music.context.currentTime);
    music.gain.gain.setValueAtTime(0.0001, music.context.currentTime);
    music.oscillator.stop();
  } catch {
    // The oscillator may already be stopped during a fast category switch.
  }
  music.context.close().catch(() => {});
}

function difficultyForLevel(level) {
  if (level === 1) return "Easy";
  if (level === 2) return "Medium";
  return "Hard";
}

function readStats() {
  try {
    return { ...INITIAL_STATS, ...JSON.parse(localStorage.getItem("wordsmith-stats") || "null") };
  } catch {
    return INITIAL_STATS;
  }
}

function getPlayerId() {
  const savedId = localStorage.getItem("wordquest-player-id");
  if (savedId) return savedId;
  const playerId = globalThis.crypto?.randomUUID?.() || `guest-${Date.now()}`;
  localStorage.setItem("wordquest-player-id", playerId);
  return playerId;
}

function Header({ streak, account, darkMode, soundEnabled, onToggleTheme, onToggleSound, onOpenAccount, onLogout }) {
  return (
    <header className="topbar">
      <a className="brand" href="./" aria-label="WordQuest home">
        <span className="brand-mark" aria-hidden="true">W</span>
        <span>wordquest<span className="brand-dot">.</span></span>
      </a>
      <div className="top-actions">
        {account ? <button className="account-button" type="button" onClick={onLogout}>{account.name} · Log out</button> : <button className="account-button" type="button" onClick={onOpenAccount}>Log in</button>}
        <div className="streak-pill"><span className="fire" aria-hidden="true">✦</span><span><b>{streak}</b> day streak</span></div>
        <button className="icon-button" type="button" onClick={onToggleSound} aria-label={`${soundEnabled ? "Stop" : "Play"} sound effects`} title="Toggle sound">{soundEnabled ? "♩" : "♫"}</button>
        <button className="icon-button" type="button" onClick={onToggleTheme} aria-label={`Switch to ${darkMode ? "light" : "dark"} theme`} title="Toggle theme">◐</button>
      </div>
    </header>
  );
}

function AccountModal({ onClose, onSuccess }) {
  const [mode, setMode] = useState("login");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch(apiUrl(`/api/auth/${mode === "login" ? "login" : "register"}`), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      const isJson = response.headers.get("content-type")?.includes("application/json");
      const data = isJson ? await response.json() : {};
      if (!response.ok) throw new Error(data.error || "Unable to reach server. Please try again.");
      onSuccess(data);
    } catch (requestError) {
      setError(requestError.message || "Unable to connect to the server.");
    } finally {
      setBusy(false);
    }
  };
  return <div className="account-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="account-dialog" role="dialog" aria-modal="true" aria-labelledby="account-title">
      <button className="close-modal" type="button" onClick={onClose} aria-label="Close">×</button>
      <p className="eyebrow">WordQuest Account</p>
      <h2 id="account-title">{mode === "login" ? "Welcome back" : "Create an account"}</h2>
      <p className="account-copy">Play every day to build and save your day streak.</p>
      <form className="account-form" onSubmit={submit}>
        {mode === "register" && <label>Name<input name="name" autoComplete="name" required minLength="2" maxLength="40" /></label>}
        <label>Email<input name="email" type="email" autoComplete="email" required /></label>
        <label>Password<input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength="8" maxLength="128" /></label>
        {error && <p className="account-error" role="alert">{error}</p>}
        <button className="new-game-button" type="submit" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}</button>
      </form>
      <button className="account-switch" type="button" onClick={() => { setError(""); setMode(mode === "login" ? "register" : "login"); }}>{mode === "login" ? "New here? Create an account" : "Already have an account? Log in"}</button>
    </section>
  </div>;
}

function Keyboard({ guessed, word, onGuess }) {
  return (
    <div className="keyboard" aria-label="Letter keyboard">
      {KEYBOARD_ROWS.map((row, rowIndex) => <div className={`keyboard-row row-${rowIndex + 1}`} key={row.join("")}>
        {row.map((letter) => {
          const isGuessed = guessed.has(letter);
          const state = isGuessed ? (word.includes(letter) ? "correct" : "wrong") : "";
          return <button className={`key ${state}`} data-letter={letter} disabled={isGuessed} key={letter} type="button" onClick={() => onGuess(letter)}>{letter}</button>;
        })}
      </div>)}
    </div>
  );
}

function HangmanFigure({ misses, maxMistakes, message }) {
  const visibleParts = misses >= maxMistakes ? HUMAN_PARTS : Math.min(HUMAN_PARTS - 1, misses);
  return (
    <div className="hangman-stage" aria-label={`Hangman drawing, ${misses} incorrect guesses`}>
      <svg viewBox="0 0 280 240" role="img" aria-label="Hangman illustration">
        <path className="gallows" d="M42 212h192M72 212V28h116M72 54h48M188 28v31" />
        <circle className={`hangman-part ${visibleParts >= 1 ? "visible" : ""}`} cx="188" cy="82" r="25" />
        <path className={`hangman-part ${visibleParts >= 2 ? "visible" : ""}`} d="M188 107v57" />
        <path className={`hangman-part ${visibleParts >= 3 ? "visible" : ""}`} d="M188 120l-31 34" />
        <path className={`hangman-part ${visibleParts >= 4 ? "visible" : ""}`} d="M188 120l31 34" />
        <path className={`hangman-part ${visibleParts >= 5 ? "visible" : ""}`} d="M188 164l-25 36" />
        <path className={`hangman-part ${visibleParts >= 6 ? "visible" : ""}`} d="M188 164l25 36" />
      </svg>
      <div className="stage-message">{message || (misses === 0 ? `Your word is waiting. ${maxMistakes} chances.` : `${misses} of ${maxMistakes} mistakes.`)}</div>
    </div>
  );
}

function StatsCard({ stats }) {
  const winRate = stats.played ? Math.round((stats.won / stats.played) * 100) : 0;
  return (
    <div className="stats-card">
      <div className="stats-heading"><span>Player statistics</span><span className="score-total"><b>{stats.score}</b> pts</span></div>
      <div className="stat-grid">
        <div><strong>{stats.played}</strong><span>Played</span></div>
        <div><strong>{stats.won}</strong><span>Won</span></div>
        <div><strong>{stats.lost}</strong><span>Losses</span></div>
      </div>
      <div className="stats-footer"><div className="win-rate"><span>Win rate</span><strong>{winRate}%</strong></div><div className="win-rate"><span>Best streak</span><strong>{stats.best}</strong></div></div>
    </div>
  );
}

function HistoryCard({ games, online }) {
  return (
    <section className="history-card" aria-label="Game history">
      <div className="stats-heading"><span>Game history</span><span className={`server-status ${online ? "online" : "offline"}`}>{online ? "Saved" : "Offline"}</span></div>
      {games.length ? <ol className="history-list">{games.map((game) => <li key={game.id}>
        <span className={`history-result ${game.outcome}`}>{game.outcome === "won" ? "Won" : "Lost"}</span>
        <span className="history-word"><strong>{game.word}</strong><small>{game.mode === "daily" ? `Daily challenge / ${game.challengeDate}` : `${game.category} · ${game.difficulty}`}</small></span>
        <b>{game.score} pts</b>
      </li>)}</ol> : <p className="empty-state">{online ? "No games recorded yet." : "Game history appears when the server is online."}</p>}
    </section>
  );
}

function LeaderboardCard({ players, online }) {
  return (
    <section className="leaderboard-card" aria-label="Player leaderboard">
      <div className="stats-heading"><span>Server leaderboard</span><span className={`server-status ${online ? "online" : "offline"}`}>{online ? "Online" : "Offline"}</span></div>
      {players.length ? <ol className="leaderboard-list">{players.map((player) => <li key={player.id}><span>#{player.rank}</span><strong>{player.name}</strong><b>{player.score} pts</b></li>)}</ol> : <p className="empty-state">{online ? "No player scores yet." : "Start the backend with npm run server."}</p>}
    </section>
  );
}

function ResultModal({ result, word, streak, level, daily, onClose, onNewGame }) {
  if (!result) return null;
  const won = result === "won";
  return (
    <div className="result-modal" role="dialog" aria-modal="true" aria-labelledby="result-title">
      <div className="result-dialog">
        <button className="close-modal" type="button" onClick={onClose} aria-label="Close result">×</button>
        <div className="result-icon">{won ? "✦" : "○"}</div>
        <p className="eyebrow">{won ? "A word well found" : "The word got away"}</p>
        <h2 id="result-title">{won ? "You got it!" : "So close."}</h2>
        <p className="result-copy">The word was <strong>{word.toLowerCase()}</strong>. {daily ? "Daily challenge complete. " : ""}{won ? `You advanced to Level ${level}. Your streak is now ${streak}.` : `Stay on Level ${level}. Another task is waiting.`}</p>
        <button className="new-game-button" type="button" onClick={onNewGame}>Play again <span aria-hidden="true">→</span></button>
      </div>
    </div>
  );
}

function App() {
  const [current, setCurrent] = useState(() => randomWord("All", "Easy"));
  const [gameMode, setGameMode] = useState("classic");
  const [challengeDate, setChallengeDate] = useState(null);
  const [gameLevel, setGameLevel] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedDifficulty, setSelectedDifficulty] = useState("All");
  const [guessed, setGuessed] = useState(() => new Set());
  const [misses, setMisses] = useState(0);
  const [hintsLeft, setHintsLeft] = useState(1);
  const [hintShown, setHintShown] = useState(false);
  const [stats, setStats] = useState(readStats);
  const [result, setResult] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [musicPlaying, setMusicPlaying] = useState(true);
  const calmMusicRef = useRef(null);
  const [playerId] = useState(getPlayerId);
  const [leaderboard, setLeaderboard] = useState([]);
  const [backendOnline, setBackendOnline] = useState(false);
  const [remotePlayer, setRemotePlayer] = useState(null);
  const [gameHistory, setGameHistory] = useState([]);
  const [account, setAccount] = useState(null);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const maxMistakes = current.word.length;
  const authToken = () => localStorage.getItem("wordquest-auth-token");

  const acceptAuth = ({ token, account: signedInAccount }) => {
    localStorage.setItem("wordquest-auth-token", token);
    setAccount(signedInAccount);
    setAccountModalOpen(false);
  };

  const logout = async () => {
    const token = authToken();
    try { if (token) await fetch(apiUrl("/api/auth/logout"), { method: "POST", headers: { Authorization: `Bearer ${token}` } }); } catch { /* Clear local session if offline. */ }
    localStorage.removeItem("wordquest-auth-token");
    setAccount(null);
  };

  const toggleMusic = () => {
    if (musicPlaying) stopCalmMusic(calmMusicRef);
    setMusicPlaying((value) => !value);
  };

  const startGame = (category = selectedCategory, difficulty = selectedDifficulty, mode = "classic") => {
    const daily = mode === "daily" ? getDailyChallenge() : null;
    const chosen = daily?.entry || randomWord(category, difficulty === "All" ? difficultyForLevel(gameLevel) : difficulty);
    setCurrent(chosen);
    setGameMode(mode);
    setChallengeDate(daily?.date || null);
    if (daily) {
      setSelectedCategory("All");
      setSelectedDifficulty(chosen.difficulty);
      setGameLevel(LEVELS[chosen.difficulty]);
    }
    setGuessed(new Set());
    setMisses(0);
    setHintsLeft(1);
    setHintShown(false);
    setResult(null);
  };

  const restartGame = () => {
    setStats(INITIAL_STATS);
    startGame();
  };

  const finishGame = (nextResult) => {
    const scoreEarned = nextResult === "won"
      ? Math.max(5, DIFFICULTY_POINTS[current.difficulty] + (maxMistakes - misses) * 5 - (hintsLeft ? 0 : 5))
      : 0;
    if (nextResult === "won") {
      const nextLevel = Math.min(3, gameLevel + 1);
      setGameLevel(nextLevel);
      setSelectedDifficulty(difficultyForLevel(nextLevel));
    }
    setStats((previous) => {
      const nextStats = { ...previous, played: previous.played + 1 };
      if (nextResult === "won") {
        nextStats.won += 1;
        nextStats.streak += 1;
        nextStats.best = Math.max(nextStats.best, nextStats.streak);
        nextStats.score += scoreEarned;
      } else {
        nextStats.lost += 1;
        nextStats.streak = 0;
      }
      return nextStats;
    });
    setResult(nextResult);
    if (soundEnabled) playTone(nextResult === "won" ? "win" : "lost");
    if (!authToken()) return;
    fetch(apiUrl("/api/games"), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(authToken() ? { Authorization: `Bearer ${authToken()}` } : {}) },
      body: JSON.stringify({ playerId, word: current.word, category: current.category, difficulty: current.difficulty, outcome: nextResult, score: scoreEarned, mode: gameMode, challengeDate })
    }).then(async (response) => {
      if (!response.ok) throw new Error("Backend request failed");
      const data = await response.json();
      setLeaderboard(data.leaderboard || []);
      if (data.player) setRemotePlayer(data.player);
      if (data.account) setAccount(data.account);
      if (data.account) fetch(apiUrl(`/api/history/${encodeURIComponent(data.account.id)}?limit=8`), { headers: { Authorization: `Bearer ${authToken()}` } }).then(async (historyResponse) => {
        if (historyResponse.ok) setGameHistory(await historyResponse.json());
      }).catch(() => {});
      setBackendOnline(true);
    }).catch(() => setBackendOnline(false));
  };

  const guess = (letter) => {
    if (result || guessed.has(letter)) return;
    const nextGuessed = new Set(guessed).add(letter);
    const nextMisses = current.word.includes(letter) ? misses : misses + 1;
    if (soundEnabled) playTone(current.word.includes(letter) ? "correct" : "wrong");
    setGuessed(nextGuessed);
    setMisses(nextMisses);
    if (current.word.split("").every((character) => nextGuessed.has(character))) finishGame("won");
    else if (nextMisses >= maxMistakes) finishGame("lost");
  };

  useEffect(() => { localStorage.setItem("wordsmith-stats", JSON.stringify(stats)); }, [stats]);
  useEffect(() => {
    const token = authToken();
    if (!token) return;
    fetch(apiUrl("/api/auth/me"), { headers: { Authorization: `Bearer ${token}` } }).then(async (response) => {
      if (!response.ok) throw new Error("Session expired");
      setAccount(await response.json());
    }).catch(() => { localStorage.removeItem("wordquest-auth-token"); });
  }, []);
  useEffect(() => {
    let active = true;
    if (!account) {
      setRemotePlayer(null);
      setGameHistory([]);
      return () => { active = false; };
    }
    const currentPlayerId = account.id;
    const headers = { Authorization: `Bearer ${authToken()}` };
    Promise.all([
      fetch(apiUrl(`/api/stats/${encodeURIComponent(currentPlayerId)}`), { headers }).then((response) => response.ok ? response.json() : null),
      fetch(apiUrl(`/api/history/${encodeURIComponent(currentPlayerId)}?limit=8`), { headers }).then((response) => response.ok ? response.json() : [])
    ]).then(([player, history]) => {
      if (active) {
        setRemotePlayer(player);
        setGameHistory(history);
      }
    }).catch(() => {});
    return () => { active = false; };
  }, [account?.id, playerId]);
  useEffect(() => {
    let active = true;
    if (!account) {
      setLeaderboard([]);
      setBackendOnline(false);
      return () => { active = false; };
    }
    const refreshLeaderboard = async () => {
      try {
        const headers = { Authorization: `Bearer ${authToken()}` };
        const [healthResponse, boardResponse] = await Promise.all([fetch(apiUrl("/api/health")), fetch(apiUrl("/api/leaderboard"), { headers })]);
        if (!healthResponse.ok || !boardResponse.ok) throw new Error("Backend request failed");
        const data = await boardResponse.json();
        if (active) {
          setLeaderboard(data);
          setBackendOnline(true);
        }
      } catch {
        if (active) setBackendOnline(false);
      }
    };
    refreshLeaderboard();
    const timer = setInterval(refreshLeaderboard, 5000);
    return () => { active = false; clearInterval(timer); };
  }, [account?.id]);
  useEffect(() => {
    if (selectedCategory === "Music" && soundEnabled && musicPlaying) createCalmMusic(calmMusicRef);
    else stopCalmMusic(calmMusicRef);
    return () => stopCalmMusic(calmMusicRef);
  }, [selectedCategory, soundEnabled, musicPlaying]);
  useEffect(() => {
    const handleKeyDown = (event) => {
      const letter = event.key.toUpperCase();
      if (/^[A-Z]$/.test(letter)) guess(letter);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  });

  return (
    <div className={`theme-root ${darkMode ? "dark" : ""}`}>
      <div className="page-shell">
        <Header streak={account?.streak ?? stats.streak} account={account} onOpenAccount={() => setAccountModalOpen(true)} onLogout={logout} darkMode={darkMode} soundEnabled={soundEnabled} onToggleTheme={() => setDarkMode((value) => !value)} onToggleSound={() => { if (soundEnabled) stopCalmMusic(calmMusicRef); setSoundEnabled((value) => !value); }} />
        <main>
          <section className="intro-row"><div><p className="eyebrow">The daily word ritual</p><h1>Guess the word.<br /><em>Beat the challenge.</em></h1></div><div className="intro-note"><span className="note-line"></span><div><p>Every guess is a little clue.<br />Make them count.</p><button className="daily-challenge-button" type="button" onClick={() => startGame("All", "All", "daily")}>Play today&apos;s daily challenge <span aria-hidden="true">→</span></button></div></div></section>
          <section className="game-layout" aria-label="Hangman game">
            <div className="play-panel">
              <div className="game-controls"><label className="select-control"><span>Category</span><select value={selectedCategory} onChange={(event) => { setSelectedCategory(event.target.value); setMusicPlaying(event.target.value === "Music"); startGame(event.target.value, selectedDifficulty); }}>{CATEGORIES.map((category) => <option key={category} value={category}>{category === "All" ? "All categories" : category}</option>)}</select></label><div className="difficulty-control"><span>Difficulty</span><div className="difficulty-options">{DIFFICULTIES.map((difficulty) => <button className={selectedDifficulty === difficulty ? "active" : ""} key={difficulty} type="button" onClick={() => { setSelectedDifficulty(difficulty); if (difficulty !== "All") setGameLevel(LEVELS[difficulty]); startGame(selectedCategory, difficulty); }}>{difficulty === "All" ? "All levels" : difficulty}</button>)}</div></div></div>
              <div className="panel-topline"><div className="category-label"><span className="category-icon">{current.icon}</span><span>{current.category}</span><span className="level-badge">LEVEL {gameLevel} <b>{current.difficulty}</b></span>{gameMode === "daily" && <span className="daily-mode-badge">DAILY · {challengeDate}</span>}</div><div className="panel-actions">{selectedCategory === "Music" && <button className="music-toggle" type="button" disabled={!soundEnabled} onClick={toggleMusic}>{musicPlaying ? "Stop music" : "Play music"}</button>}<button className="hint-button" type="button" disabled={!hintsLeft || Boolean(result)} onClick={() => { setHintsLeft(0); setHintShown(true); }}><span aria-hidden="true">&#x2727;</span> Hint <span className="hint-count">{hintsLeft}</span></button></div></div>
              <div className="word-wrap"><p className="word-label">Mystery word</p><div className="word" aria-live="polite">{current.word.split("").map((letter, index) => <span className="letter-slot" key={`${letter}-${index}`}>{guessed.has(letter) ? letter : ""}</span>)}</div><p className="word-length">{current.word.length} letters</p></div>
              <Keyboard guessed={guessed} word={current.word} onGuess={guess} />
              <p className="keyboard-note">Type on your keyboard or tap a letter above</p>
            </div>
            <aside className="side-column"><div className="figure-card"><div className="figure-header"><span>Attempts left</span><strong>{maxMistakes - misses}</strong></div><div className="progress-track"><span style={{ width: `${((maxMistakes - misses) / maxMistakes) * 100}%` }}></span></div><HangmanFigure misses={misses} maxMistakes={maxMistakes} message={hintShown ? current.hint : ""} /></div><StatsCard stats={remotePlayer ? { played: remotePlayer.played, won: remotePlayer.wins, lost: remotePlayer.losses, score: remotePlayer.score, best: remotePlayer.bestStreak } : account ? { played: 0, won: 0, lost: 0, score: 0, best: 0 } : stats} /><button className="new-game-button" type="button" onClick={startGame}><span aria-hidden="true">&#x21BB;</span> New game</button><button className="restart-button" type="button" onClick={restartGame}><span aria-hidden="true">&#x21BA;</span> Restart</button></aside>
          </section>
          {account && <section className="records-layout" aria-label="Player records">
            <LeaderboardCard players={leaderboard} online={backendOnline} />
            <HistoryCard games={gameHistory} online={backendOnline} />
          </section>}
          <section className="quote-strip"><span className="quote-mark">&#x201C;</span><p>Words are, of course, the most powerful drug used by mankind.</p><span className="quote-author">&#x2014; Rudyard Kipling</span></section>
        </main>
        <footer><span>WORDQUEST / 2026</span><span>Made for curious minds</span></footer>
      </div>
      <ResultModal result={result} word={current.word} streak={stats.streak} level={gameLevel} daily={gameMode === "daily"} onClose={() => setResult(null)} onNewGame={startGame} />
      {accountModalOpen && <AccountModal onClose={() => setAccountModalOpen(false)} onSuccess={acceptAuth} />}
    </div>
  );
}

const rootContainer = document.getElementById("root");
const root = globalThis.__wordsmithRoot || createRoot(rootContainer);
globalThis.__wordsmithRoot = root;
root.render(<StrictMode><App /></StrictMode>);
