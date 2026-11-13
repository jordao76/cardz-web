// The site is dealt with one of four decks, as the app is: the choice sets
// data-deck on <html>, which styles.css reads, and is remembered on this device.
// Loaded in <head> so the chosen deck is in place before the page paints. Without
// JavaScript the site stays on Felt House and no picker appears.
(() => {
  // Each deck's game on the home page's hero: a capture already in assets/screenshots.
  const DECKS = {
    'felt-house': { name: 'Felt House', game: 'Klondike', slug: 'klondike' },
    valhalla: { name: 'Valhalla', game: 'Crazy Quilt', slug: 'crazy-quilt' },
    scarab: { name: 'Scarab', game: 'Pyramid', slug: 'pyramid' },
    neon: { name: 'Neon', game: 'Golf', slug: 'golf' },
  };
  const root = document.documentElement;
  const base = new URL('.', document.currentScript.src).href;

  let deck = 'felt-house';
  try {
    const kept = localStorage.getItem('cardz-deck');
    if (DECKS[kept]) deck = kept;
  } catch {}
  // ?deck=neon opens a page dealt with that deck, for a link or a review.
  const asked = new URLSearchParams(location.search).get('deck');
  if (DECKS[asked]) deck = asked;
  root.dataset.deck = deck;

  function deal(next) {
    deck = next;
    root.dataset.deck = deck;
    try { localStorage.setItem('cardz-deck', deck); } catch {}
    show();
  }

  function show() {
    for (const control of document.querySelectorAll('.deck-picker button, .deck-fan[data-deck]'))
      control.setAttribute('aria-pressed', String(control.dataset.deck === deck));

    // The home page's hero shows a table dealt with the chosen deck. Lite's keeps its own.
    const hero = document.querySelector('.home-page:not(.lite-page) .hero-art');
    if (!hero) return;
    const { name, game, slug } = DECKS[deck];
    const shot = (width) => `${base}assets/screenshots/${slug}-${width}.webp`;
    const image = hero.querySelector('img');
    image.srcset = `${shot(960)} 960w, ${shot(1600)} 1600w`;
    image.src = shot(1600);
    image.alt = `${game} in Cardz, played with the ${name} deck`;
    hero.querySelector('a').href = shot(1600);
    hero.querySelector('figcaption').innerHTML = `${game} · ${name} <a href="${base}games/${slug}/">How to play ↗</a>`;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const picker = document.createElement('div');
    picker.className = 'deck-picker';
    picker.setAttribute('role', 'group');
    picker.setAttribute('aria-label', 'Deal this site with another deck');
    for (const [id, { name }] of Object.entries(DECKS)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.deck = id;
      button.title = name;
      button.setAttribute('aria-label', `${name} deck`);
      button.addEventListener('click', () => deal(id));
      picker.append(button);
    }
    document.querySelector('.site-header nav')?.after(picker);

    // The home page's deck strip deals the site too: its four fans are these four decks.
    for (const fan of document.querySelectorAll('.deck-fan')) {
      const id = new URL(fan.href).hash.slice(1);
      if (!DECKS[id]) continue;
      fan.dataset.deck = id;
      fan.setAttribute('role', 'button');
      fan.addEventListener('click', (event) => {
        event.preventDefault();
        deal(id);
      });
    }
    const hint = document.querySelector('.home-decks .section-heading p:last-child');
    if (hint) hint.textContent = 'Switch at any time, even mid-game. Pick one, and this site is dealt with it too.';

    show();
  });
})();
