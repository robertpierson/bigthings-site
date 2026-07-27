/* Big Things — nav state, scroll reveals, constellation field.
   Replaces particles.js 2.0.0 (unmaintained, ~25KB) with the ~60 lines actually used. */

(function () {
  'use strict';

  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* nav gets its backdrop only once the hero is behind it */
  var nav = document.getElementById('nav');
  if (nav) {
    var onScroll = function () { nav.classList.toggle('scrolled', window.scrollY > 24); };
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---- type splitting ----
     The h1 goes to characters, the section headings to lines. Both keep the
     original string on aria-label so nothing changes for a screen reader. */
  var splitTargets = [];

  function splitChars(el) {
    var text = (el.dataset.text || el.textContent).trim();
    el.dataset.text = text;
    el.setAttribute('aria-label', text);
    el.textContent = '';
    for (var i = 0; i < text.length; i++) {
      var s = document.createElement('span');
      s.className = 'char';
      s.textContent = text[i] === ' ' ? ' ' : text[i];
      s.style.setProperty('--i', i);
      s.setAttribute('aria-hidden', 'true');
      el.appendChild(s);
    }
  }

  function splitLines(el) {
    var text = (el.dataset.text || el.textContent).trim().replace(/\s+/g, ' ');
    el.dataset.text = text;
    el.setAttribute('aria-label', text);
    // lay the words out first so the browser tells us where the line breaks fall
    el.innerHTML = text.split(' ').map(function (w) {
      return '<span class="w">' + w + '</span>';
    }).join(' ');

    var lines = [], top = null, cur = null;
    [].forEach.call(el.querySelectorAll('.w'), function (s) {
      if (s.offsetTop !== top) { top = s.offsetTop; cur = []; lines.push(cur); }
      cur.push(s.textContent);
    });

    el.innerHTML = lines.map(function (words, i) {
      return '<span class="line" aria-hidden="true"><span class="line-i" style="--i:' + i + '">' +
             words.join(' ') + '</span></span>';
    }).join('');
  }

  if (!reduced) {
    var h1 = document.querySelector('.hero-title');
    if (h1) { splitChars(h1); h1.classList.add('is-split'); }

    [].forEach.call(document.querySelectorAll('.h2'), function (el) {
      splitLines(el);
      el.classList.add('is-split');
      splitTargets.push(el);
    });

    var reflow;
    addEventListener('resize', function () {
      clearTimeout(reflow);
      reflow = setTimeout(function () {
        splitTargets.forEach(function (el) {
          var wasIn = el.classList.contains('in');
          splitLines(el);
          if (wasIn) el.classList.add('in');
        });
      }, 200);
    });
  }

  /* scroll reveals */
  var targets = document.querySelectorAll('.reveal');
  if (reduced || !('IntersectionObserver' in window)) {
    targets.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    targets.forEach(function (el) { io.observe(el); });
  }

  /* Scroll choreography: publish two progress values per tracked section and let
     CSS decide what moves. --p is entry (0 when the top edge is at the viewport
     bottom, 1 once it has risen a screen), --q is exit (0 until the top passes
     the fold, 1 once the section has scrolled clear). Cheaper than a library and
     it keeps every transform in the stylesheet. */
  var tracked = [].slice.call(document.querySelectorAll('[data-scroll]'));
  if (!reduced && tracked.length) {
    var ticking = false;

    var root = document.documentElement;

    var measure = function () {
      ticking = false;
      var ih = innerHeight;
      var max = root.scrollHeight - ih;
      root.style.setProperty('--sp', max > 0 ? (scrollY / max).toFixed(4) : 0);
      for (var i = 0; i < tracked.length; i++) {
        var el = tracked[i], b = el.getBoundingClientRect();
        var p = (ih - b.top) / (ih * 0.85);
        var q = -b.top / (b.height * 0.9);
        el.style.setProperty('--p', (p < 0 ? 0 : p > 1 ? 1 : p).toFixed(4));
        el.style.setProperty('--q', (q < 0 ? 0 : q > 1 ? 1 : q).toFixed(4));
      }
    };

    var schedule = function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(measure);
    };

    addEventListener('scroll', schedule, { passive: true });
    addEventListener('resize', schedule);
    measure();
  }

  /* cards lean toward the pointer; --mx/--my are -1..1 from the card's center */
  if (!reduced && matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('.card, .step').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var b = el.getBoundingClientRect();
        el.style.setProperty('--mx', ((e.clientX - b.left) / b.width * 2 - 1).toFixed(3));
        el.style.setProperty('--my', ((e.clientY - b.top) / b.height * 2 - 1).toFixed(3));
      });
      el.addEventListener('pointerleave', function () {
        el.style.setProperty('--mx', 0);
        el.style.setProperty('--my', 0);
      });
    });
  }

  /* buttons pull toward the pointer when it gets close */
  if (!reduced && matchMedia('(hover: hover)').matches) {
    var PULL = 90;
    [].forEach.call(document.querySelectorAll('.btn, .btn-ghost, .socials a'), function (el) {
      var reset = function () { el.style.setProperty('--px', 0); el.style.setProperty('--py', 0); };
      el.addEventListener('pointermove', function (e) {
        var b = el.getBoundingClientRect();
        var dx = e.clientX - (b.left + b.width / 2), dy = e.clientY - (b.top + b.height / 2);
        var d = Math.hypot(dx, dy);
        if (d > PULL) return reset();
        var k = (1 - d / PULL) * 0.35;
        el.style.setProperty('--px', (dx * k).toFixed(2) + 'px');
        el.style.setProperty('--py', (dy * k).toFixed(2) + 'px');
      });
      el.addEventListener('pointerleave', reset);
    });

    /* a soft light follows the pointer across the hero */
    var heroEl = document.querySelector('.hero');
    if (heroEl) {
      heroEl.addEventListener('pointermove', function (e) {
        var b = heroEl.getBoundingClientRect();
        heroEl.style.setProperty('--cx', ((e.clientX - b.left) / b.width * 100).toFixed(2) + '%');
        heroEl.style.setProperty('--cy', ((e.clientY - b.top) / b.height * 100).toFixed(2) + '%');
      }, { passive: true });
    }
  }

  /* SMIL ignores prefers-reduced-motion, so stop the orbit by hand */
  var orbit = document.getElementById('orbit');
  if (reduced && orbit) orbit.pauseAnimations();

  /* ---- constellation ---- */
  var canvas = document.getElementById('constellation');
  if (reduced || !canvas || !canvas.getContext) return;

  var ctx = canvas.getContext('2d');
  var dpr = Math.min(devicePixelRatio || 1, 2);
  var LINK = 140, GRAB = 160;
  var w, h, nodes = [], mouse = { x: -9999, y: -9999 }, raf = 0;

  function size() {
    w = innerWidth; h = innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var count = Math.max(30, Math.min(90, Math.round(w * h / 16000)));
    nodes = [];
    for (var i = 0; i < count; i++) {
      nodes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - .5) * .6,
        vy: (Math.random() - .5) * .6,
        r: Math.random() * 1.4 + .8,
        a: Math.random() * .3 + .12
      });
    }
  }

  function frame() {
    /* some embedders report a 0x0 viewport on first paint — recover once it's real */
    if ((!w || !h) && (innerWidth || innerHeight)) size();

    ctx.clearRect(0, 0, w, h);

    for (var i = 0; i < nodes.length; i++) {
      var p = nodes[i];
      p.x += p.vx; p.y += p.vy;
      if (p.x < -20) p.x = w + 20; else if (p.x > w + 20) p.x = -20;
      if (p.y < -20) p.y = h + 20; else if (p.y > h + 20) p.y = -20;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, 6.2832);
      ctx.fillStyle = 'rgba(255,255,255,' + p.a + ')';
      ctx.fill();

      for (var j = i + 1; j < nodes.length; j++) {
        var q = nodes[j], dx = p.x - q.x, dy = p.y - q.y, d = Math.hypot(dx, dy);
        if (d > LINK) continue;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
        ctx.strokeStyle = 'rgba(255,255,255,' + (1 - d / LINK) * .08 + ')';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      /* grab: the pointer pulls nearby nodes into view, same as the old config */
      var md = Math.hypot(p.x - mouse.x, p.y - mouse.y);
      if (md < GRAB) {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y); ctx.lineTo(mouse.x, mouse.y);
        ctx.strokeStyle = 'rgba(111,195,232,' + (1 - md / GRAB) * .2 + ')';
        ctx.stroke();
      }
    }

    raf = requestAnimationFrame(frame);
  }

  function start() { if (!raf) raf = requestAnimationFrame(frame); }
  function stop() { cancelAnimationFrame(raf); raf = 0; }

  var resizeTimer;
  addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(size, 150);
  });
  addEventListener('pointermove', function (e) { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
  addEventListener('pointerleave', function () { mouse.x = mouse.y = -9999; });
  document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });

  size();
  start();
})();
