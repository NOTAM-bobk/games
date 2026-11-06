# Playfield

A fast, responsive browser-game catalog built from the OnlineGames.io embed feed. Search titles, genres, and descriptions; filter by category; save favorites in this browser; or surprise yourself with a random pick. Each card opens its source game in a full-size iframe, with fullscreen and an open-in-new-tab fallback.

## Run locally

Serve this folder over HTTP (the catalog is loaded from a local JSON file, so opening `index.html` directly as a `file://` URL is not supported):

```sh
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Catalog source and refresh

`data/games.json` is a snapshot of `https://www.onlinegames.io/media/plugins/genGames/embed.json`. It includes the source entries' titles, HTTPS iframe URLs, images, tags, and descriptions. To refresh the full catalog:

```sh
curl -fsSL https://www.onlinegames.io/media/plugins/genGames/embed.json -o data/games.json
```

The site serves this local snapshot instead of fetching the source feed at runtime, avoiding a dependency on third-party CORS headers. Game images and game frames themselves remain hosted by OnlineGames.io.

## Embeds

Each game's source `embed` URL is loaded as a third-party iframe in the player dialog; the original game is also available through the “Open game” link. Games are hosted and controlled by their source provider. Some may refuse embedding, require network access, or behave differently across browsers; use the new-tab link when an iframe is unavailable. The player grants fullscreen and standard gameplay permissions requested by browser games.
