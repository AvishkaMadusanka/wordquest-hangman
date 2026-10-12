import { createServer } from "node:http";
import { randomUUID, scrypt as scryptCallback, randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import dotenv from "dotenv";

const backendDir = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(backendDir, ".env") });
const scrypt = promisify(scryptCallback);
const port = Number(process.env.PORT || 4002);
const localStorePath = join(backendDir, "data", "store.json");
const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "https://avishkamadusanka.github.io",
  ...(process.env.FRONTEND_URL || "").split(",").map((origin) => origin.trim()).filter(Boolean)
]);

const accountSchema = new mongoose.Schema({
  accountId: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true },
  salt: { type: String, required: true },
  passwordHash: { type: String, required: true, select: false },
  sessionHashes: { type: [String], default: [] },
  streak: { type: Number, default: 0 },
  bestDayStreak: { type: Number, default: 0 },
  lastActiveDate: { type: String, default: null }
}, { timestamps: true });

const playerSchema = new mongoose.Schema({
  playerId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  played: { type: Number, default: 0 },
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  score: { type: Number, default: 0 },
  streak: { type: Number, default: 0 },
  bestStreak: { type: Number, default: 0 },
  lastPlayed: { type: String, default: null }
}, { timestamps: true });

const gameSchema = new mongoose.Schema({
  gameId: { type: String, required: true, unique: true },
  playerId: { type: String, required: true, index: true },
  playerName: { type: String, required: true },
  word: { type: String, required: true },
  category: { type: String, default: "" },
  difficulty: { type: String, default: "" },
  mode: { type: String, enum: ["classic", "daily"], default: "classic" },
  challengeDate: { type: String, default: null },
  outcome: { type: String, enum: ["won", "lost"], required: true },
  score: { type: Number, default: 0 },
  playedAt: { type: String, required: true }
}, { timestamps: true });

const Account = mongoose.models.Account || mongoose.model("Account", accountSchema);
const Player = mongoose.models.Player || mongoose.model("Player", playerSchema);
const Game = mongoose.models.Game || mongoose.model("Game", gameSchema);

function send(response, status, value) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8"
  });
  response.end(value === null ? "null" : JSON.stringify(value));
}

function applyCors(request, response) {
  const origin = request.headers.origin;
  if (!origin) response.setHeader("Access-Control-Allow-Origin", "*");
  else if (allowedOrigins.has(origin)) {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Vary", "Origin");
  }
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

async function readBody(request) {
  let raw = "";
  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > 1_000_000) throw new Error("Request body too large");
  }
  return raw ? JSON.parse(raw) : {};
}

function publicAccount(account) {
  return {
    id: account.accountId,
    email: account.email,
    name: account.name,
    streak: account.streak || 0,
    bestDayStreak: account.bestDayStreak || 0,
    lastActiveDate: account.lastActiveDate || null
  };
}

function publicPlayer(player) {
  if (!player) return null;
  const { playerId, ...details } = player.toObject ? player.toObject() : player;
  return { id: playerId, ...details };
}

async function leaderboard() {
  const accountIds = await Account.distinct("accountId");
  const leaders = accountIds.length
    ? await Player.find({ playerId: { $in: accountIds } }).sort({ score: -1, wins: -1, name: 1 }).limit(10).lean()
    : [];
  return leaders.map(({ playerId, ...player }, index) => ({ id: playerId, rank: index + 1, ...player }));
}

async function getAccount(request) {
  const token = request.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  return Account.findOne({ sessionHashes: tokenHash });
}

async function makePasswordHash(password, salt = randomBytes(16).toString("hex")) {
  const derived = await scrypt(password, salt, 64);
  return { salt, hash: derived.toString("hex") };
}

async function createSession(account) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  account.sessionHashes.push(tokenHash);
  await account.save();
  return token;
}

