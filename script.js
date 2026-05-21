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

function countUp(el, target, duration, format) {
  const t0 = performance.now();
  function tick(now) {
    const p = Math.min((now - t0) / duration, 1);
    const val = Math.round(easeOutCubic(p) * target);
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
        const delay  = 700 + items.length * 120 + i * 80;
        setTimeout(() => countUp(c, target, 1900, format), delay);
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
  const ageEl = document.getElementById('sim-age');
  if (!ageEl) return;
  const premiumEl = document.getElementById('sim-premium');
  const ageVal = document.getElementById('sim-age-val');
  const premiumValEl = document.getElementById('sim-premium-val');
  const beforeEl = document.getElementById('sim-before');
  const afterEl = document.getElementById('sim-after');
  const monthlyEl = document.getElementById('sim-monthly');
  const yearlyEl = document.getElementById('sim-yearly');
  const lifeEl = document.getElementById('sim-life');
  const beforeFill = document.getElementById('sim-before-fill');
  const afterFill = document.getElementById('sim-after-fill');
  const chips = document.querySelectorAll('.p-sim__chip');

  let family = 'single';

  // Smoothly tween a number element's display value
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
          // restart animation
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
    const age = +ageEl.value;
    const premium = +premiumEl.value;

    // Discount factor model:
    //   base 50% off, less for older, less for kids (need more coverage)
    let discount = 0.52;
    discount -= Math.max(0, (age - 30) * 0.005);  // -0.5% per year over 30
    if (family === 'couple') discount -= 0.03;
    if (family === 'kids')   discount -= 0.07;
    discount = Math.max(0.30, Math.min(0.62, discount));

    const after = Math.round(premium * (1 - discount) / 100) * 100;
    const monthly = premium - after;
    const yearly = monthly * 12;
    const years = Math.max(0, 60 - age);
    const lifeYen = monthly * 12 * years;  // 円
    const lifeMan = Math.round(lifeYen / 10000); // 万円

    tween(beforeEl, premium);
    tween(afterEl,  after);
    tween(monthlyEl, monthly);
    tween(yearlyEl, yearly);
    tween(lifeEl,   lifeMan);

    // Bars: full track is max premium
    const maxP = +premiumEl.max;
    beforeFill.style.width = ((premium / maxP) * 100).toFixed(1) + '%';
    afterFill.style.width  = ((after   / maxP) * 100).toFixed(1) + '%';

    // Header values
    ageVal.textContent = age;
    premiumValEl.textContent = premium.toLocaleString('ja-JP');

    updateSliderFill(ageEl);
    updateSliderFill(premiumEl);
  }

  ageEl.addEventListener('input', calc);
  premiumEl.addEventListener('input', calc);
  chips.forEach(c => {
    c.addEventListener('click', () => {
      chips.forEach(x => x.classList.remove('is-active'));
      c.classList.add('is-active');
      family = c.dataset.family;
      calc();
    });
  });

  // Initial paint
  updateSliderFill(ageEl);
  updateSliderFill(premiumEl);
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

/* ── Voice slider ── */
(function(){
  const track   = document.getElementById('voice-slider-track');
  if (!track) return;
  const dots    = document.querySelectorAll('.p-voice__slider-dot');
  const btnPrev = document.getElementById('voice-slider-prev');
  const btnNext = document.getElementById('voice-slider-next');
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
    autoTimer = setInterval(() => goTo(current + 1), 6000);
  }

  btnPrev && btnPrev.addEventListener('click', () => { goTo(current - 1); startAuto(); });
  btnNext && btnNext.addEventListener('click', () => { goTo(current + 1); startAuto(); });
  dots.forEach(d => d.addEventListener('click', () => { goTo(+d.dataset.index); startAuto(); }));

  const slider = document.getElementById('voice-slider');
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

/* ── Letter image lightbox (SP) ── */
(function(){
  const mq = window.matchMedia('(max-width: 768px)');
  const lightbox = document.getElementById('letter-lightbox');
  const lbImg = lightbox && lightbox.querySelector('.letter-lightbox__img');
  const lbTitle = document.getElementById('letter-lightbox-title');
  if (!lightbox || !lbImg) return;

  const imgs = Array.from(document.querySelectorAll('.letter-img'));
  let lastFocus = null;
  let bound = false;

  function open(src, alt) {
    lastFocus = document.activeElement;
    lbImg.src = src;
    lbImg.alt = alt;
    if (lbTitle) lbTitle.textContent = alt || 'お手紙';
    lightbox.hidden = false;
    lightbox.setAttribute('aria-hidden', 'false');
    lightbox.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    lightbox.querySelector('.letter-lightbox__close').focus();
  }

  function close() {
    lightbox.classList.remove('is-open');
    lightbox.hidden = true;
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    lbImg.removeAttribute('src');
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    lastFocus = null;
  }

  function onImgClick(e) {
    e.preventDefault();
    e.stopPropagation();
    open(e.currentTarget.src, e.currentTarget.alt);
  }

  function stopSliderDrag(e) {
    e.stopPropagation();
  }

  function bind() {
    if (bound) return;
    bound = true;
    imgs.forEach((img) => {
      img.addEventListener('click', onImgClick);
      img.addEventListener('mousedown', stopSliderDrag);
      img.addEventListener('touchstart', stopSliderDrag, { passive: true });
    });
    lightbox.querySelectorAll('[data-close]').forEach((el) => {
      el.addEventListener('click', close);
    });
    document.addEventListener('keydown', onKeydown);
  }

  function unbind() {
    if (!bound) return;
    bound = false;
    imgs.forEach((img) => {
      img.removeEventListener('click', onImgClick);
      img.removeEventListener('mousedown', stopSliderDrag);
      img.removeEventListener('touchstart', stopSliderDrag);
    });
    lightbox.querySelectorAll('[data-close]').forEach((el) => {
      el.removeEventListener('click', close);
    });
    document.removeEventListener('keydown', onKeydown);
    close();
  }

  function onKeydown(e) {
    if (!lightbox.classList.contains('is-open')) return;
    if (e.key === 'Escape') close();
  }

  function sync() {
    if (mq.matches) bind();
    else unbind();
  }

  mq.addEventListener('change', sync);
  sync();
})();
