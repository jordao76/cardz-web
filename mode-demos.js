const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
// A page in another language carries these words in #site-strings (build.mjs).
const text = (() => {
  try {
    return JSON.parse(document.getElementById('site-strings')?.textContent ?? '{}');
  } catch {
    return {};
  }
})();
const say = (key, english, vars = {}) =>
  (text[key] ?? english).replace(/\{(\w+)\}/g, (whole, name) => vars[name] ?? whole);
const demos = [...document.querySelectorAll('.mode-demo video')].map((video) => {
  // The video's own label ("Fish mode demonstration"), in whatever language the page is.
  const name = video.getAttribute('aria-label');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'demo-toggle';
  video.id = `${video.closest('.mode-demo').id}-video`;
  button.setAttribute('aria-controls', video.id);
  video.after(button);
  video.controls = false;
  video.muted = true;
  video.loop = true;
  const demo = { video, button, visible: false, enabled: !reducedMotion.matches };
  const label = () => {
    button.textContent = video.paused ? say('play', 'Play demo') : say('pause', 'Pause demo');
    button.setAttribute(
      'aria-label',
      video.paused
        ? say('playNamed', 'Play {name}', { name })
        : say('pauseNamed', 'Pause {name}', { name })
    );
  };
  video.addEventListener('play', label);
  video.addEventListener('pause', label);
  button.addEventListener('click', () => {
    demo.enabled = video.paused;
    sync(demo);
  });
  label();
  return demo;
});

function sync(demo) {
  if (demo.enabled && demo.visible && !document.hidden) {
    demo.video.play().catch(() => {
      demo.button.textContent = say('play', 'Play demo');
    });
  } else {
    demo.video.pause();
  }
}

const visibility = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    const demo = demos.find((item) => item.video === entry.target);
    demo.visible = entry.isIntersecting && entry.intersectionRatio >= .35;
    sync(demo);
  }
}, { threshold: [0, .35] });
demos.forEach((demo) => visibility.observe(demo.video));
document.addEventListener('visibilitychange', () => demos.forEach(sync));
reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches) {
    demos.forEach((demo) => { demo.enabled = false; sync(demo); });
  }
});