async function migrateLocalData() {
  let saved;
  try {
    saved = JSON.parse(await readFile(localStorePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }

  let imported = 0;
  for (const account of saved.accounts || []) {
    await Account.updateOne({ accountId: account.id }, { $setOnInsert: {
      accountId: account.id, email: account.email, name: account.name, salt: account.salt,
      passwordHash: account.passwordHash, sessionHashes: account.sessionHashes || [],
      streak: account.streak || 0, bestDayStreak: account.bestDayStreak || 0, lastActiveDate: account.lastActiveDate || null
    } }, { upsert: true, runValidators: true });
    imported += 1;
  }
  for (const player of saved.players || []) {
    await Player.updateOne({ playerId: player.id }, { $setOnInsert: {
      playerId: player.id, name: player.name, played: player.played || 0, wins: player.wins || 0,
      losses: player.losses || 0, score: player.score || 0, streak: player.streak || 0,
      bestStreak: player.bestStreak || 0, lastPlayed: player.lastPlayed || null
    } }, { upsert: true, runValidators: true });
    imported += 1;
  }
  for (const game of saved.games || []) {
    await Game.updateOne({ gameId: game.id }, { $setOnInsert: {
      gameId: game.id, playerId: game.playerId, playerName: game.playerName, word: game.word,
      category: game.category || "", difficulty: game.difficulty || "", outcome: game.outcome,
      mode: game.mode === "daily" ? "daily" : "classic", challengeDate: game.challengeDate || null,
      score: game.score || 0, playedAt: game.playedAt
    } }, { upsert: true, runValidators: true });
    imported += 1;
  }
  if (imported) console.log(`Imported local accounts and game records into MongoDB (up to ${imported} records).`);
}

const server = createServer(async (request, response) => {
  console.log(`[HTTP] ${request.method} ${request.url}`);
  applyCors(request, response);
  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  try {
    if (request.method === "GET" && (url.pathname === "/api/health" || url.pathname === "/health" || url.pathname === "/")) {
      send(response, 200, { ok: true, service: "wordquest-api", storage: "mongodb", dbState: mongoose.connection.readyState === 1 ? "connected" : "connecting" });
      return;
    }

    if (request.method === "POST" && ["/api/auth/register", "/api/auth/login"].includes(url.pathname)) {
      const body = await readBody(request);
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8 || password.length > 128) {
        send(response, 400, { error: "Enter a valid email and a password with at least 8 characters." });
        return;
      }

      let account = await Account.findOne({ email }).select("+passwordHash");
      if (url.pathname.endsWith("register")) {
        if (account) {
          send(response, 409, { error: "An account with this email already exists." });
          return;
        }
        const name = String(body.name || "").trim().slice(0, 40);
        if (name.length < 2) {
          send(response, 400, { error: "Name must contain at least 2 characters." });
          return;
        }
        const { salt, hash } = await makePasswordHash(password);
        account = new Account({ accountId: randomUUID(), email, name, salt, passwordHash: hash });
      } else {
        if (!account) {
          send(response, 401, { error: "Email or password is incorrect." });
          return;
        }
        const { hash } = await makePasswordHash(password, account.salt);
        const expected = Buffer.from(account.passwordHash, "hex");
        const actual = Buffer.from(hash, "hex");
        if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
          send(response, 401, { error: "Email or password is incorrect." });
          return;
        }
      }
      const token = await createSession(account);
      send(response, url.pathname.endsWith("register") ? 201 : 200, { token, account: publicAccount(account) });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/auth/me") {
      const account = await getAccount(request);
      send(response, account ? 200 : 401, account ? publicAccount(account) : { error: "Please log in." });
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/auth/logout") {
      const token = request.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
      if (token) {
        const tokenHash = createHash("sha256").update(token).digest("hex");
        await Account.updateOne({ sessionHashes: tokenHash }, { $pull: { sessionHashes: tokenHash } });
      }
      send(response, 200, { ok: true });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/leaderboard") {
      const account = await getAccount(request);
      if (!account) {
        send(response, 401, { error: "Please log in to view the leaderboard." });
        return;
      }
      send(response, 200, await leaderboard());
      return;
    }
    if (request.method === "GET" && url.pathname.startsWith("/api/stats/")) {
      const playerId = decodeURIComponent(url.pathname.slice("/api/stats/".length));
      const account = await getAccount(request);
      if (!account || account.accountId !== playerId) {
        send(response, 401, { error: "Please log in to view these statistics." });
        return;
      }
      send(response, 200, publicPlayer(await Player.findOne({ playerId })));
      return;
    }
    if (request.method === "GET" && url.pathname.startsWith("/api/history/")) {
      const playerId = decodeURIComponent(url.pathname.slice("/api/history/".length));
      const account = await getAccount(request);
      if (!account || account.accountId !== playerId) {
        send(response, 401, { error: "Please log in to view this game history." });
        return;
      }
      const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 8, 1), 30);
      const history = await Game.find({ playerId }).sort({ playedAt: -1 }).limit(limit).lean();
      send(response, 200, history.map(({ gameId, ...game }) => ({ id: gameId, ...game })));
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/games") {
      const body = await readBody(request);
      const account = await getAccount(request);
      if (!account) {
        send(response, 401, { error: "Please log in to save your score." });
        return;
      }
      const playerId = account.accountId;
      const playerName = account.name;
      const word = String(body.word || "").trim().slice(0, 40);
      const outcome = body.outcome;
      if (!playerId || !word || !["won", "lost"].includes(outcome)) {
        send(response, 400, { error: "playerId, word, and a valid outcome are required" });
        return;
      }

      const score = Math.max(0, Number(body.score) || 0);
      const playedAt = new Date().toISOString();
      let player = await Player.findOne({ playerId });
      if (!player) player = new Player({ playerId, name: playerName });
      player.name = playerName;
      player.played += 1;
      player.lastPlayed = playedAt;
      if (outcome === "won") {
        player.wins += 1;
        player.streak += 1;
        player.bestStreak = Math.max(player.bestStreak, player.streak);
        player.score += score;
      } else {
        player.losses += 1;
        player.streak = 0;
      }
      await player.save();

      if (account) {
        const today = new Date().toISOString().slice(0, 10);
        if (account.lastActiveDate !== today) {
          const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
          account.streak = account.lastActiveDate === yesterday ? account.streak + 1 : 1;
          account.bestDayStreak = Math.max(account.bestDayStreak || 0, account.streak);
          account.lastActiveDate = today;
          await account.save();
        }
      }

      const mode = body.mode === "daily" ? "daily" : "classic";
      const challengeDate = mode === "daily" && /^\d{4}-\d{2}-\d{2}$/.test(body.challengeDate) ? body.challengeDate : null;
      await Game.create({ gameId: randomUUID(), playerId, playerName, word, category: String(body.category || "").slice(0, 40), difficulty: String(body.difficulty || "").slice(0, 20), mode, challengeDate, outcome, score, playedAt });
      send(response, 201, { player: publicPlayer(player), account: publicAccount(account), leaderboard: await leaderboard() });
      return;
    }

    send(response, 404, { error: "Route not found" });
  } catch (error) {
    console.error("API request failed:", error.message);
    if (error.code === 11000) {
      send(response, 409, { error: "An account with this email already exists." });
      return;
    }
    const status = error.message === "Request body too large" ? 413 : 400;
    send(response, status, { error: status === 413 ? error.message : "Invalid request" });
  }
});

console.log(`Starting WordQuest server on port ${port}...`);

server.listen(port, "0.0.0.0", () => {
  console.log(`WordQuest HTTP server listening on 0.0.0.0:${port}`);
});

const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URL || process.env.DATABASE_URL;

if (!mongoUri) {
  console.error("MONGODB_URI or MONGO_URL is missing. Please set it in Railway Variables.");
} else {
  const safeHost = mongoUri.includes("@") ? mongoUri.split("@")[1].split("/")[0] : "configured URI";
  console.log(`Connecting to MongoDB cluster (${safeHost})...`);
  mongoose.connect(mongoUri, { dbName: "wordquest", serverSelectionTimeoutMS: 8000 })
    .then(async () => {
      console.log("Successfully connected to MongoDB!");
      await migrateLocalData();
    })
    .catch((error) => {
      console.error("Could not connect to MongoDB:", error.message);
    });
}
