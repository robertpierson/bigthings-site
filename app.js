/* reenvision — nav state, scroll reveals, constellation field.
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

  function splitWords(el) {
    var text = (el.dataset.text || el.textContent).trim().replace(/\s+/g, ' ');
    el.dataset.text = text;
    el.setAttribute('aria-label', text);
    el.innerHTML = text.split(' ').map(function (w, i) {
      return '<span class="wd" aria-hidden="true" style="--i:' + i + '">' + w + '</span>';
    }).join(' ');
  }

  if (!reduced) {
    var h1 = document.querySelector('.hero-title');
    if (h1) { splitChars(h1); h1.classList.add('is-split'); }

    var lede = document.querySelector('.hero-lede');
    if (lede) {
      /* Walk the text nodes rather than the markup: splitting innerHTML drops
         the space in front of <b>, which welds "be" onto "big". */
      [].slice.call(lede.childNodes).forEach(function (node) {
        if (node.nodeType === 1) { node.classList.add('wd'); return; }   // <b> animates too
        if (node.nodeType !== 3) return;
        var frag = document.createDocumentFragment();
        node.nodeValue.split(/(\s+)/).forEach(function (tok) {
          if (!tok) return;
          if (/^\s+$/.test(tok)) return frag.appendChild(document.createTextNode(' '));
          var s = document.createElement('span');
          s.className = 'wd';
          s.textContent = tok;
          frag.appendChild(s);
        });
        lede.replaceChild(frag, node);
      });
      [].forEach.call(lede.querySelectorAll('.wd'), function (n, i) { n.style.setProperty('--i', i); });
      lede.classList.add('is-split');
    }

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

  /* Nav and footer links roll to a duplicate of themselves on hover. The second
     copy is aria-hidden so the link is not announced twice. */
  if (!reduced) {
    [].forEach.call(document.querySelectorAll('.nav-links a, .footer-links a'), function (a) {
      var t = a.textContent;
      a.innerHTML = '<span class="roll"><span>' + t + '</span>' +
                    '<span aria-hidden="true">' + t + '</span></span>';
    });
  }

  /* Scroll reveals.
     Swept on scroll rather than observed: IntersectionObserver only samples at
     frame boundaries, so an instant jump past an element — a hash link, End,
     a scripted scroll — can skip it and leave it hidden for good. A sweep can
     only ever be late, never wrong, and anything already above the fold counts
     as revealed. */
  var pending = [].slice.call(document.querySelectorAll('.reveal'));

  /* Monospace labels decode into place: the type is already a terminal voice,
     so the label resolves character by character out of noise. */
  var GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/\\<>[]{}#*+=-';

  function decode(el) {
    var node = el.lastChild;                       // the text, after any dot span
    if (!node || node.nodeType !== 3) return;
    var final = node.nodeValue, len = final.length, step = 0;

    /* The scramble mutates live text, so hand assistive tech a stable copy and
       hide the animating one for the second it is nonsense. */
    if (!el.querySelector('.sr-only')) {
      var sr = document.createElement('span');
      sr.className = 'sr-only';
      sr.textContent = final;
      el.insertBefore(sr, node);
      var vis = document.createElement('span');
      vis.setAttribute('aria-hidden', 'true');
      el.replaceChild(vis, node);
      vis.appendChild(node);
    }
    var timer = setInterval(function () {
      step++;
      var out = '';
      for (var i = 0; i < len; i++) {
        if (final[i] === ' ' || i < step - 3) out += final[i];
        else if (i < step + 6) out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
        else out += ' ';
      }
      node.nodeValue = out;
      if (step - 3 > len) { clearInterval(timer); node.nodeValue = final; }
    }, 28);
  }

  function sweep() {
    for (var i = pending.length - 1; i >= 0; i--) {
      var el = pending[i];
      if (el.getBoundingClientRect().top < innerHeight * 0.88) {
        el.classList.add('in');
        if (!reduced && el.classList.contains('eyebrow')) decode(el);
        pending.splice(i, 1);
      }
    }
  }

  if (!reduced) {
    var heroLabel = document.querySelector('.hero .eyebrow');
    if (heroLabel) setTimeout(function () { decode(heroLabel); }, 300);
  }

  if (reduced) {
    pending.forEach(function (el) { el.classList.add('in'); });
    pending.length = 0;
  }

  /* Scroll choreography: publish two progress values per tracked section and let
     CSS decide what moves. --p is entry (0 when the top edge is at the viewport
     bottom, 1 once it has risen a screen), --q is exit (0 until the top passes
     the fold, 1 once the section has scrolled clear). Cheaper than a library and
     it keeps every transform in the stylesheet. */
  var tracked = [].slice.call(document.querySelectorAll('[data-scroll]'));
  if (!reduced) {
    var ticking = false;

    var root = document.documentElement;

    var lastY = scrollY, vel = 0;

    var measure = function () {
      ticking = false;
      sweep();
      var ih = innerHeight;
      var max = root.scrollHeight - ih;
      root.style.setProperty('--sp', max > 0 ? (scrollY / max).toFixed(4) : 0);

      /* --v is scroll velocity, clamped to -1..1 and eased back to rest, so the
         page can lean into a flick and settle when it stops */
      var raw = (scrollY - lastY) / 90;
      lastY = scrollY;
      vel += (Math.max(-1, Math.min(1, raw)) - vel) * 0.25;
      if (Math.abs(vel) < 0.001) vel = 0;
      root.style.setProperty('--v', vel.toFixed(4));
      if (vel !== 0) schedule();   // keep easing after the scroll stops
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

  /* A ring trails the pointer and swells over anything interactive. The native
     cursor is left alone — this is an addition, not a replacement. */
  if (!reduced && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    var ring = document.createElement('div');
    ring.className = 'cursor-ring';
    ring.setAttribute('aria-hidden', 'true');
    document.body.appendChild(ring);

    var tx = innerWidth / 2, ty = innerHeight / 2, rx = tx, ry = ty, ringRaf = 0;

    var ringLoop = function () {
      rx += (tx - rx) * 0.18;
      ry += (ty - ry) * 0.18;
      ring.style.transform = 'translate3d(' + (rx - 20) + 'px,' + (ry - 20) + 'px,0)';
      ringRaf = (Math.abs(tx - rx) > 0.4 || Math.abs(ty - ry) > 0.4) ? requestAnimationFrame(ringLoop) : 0;
    };

    addEventListener('pointermove', function (e) {
      tx = e.clientX; ty = e.clientY;
      ring.classList.add('on');
      var hot = e.target.closest && e.target.closest('a, button, summary, .card, .step, .slot');
      ring.classList.toggle('hot', !!hot);
      if (!ringRaf) ringRaf = requestAnimationFrame(ringLoop);
    }, { passive: true });

    addEventListener('pointerdown', function () { ring.classList.add('press'); });
    addEventListener('pointerup', function () { ring.classList.remove('press'); });
    document.addEventListener('pointerleave', function () { ring.classList.remove('on'); });
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
