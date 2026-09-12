// Generates the game pages and their index from data/games.json, which
// cardz-win's scripts/export-games.ps1 projects out of the app's own catalog,
// and the generated half of make-a-game.html from the design kit, which
// cardz-win's scripts/export-design-kit.ps1 exports. See cardz-win
// docs/website-plan.md.
//
//   node build.mjs
//
// Everything else on the site stays hand-written. This only owns games/ (every
// game page and the index of them), decks.html, and the marked regions in
// make-a-game.html, so a redesign can move freely around it.

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { boardDiagram } from "./diagram.mjs";

const root = dirname(fileURLToPath(import.meta.url));
const STORE = "https://apps.microsoft.com/detail/9N96G6H34XCT";

// ---------------------------------------------------------------- data

const games = JSON.parse(readFileSync(join(root, "data/games.json"), "utf8"));
const roster = JSON.parse(readFileSync(join(root, "data/roster.json"), "utf8"));
const decks = JSON.parse(readFileSync(join(root, "data/decks.json"), "utf8"));
const deckArt = JSON.parse(readFileSync(join(root, "assets/decks/manifest.json"), "utf8"));
const designKit = JSON.parse(readFileSync(join(root, "data/design-kit.json"), "utf8"));
const reference = readFileSync(join(root, "data/rule-vocabulary.md"), "utf8");

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

// An extra game is offered here as a design file and is not built into the app
// (cardz-win docs/website-plan.md §11), so it is grouped under Extra games.
const isExtra = (page) => page.variants[0].inApp === false;

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

// ---------------------------------------------------------------- reference markdown

/**
 * The design reference is a document, not a rules blurb: sections, tables, JSON.
 * It gets a renderer of its own rather than a looser markdown(), which stays
 * strict so a preset description that grows a table still fails the build. This
 * one is strict too, over its own closed set — headings, paragraphs, nested "- "
 * lists, pipe tables, fenced code, `code`, **bold**, *italic* — and throws on
 * anything else.
 *
 * Headings drop a level: the page's own "Reference" section is the h2, so the
 * document's ## sections are h3s inside it, and its # title is the page's to set.
 */
