/* ============================================================
   Hoken Kazoku — interactive script
   ============================================================ */

/* ── Hero: stagger headline characters（行単位・改行を維持） ── */
(function(){
  const lines = document.querySelectorAll('.p-hero__h1-line');
  let delayBase = 0;
  lines.forEach((line) => {
    const parts = [];
    line.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const prevEm = node.previousSibling?.nodeType === Node.ELEMENT_NODE
          && node.previousSibling.classList.contains('p-hero__h1-em')
          ? node.previousSibling
          : null;
        [...node.textContent].forEach((ch, idx) => {
          const part = { ch };
          if (prevEm && idx === 0 && prevEm.classList.contains('p-hero__h1-em--yasuku')) {
            part.afterClass = 'p-hero__h1-char--after-yasuku';
          }
          parts.push(part);
        });
      } else if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains('p-hero__h1-em')) {
        const emClasses = [...node.classList].filter((c) => c.startsWith('p-hero__h1-em'));
        const chars = [...node.textContent];
        chars.forEach((ch, idx) => {
          parts.push({
            ch,
            emClasses,
            emFirst: idx === 0,
            emLast: idx === chars.length - 1,
          });
        });
      }
    });
    if (!parts.length) return;
    line.classList.add('hero-stagger');
    line.innerHTML = '';
    parts.forEach(({ ch, emClasses, emFirst, emLast, afterClass }, i) => {
      const span = document.createElement('span');
      span.textContent = ch;
      if (emClasses?.length) {
        span.classList.add('p-hero__h1-char--em', ...emClasses);
        if (emFirst) span.classList.add('p-hero__h1-char--em-first');
        if (emLast) span.classList.add('p-hero__h1-char--em-last');
      }
      if (afterClass) span.classList.add(afterClass);
      span.style.animationDelay = (delayBase + 0.04 + i * 0.045) + 's';
      line.appendChild(span);
    });
    delayBase += parts.length * 0.045 + 0.08;
  });
})();

/* ── Header scroll shadow ── */
(function(){
  const hdr = document.getElementById('site-header');
  if (!hdr) return;
  window.addEventListener('scroll', () => {
    hdr.classList.toggle('scrolled', window.scrollY > 10);
  }, { passive: true });
})();

/* ── Hero video playlist (loop video1 → video2) ── */
(function(){
  const videos = ['./fv_move2.mp4'];
  let idx = 0;
  const vid = document.getElementById('hero-video');
  if (!vid) return;
  vid.removeAttribute('loop');
  vid.src = videos[0];
  vid.play().catch(()=>{});
  vid.addEventListener('ended', () => {
    idx = (idx + 1) % videos.length;
    vid.src = videos[idx];
    vid.play().catch(()=>{});
  });
})();

/* ── Fade-up observer ── */
(function(){
  const els = document.querySelectorAll('.fade-up');
  if (!els.length) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });
  els.forEach(el => obs.observe(el));
})();

/* ── Reveal-target observer (icon-in + count-up sequence) ── */
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

function countUp(el, target, duration, format, start) {
  const from = (start !== undefined) ? start : 0;
  const t0 = performance.now();
  function tick(now) {
    const p = Math.min((now - t0) / duration, 1);
    const val = Math.round(from + easeOutCubic(p) * (target - from));
    el.textContent = format === 'comma' ? val.toLocaleString('ja-JP') : String(val);
    if (p < 1) requestAnimationFrame(tick);
    else if (!el.closest('.p-hero__ba-card')) {
      el.classList.add('num-pop');
      setTimeout(() => el.classList.remove('num-pop'), 320);
    }
  }
  requestAnimationFrame(tick);
}

