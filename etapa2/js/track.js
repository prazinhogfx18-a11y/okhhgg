(function () {
  var STORAGE_KEY = 'rdv_tracking';
  var VISITOR_KEY = 'rdv_vid';
  var SESSION_KEY = 'rdv_sid';
  var PARAMS = [
    'src',
    'sck',
    'utm_source',
    'utm_campaign',
    'utm_medium',
    'utm_content',
    'utm_term',
    'fbclid',
    'gclid',
  ];
  var HEARTBEAT_MS = 20000;
  var scrollMarks = { 25: false, 50: false, 75: false, 100: false };
  var lastPath = '';
  var pixQrSeen = false;
  var lastPixCopyAt = 0;

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function getVisitorId() {
    try {
      var id = localStorage.getItem(VISITOR_KEY);
      if (!id) {
        id = uuid();
        localStorage.setItem(VISITOR_KEY, id);
      }
      return id;
    } catch (e) {
      return uuid();
    }
  }

  function getSessionId() {
    try {
      var id = sessionStorage.getItem(SESSION_KEY);
      if (!id) {
        id = uuid();
        sessionStorage.setItem(SESSION_KEY, id);
      }
      return id;
    } catch (e) {
      return uuid();
    }
  }

  function getParamsFromUrl() {
    var search = new URLSearchParams(window.location.search);
    var found = {};
    var hasAny = false;
    PARAMS.forEach(function (key) {
      var val = search.get(key);
      if (val) {
        found[key] = val;
        hasAny = true;
      }
    });
    return hasAny ? found : null;
  }

  function loadStored() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch (e) {
      return {};
    }
  }

  function save(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      document.cookie =
        STORAGE_KEY +
        '=' +
        encodeURIComponent(JSON.stringify(data)) +
        ';path=/;max-age=' +
        60 * 60 * 24 * 30 +
        ';SameSite=Lax';
    } catch (e) {}
  }

  function appendToUrl(url) {
    var data = loadStored();
    try {
      var u = new URL(url, window.location.origin);
      if (data) {
        PARAMS.forEach(function (key) {
          if (data[key] && !u.searchParams.has(key)) {
            u.searchParams.set(key, data[key]);
          }
        });
      }
      var vid = getVisitorId();
      var sid = getSessionId();
      if (vid && !u.searchParams.has('visitor_id')) u.searchParams.set('visitor_id', vid);
      if (vid && !u.searchParams.has('rdv_visitor_id')) u.searchParams.set('rdv_visitor_id', vid);
      if (sid && !u.searchParams.has('session_id')) u.searchParams.set('session_id', sid);
      if (sid && !u.searchParams.has('rdv_session_id')) u.searchParams.set('rdv_session_id', sid);
      return u.toString();
    } catch (e) {
      return url;
    }
  }

  function ensureHiddenInput(form, name, value) {
    if (!form || !name || !value) return;
    var input = form.querySelector('input[name="' + name + '"]');
    if (!input) {
      input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      form.appendChild(input);
    }
    input.value = value;
  }

  function injectIdsIntoForm(form) {
    var vid = getVisitorId();
    var sid = getSessionId();
    ensureHiddenInput(form, 'visitor_id', vid);
    ensureHiddenInput(form, 'rdv_visitor_id', vid);
    ensureHiddenInput(form, 'session_id', sid);
    ensureHiddenInput(form, 'rdv_session_id', sid);
  }

  function getScriptEl() {
    return document.currentScript || document.querySelector('script[data-rdv-key]');
  }

  function getTrackingKey() {
    var script = getScriptEl();
    if (script && script.getAttribute('data-rdv-key')) {
      return script.getAttribute('data-rdv-key');
    }
    var m = document.querySelector('meta[name="rdv-tracking-key"]');
    return m ? m.getAttribute('content') : null;
  }

  function getApiBase() {
    var script = getScriptEl();
    if (script && script.getAttribute('data-rdv-api')) {
      return script.getAttribute('data-rdv-api').replace(/\/$/, '');
    }
    return '';
  }

  function detectDevice() {
    var ua = navigator.userAgent || '';
    if (/Mobi|Android|iPhone|iPad/i.test(ua)) return 'mobile';
    if (/Tablet|iPad/i.test(ua)) return 'tablet';
    return 'desktop';
  }

  function detectBrowser() {
    var ua = navigator.userAgent || '';
    if (/Edg\//.test(ua)) return 'Edge';
    if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) return 'Chrome';
    if (/Firefox\//.test(ua)) return 'Firefox';
    if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return 'Safari';
    return 'Other';
  }

  function pageHint() {
    var blob = (
      (window.location.pathname || '') +
      ' ' +
      (document.title || '') +
      ' ' +
      (document.body && document.body.innerText ? document.body.innerText.slice(0, 400) : '')
    ).toLowerCase();
    return {
      isPixPage: /pix|copia.?e.?cola|qr.?code|qrcode|pagamento|checkout|pedido/.test(blob),
      isCheckout: /checkout|pagamento|pedido|order|carrinho|buy/.test(blob),
    };
  }

  function looksLikePixCode(text) {
    if (!text) return false;
    var t = String(text).replace(/\s+/g, '').trim();
    if (t.length < 25) return false;
    if (/^000201/.test(t)) return true;
    if (t.length >= 40 && /^[0-9A-Za-z.]+$/.test(t)) return true;
    return false;
  }

  function elTextBlob(el) {
    if (!el) return '';
    return (
      (el.innerText || el.textContent || '') +
      ' ' +
      (el.getAttribute('aria-label') || '') +
      ' ' +
      (el.getAttribute('title') || '') +
      ' ' +
      (el.getAttribute('placeholder') || '') +
      ' ' +
      (el.id || '') +
      ' ' +
      (typeof el.className === 'string' ? el.className : '') +
      ' ' +
      (el.getAttribute('name') || '') +
      ' ' +
      (el.getAttribute('data-testid') || '')
    ).toLowerCase();
  }

  function isPixRelated(el) {
    return /pix|copiar|copia|copy|qr.?code|qrcode|clipboard|cola/.test(elTextBlob(el));
  }

  function cssPath(el) {
    if (!el || !el.tagName) return '';
    var parts = [];
    var cur = el;
    var depth = 0;
    while (cur && cur.nodeType === 1 && depth < 4) {
      var part = cur.tagName.toLowerCase();
      if (cur.id) {
        part += '#' + cur.id;
        parts.unshift(part);
        break;
      }
      if (cur.className && typeof cur.className === 'string') {
        var cls = cur.className.trim().split(/\s+/).slice(0, 2).join('.');
        if (cls) part += '.' + cls;
      }
      parts.unshift(part);
      cur = cur.parentElement;
      depth++;
    }
    return parts.join(' > ');
  }

  function elementLabel(el) {
    if (!el || !el.tagName) return null;
    var tag = el.tagName.toLowerCase();
    var text = (el.innerText || el.textContent || el.getAttribute('aria-label') || el.getAttribute('name') || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 80);
    var href = el.getAttribute && el.getAttribute('href');
    var parts = [tag];
    if (el.id) parts.push('#' + el.id);
    if (text) parts.push('"' + text + '"');
    if (href) parts.push('→ ' + href.slice(0, 120));
    var path = cssPath(el);
    if (path) parts.push('[' + path + ']');
    return parts.join(' ');
  }

  function sendEvent(eventType, extra) {
    var key = getTrackingKey();
    var api = getApiBase();
    if (!key || !api) return;

    var data = loadStored();
    extra = extra || {};
    var hint = pageHint();
    var meta = extra.meta || {};
    if (typeof meta !== 'object' || meta === null) meta = { value: meta };
    meta.pageHint = hint.isPixPage ? 'pix' : hint.isCheckout ? 'checkout' : 'other';

    var payload = {
      key: key,
      eventType: eventType,
      pageUrl: window.location.href,
      pagePath: window.location.pathname + window.location.search,
      pageTitle: document.title || null,
      sessionId: getSessionId(),
      visitorId: getVisitorId(),
      referrer: document.referrer || null,
      utm_source: data.utm_source || null,
      utm_campaign: data.utm_campaign || null,
      utm_medium: data.utm_medium || null,
      utm_content: data.utm_content || null,
      utm_term: data.utm_term || null,
      src: data.src || null,
      sck: data.sck || null,
      fbclid: data.fbclid || null,
      gclid: data.gclid || null,
      device: detectDevice(),
      browser: detectBrowser(),
      screen: window.screen && window.screen.width ? window.screen.width + 'x' + window.screen.height : null,
      language: navigator.language || null,
      element: extra.element || null,
      scrollPct: typeof extra.scrollPct === 'number' ? extra.scrollPct : null,
      meta: meta,
    };

    var body = JSON.stringify(payload);
    try {
      if (navigator.sendBeacon && (eventType === 'heartbeat' || eventType === 'pagehide')) {
        var blob = new Blob([body], { type: 'application/json' });
        navigator.sendBeacon(api + '/track/event', blob);
        return;
      }
    } catch (e) {}

    fetch(api + '/track/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body,
      keepalive: true,
      mode: 'cors',
      credentials: 'omit',
    }).catch(function () {});
  }

  function trackPixCopy(method, length) {
    var now = Date.now();
    if (now - lastPixCopyAt < 1500) return;
    lastPixCopyAt = now;
    sendEvent('pix_copy', {
      element: 'PIX copia e cola',
      meta: { method: method || 'unknown', length: length || null },
    });
  }

  function trackPageview() {
    var path = window.location.pathname + window.location.search;
    if (path === lastPath) return;
    lastPath = path;
    scrollMarks = { 25: false, 50: false, 75: false, 100: false };
    pixQrSeen = false;
    var hint = pageHint();
    sendEvent('pageview', {
      meta: { isPixPage: hint.isPixPage, isCheckout: hint.isCheckout },
    });
    if (hint.isPixPage || hint.isCheckout) {
      sendEvent(hint.isPixPage ? 'pix_page_view' : 'checkout_view');
    }
    setTimeout(scanPixUi, 800);
  }

  function onScroll() {
    var doc = document.documentElement;
    var body = document.body;
    var scrollTop = window.pageYOffset || doc.scrollTop || body.scrollTop || 0;
    var height = Math.max(doc.scrollHeight, body.scrollHeight) - window.innerHeight;
    if (height <= 0) return;
    var pct = Math.min(100, Math.round((scrollTop / height) * 100));
    [25, 50, 75, 100].forEach(function (mark) {
      if (pct >= mark && !scrollMarks[mark]) {
        scrollMarks[mark] = true;
        sendEvent('scroll', { scrollPct: mark, meta: { depth: mark } });
      }
    });
  }

  function wireLinksAndForms() {
    document.querySelectorAll('a[href]').forEach(function (el) {
      if (el.getAttribute('data-rdv-wired')) return;
      el.setAttribute('data-rdv-wired', '1');
      var href = el.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
      if (href.indexOf('http') === 0 && href.indexOf(window.location.host) === -1) return;
      try {
        el.setAttribute('href', appendToUrl(href));
      } catch (e) {}
    });

    document.querySelectorAll('form').forEach(function (form) {
      if (form.getAttribute('data-rdv-wired')) return;
      form.setAttribute('data-rdv-wired', '1');
      injectIdsIntoForm(form);
      var action = form.getAttribute('action');
      if (action) {
        try {
          form.setAttribute('action', appendToUrl(action));
        } catch (e) {}
      }
      form.addEventListener(
        'submit',
        function () {
          injectIdsIntoForm(form);
          sendEvent('form_submit', {
            element: elementLabel(form),
            meta: {
              formId: form.id || null,
              formName: form.getAttribute('name') || null,
              action: form.getAttribute('action') || null,
            },
          });
        },
        true
      );
    });
  }

  function onClick(e) {
    var el = e.target;
    if (!el) return;
    var interactive = el.closest
      ? el.closest('a,button,input[type="submit"],input[type="button"],[role="button"],[onclick]')
      : el;
    if (!interactive) interactive = el;

    if (isPixRelated(interactive) || isPixRelated(el)) {
      sendEvent('pix_cta_click', {
        element: elementLabel(interactive),
        meta: { action: 'pix_related_click' },
      });
      // Muitos checkouts copiam no clique; marca intenção
      setTimeout(function () {
        try {
          var sel = window.getSelection && window.getSelection().toString();
          if (looksLikePixCode(sel)) trackPixCopy('click_selection', sel.length);
        } catch (err) {}
      }, 300);
      return;
    }

    if (
      interactive.matches &&
      interactive.matches('a,button,input[type="submit"],input[type="button"],[role="button"]')
    ) {
      sendEvent('click', {
        element: elementLabel(interactive),
        meta: { tag: interactive.tagName ? interactive.tagName.toLowerCase() : null },
      });
    }
  }

  function onCopy() {
    try {
      var sel = window.getSelection && window.getSelection().toString();
      if (looksLikePixCode(sel)) {
        trackPixCopy('copy_event', sel.length);
      } else if (sel && sel.length > 8) {
        sendEvent('copy', {
          meta: { length: sel.length, pixLike: false },
        });
      }
    } catch (e) {}
  }

  function patchClipboard() {
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) return;
      var orig = navigator.clipboard.writeText.bind(navigator.clipboard);
      navigator.clipboard.writeText = function (text) {
        try {
          if (looksLikePixCode(text)) trackPixCopy('clipboard_api', String(text).length);
          else
            sendEvent('copy', {
              meta: { method: 'clipboard_api', length: String(text || '').length },
            });
        } catch (e) {}
        return orig(text);
      };
    } catch (e) {}
  }

  function onFocusIn(e) {
    var el = e.target;
    if (!el || !el.tagName) return;
    var tag = el.tagName.toLowerCase();
    if (tag !== 'input' && tag !== 'textarea' && tag !== 'select') return;
    var type = (el.getAttribute('type') || 'text').toLowerCase();
    if (type === 'password' || type === 'hidden') return;
    var name = el.getAttribute('name') || el.id || type;
    var pix = isPixRelated(el) || looksLikePixCode(el.value);
    sendEvent(pix ? 'pix_field_focus' : 'field_focus', {
      element: elementLabel(el),
      meta: { field: String(name).slice(0, 80), type: type },
    });
  }

  function scanPixUi() {
    try {
      var nodes = document.querySelectorAll('img,canvas,svg,code,pre,textarea,input,[class],[id]');
      for (var i = 0; i < Math.min(nodes.length, 120); i++) {
        var n = nodes[i];
        if (!isPixRelated(n) && !/qr|pix/i.test(elTextBlob(n))) continue;
        if (n.tagName === 'IMG' || n.tagName === 'CANVAS' || n.tagName === 'SVG') {
          if (!pixQrSeen) {
            pixQrSeen = true;
            sendEvent('pix_qr_view', { element: elementLabel(n) });
          }
        }
        if ((n.tagName === 'INPUT' || n.tagName === 'TEXTAREA') && looksLikePixCode(n.value)) {
          // campo com código PIX visível
          sendEvent('pix_code_visible', {
            element: elementLabel(n),
            meta: { length: String(n.value).length },
          });
        }
      }
    } catch (e) {}
  }

  function patchHistory() {
    var push = history.pushState;
    var replace = history.replaceState;
    history.pushState = function () {
      var r = push.apply(this, arguments);
      setTimeout(trackPageview, 0);
      return r;
    };
    history.replaceState = function () {
      var r = replace.apply(this, arguments);
      setTimeout(trackPageview, 0);
      return r;
    };
    window.addEventListener('popstate', function () {
      setTimeout(trackPageview, 0);
    });
  }

  var fromUrl = getParamsFromUrl();
  if (fromUrl) {
    var merged = Object.assign({}, loadStored(), fromUrl);
    save(merged);
  }

  trackPageview();
  patchHistory();
  patchClipboard();

  document.addEventListener('click', onClick, true);
  document.addEventListener('copy', onCopy, true);
  document.addEventListener('focusin', onFocusIn, true);
  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
      sendEvent('visibility_hidden');
    } else {
      sendEvent('heartbeat');
      scanPixUi();
    }
  });
  window.addEventListener('pagehide', function () {
    sendEvent('pagehide');
  });

  setInterval(function () {
    if (document.visibilityState === 'visible') {
      sendEvent('heartbeat');
    }
  }, HEARTBEAT_MS);

  setInterval(scanPixUi, 5000);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      wireLinksAndForms();
      scanPixUi();
    });
  } else {
    wireLinksAndForms();
    scanPixUi();
  }

  setInterval(wireLinksAndForms, 3000);

  window.RDVTracking = {
    get: loadStored,
    appendToUrl: appendToUrl,
    track: sendEvent,
    trackPixCopy: function () {
      trackPixCopy('manual', null);
    },
    getVisitorId: getVisitorId,
    getSessionId: getSessionId,
  };
})();
