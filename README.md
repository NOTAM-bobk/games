# Playfield

A fast, responsive browser-game catalog. The site combines 264 entries from OnlineGames.io with 18 games from GameDistribution. Search titles, genres, and descriptions; filter by category; sort the catalog; save favorites in this browser; or pick a random game. Cards launch the source games in a full-size iframe, with fullscreen and an open-in-new-tab fallback.

## Run locally

Serve this folder over HTTP because the catalog is loaded from local JSON files:

```sh
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Catalog data

`data/games.json` is the OnlineGames.io snapshot from `https://www.onlinegames.io/media/plugins/genGames/embed.json`. Refresh that source with:

```sh
curl -fsSL https://www.onlinegames.io/media/plugins/genGames/embed.json -o data/games.json
```

`data/gamedistribution-games.json` stores 18 GameDistribution entries extracted from their public game pages. Each entry includes the provider's game ID, source page, publisher, tags, description, thumbnail URL, and iframe URL. Keep the two provider snapshots separate when refreshing so one feed cannot overwrite the other.

## GameDistribution integration

The iframe uses the provider's `html5.gamedistribution.com` game URL and sets `gd_sdk_referrer_url` to the current Playfield page when launched. The “Open game” link points to the corresponding GameDistribution game page. GameDistribution describes embedded-link publishing as part of its Direct Game Integration and says publishers complete its onboarding before publishing. Confirm that the site is approved for this integration before deploying these embeds publicly. Games and their advertising, availability, and terms remain controlled by their providers.

## Embeds

Game providers may block iframe playback, require network access, or behave differently across browsers. If a game does not load in the site, use its “Open game” link. The player grants fullscreen and standard browser-game permissions.
