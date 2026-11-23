// The header's language menu and, on an English page, a one-time offer of the
// reader's own language. The menu is a <details> and works without this script;
// this only closes it the way a menu is expected to close.
//
// Nothing redirects. A reader whose browser prefers French, Portuguese or Spanish
// and who has not chosen a language yet sees a bar above the header, in that
// language, linking to this page in it (or to its home page when this page has no
// translation). Choosing a language anywhere, or closing the bar, is remembered on
// this device, and the bar does not come back.
(() => {
  const KEY = 'cardz-language';
  const remembered = () => {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  };
  const remember = (code) => {
    try {
      localStorage.setItem(KEY, code);
    } catch {}
  };
  const codeOf = (tag) => (tag || '').toLowerCase().split('-')[0];

  const menu = document.querySelector('.language-menu');
  document.addEventListener('click', (event) => {
    const choice = event.target.closest('.language-menu a, .language-offer a');
    if (choice) remember(codeOf(choice.lang));
    if (menu?.open && !menu.contains(event.target)) menu.open = false;
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu?.open) {
      menu.open = false;
      menu.querySelector('summary').focus();
    }
  });

  if (codeOf(document.documentElement.lang) !== 'en') return;
  let offers = {};
  try {
    offers = JSON.parse(document.getElementById('language-offers')?.textContent ?? '{}');
  } catch {}

  // A language chosen before wins; English chosen, or the bar closed, ends it.
  // Otherwise the browser's first preference that the site has, unless English
  // comes first.
  let code = remembered();
  if (code === 'en') return;
  if (!offers[code]) {
    code = null;
    for (const tag of navigator.languages ?? [navigator.language]) {
      const wanted = codeOf(tag);
      if (wanted === 'en') return;
      if (offers[wanted]) {
        code = wanted;
        break;
      }
    }
  }
  const offer = offers[code];
  const target = offer && document.querySelector(`.language-menu a[lang="${offer.tag}"]`);
  if (!target) return;

  const bar = document.createElement('aside');
  bar.className = 'language-offer';
  bar.lang = offer.tag;
  const text = document.createElement('p');
  text.textContent = `${offer.text} `;
  const link = document.createElement('a');
  link.href = target.href;
  link.lang = offer.tag;
  link.textContent = `${offer.go} →`;
  text.append(link);
  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = '×';
  close.setAttribute('aria-label', offer.close);
  close.addEventListener('click', () => {
    remember('en');
    bar.remove();
  });
  bar.append(text, close);
  // After the skip link, which stays the first thing a keyboard reaches.
  const skip = document.querySelector('.skip-link');
  if (skip) skip.after(bar);
  else document.body.prepend(bar);
})();