function referenceMarkdown(source) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blockStart = /^(#{1,3} |```|\||\s*- )/;
  const html = [];
  const toc = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim() || /^---\s*$/.test(line) || /^# /.test(line)) {
      i++;
      continue;
    }

    const heading = line.match(/^(##|###) (.+)$/);
    if (heading) {
      const level = heading[1].length + 1;
      const id = slug(heading[2].replace(/[`*]/g, ""));
      if (level === 3) toc.push({ id, text: heading[2] });
      html.push(`<h${level} id="${id}">${inlineReference(heading[2])}</h${level}>`);
      i++;
      continue;
    }

    if (line.startsWith("```")) {
      const language = line.slice(3).trim();
      const body = [];
      for (i++; i < lines.length && !lines[i].startsWith("```"); i++) body.push(lines[i]);
      if (i === lines.length) throw new Error("The design reference has an unclosed code fence");
      i++;
      const cls = language ? ` class="language-${escape(language)}"` : "";
      html.push(`<pre><code${cls}>${escape(body.join("\n"))}</code></pre>`);
      continue;
    }

    if (line.startsWith("|")) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith("|")) rows.push(cells(lines[i++]));
      const [head, rule, ...body] = rows;
      if (!rule || !rule.every((cell) => /^:?-+:?$/.test(cell)))
        throw new Error(`The design reference has a table with no header rule: ${line}`);
      const th = head.map((cell) => `<th scope="col">${inlineReference(cell)}</th>`).join("");
      const tr = body.map((row) => `<tr>${row.map((cell) => `<td>${inlineReference(cell)}</td>`).join("")}</tr>`);
      html.push(`<div class="ref-table"><table><thead><tr>${th}</tr></thead><tbody>${tr.join("")}</tbody></table></div>`);
      continue;
    }

    if (/^\s*- /.test(line)) {
      const items = [];
      for (; i < lines.length && lines[i].trim() && !/^(#{1,3} |```|\|)/.test(lines[i]); i++) {
        const item = lines[i].match(/^(\s*)- (.*)$/);
        if (item) items.push({ depth: Math.floor(item[1].length / 2), text: item[2] });
        else items[items.length - 1].text += ` ${lines[i].trim()}`;
      }
      html.push(nestedList(items));
      continue;
    }

    if (/^\s*(>|\d+\. )/.test(line))
      throw new Error(`Unsupported markdown in the design reference: ${JSON.stringify(line)}`);

    const paragraph = [];
    while (i < lines.length && lines[i].trim() && !blockStart.test(lines[i]) && !/^---\s*$/.test(lines[i]))
      paragraph.push(lines[i++].trim());
    html.push(`<p>${inlineReference(paragraph.join(" "))}</p>`);
  }

  return { html: html.join("\n"), toc };
}

/** A pipe-table row's cells. A pipe inside `code` is text, not a cell break. */
function cells(line) {
  const body = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  const out = [];
  let cell = "";
  let code = false;
  for (const ch of body) {
    if (ch === "`") code = !code;
    if (ch === "|" && !code) {
      out.push(cell.trim());
      cell = "";
    } else cell += ch;
  }
  out.push(cell.trim());
  return out;
}

/** "- " items at two spaces per level, as a nested <ul>. */
function nestedList(items) {
  let out = "";
  let depth = -1;
  for (const item of items) {
    if (item.depth > depth + 1) throw new Error(`A list in the design reference skips a level: ${item.text}`);
    if (item.depth > depth) out += "<ul>";
    else {
      out += "</li>";
      for (let d = depth; d > item.depth; d--) out += "</ul></li>";
    }
    out += `<li>${inlineReference(item.text)}`;
    depth = item.depth;
  }
  out += "</li>";
  for (let d = depth; d > 0; d--) out += "</ul></li>";
  return `${out}</ul>`;
}

/**
 * Code spans are set aside behind @@codeN@@ placeholders before anything else, so a
 * `*` inside one stays text — and so emphasis can run across one, as in
 * **`AutoSend` offers the largest group first**. Neither `@` nor a digit is
 * something the emphasis patterns look at.
 */
function inlineReference(text) {
  const codes = [];
  const held = text.replace(/`([^`]+)`/g, (_, code) => `@@code${codes.push(code) - 1}@@`);
  return escape(held)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*\w])\*(?=\S)(.+?)(?<=\S)\*(?![*\w])/g, "$1<em>$2</em>")
    .replace(/@@code(\d+)@@/g, (_, n) => `<code>${escape(codes[Number(n)])}</code>`);
}

/**
 * The opening paragraph is set as a display lede — big Playfair against a gold
 * rule — which only works while it stays a one-line statement of the goal. A
 * preset that packs its whole rule set into that paragraph would render as a
 * wall of display type (Pyramid did), so past a sensible length the lede
 * treatment is simply dropped and the text reads as body copy.
 *
 * The cutoff clears the longest real goal — Crazy Quilt's, which runs to 253
 * characters in French — while still excluding a whole rule set. It has to
 * clear the translations, not just the English: fr/pt/es run 10–20% longer, and
 * a threshold tuned to English alone would quietly strip the lede from one
 * game in one locale.
 */
function ledeClass(rules) {
  const first = rules.split("\n").find((line) => line.trim() && !line.trim().startsWith("- ")) ?? "";
  return first.trim().length <= 280 ? " game-rules-primary" : "";
}

/** First sentence of the rules, stripped to plain text, for <meta description>. */
function summarize(page) {
  const first = (page.variants[0].rules ?? "").split("\n")[0];
  const plain = first.replace(/[*_]/g, "").replace(/\s+/g, " ").trim();
  return escape(plain.length > 150 ? `${plain.slice(0, 147).trimEnd()}…` : plain);
}

// ---------------------------------------------------------------- templates

// Marks the nav item you are looking at. Game pages pass nothing deliberately:
// a game page sits under Games but is not the games index, and aria-current on
// Games would tell a screen reader that it was.
const mark = (current, slug) => (current === slug ? ` aria-current="page"` : "");

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
    header: (current) => `  <header class="site-header">
    <a class="brand" href="${up}index.html" aria-label="Cardz home"><span aria-hidden="true">✣</span> Cardz</a>
    <nav aria-label="Main navigation">
      <a href="${up}index.html">Home</a><a href="${up}games/"${mark(current, "games")}>Games</a><a href="${up}decks.html"${mark(current, "decks")}>Decks</a><a href="${up}sandbox.html"${mark(current, "sandbox")}>Sandbox</a><a href="${up}make-a-game.html"${mark(current, "make-a-game")}>Make a game</a><a href="${up}privacy.html"${mark(current, "privacy")}>Privacy</a>
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
 * An extra is not in the app, so its call to action is the file itself. The file
 * must exist: games.json and the design kit come from two separate exports, and a
 * page offering a file neither wrote would break its only button.
 */
function extraCta(game, up) {
  if (!existsSync(join(root, game.download)))
    throw new Error(
      `games.json offers ${game.download} for ${game.name}, which is not on disk. ` +
        `Run cardz-win's scripts/export-design-kit.ps1.`
    );
  const file = game.download.split("/").pop();
  return `      <div class="game-cta">
        <a class="button" href="${up}${game.download}" download><span class="windows-mark" aria-hidden="true">↓</span><span><small>Download</small>${escape(file)}</span></a>
        <small>Not built into Cardz. Double-click the file to add it to Your games, and <a href="${STORE}">get Cardz for Windows</a> first if you need it.</small>
      </div>`;
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

/**
 * A game's screenshot, when roster.json names one. The importer writes both
 * sizes, so a capture named there without its images fails the build rather
 * than shipping a broken picture.
 */
function captureImage(page, up, sizes, loading) {
  if (!page.capture) return "";
  const base = `assets/screenshots/${page.slug}`;
  for (const width of [960, 1600])
    if (!existsSync(join(root, `${base}-${width}.webp`)))
      throw new Error(
        `data/roster.json names a capture for ${page.name}, but ${base}-${width}.webp is missing. ` +
          `Run scripts/import-screenshots.py.`
      );
  return `<img src="${up}${base}-960.webp" srcset="${up}${base}-960.webp 960w, ${up}${base}-1600.webp 1600w" sizes="${sizes}" alt="${escape(page.name)} in Cardz, played with the ${escape(page.capture.deck)} deck" width="1600" height="900" loading="${loading}">`;
}

/** The screenshot leads a game page, ahead of the drawn board. */
function captureFigure(page, up) {
  const image = captureImage(page, up, "(max-width: 808px) calc(100vw - 48px), 760px", "eager");
  if (!image) return "";
  return `      <figure class="game-capture">
        ${image}
        <figcaption>${escape(page.capture.deck)} deck</figcaption>
      </figure>
`;
}

/** One group of links in a game page's "more" navigation, or nothing. */
function moreGroup(title, pages, up) {
  if (!pages.length) return "";
  return `        <p class="eyebrow"><span></span> ${title}</p>
        <div>${pages.map((other) => `<a href="${up}games/${other.slug}/">${escape(other.name)}</a>`).join("")}</div>
`;
}

function gamePage(page, all) {
  const { up, head, header, footer } = chrome(2);
  const primary = page.variants[0];
  const grouped = page.variants.length > 1;
  const others = all.filter((other) => other.slug !== page.slug);
  const extra = isExtra(page);

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
${header()}
  <main id="main" class="game-main">
    <article class="game-shell">
      <a class="back-link" href="${up}games/${extra ? "#extras" : ""}"><span aria-hidden="true">←</span> ${extra ? "Extra games" : "Games"}</a>
      <p class="eyebrow"><span></span> ${escape(page.tagline)}</p>
      <h1>${escape(page.name)}</h1>
      <div class="game-facts">
        <span>${deckLine(primary)}</span>${extra ? `\n        <span>Extra game · download</span>` : ""}${variantStrip ? `\n        ${variantStrip}` : ""}
      </div>
${captureFigure(page, up)}${board(primary)}
      <div class="game-rules${ledeClass(primary.rules ?? "")}">
          ${markdown(primary.rules ?? "", page.slug)}
      </div>
${alternates}
${
  extra
    ? extraCta(primary, up)
    : `      <div class="game-cta">
        <a class="button" href="${STORE}"><span class="windows-mark" aria-hidden="true">⊞</span><span><small>Play it in</small>Cardz for Windows</span></a>
        <small>No ads, no accounts, fully offline.</small>
      </div>`
}
      <nav class="game-more" aria-label="Other games">
${moreGroup("More solitaire", others.filter((other) => !isExtra(other)), up)}${moreGroup("Extra games", others.filter(isExtra), up)}      </nav>
    </article>
  </main>
${footer}
</body>
</html>
`;
}

// ---------------------------------------------------------------- decks

function deckPage() {
  const { head, header, footer } = chrome(0);
  const cards = decks.decks
    .map((deck) => {
      const art = deckArt[deck.slug];
      if (!art)
        throw new Error(
          `data/decks.json lists '${deck.slug}', but assets/decks/manifest.json has no art for it. ` +
            `Run cardz-win's scripts/build-deck-gallery.mjs.`
        );
      const credit = deck.credit ? `\n          <p class="deck-credit">${escape(deck.credit)}</p>` : "";
      return `        <article class="deck-card">
          <img src="assets/decks/${art.file}" width="${art.width}" height="${art.height}" loading="lazy"
               alt="Three cards from the ${escape(deck.name)} deck: the back, the King of Spades, and the Ace of Hearts">
          <h2>${escape(deck.name)}</h2>
          <p>${escape(deck.blurb)}</p>${credit}
        </article>`;
    })
    .join("\n");

  return `${head(
    "Card decks — Cardz",
    "Every card deck in Cardz: the house deck, Norse woodcut, Egyptian papyrus, pressed botanicals, engraved filigree, midnight neon, gothic horror, and more."
  )}
<body class="decks-page">
  <a class="skip-link" href="#main">Skip to content</a>
${header("decks")}
  <main id="main" class="decks-main">
    <header class="decks-head">
      <p class="eyebrow"><span></span> ${decks.decks.length} decks</p>
      <h1>Every hand<br><em>takes you places.</em></h1>
      <p class="lede">A deck is not a skin in Cardz — each one brings its own table, its own suit colours, and its own painted courts and jokers. Switch at any time, mid-game.</p>
    </header>
    <section class="deck-grid" aria-label="Illustrated decks">
${cards}
    </section>
    <section class="decks-note">
      <p>${escape(decks.note)}</p>
    </section>
    <section class="decks-cta">
      <a class="button" href="${STORE}"><span class="windows-mark" aria-hidden="true">⊞</span><span><small>Get it on the</small>Microsoft Store</span></a>
    </section>
  </main>
${footer}
</body>
</html>
`;
}

