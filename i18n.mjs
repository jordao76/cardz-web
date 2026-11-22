// The site's languages, kept out of the code the way .NET keeps them in satellite
// assemblies: English is the neutral language and stays where it is written, in
// build.mjs and in the hand-written pages, and each other language is a folder of
// its own under locales/ that the build reads beside it. Nothing in the code
// names a translation, and a language can be added, dropped or left half done
// without touching a template.
//
//   locales/<code>/site.json          what build.mjs writes: chrome, game pages, decks
//   locales/<code>/roster.json        data/roster.json's taglines, by page slug
//   locales/<code>/decks.json         data/decks.json's blurbs and note
//   locales/<code>/pages/<page>.json  a hand-written page's marked text
//
// An entry is { "en": <the English it was translated from>, "text": <the
// translation> }. Keeping the English beside it is what lets the build tell a
// translation that has fallen behind its source: when the English in the code no
// longer matches, the entry is stale, used as it is and reported, until someone
// reads the new English and clears it. `text: null` is a string nobody has
// translated yet. `node build.mjs --sync` adds the keys the build asked for and
// nobody has written, refreshes the English of the ones that changed (marking
// them stale) and drops the ones nothing asks for any more.
//
// What is missing falls back to English, string by string, the way a missing
// satellite resource falls back to the neutral one. A hand-written page is the
// exception: it is published in a language only when every marked string in it
// is translated, so a reader never lands on a page half in another language.

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * Every language the site is built in. `dir` is the language's subtree, `tag` its
 * BCP 47 tag for `lang` and `hreflang`, `store` the Microsoft Store's `hl` for a
 * Store link. English is the root and the neutral language.
 */
export const LOCALES = [
  { code: "en", tag: "en", name: "English", dir: "", store: null },
  { code: "fr", tag: "fr", name: "Français", dir: "fr/", store: "fr-fr" },
  { code: "pt", tag: "pt-BR", name: "Português", dir: "pt/", store: "pt-br" },
  { code: "es", tag: "es", name: "Español", dir: "es/", store: "es-es" },
];

export const NEUTRAL = LOCALES[0];

/** `{name}` placeholders, filled from vars. A value is inserted as given: escape it first. */
function fill(text, vars) {
  return vars ? text.replace(/\{(\w+)\}/g, (whole, name) => (name in vars ? String(vars[name]) : whole)) : text;
}

/** One language's satellite catalogue: the files under locales/<code>/, read on first use. */
export class Catalog {
  constructor(root, locale) {
    this.root = root;
    this.locale = locale;
    this.files = new Map(); // file name → { path, entries }
    this.asked = new Map(); // file name → Map(key → English)
    this.missing = new Map(); // file name → Set(key)
    this.stale = new Map(); // file name → Set(key)
  }

  get neutral() {
    return this.locale === NEUTRAL;
  }

  file(name) {
    if (!this.files.has(name)) {
      const path = join(this.root, "locales", this.locale.code, `${name}.json`);
      const entries = !this.neutral && existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
      this.files.set(name, { path, entries });
    }
    return this.files.get(name);
  }

  /**
   * The text for `key` in this language: its translation when there is one, and
   * the English otherwise. The English is the code's own copy of the string, so it
   * is also what tells a stale translation.
   */
  t(file, key, english, vars) {
    if (!this.asked.has(file)) this.asked.set(file, new Map());
    const asked = this.asked.get(file);
    if (asked.has(key) && asked.get(key) !== english)
      throw new Error(`locales: '${file}' key '${key}' is asked for with two different English texts`);
    asked.set(key, english);
    if (this.neutral) return fill(english, vars);

    const entry = this.file(file).entries[key];
    if (!entry || entry.text == null) {
      note(this.missing, file, key);
      return fill(english, vars);
    }
    if (entry.stale || entry.en !== english) note(this.stale, file, key);
    return fill(entry.text, vars);
  }

  /** A function over one file, for code that asks a lot of one place. */
  scope(file) {
    return (key, english, vars) => this.t(file, key, english, vars);
  }

  /** Keys asked of `file` this build that the language has no translation for. */
  missingIn(file) {
    return this.missing.get(file)?.size ?? 0;
  }

  /** What a build should say about this language, one line per file with anything to say. */
  report() {
    if (this.neutral) return [];
    const lines = [];
    const names = new Set([...this.asked.keys(), ...this.existingFiles()]);
    for (const name of [...names].sort()) {
      const asked = this.asked.get(name) ?? new Map();
      const entries = this.file(name).entries;
      const unused = Object.keys(entries).filter((key) => !asked.has(key));
      const parts = [];
      if (this.missing.get(name)?.size) parts.push(`${this.missing.get(name).size} untranslated`);
      if (this.stale.get(name)?.size) parts.push(`${this.stale.get(name).size} stale (${[...this.stale.get(name)].join(", ")})`);
      if (unused.length) parts.push(`${unused.length} no longer asked for`);
      if (parts.length) lines.push(`  ${this.locale.code}/${name}: ${parts.join(", ")}`);
    }
    return lines;
  }

