// Generates the game pages and the index's roster/ticker from data/games.json,
// which cardz-win's scripts/export-games.ps1 projects out of the app's own
// catalog. See cardz-win docs/website-plan.md.
//
//   node build.mjs
//
// Everything else on the site stays hand-written. This only owns games/<slug>/
// and the two marked regions in index.html, so a redesign can move freely
// around it.

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { boardDiagram } from "./diagram.mjs";

const root = dirname(fileURLToPath(import.meta.url));
const STORE = "https://apps.microsoft.com/detail/9N96G6H34XCT";

// ---------------------------------------------------------------- data

const games = JSON.parse(readFileSync(join(root, "data/games.json"), "utf8"));
const roster = JSON.parse(readFileSync(join(root, "data/roster.json"), "utf8"));

// Variants of one game share a page: two near-identical pages would compete
// with each other for the same search, and neither would deserve to win.
const pages = new Map();
for (const game of games.games) {
  if (game.sandbox) continue; // Sandbox has its own hand-written page.
  const key = game.family ? slug(game.family) : game.slug;
  if (!pages.has(key)) pages.set(key, { slug: key, name: game.family ?? game.name, variants: [] });
  pages.get(key).variants.push(game);
}

// The overlay decides display order, so a game missing from it would silently
// vanish from the site — exactly the drift this pipeline exists to remove.
const ordered = [];
for (const entry of roster.entries) {
  const page = pages.get(entry.slug);
  if (!page) throw new Error(`data/roster.json lists '${entry.slug}', which is not in games.json`);
  ordered.push(Object.assign(page, entry));
  pages.delete(entry.slug);
}
if (pages.size)
  throw new Error(
    `games.json has games data/roster.json never mentions: ${[...pages.keys()].join(", ")}. ` +
      `Add a tagline (and set "new": true if it is a new arrival).`
  );

// ---------------------------------------------------------------- markdown

// The rules corpus is a closed set of constructs: paragraphs, "- " bullets,
// **bold**, _italic_. Anything else means the authoring vocabulary grew and
// this renderer needs to grow with it — so it throws rather than emit mangled
// HTML that nobody would notice.
function markdown(source, where) {
  const unsupported = source.match(/^\s*(#|>|\||\d+\.)|\[|`/m);
  if (unsupported) throw new Error(`Unsupported markdown in ${where}: ${JSON.stringify(unsupported[0])}`);

  const blocks = [];
  let list = null;
  const flush = () => {
    if (list) blocks.push(`<ul>${list.join("")}</ul>`);
    list = null;
  };
  for (const raw of source.split("\n")) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    if (line.startsWith("- ")) {
      (list ??= []).push(`<li>${inline(line.slice(2))}</li>`);
      continue;
    }
    flush();
    blocks.push(`<p>${inline(line)}</p>`);
  }
  flush();
  return blocks.join("\n          ");
}

function inline(text) {
  return escape(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^A-Za-z0-9])_(.+?)_(?![A-Za-z0-9])/g, "$1<em>$2</em>");
}

