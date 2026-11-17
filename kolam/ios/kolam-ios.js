/*! Kolam iOS app mode — https://tgopinath.github.io/kolam-design-system/ios/
 * Apple Human Interface Guidelines look for Kolam web apps, ONLY inside an iOS app shell.
 *
 * Load in <head> (it tags <html> before first paint):
 *   <script src="https://tgopinath.github.io/kolam-design-system/ios/kolam-ios.js"></script>
 * then, once the DOM is ready:
 *   KolamIOS.init({ appName: 'Vanam', uaTokens: ['ZoorassicPark-iOS'], navBar: {...}, tabs: [...] })
 *
 * Detection (html.k-ios): window.KolamShell (injected by the Kolam shell template), a UA token
 * ("Kolam-iOS", "<Name>-iOS/x", or your uaTokens / <html data-ios-ua="…">), an iOS WKWebView
 * with message handlers and no "Safari/" token, or an iOS Home Screen web app.
 * ?app=ios forces it on, ?app=web forces it off (kept for the tab in sessionStorage "kolam.app").
 * Never on by default in Safari, Chrome or any other browser.
 */
(function (global) {
  'use strict';
  var doc = global.document, root = doc.documentElement;
  var KEY = 'kolam.app';

  // ------------------------------------------------------------------ detection
  function detect(extraTokens) {
    var q = /[?&]app=(ios|web|android)\b/.exec(global.location.search);
    try { if (q) global.sessionStorage.setItem(KEY, q[1]); } catch (e) {}
    var forced = null;
    try { forced = global.sessionStorage.getItem(KEY); } catch (e) {}
    if (forced === 'ios') return true;
    if (forced === 'web' || forced === 'android') return false;

    var shell = global.KolamShell;
    if (shell && shell.platform === 'ios') return true;
    var ua = global.navigator.userAgent || '';
    var tokens = ['Kolam-iOS'].concat(extraTokens || [], (root.getAttribute('data-ios-ua') || '').split(/[\s,]+/).filter(Boolean));
    for (var i = 0; i < tokens.length; i++) if (ua.indexOf(tokens[i]) !== -1) return true;
    if (/\b[A-Z][A-Za-z0-9]*-iOS\/\d/.test(ua)) return true;           // "<Name>-iOS/1.0" from the shell template
    var iosDevice = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && global.navigator.maxTouchPoints > 1);
    if (!iosDevice) return false;
    // An app's own WKWebView: message handlers exist and the UA has no "Safari/" token
    // (Safari, Chrome, Firefox and Edge for iOS all carry "Safari/").
    if (global.webkit && global.webkit.messageHandlers && !/Safari\//.test(ua)) return true;
    // Added to the Home Screen from Safari
    if (global.navigator.standalone === true) return true;
    try { if (global.matchMedia('(display-mode: standalone)').matches) return true; } catch (e) {}
    return false;
  }

  var isIOS = detect();
  if (isIOS) root.classList.add('k-ios');
  if (global.KolamShell && global.KolamShell.reduceTransparency) root.classList.add('ios-reduce-transparency');

  // ------------------------------------------------------------------ icons (SF Symbols-style line icons, 24 grid)
  var P = {
    'chevron.left': '<path d="M15 4.5 7.5 12l7.5 7.5"/>',
    'chevron.right': '<path d="m9 4.5 7.5 7.5L9 19.5"/>',
    'chevron.down': '<path d="m5 9 7 7 7-7"/>',
    'xmark': '<path d="M6 6l12 12M18 6 6 18"/>',
    'checkmark': '<path d="m4.5 12.5 5 5 10-11"/>',
    'plus': '<path d="M12 4.5v15M4.5 12h15"/>',
    'minus': '<path d="M4.5 12h15"/>',
    'magnifyingglass': '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/>',
    'ellipsis': '<circle cx="5.5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="18.5" cy="12" r="1.3" fill="currentColor"/>',
    'square.and.arrow.up': '<path d="M12 3v12M8 7l4-4 4 4"/><path d="M8.5 10H6v10.5h12V10h-2.5"/>',
    'house': '<path d="M3.5 11 12 4l8.5 7"/><path d="M5.5 9.5V20h4.5v-6h4v6h4.5V9.5"/>',
    'gearshape': '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/><circle cx="12" cy="12" r="6.6"/>',
    'person': '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c.8-4 3.8-6 7.5-6s6.7 2 7.5 6"/>',
    'person.2': '<circle cx="9" cy="8.5" r="3.5"/><path d="M2.8 19.5c.6-3.4 3-5.2 6.2-5.2s5.6 1.8 6.2 5.2"/><path d="M15.5 5.3a3.5 3.5 0 0 1 0 6.6M17.6 14.6c2 .6 3.3 2.3 3.6 4.9"/>',
    'star': '<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z"/>',
    'heart': '<path d="M12 20s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.6-7.5 10-7.5 10z"/>',
    'bell': '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    'bookmark': '<path d="M6.5 3.5h11v17L12 16.5l-5.5 4z"/>',
    'trash': '<path d="M4 6.5h16M9.5 6.5V4h5v2.5M6 6.5l1 14h10l1-14M10 10.5v6.5M14 10.5v6.5"/>',
    'pencil': '<path d="m15.5 4.5 4 4L8.5 19.5 4 20l.5-4.5z"/><path d="m13.5 6.5 4 4"/>',
    'info.circle': '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5"/><circle cx="12" cy="7.8" r=".9" fill="currentColor"/>',
    'list.bullet': '<path d="M9 6.5h11M9 12h11M9 17.5h11"/><circle cx="4.5" cy="6.5" r="1" fill="currentColor"/><circle cx="4.5" cy="12" r="1" fill="currentColor"/><circle cx="4.5" cy="17.5" r="1" fill="currentColor"/>',
    'square.grid.2x2': '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>',
    'map': '<path d="m3.5 6.5 5.5-2.5 6 2.5 5.5-2.5v13.5l-5.5 2.5-6-2.5-5.5 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>',
    'calendar': '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    'clock': '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/>',
    'photo': '<rect x="3.5" y="5" width="17" height="14" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="m4 17 5-4.5 4 3.5 2.5-2 4.5 3.5"/>',
    'play.fill': '<path d="M7.5 4.5v15l12-7.5z" fill="currentColor"/>',
    'sparkles': '<path d="M10 3.5c.6 3.6 2.4 5.4 6 6-3.6.6-5.4 2.4-6 6-.6-3.6-2.4-5.4-6-6 3.6-.6 5.4-2.4 6-6zM18 14c.3 1.8 1.2 2.7 3 3-1.8.3-2.7 1.2-3 3-.3-1.8-1.2-2.7-3-3 1.8-.3 2.7-1.2 3-3z"/>',
    'mic': '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
    'folder': '<path d="M3.5 7a2 2 0 0 1 2-2H10l2 2.5h6.5a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>',
    'flag': '<path d="M5.5 21V4M5.5 4.5h11l-2 4 2 4h-11"/>',
    'globe': '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.4 3.5 5.2 3.5 8.5s-1.1 6.1-3.5 8.5c-2.4-2.4-3.5-5.2-3.5-8.5S9.6 5.9 12 3.5z"/>',
    'leaf': '<path d="M5 19c0-8 5-13.5 15-14-.5 10-6 15-14 15"/><path d="M5 19c3-4 6-6.5 9.5-8"/>',
    'speaker.wave.2': '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
    'arrow.clockwise': '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 4v4.5H15"/>',
    'sun.max': '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
    'textformat.size': '<path d="M3.5 18.5 8 7.5l4.5 11M5 15h6M13.5 18.5l3.5-8 3.5 8M14.5 16h5"/>',
    'lock': '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
    'archivebox': '<rect x="3.5" y="4" width="17" height="4.5" rx="1.2"/><path d="M5 8.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19V8.5M10 12h4"/>',
    'doc.on.doc': '<rect x="8" y="7.5" width="11.5" height="13" rx="2"/><path d="M15.5 7.5V5.5a2 2 0 0 0-2-2h-7.5a2 2 0 0 0-2 2V15a2 2 0 0 0 2 2h2"/>'
  };
  function icon(name, cls) {
    if (!name) return '';
    if (/^\s*<svg/.test(name)) return name;
    var body = P[name] || P['info.circle'];
    return '<svg class="ios-icon' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + body + '</svg>';
  }

  // ------------------------------------------------------------------ small helpers
  function $(sel, ctx) { return typeof sel === 'string' ? (ctx || doc).querySelector(sel) : sel; }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function el(html) { var t = doc.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
  function reducedMotion() { try { return global.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }
  var opts = { haptics: true };

  // ------------------------------------------------------------------ haptics bridge
  // Kinds: light, medium, heavy, soft, rigid, selection, success, warning, error.
  function haptic(kind) {
    if (!opts.haptics) return;
    try { global.webkit.messageHandlers.haptic.postMessage(kind || 'light'); } catch (e) {}
  }

  // ------------------------------------------------------------------ Dynamic Type
  // WebKit sizes "font: -apple-system-body" from the user's text size setting; body is 17pt at Large.
  function applyDynamicType() {
    var scale = 1;
    try {
      if (global.CSS && CSS.supports('font', '-apple-system-body')) {
        var probe = doc.createElement('span');
        probe.style.cssText = 'position:absolute;visibility:hidden;font:-apple-system-body';
        root.appendChild(probe);
        var px = parseFloat(global.getComputedStyle(probe).fontSize);
        probe.remove();
        if (px) scale = px / 17;
      }
    } catch (e) {}
    scale = Math.max(.82, Math.min(scale, 3.1));
    root.style.setProperty('--ios-dt', scale.toFixed(3));
    return scale;
  }
  // Re-read when the user changes text size while the app is open (WebKit fires resize-like reflow; check on focus).
  global.addEventListener('pageshow', function () { if (isIOS) applyDynamicType(); });
  doc.addEventListener('visibilitychange', function () { if (isIOS && !doc.hidden) applyDynamicType(); });

  // ------------------------------------------------------------------ navigation bar
  function backButton(back) {
    var label = back.label && back.label.length <= 14 ? back.label : 'Back';
    var b = el('<button type="button" class="ios-barbtn ios-back">' + icon('chevron.left') + '<span class="ios-back-label">' + esc(label) + '</span></button>');
    b.setAttribute('aria-label', back.label ? 'Back to ' + back.label : 'Back');
    b.addEventListener('click', function () {
      haptic('light');
      if (back.onClick) return back.onClick();
      if (back.href) return (global.location.href = back.href);
      global.history.back();
    });
    return b;
  }
  function barButtons(actions) {
    var wrap = doc.createDocumentFragment(), group = null;
    (actions || []).forEach(function (a) {
      var isIcon = !!a.icon && !a.text;
      var b = el('<button type="button" class="ios-barbtn' + (isIcon ? ' is-icon' : '') + (a.prominent ? ' is-prominent' : '') + '">' + (a.icon ? icon(a.icon) : '') + (a.text ? '<span>' + esc(a.text) + '</span>' : '') + '</button>');
      if (a.id) b.id = a.id;
      b.setAttribute('aria-label', a.label || a.text || '');
      if (a.menu) b.setAttribute('aria-haspopup', 'menu');
      b.addEventListener('click', function (e) {
        haptic('light');
        if (a.menu) return menu(b, typeof a.menu === 'function' ? a.menu() : a.menu);
        if (a.onClick) a.onClick(e);
      });
      if (a.prominent) { group = null; wrap.appendChild(b); return; }
      if (!group) { group = el('<div class="ios-barbtn-group"></div>'); wrap.appendChild(group); }
      group.appendChild(b);
    });
    return wrap;
  }

  var nav = { el: null, large: null, cfg: {} };
  function onScroll() {
    if (!nav.el) return;
    var y = global.scrollY || 0;
    nav.el.classList.toggle('is-scrolled', y > 2);
    if (nav.large && !nav.large.hidden) {
      var h = nav.large.offsetHeight;
      nav.el.classList.toggle('is-collapsed', y > Math.max(h - 12, 8));
    }
  }
  /** Build or update the navigation bar.
   *  cfg: { title, subtitle, large (bool), back: { label, href | onClick } | null, leading: [actions], actions: [actions] }
   *  action: { id, icon, text, label (accessible name), prominent, onClick, menu: [menu items] } */
  function setNavBar(cfg) {
    if (!isIOS) return null;
    cfg = cfg || {};
    nav.cfg = cfg;
    var mount = $(opts.navMount) || doc.body;
    if (!nav.el) {
      nav.el = el('<header class="ios-navbar" role="banner"><div class="ios-navbar-leading"></div><h1 class="ios-navbar-title"></h1><div class="ios-navbar-trailing"></div></header>');
      nav.large = el('<h2 class="ios-largetitle" aria-hidden="true"></h2>');
      mount.insertBefore(nav.large, mount.firstChild);
      mount.insertBefore(nav.el, mount.firstChild);
      global.addEventListener('scroll', onScroll, { passive: true });
    }
    var title = cfg.title || opts.appName || doc.title;
    var t = nav.el.querySelector('.ios-navbar-title');
    t.innerHTML = esc(title) + (cfg.subtitle ? '<small>' + esc(cfg.subtitle) + '</small>' : '');
    var large = !!cfg.large && !cfg.back;
    nav.el.classList.toggle('has-large', large);
    nav.large.hidden = !large;
    nav.large.textContent = title;
    var lead = nav.el.querySelector('.ios-navbar-leading'), trail = nav.el.querySelector('.ios-navbar-trailing');
    lead.textContent = ''; trail.textContent = '';
    if (cfg.back) { var g = el('<div class="ios-barbtn-group"></div>'); g.appendChild(backButton(cfg.back)); lead.appendChild(g); }
    if (cfg.leading) lead.appendChild(barButtons(cfg.leading));
    if (cfg.actions) trail.appendChild(barButtons(cfg.actions));
    if (!cfg.keepTitle) doc.title = title === opts.appName || !opts.appName ? title : title + ' · ' + opts.appName;
    onScroll();
    return nav.el;
  }

  // ------------------------------------------------------------------ tab bar
  var tabs = { el: null, items: [], onSelect: null };
  /** destinations: [{ id, label, icon, href, badge, role: 'search' }] — at most 5 regular tabs (HIG). */
  function buildTabBar(destinations, o) {
    if (!isIOS) return null;
    o = o || {};
    var regular = destinations.filter(function (d) { return d.role !== 'search'; });
    var search = destinations.filter(function (d) { return d.role === 'search'; })[0];
    if (regular.length > 5) { console.warn('[KolamIOS] A tab bar shows at most 5 tabs; extra tabs dropped:', regular.slice(5).map(function (d) { return d.label; })); regular = regular.slice(0, 5); }
    if (tabs.el) tabs.el.remove();
    var bar = el('<nav class="ios-tabbar" aria-label="' + esc(o.label || 'Tabs') + '"><div class="ios-tabbar-tabs"></div></nav>');
    var box = bar.firstChild;
    function make(d, cls) {
      var tag = d.href ? 'a' : 'button';
      var n = el('<' + tag + ' class="' + cls + '" data-tab="' + esc(d.id) + '"' + (d.href ? ' href="' + esc(d.href) + '"' : ' type="button"') + '>' + icon(d.icon) + (cls === 'ios-tab' ? '<span>' + esc(d.label) + '</span>' : '') + '</' + tag + '>');
      if (cls !== 'ios-tab') n.setAttribute('aria-label', d.label || 'Search');
      n.addEventListener('click', function (e) {
        haptic('selection');
        if (o.onSelect && o.onSelect(d.id, e) === false) e.preventDefault();
        selectTab(d.id);
      });
      return n;
    }
    regular.forEach(function (d) { box.appendChild(make(d, 'ios-tab')); });
    if (search) bar.appendChild(make(search, 'ios-tabbar-search'));
    ($(o.mount) || doc.body).appendChild(bar);
    tabs.el = bar; tabs.items = destinations; tabs.onSelect = o.onSelect;
    root.classList.add('ios-has-tabbar');
    regular.concat(search ? [search] : []).forEach(function (d) { if (d.badge) setBadge(d.id, d.badge); });
    if (o.current) selectTab(o.current);
    return bar;
  }
  function selectTab(id) {
    if (!tabs.el) return;
    $$('[data-tab]', tabs.el).forEach(function (n) {
      if (n.dataset.tab === id) n.setAttribute('aria-current', 'page'); else n.removeAttribute('aria-current');
    });
  }
  function setBadge(id, value) {
    if (!tabs.el) return;
    var n = tabs.el.querySelector('[data-tab="' + id + '"]'); if (!n) return;
    var b = n.querySelector('.ios-badge');
    if (!value) { if (b) b.remove(); return; }
    if (!b) { b = el('<span class="ios-badge"></span>'); n.appendChild(b); }
    b.textContent = value;
    b.setAttribute('aria-label', value + ' new');
  }

  // ------------------------------------------------------------------ toolbar
  /** items: actions as for the nav bar, plus { spacer: true } and { title: 'Updated just now' } */
  function buildToolbar(items) {
    if (!isIOS) return null;
    var old = $('.ios-toolbar'); if (old) old.remove();
    var bar = el('<div class="ios-toolbar" role="toolbar"></div>');
    var run = [];
    function flush() { if (run.length) { bar.appendChild(barButtons(run)); run = []; } }
    items.forEach(function (it) {
      if (it.spacer) { flush(); bar.appendChild(el('<span style="flex:1"></span>')); }
      else if (it.title) { flush(); bar.appendChild(el('<span class="ios-toolbar-title">' + esc(it.title) + '</span>')); }
      else run.push(it);
    });
    flush();
    doc.body.appendChild(bar);
    root.classList.add('ios-has-toolbar');
    return bar;
  }

  // ------------------------------------------------------------------ dialogs: shared open/close with motion
  function animateIn(d, from) {
    if (reducedMotion() || !d.animate) return;
    d.animate(from, { duration: 380, easing: 'cubic-bezier(.32,.72,0,1)' });
  }
  function animateOut(d, to, done) {
    if (reducedMotion() || !d.animate) return done();
    var a = d.animate(to, { duration: 220, easing: 'ease-in', fill: 'forwards' });
    a.onfinish = done;
  }

  // ------------------------------------------------------------------ sheets
  /** sheet({ title, content: Node | html, detents: ['medium','large'], detent, grabber, cancel: 'Cancel' | false,
   *          done: { text, onClick } | false, onClose }) → { el, body, close(), setDetent(d) } */
  function sheet(o) {
    o = o || {};
    var detents = o.detents || ['medium', 'large'];
    var d = el('<dialog class="ios-sheet" aria-labelledby="ios-sheet-t"><button type="button" class="ios-sheet-grabber" aria-label="Resize sheet"></button>' +
      '<div class="ios-sheet-header"><span></span><h2 class="ios-sheet-title" id="ios-sheet-t"></h2><span></span></div><div class="ios-sheet-body"></div></dialog>');
    var id = 'ios-sheet-t-' + Math.random().toString(36).slice(2, 7);
    d.setAttribute('aria-labelledby', id);
    var head = d.querySelector('.ios-sheet-header'), titleEl = head.children[1], body = d.querySelector('.ios-sheet-body');
    titleEl.id = id; titleEl.textContent = o.title || '';
    if (o.grabber === false || detents.length < 2) d.querySelector('.ios-sheet-grabber').hidden = true;
    if (o.cancel !== false) {
      var c = el('<button type="button" class="ios-barbtn' + (o.cancel ? '' : ' is-icon') + '">' + (o.cancel ? esc(o.cancel) : icon('xmark')) + '</button>');
      c.setAttribute('aria-label', o.cancel || 'Close');
      c.onclick = function () { close('cancel'); };
      head.replaceChild(c, head.children[0]);
    }
    if (o.done) {
      var dn = el('<button type="button" class="ios-barbtn ' + (o.done.text ? 'is-prominent' : 'is-icon is-prominent') + '">' + (o.done.text ? esc(o.done.text) : icon('checkmark')) + '</button>');
      dn.setAttribute('aria-label', o.done.text || 'Done');
      dn.onclick = function () { if (o.done.onClick && o.done.onClick() === false) return; haptic('success'); close('done'); };
      head.replaceChild(dn, head.children[2]);
    }
    if (typeof o.content === 'string') body.innerHTML = o.content; else if (o.content) body.appendChild(o.content);
    doc.body.appendChild(d);

    function heightFor(det) {
      var vh = global.innerHeight;
      var sat = parseFloat(getComputedStyle(root).getPropertyValue('--sat')) || 0;
      if (det === 'large') return vh - Math.max(sat, 20) - 10;
      if (typeof det === 'number') return det;
      return Math.round(vh * .52);
    }
    var current = o.detent || detents[0];
    function setDetent(det) {
      current = det;
      d.dataset.detent = det;
      d.style.setProperty('--ios-sheet-h', heightFor(det) + 'px');
    }
    setDetent(current);
    var closing = false;
    function close(reason) {
      if (closing) return; closing = true;
      animateOut(d, [{ transform: 'translateY(0)' }, { transform: 'translateY(105%)' }], function () {
        d.close(); d.remove(); global.removeEventListener('resize', onResize);
        if (o.onClose) o.onClose(reason);
      });
    }
    d.addEventListener('cancel', function (e) { e.preventDefault(); close('cancel'); });
    d.addEventListener('click', function (e) { if (e.target === d) { var r = d.getBoundingClientRect(); if (e.clientY < r.top) close('cancel'); } });
    function onResize() { setDetent(current); }
    global.addEventListener('resize', onResize);
    d.tabIndex = -1;
    d.showModal();
    d.focus();   // focus the sheet itself (VoiceOver reads its title); Tab then reaches the controls
    animateIn(d, [{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }]);
    haptic('light');

    // Drag the grabber/header to change detent or dismiss
    var startY = 0, startH = 0, dragging = false, lastY = 0, lastT = 0, vel = 0;
    function down(e) {
      if (e.target.closest('button:not(.ios-sheet-grabber)')) return;
      dragging = true; startY = lastY = e.clientY; lastT = Date.now(); startH = d.getBoundingClientRect().height; vel = 0;
      d.classList.add('is-dragging');
      e.currentTarget.setPointerCapture && e.currentTarget.setPointerCapture(e.pointerId);
    }
    function move(e) {
      if (!dragging) return;
      var now = Date.now(); vel = (e.clientY - lastY) / Math.max(1, now - lastT); lastY = e.clientY; lastT = now;
      var h = startH - (e.clientY - startY);
      var max = heightFor('large');
      if (h > max) h = max + (h - max) * .15; // rubber band
      d.style.setProperty('--ios-sheet-h', Math.max(80, h) + 'px');
    }
    function up() {
      if (!dragging) return; dragging = false; d.classList.remove('is-dragging');
      var h = d.getBoundingClientRect().height;
      if (vel > .8 || h < heightFor(detents[0]) * .6) return close('drag');
      var best = detents.reduce(function (a, b) { return Math.abs(heightFor(b) - h) < Math.abs(heightFor(a) - h) ? b : a; });
      if (vel < -.6 && detents.indexOf('large') !== -1) best = 'large';
      if (best !== current) haptic('selection');
      setDetent(best);
    }
    [d.querySelector('.ios-sheet-grabber'), head].forEach(function (h) {
      h.addEventListener('pointerdown', down); h.addEventListener('pointermove', move);
      h.addEventListener('pointerup', up); h.addEventListener('pointercancel', up);
    });
    d.querySelector('.ios-sheet-grabber').addEventListener('click', function () {
      if (detents.length < 2) return;
      setDetent(detents[(detents.indexOf(current) + 1) % detents.length]);
    });
    return { el: d, body: body, close: close, setDetent: setDetent };
  }

  // ------------------------------------------------------------------ alerts
  /** alert({ title, message, actions: [{ text, role: 'cancel' | 'destructive' | 'default', value }], field: { placeholder, value, type } })
   *  → Promise<{ value, text, input }>. Two actions sit side by side; three or more stack. */
  function alert(o) {
    o = o || {};
    var actions = o.actions || [{ text: 'OK', role: 'default' }];
    return new Promise(function (resolve) {
      var id = 'ios-a-' + Math.random().toString(36).slice(2, 7);
      var d = el('<dialog class="ios-alert" role="alertdialog" aria-labelledby="' + id + '" aria-describedby="' + id + 'm">' +
        (o.title ? '<h2 class="ios-alert-title" id="' + id + '">' + esc(o.title) + '</h2>' : '') +
        (o.message ? '<p class="ios-alert-message" id="' + id + 'm">' + esc(o.message) + '</p>' : '') +
        (o.field ? '<div class="ios-alert-field"><input class="ios-textfield" type="' + esc(o.field.type || 'text') + '" placeholder="' + esc(o.field.placeholder || '') + '" value="' + esc(o.field.value || '') + '" aria-label="' + esc(o.field.label || o.field.placeholder || o.title || '') + '"></div>' : '') +
        '<div class="ios-alert-actions' + (actions.length > 2 ? ' is-stacked' : '') + '"></div></dialog>');
      var row = d.querySelector('.ios-alert-actions');
      // HIG: Cancel on the leading side of a pair; at the bottom of a stack.
      var ordered = actions.slice();
      if (ordered.length > 2) ordered.sort(function (a, b) { return (a.role === 'cancel') - (b.role === 'cancel'); });
      else ordered.sort(function (a, b) { return (b.role === 'cancel') - (a.role === 'cancel'); });
      ordered.forEach(function (a) {
        var b = el('<button type="button" class="' + (a.role === 'destructive' ? 'is-destructive' : a.role === 'default' ? 'is-default' : '') + '">' + esc(a.text) + '</button>');
        b.onclick = function () { done(a); };
        row.appendChild(b);
      });
      function done(a) {
        var input = d.querySelector('input');
        haptic(a.role === 'destructive' ? 'warning' : 'light');
        animateOut(d, [{ opacity: 1 }, { opacity: 0 }], function () { d.close(); d.remove(); resolve({ value: a.value !== undefined ? a.value : a.text, text: a.text, role: a.role, input: input ? input.value : undefined }); });
      }
      d.addEventListener('cancel', function (e) {
        e.preventDefault();
        var c = actions.filter(function (a) { return a.role === 'cancel'; })[0];
        if (c) done(c);
      });
      doc.body.appendChild(d);
      d.showModal();
      var focus = d.querySelector('input') || row.querySelector('.is-default') || row.querySelector('button');
      if (focus) focus.focus();
      animateIn(d, [{ opacity: 0, transform: 'scale(1.15)' }, { opacity: 1, transform: 'scale(1)' }]);
      haptic(o.haptic || 'warning');
    });
  }

  // ------------------------------------------------------------------ action sheets
  /** actionSheet({ title, message, actions: [{ text, icon, role: 'destructive' | 'cancel', value }] }) → Promise<value | null> */
  function actionSheet(o) {
    o = o || {};
    var acts = (o.actions || []).filter(function (a) { return a.role !== 'cancel'; });
    var cancel = (o.actions || []).filter(function (a) { return a.role === 'cancel'; })[0] || { text: 'Cancel', role: 'cancel', value: null };
    return new Promise(function (resolve) {
      var d = el('<dialog class="ios-actionsheet" aria-label="' + esc(o.title || 'Actions') + '"><div class="ios-actionsheet-group"></div><div class="ios-actionsheet-group"></div></dialog>');
      var g1 = d.children[0], g2 = d.children[1];
      if (o.title || o.message) g1.appendChild(el('<div class="ios-actionsheet-head">' + esc(o.title || '') + (o.message ? '<p>' + esc(o.message) + '</p>' : '') + '</div>'));
      function btn(a, g) {
        var b = el('<button type="button" class="' + (a.role === 'destructive' ? 'is-destructive' : a.role === 'cancel' ? 'is-cancel' : '') + '">' + (a.icon ? icon(a.icon) : '') + '<span>' + esc(a.text) + '</span></button>');
        b.onclick = function () { finish(a); };
        g.appendChild(b);
      }
      acts.forEach(function (a) { btn(a, g1); });
      btn(cancel, g2);
      function finish(a) {
        haptic(a.role === 'destructive' ? 'warning' : 'light');
        animateOut(d, [{ transform: 'translateY(0)' }, { transform: 'translateY(110%)' }], function () {
          d.close(); d.remove(); resolve(a.role === 'cancel' ? null : (a.value !== undefined ? a.value : a.text));
        });
      }
      d.addEventListener('cancel', function (e) { e.preventDefault(); finish(cancel); });
      d.addEventListener('click', function (e) { if (e.target === d) finish(cancel); });
      doc.body.appendChild(d);
      d.tabIndex = -1;
      d.showModal();
      d.focus();
      animateIn(d, [{ transform: 'translateY(110%)' }, { transform: 'translateY(0)' }]);
      haptic('light');
    });
  }

  // ------------------------------------------------------------------ menus
  /** menu(anchor, items) — items: [{ text, icon, role: 'destructive', checked, disabled, onClick, value }, '-' (separator), { title }]
   *  → Promise<value | null>. Arrow keys move, Esc closes, focus returns to the anchor. */
  function menu(anchor, items) {
    anchor = $(anchor);
    return new Promise(function (resolve) {
      var d = el('<dialog class="ios-menu" role="menu"></dialog>');
      var hasChecks = items.some(function (it) { return it && it.checked !== undefined; });
      items.forEach(function (it) {
        if (it === '-') return d.appendChild(el('<div class="ios-menu-sep" role="separator"></div>'));
        if (it.title) return d.appendChild(el('<div class="ios-menu-title">' + esc(it.title) + '</div>'));
        var role = it.checked !== undefined ? 'menuitemcheckbox' : 'menuitem';
        var b = el('<button type="button" class="ios-menu-item' + (it.role === 'destructive' ? ' is-destructive' : '') + '" role="' + role + '"' + (it.checked !== undefined ? ' aria-checked="' + !!it.checked + '"' : '') + (it.disabled ? ' disabled' : '') + '>' +
          (hasChecks ? icon('checkmark', 'ios-menu-check') : '') + '<span>' + esc(it.text) + '</span>' + (it.icon ? icon(it.icon) : '') + '</button>');
        b.onclick = function () { haptic('selection'); finish(it); if (it.onClick) it.onClick(); };
        d.appendChild(b);
      });
      function finish(it) {
        animateOut(d, [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.92)' }], function () {
          d.close(); d.remove(); if (anchor) anchor.focus(); resolve(it ? (it.value !== undefined ? it.value : it.text) : null);
        });
      }
      d.addEventListener('cancel', function (e) { e.preventDefault(); finish(null); });
      d.addEventListener('click', function (e) { if (e.target === d) { var r = d.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) finish(null); } });
      d.addEventListener('keydown', function (e) {
        var list = $$('.ios-menu-item:not(:disabled)', d), i = list.indexOf(doc.activeElement);
        if (e.key === 'ArrowDown') { e.preventDefault(); (list[i + 1] || list[0]).focus(); }
        if (e.key === 'ArrowUp') { e.preventDefault(); (list[i - 1] || list[list.length - 1]).focus(); }
      });
      doc.body.appendChild(d);
      d.showModal();
      // Position below the anchor, aligned to its nearer edge, kept on screen
      var r = anchor ? anchor.getBoundingClientRect() : { left: 16, right: 16, bottom: 60, top: 60 };
      var w = d.offsetWidth, h = d.offsetHeight, vw = global.innerWidth, vh = global.innerHeight;
      var alignRight = r.left + r.width / 2 > vw / 2;
      var left = alignRight ? r.right - w : r.left;
      left = Math.max(12, Math.min(left, vw - w - 12));
      var top = r.bottom + 8;
      var up = top + h > vh - 12;
      if (up) top = Math.max(12, r.top - h - 8);
      d.style.left = left + 'px'; d.style.top = top + 'px';
      d.style.setProperty('--ios-menu-origin', (up ? 'bottom ' : 'top ') + (alignRight ? 'right' : 'left'));
      var first = d.querySelector('.ios-menu-item:not(:disabled)'); if (first) first.focus();
      animateIn(d, [{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'scale(1)' }]);
    });
  }

  // ------------------------------------------------------------------ swipe back (left edge)
  // Inside the Kolam shell the native WKWebView gesture already walks history (pushState and hash
  // changes included); this hook is for Home Screen web apps and for in-page views that are not in
  // history. handler() returns false to refuse (e.g. nothing to go back to).
  var swipeHandler = null, swipeBound = false;
  function onSwipeBack(handler, o) {
    o = o || {};
    swipeHandler = handler;
    if (swipeBound) return;
    var native = global.KolamShell && global.KolamShell.nativeBack;
    if (native && !o.force) return;
    swipeBound = true;
    var target = null, sx = 0, sy = 0, dx = 0, active = false, t0 = 0;
    doc.addEventListener('touchstart', function (e) {
      var t = e.touches[0]; if (!t || t.clientX > 24 || e.touches.length > 1) return;
      if (doc.querySelector('dialog[open]')) return;
      active = true; sx = t.clientX; sy = t.clientY; dx = 0; t0 = Date.now();
      target = $(o.target || opts.content) || doc.body;
    }, { passive: true });
    doc.addEventListener('touchmove', function (e) {
      if (!active) return;
      var t = e.touches[0]; dx = t.clientX - sx;
      if (Math.abs(t.clientY - sy) > Math.abs(dx) && dx < 30) { active = false; target.style.transform = ''; return; }
      if (!reducedMotion()) { target.style.transition = 'none'; target.style.transform = 'translateX(' + Math.max(0, dx) + 'px)'; }
    }, { passive: true });
    doc.addEventListener('touchend', function () {
      if (!active) return; active = false;
      var fast = dx > 60 && Date.now() - t0 < 300;
      var go = dx > global.innerWidth * .35 || fast;
      target.style.transition = 'transform .3s cubic-bezier(.32,.72,0,1)';
      if (go && swipeHandler && swipeHandler() !== false) {
        haptic('light');
        target.style.transform = 'translateX(100%)';
        setTimeout(function () { target.style.transition = 'none'; target.style.transform = ''; }, 300);
      } else target.style.transform = '';
    });
  }

  // ------------------------------------------------------------------ enhance: segmented, steppers, sliders, search, swipe rows, page controls
  function enhanceSeg(s) {
    var btns = $$('.ios-seg-btn, .k-tab', s);
    if (!btns.length) return;
    s.style.setProperty('--n', btns.length);
    var role = s.getAttribute('role') || (s.classList.contains('k-tabs') ? 'tablist' : 'radiogroup');
    s.setAttribute('role', role);
    var attr = role === 'tablist' ? 'aria-selected' : 'aria-checked';
    var curI = 0;
    function sel(i, fire) {
      curI = i;
      btns.forEach(function (b, j) { b.setAttribute(attr, j === i ? 'true' : 'false'); b.tabIndex = j === i ? 0 : -1; });
      s.style.setProperty('--i', i);
      if (fire) { haptic('selection'); s.dispatchEvent(new CustomEvent('change', { bubbles: true, detail: { index: i, value: btns[i].value || btns[i].dataset.value || btns[i].textContent.trim() } })); }
    }
    var start = Math.max(0, btns.findIndex(function (b) { return b.getAttribute('aria-selected') === 'true' || b.getAttribute('aria-checked') === 'true'; }));
    btns.forEach(function (b, i) {
      if (!b.getAttribute('role')) b.setAttribute('role', role === 'tablist' ? 'tab' : 'radio');
      b.addEventListener('click', function () { if (i !== curI) sel(i, true); });
      b.addEventListener('keydown', function (e) {
        var k = e.key, n = null;
        if (k === 'ArrowRight' || k === 'ArrowDown') n = (i + 1) % btns.length;
        if (k === 'ArrowLeft' || k === 'ArrowUp') n = (i - 1 + btns.length) % btns.length;
        if (n !== null) { e.preventDefault(); sel(n, true); btns[n].focus(); }
      });
    });
    sel(start, false);
    s.setAttribute('data-ready', '');
  }
  function enhanceStepper(s) {
    var min = +(s.dataset.min || 0), max = +(s.dataset.max || 100), step = +(s.dataset.step || 1), val = +(s.dataset.value || min);
    var name = s.getAttribute('aria-label') || 'Value';
    s.setAttribute('role', 'group');
    s.innerHTML = '<button type="button" data-d="-1" aria-label="Decrease ' + esc(name) + '">' + icon('minus') + '</button><button type="button" data-d="1" aria-label="Increase ' + esc(name) + '">' + icon('plus') + '</button><output aria-live="polite"></output>';
    var out = s.querySelector('output'), shown = s.dataset.for ? doc.getElementById(s.dataset.for) : null;
    function set(v, fire) {
      val = Math.max(min, Math.min(max, v));
      s.dataset.value = val; out.textContent = name + ' ' + val; if (shown) shown.textContent = val;
      s.querySelector('[data-d="-1"]').disabled = val <= min; s.querySelector('[data-d="1"]').disabled = val >= max;
      if (fire) { haptic('selection'); s.dispatchEvent(new CustomEvent('change', { bubbles: true, detail: { value: val } })); }
    }
    $$('button', s).forEach(function (b) { b.addEventListener('click', function () { set(val + step * +b.dataset.d, true); }); });
    set(val, false);
    s.stepTo = function (v) { set(v, false); };
  }
  function enhanceSlider(r) {
    function p() { var mn = +r.min || 0, mx = r.max === '' ? 100 : +r.max; r.style.setProperty('--p', ((r.value - mn) / (mx - mn) * 100) + '%'); }
    var last = r.value;
    r.addEventListener('input', function () { p(); if ((r.value === r.min || r.value === r.max) && r.value !== last) haptic('light'); last = r.value; });
    p();
  }
  function enhanceSearch(f) {
    var input = f.querySelector('input'); if (!input) return;
    var clear = f.querySelector('.ios-search-clear'), cancel = f.querySelector('.ios-search-cancel');
    function sync() { if (clear) clear.hidden = !input.value; }
    input.addEventListener('input', sync);
    input.addEventListener('focus', function () { f.classList.add('is-active'); });
    input.addEventListener('blur', function () { if (!input.value) f.classList.remove('is-active'); });
    if (clear) clear.addEventListener('click', function () { input.value = ''; sync(); input.focus(); input.dispatchEvent(new Event('input', { bubbles: true })); });
    if (cancel) cancel.addEventListener('click', function () { input.value = ''; sync(); input.blur(); f.classList.remove('is-active'); input.dispatchEvent(new Event('input', { bubbles: true })); f.dispatchEvent(new CustomEvent('cancel', { bubbles: true })); });
    sync();
  }
  function enhanceSwipe(w) {
    var row = w.querySelector('.ios-row'), acts = w.querySelector('.ios-swipe-actions:not(.is-leading)');
    if (!row || !acts) return;
    var sx = 0, sy = 0, base = 0, x = 0, drag = false, decided = false, horiz = false, pid = null, suppress = false;
    function width() { return acts.offsetWidth; }
    function setX(v) { x = v; row.style.transform = v ? 'translateX(' + v + 'px)' : ''; w.classList.toggle('is-open', v < 0); }
    function closeOthers() { $$('.ios-swipe.is-open').forEach(function (o) { if (o !== w && o.__close) o.__close(); }); }
    w.__close = function () { setX(0); };
    row.addEventListener('pointerdown', function (e) { if (e.pointerType === 'mouse' && e.button !== 0) return; drag = true; decided = false; horiz = false; sx = e.clientX; sy = e.clientY; base = x; pid = e.pointerId; });
    row.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if (!decided) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        decided = true; horiz = Math.abs(dx) > Math.abs(dy);
        if (horiz) { try { row.setPointerCapture(pid); } catch (err) {} w.classList.add('is-dragging'); closeOthers(); }
      }
      if (!horiz) return;
      var v = Math.min(0, base + dx), wd = width();
      if (v < -wd) v = -wd + (v + wd) * .3;
      setX(v);
    });
    function end() {
      if (!drag) return; drag = false; w.classList.remove('is-dragging');
      if (horiz) {
        suppress = true;
        var open = x < -width() * .4;
        if (open && base === 0) haptic('light');
        setX(open ? -width() : 0);
      } else if (base !== 0) { suppress = true; setX(0); }   // tap on an open row closes it
    }
    row.addEventListener('pointerup', end); row.addEventListener('pointercancel', end);
    row.addEventListener('click', function (e) { if (suppress) { suppress = false; e.preventDefault(); e.stopPropagation(); } }, true);
    // Keyboard and VoiceOver: the actions are real buttons after the row; focusing one reveals them.
    w.addEventListener('focusin', function (e) { if (acts.contains(e.target)) setX(-width()); });
    w.addEventListener('focusout', function () { setTimeout(function () { if (!w.contains(doc.activeElement)) setX(0); }, 0); });
    $$('button', acts).forEach(function (b) { b.addEventListener('click', function () { haptic(b.classList.contains('is-destructive') ? 'warning' : 'light'); setX(0); }); });
  }
  function enhancePageControl(pc) {
    var n = +(pc.dataset.count || 3), cur = +(pc.dataset.current || 0), label = pc.getAttribute('aria-label') || 'Page';
    pc.setAttribute('role', 'group');
    pc.innerHTML = '';
    for (var i = 0; i < n; i++) pc.appendChild(el('<button type="button" aria-label="' + esc(label) + ' ' + (i + 1) + ' of ' + n + '"></button>'));
    var dots = $$('button', pc);
    function set(i, fire) {
      cur = (i + n) % n; pc.dataset.current = cur;
      dots.forEach(function (d, j) { if (j === cur) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current'); });
      if (fire) { haptic('selection'); pc.dispatchEvent(new CustomEvent('change', { bubbles: true, detail: { index: cur } })); }
    }
    dots.forEach(function (d, j) { d.onclick = function () { set(j, true); }; });
    pc.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') { set(cur + 1, true); dots[cur].focus(); } if (e.key === 'ArrowLeft') { set(cur - 1, true); dots[cur].focus(); } });
    pc.go = function (i) { set(i, false); };
    set(cur, false);
  }
  function enhance(ctx) {
    if (!isIOS) return;
    ctx = ctx || doc;
    $$('.ios-seg, .k-tabs', ctx).forEach(function (s) { if (!s.__k) { s.__k = 1; enhanceSeg(s); } });
    $$('.ios-stepper', ctx).forEach(function (s) { if (!s.__k) { s.__k = 1; enhanceStepper(s); } });
    $$('input[type="range"].ios-slider', ctx).forEach(function (s) { if (!s.__k) { s.__k = 1; enhanceSlider(s); } });
    $$('.ios-search', ctx).forEach(function (s) { if (!s.__k) { s.__k = 1; enhanceSearch(s); } });
    $$('.ios-swipe', ctx).forEach(function (s) { if (!s.__k) { s.__k = 1; enhanceSwipe(s); } });
    $$('.ios-pagecontrol', ctx).forEach(function (s) { if (!s.__k) { s.__k = 1; enhancePageControl(s); } });
    $$('.ios-switch input, .k-switch input', ctx).forEach(function (s) { if (!s.__k) { s.__k = 1; s.addEventListener('change', function () { haptic('light'); }); } });
  }

  // ------------------------------------------------------------------ init
  /** init(options) → KolamIOS when the iOS look is on, else null (the app stays on its web look).
   *  options: {
   *    appName, uaTokens: ['MyApp-iOS'], style: 'glass' | 'classic', force (bool),
   *    tint: '#hex' | { light, dark }  (default: the app's Kolam --primary family),
   *    navBar: { title, large, back, actions } | false, navMount,
   *    tabs: [{ id, label, icon, href, badge, role }], currentTab, onTabSelect(id),
   *    toolbar: [actions], content: '#app' (swipe-back target),
   *    swipeBack: true | handler, haptics: true, dynamicType: true, enhance: true }  */
  function init(o) {
    o = o || {};
    for (var k in o) opts[k] = o[k];
    if (!isIOS && (o.force || detect(o.uaTokens))) { isIOS = true; root.classList.add('k-ios'); }
    api.isIOS = isIOS;
    if (!isIOS) return null;
    root.classList.toggle('k-ios-classic', o.style === 'classic');
    if (o.tint) {
      var t = typeof o.tint === 'string' ? { light: o.tint, dark: o.tint } : o.tint;
      var st = doc.getElementById('kolam-ios-tint') || doc.head.appendChild(Object.assign(doc.createElement('style'), { id: 'kolam-ios-tint' }));
      st.textContent = 'html.k-ios{--ios-tint:' + t.light + ';--ios-tint-fill:' + t.light + ';--ios-on-tint:' + (t.onLight || '#fff') + '}' +
        '@media (prefers-color-scheme: dark){html.k-ios:not([data-theme="light"]):not([data-theme="contrast"]){--ios-tint:' + (t.dark || t.light) + ';--ios-tint-fill:' + (t.dark || t.light) + ';--ios-on-tint:' + (t.onDark || '#000') + '}}' +
        'html.k-ios[data-theme="dark"]{--ios-tint:' + (t.dark || t.light) + ';--ios-tint-fill:' + (t.dark || t.light) + ';--ios-on-tint:' + (t.onDark || '#000') + '}';
    }
    if (o.dynamicType !== false) applyDynamicType();
    if (o.navBar) setNavBar(o.navBar);
    if (o.tabs) buildTabBar(o.tabs, { current: o.currentTab, onSelect: o.onTabSelect });
    if (o.toolbar) buildToolbar(o.toolbar);
    if (o.swipeBack) onSwipeBack(typeof o.swipeBack === 'function' ? o.swipeBack : function () { if (global.history.length < 2) return false; global.history.back(); });
    if (o.enhance !== false) enhance();
    doc.dispatchEvent(new CustomEvent('kolam-ios:ready', { detail: { style: o.style || 'glass' } }));
    return api;
  }

  var api = {
    version: '1.0.0',
    isIOS: isIOS,
    detect: detect,
    init: init,
    navBar: { set: setNavBar, get el() { return nav.el; } },
    tabBar: { build: buildTabBar, select: selectTab, badge: setBadge, get el() { return tabs.el; } },
    toolbar: buildToolbar,
    sheet: sheet,
    alert: alert,
    actionSheet: actionSheet,
    menu: menu,
    onSwipeBack: onSwipeBack,
    haptic: haptic,
    enhance: enhance,
    icon: icon,
    icons: Object.keys(P),
    dynamicType: applyDynamicType
  };
  global.KolamIOS = api;
})(window);
