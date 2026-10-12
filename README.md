# WordQuest

WordQuest is a responsive Hangman game built with React, Vite, CSS, and a Node.js API. It includes category and difficulty filters, a shared daily challenge, hints, keyboard input, sound, level progression, account-based stats, a server leaderboard, and per-account game history.

The backend stores accounts, player scores, and game history in the MongoDB database named `wordquest`. Passwords are stored as salted hashes. Registered players can log in from the header, and their day streak increases once per UTC calendar day when they finish a game. On the first successful start, existing data in `backend/data/store.json` is imported into MongoDB without removing that local file.

The frontend and backend can be hosted as separate services. The backend uses port `4002` locally because port `4001` is already occupied on this computer; deployment hosts provide `PORT` automatically.

## Run locally

Install the frontend dependencies from the project root and the backend dependencies in its folder:

```bash
npm install
npm --prefix backend install
```

Set `MONGODB_URI` in `backend/.env` to your MongoDB connection string before starting the backend. Keep this file private and do not commit it.

Start the backend in one terminal:

```bash
npm run server
```

Start the frontend in another terminal:

```bash
npm run dev
```

Open the local URL printed by Vite. The API health endpoint is `http://localhost:4002/api/health`.

Create a production frontend build with:

```bash
npm run build
```

## Host frontend and backend separately

For the frontend static site, use the repository root, build command `npm install && npm run build`, and publish directory `frontend/dist`. Set `VITE_API_URL` to the backend's public HTTPS origin, such as `https://your-api.example`.

For the backend Node.js service, set its root directory to `backend`, install dependencies with `npm install`, and use `npm start` as the start command. Add `MONGODB_URI` and `FRONTEND_URL` to its environment settings. Set `FRONTEND_URL` to the exact public frontend origin, such as `https://your-site.example`, and allow the backend host to connect to MongoDB Atlas.

The local frontend uses Vite's `/api` proxy automatically. For production, `VITE_API_URL` sends requests to the separately hosted backend, and the backend allows that frontend origin through CORS.

## Project structure

- `frontend/index.html` is the Vite entry point.
- `frontend/src/main.jsx` contains the game and interface.
- `frontend/styles.css` contains the visual styles.
- `frontend/vite.config.js` configures Vite and proxies `/api` requests to the backend.
- `backend/index.js` provides registration, login, daily streaks, and game APIs backed by MongoDB, with CORS configured for the hosted frontend.
- `backend/package.json` manages backend dependencies and start commands. The root `package.json` runs the frontend and backend scripts.