// ---------------------------------------------------------------- games index

/**
 * Every game page, from one card: the games built into Cardz, then the extras,
 * which are offered as design files (cardz-win docs/website-plan.md §11). A card
 * shows the game's screenshot when roster.json names one and its drawn board
 * otherwise. An extra's card adds what its file shows and a download; that joins
 * the two exports, games.json for the page and the design kit for the file, and
 * the build fails where they disagree. Order is roster.json's.
 */
function gamesPage(all) {
  const { up, head, header, footer } = chrome(1);
  if (!Array.isArray(designKit.games))
    throw new Error("data/design-kit.json has no games list. Run cardz-win's scripts/export-design-kit.ps1.");

  const card = (page) => {
    const game = page.variants[0];
    const extra = isExtra(page);
    const kit = extra ? designKit.games.find((entry) => `designs/${entry.file}` === game.download) : null;
    if (extra && (!kit || !existsSync(join(root, game.download))))
      throw new Error(
        `${game.name} offers ${game.download}, which the design kit did not write. ` +
          `Run cardz-win's scripts/export-design-kit.ps1.`
      );
    const shot = captureImage(page, up, "(max-width: 700px) calc(100vw - 48px), 460px", "lazy");
    const diagram = shot ? null : boardDiagram(game, games.layout);
    const facts = page.capture ? `${deckLine(game)} · ${escape(page.capture.deck)} deck` : deckLine(game);
    return `        <article class="game-card">
          <a class="game-card-art${shot ? " game-card-shot" : ""}" href="${page.slug}/" tabindex="-1" aria-hidden="true">${shot || (diagram ? diagram.svg : "")}</a>
          <p class="eyebrow"><span></span> ${escape(page.tagline)}</p>
          <h3><a href="${page.slug}/">${escape(page.name)}</a>${page.new ? " <b>New</b>" : ""}</h3>
          <p class="game-card-facts">${facts}</p>${
            extra
              ? `
          <p class="game-card-note">${escape(kit.note)}</p>`
              : ""
          }
          <div class="game-card-actions">${
            extra
              ? `
            <a class="button button-small" href="${up}${game.download}" download>Download</a>`
              : ""
          }
            <a class="feature-link" href="${page.slug}/">How to play <span aria-hidden="true">→</span></a>
          </div>
        </article>`;
  };

  return `${head(
    "Solitaire games — how to play | Cardz",
    "Solitaire games to play in Cardz, each with its rules and its board, and extra games to download and add to Your games."
  )}
<body class="games-page">
  <a class="skip-link" href="#main">Skip to content</a>
${header("games")}
  <main id="main" class="games-main">
    <header class="games-head">
      <p class="eyebrow"><span></span> Games</p>
      <h1>Choose a game.<br><em>Learn how it plays.</em></h1>
      <p class="lede">Each game has a page of its own, with its rules and its board. The games in Cardz are there as soon as you install it; the extra games are a download away.</p>
    </header>
    <section class="games-section" aria-labelledby="in-cardz-title">
      <div class="games-section-head">
        <h2 id="in-cardz-title">In Cardz</h2>
        <p>Built into Cardz and ready to play.</p>
      </div>
      <div class="games-grid">
${all.filter((page) => !isExtra(page)).map(card).join("\n")}
      </div>
    </section>
    <section class="games-section" id="extras" aria-labelledby="extras-title">
      <div class="games-section-head">
        <h2 id="extras-title">Extra games</h2>
        <p>Games that aren't built into Cardz. Download one and double-click the file: it joins Your games and plays like any other game there.</p>
        <p>Each one is also a design file. Open it in a text editor to see how its rules are put together, or change it into a game of your own — <a href="${up}make-a-game.html">Make a game</a> explains how.</p>
      </div>
      <div class="games-grid">
${all.filter(isExtra).map(card).join("\n")}
      </div>
    </section>
    <section class="games-cta">
      <a class="button" href="${STORE}"><span class="windows-mark" aria-hidden="true">⊞</span><span><small>Get it on the</small>Microsoft Store</span></a>
      <small>No ads, no accounts, fully offline.</small>
    </section>
  </main>
${footer}
</body>
</html>
`;
}

