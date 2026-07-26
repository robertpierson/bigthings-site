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
