// LootRadar — comparateur de prix de jeux PC
// Données : API publique CheapShark (https://apidocs.cheapshark.com)

const API = "https://www.cheapshark.com/api/1.0";
const SITE = "https://www.cheapshark.com";

// --- Petits utilitaires -------------------------------------------------

// Échappe le texte venant de l'API avant de l'insérer dans la page (protection XSS)
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function formatPrice(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return "—";
  if (n === 0) return '<span class="free">Gratuit</span>';
  return n.toLocaleString("fr-FR", { style: "currency", currency: "USD" });
}

function formatDate(unixSeconds) {
  if (!unixSeconds) return "";
  return new Date(unixSeconds * 1000).toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric"
  });
}

// Image plus grande depuis Steam quand c'est possible, sinon la vignette CheapShark
function coverUrl(steamAppID, thumb) {
  return steamAppID
    ? `https://cdn.cloudflare.steamstatic.com/steam/apps/${encodeURIComponent(steamAppID)}/header.jpg`
    : thumb;
}

function imgTag(steamAppID, thumb, cls, alt = "") {
  return `<img class="${cls}" src="${escapeHtml(coverUrl(steamAppID, thumb))}" alt="${escapeHtml(alt)}" loading="lazy"
    data-fallback="${escapeHtml(thumb || "")}">`;
}

// Si l'image Steam n'existe pas, on bascule sur la vignette (sans JavaScript inline dans le HTML)
document.addEventListener("error", (e) => {
  const img = e.target;
  if (img.tagName === "IMG" && img.dataset.fallback && img.src !== img.dataset.fallback) {
    img.src = img.dataset.fallback;
    delete img.dataset.fallback;
  }
}, true);

function dealLink(dealID) {
  return `${SITE}/redirect?dealID=${encodeURIComponent(dealID)}`;
}

async function getJson(path) {
  const response = await fetch(API + path);
  if (response.status === 429) throw new Error("Trop de requêtes : patiente quelques secondes puis réessaie.");
  if (!response.ok) throw new Error("Le service de prix ne répond pas pour le moment.");
  return response.json();
}

function skeletons(count) {
  return Array.from({ length: count }, () => '<div class="skeleton" aria-hidden="true"></div>').join("");
}

function message(text, isError = false) {
  return `<p class="message${isError ? " error" : ""}">${escapeHtml(text)}</p>`;
}

// --- Boutiques ----------------------------------------------------------

// Boutiques présentées sur le site. "aliases" sert à les reconnaître dans la liste de CheapShark.
// kind : "official" = boutique officielle ou revendeur agréé, "reseller" = revendeur de clés.
const SHOPS = [
  { name: "Steam", url: "https://store.steampowered.com/", kind: "official",
    description: "La plateforme de référence du jeu PC, éditée par Valve." },
  { name: "GOG", url: "https://www.gog.com/fr", kind: "official",
    description: "Jeux sans DRM : une fois achetés, ils t'appartiennent vraiment." },
  { name: "Epic Games Store", url: "https://store.epicgames.com/fr/", kind: "official",
    description: "Boutique d'Epic Games, connue pour ses jeux offerts chaque semaine." },
  { name: "Humble Store", url: "https://www.humblebundle.com/store", kind: "official",
    description: "Une partie de chaque achat est reversée à des associations caritatives." },
  { name: "Gamesplanet", url: "https://fr.gamesplanet.com/", kind: "official",
    description: "Clés officielles, promotions régulières et service client francophone." },
  { name: "Fanatical", url: "https://www.fanatical.com/fr", kind: "official",
    description: "Spécialiste des bundles et des offres promotionnelles sur PC." },
  { name: "DLGamer", url: "https://www.dlgamer.fr/fr", kind: "official",
    description: "Boutique française de jeux dématérialisés, catalogue PC et Xbox." },
  { name: "Green Man Gaming", url: "https://www.greenmangaming.com/", aliases: ["GreenManGaming"], kind: "official",
    description: "Revendeur officiel : clés issues des éditeurs et distributeurs." },
  { name: "Instant Gaming", url: "https://www.instant-gaming.com/fr/", kind: "reseller",
    description: "Revendeur de clés à prix bas. Vérifie la région d'activation avant d'acheter." }
];

const normalize = (text) => String(text).toLowerCase().replace(/[^a-z0-9]/g, "");

function findShop(storeName) {
  const key = normalize(storeName);
  return SHOPS.find((shop) => [shop.name, ...(shop.aliases || [])].some((n) => normalize(n) === key));
}

