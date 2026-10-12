# WordQuest — Modern Hangman Game

[![Live Demo](https://img.shields.io/badge/Demo-Live%20Website-success?style=for-the-badge&logo=github)](https://avishkamadusanka.github.io/wordquest-hangman/)
[![GitHub Repo](https://img.shields.io/badge/GitHub-Repository-blue?style=for-the-badge&logo=github)](https://github.com/AvishkaMadusanka/wordquest-hangman)
[![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19.x-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-Backend%20API-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)

An interactive, responsive Hangman web application designed with a retro-modern editorial aesthetic, procedural Web Audio cues, daily seeded challenges, and an optional full-stack backend with MongoDB streak tracking and leaderboards.

---

## 🔗 Quick Links

- **Live Deployed Website:** [https://avishkamadusanka.github.io/wordquest-hangman/](https://avishkamadusanka.github.io/wordquest-hangman/)
- **GitHub Repository:** [https://github.com/AvishkaMadusanka/wordquest-hangman](https://github.com/AvishkaMadusanka/wordquest-hangman)

---

## 🌟 Key Features

1. **Rich Interactive Gameplay**
   - **Category & Difficulty Filters:** Words categorized by Nature, Animals, Adventure, Music, Culture, Technology, and Countries, across Easy, Medium, and Hard tiers.
   - **Daily Challenge:** A unique word each UTC day deterministically seeded from the calendar date.
   - **Interactive SVG Gallows:** Real-time visual hangman progression rendered cleanly via scalable vector graphics.
   - **Virtual Keyboard & Physical Typing:** Full support for onscreen tapping as well as physical keyboard inputs with automatic key state detection.
   - **In-Game Hints:** Smart reveals with difficulty-scaled penalty adjustments.

2. **Web Audio Synthesizer Engine**
   - Zero-dependency sound effects generated directly in the browser using the **Web Audio API** (Oscillator + Gain nodes).
   - Dynamic victory chimes, correct guess tones, and subtle ambient chords with user toggle controls.

3. **Hybrid Architecture (Offline-First + Cloud-Enabled)**
   - **Offline Standalone Mode:** Runs 100% in the browser using `localStorage` for streaks, statistics, and game history when the backend is offline.
   - **Cloud Sync Mode:** When connected to the backend API, enables registered accounts, salted password hashing, cloud streak tracking, and a global leaderboard.

---

## 🛠️ Tech Stack & Implementation Overview

| Component | Technology | Responsibility |
| :--- | :--- | :--- |
| **Frontend Framework** | **React 19** | Declarative state management, reactive keyboard and game loops |
| **Build Tool** | **Vite 8** | High-performance bundling, Hot Module Replacement (HMR), static distribution |
| **Styling** | **Vanilla CSS3** | Custom design tokens, CSS variables, glassmorphism, light/dark themes, responsive grid/flexbox layouts |
| **Backend API** | **Node.js (HTTP / Express-style)** | Custom REST API server handling authentication, stats, and game sessions |
| **Database** | **MongoDB / Mongoose** | Persistent storage for accounts, streaks, and match outcomes |
| **Deployment & CI/CD** | **GitHub Actions + GitHub Pages** | Automated build pipeline (`npm run build`) and static artifact deployment |

### Implementation Highlights

- **Relative Asset Resolution:** Vite is configured with `base: "./"` in `frontend/vite.config.js` to ensure assets load properly under any nested sub-path (such as GitHub Pages' `/wordquest-hangman/`).
- **Resilient API Handling:** The frontend checks the API health endpoint; if unavailable, it seamlessly falls back to offline mode without interrupting gameplay.
- **Automated CI/CD:** `.github/workflows/deploy.yml` triggers on pushes to `main`, installing dependencies, building the static React bundle, and deploying to GitHub Pages.

---

## 🚀 Setup & Local Development Instructions

### Prerequisites
- [Node.js](https://nodejs.org/) (version 20 or higher recommended)
- [npm](https://www.npmjs.com/) (version 10 or higher)
- *(Optional)* [MongoDB Atlas](https://www.mongodb.com/atlas) connection URI if running the backend server.

### 1. Clone the Repository
```bash
git clone https://github.com/AvishkaMadusanka/wordquest-hangman.git
cd wordquest-hangman
```

### 2. Install Dependencies
Install dependencies for the root/frontend and the backend:
```bash
# Install frontend dependencies
npm install

# Install backend dependencies
npm --prefix backend install
```

### 3. Configure Environment Variables (Optional for Backend)
If you wish to run the Node.js API with database storage:
1. Copy the example file in the `backend/` directory:
   ```bash
   cp backend/.env.example backend/.env
   ```
2. Open `backend/.env` and supply your MongoDB connection string:
   ```env
   PORT=4002
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/wordquest?retryWrites=true&w=majority
   FRONTEND_URL=http://localhost:5173
   ```

### 4. Run the Application Locally

#### Option A: Run Frontend Only (Offline Game Mode)
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

#### Option B: Run Full Stack (Frontend + Backend)
Open two separate terminal windows:

- **Terminal 1 (Backend API):**
  ```bash
  npm run server
  ```
  The API will start at `http://localhost:4002` (Health check: `http://localhost:4002/api/health`).

- **Terminal 2 (Frontend Client):**
  ```bash
  npm run dev
  ```
  Open [http://localhost:5173](http://localhost:5173). The frontend automatically proxies `/api` requests to the backend.

### 5. Build for Production
To create an optimized production build of the static frontend:
```bash
npm run build
```
The compiled output will be generated in `frontend/dist/`.

---

## 🌐 Deployment Instructions

### Frontend (GitHub Pages)
The repository contains an automated GitHub Actions workflow (`.github/workflows/deploy.yml`):
1. Push your changes to the `main` branch.
2. In your GitHub repository, navigate to **Settings** > **Pages**.
3. Under **Build and deployment** > **Source**, choose **GitHub Actions**.
4. The site deploys automatically on every push to `main`.

### Backend (Render / Railway / Cloud Provider)
To host the Node.js backend:
1. Deploy as a Web Service (e.g. on [Render.com](https://render.com)).
2. Set the **Root Directory** to `backend`.
3. Set the **Build Command** to `npm install` and **Start Command** to `npm start`.
4. Add the following Environment Variables in the provider dashboard:
   - `MONGODB_URI`: Your MongoDB connection URI.
   - `FRONTEND_URL`: `https://avishkamadusanka.github.io`
5. On the frontend host, configure `VITE_API_URL` to point to your backend service URL.

---

## 📂 Project Directory Structure

```plaintext
wordquest-hangman/
├── .github/
│   └── workflows/
│       └── deploy.yml        # GitHub Actions CI/CD deployment pipeline
├── backend/
│   ├── data/
│   │   └── store.json        # Initial offline data fallback
│   ├── index.js              # Node.js REST API & MongoDB models
│   ├── package.json          # Backend dependencies & scripts
│   └── .env.example          # Sample environment configuration
├── frontend/
│   ├── src/
│   │   └── main.jsx          # React app root, game state & audio synthesis
│   ├── index.html            # Vite HTML entry point
│   ├── styles.css            # Responsive layout & theme styles
│   └── vite.config.js        # Vite configuration (base: "./", proxy)
├── package.json              # Root package config & orchestration scripts
└── README.md                 # Project documentation
```

---

## 📄 License
This project is open source and available under the [MIT License](LICENSE).
