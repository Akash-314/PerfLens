# PerfLens - Dynamic Website Performance Inspector

PerfLens is a complete, developer-first frontend performance inspector dashboard and telemetry analyzer. It runs deep static scans on public web domains, analyzing script payloads, image scaling coverage, stylesheet sizes, accessibility rules compliance, and search engine optimization markers to synthesize unified actionable roadmaps for engineering teams.

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

## Detailed Features & User Flow

### 1. Public Landing Page & Authenticated Entry Flow
PerfLens starts with a public landing page designed with rich styling, dynamic micro-animations, and intuitive controls:
- **Top Navigation Header**: Displays links and dynamic authentication buttons. If the user is logged in, a **Go to Dashboard** button is rendered; otherwise, **Login** and **Get Started** options are displayed.
- **Dynamic Call-to-Actions (CTAs)**: Primary buttons across the landing page adapt based on session validity:
  - Unauthenticated users are redirected to Register/Login pages.
  - Authenticated users go straight to the scan dashboard or workspace.
- **Home Navigation**: The brand Globe logo inside the Login and Register pages allows users to easily jump back to the public Landing page.

### 2. Automated Domain Crawling & Auditing
The Express gateway server manages request scheduling and orchestrates background workers:
- **Headless Puppeteer Crawler**: Launches an isolated Chromium session to load targets, parse DOM content, compute script timings, catalog asset resources, and retrieve response headers.
- **PageSpeed API Integrations**: Queries Google PageSpeed Insights (PSI) data concurrently to fetch Core Web Vitals targets (FCP, LCP, CLS, FID, TBT, TTFB).

### 3. Integrated Sub-Analyzer Engines
Once the Puppeteer crawler collects the payload timeline, five secondary engines analyze the data synchronously:
*   **Image Analyzer**: Checks image dimensions, format types (e.g. recommending WebP/AVIF), asset size overhead, lazy loading triggers, and calculates potential file size savings.
*   **CSS Analyzer**: Discovers all active stylesheets, extracts rules, and identifies render-blocking resources.
*   **JS Analyzer**: Inspects JS packages and dependencies. Flags heavy duplicate bundles (e.g. multiple versions of lodash or moment) to support cleaner bundle tree-shaking.
*   **SEO Analyzer**: Audits search engine compliance by reviewing title elements, description length, canonical linkages, sitemap validity, and Open Graph visual tags.
*   **Accessibility (A11y) Analyzer**: Validates markup structures including HTML `lang` attributes, document headers, and missing image `alt` attributes to guarantee screen-reader compatibility.

### 4. Interactive Dashboards & Analytical Reporting
- **Performance Grades**: Evaluates aggregated scores and highlights visual roadmaps using letter grades (A–F).
- **Interactive Visualizations**: Renders details using `Recharts` for interactive historical comparison graphs, resource size distributions, and Web Vitals ratings (Good, Needs Improvement, Poor).
- **Workspace Containers (Projects)**: Organizes target domains into active workgroups. Tracks scans, workspace membership, and averages over time.
- **Global Command Menu**: Tap `Ctrl + K` (or `Cmd + K`) anywhere to open a global search bar and navigate the UI via keyboard shortcuts.
- **Toast Notification Engine**: Renders overlays for live crawlers progress logs, scan notifications, and login credentials warnings.

---

## Tech Stack

- **Frontend**: React (v19), TypeScript, Vite (v8), Recharts, Lucide Icons, Vanilla CSS
- **Backend**: Node.js, Express (v4), Mongoose (v8), Headless Puppeteer, TypeScript (via `tsx` executor)
- **Database**: MongoDB Atlas / local MongoDB
- **Security**: Helmet, CORS, Express Rate Limit, Express Validator, JWT Authentication

---

## Folder Structure

```
PerfLens/
├── dist/                          # Compiled Production Frontend static files
├── src/                           # React Frontend Source Code
│   ├── components/                # Reusable widgets (Sidebar, TopNav, ProtectedRoute, CommandMenu)
│   ├── context/                   # AppContext API integrations and mapper state
│   ├── pages/                     # Page views (Dashboard, Recommendations, Landing, Login, Register)
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
├── tsconfig.json                  # Global TypeScript compiler options
└── package.json                   # Root build scripts and workspace config
```

---

## Installation & Setup

### Prerequisites
- Node.js (v18+)
- MongoDB server running locally or a MongoDB Atlas URI

### Configuration (Environment Variables)

Create a configuration file inside `server/.env`:

```env
PORT=5001
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_production_secure_secret_key_here
NODE_ENV=development
PAGESPEED_API_KEY=your_optional_pagespeed_api_key
```

### Server Setup
1. Navigate to the server folder:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server in development mode:
   ```bash
   npm run dev
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

### Concurrent Development (Recommended)
You can start both the React frontend and the Express backend server simultaneously using a single command in the workspace root:
```bash
npm run dev:all
```
*   **Frontend**: runs on [http://localhost:5173](http://localhost:5173) (handled by Vite)
*   **Backend Server**: runs on [http://localhost:5001](http://localhost:5001) (handled by Express)

---

## API Endpoints

### 1. Authentication
*   `POST /api/v1/auth/register` - Create user workspace (returns JWT)
*   `POST /api/v1/auth/login` - Sign-in existing user
*   `GET /api/v1/auth/me` - Retrieve user profile credentials

### 2. Scans & Analysis
*   `POST /api/v1/analysis/scan` - Run concurrent sub-analyzer crawls on a website

### 3. Reports Storage
*   `POST /api/v1/reports` - Save a consolidated scan report
*   `GET /api/v1/reports` - Retrieve all saved reports for the logged-in user
*   `GET /api/v1/reports/:id` - Fetch single audit details
*   `DELETE /api/v1/reports/:id` - Delete report from history

### 4. Workspaces & Projects
*   `POST /api/v1/projects` - Create project container
*   `GET /api/v1/projects` - List all projects

---

## Troubleshooting

### 1. Module Import / TypeScript Compilation Errors
If you see errors related to missing exports or typescript compilation:
- Ensure all components are importing correctly.
- If components get emptied or corrupted in your local environment, use `git status` to locate changes and restore files from index:
  ```bash
  git restore src/components/ProtectedRoute.tsx src/components/Sidebar.tsx src/components/TopNav.tsx
  ```
- Run typecheck locally to isolate errors:
  ```bash
  npx tsc --noEmit
  ```

### 2. Puppeteer Launch Failures
On environments without default graphics dependencies or Chrome binaries (such as head-less Linux VPS distributions):
- Ensure chromium dependencies are installed:
  ```bash
  npx puppeteer folders install chrome
  ```
- Make sure Puppeteer has the correct sandboxing arguments allowed on your hosting platform.

---

## Future Scope

- **Real User Monitoring (RUM)**: Insert optional telemetry scripts on client builds to collect paint values from real user interactions.
- **CI/CD Integrations**: Publish a PerfLens GitHub Action to automatically fail pull requests if a commit drops the overall score below a configured index.
- **Automated Tunnels**: Tunnel internal staging environments under private firewalls dynamically.
