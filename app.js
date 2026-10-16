(function () {
  "use strict";
  var reduz = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- contagem regressiva ---------- */
  var cd = $("#countdown b");
  if (cd) {
    var dias = Math.ceil((new Date(2027, 2, 1) - new Date()) / 864e5);
    cd.textContent = dias > 0 ? dias : "0";
    if (dias <= 0) $("#countdown span").textContent = "a viagem começou!";
  }

  /* ---------- capa: título por trás das montanhas ---------- */
  var stage = $("#heroStage"), title = $("#heroTitle"), fg = $(".hero-fg"), bg = $(".hero-bg");
  var IW = 1024, IH = 704, ridge = null;

  function lerCrista() {
    // primeira linha opaca de cada coluna do recorte das montanhas
    try {
      var c = document.createElement("canvas");
      c.width = IW; c.height = IH;
      var x = c.getContext("2d");
      x.drawImage(fg, 0, 0, IW, IH);
      var d = x.getImageData(0, 0, IW, IH).data;
      ridge = new Array(IW);
      for (var col = 0; col < IW; col++) {
        var y = 0;
        while (y < IH && d[(y * IW + col) * 4 + 3] < 128) y++;
        ridge[col] = y;
      }
    } catch (err) { ridge = null; }
  }

  function posicionarTitulo() {
    if (!stage || !title) return;
    var W = stage.clientWidth, H = stage.clientHeight;
    var s = Math.max(W / IW, H / IH);
    var ox = (W - IW * s) / 2;
    var f2 = Math.min(W * (W < 640 ? 0.2 : 0.185), s * 230);
    var f1 = Math.max(22, f2 * 0.26);
    title.style.setProperty("--f2", f2 + "px");
    title.style.setProperty("--f1", f1 + "px");
    // crista média sob a palavra AUSTRAL (largura ~ 4.4 em)
    var meio = W / 2, larg = f2 * 4.4 / 2, ys = [];
    if (ridge) {
      for (var px = meio - larg; px <= meio + larg; px += 4) {
        var ix = Math.round((px - ox) / s);
        if (ix >= 0 && ix < IW) ys.push(ridge[ix]);
      }
      ys.sort(function (a, b) { return a - b; });
    }
    var crista = (ys.length ? ys[Math.floor(ys.length * (W < 640 ? 0.08 : 0.3))] : 215) * s;
    // a palavra fica com ~40% escondida atrás da montanha
    var topoT2 = crista - f2 * 0.6;
    title.style.setProperty("--ty", (topoT2 - f1 * 1.25) + "px");
  }
  if (fg) {
    var pronto = function () { lerCrista(); posicionarTitulo(); };
    if (fg.complete && fg.naturalWidth) pronto(); else fg.addEventListener("load", pronto);
    posicionarTitulo();
    window.addEventListener("resize", posicionarTitulo);
  }

  /* ---------- revelar ao rolar ---------- */
  $$(".w").forEach(function (w) {
    var irmaos = w.parentNode.querySelectorAll(".w");
    w.style.setProperty("--i", Array.prototype.indexOf.call(irmaos, w));
  });
  function contar(el) {
    var alvo = +el.dataset.count, pre = el.dataset.prefix || "", suf = el.dataset.suffix || "", t0 = null, dur = 1800;
    var fmt = function (n) { return pre + n.toLocaleString("pt-BR") + suf; };
    if (reduz) { el.textContent = fmt(alvo); return; }
    function passo(t) {
      if (!t0) t0 = t;
      var p = Math.min(1, (t - t0) / dur);
      el.textContent = fmt(Math.round(alvo * (1 - Math.pow(1 - p, 4))));
      if (p < 1) requestAnimationFrame(passo);
    }
    requestAnimationFrame(passo);
  }
  var alvos = $$(".reveal, .alto, .title, .huge, .alto h3, [data-count]");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        el.classList.add("in");
        $$("[data-count]", el).forEach(contar);
        if (el.dataset.count) contar(el);
        io.unobserve(el);
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
    alvos.forEach(function (el) { io.observe(el); });
  } else {
    alvos.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- rolagem: parallax, nav, progresso ---------- */
  var nav = $("#nav"), prog = $("#progress"), hero = $(".hero");
  var paras = $$(".para-bg"), clip = $(".cliptext");
  var tick = false;
  function rolar() {
    tick = false;
    var y = window.scrollY, vh = window.innerHeight;
    var hh = hero ? hero.offsetHeight : vh;
    if (nav) nav.classList.toggle("show", y > hh * 0.85);
    if (prog) {
      var max = document.documentElement.scrollHeight - vh;
      prog.style.width = (max > 0 ? 100 * y / max : 0) + "vw";
    }
    if (reduz) return;
    if (y < hh) {
      if (bg) bg.style.translate = "0 " + (y * 0.45) + "px";
      if (fg) fg.style.translate = "0 " + (y * 0.12) + "px";
      if (title) { title.style.translate = "0 " + (y * 0.62) + "px"; title.style.opacity = 1 - y / (hh * 0.7); }
    }
    paras.forEach(function (p) {
      var r = p.parentNode.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      var k = +(p.dataset.speed || 0.25);
      p.style.transform = "translate3d(0," + ((r.top + r.height / 2 - vh / 2) * -k) + "px,0)";
    });
    if (clip) {
      var rc = clip.getBoundingClientRect();
      var pc = Math.min(1, Math.max(0, 1 - (rc.top + rc.height) / (vh + rc.height)));
      clip.style.setProperty("--bp", (15 + pc * 70) + "%");
    }
  }
  window.addEventListener("scroll", function () { if (!tick) { tick = true; requestAnimationFrame(rolar); } }, { passive: true });
  rolar();

  // link ativo no menu
  var links = $$("#navlinks a");
  if ("IntersectionObserver" in window && links.length) {
    var secObs = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) {
          var on = a.getAttribute("href") === "#" + en.target.id;
          a.classList.toggle("on", on);
          if (on && a.scrollIntoView && window.innerWidth < 900) a.parentNode.scrollTo({ left: a.offsetLeft - 40, behavior: "smooth" });
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    links.forEach(function (a) { var s = $(a.getAttribute("href")); if (s) secObs.observe(s); });
  }

  /* ---------- carrossel das estradas ---------- */
  var roads = $("#roads");
  if (roads) {
    var passo = function () { var c = $(".road", roads); return c ? c.offsetWidth + 22 : 400; };
    $("#rPrev").addEventListener("click", function () { roads.scrollBy({ left: -passo(), behavior: "smooth" }); });
    $("#rNext").addEventListener("click", function () { roads.scrollBy({ left: passo(), behavior: "smooth" }); });
    var arrastando = false, x0 = 0, s0 = 0, moveu = false;
    roads.addEventListener("pointerdown", function (ev) {
      if (ev.pointerType !== "mouse") return;
      arrastando = true; moveu = false; x0 = ev.clientX; s0 = roads.scrollLeft;
    });
    window.addEventListener("pointermove", function (ev) {
      if (!arrastando) return;
      var dx = ev.clientX - x0;
      if (Math.abs(dx) > 5) { moveu = true; roads.classList.add("drag"); }
      roads.scrollLeft = s0 - dx;
    });
    window.addEventListener("pointerup", function () {
      if (!arrastando) return;
      arrastando = false; roads.classList.remove("drag");
    });
    roads.addEventListener("click", function (ev) { if (moveu) { ev.preventDefault(); moveu = false; } }, true);
  }

  /* ---------- lightbox ---------- */
  var lb = $("#lb");
  if (lb) {
    var lbImg = $("img", lb), lbCap = $("p", lb), origem = null;
    var fechar = function () { lb.hidden = true; document.body.style.overflow = ""; if (origem) origem.focus(); };
    $$(".zoom").forEach(function (b) {
      b.addEventListener("click", function () {
        origem = b;
        lbImg.src = b.dataset.src; lbImg.alt = b.dataset.cap; lbCap.textContent = b.dataset.cap;
        lb.hidden = false; document.body.style.overflow = "hidden";
        $(".lb-close", lb).focus();
      });
    });
    lb.addEventListener("click", function (ev) { if (ev.target !== lbImg) fechar(); });
    document.addEventListener("keydown", function (ev) { if (ev.key === "Escape" && !lb.hidden) fechar(); });
  }

  /* ---------- mapa ---------- */
  var R = window.ROTA, mapEl = $("#map");
  if (!R || !mapEl || !window.L) return;
  var L = window.L;
  var map = L.map(mapEl, { scrollWheelZoom: false, dragging: !L.Browser.mobile, tap: false });
  var mapa = L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
    maxZoom: 18, subdomains: "abcd",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
  });
  var sat = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 18, attribution: "Imagens &copy; Esri, Maxar, Earthstar Geographics"
  });
  sat.addTo(map);
  L.control.layers({ "Satélite": sat, "Mapa": mapa }, null, { position: "topright" }).addTo(map);

  var cor = { A: "#0e3b4f", R: "#c8893a" };
  var todas = [];
  R.rota.forEach(function (l) {
    L.polyline(l.coords, { color: "#fff", weight: 8, opacity: 0.55 }).addTo(map);
    L.polyline(l.coords, { color: cor[l.piso] || "#0e3b4f", weight: 4.5, opacity: 0.95 }).addTo(map);
    todas = todas.concat(l.coords);
  });
  L.polyline(R.ferry, { color: "#fff", weight: 7, opacity: 0.5 }).addTo(map);
  L.polyline(R.ferry, { color: "#1a9aa0", weight: 4, dashArray: "8 8" }).addTo(map);
  var limites = L.latLngBounds(todas);
  map.fitBounds(limites, { padding: [30, 30] });

  var pins = R.pontos.map(function (p) {
    var ic = L.divIcon({ className: "", html: "<div class='pin'>" + p.n + "</div>", iconSize: [30, 30], iconAnchor: [15, 15] });
    var m = L.marker([p.lat, p.lon], { icon: ic, title: p.nome }).addTo(map);
    m.bindPopup("<div class='pop'><img src='img/" + p.img + ".jpg' alt=''><div><i>" + p.meta + "</i><b>" + p.nome + "</b><p>" + p.desc + "</p></div></div>", { maxWidth: 260, minWidth: 260 });
    return m;
  });

  // percurso animado na ordem da viagem (balsa depois do 2º trecho)
  var caminho = [];
  R.rota.forEach(function (l, i) {
    caminho = caminho.concat(l.coords);
    if (i === 1) caminho = caminho.concat([R.ferry[0], R.ferry[1]]);
  });
  var dist = [0];
  for (var i = 1; i < caminho.length; i++) {
    var a = caminho[i - 1], b = caminho[i];
    dist.push(dist[i - 1] + Math.hypot(a[0] - b[0], (a[1] - b[1]) * 0.7));
  }
  var total = dist[dist.length - 1];
  var marcosPin = R.pontos.map(function (p) {
    var best = 0, bd = 1e9;
    caminho.forEach(function (c, j) { var d = Math.hypot(c[0] - p.lat, c[1] - p.lon); if (d < bd) { bd = d; best = j; } });
    return dist[best] / total;
  });
  var btn = $("#playRoute"), rodando = false;
  btn.addEventListener("click", function () {
    if (rodando) return;
    rodando = true;
    btn.textContent = "Percorrendo…";
    map.closePopup();
    map.fitBounds(limites, { padding: [30, 30] });
    var trilha = L.polyline([], { color: "#fff", weight: 3, opacity: 1 }).addTo(map);
    var carro = L.marker(caminho[0], { icon: L.divIcon({ className: "", html: "<div class='car'>🚙</div>", iconSize: [26, 26], iconAnchor: [13, 13] }), interactive: false, zIndexOffset: 1000 }).addTo(map);
    var dur = reduz ? 1 : 16000, t0 = null, j = 0;
    pins.forEach(function (m) { var el = m.getElement(); if (el) el.firstChild.classList.remove("hot"); });
    function quadro(t) {
      if (!t0) t0 = t;
      var p = Math.min(1, (t - t0) / dur), alvo = p * total;
      while (j < caminho.length - 1 && dist[j + 1] <= alvo) { trilha.addLatLng(caminho[j + 1]); j++; }
      var seg = dist[j + 1] - dist[j] || 1, f = j < caminho.length - 1 ? (alvo - dist[j]) / seg : 0;
      var a = caminho[j], b = caminho[Math.min(j + 1, caminho.length - 1)];
      carro.setLatLng([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
      marcosPin.forEach(function (mp, k) { if (p >= mp) { var el = pins[k].getElement(); if (el) el.firstChild.classList.add("hot"); } });
      if (p < 1) requestAnimationFrame(quadro);
      else {
        setTimeout(function () { map.removeLayer(carro); map.removeLayer(trilha); rodando = false; btn.textContent = "▶ Percorrer de novo"; }, 1500);
      }
    }
    requestAnimationFrame(quadro);
  });
})();
