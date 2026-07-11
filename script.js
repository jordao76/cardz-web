const tabs = [...document.querySelectorAll('.game-tabs button')];
const shots = [...document.querySelectorAll('.game-shot')];

tabs.forEach((tab) => tab.addEventListener('click', () => {
  const index = Number(tab.dataset.shot);
  tabs.forEach((item, i) => {
    item.classList.toggle('active', i === index);
    item.setAttribute('aria-selected', String(i === index));
  });
  shots.forEach((shot, i) => shot.classList.toggle('active', i === index));
}));

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));
