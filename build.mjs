// Generates the game pages and their index from data/games.json, which
// cardz-win's scripts/export-games.ps1 projects out of the app's own catalog,
// and the generated half of make-a-game.html from the design kit, which
// cardz-win's scripts/export-design-kit.ps1 exports. See cardz-win
// docs/website-plan.md.
//
//   node build.mjs
//
// Everything else on the site stays hand-written. This only owns games/ (every
// game page and the index of them), decks.html, and the marked regions of the
// hand-written pages: each one's head, header and footer, and make-a-game.html's
// reference. A redesign can move freely
// around those.
//
// It builds the site once per language in i18n.mjs: English at the root, and each
// other language in its own folder (fr/, pt/, es/), from translations kept beside
// the code in locales/, never in it. Every English string below is asked for
// through s() or a catalogue, with the English inline; see i18n.mjs.
//
//   node build.mjs --sync   also brings locales/ in line with what the build asked

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { boardDiagram } from "./diagram.mjs";
import { LOCALES, NEUTRAL, Catalog, localizePage, pagePath } from "./i18n.mjs";

const root = dirname(fileURLToPath(import.meta.url));
const STORE = "https://apps.microsoft.com/detail/9N96G6H34XCT";
const LITE_STORE = "https://apps.microsoft.com/detail/9PL2LZN8H36G";
const SITE = "https://cardz.roderic.dev/";

// The hand-written pages that can be published in another language: each is
// translated by its own locales/<code>/pages/<page>.json, and appears in a language
// only once every string it marks is translated there.
const HAND_WRITTEN = ["index", "lite", "sandbox", "make-a-game", "privacy"];

// The one navigation every page wears, generated or hand-written. Home is the brand
// link, and Privacy and Contact sit in the footer. Labels are English; s() gives
// them in the page's language.
const NAV = [
  ["games", "games/", "Games"],
  ["decks", "decks.html", "Decks"],
  ["sandbox", "sandbox.html", "Sandbox"],
  ["make-a-game", "make-a-game.html", "Make a game"],
  ["lite", "lite.html", "Cardz Lite"],
];

// ---------------------------------------------------------------- data

const games = JSON.parse(readFileSync(join(root, "data/games.json"), "utf8"));
const roster = JSON.parse(readFileSync(join(root, "data/roster.json"), "utf8"));
const decks = JSON.parse(readFileSync(join(root, "data/decks.json"), "utf8"));
const deckArt = JSON.parse(readFileSync(join(root, "assets/decks/manifest.json"), "utf8"));
const designKit = JSON.parse(readFileSync(join(root, "data/design-kit.json"), "utf8"));
// The extra decks the gallery offers as .cardzdeck downloads, written by cardz-win's
// scripts/export-deck-packs.ps1. Absent until that has run once: no deck downloads.
const deckDownloads = existsSync(join(root, "data/deck-downloads.json"))
  ? JSON.parse(readFileSync(join(root, "data/deck-downloads.json"), "utf8"))
  : { decks: [] };
const reference = readFileSync(join(root, "data/rule-vocabulary.md"), "utf8");