  existingFiles() {
    const dir = join(this.root, "locales", this.locale.code);
    if (this.neutral || !existsSync(dir)) return [];
    const walk = (sub) =>
      readdirSync(join(dir, sub), { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory()
          ? walk(join(sub, entry.name))
          : entry.name.endsWith(".json")
            ? [join(sub, entry.name.slice(0, -5))]
            : []
      );
    return walk("");
  }

  /**
   * Bring every file in line with what the build asked for: a key nobody has
   * written gets its English and `text: null`, a key whose English moved gets the
   * new English and `stale: true` over its old translation, and a key nothing asks
   * for any more is dropped. Keys are written in the order the build asked them,
   * which is the order they appear on the page.
   */
  sync() {
    if (this.neutral) return [];
    const written = [];
    for (const [name, asked] of this.asked) {
      const { path, entries } = this.file(name);
      const next = {};
      for (const [key, english] of asked) {
        const entry = entries[key];
        if (!entry) next[key] = { en: english, text: null };
        else if (entry.en !== english) next[key] = { en: english, text: entry.text, ...(entry.text == null ? {} : { stale: true }) };
        else next[key] = entry;
      }
      const body = `${JSON.stringify(next, null, 2)}\n`;
      if (existsSync(path) && readFileSync(path, "utf8") === body) continue;
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, body, "utf8");
      written.push(path);
    }
    return written;
  }
}

function note(map, file, key) {
  if (!map.has(file)) map.set(file, new Set());
  map.get(file).add(key);
}

// ---------------------------------------------------------------- hand-written pages

/**
 * The element a `data-l10n` attribute sits on, from its opening tag to its own
 * closing tag: `start` and `end` bound the whole element, `inner` its content.
 * Counting same-named tags is enough, since the marked elements hold plain
 * inline markup.
 */
function elementAt(html, at, where) {
  const open = html.lastIndexOf("<", at);
  const tag = html.slice(open + 1).match(/^[a-zA-Z][\w-]*/)[0];
  const openEnd = html.indexOf(">", at) + 1;
  if (/^(meta|link|img|input|br|hr|source)$/i.test(tag))
    throw new Error(`${where}: data-l10n sits on a <${tag}>, which has no content; mark an attribute with data-l10n-<attribute>`);
  const pattern = new RegExp(`<(/?)${tag}\\b[^>]*>`, "gi");
  pattern.lastIndex = openEnd;
  let depth = 1;
  for (let match; (match = pattern.exec(html)); ) {
    depth += match[1] ? -1 : 1;
    if (depth === 0) return { open, openEnd, close: match.index, end: pattern.lastIndex };
  }
  throw new Error(`${where}: a <${tag}> marked with data-l10n is never closed`);
}

/**
 * A hand-written page in another language. The page marks what is prose:
 * `data-l10n="key"` on an element translates its content, markup and all, and
 * `data-l10n-<attribute>="key"` translates that attribute (alt, content,
 * aria-label). The marks are the page's own and nothing else reads them, so the
 * English page is the hand-written file as it stands.
 *
 * In a language, every marked string comes from `t` and the marks are dropped.
 * The page moves one folder down, so a link to a page the language has keeps
 * pointing into that folder, and anything else (an asset, a download, a page not
 * in the language) points back up to the English site.
 *
 * Returns the page and how many of its strings had no translation.
 */
export function localizePage(html, page, t, locale, localized) {
  const where = `${page}.html`;
  let out = html;

  // Content first, one element at a time, each mark removed as it is read so the
  // next search finds the next one.
  for (let at; (at = out.search(/\sdata-l10n="/)) >= 0; ) {
    const key = out.slice(at).match(/^\sdata-l10n="([^"]+)"/)[1];
    const element = elementAt(out, at, where);
    const inner = out.slice(element.openEnd, element.close);
    if (/data-l10n="/.test(inner)) throw new Error(`${where}: '${key}' holds another data-l10n element; mark the inner ones only`);
    const text = t(key, inner.trim());
    const leading = inner.match(/^\s*/)[0];
    const trailing = inner.match(/\s*$/)[0];
    const openTag = out.slice(element.open, element.openEnd).replace(/\sdata-l10n="[^"]+"/, "");
    out = `${out.slice(0, element.open)}${openTag}${leading}${text}${trailing}${out.slice(element.close)}`;
  }

  // Then attributes: data-l10n-alt="key" translates alt="…" on the same tag.
  out = out.replace(/<[a-zA-Z][^>]*\sdata-l10n-[a-z-]+="[^"]+"[^>]*>/g, (tag) => {
    let next = tag;
    for (const [, attribute, key] of tag.matchAll(/\sdata-l10n-([a-z-]+)="([^"]+)"/g)) {
      const value = next.match(new RegExp(`\\s${attribute}="([^"]*)"`));
      if (!value) throw new Error(`${where}: '${key}' marks ${attribute}, which its tag does not have`);
      const text = t(key, value[1]).replaceAll('"', "&quot;");
      next = next.replace(value[0], ` ${attribute}="${text}"`).replace(`data-l10n-${attribute}="${key}"`, "");
    }
    return next.replace(/\s+>/, ">").replace(/ {2,}/g, " ");
  });

  if (locale === NEUTRAL) return out;

  out = out.replace(/<html lang="[^"]*"/, `<html lang="${locale.tag}"`);
  return relink(out, localized);
}

/** The links of a page that moved one folder down, into a language's subtree. */
function relink(html, localized) {
  const move = (url) => {
    if (!url || /^(#|\/|[a-z]+:)/i.test(url)) return url;
    const [path] = url.split(/[?#]/);
    if (localized.has(pagePath(path))) return url;
    return `../${url}`;
  };
  return html
    .replace(/\s(href|src)="([^"]*)"/g, (_, attribute, url) => ` ${attribute}="${move(url)}"`)
    .replace(/\ssrcset="([^"]*)"/g, (_, set) =>
      ` srcset="${set
        .split(",")
        .map((candidate) => candidate.trim().replace(/^\S+/, move))
        .join(", ")}"`
    );
}

/** A link's target as a file path: `games/` is `games/index.html`. */
export function pagePath(path) {
  if (path === "" || path.endsWith("/")) return `${path}index.html`;
  return path;
}
