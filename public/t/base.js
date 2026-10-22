/* base.js — util bersama untuk semua template prank.
   Data link datang dari window.__SHORT__ (disuntik Function) atau ?q=BASE64 (link lama). */
(function () {
  'use strict';

  function b64decode(str) {
    try { return decodeURIComponent(escape(atob(str.replace(/-/g, '+').replace(/_/g, '/')))); }
    catch (e) { return str; }
  }
  function rawParam(name) {
    var m = new RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
    return m ? decodeURIComponent(m[1]) : null;
  }
  function queryParam(name) {
    var v = rawParam(name);
    return v ? b64decode(v) : null;
  }

  var S = window.__SHORT__ || {};

  // Untuk link panjang ?q= (tanpa injeksi), tebak template dari path.
  // Bisa berupa /t/force.html atau /t/force (Cloudflare memangkas .html via 308).
  var tplFromPath = 'google';
  var leaf = location.pathname.split('/').pop().replace(/\.html$/, '');
  if (leaf === 'captcha') tplFromPath = 'captcha';
  else if (leaf === 'receipt') tplFromPath = 'receipt';
  else if (leaf === 'force') tplFromPath = 'force';

  var DEST_URL = {
    google:   function (q) { return 'https://www.google.com/search?q=' + encodeURIComponent(q); },
    aimode:   function (q) { return 'https://www.google.com/search?udm=50&q=' + encodeURIComponent(q); },
    youtube:  function (q) { return 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q); },
    pinterest:function (q) { return 'https://www.pinterest.com/search/pins/?q=' + encodeURIComponent(q); }
  };
  var DEST_NAME = { google: 'Google Search', aimode: 'Google AI Mode', youtube: 'YouTube', pinterest: 'Pinterest' };

  var PRANK = {
    query:  (S.q || queryParam('q') || '').trim(),
    dest:   S.d || rawParam('d') || 'google',
    tpl:    S.t || rawParam('t') || tplFromPath,
    code:   S.code || null,
    home:   '../',
    destURL: function (d, q) { return (DEST_URL[d] || DEST_URL.google)(q); },
    destName: function (d) { return DEST_NAME[d] || 'Google Search'; }
  };
  window.PRANK = PRANK;

  // tanpa query -> kembalikan ke generator
  if (!PRANK.query) { window.location.replace('../'); }

  // ===== helper =====
  window.$ = function (id) { return document.getElementById(id); };
  window.sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  window.escapeHtml = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  // ===== typing dengan typo + backspace (mirip mesin di homepage) =====
  var NEIGHBORS = {
    q: 'wa', w: 'qeas', e: 'wrsd', r: 'etdf', t: 'ryfg', y: 'tugh', u: 'yihj', i: 'uojk',
    o: 'ipkl', p: 'ol', a: 'qsz', s: 'awdxze', d: 'serfcx', f: 'drtgvc', g: 'ftyhbv',
    h: 'gyujnb', j: 'huikmn', k: 'jiolm', l: 'kop', z: 'asx', x: 'zsdc', c: 'xdfv',
    v: 'cfgb', b: 'vghn', n: 'bhjm', m: 'njk'
  };
  function wrongChar(ch) {
    var c = ch.toLowerCase();
    if (NEIGHBORS[c]) {
      var pool = NEIGHBORS[c];
      var pick = pool[Math.floor(Math.random() * pool.length)];
      return (ch === ch.toUpperCase()) ? pick.toUpperCase() : pick;
    }
    return ch;
  }

  window.typeWithTypos = async function (text, onChar, opts) {
    opts = opts || {};
    var delay = opts.delay || 36;
    var maxTypos = text.length > 90 ? 2 : (text.length > 12 ? 2 : (text.length > 5 ? 1 : 0));
    var pos = [], tries = 0;
    for (var t = 0; t < maxTypos && tries < 40; t++) {
      tries++;
      var p = 4 + Math.floor(Math.random() * Math.max(1, text.length - 4));
      if (text[p] === ' ' || pos.indexOf(p) >= 0) { t--; continue; }
      pos.push(p);
    }
    pos.sort(function (a, b) { return a - b; });

    var typed = '';
    for (var i = 0; i < text.length; i++) {
      if (pos.indexOf(i) >= 0) {
        var w = wrongChar(text[i]);
        typed += w; onChar(w, typed, true);
        await sleep(delay + Math.random() * 45);
        await sleep(175 + Math.random() * 230);   // "sadar salah"
        typed = typed.slice(0, -1); onChar('\b', typed, false);
        await sleep(95);
        typed += text[i]; onChar(text[i], typed, false);
        await sleep(delay + Math.random() * 55);
      } else {
        typed += text[i]; onChar(text[i], typed, false);
        await sleep(delay + Math.random() * 45);
      }
    }
    return typed;
  };

  // ===== kartu toast kanan-bawah (dipakai semua template) =====
  window.showToast = function (html, opts) {
    opts = opts || {};
    var wrap = document.createElement('div');
    wrap.className = 'p-toast' + (opts.className ? ' ' + opts.className : '');
    wrap.innerHTML =
      '<div class="p-toast-ic">' + (opts.icon || '💡') + '</div>' +
      '<div class="p-toast-body">' + html + '</div>' +
      '<button class="p-toast-x" aria-label="Tutup">&times;</button>';
    document.body.appendChild(wrap);
    requestAnimationFrame(function () { wrap.classList.add('in'); });
    wrap.querySelector('.p-toast-x').addEventListener('click', function () {
      wrap.classList.remove('in');
      setTimeout(function () { wrap.remove(); }, 300);
    });
    return wrap;
  };
})();