// Variants of one game share a page: two near-identical pages would compete
// with each other for the same search, and neither would deserve to win. What
// makes them variants is being bindings of one template (`variant.of`), not
// sharing a `family` — a family is a free grouping of related but separate
// games (a Spiderette is a Spider), and merging on it would bury a whole game
// inside another game's page.
const pages = new Map();
for (const game of games.games) {
  if (game.sandbox) continue; // Sandbox has its own hand-written page.
  const key = game.variant?.of ? slug(game.variant.of) : game.slug;
  if (!pages.has(key))
    pages.set(key, { slug: key, name: game.variant?.name ?? game.name, variants: [] });
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

// A built-in game's page shows its design file (cardz-win docs/website-plan.md §12).
// Which games qualify is the export's decision, so the build only checks that each
// file it names lands on a page that exists and is on disk.
if (!Array.isArray(designKit.builtIns))
  throw new Error("data/design-kit.json has no builtIns list. Run cardz-win's scripts/export-design-kit.ps1.");
for (const entry of designKit.builtIns) {
  const page = ordered.find((candidate) => candidate.slug === entry.page);
  if (!page || isExtra(page))
    throw new Error(`data/design-kit.json shows a design file on '${entry.page}', which is no built-in game's page.`);
  if (!existsSync(join(root, entry.source)))
    throw new Error(`data/design-kit.json names ${entry.source}, which is not on disk. Run cardz-win's scripts/export-design-kit.ps1.`);
}

// ---------------------------------------------------------------- languages

// The app's exporter writes the same catalog once per language
// (games.<code>.json): the rules prose, variant axes and labels in that language,
// everything else as games.json has it. A game a language's file lacks (one it was
// last exported without) keeps only its English page, and that language links to it.
const sync = process.argv.includes("--sync");
const languages = LOCALES.filter(
  (locale) => locale === NEUTRAL || existsSync(join(root, "locales", locale.code))
).map((locale) => {
  const file = join(root, `data/games.${locale.code}.json`);
  const data = locale === NEUTRAL ? games : existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : { games: [] };
  return {
    locale,
    catalog: new Catalog(root, locale),
    bySlug: new Map(data.games.map((game) => [game.slug, game])),
    localized: new Set(),
  };
});

// The language being built: every template reads it through s() and the helpers
// below, rather than threading it through each one.
let here;

/** A string of build.mjs's own, in the language being built. */
const s = (key, english, vars) => here.catalog.t("site", key, english, vars);

/** A page's variants in the language being built, or null when it lacks any of them. */
function localVariants(page, language = here) {
  const variants = page.variants.map((variant) => language.bySlug.get(variant.slug));
  return variants.every(Boolean) ? variants : null;
}

/** A Store link that opens the Store's page in the language being built. */
const store = (url) => (here.locale.store ? `${url}?hl=${here.locale.store}` : url);

/** The tagline roster.json gives a page, in the language being built. */
const tagline = (page) => here.catalog.t("roster", page.slug, page.tagline);

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

/**
 * JSON, escaped for HTML, with its keys, strings, numbers and literals in spans the
 * stylesheet colours. Only ever given a design file or a reference example, so it
 * tokenises rather than parses: whatever is not a token is punctuation and space.
 */
function highlightJson(text) {
  const token = /("(?:[^"\\]|\\.)*")(\s*:)?|\b(true|false|null)\b|-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/g;
  let out = "";
  let last = 0;
  for (const match of text.matchAll(token)) {
    out += escape(text.slice(last, match.index));
    const [whole, string, colon, literal] = match;
    if (string) out += `<span class="${colon ? "j-key" : "j-str"}">${escape(string)}</span>${colon ?? ""}`;
    else out += `<span class="${literal ? "j-lit" : "j-num"}">${escape(whole)}</span>`;
    last = match.index + whole.length;
  }
  return out + escape(text.slice(last));
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
      const code = language === "json" ? highlightJson(body.join("\n")) : escape(body.join("\n"));
      html.push(`<pre><code${cls}>${code}</code></pre>`);
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
function summarize(variants) {
  const first = (variants[0].rules ?? "").split("\n")[0];
  const plain = first.replace(/[*_]/g, "").replace(/\s+/g, " ").trim();
  return escape(plain.length > 150 ? `${plain.slice(0, 147).trimEnd()}…` : plain);
}

// ---------------------------------------------------------------- templates

// Marks the nav item you are looking at. Game pages pass nothing deliberately:
// a game page sits under Games but is not the games index, and aria-current on
// Games would tell a screen reader that it was.
const mark = (current, slug) => (current === slug ? ` aria-current="page"` : "");

/** A link's href form of a page path: `games/index.html` is `games/`. */
const hrefOf = (path) => path.replace(/(^|\/)index\.html$/, "$1");

/**
 * A page's chrome, for a page at `path` inside the language being built, `depth`
 * folders below that language's root. `up` climbs to the language's root, `root`
 * to the site's, where the assets are. `link` reaches another page in this
 * language when it has one, and the English page when it does not.
 */
function chrome(depth, path) {
  const up = "../".repeat(depth);
  const root = up + (here.locale.dir ? "../" : "");
  const link = (href) => (here.localized.has(pagePath(href)) ? up + href : root + href);
  const others = languages.filter((language) => language.localized.has(path));
  // A page in one language only has no alternates to name.
  const alternates = (others.length > 1 ? others : [])
    .map((language) => `  <link rel="alternate" hreflang="${language.locale.tag}" href="${SITE}${language.locale.dir}${hrefOf(path)}">`)
    .concat(others.length > 1 ? [`  <link rel="alternate" hreflang="x-default" href="${SITE}${hrefOf(path)}">`] : [])
    .join("\n");
  // Every page offers every language: this page where the language has it, and
  // the language's home page where it does not, so a reader always has a way back.
  const languageLinks = languages
    .map((language) => {
      const target = language === here || language.localized.has(path) ? hrefOf(path) : "";
      const href = (language === here ? up : root + language.locale.dir) + target || "./";
      return language === here
        ? `<a href="${href}" lang="${language.locale.tag}" aria-current="true">${language.locale.name}</a>`
        : `<a href="${href}" lang="${language.locale.tag}" hreflang="${language.locale.tag}">${language.locale.name}</a>`;
    })
    .join("");
  // The header's menu: a <details>, so it opens without script; languages.js only
  // closes it on a click outside or on Escape.
  const languageMenu = `<details class="language-menu">
      <summary aria-label="${s("header.language", "Language: {name}", { name: here.locale.name })}"><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/></svg><span>${here.locale.code.toUpperCase()}</span></summary>
      <div>${languageLinks}</div>
    </details>`;
  // An English page carries what languages.js offers a reader whose browser
  // prefers another language, each offer in its own language.
  const offers =
    here.locale === NEUTRAL
      ? `\n  <script type="application/json" id="language-offers">${JSON.stringify(
          Object.fromEntries(
            languages
              .filter((language) => language.locale !== NEUTRAL)
              .map(({ locale, catalog }) => [
                locale.code,
                {
                  tag: locale.tag,
                  text: catalog.t("site", "offer.text", "This site is also in English."),
                  go: catalog.t("site", "offer.go", "Read it in English"),
                  close: catalog.t("site", "offer.close", "No thanks"),
                },
              ])
          )
        ).replaceAll("<", "\\u003c")}</script>`
      : "";
  const languageScript = `\n  <script src="${root}languages.js" defer></script>`;
  // What deck.js and mode-demos.js say, in this language. English pages need none:
  // the scripts carry their English.
  const scriptStrings = here.locale === NEUTRAL ? "" : `\n  <script type="application/json" id="site-strings">${JSON.stringify(clientStrings(up)).replaceAll("<", "\\u003c")}</script>`;
  return {
    up,
    root,
    link,
    // The hand-written pages' own <head> keeps everything but this: the language
    // alternates and the scripts' strings.
    headExtra: `${alternates}${scriptStrings}${offers}${languageScript}`.replace(/^\n/, ""),
    head: (title, description) => `<!doctype html>
<html lang="${here.locale.tag}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${description}">
  <meta name="theme-color" content="#100f14">
  <title>${title}</title>
  <link rel="icon" href="${root}assets/cardz-logo.png">
  <link rel="stylesheet" href="${root}styles.css">
${alternates ? `${alternates}\n` : ""}${`${scriptStrings}${offers}${languageScript}`.slice(1)}
  <script src="${root}deck.js"></script>
</head>`,
    // Cardz Lite's page sells Lite, so its button goes to Lite's Store page.
    header: (current) => `  <header class="site-header">
    <a class="brand" href="${link("index.html")}" aria-label="${s("header.home", "Cardz home")}"><span aria-hidden="true">✣</span> Cardz</a>
    <nav aria-label="${s("header.nav", "Main navigation")}">
      ${NAV.map(([slug, href, label]) => `<a href="${link(href)}"${mark(current, slug)}>${s(`nav.${slug}`, label)}</a>`).join("")}
    </nav>
    ${languageMenu}
    ${
      current === "lite"
        ? `<a class="button button-small" href="${store(LITE_STORE)}">${s("header.get-lite", "Get Cardz Lite")}</a>`
        : `<a class="button button-small" href="${store(STORE)}">${s("header.get", "Get Cardz")}</a>`
    }
  </header>`,
    footer: `  <footer><a class="brand" href="${link("index.html")}"><span aria-hidden="true">✣</span> Cardz</a><p>${s("footer.tagline", "Solitaire, your way.")}</p><div>${NAV.map(
      ([slug, href, label]) => `<a href="${link(href)}">${s(`nav.${slug}`, label)}</a>`
    ).join("")}<a href="${link("privacy.html")}">${s("footer.privacy", "Privacy")}</a><a href="mailto:cardz@roderic.dev">${s("footer.contact", "Contact")}</a></div><small>© 2026 Cardz</small></footer>`,
  };
}

/**
 * What the site's two scripts say, for a page in a language other than English.
 * `home` is where that language's pages start, so deck.js's hero link stays in it.
 */
function clientStrings(up) {
  return {
    home: up || "./",
    deckPicker: s("js.deck-picker", "Deal this site with another deck"),
    deckButton: s("js.deck-button", "{name} deck"),
    heroAlt: s("js.hero-alt", "{game} in Cardz, played with the {name} deck"),
    heroLink: s("js.hero-link", "How to play ↗"),
    decksHint: s("js.decks-hint", "Switch at any time, even mid-game. Pick one, and this site is dealt with it too."),
    play: s("js.demo-play", "Play demo"),
    pause: s("js.demo-pause", "Pause demo"),
    playNamed: s("js.demo-play-named", "Play {name}"),
    pauseNamed: s("js.demo-pause-named", "Pause {name}"),
  };
}

function deckLine(game) {
  const { cards, jokers } = game.decks;
  // Deliberately ignores decks.packs, which counts deck *copies*: Spider is
  // eight copies of a single-suit pack, and a player calls that two decks.
  const decks = cards % 52 === 0 ? cards / 52 : null;
  const base =
    decks === 1
      ? s("facts.one-deck", "One deck")
      : decks === 2
        ? s("facts.two-decks", "Two decks")
        : decks
          ? s("facts.decks", "{n} decks", { n: decks })
          : s("facts.cards", "{n} cards", { n: cards });
  return jokers ? s("facts.jokers", "{decks} · {n} jokers", { decks: base, n: jokers }) : base;
}

/** The board's words, in the language being built, for diagram.mjs. */
const diagramText = (key, english, vars) => here.catalog.t("site", key, english, vars);

/**
 * An extra is not in the app, so its call to action is the file itself. The file
 * must exist: games.json and the design kit come from two separate exports, and a
 * page offering a file neither wrote would break its only button.
 */
function extraCta(game, root) {
  if (!existsSync(joinRoot(game.download)))
    throw new Error(
      `games.json offers ${game.download} for ${game.name}, which is not on disk. ` +
        `Run cardz-win's scripts/export-design-kit.ps1.`
    );
  const file = game.download.split("/").pop();
  return `      <div class="game-cta">
        <a class="button" href="${root}${game.download}" download><span class="windows-mark" aria-hidden="true">↓</span><span><small>${s("cta.download", "Download")}</small>${escape(file)}</span></a>
        <small>${s("cta.extra-note", 'Not built into Cardz. Download and open it in <a href="{store}">Cardz</a>.', { store: store(STORE) })}</small>
      </div>`;
}

const joinRoot = (path) => join(root, path);

/**
 * The game's design file, folded away under the rules: the text a person would write to
 * make this game in Cardz (cardz-win docs/website-plan.md §12). A built-in's comes from
 * the design kit's builtIns list, and shows the binding a grouped page leads with; an
 * extra's is the very file its download button offers. A built-in the export did not
 * write a file for shows none. The file itself is the design format, which is English
 * in every language; what is said about it is not.
 */
function designSource(page, link) {
  const extra = isExtra(page);
  const primary = page.variants[0];
  let path, note, lead;
  if (extra) {
    path = primary.download;
    const entry = designKit.games.find((candidate) => `designs/${candidate.file}` === path);
    note = entry?.note && here.catalog.t("design-kit", entry.file, entry.note);
    lead = s("source.lead-extra", "This is the file the download button gives you.");
  } else {
    const entry = designKit.builtIns.find((candidate) => candidate.page === page.slug);
    if (!entry) return "";
    path = entry.source;
    note = entry.note && here.catalog.t("design-kit", entry.page, entry.note);
    lead =
      page.variants.length > 1
        ? s("source.lead-variant", "This is {name}; the other variants change a line or two.", { name: escape(entry.name) })
        : s("source.lead", "Written as a design file, this is the whole game.");
  }
  if (!existsSync(joinRoot(path)))
    throw new Error(`${page.name} shows ${path}, which is not on disk. Run cardz-win's scripts/export-design-kit.ps1.`);
  const text = readFileSync(joinRoot(path), "utf8").replace(/\r\n/g, "\n").trimEnd();
  const lines = text.split("\n").length;
  return `      <details class="game-source">
        <summary>${s("source.summary", "Read its design file")} <small>${s("source.lines", "{n} lines", { n: lines })}</small></summary>
        <p>${note ? `${escape(note)} ` : ""}${lead} ${s("source.explains", '<a href="{href}">Make a game</a> explains every part of it.', { href: link("make-a-game.html") })}</p>
        <pre><code class="language-json">${highlightJson(text)}</code></pre>
      </details>
`;
}

/**
 * The board, to scale, from the depot coordinates — no screenshot involved, so
 * it cannot fall behind the game the way a photograph of one deal does.
 * A wide board (Crazy Quilt) gets to run wider than the reading column, unless
 * a screenshot leads the page: then the board stays as wide as the screenshot.
 */
function board(game, underCapture) {
  const diagram = boardDiagram(game, games.layout, diagramText);
  if (!diagram) return "";
  // A long board earns room past the reading column; a squarish one (Clock's
  // face, Beleaguered Castle's column) would otherwise tower over the page.
  const wide = diagram.ratio > 1.6 && !underCapture;
  const shape = wide ? " game-board-wide" : diagram.ratio < 1.2 ? " game-board-tall" : "";
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
function captureImage(page, root, sizes, loading) {
  if (!page.capture) return "";
  const base = `assets/screenshots/${page.slug}`;
  for (const width of [960, 1600])
    if (!existsSync(joinRoot(`${base}-${width}.webp`)))
      throw new Error(
        `data/roster.json names a capture for ${page.name}, but ${base}-${width}.webp is missing. ` +
          `Run scripts/import-screenshots.py.`
      );
  const alt = s("capture.alt", "{game} in Cardz, played with the {deck} deck", { game: escape(page.name), deck: escape(page.capture.deck) });
  return `<img src="${root}${base}-960.webp" srcset="${root}${base}-960.webp 960w, ${root}${base}-1600.webp 1600w" sizes="${sizes}" alt="${alt}" width="1600" height="900" loading="${loading}">`;
}

/** The screenshot leads a game page, ahead of the drawn board. */
function captureFigure(page, root) {
  const image = captureImage(page, root, "(max-width: 808px) calc(100vw - 48px), 760px", "eager");
  if (!image) return "";
  return `      <figure class="game-capture">
        ${image}
        <figcaption>${s("capture.caption", "{deck} deck", { deck: escape(page.capture.deck) })}</figcaption>
      </figure>
`;
}

/** Another game page, in this language when it has one and in English when not. */
const gameLink = (other, link) => link(`games/${other.slug}/`);

/** One group of links in a game page's "more" navigation, or nothing. */
function moreGroup(title, pages, link) {
  if (!pages.length) return "";
  return `        <p class="eyebrow"><span></span> ${title}</p>
        <div>${pages.map((other) => `<a href="${gameLink(other, link)}">${escape(other.name)}</a>`).join("")}</div>
`;
}

/**
 * A Cardz original is a game invented for Cardz rather than one handed down at the
 * card table, so its page says so before anything else about the board. roster.json
 * marks it, since the claim is the site's voice and not a preset's.
 */
function originMark(page) {
  if (!page.original) return "";
  return `      <p class="game-origin"><b>${s("original.badge", "Cardz original")}</b> ${s("original.note", "Invented for Cardz.")}</p>
`;
}

/**
 * What else a game is called, and the family it belongs to, under the facts strip.
 * Aliases are every variant's, so a page sharing variants lists each name once. The
 * family links the other pages in it, as the app's Games page groups them; a family
 * with no other page says nothing a reader could follow, so it is left out, and so is
 * a game the app files under no family.
 */
function gameKin(page, all, link) {
  const names = new Set([page.name, ...page.variants.map((v) => v.name)]);
  const aliases = [...new Set(page.variants.flatMap((v) => v.aliases ?? []))].filter((a) => !names.has(a));
  const family = page.variants.map((v) => v.family).find(Boolean);
  const kin = family
    ? all.filter((other) => other.slug !== page.slug && other.variants.some((v) => v.family === family))
    : [];
  const rows = [];
  if (aliases.length)
    rows.push(`        <div><dt>${s("kin.aliases", "Also known as")}</dt><dd>${aliases.map(escape).join(", ")}</dd></div>`);
  if (kin.length)
    rows.push(
      `        <div><dt>${s("kin.family", "{family} family", { family: escape(family) })}</dt><dd>${kin
        .map((other) => `<a href="${gameLink(other, link)}">${escape(other.name)}</a>`)
        .join(", ")}</dd></div>`
    );
  if (!rows.length) return "";
  return `      <dl class="game-kin">
${rows.join("\n")}
      </dl>
`;
}

function gamePage(page, all) {
  const { root, link, head, header, footer } = chrome(2, `games/${page.slug}/index.html`);
  const variants = localVariants(page);
  const primary = variants[0];
  const grouped = variants.length > 1;
  const others = all.filter((other) => other.slug !== page.slug);
  const extra = isExtra(page);

  const variantStrip = grouped
    ? `<span>${s("facts.variants", "{axis}: {labels}", {
        axis: escape(primary.variant.selections[0].axis),
        labels: variants.map((v) => escape(v.variant.label)).join(" · "),
      })}</span>`
    : "";

  // The rules above are the default variant's in full; the others differ by a
  // line or two, so they fold away rather than restate the whole game. A game
  // whose one description covers every variant has nothing to fold away.
  const differing = variants.slice(1).filter((v) => v.rules !== primary.rules);
  const alternates = differing.length
    ? `
      <div class="game-variants">
        <h2>${s("variants.title", "Variants")}</h2>
        <p>${s("variants.lead", "The rules above are {name}. Here is how the other variants differ.", { name: escape(primary.name) })}</p>
${differing
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

  return `${head(s("game.title", "{name} — how to play | Cardz", { name: escape(page.name) }), summarize(variants))}
<body class="game-page">
  <a class="skip-link" href="#main">${s("skip", "Skip to content")}</a>
${header()}
  <main id="main" class="game-main">
    <article class="game-shell">
      <a class="back-link" href="${link("games/")}${extra ? "#extras" : ""}"><span aria-hidden="true">←</span> ${extra ? s("back.extras", "Extra games") : s("back.games", "Games")}</a>
      <p class="eyebrow"><span></span> ${escape(tagline(page))}</p>
      <h1>${escape(page.name)}</h1>
      <div class="game-facts">
        <span>${deckLine(primary)}</span>${extra ? `\n        <span>${s("facts.extra", "Extra game · download")}</span>` : ""}${variantStrip ? `\n        ${variantStrip}` : ""}
      </div>
${gameKin(page, all, link)}${originMark(page)}${captureFigure(page, root)}${board(primary, Boolean(page.capture))}
      <div class="game-rules${ledeClass(primary.rules ?? "")}">
          ${markdown(primary.rules ?? "", page.slug)}
      </div>
${alternates}
${designSource(page, link)}${
  extra
    ? extraCta(primary, root)
    : `      <div class="game-cta">
        <a class="button" href="${store(STORE)}"><span class="windows-mark" aria-hidden="true">⊞</span><span><small>${s("cta.play-in", "Play it in")}</small>${s("cta.windows", "Cardz for Windows")}</span></a>
        <small>${s("cta.qualities", "No ads, no accounts, fully offline.")}</small>
      </div>`
}
      <nav class="game-more" aria-label="${s("more.label", "Other games")}">
${moreGroup(s("more.solitaire", "More solitaire"), others.filter((other) => !isExtra(other)), link)}${moreGroup(s("more.extras", "Extra games"), others.filter(isExtra), link)}      </nav>
    </article>
  </main>
${footer}
</body>
</html>
`;
}

// ---------------------------------------------------------------- decks

/**
 * An extra deck is not in the app, so its card carries the file and how to add it.
 * The file must exist, and every download must belong to a deck the gallery shows:
 * the downloads and the gallery copy come from two places, and either one alone
 * would offer a file nobody can see or show a deck nobody can get.
 */
function deckDownload(deck, root) {
  const download = deckDownloads.decks.find((entry) => entry.slug === deck.slug);
  if (!download) return "";
  if (!existsSync(joinRoot(download.file)))
    throw new Error(
      `data/deck-downloads.json offers ${download.file} for ${deck.name}, which is not on disk. ` +
        `Run cardz-win's scripts/export-deck-packs.ps1.`
    );
  return `
          <div class="deck-download">
            <a class="button button-small" href="${root}${download.file}" download>${s("cta.download", "Download")}</a>
            <small>${s("decks.extra-note", "Not built into Cardz. Download and open it in Cardz.")}</small>
          </div>`;
}

function deckPage() {
  const { root, head, header, footer } = chrome(0, "decks.html");
  const d = here.catalog.scope("decks");
  const orphans = deckDownloads.decks.filter((entry) => !decks.decks.some((deck) => deck.slug === entry.slug));
  if (orphans.length)
    throw new Error(
      `data/deck-downloads.json offers ${orphans.map((entry) => `'${entry.slug}'`).join(", ")}, ` +
        `which data/decks.json does not list. Add its copy there.`
    );
  const cards = decks.decks
    .map((deck) => {
      const art = deckArt[deck.slug];
      if (!art)
        throw new Error(
          `data/decks.json lists '${deck.slug}', but assets/decks/manifest.json has no art for it. ` +
            `Run cardz-win's scripts/build-deck-gallery.mjs.`
        );
      const credit = deck.credit ? `\n          <p class="deck-credit">${escape(d(`${deck.slug}.credit`, deck.credit))}</p>` : "";
      const alt = s("decks.alt", "Three cards from the {name} deck: the back, the King of Spades, and the Ace of Hearts", { name: escape(deck.name) });
      return `        <article class="deck-card" id="${deck.slug}">
          <img src="${root}assets/decks/${art.file}" width="${art.width}" height="${art.height}" loading="lazy"
               alt="${alt}">
          <h2>${escape(deck.name)}</h2>
          <p>${escape(d(`${deck.slug}.blurb`, deck.blurb))}</p>${credit}${deckDownload(deck, root)}
        </article>`;
    })
    .join("\n");

  return `${head(
    s("decks.title", "Card decks — Cardz"),
    s(
      "decks.description",
      "Every card deck in Cardz: the house deck, Norse woodcut, Egyptian papyrus, pressed botanicals, engraved filigree, midnight neon, gothic horror, and more."
    )
  )}
<body class="decks-page">
  <a class="skip-link" href="#main">${s("skip", "Skip to content")}</a>
${header("decks")}
  <main id="main" class="decks-main">
    <header class="decks-head">
      <p class="eyebrow"><span></span> ${s("nav.decks", "Decks")}</p>
      <h1>${s("decks.heading", "Change the deck.<br><em>Change the table.</em>")}</h1>
      <p class="lede">${s("decks.lede", "Switch at any time, even mid-game.")}</p>
    </header>
    <section class="deck-grid" aria-label="${s("decks.grid", "Illustrated decks")}">
${cards}
    </section>
    <section class="decks-note">
      <p>${escape(d("note", decks.note))}</p>
    </section>
    <section class="decks-cta">
      <a class="button" href="${store(STORE)}"><span class="windows-mark" aria-hidden="true">⊞</span><span><small>${s("cta.store-small", "Get it on the")}</small>${s("cta.store", "Microsoft Store")}</span></a>
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
 * otherwise. An extra's card reads as a built-in's, plus a download; the build
 * fails if the design kit did not write the file it offers. Order is roster.json's.
 */
function gamesPage(all) {
  const { root, link, head, header, footer } = chrome(1, "games/index.html");
  if (!Array.isArray(designKit.games))
    throw new Error("data/design-kit.json has no games list. Run cardz-win's scripts/export-design-kit.ps1.");

  const card = (page) => {
    const game = localVariants(page)?.[0] ?? page.variants[0];
    const extra = isExtra(page);
    const kit = extra ? designKit.games.find((entry) => `designs/${entry.file}` === game.download) : null;
    if (extra && (!kit || !existsSync(joinRoot(game.download))))
      throw new Error(
        `${game.name} offers ${game.download}, which the design kit did not write. ` +
          `Run cardz-win's scripts/export-design-kit.ps1.`
      );
    // A game this language has no page for links to the English one.
    const href = here.localized.has(`games/${page.slug}/index.html`) ? `${page.slug}/` : `${root}games/${page.slug}/`;
    const shot = captureImage(page, root, "(max-width: 700px) calc(100vw - 48px), 460px", "lazy");
    const diagram = shot ? null : boardDiagram(game, games.layout, diagramText);
    const facts = page.capture
      ? s("card.facts", "{decks} · {deck} deck", { decks: deckLine(game), deck: escape(page.capture.deck) })
      : deckLine(game);
    return `        <article class="game-card">
          <a class="game-card-art${shot ? " game-card-shot" : ""}" href="${href}" tabindex="-1" aria-hidden="true">${shot || (diagram ? diagram.svg : "")}</a>
          <p class="eyebrow"><span></span> ${escape(tagline(page))}</p>
          <h3><a href="${href}">${escape(page.name)}</a>${page.new ? ` <b>${s("card.new", "New")}</b>` : ""}${page.original ? ` <b class="original-badge">${s("original.badge", "Cardz original")}</b>` : ""}</h3>
          <p class="game-card-facts">${facts}</p>
          <div class="game-card-actions">${
            extra
              ? `
            <a class="button button-small" href="${root}${game.download}" download>${s("cta.download", "Download")}</a>`
              : ""
          }
            <a class="feature-link" href="${href}">${s("card.how", "How to play")} <span aria-hidden="true">→</span></a>
          </div>
        </article>`;
  };

  return `${head(
    s("games.title", "Solitaire games — how to play | Cardz"),
    s("games.description", "Solitaire games to play in Cardz, each with its rules and its board, and extra games to download and add to Your games.")
  )}
<body class="games-page">
  <a class="skip-link" href="#main">${s("skip", "Skip to content")}</a>
${header("games")}
  <main id="main" class="games-main">
    <header class="games-head">
      <h1>${s("games.heading", "All the games.")}</h1>
    </header>
    <section class="games-section" aria-labelledby="in-cardz-title">
      <div class="games-section-head">
        <h2 id="in-cardz-title">${s("games.in-cardz", "In Cardz")}</h2>
      </div>
      <div class="games-grid">
${all.filter((page) => !isExtra(page)).map(card).join("\n")}
      </div>
    </section>
    <section class="games-section" id="extras" aria-labelledby="extras-title">
      <div class="games-section-head">
        <h2 id="extras-title">${s("more.extras", "Extra games")}</h2>
        <p>${s("games.extras-lead", 'Not built into Cardz. Download one and open it in Cardz. Each is a design file you can change: see <a href="{href}">Make a game</a>.', { href: link("make-a-game.html") })}</p>
      </div>
      <div class="games-grid">
${all.filter(isExtra).map(card).join("\n")}
      </div>
    </section>
    <section class="games-cta">
      <a class="button" href="${store(STORE)}"><span class="windows-mark" aria-hidden="true">⊞</span><span><small>${s("cta.store-small", "Get it on the")}</small>${s("cta.store", "Microsoft Store")}</span></a>
      <small>${s("cta.qualities", "No ads, no accounts, fully offline.")}</small>
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
  return `${html.slice(0, start + open.length)}\n${body ? `${body}\n` : ""}${html.slice(end)}`;
}

function fillRegions(html, regions, file) {
  for (const [name, body] of Object.entries(regions)) html = replaceRegion(html, name, body, file);
  return html;
}

/** Write a file under the language being built, making its folder. */
function emit(path, html) {
  const out = join(root, here.locale.dir, path);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html, "utf8");
}

// ---------------------------------------------------------------- run

const rendered = referenceMarkdown(reference);
const sources = Object.fromEntries(HAND_WRITTEN.map((page) => [page, readFileSync(join(root, `${page}.html`), "utf8")]));
const regionsOf = {
  index: () => ({}),
  lite: () => ({}),
  sandbox: () => ({}),
  privacy: () => ({}),
  "make-a-game": () => ({ "reference-toc": tocMarkup(rendered.toc), reference: rendered.html }),
};
const currentOf = { index: undefined, lite: "lite", sandbox: "sandbox", privacy: undefined, "make-a-game": "make-a-game" };

// First, which pages each language has, since every page's header, footer and
// alternates link to the others. English has them all. Another language has the
// generated pages, each game page its export covers, and each hand-written page it
// has translated in full.
for (const language of languages) {
  here = language;
  const has = language.localized;
  if (language.locale === NEUTRAL) {
    for (const page of HAND_WRITTEN) has.add(`${page}.html`);
  } else {
    for (const page of HAND_WRITTEN) {
      const t = language.catalog.scope(`pages/${page}`);
      localizePage(sources[page], page, t, language.locale, has);
      const file = `pages/${page}`;
      if (language.catalog.asked.get(file)?.size && !language.catalog.missingIn(file)) has.add(`${page}.html`);
    }
  }
  has.add("games/index.html");
  has.add("decks.html");
  for (const page of ordered) if (localVariants(page, language)) has.add(`games/${page.slug}/index.html`);
}

// The English site stays where it always was: games/ and decks.html are rewritten
// whole, and the hand-written pages only in their regions.
const outDir = join(root, "games");
if (existsSync(outDir)) rmSync(outDir, { recursive: true });
for (const language of languages) {
  here = language;
  if (language.locale !== NEUTRAL && existsSync(join(root, language.locale.dir)))
    rmSync(join(root, language.locale.dir), { recursive: true });

  for (const page of ordered)
    if (localVariants(page)) emit(`games/${page.slug}/index.html`, gamePage(page, ordered));
  emit("games/index.html", gamesPage(ordered));
  emit("decks.html", deckPage());

  for (const page of HAND_WRITTEN) {
    if (!language.localized.has(`${page}.html`)) continue;
    const pageChrome = chrome(0, `${page}.html`);
    const regions = {
      head: pageChrome.headExtra,
      header: pageChrome.header(currentOf[page]),
      footer: pageChrome.footer,
      ...regionsOf[page](),
    };
    if (language.locale === NEUTRAL) writeFileSync(join(root, `${page}.html`), fillRegions(sources[page], regions, `${page}.html`), "utf8");
    else {
      const t = language.catalog.scope(`pages/${page}`);
      // The page's own address and its Store links name this language too.
      const html = localizePage(sources[page], page, t, language.locale, language.localized)
        .replace(/(<meta property="og:url" content=")[^"]*"/, `$1${SITE}${language.locale.dir}${hrefOf(`${page}.html`)}"`)
        .replace(/"(https:\/\/apps\.microsoft\.com\/detail\/\w+)"/g, (_, url) => `"${store(url)}"`);
      emit(`${page}.html`, fillRegions(html, regions, `${page}.html`));
    }
  }
}

console.log(
  `${ordered.length} pages → games/  (${games.games.filter((g) => !g.sandbox).length} games, ${ordered.filter(isExtra).length} of them extras, ${games.culture})\n` +
    `decks.html  (${decks.decks.length} decks)\n` +
    `games/index.html  (${ordered.length} cards, ${ordered.filter((page) => page.capture).length} with a screenshot)\n` +
    `make-a-game.html  (${rendered.toc.length} reference sections)`
);
for (const language of languages.filter((language) => language.locale !== NEUTRAL)) {
  const pages = [...language.localized];
  const hand = HAND_WRITTEN.filter((page) => language.localized.has(`${page}.html`));
  console.log(
    `${language.locale.dir}  (${pages.filter((path) => path.startsWith("games/") && path !== "games/index.html").length} game pages, ` +
      `${hand.length ? hand.map((page) => `${page}.html`).join(", ") : "no hand-written page yet"})`
  );
  for (const line of language.catalog.report()) console.log(line);
  if (sync) for (const path of language.catalog.sync()) console.log(`  synced ${path.slice(root.length + 1)}`);
}