(function(){
  const groups = {};
  document.querySelectorAll('.reveal-target').forEach(el => {
    let parent = el.closest('[id]');
    const key = parent ? parent.id : '_default';
    (groups[key] = groups[key] || []).push(el);
  });

  // Map of group id → counters inside that group
  const counterGroups = {};
  document.querySelectorAll('.count-num').forEach(el => {
    const key = el.dataset.trigger || (el.closest('[id]') ? el.closest('[id]').id : '_default');
    (counterGroups[key] = counterGroups[key] || []).push(el);
  });

  const firedTargets = new WeakSet();
  const firedCounters = new WeakSet();

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const parent = e.target.closest('[id]');
      const key = parent ? parent.id : '_default';

      // Reveal all reveal-targets in this group together (or just this one)
      const items = groups[key] || [e.target];
      items.forEach((it, i) => {
        if (firedTargets.has(it)) return;
        firedTargets.add(it);
        setTimeout(() => it.classList.add('revealed'), 120 + i * 180);
      });

      // After reveal, start counters in this group
      const counters = counterGroups[key] || [];
      counters.forEach((c, i) => {
        if (firedCounters.has(c)) return;
        firedCounters.add(c);
        const target = parseInt(c.dataset.target || '0', 10);
        const format = c.dataset.format;
        const duration = parseInt(c.dataset.duration || '5500', 10);
        const start = c.dataset.start !== undefined ? parseInt(c.dataset.start, 10) : undefined;
        const delay  = 700 + items.length * 120 + i * 80;
        setTimeout(() => countUp(c, target, duration, format, start), delay);
      });

      obs.unobserve(e.target);
    });
  }, { threshold: 0.25 });

  document.querySelectorAll('.reveal-target').forEach(el => obs.observe(el));

  // Also observe count-num elements that aren't inside a reveal-target
  document.querySelectorAll('.count-num').forEach(c => {
    if (c.closest('.reveal-target')) return;
    const parent = c.closest('[id]');
    obs.observe(parent || c);
  });
})();

/* ── Flow steps sequential reveal ── */
(function(){
  const wrap = document.getElementById('flow-steps');
  if (!wrap) return;
  const steps = Array.from(wrap.querySelectorAll('.p-flow__step'));
  let fired = false;
  const obs = new IntersectionObserver((entries) => {
    if (fired || !entries[0].isIntersecting) return;
    fired = true;
    obs.disconnect();
    steps.forEach((step, i) => {
      setTimeout(() => step.classList.add('step-visible'), i * 220);
    });
  }, { threshold: 0.2 });
  obs.observe(wrap);
})();

/* ── Asset growth chart ── */
(function(){
  const wrap = document.getElementById('chart-bars');
  if (!wrap) return;
  const bars = wrap.querySelectorAll('.p-asset__chart-bar');
  let fired = false;
  const obs = new IntersectionObserver((entries) => {
    if (fired || !entries[0].isIntersecting) return;
    fired = true;
    obs.disconnect();
    bars.forEach((b, i) => {
      const h = parseFloat(b.dataset.h || '0');
      setTimeout(() => { b.style.height = h + '%'; }, 60 + i * 90);
    });
  }, { threshold: 0.25 });
  obs.observe(wrap);
})();

