/* REVLAB — shared front-end behaviour */
(function () {
  /* ── Floating light particles (whole-page canvas) ── */
  var c = document.getElementById('rv-particles');
  if (c) {
    var ctx = c.getContext('2d');
    var parts = [];
    var isMobile = window.matchMedia && window.matchMedia('(max-width:768px)').matches;
    function resize() { c.width = window.innerWidth; c.height = window.innerHeight; }
    resize(); window.addEventListener('resize', resize);
    var COUNT = isMobile ? Math.min(30, Math.round(innerWidth / 26)) : Math.min(90, Math.round(innerWidth / 18));
    for (var i = 0; i < COUNT; i++) {
      parts.push({
        x: Math.random() * innerWidth, y: Math.random() * innerHeight,
        vx: (Math.random() - 0.5) * 0.22, vy: -0.10 - Math.random() * 0.28,
        size: 1 + Math.random() * 2.2, alpha: 0.14 + Math.random() * 0.34,
        pulse: Math.random() * Math.PI * 2, ps: 0.006 + Math.random() * 0.016
      });
    }
    function tick() {
      requestAnimationFrame(tick);
      if (document.hidden) return;
      ctx.clearRect(0, 0, c.width, c.height);
      if (!isMobile) ctx.shadowBlur = 9;
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.x += p.vx; p.y += p.vy; p.pulse += p.ps;
        if (p.y < -12) { p.y = c.height + 12; p.x = Math.random() * c.width; }
        if (p.x < -12) p.x = c.width + 12; if (p.x > c.width + 12) p.x = -12;
        var a = p.alpha * (0.5 + 0.5 * Math.sin(p.pulse));
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(230,235,242,' + a.toFixed(3) + ')';
        if (!isMobile) ctx.shadowColor = 'rgba(200,215,255,' + (a * 0.8).toFixed(3) + ')';
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    }
    tick();
  }

  /* ── Scroll reveal ── */
  var targets = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && targets.length) {
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    targets.forEach(function (el) { obs.observe(el); });
  } else { targets.forEach(function (el) { el.classList.add('in'); }); }

  /* ── Smooth anchor scroll (offset for floating nav) ── */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href').slice(1); if (!id) return;
      var t = document.getElementById(id); if (!t) return;
      e.preventDefault();
      window.scrollTo({ top: t.getBoundingClientRect().top + pageYOffset - 78, behavior: 'smooth' });
    });
  });

  /* ── Active nav state (home page sections) ── */
  var navLinks = [].slice.call(document.querySelectorAll('.nav-link[data-sec]'));
  if (navLinks.length) {
    var secs = navLinks.map(function (l) { return document.getElementById(l.getAttribute('data-sec')); });
    function updateNav() {
      var mid = scrollY + innerHeight * 0.4, active = 0, best = -Infinity;
      for (var i = 0; i < secs.length; i++) {
        if (secs[i] && secs[i].offsetTop <= mid && secs[i].offsetTop > best) { best = secs[i].offsetTop; active = i; }
      }
      navLinks.forEach(function (l, i) { l.classList.toggle('active', i === active); });
    }
    addEventListener('scroll', updateNav, { passive: true }); updateNav();
  }

  /* ── FAQ accordion ── */
  document.querySelectorAll('.faq-q').forEach(function (q) {
    q.addEventListener('click', function () { q.parentElement.classList.toggle('open'); });
  });

  /* ── Count-up stats ── */
  var nums = [].slice.call(document.querySelectorAll('[data-count]'));
  if (nums.length && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return; io.unobserve(e.target);
        var el = e.target, target = parseFloat(el.getAttribute('data-count')), suf = el.getAttribute('data-suffix') || '', t0 = null;
        function run(t) { if (!t0) t0 = t; var p = Math.min(1, (t - t0) / 1200), eased = 1 - Math.pow(1 - p, 3);
          el.textContent = (Math.round(target * eased)).toLocaleString() + suf; if (p < 1) requestAnimationFrame(run); }
        requestAnimationFrame(run);
      });
    }, { threshold: 0.6 });
    nums.forEach(function (n) { io.observe(n); });
  }

  /* ── Hero Marine / Automotive toggle → drives the 3D liquid crossfade ── */
  var modeToggle = document.getElementById('mode-toggle');
  if (modeToggle) {
    var COPY = {
      auto:   { t: 'Protection &amp; finishes for the cars you care about.',
                s: 'Paint protection film, color-change wraps, and concours-level detailing — done with obsessive precision.' },
      marine: { t: 'Protection &amp; finishes for life on the water.',
                s: 'Ceramic coatings, protective film and detailing for boats and yachts — finished to the same obsessive standard.' }
    };
    var tEl = document.getElementById('hero-tagline');
    var sEl = document.getElementById('hero-sub');
    modeToggle.querySelectorAll('.mode-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var mode = btn.getAttribute('data-mode');
        window.RV_MODE_BLEND = (mode === 'marine') ? -1 : 1;
        modeToggle.classList.toggle('marine', mode === 'marine');
        modeToggle.classList.toggle('auto', mode === 'auto');
        modeToggle.querySelectorAll('.mode-btn').forEach(function (b) {
          var on = b === btn; b.classList.toggle('active', on); b.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        if (tEl && COPY[mode]) tEl.innerHTML = COPY[mode].t;
        if (sEl && COPY[mode]) sEl.innerHTML = COPY[mode].s;
      });
    });
  }

  /* ── Liquid blob indicator that glides between the nav icons ── */
  (function () {
    var nav = document.querySelector('.nav-links');
    if (!nav) return;
    var ind = nav.querySelector('.nav-ind');
    var links = [].slice.call(nav.querySelectorAll('.nav-link'));
    if (!ind || !links.length) return;
    function moveTo(el) { if (!el) return; ind.style.left = el.offsetLeft + 'px'; ind.style.top = el.offsetTop + 'px'; ind.style.width = el.offsetWidth + 'px'; ind.style.height = el.offsetHeight + 'px'; }
    function activeLink() { return nav.querySelector('.nav-link.active') || links[0]; }
    function settle() { moveTo(activeLink()); }
    links.forEach(function (l) { l.addEventListener('mouseenter', function () { moveTo(l); }); });
    nav.addEventListener('mouseleave', settle);
    settle();
    window.addEventListener('resize', settle);
    window.addEventListener('load', settle);
    setTimeout(settle, 250);
  })();

  /* ── Contact form (posts to /api/lead; graceful if absent) ── */
  var cf = document.getElementById('contact-form');
  if (cf) cf.addEventListener('submit', function (e) {
    e.preventDefault();
    var payload = {
      name: (document.getElementById('cf-name') || {}).value || '',
      email: (document.getElementById('cf-email') || {}).value || '',
      service: (document.getElementById('cf-service') || {}).value || '',
      vehicle: (document.getElementById('cf-vehicle') || {}).value || '',
      message: (document.getElementById('cf-msg') || {}).value || ''
    };
    fetch('/api/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).catch(function () {});
    var ok = document.getElementById('form-success'); if (ok) ok.style.display = 'block';
    cf.reset();
  });
})();