// Une boutique est "suivie" si CheapShark la connaît et qu'elle est active
function isTracked(shop) {
  return Object.values(stores).some((s) => s.active && findShop(s.name) === shop);
}

function renderShops() {
  const listLoaded = Object.keys(stores).length > 0;
  document.getElementById("shops").innerHTML = SHOPS.map((shop) => {
    const tracked = listLoaded && isTracked(shop);
    return `
      <article class="shop">
        <div class="shop-head">
          <h3>${escapeHtml(shop.name)}</h3>
          <a href="${escapeHtml(shop.url)}" target="_blank" rel="noopener">${escapeHtml(new URL(shop.url).hostname.replace(/^www\./, ""))}</a>
        </div>
        <p>${escapeHtml(shop.description)}</p>
        <div class="shop-tags">
          <span class="tag ${tracked ? "tag-ok" : ""}">${tracked ? "Prix comparés" : "Lien direct uniquement"}</span>
          ${shop.kind === "reseller" ? '<span class="tag tag-warn">Revendeur de clés</span>' : ""}
        </div>
      </article>`;
  }).join("");
}

let stores = {};

async function loadStores() {
  try {
    const list = await getJson("/stores");
    for (const s of list) {
      stores[s.storeID] = { name: s.storeName, icon: SITE + s.images.icon, active: s.isActive === 1 };
    }
  } catch {
    stores = {}; // le site reste utilisable, on affichera juste "Boutique n°X"
  }
}

function storeHtml(storeID) {
  const store = stores[storeID];
  if (!store) return `<span class="store">Boutique n°${escapeHtml(storeID)}</span>`;
  return `<span class="store"><img src="${escapeHtml(store.icon)}" alt="" width="16" height="16">${escapeHtml(store.name)}</span>`;
}

// --- Bons plans (page d'accueil) ---------------------------------------

const dealsEl = document.getElementById("deals");

async function loadDeals(sortBy, maxPrice) {
  dealsEl.innerHTML = skeletons(8);
  const params = new URLSearchParams({ sortBy, pageSize: "16", onSale: "1" });
  if (maxPrice) params.set("upperPrice", maxPrice);
  try {
    const deals = await getJson(`/deals?${params}`);
    if (!deals.length) { dealsEl.innerHTML = message("Aucun bon plan trouvé pour le moment."); return; }
    dealsEl.innerHTML = deals.map((d) => `
      <button class="card" data-game="${escapeHtml(d.gameID)}">
        ${imgTag(d.steamAppID, d.thumb, "card-img")}
        <div class="card-body">
          <h3 class="card-title">${escapeHtml(d.title)}</h3>
          <div class="card-meta">
            ${storeHtml(d.storeID)}
            <span class="badge">-${Math.round(Number(d.savings))}%</span>
          </div>
          <div class="price">
            <span class="price-now">${formatPrice(d.salePrice)}</span>
            <span class="price-old">${formatPrice(d.normalPrice)}</span>
          </div>
        </div>
      </button>`).join("");
  } catch (err) {
    dealsEl.innerHTML = message(err.message, true);
  }
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.setAttribute("aria-selected", "false"));
    tab.setAttribute("aria-selected", "true");
    loadDeals(tab.dataset.sort, tab.dataset.max);
  });
});

// --- Recherche ----------------------------------------------------------

const input = document.getElementById("search-input");
const clearBtn = document.getElementById("clear-search");
const resultsSection = document.getElementById("results-section");
const resultsTitle = document.getElementById("results-title");
const resultsEl = document.getElementById("results");
let searchTimer;
let lastQuery = "";

async function search(query) {
  lastQuery = query;
  resultsSection.hidden = false;
  resultsTitle.textContent = `Résultats pour « ${query} »`;
  resultsEl.innerHTML = skeletons(4);
  try {
    const games = await getJson(`/games?${new URLSearchParams({ title: query, limit: "24" })}`);
    if (query !== lastQuery) return; // une recherche plus récente a été lancée entre-temps
    if (!games.length) {
      resultsEl.innerHTML = message("Aucun jeu trouvé. Vérifie l'orthographe ou essaie le titre anglais.");
      return;
    }
    resultsEl.innerHTML = games.map((g) => `
      <button class="card" data-game="${escapeHtml(g.gameID)}">
        ${imgTag(g.steamAppID, g.thumb, "card-img")}
        <div class="card-body">
          <h3 class="card-title">${escapeHtml(g.external)}</h3>
          <div class="price">dès&nbsp;<span class="price-now">${formatPrice(g.cheapest)}</span></div>
        </div>
      </button>`).join("");
  } catch (err) {
    if (query === lastQuery) resultsEl.innerHTML = message(err.message, true);
  }
}

