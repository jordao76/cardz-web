const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const demos = [...document.querySelectorAll('.mode-demo video')].map((video) => {
  const name = video.getAttribute('aria-label').replace(' demonstration', '');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'demo-toggle';
  video.id = `${video.closest('section').id}-video`;
  button.setAttribute('aria-controls', video.id);
  video.after(button);
  video.controls = false;
  video.muted = true;
  video.loop = true;
  const demo = { video, button, visible: false, enabled: !reducedMotion.matches };
  const label = () => {
    button.textContent = video.paused ? 'Play demo' : 'Pause demo';
    button.setAttribute('aria-label', `${video.paused ? 'Play' : 'Pause'} ${name} demonstration`);
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
      demo.button.textContent = 'Play demo';
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
