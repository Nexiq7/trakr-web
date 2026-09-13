<p align="center">
  <img src="public/assets/Home.png" alt="trakr — Home" width="100%">
</p>

<h1 align="center">trakr</h1>
<p align="center">
  Your movies and shows, tracked. A fast, cinematic way to discover what's next and keep score of everything you watch.
</p>

<p align="center">
  <a href="https://trakr.lol"><strong>▶ Try it at trakr.lol</strong></a>
</p>

<p align="center">
  <a href="#-features">Features</a> ·
  <a href="#-screenshots">Screenshots</a> ·
  <a href="#-run-it">Run it</a> ·
  <a href="#-license">License</a>
</p>

---

Every other tracker feels like a spreadsheet with a poster grid bolted on. trakr doesn't. It's built around a cinematic spotlight that rotates through what's actually trending, a genre-driven Discover page for when you don't know what you want yet, and a Collection that stays out of your way until you need it. Saving is a single tap from any poster you can see. Movie and show data comes straight from [TheTVDB](https://thetvdb.com/).

> **trakr is live at [trakr.lol](https://trakr.lol)** — that's the real thing,
> and the fastest way to see it. This repository is the web client behind it.
> The whole stack is open source and MIT licensed: this repo is the client, and
> [trakr-api](https://github.com/Nexiq7/trakr-api) is the backend — clone both
> and `docker compose up` runs the entire app on your own hardware, no cloud
> account required.

## ✨ Features

- **Save from anywhere** — every poster in the app carries its own save button, and it opens the same sheet for status and score. Building a collection never costs you your place.
- **Quick search** — ⌘K (Ctrl-K) anywhere opens a search overlay with results as you type, arrow-key navigation and your recent searches.
- **Discover** — a spotlight that rotates through what's trending, rails of trending and popular series and movies, and the full catalog filtered by genre and sorted by Trending / Popular / Newest / A–Z. Filters live in the URL, so any view is a link, and the grid pages in as you scroll.
- **Details** — season-by-season episodes, cast, artwork, trailers, a share button, and a "More like this" rail drawn from the title's own genres.
- **Collection** — track anything as Watching, Plan to Watch, Completed or Dropped, score it out of 10, filter and sort what you've saved, and pick up where you left off from the homepage.
- **Works signed out** — browsing needs no account; signing in is only for tracking.
- **Mobile-ready** — a glass navbar on desktop, a bottom tab bar on mobile, and grids that reflow to any screen.

### Under the hood

- **Artwork is loaded small.** TVDB serves every image at full size and at a `_t` thumbnail — 340×500 at ~45KB against 680×1000 at ~480KB. Cards ask for the thumbnail and describe both in `srcSet`, so a 24-poster grid pulls about a megabyte instead of eleven, and a wide display still gets the full file where it has the pixels to show it.
- **Pages come back instantly.** Responses are cached in memory and served straight into the first render, then refreshed behind you when they're stale. Returning from a details page repaints the rails you left rather than flashing skeletons at you.
- **Every load has a shape.** Skeletons mirror the layout they stand in for, so nothing jumps when the data lands.
- **Writes are optimistic.** Saving, scoring and removing apply locally first and roll back if the server disagrees; removing offers an undo.
- **Motion is opt-out.** Transitions, the drifting landing wall and the spotlight all collapse to their end state under `prefers-reduced-motion`.

## 📸 Screenshots

| Discover                                | Search                              |
| --------------------------------------- | ------------------------------------ |
| ![Discover](public/assets/Discover.png) | ![Search](public/assets/Search.png) |

| Details                               | Collection                                  |
| ------------------------------------- | -------------------------------------------- |
| ![Details](public/assets/Details.png) | ![Collection](public/assets/Collection.png) |

## 🚀 Run it

If you just want to use trakr, go to [trakr.lol](https://trakr.lol) — nothing to
install.

To run your own copy — this client plus the [trakr-api](https://github.com/Nexiq7/trakr-api)
backend, on a local SQLite database with no cloud account — the fastest path is
Docker Compose from the API repo:

```bash
git clone https://github.com/Nexiq7/trakr-api.git
cd trakr-api
cp .env.example .env    # add a free TVDB API key, set a JWT secret

docker compose up       # client → http://localhost:8080, api → http://localhost:3007
```

See [trakr-api's README](https://github.com/Nexiq7/trakr-api#readme) for details.
What follows here is for running just this client from source, against an API
you already have running somewhere.

**You'll need:** [Node](https://nodejs.org/) 20+ and a trakr API to point
`VITE_API_URL` at. The hosted one at trakr.lol only accepts browser requests
from the trakr.lol origin, so a local build can't borrow it — run your own
[trakr-api](https://github.com/Nexiq7/trakr-api) instead.

```bash
cp .env.example .env    # point VITE_API_URL at your API (default: http://localhost:3007)

npm install
npm run dev             # http://localhost:5173
```

### Docker

`VITE_API_URL` is compiled into the bundle, so it's a **build** argument, not a
runtime one — the build fails loudly if it's empty rather than shipping an image
that calls the wrong origin.

```bash
docker build --build-arg VITE_API_URL=https://api.example.com -t trakr-web .
docker run -p 5173:80 trakr-web
```

### Other scripts

```bash
npm run build     # production bundle → dist/
npm run preview   # serve the built bundle locally
npm run lint
```

## 🛠️ Tech stack

React 19, TypeScript, React Router, Tailwind CSS v4, Vite — built and served as a
static bundle behind Nginx, whose config rewrites client-side routes and exposes
`/health`.

Pushes to `main` build the image, publish it to GHCR and ping Dokploy to pull it,
which is how [trakr.lol](https://trakr.lol) updates — see
[deploy.yml](.github/workflows/deploy.yml). Because `VITE_API_URL` is baked in at
build time, the production API origin lives in repository secrets rather than in
this repo.

## 📄 License

[MIT](LICENSE) © Nexiq7