input.addEventListener("input", () => {
  const query = input.value.trim();
  clearBtn.hidden = query.length === 0;
  clearTimeout(searchTimer);
  if (query.length < 2) { resultsSection.hidden = true; lastQuery = ""; return; }
  searchTimer = setTimeout(() => search(query), 350); // attend que l'utilisateur ait fini de taper
});

document.getElementById("search-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const query = input.value.trim();
  if (query.length >= 2) { clearTimeout(searchTimer); search(query); }
});

clearBtn.addEventListener("click", () => {
  input.value = "";
  clearBtn.hidden = true;
  resultsSection.hidden = true;
  lastQuery = "";
  input.focus();
});

// --- Fiche détaillée d'un jeu -----------------------------------------

const dialog = document.getElementById("game-dialog");
const dialogContent = document.getElementById("dialog-content");

async function openGame(gameID) {
  dialogContent.innerHTML = `<div class="detail-body">${message("Chargement des prix…")}</div>`;
  dialog.showModal();
  try {
    const data = await getJson(`/games?id=${encodeURIComponent(gameID)}`);
    const offers = [...data.deals].sort((a, b) => Number(a.price) - Number(b.price));
    const lowest = data.cheapestPriceEver;

    // Comparaison : écart entre l'offre la moins chère et la plus chère
    const cheapest = offers.length ? Number(offers[0].price) : 0;
    const priciest = offers.length ? Number(offers[offers.length - 1].price) : 0;
    const gap = priciest - cheapest;

    // Boutiques dont les prix ne sont pas suivis : on propose un lien pour vérifier soi-même
    const untracked = Object.keys(stores).length ? SHOPS.filter((shop) => !isTracked(shop)) : [];

    dialogContent.innerHTML = `
      ${imgTag(data.info.steamAppID, data.info.thumb, "detail-cover")}
      <div class="detail-body">
        <h2 id="dialog-title">${escapeHtml(data.info.title)}</h2>
        ${lowest ? `<div class="lowest">
          <span>Plus bas prix historique : <strong>${formatPrice(lowest.price)}</strong></span>
          <span>le ${formatDate(lowest.date)}</span>
        </div>` : ""}
        ${offers.length > 1 ? `<p class="compare">
          ${offers.length} offres comparées.
          ${gap > 0.009
            ? `Tu économises <strong>${formatPrice(gap)}</strong> par rapport à la boutique la plus chère.`
            : "Le prix est identique partout."}
        </p>` : ""}
        <ul class="offers">
          ${offers.map((o, i) => `
            <li class="offer${i === 0 ? " best" : ""}">
              <div>
                ${storeHtml(o.storeID)}
                ${i === 0 ? '<span class="best-label">Meilleur prix</span>' : ""}
              </div>
              <div class="price">
                <span class="price-now">${formatPrice(o.price)}</span>
                ${Number(o.savings) >= 1 ? `<span class="price-old">${formatPrice(o.retailPrice)}</span>` : ""}
              </div>
              <a class="btn" href="${dealLink(o.dealID)}" target="_blank" rel="noopener nofollow">Voir l'offre</a>
            </li>`).join("")}
        </ul>
        ${untracked.length ? `<div class="also">
          <h3>Vérifier aussi sur</h3>
          <p>Prix non suivis automatiquement : compare toi-même sur ces boutiques.</p>
          <div class="also-links">
            ${untracked.map((shop) => `<a href="${escapeHtml(shop.url)}" target="_blank" rel="noopener">${escapeHtml(shop.name)}${shop.kind === "reseller" ? " (revendeur de clés)" : ""}</a>`).join("")}
          </div>
        </div>` : ""}
      </div>`;
  } catch (err) {
    dialogContent.innerHTML = `<div class="detail-body">${message(err.message, true)}</div>`;
  }
}

// Un seul écouteur pour toutes les cartes (accueil et résultats)
document.addEventListener("click", (e) => {
  const card = e.target.closest(".card[data-game]");
  if (card) openGame(card.dataset.game);
});

document.getElementById("dialog-close").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); }); // clic en dehors

// --- Démarrage ----------------------------------------------------------

loadStores().then(() => {
  renderShops();
  loadDeals("Deal Rating");
});
