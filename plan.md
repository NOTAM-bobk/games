# Games catalog — implementation plan

## Product and implementation

Build a responsive, static browser game catalog in the existing empty `NOTAM-bobk/games` repository. Use the supplied OnlineGames.io `embed.json` as the authoritative game list. Vendor a snapshot as `data/games.json` so the site remains usable without depending on cross-origin catalog fetching at runtime; retain each game's original HTTPS `embed`, `image`, `title`, `tags`, and `description` fields. The site needs no server, database, login, or build tooling.

Use semantic HTML, CSS, and vanilla JavaScript. `index.html` provides the shell and accessible player dialog; `styles.css` owns responsive styling; `app.js` loads and validates the local catalog, renders cards, filters across titles/tags/descriptions, exposes useful genre chips, supports favorites persisted in localStorage, and opens a playable embedded game with fullscreen and source-site links. `data/games.json` is the complete catalog snapshot; `public/manus-routes.json` declares the single page route. `README.md` records local run instructions, feed provenance/refresh steps, and embed caveats.

## Design

Three candidate directions (each probability < 0.10, sampled from distribution tails):
- **Arcade field-notes terminal** — 0.07
- **Playful candy cabinet** — 0.06
- **Midnight pixel lounge** — 0.05

**Chosen: Arcade field-notes terminal.**

- **Design Movement:** contemporary arcade UI with editorial index-card clarity and a restrained CRT-era glow.
- **Core Principles:** make discovery immediate; treat game art as the color; keep metadata quiet and readable; let the player take over the screen.
- **Color Philosophy:** near-black ink and warm off-white frame the catalog; electric lime is an ownable “press play” signal, while per-card artwork supplies variety.
- **Layout Paradigm:** left-aligned editorial masthead and search rail above a broad, variable-density card field; a compact sticky filter bar supports browsing without dominating the page.
- **Signature Elements:** lime outline/marker accents; small numbered catalog labels; a high-contrast player dialog with generous black letterboxing.
- **Interaction Philosophy:** search responds as typed; filters combine predictably; cards give a clear play affordance; favorites are one click and survive refresh.
- **Animation:** brief 150–220ms lift/outline on hover and dialog fade/scale; honor reduced-motion preferences; no perpetual effects.
- **Typography System:** system sans for body and a system monospace face for catalog IDs, counts, and small labels; strong, compact display headings.
- **Brand Essence:** the fast, no-install index for browser games; direct, curious, and arcade-ready.
- **Brand Voice:** concise and inviting. Examples: “Pick a game. Get right into it.” / “264 games, ready when you are.”
- **Wordmark & Logo:** custom CSS/SVG “PLAYFIELD” wordmark paired with a lime four-notch play tile, not a stock icon font.
- **Signature Brand Color:** arcade lime `#c6ff4a`.

## Project structure

- `index.html` — accessible one-page app, controls, player dialog, and script/style links.
- `styles.css` — responsive visual system, catalog cards, modal player, and reduced-motion behavior.
- `app.js` — catalog loading, filtering, rendering, favorites, and game launch/fullscreen actions.
- `data/games.json` — complete upstream feed snapshot.
- `public/manus-routes.json` — page route manifest (`/`).
- `favicon.svg` — compact custom wordmark mark.
- `README.md` — run, source, refresh, and iframe notes.
- `TODO.md` — explicit user-facing outcome criteria and progress.
