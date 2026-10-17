/* baydalabs.com: the dock, the scroll scenes, reveal-once motion and the contact form. No library, no tracking.
   The page is complete without this file: <html class="motion"> (set in the head unless the visitor prefers reduced
   motion) is what turns the animated rules on, and every scene's static end state is the default. */
(function () {
  'use strict';
  var root = document.documentElement;
  var motion = root.classList.contains('motion');
  var openedAt = performance.now();

  /* ---------- Dock: wide over the hero, a compact pill once you scroll; a menu on phones ---------- */
  var header = document.getElementById('dock');
  if (header) {
    var menuEl = document.getElementById('menu');
    var setCompact = function () { header.classList.toggle('compact', window.scrollY > 40 || (menuEl && !menuEl.hidden)); };
    setCompact();
    window.addEventListener('scroll', setCompact, { passive: true });

    var btn = header.querySelector('.menu-btn'), menu = document.getElementById('menu');
    if (btn && menu) {
      btn.hidden = false;
      var close = function (focusBtn) {
        menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); setCompact();
        btn.querySelector('use').setAttribute('href', '#i-menu');
        if (focusBtn) btn.focus();
      };
      btn.addEventListener('click', function () {
        var open = menu.hidden;
        menu.hidden = !open; btn.setAttribute('aria-expanded', String(open)); setCompact();
        btn.querySelector('use').setAttribute('href', open ? '#i-close' : '#i-menu');
        if (open) { var first = menu.querySelector('a'); if (first) first.focus(); }
      });
      menu.addEventListener('click', function (e) { if (e.target.closest('a')) close(false); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) close(true); });
      document.addEventListener('click', function (e) { if (!menu.hidden && !header.contains(e.target)) close(false); });
      matchMedia('(min-width: 860px)').addEventListener('change', function () { close(false); });
    }
  }

  /* ---------- Reveal: plays when an element comes on screen, and resets once it has left, so it plays again next time
     (David, 17 Oct 2026: "once the animations are done, they never come back") ---------- */
  var revealEls = [].slice.call(document.querySelectorAll('[data-reveal], .train-stage, .pstep .pcard, .m'));
  if (motion && 'IntersectionObserver' in window) {
    var rio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          if (en.target.classList.contains('in')) return;
          en.target.classList.add('in', 'play');
          countIn(en.target);
          restIn(en.target);
        }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });
    // a second observer with no margin: only when the element is wholly off screen is it reset
    var rout = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) return;
        en.target.classList.remove('in', 'play', 'done');
        var t = en.target.querySelector && en.target.querySelector('[data-rest]');
        if (t) { t.restRun = (t.restRun || 0) + 1; t.textContent = '1:30'; }
      });
    }, { threshold: 0 });
    revealEls.forEach(function (el) { rio.observe(el); rout.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in', 'play', 'done'); });
  }

  /* Counters: 2,524 -> 831 calories, 0 -> 7 records. The final value is in the HTML; this only animates toward it. */
  function countIn(scope) {
    [].forEach.call(scope.querySelectorAll('[data-count]'), function (el) {
      var to = +el.getAttribute('data-count'), from = +el.getAttribute('data-from'), t0 = null, dur = 1300;
      var fmt = function (n) { return Math.round(n).toLocaleString('en-GB'); };
      el.textContent = fmt(from);
      var step = function (t) {
        if (t0 === null) t0 = t;
        var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
        el.textContent = fmt(from + (to - from) * e);
        if (k < 1) requestAnimationFrame(step);
      };
      setTimeout(function () { requestAnimationFrame(step); }, 250);
    });
  }

  /* Rest, timed: counts 1:30 down to 0:00 alongside the ring, then the card turns to its done check. */
  function restIn(scope) {
    var t = scope.querySelector && scope.querySelector('[data-rest]');
    if (!t) return;
    var total = +t.getAttribute('data-rest'), t0 = null, dur = 3000, run = t.restRun = (t.restRun || 0) + 1;
    var fmt = function (s) { s = Math.ceil(s); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); };
    setTimeout(function () {
      var step = function (now) {
        if (run !== t.restRun) return;  // reset (scrolled away) or restarted
        if (t0 === null) t0 = now;
        var k = Math.min(1, (now - t0) / dur);
        t.textContent = fmt(total * (1 - k));
        if (k < 1) requestAnimationFrame(step); else scope.classList.add('done');
      };
      requestAnimationFrame(step);
    }, 400);
  }

  /* Gentle loops (orbit, barcode, privacy flow) run only while on screen. */
  var live = document.querySelectorAll('.orbit, .m-code, .flow');
  if (motion && 'IntersectionObserver' in window) {
    var lio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { en.target.classList.toggle('live', en.isIntersecting); });
    });
    [].forEach.call(live, function (el) { lio.observe(el); });
  }

  /* ---------- Scroll scenes: --p from 0 to 1 ----------
     pin:  progress through a tall section whose stage is sticky (hero, Move on desktop)
     view: progress of an element entering the viewport (bento tiles, Move on phones) */
  var scenes = [].slice.call(document.querySelectorAll('[data-scene]')).map(function (el) {
    return { el: el, mode: el.getAttribute('data-scene'), cur: -1, target: 0, on: true };
  });
  var desktop = matchMedia('(min-width: 860px)');
  var route = document.querySelector('.route'), head = document.querySelector('.route-head'), marks = document.querySelector('.km-marks');
  var routeLen = 0, markEls = [];
  if (route && route.getTotalLength) {
    routeLen = route.getTotalLength();
    // kilometre markers at the route's real kilometres (make-move-map.py writes its length to data-km)
    var routeKm = +route.getAttribute('data-km') || 5.24;
    for (var km = 1; km < routeKm; km++) {
      var pt = route.getPointAtLength(routeLen * km / routeKm);
      var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('transform', 'translate(' + pt.x.toFixed(1) + ' ' + pt.y.toFixed(1) + ')');
      g.innerHTML = '<circle r="11"/><text y="4">' + km + '</text>';
      g.dataset.at = km / routeKm;
      marks.appendChild(g); markEls.push(g);
    }
  }

  function measure(s) {
    var r = s.el.getBoundingClientRect(), vh = window.innerHeight;
    var mode = s.mode;
    if (s.el.classList.contains('move-scene') && !desktop.matches) mode = 'view-tall';
    if (mode === 'pin') {
      var len = r.height - vh;
      return len > 0 ? Math.min(1, Math.max(0, -r.top / len)) : 1;
    }
    if (mode === 'view-tall') {
      // Move on phones: the map draws while it crosses the screen
      var map = s.el.querySelector('.map-card').getBoundingClientRect();
      return Math.min(1, Math.max(0, (vh * 0.86 - map.top) / (map.height * 0.75 + vh * 0.1)));
    }
    return Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.78)));
  }

  function routeAt(d) {
    if (!routeLen) return;
    var pt = route.getPointAtLength(routeLen * Math.max(0.0001, d));
    head.setAttribute('transform', 'translate(' + pt.x.toFixed(1) + ' ' + pt.y.toFixed(1) + ')');
    head.style.opacity = d > 0.002 ? 1 : 0;
    for (var i = 0; i < markEls.length; i++) markEls[i].classList.toggle('on', d >= +markEls[i].dataset.at);
  }

  if (!motion) {
    scenes.forEach(function (s) { s.el.style.setProperty('--p', 1); });
    routeAt(1);
  } else {
    var ticking = false;
    var frame = function () {
      ticking = false;
      var again = false;
      for (var i = 0; i < scenes.length; i++) {
        var s = scenes[i];
        if (!s.on) continue;
        s.target = measure(s);
        // ease toward the scroll position: smooth on a wheel, still tied to the scroll (no hijacking)
        var next = s.cur < 0 ? s.target : s.cur + (s.target - s.cur) * 0.22;
        if (Math.abs(s.target - next) < 0.0005) next = s.target; else again = true;
        if (next !== s.cur) {
          s.cur = next;
          s.el.style.setProperty('--p', next.toFixed(4));
          if (s.el.classList.contains('move-scene')) routeAt(Math.min(1, Math.max(0, (next - 0.08) / 0.72)));
        }
      }
      if (again) request();
    };
    var request = function () { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
    if ('IntersectionObserver' in window) {
      var sio = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          scenes.forEach(function (s) { if (s.el === en.target) s.on = en.isIntersecting; });
        });
        request();
      }, { rootMargin: '25% 0px 25% 0px' });
      scenes.forEach(function (s) { sio.observe(s.el); });
    }
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);
    desktop.addEventListener('change', function () { scenes.forEach(function (s) { s.cur = -1; }); request(); });
    request();
  }

  /* ---------- Progress: on wide screens a sticky stage shows the active step's chart ---------- */
  var stage = document.querySelector('.prog-stage'), steps = [].slice.call(document.querySelectorAll('.pstep'));
  if (stage && steps.length && motion && 'IntersectionObserver' in window) {
    var stageCards = steps.map(function (st) {
      var c = st.querySelector('.pcard').cloneNode(true);
      c.classList.remove('in', 'play');
      [].forEach.call(c.querySelectorAll('[id]'), function (n) { n.removeAttribute('id'); });
      stage.appendChild(c);
      return c;
    });
    var setActive = function (i) {
      steps.forEach(function (st, k) { st.classList.toggle('on', k === i); });
      stageCards.forEach(function (c, k) {
        c.classList.toggle('on', k === i);
        if (k === i && !c.classList.contains('play')) { c.classList.add('play'); countIn(c); }
      });
    };
    setActive(0);
    var pio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) setActive(steps.indexOf(en.target)); });
    }, { rootMargin: '-45% 0px -45% 0px' });
    steps.forEach(function (st) { pio.observe(st); });
  }

  /* ---------- Contact form. Without JS the form stays hidden and the email address below it is the way in. ---------- */
  var form = document.getElementById('contact-form');
  if (!form || !window.fetch) return;
  var status = document.getElementById('contact-status'), send = document.getElementById('cf-send');
  var fields = { name: form.elements.name, email: form.elements.email, message: form.elements.message };
  var MAIL = '<a href="mailto:david@baydalabs.com">david@baydalabs.com</a>';
  var MSG = {
    name: 'Please enter your name.',
    email: 'Please enter a valid email address.',
    message: 'Please write at least 10 characters.'
  };
  form.hidden = false;

  function setError(key, text) {
    var f = fields[key], out = document.getElementById('cf-' + key + '-err');
    out.textContent = text || '';
    if (text) f.setAttribute('aria-invalid', 'true'); else f.removeAttribute('aria-invalid');
  }
  function clearAll() { for (var k in fields) setError(k, ''); status.textContent = ''; status.className = 'cstatus'; }
  function notice(html) { status.className = 'cstatus on'; status.innerHTML = html; }
  function failure() { notice('<p>The form is not working right now. Please email us at ' + MAIL + '.</p>'); }
  function values() {
    return { name: fields.name.value.trim(), email: fields.email.value.trim(), message: fields.message.value.trim() };
  }
  function invalid(v) {
    var bad = [];
    if (v.name.length < 1 || v.name.length > 100) bad.push('name');
    if (v.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email)) bad.push('email');
    if (v.message.length < 10 || v.message.length > 5000) bad.push('message');
    return bad;
  }
  for (var k in fields) fields[k].addEventListener('input', function (e) { setError(e.target.name, ''); });

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    if (send.disabled) return;
    clearAll();
    var v = values(), bad = invalid(v);
    if (bad.length) {
      for (var i = 0; i < bad.length; i++) setError(bad[i], MSG[bad[i]]);
      fields[bad[0]].focus();
      return;
    }
    var ctrl = new AbortController(), timer = setTimeout(function () { ctrl.abort(); }, 15000);
    send.disabled = true; send.textContent = 'Sending...'; form.setAttribute('aria-busy', 'true');
    fetch('https://wazgvaerwdqutzcqdgka.supabase.co/functions/v1/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: v.name, email: v.email, message: v.message,
        website: document.getElementById('cf-website').value,
        elapsed_ms: Math.round(performance.now() - openedAt)
      }),
      signal: ctrl.signal
    }).then(function (res) {
      if (res.ok) {
        form.hidden = true;
        status.className = 'cstatus on done';
        status.innerHTML = '<h3>Thanks, your message is on its way.</h3><p>You will get an answer at <strong></strong>.</p>';
        status.querySelector('strong').textContent = v.email;
        return;
      }
      if (res.status === 400) {
        return res.json().then(function (j) { return j && j.field; }, function () { return null; }).then(function (field) {
          if (fields[field]) { setError(field, MSG[field]); fields[field].focus(); } else failure();
        });
      }
      if (res.status === 429) {
        notice('<p>Too many messages from here in the last hour. Please email ' + MAIL + ' instead.</p>');
        return;
      }
      failure();
    }).catch(failure).then(function () {
      clearTimeout(timer);
      send.disabled = false; send.textContent = 'Send message'; form.removeAttribute('aria-busy');
    });
  });
})();
