const DATA_URLS = ['data/games.json', 'data/gamedistribution-games.json'];
const FAVORITES_KEY = 'playfield-favorites-v1';
const GENRE_TAGS = ['arcade', 'action', 'racing', 'driving', 'puzzle', 'simulation', 'adventure', 'multiplayer', 'sports', 'strategy', 'shooting', 'battle', 'battle-royale', 'io-games'];
const CATEGORY_LIMIT = 10;
const CARD_TAG_LIMIT = 2;
const TAG_STOPLIST = new Set(['free', 'html5', 'unity', 'mobile', 'mouse', 'keyboard', 'touch', '1-player', '2-player', 'single-player', '3d', '2d', 'fun', 'crazy']);

const grid = document.querySelector('#game-grid');
const searchInput = document.querySelector('#game-search');
const searchClear = document.querySelector('#search-clear');
const sortSelect = document.querySelector('#game-sort');
const categoryBar = document.querySelector('#category-bar');
const resultCount = document.querySelector('#result-count');
const emptyState = document.querySelector('#empty-state');
const emptyTitle = document.querySelector('#empty-title');
const emptyCopy = document.querySelector('#empty-copy');
const clearFiltersButton = document.querySelector('#clear-filters');
const favoritesButton = document.querySelector('#favorites-button');
const favoritesCount = document.querySelector('#favorites-count');
const randomButton = document.querySelector('#random-button');
const heroFan = document.querySelector('#hero-fan');
const dialog = document.querySelector('#player-dialog');
const playerTitle = document.querySelector('#player-title');
const playerSource = document.querySelector('#player-source');
const frameWrap = document.querySelector('#frame-wrap');
const fullscreenButton = document.querySelector('#fullscreen-button');
const closeButton = document.querySelector('#close-player');

const PLAY_ICON = '<svg viewBox="0 0 12 14" aria-hidden="true" focusable="false"><path d="M1 1.4c0-.8.9-1.3 1.6-.8l8.2 5.1a1 1 0 0 1 0 1.7l-8.2 5.1c-.7.5-1.6 0-1.6-.8V1.4Z" fill="currentColor"/></svg>';
const collator = new Intl.Collator(undefined, { sensitivity: 'base' });

const state = {
  query: '',
  category: 'all',
  favoritesOnly: false,
  sort: 'featured',
};

let games = [];
let gamesById = new Map();
let tagCounts = new Map();
let favoriteIds = loadFavorites();
let activeGame = null;
let lastFocused = null;
let frameTimer = 0;
let searchTimer = 0;

function loadFavorites() {
  try {
    const saved = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
    return new Set(Array.isArray(saved) ? saved : []);
  } catch {
    return new Set();
  }
}

function saveFavorites() {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favoriteIds]));
  } catch {
    /* Private browsing may disable storage. */
  }
}

function cleanTags(game) {
  return [...new Set(String(game.tags || '').split(',').map((tag) => tag.trim().toLowerCase()).filter(Boolean))];
}

function validGame(game) {
  if (!game || typeof game.title !== 'string' || typeof game.embed !== 'string') return false;
  try {
    const url = new URL(game.embed);
    const onlineGamesHost = url.hostname === 'onlinegames.io' || url.hostname.endsWith('.onlinegames.io');
    const gameDistributionHost = url.hostname === 'html5.gamedistribution.com' || url.hostname === 'embed.gamedistribution.com';
    return url.protocol === 'https:' && (onlineGamesHost || gameDistributionHost);
  } catch {
    return false;
  }
}

function getGameEmbedUrl(game) {
  const url = new URL(game.embed);
  if (url.hostname === 'html5.gamedistribution.com' || url.hostname === 'embed.gamedistribution.com') {
    url.searchParams.set('gd_sdk_referrer_url', `${window.location.origin}${window.location.pathname}`);
  }
  return url.href;
}

function cleanDescription(game) {
  let text = String(game.description || '').replace(/\s+/g, ' ').trim();
  const lead = `about ${game.title.trim()}`.toLowerCase();
  if (text.toLowerCase().startsWith(lead)) {
    text = text.slice(lead.length).replace(/^[\s.:–—-]+/, '');
  }
  return text;
}

function titleCase(value) {
  if (value === 'io-games') return 'IO games';
  return value.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function heartIcon(filled) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 20.3 4.7 13a5 5 0 0 1 7.1-7.1l.2.2.2-.2a5 5 0 0 1 7.1 7.1Z" fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/></svg>`;
}

function cardTags(game) {
  return cleanTags(game)
    .filter((tag) => !TAG_STOPLIST.has(tag))
    .sort((a, b) => (tagCounts.get(b) || 0) - (tagCounts.get(a) || 0))
    .slice(0, CARD_TAG_LIMIT);
}