function escape(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function slug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** First sentence of the rules, stripped to plain text, for <meta description>. */
function summarize(page) {
  const first = (page.variants[0].rules ?? "").split("\n")[0];
  const plain = first.replace(/[*_]/g, "").replace(/\s+/g, " ").trim();
  return escape(plain.length > 150 ? `${plain.slice(0, 147).trimEnd()}…` : plain);
}

// ---------------------------------------------------------------- templates

function chrome(depth) {
  const up = "../".repeat(depth);
  return {
    up,
    head: (title, description) => `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${description}">
  <meta name="theme-color" content="#100f14">
  <title>${title}</title>
  <link rel="icon" href="${up}assets/cardz-logo.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Playfair+Display:ital,wght@0,600;1,600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${up}styles.css">
  <link rel="stylesheet" href="${up}site-extras.css">
</head>`,
    header: `  <header class="site-header">
    <a class="brand" href="${up}index.html" aria-label="Cardz home"><span aria-hidden="true">✣</span> Cardz</a>
    <nav aria-label="Main navigation">
      <a href="${up}index.html#games">Games</a><a href="${up}sandbox.html">Sandbox</a><a href="${up}index.html#features">Features</a><a href="${up}privacy.html">Privacy</a>
    </nav>
    <a class="button button-small" href="${STORE}">Get Cardz</a>
  </header>`,
    footer: `  <footer><a class="brand" href="${up}index.html"><span>✣</span> Cardz</a><p>Solitaire, your way.</p><div><a href="${up}sandbox.html">Sandbox</a><a href="${up}privacy.html">Privacy</a><a href="mailto:cardz@roderic.dev">Contact</a></div><small>© 2026 Cardz</small></footer>`,
  };
}

function deckLine(game) {
  const { cards, jokers } = game.decks;
  // Deliberately ignores decks.packs, which counts deck *copies*: Spider is
  // eight copies of a single-suit pack, and a player calls that two decks.
  const decks = cards % 52 === 0 ? cards / 52 : null;
  const base =
    decks === 1 ? "One deck" : decks === 2 ? "Two decks" : decks ? `${decks} decks` : `${cards} cards`;
  return jokers ? `${base} · ${jokers} jokers` : base;
}

/**
 * The board, to scale, from the depot coordinates — no screenshot involved, so
 * it cannot fall behind the game the way a photograph of one deal does.
 * A wide board (Crazy Quilt) gets to run wider than the reading column.
 */
function board(game) {
  const diagram = boardDiagram(game, games.layout);
  if (!diagram) return "";
  // A long board earns room past the reading column; a squarish one (Clock's
  // face, Beleaguered Castle's column) would otherwise tower over the page.
  const shape = diagram.ratio > 1.6 ? " game-board-wide" : diagram.ratio < 1.2 ? " game-board-tall" : "";
  return `      <figure class="game-board${shape}">
        ${diagram.svg}
        <figcaption><span class="game-board-legend">${diagram.legend}</span></figcaption>
      </figure>`;
}

function gamePage(page, all) {
  const { up, head, header, footer } = chrome(2);
  const primary = page.variants[0];
  const grouped = page.variants.length > 1;
  const others = all.filter((other) => other.slug !== page.slug);

  const variantStrip = grouped
    ? `<span>${escape(primary.variant.selections[0].axis)}: ${page.variants
        .map((v) => escape(v.variant.label))
        .join(" · ")}</span>`
    : "";

  // The rules above are the default variant's in full; the others differ by a
  // line or two, so they fold away rather than restate the whole game.
  const alternates = grouped
    ? `
      <div class="game-variants">
        <h2>Variants</h2>
        <p>The rules above are ${escape(primary.name)}. Here is how the rest of the family differs.</p>
${page.variants
  .slice(1)
  .map(
    (v) => `        <details>
          <summary>${escape(v.name)}</summary>
          <div class="game-rules">
          ${markdown(v.rules ?? "", v.slug)}
          </div>
        </details>`
  )
  .join("\n")}
      </div>`
    : "";

  return `${head(`${escape(page.name)} — how to play | Cardz`, summarize(page))}
<body class="game-page">
  <a class="skip-link" href="#main">Skip to content</a>
${header}
  <main id="main" class="game-main">
    <article class="game-shell">
      <a class="back-link" href="${up}index.html#games"><span aria-hidden="true">←</span> All games</a>
      <p class="eyebrow"><span></span> ${escape(page.tagline)}</p>
      <h1>${escape(page.name)}</h1>
      <div class="game-facts">
        <span>${deckLine(primary)}</span>${variantStrip ? `\n        ${variantStrip}` : ""}
      </div>
${board(primary)}
      <div class="game-rules game-rules-primary">
          ${markdown(primary.rules ?? "", page.slug)}
      </div>
${alternates}
      <div class="game-cta">
        <a class="button" href="${STORE}"><span class="windows-mark" aria-hidden="true">⊞</span><span><small>Play it in</small>Cardz for Windows</span></a>
        <small>Free. No ads, no accounts, fully offline.</small>
      </div>
      <nav class="game-more" aria-label="Other games">
        <p class="eyebrow"><span></span> More solitaire</p>
        <div>${others
          .map((other) => `<a href="${up}games/${other.slug}/">${escape(other.name)}</a>`)
          .join("")}</div>
      </nav>
    </article>
  </main>
${footer}
</body>
</html>
`;
}

// ---------------------------------------------------------------- index regions

function rosterMarkup(all) {
  return all
    .map((page) => {
      const badge = page.new ? "<b>New</b>" : "";
      const cls = page.new ? ' class="is-new"' : "";
      return `          <a href="games/${page.slug}/"${cls}>${escape(page.name)} ${badge}<small>${escape(
        page.tagline
      )}</small></a>`;
    })
    .join("\n");
}

function tickerMarkup(all) {
  const names = all.map((page) => `${escape(page.name)} <b>✦</b>`).join(" ");
  return `      <div>${names}</div>`;
}

function replaceRegion(html, name, body) {
  const open = `<!-- build:${name} -->`;
  const close = `<!-- /build:${name} -->`;
  const start = html.indexOf(open);
  const end = html.indexOf(close);
  if (start < 0 || end < 0) throw new Error(`index.html is missing the ${name} region markers`);
  return `${html.slice(0, start + open.length)}\n${body}\n${html.slice(end)}`;
}

// ---------------------------------------------------------------- run

const outDir = join(root, "games");
if (existsSync(outDir)) rmSync(outDir, { recursive: true });
for (const page of ordered) {
  const dir = join(outDir, page.slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), gamePage(page, ordered), "utf8");
}

const indexPath = join(root, "index.html");
let index = readFileSync(indexPath, "utf8");
index = replaceRegion(index, "roster", rosterMarkup(ordered));
index = replaceRegion(index, "ticker", tickerMarkup(ordered));
writeFileSync(indexPath, index, "utf8");

console.log(`${ordered.length} pages → games/  (${games.games.filter((g) => !g.sandbox).length} games, ${games.culture})`);
