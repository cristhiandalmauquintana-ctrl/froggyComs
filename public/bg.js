// Fondo animado de Froggy Hub: gotas de la cascada (canvas) y ranas saltando entre nenúfares.
// Los molinos, la cortina de agua y las olas son CSS puro. Todo se detiene si la pestaña
// está oculta y se apaga con "reducir movimiento".
(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const canvas = document.getElementById('drops');
  const ctx = canvas.getContext('2d');
  const surface = document.getElementById('surface');
  const pads = [...surface.querySelectorAll('.pad')];
  const frogs = [...surface.querySelectorAll('.frog')];

  let width = 0;
  let height = 0;
  let pondY = 0;
  let emitters = [];
  const drops = [];
  const MAX_DROPS = 70;

  /* ------------------------------ layout ------------------------------ */

  function layout() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    emitters = [...document.querySelectorAll('.wheel')].map((wheel) => {
      const r = wheel.getBoundingClientRect();
      const dir = wheel.classList.contains('wheel--left') ? 1 : -1;
      return { x: r.left + r.width * (0.5 + dir * 0.31), y: r.top + r.height * 0.81 };
    });

    pondY = document.querySelector('.pond').getBoundingClientRect().top + 8;

    // Ondas donde cae el agua.
    surface.querySelectorAll('.ripple').forEach((el) => el.remove());
    emitters.forEach((e, i) => {
      for (let k = 0; k < 2; k += 1) {
        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        ripple.style.left = `${e.x}px`;
        ripple.style.animationDelay = `${(i * 0.4 + k * 0.8).toFixed(2)}s`;
        surface.appendChild(ripple);
      }
    });

    placeFrogs();
  }

  /* ------------------------------- gotas ------------------------------ */

  let last = performance.now();
  let rafId = 0;

  function spawn() {
    if (drops.length >= MAX_DROPS || !emitters.length) return;
    const e = emitters[Math.floor(Math.random() * emitters.length)];
    drops.push({
      x: e.x + (Math.random() - 0.5) * 10,
      y: e.y,
      vx: (Math.random() - 0.5) * 0.7,
      vy: 1 + Math.random() * 1.4,
      r: 1.2 + Math.random() * 1.8,
    });
  }

  function frame(now) {
    const dt = Math.min((now - last) / 16.67, 3);
    last = now;

    if (Math.random() < 0.9 * dt) spawn();
    if (Math.random() < 0.6 * dt) spawn();

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(190, 230, 248, 0.8)';
    ctx.beginPath();
    for (let i = drops.length - 1; i >= 0; i -= 1) {
      const d = drops[i];
      d.vy += 0.12 * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      if (d.y > pondY) {
        drops.splice(i, 1);
        continue;
      }
      ctx.moveTo(d.x + d.r, d.y);
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    }
    ctx.fill();

    rafId = requestAnimationFrame(frame);
  }

  /* ------------------------------- ranas ------------------------------ */

  const state = frogs.map((el, i) => ({ el, pad: i, x: 0, timer: 0, hopping: false }));

  function padCenter(i) {
    return pads[i].offsetLeft + pads[i].offsetWidth / 2;
  }
  function frogX(frog, padIndex) {
    return padCenter(padIndex) - frog.el.offsetWidth / 2;
  }

  function placeFrogs() {
    state.forEach((f) => {
      f.x = frogX(f, f.pad);
      f.el.style.transform = `translate(${f.x}px, 0)`;
    });
  }

  function hop(f) {
    if (reduceMotion.matches || document.hidden || f.hopping) return schedule(f);
    const taken = new Set(state.map((s) => s.pad));
    const options = pads.map((_, i) => i).filter((i) => !taken.has(i) && Math.abs(i - f.pad) <= 2);
    if (!options.length) return schedule(f);

    const target = options[Math.floor(Math.random() * options.length)];
    const x0 = f.x;
    const x1 = frogX(f, target);
    const lift = 38 + Math.random() * 34;
    const duration = 650 + Math.random() * 250;

    f.el.classList.toggle('is-flipped', x1 < x0);
    f.hopping = true;
    f.pad = target;

    const anim = f.el.animate(
      [
        { transform: `translate(${x0}px, 0) scale(1.08, 0.9)`, offset: 0 },
        { transform: `translate(${(x0 + x1) / 2}px, ${-lift}px) scale(0.94, 1.1)`, offset: 0.5, easing: 'ease-in' },
        { transform: `translate(${x1}px, 0) scale(1.1, 0.88)`, offset: 0.9 },
        { transform: `translate(${x1}px, 0) scale(1, 1)`, offset: 1 },
      ],
      { duration, easing: 'ease-out' },
    );
    anim.onfinish = () => {
      f.x = x1;
      f.el.style.transform = `translate(${x1}px, 0)`;
      f.hopping = false;
      schedule(f);
    };
  }

  function schedule(f) {
    clearTimeout(f.timer);
    f.timer = setTimeout(() => hop(f), 2200 + Math.random() * 4200);
  }

  /* ------------------------------ control ----------------------------- */

  function start() {
    cancelAnimationFrame(rafId);
    ctx.clearRect(0, 0, width, height);
    if (reduceMotion.matches) return;
    last = performance.now();
    rafId = requestAnimationFrame(frame);
  }

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(layout, 150);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(rafId);
    else start();
  });

  reduceMotion.addEventListener('change', start);

  // Las fuentes pueden cambiar el alto de la página, pero el fondo es fijo: basta con medir una vez.
  layout();
  state.forEach((f, i) => {
    f.timer = setTimeout(() => hop(f), 1200 + i * 1100);
  });
  start();
})();