function getVisibleGames() {
  const query = state.query.trim().toLowerCase();
  const visible = games.filter((game) => {
    const matchesCategory = state.category === 'all' || cleanTags(game).includes(state.category);
    const matchesFavorite = !state.favoritesOnly || favoriteIds.has(game.id);
    if (!matchesCategory || !matchesFavorite) return false;
    if (!query) return true;
    return `${game.title} ${game.description || ''} ${game.tags || ''}`.toLowerCase().includes(query);
  });
  if (state.sort === 'az') return visible.sort((a, b) => collator.compare(a.title, b.title));
  if (state.sort === 'za') return visible.sort((a, b) => collator.compare(b.title, a.title));
  return visible;
}

function renderCategories() {
  const counts = new Map();
  games.forEach((game) => {
    cleanTags(game).forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1));
  });
  const genres = GENRE_TAGS.filter((tag) => counts.has(tag))
    .sort((a, b) => (counts.get(b) || 0) - (counts.get(a) || 0))
    .slice(0, CATEGORY_LIMIT);

  const categories = [
    { id: 'all', label: 'All games', count: games.length },
    ...genres.map((tag) => ({ id: tag, label: titleCase(tag), count: counts.get(tag) || 0 })),
  ];

  categoryBar.replaceChildren(...categories.map(({ id, label, count }) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'category-chip';
    chip.dataset.category = id;
    chip.setAttribute('aria-pressed', String(state.category === id));

    const name = document.createElement('span');
    name.textContent = label;
    const total = document.createElement('span');
    total.className = 'chip-count';
    total.textContent = count.toLocaleString();

    chip.append(name, total);
    return chip;
  }));
}

function createCard(game) {
  const saved = favoriteIds.has(game.id);
  const card = document.createElement('article');
  card.className = 'game-card';
  card.dataset.id = game.id;

  const cover = document.createElement('button');
  cover.type = 'button';
  cover.className = 'cover-button';
  cover.dataset.action = 'play';
  cover.setAttribute('aria-label', `Play ${game.title}`);

  const image = document.createElement('img');
  image.src = game.image || '';
  image.alt = '';
  image.width = 640;
  image.height = 400;
  image.loading = 'lazy';
  image.decoding = 'async';
  image.referrerPolicy = 'strict-origin-when-cross-origin';
  image.addEventListener('error', () => {
    image.remove();
    cover.classList.add('no-image');
  }, { once: true });

  const play = document.createElement('span');
  play.className = 'cover-play';
  play.setAttribute('aria-hidden', 'true');
  play.innerHTML = `${PLAY_ICON}<span>Play</span>`;

  cover.append(image, play);

  const favorite = document.createElement('button');
  favorite.type = 'button';
  favorite.className = `favorite-toggle${saved ? ' is-favorite' : ''}`;
  favorite.dataset.action = 'favorite';
  favorite.setAttribute('aria-pressed', String(saved));
  favorite.setAttribute('aria-label', saved ? `Remove ${game.title} from saved games` : `Save ${game.title}`);
  favorite.innerHTML = heartIcon(saved);

  const info = document.createElement('div');
  info.className = 'game-info';

  const title = document.createElement('h3');
  title.className = 'game-title';
  title.textContent = game.title;

  const description = document.createElement('p');
  description.className = 'game-description';
  description.textContent = cleanDescription(game);

  const tags = document.createElement('div');
  tags.className = 'game-tags';
  cardTags(game).forEach((tag) => {
    const chip = document.createElement('span');
    chip.className = 'game-tag';
    chip.textContent = tag;
    tags.append(chip);
  });

  info.append(title);
  if (description.textContent) info.append(description);
  if (tags.childElementCount) info.append(tags);
  card.append(cover, favorite, info);
  return card;
}

function updateEmptyState() {
  const query = state.query.trim();
  clearFiltersButton.hidden = false;

  if (state.favoritesOnly && favoriteIds.size === 0) {
    emptyTitle.textContent = 'No saved games yet';
    emptyCopy.textContent = 'Tap the heart on any game to keep it here, ready for next time.';
    return;
  }
  if (query) {
    const shown = query.length > 40 ? `${query.slice(0, 40)}…` : query;
    emptyTitle.textContent = `No games match “${shown}”`;
    emptyCopy.textContent = 'Try a shorter search, a different genre, or clear your filters to see everything.';
    return;
  }
  if (state.favoritesOnly) {
    emptyTitle.textContent = 'Nothing saved in this genre';
    emptyCopy.textContent = 'Save a game with the heart, or switch genres to find something new.';
    return;
  }
  emptyTitle.textContent = 'Nothing in this genre yet';
  emptyCopy.textContent = 'Try another genre, or clear your filters to browse the whole cabinet.';
}

