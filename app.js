const DATA_URL = 'data/games.json';
const FAVORITES_KEY = 'playfield-favorites-v1';
const FEATURED_CATEGORIES = ['arcade', 'action', 'racing', 'puzzle', 'multiplayer', 'simulation', 'adventure', 'sports', 'casual', 'strategy'];

const grid = document.querySelector('#game-grid');
const searchInput = document.querySelector('#game-search');
const categoryBar = document.querySelector('#category-bar');
const resultCount = document.querySelector('#result-count');
const emptyState = document.querySelector('#empty-state');
const favoritesButton = document.querySelector('#favorites-button');
const dialog = document.querySelector('#player-dialog');
const frameWrap = document.querySelector('#frame-wrap');
const playerTitle = document.querySelector('#player-title');
const playerSource = document.querySelector('#player-source');
const fullscreenButton = document.querySelector('#fullscreen-button');

let games = [];
let selectedCategory = 'all';
let favoritesOnly = false;
let favoriteIds = loadFavorites();
let activeGame = null;

function loadFavorites() {
  try {
    const saved = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
    return new Set(Array.isArray(saved) ? saved : []);
  } catch {
    return new Set();
  }
}

function saveFavorites() {
  try { localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favoriteIds])); } catch { /* Private browsing may disable storage. */ }
}

