# TRΛXXO — Deployment Guide

## Prerequisites

- Node.js 18 or higher
- npm 9 or higher
- A GitHub account and repository (for GitHub Pages deployment)

---

## 1. Install Dependencies

```bash
npm install
```

---

## 2. Configure Environment Variables

Copy `.env` and fill in your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## 3. Build for Production

```bash
npm run build
```

The compiled output is generated in the **`dist/`** folder. It contains:

```
dist/
├── index.html
├── manifest.json
├── service-worker.js
├── Bright_logo.png
└── assets/
    ├── index-[hash].js
    ├── index-[hash].css
    └── vendor-[hash].js
```

---

## 4. Deploy to GitHub Pages

### Option A — Automatic (recommended)

```bash
npm run deploy
```

This runs `npm run build` then publishes the `dist/` folder to the `gh-pages` branch using [gh-pages](https://github.com/tschaub/gh-pages).

> First time only: install gh-pages globally or as a dev dependency:
> ```bash
> npm install --save-dev gh-pages
> ```

### Option B — Manual via GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy TRΛXXO to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
      - uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

Add your Supabase keys under **Settings → Secrets** in your GitHub repository.

### Option C — Sub-path deployment (e.g. github.com/you/traxxo)

If your app lives at `https://you.github.io/traxxo/`, set the base path before building:

```bash
VITE_BASE_PATH=/traxxo/ npm run build
```

---

## 5. Enable GitHub Pages

1. Go to your repository on GitHub
2. **Settings → Pages**
3. Source: **Deploy from a branch**
4. Branch: **gh-pages** / root
5. Save

Your app will be live at `https://<username>.github.io/<repo>/`

---

## 6. Update the Application After Deployment

```bash
# make your changes, then:
npm run deploy
```

The service worker ensures users automatically get the latest version when they next open the app while online.

---

## PWA Installation

After deployment, users can install TRΛXXO as a native-like app:

- **Android / Chrome**: tap the browser menu → *Add to Home Screen* or tap the install banner
- **Desktop Chrome / Edge**: click the install icon in the address bar
- **Sidebar button**: an **Install App** button appears in the sidebar when the browser supports installation

---

## Offline Support

The service worker caches the application shell so the app loads instantly and continues to work even when connectivity is unavailable. Supabase API calls are excluded from caching to prevent stale data.
