# PerfLens - Dynamic Website Performance Inspector

PerfLens is a complete, developer-friendly frontend performance inspector dashboard and telemetry analyzer. It runs deep static scans on public web domains, analyzing script payloads, image scaling coverage, stylesheet sizes, accessibility rules compliance, and search engine optimization markers to synthesize unified actionable roadmaps for engineering teams.

---

## Architecture Flow

```
                      +------------------+
                      |  React Frontend  |
                      |   (Vite + TS)    |
                      +--------+---------+
                               |  API Requests (CORS / JWT)
                               v
                      +--------+---------+
                      |   Express API    |
                      |  Gateway Server  |
                      +--------+---------+
                               |
         +---------------------+---------------------+
         | (Concurrent Sub-Analyzer Orchestration)   |
         v                                           v
+--------+--------+                         +--------+--------+
|   Puppeteer    |                         |  Google PageSpeed|
|  DOM Crawler   |                         |  Insights Engine |
+--------+--------+                         +-----------------+
         |
         +------------+------------+------------+------------+
         |            |            |            |            |
         v            v            v            v            v
    +----+----+  +----+----+  +----+----+  +----+----+  +----+----+
    |  Image  |  |   CSS   |  |   JS    |  |   SEO   |  |  A11y   |
    | Analyzer|  | Analyzer|  | Analyzer|  | Analyzer|  | Analyzer|
    +----+----+  +----+----+  +----+----+  +----+----+  +----+----+
         |            |            |            |            |
         +------------+------------+------------+------------+
                                   |
                                   v
                      +------------+------------+
                      |  Recommendation Engine  |
                      | ( roadmaps / road grades)|
                      +------------+------------+
                                   |
                                   v
                      +------------+------------+
                      |      MongoDB Atlas      |
                      |   Report Persistence    |
                      +-------------------------+
```

---

## Features

- **Automated Domain Crawling**: Utilizes Headless Puppeteer interfaces to inspect request waterfalls, download assets, and monitor response headers with zero client-side scripts.
- **Deep Code-Splitting Insights**: Evaluates JavaScript script elements, projecting CPU execution timelines, and cataloging duplicate package wrappers (like Moment or Lodash) to purge unneeded bytes.
- **CSS Selectors Coverage**: Analyzes global stylesheet rules to isolate render-blocking classes.
- **Image Optimization & Accessibility**: Audits missing `alt` attributes, sizes, and layout configurations.
- **Sitemap & SEO Compliance**: Scrapes Meta, Canonical, and OpenGraph tags to structure card preview models.
- **Actionable Optimization Roadmaps**: Compiles scores, assigns letter grades (A–F), ranks warnings by priority, and gives dynamic suggestions.
- **Persistent Saved Audits**: Fully secure REST persistence mapping reports and workspace containers to authenticated owners.

---

## Tech Stack

- **Frontend**: React (v19), TypeScript, Vite (v8), Recharts, Lucide Icons, Vanilla CSS
- **Backend**: Node.js, Express (v4), Mongoose (v8), Headless Puppeteer, TypeScript (via TSX execution)
- **Database**: MongoDB Atlas / local MongoDB
- **Security**: Helmet, CORS, Express Rate Limit, Express Validator, JWT Authentication

---

## Installation & Setup

### Prerequisites
- Node.js (v18+)
- MongoDB server running locally or a MongoDB Atlas URI

### Server Setup
1. Navigate to the server folder:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables inside `server/.env`:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://127.0.0.1:27017/perflens
   JWT_SECRET=your_production_secure_secret_key_here
   NODE_ENV=production
   ```
4. Start the server:
   ```bash
   npm run start
   ```

### Frontend Setup
1. Navigate back to the workspace root:
   ```bash
   cd ..
   ```
2. Install root dependencies:
   ```bash
   npm install
   ```
3. Run the development build:
   ```bash
   npm run dev
   ```
4. Build for production:
   ```bash
   npm run build
   ```

---

## Folder Structure

```
PerfLens/
├── dist/                          # Compiled Production Frontend static files
├── src/                           # React Frontend Source Code
│   ├── components/                # Reusable widgets (Sidebar, TopNav, etc.)
│   ├── context/                   # AppContext API integrations and mapper state
│   ├── pages/                     # Page views (Dashboard, Recommendations, etc.)
│   ├── App.tsx                    # Main App wrapper with Lazy-Loaded Segmented Suspense
│   └── index.css                  # Core CSS design tokens and style rules
├── server/                        # Node.js + Express Backend Source Code
│   ├── config/                    # MongoDB and environment validator hooks
│   ├── controllers/               # Express REST Route handlers
│   ├── middlewares/               # Rate limiters, error handlers, and JWT guards
│   ├── models/                    # Mongoose Report and User schema models
│   ├── routes/                    # Versioned endpoint router files
│   ├── services/                  # Sub-analyzer engines and recommendation modules
│   └── server.ts                  # Main server entrypoint
└── package.json                   # Root build scripts and workspace config
```

---

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Create user workspace (returns JWT)
- `POST /api/v1/auth/login` - Sign-in existing user
- `GET /api/v1/auth/me` - Retrieve user profile credentials

### Scans & Analysis
- `POST /api/v1/analysis/scan` - Run concurrent sub-analyzer crawls on a website

### Reports Storage
- `POST /api/v1/reports` - Save a consolidated scan report
- `GET /api/v1/reports` - Retrieve all saved reports for the logged-in user
- `GET /api/v1/reports/:id` - Fetch single audit details
- `DELETE /api/v1/reports/:id` - Delete report from history

### Projects / Groupings
- `POST /api/v1/projects` - Create project container
- `GET /api/v1/projects` - List all projects

---

## Future Scope

- **Real User Monitoring (RUM)**: Insert optional telemetry scripts on client builds to collect paint values from real user interactions.
- **CI/CD Integrations**: Publish a PerfLens GitHub Action to automatically fail pull requests if a commit drops the overall score below a configured index.
- **Automated Tunnels**: Tunnel internal staging environments under private firewalls dynamically.