function make(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function cleanTags(game) {
  return [...new Set(String(game.tags || '').split(',').map((tag) => tag.trim().toLowerCase()).filter(Boolean))];
}

function validGame(game) {
  if (!game || typeof game.title !== 'string' || typeof game.embed !== 'string') return false;
  try {
    const url = new URL(game.embed);
    return url.protocol === 'https:' && (url.hostname === 'onlinegames.io' || url.hostname.endsWith('.onlinegames.io'));
  } catch {
    return false;
  }
}

function renderCategories() {
  const tags = new Set(games.flatMap(cleanTags));
  const categories = FEATURED_CATEGORIES.filter((tag) => tags.has(tag));
  categoryBar.replaceChildren();
  [['all', 'All games'], ...categories.map((tag) => [tag, tag[0].toUpperCase() + tag.slice(1)])].forEach(([id, label]) => {
    const button = make('button', 'category-chip', label);
    button.type = 'button';
    button.dataset.category = id;
    button.setAttribute('aria-pressed', String(selectedCategory === id));
    button.addEventListener('click', () => {
      selectedCategory = id;
      categoryBar.querySelectorAll('.category-chip').forEach((chip) => chip.setAttribute('aria-pressed', String(chip.dataset.category === id)));
      renderGames();
    });
    categoryBar.append(button);
  });
}

function renderCard(game, index) {
  const card = make('article', 'game-card');
  card.style.animationDelay = `${Math.min(index % 16, 8) * 22}ms`;
  const cover = make('button', 'cover-button');
  cover.type = 'button';
  cover.setAttribute('aria-label', `Play ${game.title}`);
  const image = document.createElement('img');
  image.src = game.image || '';
  image.alt = '';
  image.loading = 'lazy';
  image.decoding = 'async';
  image.referrerPolicy = 'strict-origin-when-cross-origin';
  image.addEventListener('error', () => { image.hidden = true; cover.classList.add('no-image'); }, { once: true });
  const number = make('span', 'game-number', `PF-${String(index + 1).padStart(3, '0')}`);
  const play = make('span', 'cover-play');
  play.setAttribute('aria-hidden', 'true');
  play.innerHTML = '<svg viewBox="0 0 12 14"><path d="M1 1.2c0-.8.9-1.3 1.6-.8l8.3 5.1a1.4 1.4 0 0 1 0 2.4l-8.3 5.1c-.7.5-1.6 0-1.6-.8V1.2Z"/></svg>';
  const overlayTitle = make('span', 'cover-title', game.title);
  const favorite = make('button', `favorite-toggle${favoriteIds.has(game.id) ? ' is-favorite' : ''}`, favoriteIds.has(game.id) ? '♥' : '♡');
  favorite.type = 'button';
  favorite.setAttribute('aria-label', favoriteIds.has(game.id) ? `Remove ${game.title} from favorites` : `Add ${game.title} to favorites`);
  favorite.setAttribute('aria-pressed', String(favoriteIds.has(game.id)));
  favorite.addEventListener('click', (event) => {
    event.stopPropagation();
    if (favoriteIds.has(game.id)) favoriteIds.delete(game.id); else favoriteIds.add(game.id);
    saveFavorites();
    renderGames();
  });
  cover.append(image, number, play, overlayTitle);
  cover.addEventListener('click', () => openGame(game));
  card.append(cover, favorite);

  const info = make('div', 'game-info');
  const title = make('h3', 'game-title', game.title);
  const description = make('p', 'game-description', String(game.description || '').replace(/\s+/g, ' ').trim());
  const tagList = make('div', 'game-tags');
  cleanTags(game).slice(0, 3).forEach((tag) => tagList.append(make('span', 'game-tag', tag)));
  info.append(title, description, tagList);
  card.append(info);
  return card;
}

function renderGames() {
  const query = searchInput.value.trim().toLowerCase();
  const visible = games.filter((game) => {
    const matchesCategory = selectedCategory === 'all' || cleanTags(game).includes(selectedCategory);
    const matchesFavorite = !favoritesOnly || favoriteIds.has(game.id);
    const haystack = `${game.title} ${game.description || ''} ${game.tags || ''}`.toLowerCase();
    return matchesCategory && matchesFavorite && (!query || haystack.includes(query));
  });
  resultCount.textContent = `${visible.length} ${visible.length === 1 ? 'game' : 'games'}${query || selectedCategory !== 'all' || favoritesOnly ? ' found' : ' in the cabinet'}`;
  grid.replaceChildren(...visible.map(renderCard));
  grid.setAttribute('aria-busy', 'false');
  grid.hidden = visible.length === 0;
  emptyState.hidden = visible.length !== 0;
}

function openGame(game) {
  activeGame = game;
  playerTitle.textContent = game.title;
  playerSource.href = game.embed;
  frameWrap.replaceChildren();
  const iframe = document.createElement('iframe');
  iframe.src = game.embed;
  iframe.title = `${game.title} game`;
  iframe.allow = 'autoplay; fullscreen; gamepad; accelerometer; gyroscope; clipboard-read; clipboard-write';
  iframe.allowFullscreen = true;
  iframe.referrerPolicy = 'strict-origin-when-cross-origin';
  iframe.loading = 'eager';
  frameWrap.append(iframe);
  if (!dialog.open) dialog.showModal();
  document.body.classList.add('player-open');
}

function closeGame() {
  if (dialog.open) dialog.close();
  frameWrap.replaceChildren();
  document.body.classList.remove('player-open');
  activeGame = null;
}

searchInput.addEventListener('input', renderGames);
favoritesButton.addEventListener('click', () => {
  favoritesOnly = !favoritesOnly;
  favoritesButton.setAttribute('aria-pressed', String(favoritesOnly));
  favoritesButton.innerHTML = favoritesOnly ? '<span aria-hidden="true">♥</span> Favorites' : '<span aria-hidden="true">♡</span> Favorites';
  renderGames();
});
document.querySelector('#random-button').addEventListener('click', () => {
  const options = games.filter((game) => !favoritesOnly || favoriteIds.has(game.id));
  if (options.length) openGame(options[Math.floor(Math.random() * options.length)]);
});
document.querySelector('#clear-filters').addEventListener('click', () => {
  searchInput.value = '';
  selectedCategory = 'all';
  favoritesOnly = false;
  favoritesButton.setAttribute('aria-pressed', 'false');
  favoritesButton.innerHTML = '<span aria-hidden="true">♡</span> Favorites';
  renderCategories();
  renderGames();
});
document.querySelector('#close-player').addEventListener('click', closeGame);
dialog.addEventListener('click', (event) => { if (event.target === dialog) closeGame(); });
dialog.addEventListener('close', () => { frameWrap.replaceChildren(); document.body.classList.remove('player-open'); activeGame = null; });
fullscreenButton.addEventListener('click', async () => {
  const iframe = frameWrap.querySelector('iframe');
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (iframe?.requestFullscreen) await iframe.requestFullscreen();
    else if (frameWrap.requestFullscreen) await frameWrap.requestFullscreen();
  } catch { /* Some embedded games disable fullscreen in their own frame. */ }
});
document.addEventListener('keydown', (event) => {
  if (event.key === '/' && !dialog.open && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
    event.preventDefault();
    searchInput.focus();
  }
});

async function init() {
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error(`Catalog request failed (${response.status})`);
    const rawGames = await response.json();
    if (!Array.isArray(rawGames)) throw new Error('Catalog format is not a game list');
    const usedIds = new Set();
    games = rawGames.filter(validGame).map((game, index) => {
      const baseId = `${game.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${index}`;
      let id = baseId;
      while (usedIds.has(id)) id += 'x';
      usedIds.add(id);
      return { ...game, id };
    });
    renderCategories();
    renderGames();
  } catch (error) {
    resultCount.textContent = 'Catalog unavailable';
    grid.setAttribute('aria-busy', 'false');
    grid.hidden = true;
    emptyState.hidden = false;
    emptyState.querySelector('h3').textContent = 'The game catalog didn’t load.';
    emptyState.querySelector('p').textContent = 'Refresh the page or check that you are serving the site over HTTP.';
    console.error(error);
  }
}

init();