function tocMarkup(toc) {
  return toc
    .map((entry) => `            <li><a href="#${entry.id}">${inlineReference(entry.text)}</a></li>`)
    .join("\n");
}

// ---------------------------------------------------------------- regions

function replaceRegion(html, name, body, file) {
  const open = `<!-- build:${name} -->`;
  const close = `<!-- /build:${name} -->`;
  const start = html.indexOf(open);
  const end = html.indexOf(close);
  if (start < 0 || end < 0) throw new Error(`${file} is missing the ${name} region markers`);
  return `${html.slice(0, start + open.length)}\n${body}\n${html.slice(end)}`;
}

function rewrite(file, regions) {
  const path = join(root, file);
  let html = readFileSync(path, "utf8");
  for (const [name, body] of Object.entries(regions)) html = replaceRegion(html, name, body, file);
  writeFileSync(path, html, "utf8");
}

// ---------------------------------------------------------------- run

if (!existsSync(join(root, "designs/schema.json")))
  throw new Error("designs/schema.json is missing. Run cardz-win's scripts/export-design-kit.ps1.");

const outDir = join(root, "games");
if (existsSync(outDir)) rmSync(outDir, { recursive: true });
for (const page of ordered) {
  const dir = join(outDir, page.slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), gamePage(page, ordered), "utf8");
}

writeFileSync(join(outDir, "index.html"), gamesPage(ordered), "utf8");
writeFileSync(join(root, "decks.html"), deckPage(), "utf8");

const rendered = referenceMarkdown(reference);
rewrite("make-a-game.html", {
  "reference-toc": tocMarkup(rendered.toc),
  reference: rendered.html,
});

console.log(
  `${ordered.length} pages → games/  (${games.games.filter((g) => !g.sandbox).length} games, ${ordered.filter(isExtra).length} of them extras, ${games.culture})\n` +
    `decks.html  (${decks.decks.length} decks)\n` +
    `games/index.html  (${ordered.length} cards, ${ordered.filter((page) => page.capture).length} with a screenshot)\n` +
    `make-a-game.html  (${rendered.toc.length} reference sections)`
);