function renderGames() {
  const visible = getVisibleGames();
  const fragment = document.createDocumentFragment();
  visible.forEach((game) => fragment.append(createCard(game)));

  grid.replaceChildren(fragment);
  grid.hidden = visible.length === 0;
  grid.setAttribute('aria-busy', 'false');
  emptyState.hidden = visible.length !== 0;
  resultCount.textContent = `${visible.length.toLocaleString()} ${visible.length === 1 ? 'game' : 'games'}`;

  if (!visible.length) updateEmptyState();
}

function updateFavoritesButton() {
  favoritesCount.textContent = favoriteIds.size.toLocaleString();
  favoritesButton.setAttribute('aria-pressed', String(state.favoritesOnly));
}

function toggleFavorite(game, button) {
  const saved = favoriteIds.has(game.id);
  if (saved) favoriteIds.delete(game.id);
  else favoriteIds.add(game.id);
  saveFavorites();

  button.classList.toggle('is-favorite', !saved);
  button.setAttribute('aria-pressed', String(!saved));
  button.setAttribute('aria-label', !saved ? `Remove ${game.title} from saved games` : `Save ${game.title}`);
  button.innerHTML = heartIcon(!saved);

  updateFavoritesButton();
  if (state.favoritesOnly) renderGames();
}

function createLoader() {
  const loader = document.createElement('div');
  loader.className = 'frame-loader';
  loader.setAttribute('role', 'status');

  const spinner = document.createElement('span');
  spinner.className = 'spinner';
  spinner.setAttribute('aria-hidden', 'true');

  const text = document.createElement('p');
  text.textContent = 'Loading game…';

  loader.append(spinner, text);
  return { loader, text };
}

function openGame(game, trigger) {
  activeGame = game;
  lastFocused = trigger instanceof HTMLElement ? trigger : document.activeElement;
  playerTitle.textContent = game.title;
  const gameUrl = getGameEmbedUrl(game);
  playerSource.href = game.source || gameUrl;
  playerSource.setAttribute('aria-label', `Open ${game.title} in a new tab`);

  frameWrap.replaceChildren();
  const { loader, text } = createLoader();

  const iframe = document.createElement('iframe');
  iframe.src = gameUrl;
  iframe.title = `${game.title} game`;
  iframe.allow = 'autoplay; fullscreen; gamepad; accelerometer; gyroscope; clipboard-read; clipboard-write';
  iframe.referrerPolicy = 'strict-origin-when-cross-origin';
  iframe.loading = 'eager';
  iframe.addEventListener('load', () => {
    clearTimeout(frameTimer);
    loader.remove();
  }, { once: true });
  iframe.addEventListener('error', () => {
    clearTimeout(frameTimer);
    text.textContent = 'This game can’t load here. Open it in a new tab instead.';
  }, { once: true });

  frameWrap.append(loader, iframe);
  frameTimer = window.setTimeout(() => {
    text.textContent = 'Still loading. If it stays blank, open the game in a new tab.';
  }, 10000);

  if (!dialog.open) dialog.showModal();
  document.documentElement.classList.add('player-open');
  playerTitle.focus({ preventScroll: true });
}

function cleanupPlayer() {
  clearTimeout(frameTimer);
  frameWrap.replaceChildren();
  document.documentElement.classList.remove('player-open');
  activeGame = null;
  if (lastFocused && document.contains(lastFocused)) lastFocused.focus({ preventScroll: true });
  lastFocused = null;
}

function closeGame() {
  if (dialog.open) dialog.close();
  else cleanupPlayer();
}

function clearFilters() {
  state.query = '';
  state.category = 'all';
  state.favoritesOnly = false;
  state.sort = 'featured';

  searchInput.value = '';
  searchClear.hidden = true;
  sortSelect.value = 'featured';
  favoritesButton.setAttribute('aria-pressed', 'false');

  renderCategories();
  renderGames();
}

function renderHeroFan() {
  const covers = games.filter((game) => game.image).slice(0, 3);
  heroFan.replaceChildren(...covers.map((game, index) => {
    const image = document.createElement('img');
    image.src = game.image;
    image.alt = '';
    image.width = 640;
    image.height = 360;
    image.decoding = 'async';
    image.referrerPolicy = 'strict-origin-when-cross-origin';
    if (index < 2) image.setAttribute('fetchpriority', 'high');
    image.addEventListener('error', () => image.remove(), { once: true });
    return image;
  }));
}