/* ── Interactive Simulator ── */
(function(){
  const yearsEl = document.getElementById('sim-years');
  if (!yearsEl) return;
  const initialEl = document.getElementById('sim-initial');
  const monthlyInvestEl = document.getElementById('sim-monthly-invest');
  const yearsValEl = document.getElementById('sim-years-val');
  const initialValEl = document.getElementById('sim-initial-val');
  const monthlyInvestValEl = document.getElementById('sim-monthly-invest-val');
  const yearsResultEl = document.getElementById('sim-years-result');
  const totalEl = document.getElementById('sim-total');
  const chips = document.querySelectorAll('.p-sim__chip');

  let rate = 0.003; // default 0.3%

  const fmt = (n) => Math.round(n).toLocaleString('ja-JP');
  const tweenMap = new WeakMap();
  function tween(el, to) {
    if (!el) return;
    const from = parseInt((el.textContent || '0').replace(/,/g, ''), 10) || 0;
    const start = performance.now();
    const dur = 350;
    cancelAnimationFrame(tweenMap.get(el) || 0);
    function step(now) {
      const p = Math.min((now - start) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      const val = from + (to - from) * e;
      el.textContent = fmt(val);
      if (p < 1) tweenMap.set(el, requestAnimationFrame(step));
      else {
        const parent = el.closest('.p-sim__metric-val');
        if (parent) {
          parent.classList.remove('is-bump');
          void parent.offsetWidth;
          parent.classList.add('is-bump');
        }
      }
    }
    tweenMap.set(el, requestAnimationFrame(step));
  }

  function updateSliderFill(input) {
    const min = +input.min, max = +input.max;
    const pct = ((+input.value - min) / (max - min)) * 100;
    input.style.setProperty('--sim-pct', pct + '%');
  }

  function calc() {
    const N = +yearsEl.value;
    const P = +initialEl.value * 10000; // 万円 → 円
    const M = +monthlyInvestEl.value;   // 円/月
    const r = rate;

    // 初期投資の将来価値（年複利）: P × (1 + r)^N
    const fvInitial = P * Math.pow(1 + r, N);

    // 毎月積立の将来価値（年複利ベースの実効月利）
    // rm = (1+r)^(1/12) - 1、FV = PMT × (1+rm) × ((1+r)^N - 1) / rm
    let fvMonthly;
    if (r === 0) {
      fvMonthly = M * N * 12;
    } else {
      const rm = Math.pow(1 + r, 1 / 12) - 1;
      fvMonthly = M * (1 + rm) * (Math.pow(1 + r, N) - 1) / rm;
    }

    const total = fvInitial + fvMonthly;
    const totalMan = Math.round(total / 10000);

    // Update display values
    yearsValEl.textContent = N;
    if (yearsResultEl) yearsResultEl.textContent = N;
    initialValEl.textContent = initialEl.value;
    const mv = +monthlyInvestEl.value / 10000;
    monthlyInvestValEl.textContent = mv % 1 === 0 ? mv.toFixed(0) : mv.toFixed(1);

    tween(totalEl, totalMan);

    updateSliderFill(yearsEl);
    updateSliderFill(initialEl);
    updateSliderFill(monthlyInvestEl);
  }

  yearsEl.addEventListener('input', calc);
  initialEl.addEventListener('input', calc);
  monthlyInvestEl.addEventListener('input', calc);
  chips.forEach(c => {
    c.addEventListener('click', () => {
      chips.forEach(x => x.classList.remove('is-active'));
      c.classList.add('is-active');
      rate = parseFloat(c.dataset.rate);
      calc();
    });
  });

  updateSliderFill(yearsEl);
  updateSliderFill(initialEl);
  updateSliderFill(monthlyInvestEl);
  calc();
})();

/* ── Access photo slider ── */
(function(){
  const track   = document.getElementById('slider-track');
  if (!track) return;
  const dots    = document.querySelectorAll('.p-access__slider-dot');
  const btnPrev = document.getElementById('slider-prev');
  const btnNext = document.getElementById('slider-next');
  const total   = track.children.length;
  let current   = 0;
  let autoTimer;
  let dragX = 0, dragging = false;

  function goTo(idx) {
    current = (idx + total) % total;
    track.style.transform = `translateX(-${current * 100}%)`;
    dots.forEach((d, i) => d.classList.toggle('active', i === current));
  }
  function startAuto() {
    clearInterval(autoTimer);
    autoTimer = setInterval(() => goTo(current + 1), 5000);
  }

  btnPrev && btnPrev.addEventListener('click', () => { goTo(current - 1); startAuto(); });
  btnNext && btnNext.addEventListener('click', () => { goTo(current + 1); startAuto(); });
  dots.forEach(d => d.addEventListener('click', () => { goTo(+d.dataset.index); startAuto(); }));

  const slider = document.getElementById('access-slider');
  function start(x) { dragX = x; dragging = true; }
  function end(x) {
    if (!dragging) return;
    dragging = false;
    const diff = dragX - x;
    if (Math.abs(diff) > 40) { goTo(diff > 0 ? current + 1 : current - 1); startAuto(); }
  }
  slider.addEventListener('mousedown',  e => start(e.clientX));
  slider.addEventListener('mouseup',    e => end(e.clientX));
  slider.addEventListener('mouseleave', e => { if (dragging) end(e.clientX); });
  slider.addEventListener('touchstart', e => start(e.touches[0].clientX), { passive: true });
  slider.addEventListener('touchend',   e => end(e.changedTouches[0].clientX), { passive: true });

  startAuto();
})();

/* ── Voice slider: continuous marquee loop, draggable, click-to-enlarge ── */
(function(){
  const slider = document.getElementById('voice-slider');
  const track  = document.getElementById('voice-slider-track');
  if (!slider || !track) return;

  const SPEED = 46; // px per second
  let setWidth = 0;
  let posX = 0;
  let dragging = false;
  let hovering = false;
  let lightboxOpen = false;
  let startX = 0, startPos = 0, dragDistance = 0;
  let lastTime = null;

  function measure() { setWidth = track.scrollWidth / 2; }
  measure();
  window.addEventListener('resize', measure);

  function normalize() {
    if (setWidth <= 0) return;
    while (posX <= -setWidth) posX += setWidth;
    while (posX > 0) posX -= setWidth;
  }

  function apply() { track.style.transform = `translateX(${posX}px)`; }

  function tick(time) {
    if (lastTime === null) lastTime = time;
    const dt = (time - lastTime) / 1000;
    lastTime = time;
    if (!dragging && !hovering && !lightboxOpen && setWidth > 0) {
      posX -= SPEED * dt;
      normalize();
    }
    apply();
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  function pointerDown(x) {
    dragging = true;
    dragDistance = 0;
    startX = x;
    startPos = posX;
    slider.classList.add('is-dragging');
  }
  function pointerMove(x) {
    if (!dragging) return;
    const dx = x - startX;
    dragDistance = Math.max(dragDistance, Math.abs(dx));
    posX = startPos + dx;
    normalize();
  }
  function pointerUp() {
    dragging = false;
    slider.classList.remove('is-dragging');
  }

  slider.addEventListener('mousedown', (e) => pointerDown(e.clientX));
  window.addEventListener('mousemove', (e) => { if (dragging) pointerMove(e.clientX); });
  window.addEventListener('mouseup', pointerUp);
  slider.addEventListener('touchstart', (e) => pointerDown(e.touches[0].clientX), { passive: true });
  slider.addEventListener('touchmove', (e) => pointerMove(e.touches[0].clientX), { passive: true });
  slider.addEventListener('touchend', pointerUp);
  slider.addEventListener('mouseenter', () => { hovering = true; });
  slider.addEventListener('mouseleave', () => { hovering = false; });

  slider.__voiceSlider = {
    isRealDrag: () => dragDistance > 6,
    setLightboxOpen: (open) => { lightboxOpen = open; },
  };
})();

/* ── Letter image lightbox (click/tap to enlarge, all devices) ── */
(function(){
  const slider = document.getElementById('voice-slider');
  const lightbox = document.getElementById('letter-lightbox');
  const lbImg = lightbox && lightbox.querySelector('.letter-lightbox__img');
  const lbTitle = document.getElementById('letter-lightbox-title');
  if (!lightbox || !lbImg) return;

  let lastFocus = null;

  function open(src, alt) {
    lastFocus = document.activeElement;
    lbImg.src = src;
    lbImg.alt = alt;
    if (lbTitle) lbTitle.textContent = alt || 'お手紙';
    lightbox.hidden = false;
    lightbox.setAttribute('aria-hidden', 'false');
    lightbox.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    if (slider && slider.__voiceSlider) slider.__voiceSlider.setLightboxOpen(true);
    lightbox.querySelector('.letter-lightbox__close').focus();
  }

  function close() {
    lightbox.classList.remove('is-open');
    lightbox.hidden = true;
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    lbImg.removeAttribute('src');
    if (slider && slider.__voiceSlider) slider.__voiceSlider.setLightboxOpen(false);
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    lastFocus = null;
  }

  function onImgClick(e, img) {
    e.preventDefault();
    e.stopPropagation();
    open(img.src, img.alt);
  }

  function onKeydown(e) {
    if (!lightbox.classList.contains('is-open')) return;
    if (e.key === 'Escape') close();
  }

  // Delegate so it keeps working for slides duplicated for the marquee loop.
  document.addEventListener('click', (e) => {
    const img = e.target.closest('.letter-img');
    if (!img) return;
    if (slider && slider.__voiceSlider && slider.__voiceSlider.isRealDrag()) return;
    onImgClick(e, img);
  });
  lightbox.querySelectorAll('[data-close]').forEach((el) => {
    el.addEventListener('click', close);
  });
  document.addEventListener('keydown', onKeydown);
})();
