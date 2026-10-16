(function () {
  "use strict";
  var reduz = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- roteiro escolhido ---------- */
  var ROTAS = window.ROTAS || {}, IDS = Object.keys(ROTAS);
  var rotaAtual = function () { return document.body.dataset.rota; };
  function aplicarRota(id) {
    if (!ROTAS[id]) id = IDS[0];
    document.body.dataset.rota = id;
    try { localStorage.setItem("ca-rota", id); } catch (err) {}
    try { var u = new URL(location.href); u.searchParams.set("rota", id); history.replaceState(null, "", u); } catch (err) {}
    $$(".rota-nome").forEach(function (el) { el.textContent = ROTAS[id].nome; });
    var sel = $("#navRota"); if (sel) sel.value = id;
    $$(".rcard").forEach(function (b) { var on = b.dataset.setRota === id; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
    return id;
  }
  function setRota(id) {
    if (id === rotaAtual()) return;
    id = aplicarRota(id);
    document.dispatchEvent(new CustomEvent("rota", { detail: id }));
    window.dispatchEvent(new Event("scroll"));
  }
  (function () {
    var q = null;
    try { q = new URLSearchParams(location.search).get("rota") || localStorage.getItem("ca-rota"); } catch (err) {}
    aplicarRota(ROTAS[q] ? q : rotaAtual());
  })();
  $$(".rcard").forEach(function (b) {
    b.addEventListener("click", function () {
      setRota(b.dataset.setRota);
      var alvo = $("#numeros");
      if (alvo) alvo.scrollIntoView({ behavior: reduz ? "auto" : "smooth" });
    });
  });
  if ($("#navRota")) $("#navRota").addEventListener("change", function () { setRota(this.value); });

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
  var paras = $$(".para-bg"), clips = $$(".cliptext");
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
      if (!r.height || r.bottom < 0 || r.top > vh) return;
      var k = +(p.dataset.speed || 0.25);
      p.style.transform = "translate3d(0," + ((r.top + r.height / 2 - vh / 2) * -k) + "px,0)";
    });
    clips.forEach(function (clip) {
      if (!clip.offsetParent) return;
      var rc = clip.getBoundingClientRect();
      var pc = Math.min(1, Math.max(0, 1 - (rc.top + rc.height) / (vh + rc.height)));
      clip.style.setProperty("--bp", (15 + pc * 70) + "%");
    });
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

  /* ---------- carrossel das estradas (um por roteiro) ---------- */
  $$(".roads").forEach(function (roads) {
    var w = roads.closest(".roads-wrap");
    var passo = function () { var c = $(".road", roads); return c ? c.offsetWidth + 22 : 400; };
    $(".rPrev", w).addEventListener("click", function () { roads.scrollBy({ left: -passo(), behavior: "smooth" }); });
    $(".rNext", w).addEventListener("click", function () { roads.scrollBy({ left: passo(), behavior: "smooth" }); });
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
  });

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

  /* ---------- carros: abas, comparativo ---------- */
  var ctabs = $$(".ctab"), cpanels = $$(".car-panel"), crows = $$(".cmp tbody tr");
  function mostrarCarro(i, rolar) {
    ctabs.forEach(function (b, k) { b.classList.toggle("on", k === i); b.setAttribute("aria-selected", k === i); });
    crows.forEach(function (r, k) { r.classList.toggle("on", k === i); });
    cpanels.forEach(function (p, k) {
      p.classList.toggle("on", k === i);
      p.classList.remove("lit");
      if (k === i) requestAnimationFrame(function () { requestAnimationFrame(function () { p.classList.add("lit"); }); });
    });
    if (ctabs[i] && ctabs[i].parentNode.scrollTo) ctabs[i].parentNode.scrollTo({ left: ctabs[i].offsetLeft - 20, behavior: "smooth" });
    if (rolar) { var st = $(".car-tabs"); if (st) st.scrollIntoView({ behavior: "smooth", block: "start" }); }
  }
  ctabs.forEach(function (b, k) { b.addEventListener("click", function () { mostrarCarro(k); }); });
  crows.forEach(function (r, k) { r.addEventListener("click", function () { mostrarCarro(k, true); }); });
  var stage = $(".car-stage");
  if (stage && "IntersectionObserver" in window) {
    new IntersectionObserver(function (en, ob) { if (en[0].isIntersecting) { mostrarCarro(0); ob.disconnect(); } }, { threshold: 0.2 }).observe(stage);
  } else if (cpanels[0]) cpanels[0].classList.add("lit");

  /* ---------- hospedagem: cidades e soma (escolhas guardadas por roteiro) ---------- */
  var escolhasR = {};
  try { escolhasR = JSON.parse(localStorage.getItem("ca-hosp2") || "{}") || {}; } catch (err) { escolhasR = {}; }
  try { var velho = JSON.parse(localStorage.getItem("ca-hosp") || "null"); if (velho && !escolhasR.anel) escolhasR.anel = velho; } catch (err) {}
  var somaHosp = {};
  $$(".stay-wrap").forEach(function (w) {
    var rid = w.dataset.route, ssteps = $$(".sstep", w), spanels = $$(".stay-panel", w);
    var escolhas = escolhasR[rid] = escolhasR[rid] || {};
    function mostrarCidade(i) {
      ssteps.forEach(function (b, k) { b.classList.toggle("on", k === i); b.classList.toggle("done", k < i); b.setAttribute("aria-selected", k === i); });
      spanels.forEach(function (p, k) { p.classList.toggle("on", k === i); });
      if (ssteps[i] && w.offsetParent) ssteps[i].parentNode.scrollTo({ left: ssteps[i].offsetLeft - 40, behavior: "smooth" });
    }
    ssteps.forEach(function (b, k) { b.addEventListener("click", function () { mostrarCidade(k); }); });
    spanels.forEach(function (p, k) {
      if (!(k in escolhas)) {
        var rec = $$(".pick", p).filter(function (b) { return b.closest(".stay").classList.contains("rec"); })[0];
        if (rec) escolhas[k] = +rec.dataset.opt;
      }
    });
    var totEl = $(".ssTotal", w), listEl = $(".ss-list", w);
    function somar(anim) {
      var tot = 0, chips = [];
      spanels.forEach(function (p, k) {
        $$(".pick", p).forEach(function (b) {
          var on = escolhas[k] === +b.dataset.opt;
          b.setAttribute("aria-pressed", on);
          b.textContent = on ? "Escolhida" : "Escolher";
          b.closest(".stay").classList.toggle("picked", on);
          if (on) { tot += +b.dataset.pp; chips.push("<span><b>" + p.dataset.cidade + "</b> " + b.dataset.nome + "</span>"); }
        });
      });
      if (totEl) {
        totEl.textContent = "R$ " + Math.round(tot).toLocaleString("pt-BR");
        if (anim) { totEl.classList.remove("bump"); void totEl.offsetWidth; totEl.classList.add("bump"); }
      }
      if (listEl) listEl.innerHTML = chips.join("");
      somaHosp[rid] = tot;
      if (rid === rotaAtual()) { window.hospPP = tot; document.dispatchEvent(new Event("hosp")); }
    }
    $$(".pick", w).forEach(function (b) {
      b.addEventListener("click", function () {
        var c = +b.dataset.city, o = +b.dataset.opt;
        escolhas[c] = escolhas[c] === o ? null : o;
        try { localStorage.setItem("ca-hosp2", JSON.stringify(escolhasR)); } catch (err) {}
        somar(true);
        if (escolhas[c] === o && c < ssteps.length - 1) setTimeout(function () { mostrarCidade(c + 1); }, 650);
      });
    });
    if (spanels.length) { mostrarCidade(0); somar(false); }
  });
  window.hospPP = somaHosp[rotaAtual()] || 0;
  document.addEventListener("rota", function (ev) { window.hospPP = somaHosp[ev.detail] || 0; document.dispatchEvent(new Event("hosp")); });

  /* ---------- conversor CLP ⇄ R$ ---------- */
  var fmtR = function (v, dec) { return "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: dec || 0, maximumFractionDigits: dec || 0 }); };
  var soDig = function (s) { return +(String(s).replace(/\D/g, "")) || 0; };
  var brNum = function (s) { return +(String(s).replace(/\./g, "").replace(",", ".")) || 0; };
  var cvRate = $("#cvRate"), cvClp = $("#cvClp"), cvBrl = $("#cvBrl");
  var taxa = function () { return +(cvRate && cvRate.value) || 195; };
  function deClp() {
    var v = soDig(cvClp.value);
    cvClp.value = v ? v.toLocaleString("pt-BR") : "";
    cvBrl.value = v ? (v / taxa()).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";
  }
  function deBrl() {
    var v = brNum(cvBrl.value);
    cvClp.value = v ? Math.round(v * taxa()).toLocaleString("pt-BR") : "";
  }
  if (cvClp) {
    cvClp.addEventListener("input", deClp);
    cvBrl.addEventListener("input", deBrl);
    cvBrl.addEventListener("blur", function () { var v = brNum(cvBrl.value); if (v) cvBrl.value = v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); });
    cvRate.addEventListener("input", function () { deClp(); calcular(); });
    $("#cvSwap").addEventListener("click", function () { $("#conv").classList.toggle("rev"); });
    $$("#cvQuick button").forEach(function (b) { b.addEventListener("click", function () { cvClp.value = b.dataset.v; deClp(); }); });
    deClp();
  }
  var fab = $("#fxFab"), pop = $("#fxPop"), fxClp = $("#fxClp"), fxBrl = $("#fxBrl");
  if (fab) {
    var calcSec = $("#calculadora");
    window.addEventListener("scroll", function () { fab.classList.toggle("show", window.scrollY > window.innerHeight); }, { passive: true });
    fab.addEventListener("click", function () { pop.hidden = !pop.hidden; if (!pop.hidden) fxClp.focus(); });
    $("#fxClose").addEventListener("click", function () { pop.hidden = true; });
    fxClp.addEventListener("input", function () {
      var v = soDig(fxClp.value);
      fxClp.value = v ? v.toLocaleString("pt-BR") : "";
      fxBrl.textContent = fmtR(v / taxa(), 2);
    });
  }

  /* ---------- calculadora ---------- */
  var CD = $("#calcData") ? JSON.parse($("#calcData").textContent) : null;
  var salvo = {};
  try { salvo = JSON.parse(localStorage.getItem("ca-calc") || "{}") || {}; } catch (err) { salvo = {}; }
  var guardar = function () { try { localStorage.setItem("ca-calc", JSON.stringify(salvo)); } catch (err) {} };
  var num = function (id) { var el = $("#" + id); return el ? +el.value || 0 : 0; };
  var carSel = 0, ultimo = 0;
  var POR_ROTA = { cKm: 1, cBalsa: 1 };
  salvo.r = salvo.r || {};
  if (!salvo.r.anel && (salvo.cKm != null || salvo.p0 != null)) {
    // valores salvos antes de existirem vários roteiros
    var ra = salvo.r.anel = { p: {}, pv: {} };
    if (salvo.cKm != null) ra.cKm = salvo.cKm;
    if (salvo.cBalsa != null) ra.cBalsa = salvo.cBalsa;
    Object.keys(salvo).forEach(function (k) { var m = /^p(v?)(\d+)$/.exec(k); if (m) ra[m[1] ? "pv" : "p"][m[2]] = salvo[k]; });
  }
  var rs = function () { var id = rotaAtual(); return salvo.r[id] = salvo.r[id] || { p: {}, pv: {} }; };
  function rotaNaCalc() {
    var R0 = ROTAS[rotaAtual()], st = rs();
    if (!R0 || !$("#cKm")) return;
    $("#cKm").value = st.cKm != null ? st.cKm : R0.km;
    $("#cBalsa").value = st.cBalsa != null ? st.cBalsa : (R0.balsa ? 26290 : 0);
    st.p = st.p || {}; st.pv = st.pv || {};
    $("#cPas").innerHTML = R0.passeios.map(function (p, i) {
      var on = st.p[i] != null ? st.p[i] : i === 0;
      return "<div class='prow'><label class='chk'><input type='checkbox' data-p='" + i + "'" + (on ? " checked" : "") + "><span>" + p.nome + "</span></label>" +
        "<div class='inp sm'><em>R$</em><input type='number' inputmode='decimal' min='0' data-pv='" + i + "' placeholder='valor por pessoa' value='" + (st.pv[i] || "") + "'></div><small>" + p.preco + "</small></div>";
    }).join("");
  }
  if ($("#cPas")) {
    $("#cPas").addEventListener("input", function (ev) {
      var t = ev.target, st = rs();
      if (t.dataset.p != null) st.p[t.dataset.p] = t.checked;
      if (t.dataset.pv != null) st.pv[t.dataset.pv] = t.value;
      guardar(); calcular();
    });
    $("#cPas").addEventListener("change", function (ev) { if (ev.target.dataset.p != null) { rs().p[ev.target.dataset.p] = ev.target.checked; guardar(); calcular(); } });
  }
  function calcular() {
    if (!CD) return;
    var r = taxa(), P = Math.max(1, num("cPessoas")), dias = num("cDias");
    var car = CD.carros[carSel] || { comb: "gas" };
    var precoL = car.comb === "diesel" ? num("cDiesel") : num("cGas");
    var litros = num("cKm") * num("cCons") / 100;
    var aluguel = (num("cDiaria") + ($("#cVidro").checked ? 25000 : 0)) * dias / r / P;
    var comb = litros * precoL / r / P;
    var passeios = 0, nPas = 0, faltam = 0;
    $$("[data-p]").forEach(function (c) {
      if (!c.checked) return;
      nPas++;
      var v = +($("[data-pv='" + c.dataset.p + "']").value) || 0;
      if (!v) faltam++;
      passeios += v;
    });
    var outros = num("cBalsa") / r / P + num("cSeguro") + num("cChip") + num("cTransf") + num("cOutros");
    var cats = [
      ["Voo", num("cVoo"), "#5aa9e0"],
      ["Hospedagem", window.hospPP || 0, "#1a9aa0"],
      ["Aluguel do carro", aluguel, "#c8893a"],
      ["Combustível", comb, "#e0a95c", "~" + Math.round(litros) + " L de " + (car.comb === "diesel" ? "diesel" : "gasolina")],
      ["Comida", num("cComida") * dias, "#6aa86f"],
      ["Passeios", passeios, "#8d6cc4", nPas ? nPas + (nPas > 1 ? " passeios" : " passeio") + (faltam ? " · preencha " + faltam + " valor" + (faltam > 1 ? "es" : "") : "") : "nenhum marcado"],
      ["Outros gastos", outros, "#7d8f99", "balsa, seguro viagem, chip, transfer e extras"]
    ];
    var sub = cats.reduce(function (a, c) { return a + c[1]; }, 0);
    cats.push(["Reserva para imprevistos", sub * num("cReserva") / 100, "#b8c4ca", num("cReserva") + "%"]);
    var tot = cats.reduce(function (a, c) { return a + c[1]; }, 0);
    $("#cBar").innerHTML = cats.map(function (c) { return "<i style='flex:" + Math.max(c[1], 0.001) + ";background:" + c[2] + "' title='" + c[0] + "'></i>"; }).join("");
    var parc = salvo.parc || { "Voo": true, "Hospedagem": true }, vPar = 0;
    cats.forEach(function (c) { if (parc[c[0]]) vPar += c[1]; });
    $("#cList").innerHTML = cats.map(function (c) {
      var pz = !!parc[c[0]];
      return "<li class='" + (pz ? "pz" : "") + "'><span class='dot' style='background:" + c[2] + "'></span><div><b>" + c[0] + "</b>" + (c[3] ? "<small>" + c[3] + "</small>" : "") +
        "<button class='pay' data-c='" + c[0] + "'>" + (pz ? "parcelado" : "à vista") + "</button></div><em>" + fmtR(Math.round(c[1])) + "</em><s>" + (tot ? Math.round(100 * c[1] / tot) : 0) + "%</s></li>";
    }).join("");
    var nx = Math.max(1, Math.round(num("cParcelas")) || 1);
    $("#cVista").textContent = fmtR(Math.round(tot - vPar));
    $("#cParc").textContent = fmtR(Math.round(vPar));
    $("#cParcX").textContent = vPar ? nx + "x de " + fmtR(Math.round(vPar / nx)) + " por pessoa" : "nada parcelado";
    $("#cTotal2").textContent = "Para " + P + (P > 1 ? " pessoas: " : " pessoa: ") + fmtR(Math.round(tot * P)) + " · ≈ CLP " + Math.round(tot * r).toLocaleString("pt-BR") + " por pessoa";
    $("#cHosp").textContent = fmtR(Math.round(window.hospPP || 0));
    if ($("#cMini")) $("#cMini").textContent = fmtR(Math.round(tot));
    var el = $("#cTotal"), de = ultimo, ate = Math.round(tot), t0 = null;
    ultimo = ate;
    if (reduz || de === ate) el.textContent = fmtR(ate);
    else requestAnimationFrame(function passo(t) {
      if (!t0) t0 = t;
      var p = Math.min(1, (t - t0) / 600);
      el.textContent = fmtR(Math.round(de + (ate - de) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(passo);
    });
    // custo de cada carro (aluguel + combustível) nos botões
    $$(".cpk").forEach(function (b, i) {
      var c = CD.carros[i], pl = c.comb === "diesel" ? num("cDiesel") : num("cGas");
      var custo = (c.diaria * dias + num("cKm") * c.l100 / 100 * pl) / r / P;
      $("small", b).textContent = fmtR(Math.round(custo)) + " por pessoa com combustível";
    });
  }
  if (CD && $("#cCars")) {
    $("#cCars").innerHTML = CD.carros.map(function (c, i) {
      return "<button class='cpk' data-i='" + i + "'><b>" + c.nome + (c.top ? " <em>★</em>" : "") + "</b><span>CLP " + c.diaria.toLocaleString("pt-BR") + "/dia · " + (c.comb === "diesel" ? "diesel" : "gasolina") + " · " + c.l100.toLocaleString("pt-BR") + " L/100 km</span><small></small></button>";
    }).join("");
    var escolherCarro = function (i, manual) {
      carSel = i;
      $$(".cpk").forEach(function (b, k) { b.classList.toggle("on", k === i); });
      if (manual) { $("#cDiaria").value = CD.carros[i].diaria; $("#cCons").value = CD.carros[i].l100; salvo.cDiaria = $("#cDiaria").value; salvo.cCons = $("#cCons").value; }
      salvo.car = i; guardar(); calcular();
    };
    $$(".cpk").forEach(function (b, k) { b.addEventListener("click", function () { escolherCarro(k, true); }); });
    // restaura valores salvos
    rotaNaCalc();
    $$(".calc input[id]").forEach(function (inp) {
      var k = inp.id, alvo = function () { return POR_ROTA[k] ? rs() : salvo; };
      if (!POR_ROTA[k] && salvo[k] != null) { if (inp.type === "checkbox") inp.checked = salvo[k]; else inp.value = salvo[k]; }
      var gravar = function () { alvo()[k] = inp.type === "checkbox" ? inp.checked : inp.value; guardar(); calcular(); };
      inp.addEventListener("input", gravar);
      inp.addEventListener("change", gravar);
    });
    document.addEventListener("rota", function () { rotaNaCalc(); calcular(); });
    var ini = salvo.car != null ? salvo.car : Math.max(0, CD.carros.findIndex(function (c) { return c.top; }));
    escolherCarro(ini, salvo.cDiaria == null);
    document.addEventListener("hosp", calcular);
    $("#cList").addEventListener("click", function (ev) {
      var b = ev.target.closest(".pay");
      if (!b) return;
      salvo.parc = salvo.parc || { "Voo": true, "Hospedagem": true };
      salvo.parc[b.dataset.c] = !salvo.parc[b.dataset.c];
      guardar(); calcular();
    });
  }

  /* ---------- mapa ---------- */
  var mapEl = $("#map");
  if (!IDS.length || !mapEl || !window.L) return;
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
  var camada = L.layerGroup().addTo(map), pins = [], caminho = [], dist = [0], total = 1, marcosPin = [], limites = null, rodando = false;
  var btn = $("#playRoute");

  function desenhar(id) {
    var R = ROTAS[id];
    if (!R) return;
    camada.clearLayers();
    var todas = [];
    R.rota.forEach(function (l) {
      L.polyline(l.coords, { color: "#fff", weight: 8, opacity: 0.55 }).addTo(camada);
      L.polyline(l.coords, { color: cor[l.piso] || "#0e3b4f", weight: 4.5, opacity: 0.95 }).addTo(camada);
      todas = todas.concat(l.coords);
    });
    if (R.ferry) {
      L.polyline(R.ferry, { color: "#fff", weight: 7, opacity: 0.5 }).addTo(camada);
      L.polyline(R.ferry, { color: "#1a9aa0", weight: 4, dashArray: "8 8" }).addTo(camada);
    }
    R.pontos.forEach(function (p) { todas.push([p.lat, p.lon]); });
    limites = L.latLngBounds(todas);
    map.fitBounds(limites, { padding: [30, 30] });

    pins = R.pontos.map(function (p) {
      var lw = p.n.length > 2 ? 44 : 30;
      var ic = L.divIcon({ className: "", html: "<div class='pin" + (lw > 30 ? " wide" : "") + "'>" + p.n + "</div>", iconSize: [lw, 30], iconAnchor: [lw / 2, 15] });
      var m = L.marker([p.lat, p.lon], { icon: ic, title: p.nome }).addTo(camada);
      m.bindPopup("<div class='pop'><img src='img/" + p.img + ".jpg' alt=''><div><i>" + p.meta + "</i><b>" + p.nome + "</b><p>" + p.desc + "</p></div></div>", { maxWidth: 260, minWidth: 260 });
      return m;
    });

    // percurso animado na ordem da viagem (a balsa entra depois do trecho que chega ao porto)
    var iBalsa = -1;
    if (R.ferry) {
      var bd0 = 1e9;
      R.rota.forEach(function (l, i) { var c = l.coords[l.coords.length - 1], d = Math.hypot(c[0] - R.ferry[0][0], c[1] - R.ferry[0][1]); if (d < bd0) { bd0 = d; iBalsa = i; } });
    }
    caminho = [];
    R.rota.forEach(function (l, i) {
      caminho = caminho.concat(l.coords);
      if (i === iBalsa) caminho = caminho.concat([R.ferry[0], R.ferry[1]]);
    });
    dist = [0];
    for (var i = 1; i < caminho.length; i++) {
      var a = caminho[i - 1], b = caminho[i];
      dist.push(dist[i - 1] + Math.hypot(a[0] - b[0], (a[1] - b[1]) * 0.7));
    }
    total = dist[dist.length - 1] || 1;
    marcosPin = R.pontos.map(function (p) {
      var best = 0, bd = 1e9;
      caminho.forEach(function (c, j) { var d = Math.hypot(c[0] - p.lat, c[1] - p.lon); if (d < bd) { bd = d; best = j; } });
      return dist[best] / total;
    });
    if (btn) btn.textContent = "▶ Percorrer a rota";
  }
  desenhar(rotaAtual());
  document.addEventListener("rota", function (ev) { map.closePopup(); desenhar(ev.detail); });

  btn.addEventListener("click", function () {
    if (rodando || caminho.length < 2) return;
    rodando = true;
    var idIni = rotaAtual(), trechoPins = pins, trCam = caminho, trDist = dist, trTot = total, trMarcos = marcosPin;
    btn.textContent = "Percorrendo…";
    map.closePopup();
    map.fitBounds(limites, { padding: [30, 30] });
    var trilha = L.polyline([], { color: "#fff", weight: 3, opacity: 1 }).addTo(camada);
    var carro = L.marker(trCam[0], { icon: L.divIcon({ className: "", html: "<div class='car'>🚙</div>", iconSize: [26, 26], iconAnchor: [13, 13] }), interactive: false, zIndexOffset: 1000 }).addTo(camada);
    var dur = reduz ? 1 : 16000, t0 = null, j = 0;
    trechoPins.forEach(function (m) { var el = m.getElement(); if (el) el.firstChild.classList.remove("hot"); });
    function quadro(t) {
      if (rotaAtual() !== idIni) { rodando = false; return; }
      if (!t0) t0 = t;
      var p = Math.min(1, (t - t0) / dur), alvo = p * trTot;
      while (j < trCam.length - 1 && trDist[j + 1] <= alvo) { trilha.addLatLng(trCam[j + 1]); j++; }
      var seg = trDist[j + 1] - trDist[j] || 1, f = j < trCam.length - 1 ? (alvo - trDist[j]) / seg : 0;
      var a = trCam[j], b = trCam[Math.min(j + 1, trCam.length - 1)];
      carro.setLatLng([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
      trMarcos.forEach(function (mp, k) { if (p >= mp) { var el = trechoPins[k].getElement(); if (el) el.firstChild.classList.add("hot"); } });
      if (p < 1) requestAnimationFrame(quadro);
      else {
        setTimeout(function () { camada.removeLayer(carro); camada.removeLayer(trilha); rodando = false; btn.textContent = "▶ Percorrer de novo"; }, 1500);
      }
    }
    requestAnimationFrame(quadro);
  });
})();