function updateTotals() {
  const label = games.length.toLocaleString();
  document.querySelectorAll('[data-game-total]').forEach((node) => {
    node.textContent = label;
  });
  searchInput.placeholder = `Search ${label} games…`;
}

function showLoadError(error) {
  grid.replaceChildren();
  grid.hidden = true;
  grid.setAttribute('aria-busy', 'false');
  emptyState.hidden = false;
  clearFiltersButton.hidden = true;
  resultCount.textContent = 'Games unavailable';
  emptyTitle.textContent = 'The games didn’t load';
  emptyCopy.textContent = 'Check your connection and refresh. The catalog needs to be served over HTTP — opening index.html directly won’t work.';
  console.error(error);
}

grid.addEventListener('click', (event) => {
  const action = event.target.closest('[data-action]');
  if (!action) return;
  const card = action.closest('.game-card');
  const game = card ? gamesById.get(card.dataset.id) : null;
  if (!game) return;

  if (action.dataset.action === 'play') openGame(game, action);
  else if (action.dataset.action === 'favorite') toggleFavorite(game, action);
});

categoryBar.addEventListener('click', (event) => {
  const chip = event.target.closest('.category-chip');
  if (!chip) return;
  state.category = chip.dataset.category;
  categoryBar.querySelectorAll('.category-chip').forEach((item) => {
    item.setAttribute('aria-pressed', String(item.dataset.category === state.category));
  });
  renderGames();
});

searchInput.addEventListener('input', () => {
  state.query = searchInput.value;
  searchClear.hidden = state.query.length === 0;
  clearTimeout(searchTimer);
  searchTimer = window.setTimeout(renderGames, 120);
});

searchInput.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && searchInput.value) {
    event.preventDefault();
    searchInput.value = '';
    state.query = '';
    searchClear.hidden = true;
    renderGames();
  }
});

searchClear.addEventListener('click', () => {
  searchInput.value = '';
  state.query = '';
  searchClear.hidden = true;
  renderGames();
  searchInput.focus();
});

sortSelect.addEventListener('change', () => {
  state.sort = sortSelect.value;
  renderGames();
});

favoritesButton.addEventListener('click', () => {
  state.favoritesOnly = !state.favoritesOnly;
  updateFavoritesButton();
  renderGames();
});

clearFiltersButton.addEventListener('click', clearFilters);

randomButton.addEventListener('click', () => {
  const visible = getVisibleGames();
  const options = visible.length ? visible : games;
  if (!options.length) return;
  openGame(options[Math.floor(Math.random() * options.length)], randomButton);
});

closeButton.addEventListener('click', closeGame);
dialog.addEventListener('close', cleanupPlayer);
dialog.addEventListener('click', (event) => {
  if (event.target === dialog) closeGame();
});

fullscreenButton.addEventListener('click', async () => {
  const iframe = frameWrap.querySelector('iframe');
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    const target = iframe || frameWrap;
    if (target.requestFullscreen) await target.requestFullscreen();
  } catch {
    /* Some embedded games block fullscreen inside their own frame. */
  }
});

document.addEventListener('fullscreenchange', () => {
  const active = Boolean(document.fullscreenElement);
  fullscreenButton.setAttribute('aria-label', active ? 'Exit fullscreen' : 'Enter fullscreen');
  fullscreenButton.title = active ? 'Exit fullscreen' : 'Fullscreen';
});

document.addEventListener('keydown', (event) => {
  if (event.key !== '/' || dialog.open) return;
  const tag = document.activeElement?.tagName;
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || document.activeElement?.isContentEditable) return;
  event.preventDefault();
  searchInput.focus();
});

async function init() {
  try {
    const catalogs = await Promise.all(DATA_URLS.map(async (url) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Catalog request failed for ${url} (${response.status})`);
      const gamesFromSource = await response.json();
      if (!Array.isArray(gamesFromSource)) throw new Error(`Catalog format is invalid for ${url}`);
      return gamesFromSource;
    }));
    const rawGames = catalogs.flat();

    const usedIds = new Set();
    games = rawGames.filter(validGame).map((game, index) => {
      const baseId = `${game.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${index}`;
      let id = baseId;
      while (usedIds.has(id)) id += 'x';
      usedIds.add(id);
      return { ...game, id };
    });
    if (!games.length) throw new Error('No playable games found in the catalog');

    gamesById = new Map(games.map((game) => [game.id, game]));
    tagCounts = new Map();
    games.forEach((game) => {
      cleanTags(game).forEach((tag) => tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1));
    });

    updateTotals();
    updateFavoritesButton();
    renderCategories();
    renderGames();
    renderHeroFan();
  } catch (error) {
    showLoadError(error);
  }
}

init();
