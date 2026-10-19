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
      btn.addEventListener('click', function (e) {
        var open = menu.hidden;
        menu.hidden = !open; btn.setAttribute('aria-expanded', String(open)); setCompact();
        btn.querySelector('use').setAttribute('href', open ? '#i-close' : '#i-menu');
        // keyboard only (a tap has e.detail > 0): focusing on a tap drew a focus ring round Features on phones
        if (open && e.detail === 0) { var first = menu.querySelector('a'); if (first) first.focus(); }
      });
      menu.addEventListener('click', function (e) { if (e.target.closest('a')) close(false); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) close(true); });
      // pointerdown, not click: iOS Safari sends no click for a tap on a non-interactive element, so tapping the page
      // never closed the menu on iPhones
      document.addEventListener('pointerdown', function (e) { if (!menu.hidden && !header.contains(e.target)) close(false); });
      matchMedia('(min-width: 860px)').addEventListener('change', function () { close(false); });
    }
  }

  /* ---------- Reveal: plays when an element comes on screen, and resets once it has left, so it plays again next time
     (David, 17 Oct 2026: "once the animations are done, they never come back") ---------- */
  var rowMq = window.matchMedia('(max-width: 859.98px)');
  /* on phones the four Progress charts are a snapping row with their own observer (below), not this one */
  var revealEls = [].slice.call(document.querySelectorAll('[data-reveal], .train-stage, .pstep .pcard, .m, .frow'))
    .filter(function (el) { return !(rowMq.matches && el.matches('.pstep .pcard')); });
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
  var live = document.querySelectorAll('.orbit, .m-code, .frow-code, .flow');
  if (motion && 'IntersectionObserver' in window) {
    var lio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { en.target.classList.toggle('live', en.isIntersecting); });
    });
    [].forEach.call(live, function (el) { lio.observe(el); });
  }

  /* ---------- Item 9: import chips fly along the drawn lines into the B ----------
     The positions come from the SVG paths scaled to the orbit's rendered size, so the chips follow the lines at any width.
     One chip leaves every 0.9 s (Strava, Hevy, Strong, Apple Health), eases in (slow start, accelerates), slips behind the B
     and the B bounces. Runs only while the card is on screen; reduced motion leaves the chips where the CSS puts them. */
  var orbit = document.querySelector('.orbit');
  if (orbit && motion) {
    var oChips = [].slice.call(orbit.querySelectorAll('.chip')), oPaths = [].slice.call(orbit.querySelectorAll('.orbit-lines path'));
    var oApp = orbit.querySelector('.orbit-app'), oRoute = [0, 1, 2, 1], oLen = oPaths.map(function (p) { return p.getTotalLength(); });
    var GAP = 0.9, FLY = 2.4, CYCLE = GAP * oChips.length, oDone = [], oRaf = 0, oT0 = 0;
    var oFrame = function (now) {
      var box = orbit.getBoundingClientRect(), sx = box.width / 400, sy = box.height / 300;
      var t = (now - oT0) / 1000;
      oChips.forEach(function (chip, k) {
        var local = (((t - k * GAP) % CYCLE) + CYCLE) % CYCLE;
        if (local >= FLY) {
          chip.style.opacity = '0';
          if (!oDone[k]) { oDone[k] = true; if (oApp.animate) oApp.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.12)', offset: .3 }, { transform: 'scale(1)' }], { duration: 340, easing: 'ease-out' }); }
          return;
        }
        oDone[k] = false;
        var u = local / FLY, e = u * u;  // slow start, speeds up
        var pi = oRoute[k], pt = oPaths[pi].getPointAtLength(oLen[pi] * e);
        var w = chip.offsetWidth, h = chip.offsetHeight;
        // the chip's left edge sits on the line at the start and its centre on the B at the end
        var x = pt.x * sx - (w / 2) * e, y = pt.y * sy - h / 2;
        var fadeIn = Math.min(1, u / .06), shrink = u > .9 ? 1 - (u - .9) / .1 : 1;
        chip.style.opacity = String(Math.max(0, Math.min(fadeIn, shrink * 1.2)));
        chip.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) scale(' + (.7 + .3 * Math.min(1, shrink * 1.5)).toFixed(3) + ')';
      });
      oRaf = requestAnimationFrame(oFrame);
    };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting && !oRaf) { oT0 = performance.now() - 300; oRaf = requestAnimationFrame(oFrame); }
          else if (!en.isIntersecting && oRaf) { cancelAnimationFrame(oRaf); oRaf = 0; }
        });
      }).observe(orbit);
    }
  }

  /* ---------- Item 10: the check moves through the audience rows while the card is on screen ---------- */
  var aud = document.querySelector('.aud');
  if (aud && motion && 'IntersectionObserver' in window) {
    var audRows = [].slice.call(aud.querySelectorAll('.aud-row')), audTimer = 0;
    var audStep = function () {
      var at = audRows.findIndex(function (r) { return r.classList.contains('on'); });
      audRows.forEach(function (r, i) { r.classList.toggle('on', i === (at + 1) % audRows.length); });
    };
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && !audTimer) audTimer = setInterval(audStep, 2000);
        else if (!en.isIntersecting && audTimer) { clearInterval(audTimer); audTimer = 0; }
      });
    }).observe(aud);
  }

  /* ---------- Item 14: anchors land with the section's heading just below the floating dock ----------
     The glide itself is CSS (html.motion { scroll-behavior: smooth }), so links, Back and /#x from the legal pages all use the
     browser's own anchor scrolling. Each section's scroll-margin-top is measured from where its heading really sits, so it
     follows layout changes at any width (the CSS default of 84 px is the fallback without script). */
  var anchorEls = [].slice.call(document.querySelectorAll('section[id]:not(#top)'));
  var absTop = function (el) { var y = 0; while (el) { y += el.offsetTop; el = el.offsetParent; } return y; };
  var setAnchors = function () {
    var land = (matchMedia('(min-width: 860px)').matches ? 18 + 56 : 10 + 54) + 28;
    anchorEls.forEach(function (sec) {
      var h = sec.querySelector('h1, h2');
      if (h) sec.style.scrollMarginTop = (land - (absTop(h) - absTop(sec))) + 'px';
    });
  };
  setAnchors();
  var anchorTimer = 0;
  window.addEventListener('resize', function () { clearTimeout(anchorTimer); anchorTimer = setTimeout(setAnchors, 150); });
  window.addEventListener('load', function () {
    setAnchors();
    // a page opened at /#faq was placed before the margins existed: place it again, without the glide
    var target = location.hash.length > 1 && document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (target && target.matches('section[id]:not(#top)')) target.scrollIntoView({ behavior: 'instant', block: 'start' });
  });

  /* ---------- Item 14: the menu closes first, then the page glides ---------- */
  if (header && document.getElementById('menu')) {
    document.getElementById('menu').addEventListener('click', function (e) {
      var a = e.target.closest('a'), href = a && a.getAttribute('href');
      var m = href && href.match(/^\/?#([\w-]+)$/);
      if (!m || !document.getElementById(m[1]) || !document.body.classList.contains('home') && !document.documentElement.classList.contains('home')) return;
      e.preventDefault();
      setTimeout(function () { location.hash = m[1]; }, 220);
    });
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
    if (mode === 'hero') {
      // the phone hero: one progress from the top of the page to the end of the pin; s.q is where the pin starts in it
      // (the phone has risen to the centre), so the rise is p / q; s.h is two screens later, the end of the app's beats
      var top0 = r.top + window.scrollY, span = top0 + Math.max(0, r.height - vh);
      var stage = s.el.firstElementChild, sh = stage ? stage.offsetHeight : vh;
      s.q = span > 0 ? top0 / span : 0;
      s.h = span > 0 ? Math.min(1, (top0 + 2 * sh) / span) : 1;
      return span > 0 ? Math.min(1, Math.max(0, window.scrollY / span)) : 1;
    }
    if (mode === 'pin') {
      var len = r.height - vh;
      return len > 0 ? Math.min(1, Math.max(0, -r.top / len)) : 1;
    }
    if (mode === 'view-tall') {
      // Move on phones: the map draws while it crosses the screen
      var map = s.el.querySelector('.map-card').getBoundingClientRect();
      return Math.min(1, Math.max(0, (vh * 0.86 - map.top) / (map.height * 0.75 + vh * 0.1)));
    }
    if (!desktop.matches && s.el.classList.contains('tile')) {
      // Your week on phones: a tile's phone rises as the tile enters the page AND as it is swiped into the row. The
      // swipe part runs from the tile's left edge at the screen's right edge (0) to the tile snapped in place (1), so the
      // phone lands exactly as the tile snaps; the CSS eases it (smoothstep). The vertical part takes a whole screen of
      // scroll, slower than on wide screens, to match.
      var bx = s.el.parentNode.getBoundingClientRect().left + (parseFloat(getComputedStyle(s.el.parentNode).scrollPaddingLeft) || 0);
      var into = Math.min(1, Math.max(0, (window.innerWidth - r.left) / Math.max(1, window.innerWidth - bx)));
      return Math.min(into, Math.max(0, (vh - r.top) / vh));
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
          if (s.mode === 'hero') {
            var k = s.q > 0 ? Math.min(1, next / s.q) : 1;
            s.el.style.setProperty('--re', (k * k * (3 - 2 * k)).toFixed(4));
            if (appAt && !desktop.matches) appAt(s.h > s.q ? Math.min(1, Math.max(0, (next - s.q) / (s.h - s.q))) : 1);
          }
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

  /* ---------- Your week on phones: dots under the swipeable row (hidden on wide screens, where it is a grid) ---------- */
  var bento = document.querySelector('.bento');
  if (bento) {
    var wTiles = [].slice.call(bento.querySelectorAll('.tile'));
    var wDots = document.createElement('div');
    wDots.className = 'week-dots';
    wDots.setAttribute('role', 'group');
    wDots.setAttribute('aria-label', 'Tiles');
    var dotEls = wTiles.map(function (t) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', 'Show ' + t.querySelector('h3').textContent.trim());
      b.addEventListener('click', function () { t.scrollIntoView({ behavior: motion ? 'smooth' : 'auto', block: 'nearest', inline: 'start' }); });
      wDots.appendChild(b);
      return b;
    });
    bento.parentNode.insertBefore(wDots, bento.nextSibling);
    var setDot = function () {
      var step = wTiles[1].getBoundingClientRect().left - wTiles[0].getBoundingClientRect().left;
      var i = bento.scrollLeft >= bento.scrollWidth - bento.clientWidth - 2 ? wTiles.length - 1 : Math.round(bento.scrollLeft / (step || 1));
      dotEls.forEach(function (b, k) { b.setAttribute('aria-current', String(k === i)); });
    };
    bento.addEventListener('scroll', function () { setDot(); if (motion && request) request(); }, { passive: true });
    setDot();
  }

  /* ---------- The phone hero's app (phones): driven by the scroll, not a timer (19 Oct 2026, round 2) ----------
     While the phone is pinned, b runs 0..1 over two screens of scroll, half a screen per beat:
       0   .. .25  Home: the feed scrolls to Max's post, the heart turns red, 4 likes become 5
       .25 .. .50  a tap on Fuel in the dock: the screen changes, the rings fill
       .50 .. .75  a tap on Train: the workout, the third set ticks green, the rest timer and the record pill land
       .75 .. 1    a tap on Move: the run, the map settles and the route draws
     Every value is a function of b alone (custom properties on .app, each screen's opacity), so scrolling back rewinds
     and nothing moves once the scroll stops. The only timed thing is the tap ripple, fired as b crosses a tap. Without
     motion (or without this script) the markup's classes give the still Home feed on Max's post. */
  var appAt = null;
  var app = document.querySelector('.app');
  if (app && motion) {
    var aRoute = app.querySelector('.m-route'), aCase = app.querySelector('.m-case');
    if (route && aRoute) { aRoute.setAttribute('d', route.getAttribute('d')); aCase.setAttribute('d', route.getAttribute('d')); }
    var scrs = ['home', 'fuel', 'train', 'move'].map(function (n) { return app.querySelector('.s-' + n); });
    var TABS = [0, 3, 1, 2];  // the dock index of each beat's screen: Home, Fuel, Train, Move
    var tapEl = app.querySelector('.a-tap'), dockItems = app.querySelectorAll('.a-dock span');
    var likeEl = app.querySelector('.h-max .h-like'), tickEl = app.querySelector('.w-r3 .ck');
    var clock = app.querySelector('.w-clock'), rclock = app.querySelector('.w-rclock');
    var clamp = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x; };
    var seg = function (b, a, c) { return clamp((b - a) / (c - a)); };
    var ease = function (t) { return t * t * (3 - 2 * t); };
    var out = function (t) { return 1 - (1 - t) * (1 - t) * (1 - t); };
    var fmt = function (s) { return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); };
    var tap = function (el) {
      var a = app.getBoundingClientRect(), r = el.getBoundingClientRect(), k = app.offsetWidth / a.width;  // the phone is scaled
      tapEl.style.setProperty('--x', (r.left + r.width / 2 - a.left) * k + 'px');
      tapEl.style.setProperty('--y', (r.top + r.height / 2 - a.top) * k + 'px');
      tapEl.classList.remove('k-go'); void tapEl.offsetWidth; tapEl.classList.add('k-go');
    };
    // each change of screen: the dock tap at c[0], the lens slides to the new tab, the new screen fades in c[1]..c[2]
    var CUTS = [[0.255, 0.27, 0.30], [0.505, 0.52, 0.55], [0.755, 0.77, 0.80]];
    var TAPS = [0.19, 0.585].concat(CUTS.map(function (c) { return c[0]; }));  // the like, the set's tick, the dock taps
    var last = -1;
    var set = function (n, v) { app.style.setProperty(n, v.toFixed(4)); };
    appAt = function (b) {
      if (b === last) return;
      if (last >= 0) TAPS.forEach(function (t, i) {
        if ((last < t) !== (b < t)) tap(i === 0 ? likeEl : i === 1 ? tickEl : dockItems[TABS[i - 1]]);
      });
      last = b;
      // screens: each one fades in over the one before it, which then goes
      scrs.forEach(function (el, k) {
        var o = k === 0 ? 1 : ease(seg(b, CUTS[k - 1][1], CUTS[k - 1][2]));
        if (k < 3 && seg(b, CUTS[k][1], CUTS[k][2]) >= 1) o = 0;
        el.style.opacity = o.toFixed(3);
        el.style.visibility = o > 0 ? 'visible' : 'hidden';
        el.style.zIndex = k + 1;
      });
      // the dock: the lens slides from tab to tab and swells under the finger while it does
      var tabPos = 0, press = 1;
      CUTS.forEach(function (c, k) {
        var m = seg(b, c[0], c[1] + 0.012);
        tabPos += (TABS[k + 1] - TABS[k]) * ease(m);
        if (m > 0 && m < 1) press = 1 + 0.12 * Math.sin(m * Math.PI);
      });
      set('--tab', tabPos); set('--press', press);
      var active = String(Math.round(tabPos));
      if (app.dataset.tab !== active) app.dataset.tab = active;
      // 1. Home: the feed scrolls to Max's post, then the like
      set('--fs', ease(seg(b, 0.02, 0.165)));
      var lk = seg(b, 0.19, 0.215);
      set('--lk', Math.min(1, lk * 3)); set('--lks', 0.5 + 0.5 * lk + 0.3 * Math.sin(lk * Math.PI));
      app.classList.toggle('k-liked', b >= 0.19);
      // 2. Fuel: the big ring, then the three macros a little apart
      set('--f0', out(seg(b, 0.29, 0.40)));
      set('--f1', out(seg(b, 0.31, 0.42))); set('--f2', out(seg(b, 0.33, 0.44))); set('--f3', out(seg(b, 0.35, 0.46)));
      // 3. Train: the third set ticks, the rest timer comes up, the record pill lands; the clocks follow the scroll
      app.classList.toggle('k-tick', b >= 0.585);
      set('--tks', 1 + 0.22 * Math.sin(seg(b, 0.585, 0.605) * Math.PI));
      set('--rest', out(seg(b, 0.6, 0.63)));
      set('--rb', 1 - 0.1 * seg(b, 0.6, 0.75));
      set('--pr', out(seg(b, 0.635, 0.67)));
      clock.textContent = fmt(24 * 60 + 8 + Math.round(seg(b, 0.5, 0.75) * 14));
      rclock.textContent = fmt(90 - Math.round(seg(b, 0.6, 0.75) * 9));
      // 4. Move: the map settles and the sheet comes up, then the route draws
      set('--map', out(seg(b, 0.79, 0.86)));
      set('--dr', ease(seg(b, 0.82, 0.985)));
    };
    app.classList.remove('k-tick', 'k-fill', 'k-draw', 'k-scrolled', 'k-liked');
    app.classList.add('k-live');
    appAt(0);
    if (request) request();
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

  /* ---------- Progress on phones: one snapping row; the snapped card plays its chart, a dot per card shows which ---------- */
  var row = document.querySelector('.prog-steps');
  if (row && rowMq.matches && 'IntersectionObserver' in window) {
    var rowCards = [].slice.call(row.querySelectorAll('.pstep'));
    var dots = document.createElement('div');
    dots.className = 'prog-dots';
    var dotBtns = rowCards.map(function (st, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', 'Show card ' + (i + 1) + ' of ' + rowCards.length + ': ' + st.querySelector('h3').textContent);
      b.addEventListener('click', function () {
        row.scrollTo({ left: st.offsetLeft - parseFloat(getComputedStyle(row).paddingLeft), behavior: motion ? 'smooth' : 'auto' });
      });
      dots.appendChild(b);
      return b;
    });
    row.parentNode.insertBefore(dots, row.nextSibling);
    var mark = function (i) { dotBtns.forEach(function (b, k) { if (k === i) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); }); };
    mark(0);
    // a card plays while it is the snapped one AND the row is on the page's screen
    var ratios = rowCards.map(function () { return 0; }), rowOn = false;
    var sync = function () {
      rowCards.forEach(function (st, i) {
        var card = st.querySelector('.pcard');
        if (ratios[i] >= 0.6) mark(i);
        if (!motion) return;
        if (rowOn && ratios[i] >= 0.6) { if (!card.classList.contains('play')) { card.classList.add('in', 'play'); countIn(card); } }
        else if (!rowOn || ratios[i] < 0.2) card.classList.remove('in', 'play');
      });
    };
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { ratios[rowCards.indexOf(en.target)] = en.intersectionRatio; });
      sync();
    }, { root: row, threshold: [0, 0.2, 0.6] });
    rowCards.forEach(function (st) { cio.observe(st); });
    new IntersectionObserver(function (entries) { rowOn = entries[entries.length - 1].isIntersecting; sync(); }, { threshold: 0.3 }).observe(row);
  }

  /* ---------- Contact form. Without JS the form stays hidden and the email address below it is the way in. ---------- */
  var form = document.getElementById('contact-form');
  if (!form || !window.fetch) return;
  var status = document.getElementById('contact-status'), send = document.getElementById('cf-send');
  var fields = { name: form.elements.name, email: form.elements.email, message: form.elements.message };
  var MAIL = '<a href="mailto:contact@bayda-app.com">contact@bayda-app.com</a>';
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
