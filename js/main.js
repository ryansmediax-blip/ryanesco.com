/* ============================================================
   RYAN ESCANDON: site behavior (luxury edition)
   Renders content from data/work.js on every page (home, /work,
   case pages), runs the inquiry form and the player, and drives
   the motion: line rises, scroll-lit statement, X Games burst,
   Playground rows, cursor-following previews, process track, marquee.
   All motion is off under prefers-reduced-motion.
   ============================================================ */

(() => {
  "use strict";

  /* ---------- helpers ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const body = document.body;
  const PAGE = body.dataset.page;
  const BASE = body.dataset.base || "";
  const P = (p) => (p && !/^(https?:|mailto:|#)/.test(p) ? BASE + p : p);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FINE = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const SAVE_DATA = !!(navigator.connection && navigator.connection.saveData);
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  /* Plays: every Playground / burst loop goes through here, so at most MAXV play at once */
  const MAXV = matchMedia("(max-width: 760px)").matches ? 3 : 6;
  const live = [];
  const Plays = {
    want(v) {
      if (!v || REDUCED || SAVE_DATA) return;
      if (!v.src) v.src = v.dataset.src;
      const i = live.indexOf(v); if (i >= 0) live.splice(i, 1);
      live.push(v);
      while (live.length > MAXV) Plays.drop(live[0]);
      v.play().then(() => { const h = v.closest("[data-host]"); if (h) h.classList.add("is-playing"); }).catch(() => {});
    },
    drop(v) {
      if (!v) return;
      const i = live.indexOf(v); if (i >= 0) live.splice(i, 1);
      v.pause(); const h = v.closest("[data-host]"); if (h) h.classList.remove("is-playing");
    },
    pauseAll() { live.forEach((v) => v.pause()); },
    resumeAll() { live.forEach((v) => v.play().catch(() => {})); },
  };
  document.addEventListener("visibilitychange", () => (document.hidden ? Plays.pauseAll() : Plays.resumeAll()));

  /* draft gating: unconfirmed items show (outlined) in draft, vanish otherwise */
  const ok = (it) => it && (it.confirmed !== false || DRAFT);
  const isDraft = (it) => it && it.confirmed === false;
  const dAttr = (it) => (isDraft(it) && DRAFT ? ` data-draft data-ask="${esc(it.ask || "Needs Ryan's OK")}"` : "");
  const txt = (it) => (!it ? "" : typeof it === "string" ? it : it.confirmed === false && !DRAFT ? it.fallback || "" : it.text);
  const caseUrl = (slug) => `${BASE}work/${slug}.html`;
  const caseOf = (slug) => CASES.find((c) => c.slug === slug);
  /* footage tied to an unconfirmed case swaps to its fallback clip when DRAFT is off */
  const gated = (it) => !DRAFT && it.gate && it.gate !== "beijing" && isDraft(caseOf(it.gate));
  const loopOf = (it) => (gated(it) ? it.loopFallback : it.loop);
  const posterOf = (it) => (gated(it) ? it.posterFallback || it.poster : it.poster);

  if (DRAFT) {
    body.classList.add("is-draft");
    const b = document.createElement("div");
    b.className = "draft-banner";
    b.innerHTML = `<b>Draft view</b> Red dashed = needs Ryan's OK (hover for the question). Set <code>DRAFT = false</code> in data/work.js to hide them.`;
    body.appendChild(b);
  } else {
    $$(".draft-text").forEach((el) => el.remove());
  }
  $$(".draft-text").forEach((el) => el.setAttribute("data-draft", ""));

  /* ---------- a video card (archive, /work, case pages, strip) ---------- */
  const card = (it, extra = "", label = it.title || it.tag || "Film") => `
    <article class="card ${extra}" data-play data-file="${esc(P(it.file))}" data-title="${esc(label)}"
      data-loop="${esc(P(it.loop || ""))}" ${it.kind ? `data-kind="${it.kind}"` : ""} tabindex="0" role="button" aria-label="Play ${esc(label)}">
      <img src="${esc(P(it.poster))}" alt="" loading="lazy">
      <video muted loop playsinline preload="none"></video>
      ${it.title || it.tag ? `<div class="card__meta">${it.tag ? `<p class="card__tag">${esc(it.tag)}</p>` : ""}${it.title ? `<h3 class="card__title">${esc(it.title)}</h3>` : ""}</div>` : ""}
    </article>`;

  /* ==========================================================
     HOME
     ========================================================== */
  if (PAGE === "home") {
    const hv = $("#heroVideo");
    hv.poster = HERO.poster;
    if (REDUCED || SAVE_DATA) { hv.removeAttribute("autoplay"); hv.removeAttribute("loop"); }
    else hv.src = matchMedia("(max-width: 760px)").matches ? HERO.loopMobile : HERO.loop;
    const sub = $("#heroSub"); sub.textContent = txt(HERO.sub);
    if (isDraft(HERO.sub) && DRAFT) { sub.dataset.draft = ""; sub.dataset.ask = HERO.sub.ask; }
    const price = $("#heroPrice"); price.textContent = txt(HERO.price);
    if (isDraft(HERO.price) && DRAFT) { price.dataset.draft = ""; price.dataset.ask = HERO.price.ask; }

    /* credits marquee */
    const names = CREDITS.filter(ok).map((c) => {
      const tag = c.link && ok(caseOf(c.link)) ? `<a href="${caseUrl(c.link)}"${dAttr(c)}>${esc(c.name)}</a>` : `<span${dAttr(c)}>${esc(c.name)}</span>`;
      return `${tag}<i aria-hidden="true">✦</i>`;
    }).join("");
    $("#marqueeTrack").innerHTML = `<div class="marquee__set">${names}</div><div class="marquee__set" aria-hidden="true">${names.replace(/<a /g, '<a tabindex="-1" ')}</div>`;

    /* burst tiles: a still in front, a clip behind it on some */
    $("#collageItems").innerHTML = COLLAGE.map((c, i) => `
      <figure class="ctile${c.clip ? " ctile--clip" : ""}"${c.m === false ? ' data-m="none"' : ""} style="--w:${c.w};--x:${c.x};--y:${c.y};--r:${c.r};--ar:${c.ar};--wm:${c.wm ?? c.w};--xm:${c.xm ?? c.x};--ym:${c.ym ?? c.y}">
        <div class="ctile__card" data-host role="button" tabindex="0" ${c.clip
          ? `data-play data-film="${esc(P(c.film))}" data-title="${esc(c.title)}" aria-label="Play ${esc(c.title)}"`
          : `data-cursor="View" data-photo="${esc(P(c.full || c.still))}" data-cap="${esc(c.alt || "X Games Aspen 2025")}" aria-label="View photo, ${esc(c.alt || "X Games Aspen 2025")}"`}>
          ${c.clip ? `<video muted loop playsinline preload="none" data-src="${esc(P(c.clip))}"></video>` : ""}
          <img class="ctile__front" src="${esc(P(c.still))}" alt="" loading="lazy" decoding="async">
        </div>
      </figure>`).join("");
    $("#collageHint").textContent = FINE ? "Click a frame" : "Tap a frame";

    /* Playground rows */
    const pgPanel = (it, title, bare) => `
      <button class="pg__p" type="button" data-host data-play data-film="${esc(P(it.film))}" data-title="${esc(title)}" aria-label="Play ${esc(title)}" tabindex="-1" style="--arn:${it.arn || 1.7778}">
        <img src="${esc(P(it.poster))}" alt="" loading="lazy" decoding="async">
        <video muted loop playsinline preload="none" data-src="${esc(P(it.loop))}"></video>
        ${bare ? "" : `<span class="pg__lab mono">${esc(it.lab)}</span>
        <span class="chip-play mono" aria-hidden="true"><i></i>Play film</span>`}
      </button>`;
    $("#pgPipe").innerHTML = PLAYGROUND.lines.map((it) => pgPanel(it, it.title)).join("");
    $("#pgCams").innerHTML = PLAYGROUND.cams.map((it) => pgPanel(it, it.lab, true)).join("");
    $("#pgHint").textContent = FINE ? "Hover to open · Click to watch" : "Tap to open · Tap again to watch · Swipe the follow cams";

    /* work list */
    $("#caseRows").innerHTML = CASES.filter(ok).filter((c) => c.home !== false).map((c, i) => {
      const title = c.client ? `${c.client}` : c.title;
      const sub = c.client ? c.title : c.line;
      return `
      <li class="row"${dAttr(c)} data-loop="${esc(P(loopOf(c)))}">
        <button class="row__play" data-play data-file="${esc(P(c.file))}" data-title="${esc(c.client ? c.client + ": " + c.title : c.title)}" aria-label="Play ${esc(c.client ? c.client + ": " + c.title : c.title)}"></button>
        <span class="row__n mono">${String(i + 1).padStart(2, "0")}</span>
        <span class="row__thumb"><img src="${esc(P(posterOf(c)))}" alt="" loading="lazy"></span>
        <span class="row__title">${esc(title)}</span>
        <span class="row__sub">${esc(sub)}</span>
        <span class="row__tag mono">${esc(c.tag)}</span>
        ${c.page ? `<a class="row__case" href="${caseUrl(c.slug)}">${c.brief || c.result ? "Case study" : "Watch"}</a>` : `<span class="row__case row__case--none"></span>`}
      </li>`;
    }).join("");

    /* services (accordion) */
    $("#offers").innerHTML = OFFERS.map((o, i) => {
      const proofs = o.proof.filter((p) => ok(caseOf(p.case) || {}));
      const includes = o.includes.map((x) => (typeof x === "string" ? { text: x } : x)).filter((x) => txt(x));
      return `
      <div class="svc ${i === 0 ? "svc--open" : ""}">
        <button class="svc__head" aria-expanded="${i === 0}" aria-controls="svc${i}">
          <span class="svc__n mono">0${i + 1}</span>
          <span class="svc__name">${esc(o.name)}</span>
          <span class="svc__pitch">${esc(o.pitch)}</span>
          <i class="svc__plus" aria-hidden="true"></i>
        </button>
        <div class="svc__body" id="svc${i}" role="region"><div><div class="svc__grid">
          <div class="svc__media" data-loop="${esc(P(loopOf(o)))}"><img src="${esc(P(posterOf(o)))}" alt="" loading="lazy"><video muted loop playsinline preload="none"></video></div>
          <div class="svc__info">
            <p class="svc__for"${typeof o.for === "object" ? dAttr(o.for) : ""}><span class="mono">For</span>${esc(txt(o.for))}</p>
            <ul class="svc__list">${includes.map((x) => `<li${dAttr(x)}>${esc(txt(x))}</li>`).join("")}</ul>
            <p class="svc__deliv"><span class="mono">Deliverables</span>${o.deliverables.map(esc).join(" · ")}</p>
            ${proofs.length ? `<p class="svc__proof"><span class="mono">See it</span>${proofs.map((p) => `<a href="${p.link ? caseUrl(p.link) : p.anchor}"${dAttr(caseOf(p.case))}>${esc(p.label)}</a>`).join(" · ")}</p>` : ""}
            <div class="svc__foot">
              <span class="svc__price"${dAttr(o.price)}>${esc(txt(o.price).split(" · ")[0])}</span>
              ${o.ctas.map((c, k) => `<a href="#start" class="btn ${k ? "btn--outline-dark" : "btn--dark"} btn--sm" data-offer="${c.offer}" data-who="${c.who}">${esc(c.label)}</a>`).join("")}
            </div>
          </div>
        </div></div></div>
      </div>`;
    }).join("");
    $$(".svc__head").forEach((b) => b.addEventListener("click", () => {
      const open = b.getAttribute("aria-expanded") !== "true";
      b.setAttribute("aria-expanded", open); b.parentElement.classList.toggle("svc--open", open);
    }));

    /* loop */
    $("#loopCopy").innerHTML = LOOP_COPY.filter((p) => txt(p)).map((p) => `<p${dAttr(p)}>${esc(txt(p))}</p>`).join("") + `<p>${esc(ACCESS_LINE)}</p>`;
    $("#ringNodes").innerHTML = LOOP.map((n) => `
      <li class="node" data-loop="${esc(P(loopOf(n)))}">
        <span class="node__vid"><video muted loop playsinline preload="none"></video></span>
        <span class="node__n mono">${n.n}</span>
        <span class="node__name">${esc(n.name)}</span>
        <span class="node__line">${esc(n.line)}</span>
      </li>`).join("");

    /* process */
    $("#steps").innerHTML = STEPS.map((s, i) => `
      <li class="stepc" style="--i:${i}"><span class="stepc__n mono">${s.n}</span><h3>${esc(s.name)}</h3><p>${esc(s.line)}</p></li>`).join("");

    /* faq */
    $("#faqList").innerHTML = FAQ.filter(ok).map((f, i) => `
      <div class="qa"${dAttr(f)}>
        <button class="qa__q" aria-expanded="false" aria-controls="qa${i}"><span>${esc(f.q)}</span><i class="svc__plus" aria-hidden="true"></i></button>
        <div class="qa__a" id="qa${i}" role="region"><div><p>${esc(f.a)}${f.link ? ` <a href="${esc(f.link.href)}" target="_blank" rel="noopener">${esc(f.link.label)} →</a>` : ""}</p></div></div>
      </div>`).join("");
    $$(".qa__q").forEach((b) => b.addEventListener("click", () => {
      const open = b.getAttribute("aria-expanded") !== "true";
      b.setAttribute("aria-expanded", open); b.parentElement.classList.toggle("qa--open", open);
    }));

    /* about photo: if it is missing, About goes single-column */
    const ph = $("#aboutPhoto img");
    if (ph) {
      const noPhoto = () => { $("#aboutPhoto").remove(); $(".about").classList.add("about--solo"); };
      if (ph.complete && !ph.naturalWidth) noPhoto(); else ph.addEventListener("error", noPhoto);
    }

    initForm();
  }

  /* ==========================================================
     /work
     ========================================================== */
  if (PAGE === "work") {
    $("#moreWork").innerHTML = MORE_WORK.map((m) => card(m, `card--${m.shape}`)).join("")
      + CASES.filter((c) => !c.page && ok(c)).map((c) => card({ ...c, loop: loopOf(c), title: c.client ? `${c.client}: ${c.title}` : c.title, tag: c.tag }, `card--${c.shape}`)).join("");
    if (ok(BEIJING)) {
      const s = $("#beijing"); s.hidden = false;
      if (isDraft(BEIJING) && DRAFT) { s.dataset.draft = ""; s.dataset.ask = BEIJING.ask; }
      $("#beijingTitle").innerHTML = "Beijing 2022 <em>Winter Olympics</em>";
      $("#beijingGrid").innerHTML = [BEIJING.hero, ...BEIJING.side].map((p) => `<figure class="photo"><img src="${esc(P(p.src))}" alt="${esc(p.alt)}" loading="lazy"></figure>`).join("");
      $("#beijingStrip").innerHTML = BEIJING.strip.map((src, i) => `<img src="${esc(P(src))}" alt="Beijing 2022 Winter Olympics, photo ${i + 1}" loading="lazy">`).join("");
    }
    $("#archiveGrid").innerHTML = ARCHIVE.map((a) => card(a)).join("");
    $$(".chip").forEach((chip) => chip.addEventListener("click", () => {
      $$(".chip").forEach((c) => { c.classList.toggle("chip--on", c === chip); c.setAttribute("aria-pressed", c === chip); });
      const k = chip.dataset.kind;
      $$("#archiveGrid .card").forEach((c) => { c.hidden = k !== "all" && c.dataset.kind !== k; });
    }));
  }

  /* ==========================================================
     CASE PAGE
     ========================================================== */
  if (PAGE === "case") {
    const c = caseOf(body.dataset.case);
    const root = $("#case");
    if (!c || !ok(c)) {
      document.title = "Case study | Ryan Escandon";
      root.innerHTML = `<section class="page-hero"><h1 class="display">This case isn't published yet.</h1><p><a class="link-arrow" href="${BASE}index.html#work">Back to the work</a></p></section>`;
    } else {
      document.title = `${c.client ? c.client + ": " : ""}${c.title} | Ryan Escandon`;
      const sec = (title, val, ask) => val ? `<section class="cs__sec rv"><h2 class="eyebrow">${title}</h2><p>${esc(val)}</p></section>`
        : DRAFT ? `<section class="cs__sec rv" data-draft data-ask="${esc(ask)}"><h2 class="eyebrow">${title}</h2><p>[ASK RYAN: ${esc(ask)}]</p></section>` : "";
      const next = CASES.filter((x) => x.page && x.slug !== c.slug && ok(x))[0];
      const who = c.offer === "destination" ? "resort" : "brand";
      root.innerHTML = `
        <header class="page-hero"${dAttr(c)}>
          <p class="eyebrow"><a href="${BASE}index.html#work">← Selected work</a> &nbsp;·&nbsp; ${esc(c.tag)}</p>
          <h1 class="display display--xl">${c.client ? `${esc(c.client)}: <em>${esc(c.title)}</em>` : esc(c.title)}</h1>
          <p class="page-hero__sub">${esc(c.line)}</p>
        </header>
        <div class="cs__player cs__player--${c.shape}"><video controls playsinline preload="metadata" poster="${esc(P(c.poster))}" src="${esc(P(c.file))}"></video></div>
        <div class="section cs__body">
          <aside class="cs__glance"><h2 class="eyebrow">At a glance</h2><dl>${Object.entries(c.glance || {}).map(([k, v]) =>
            /\[ASK RYAN/.test(v) && !DRAFT ? "" : `<div${/\[ASK RYAN/.test(v) ? ' data-draft data-ask="' + esc(v) + '"' : ""}><dt class="mono">${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl></aside>
          <div class="cs__story">
            ${sec("The brief", c.brief, "One sentence: what did the client need?")}
            ${sec("The approach", c.approach, "Athlete, place, conditions: how did you shoot it?")}
            ${sec("Where it ran", c.result, "Where did it run? Any real numbers?")}
            ${c.related ? `<section class="cs__sec"><h2 class="eyebrow">${esc(c.relatedLabel || "More with " + ((c.glance && c.glance.Athlete) || "this athlete").split(" ").pop())}</h2><div class="cs__related">${c.related.map((r) => card({ ...r, tag: "" })).join("")}</div></section>` : ""}
            ${c.photos ? `<section class="cs__sec"><h2 class="eyebrow">Stills</h2><div class="cs__photos">${c.photos.map((ph) => `<figure class="photo" data-photo="${esc(P(ph.src))}" data-cursor="View" role="button" tabindex="0" aria-label="View photo: ${esc(ph.alt)}"><img src="${esc(P(ph.src))}" alt="${esc(ph.alt)}" loading="lazy" decoding="async"></figure>`).join("")}</div></section>` : ""}
          </div>
        </div>
        <section class="cs__cta section section--bone">
          <h2 class="display">Making something <em>like this?</em></h2>
          <div class="hero__row">
            <a class="btn btn--dark" href="${BASE}index.html?offer=${c.offer}&who=${who}#start">Work with me</a>
            ${next ? `<a class="link-arrow" href="${caseUrl(next.slug)}">Next: ${esc(next.client || next.title)}</a>` : ""}
          </div>
        </section>`;
    }
  }

  /* ---------- shared footer bits ---------- */
  const setHref = (sel, href, text) => { const el = $(sel); if (el) { el.href = href; if (text) el.textContent = text; } };
  setHref("#mailLink", `mailto:${CONTACT_EMAIL}`, CONTACT_EMAIL);
  setHref("#footMail", `mailto:${CONTACT_EMAIL}`);
  setHref("#footInsta", INSTAGRAM);
  setHref("#footLightbox", LIGHTBOX_URL);
  if ($("#year")) $("#year").textContent = new Date().getFullYear();

  /* ==========================================================
     INQUIRY FORM
     ========================================================== */
  function initForm() {
    const f = $("#startForm");
    const WHAT = {
      brand: ["Brand film", "Athlete partnership", "Not sure yet"],
      resort: ["Hospitality film", "Athletes at my property", "Drone / flyover", "Not sure yet"],
      athlete: ["Content for my sponsors", "Help me land a partner", "Follow cam / edit"],
      agency: ["Brand film", "Hospitality film", "Athlete partnership", "Not sure yet"],
      other: [],
    };
    const COMPANY = { brand: "Company", resort: "Property / company", athlete: "Your name as an athlete", agency: "Agency", other: "Company (optional)" };
    const OFFER_TO_WHAT = { "brand-film": "Brand film", destination: { resort: "Hospitality film", brand: "Hospitality film", agency: "Hospitality film" }, partnership: { brand: "Athlete partnership", athlete: "Help me land a partner", agency: "Athlete partnership" } };

    /* controls inside anything hidden are disabled, so FormData skips them */
    const syncDisabled = () => $$("input, textarea", f).forEach((el) => {
      if (el.name === "who") return;
      el.disabled = !!el.closest("[hidden]");
    });
    const setWho = (who) => {
      const r = f.querySelector(`input[name=who][value="${who}"]`); if (r) r.checked = true;
      const opts = WHAT[who] || [];
      $("#whatPills").innerHTML = opts.map((o) => `<label class="pill"><input type="radio" name="what" value="${esc(o)}"><span>${esc(o)}</span></label>`).join("");
      $("#stepWhat").hidden = !opts.length && who !== "agency";
      $("#endClient").hidden = who !== "agency";
      $("#stepDetails").hidden = false;
      $("#companyLabel").textContent = COMPANY[who] || "Company";
      $$(".branch", f).forEach((b) => { b.hidden = !b.dataset.for.split(" ").includes(who); });
      syncDisabled();
      $$("#stepWhat, #stepDetails").forEach((s) => !s.hidden && s.classList.add("step--in"));
    };
    syncDisabled();
    const setWhat = (val) => { const r = f.querySelector(`input[name=what][value="${val}"]`); if (r) r.checked = true; };
    const preset = (offer, who) => {
      if (!who) return;
      setWho(who);
      const w = OFFER_TO_WHAT[offer];
      if (w) setWhat(typeof w === "string" ? w : w[who]);
    };

    f.addEventListener("change", (e) => {
      const t = e.target;
      if (t.name === "who") setWho(t.value);
      if (t.name === "when") { $("#datesField").hidden = t.value !== "Specific dates"; syncDisabled(); }
      if (t.name === "budget") {
        const h = $("#budgetHint");
        h.hidden = !(t.value === "Not set yet" && ok(HERO.price));
        h.textContent = "Most projects start at $5K.";
      }
    });

    $$("[data-offer]").forEach((a) => a.addEventListener("click", () => preset(a.dataset.offer, a.dataset.who)));
    const qs = new URLSearchParams(location.search);
    if (qs.get("who")) preset(qs.get("offer"), qs.get("who"));

    f.addEventListener("submit", (e) => {
      e.preventDefault();
      const d = new FormData(f);
      const who = d.get("who");
      let bad = false;
      if (!who) { $("#formNote").textContent = "Pick who you are first."; return; }
      ["name", "email"].forEach((n) => {
        const el = f.elements[n]; const b = !el.value.trim() || !el.checkValidity();
        el.classList.toggle("invalid", b); el.setAttribute("aria-invalid", b); if (b) bad = true;
      });
      if (bad) { $("#formNote").textContent = "Add your name and a valid email."; f.querySelector(".invalid").focus(); return; }
      const tag = { brand: "BRAND", resort: "RESORT", athlete: "ATHLETE", agency: "AGENCY", other: "OTHER" }[who];
      const partnerTag = who === "athlete" && d.get("funded") === "Not yet" ? " [ATHLETE-PARTNER]" : "";
      const subject = `[${tag}]${d.get("budget") ? ` [${d.get("budget")}]` : ""} ${d.get("company") || d.get("name")} – ${d.get("what") || "New project"}${partnerTag}`;
      const line = (k, v) => (v ? `${k}: ${v}` : null);
      let text = [
        line("Name", d.get("name")), line("Email", d.get("email")), line(COMPANY[who], d.get("company")), line("Role", d.get("role")),
        line("Who", who), line("After", d.get("what")), line("End client", d.get("endclient")),
        line("Budget", d.get("budget")), line("Sport", d.get("sport")), line("Instagram", d.get("instagram")),
        line("Sponsors", d.get("sponsors")), line("Brand paying", d.get("funded")),
        line("When", [d.get("when"), d.get("dates")].filter(Boolean).join(", ")), line("Where", d.get("where")),
        line("Runs on", d.getAll("runs").join(", ")), "", d.get("message") || "",
      ].filter((x) => x !== null).join("\n");
      const full = `${subject}\n\n${text}`;
      if (text.length > 1200) text = text.slice(0, 1200) + "\n\n[trimmed: the full text is on your clipboard]";
      if (navigator.clipboard) navigator.clipboard.writeText(full).catch(() => {});
      location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
      const note = $("#formNote");
      note.innerHTML = `Your email app should open with everything filled in. Hit send there. If nothing opened, email <a href="mailto:${esc(CONTACT_EMAIL)}">${esc(CONTACT_EMAIL)}</a> and paste this (it's also on your clipboard):`;
      const ta = document.createElement("textarea"); ta.readOnly = true; ta.rows = 6; ta.className = "form__copy"; ta.value = full;
      note.appendChild(ta);
    });
  }

  /* ==========================================================
     VIDEO PREVIEWS + PLAYER
     ========================================================== */
  const startVid = (host, v, src) => { if (!src || !v) return; if (!v.src) v.src = src; v.play().then(() => host.classList.add("is-playing")).catch(() => {}); };
  const stopVid = (host, v) => { if (v) v.pause(); host.classList.remove("is-playing"); };

  /* inline previews: cards, service media, loop nodes, featured frame */
  const previewables = $$(".card, .svc__media, .node");
  previewables.forEach((el) => {
    const v = el.querySelector("video");
    const host = el.classList.contains("svc__media") ? el.closest(".svc") : el;
    if (FINE && !REDUCED && !SAVE_DATA) {
      host.addEventListener("mouseenter", () => startVid(el, v, el.dataset.loop));
      host.addEventListener("mouseleave", () => stopVid(el, v));
    }
  });
  if (!FINE && !REDUCED && !SAVE_DATA) {
    const vio = new IntersectionObserver((es) => es.forEach((e) => {
      const el = e.target, v = el.querySelector("video");
      if (!el.dataset.loop) return;
      e.isIntersecting ? startVid(el, v, el.dataset.loop) : stopVid(el, v);
    }), { threshold: 0.6 });
    previewables.forEach((el) => vio.observe(el));
  }

  /* work list: a preview that follows the cursor (desktop) */
  const hov = $("#hoverVid");
  if (hov && FINE && !REDUCED) {
    const hvid = hov.querySelector("video");
    let hx = 0, hy = 0, cx = 0, cy = 0, run = false;
    const follow = () => {
      cx += (hx - cx) * 0.14; cy += (hy - cy) * 0.14;
      hov.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      if (Math.abs(hx - cx) > 0.2 || Math.abs(hy - cy) > 0.2) requestAnimationFrame(follow); else run = false;
    };
    $$(".row").forEach((r) => {
      r.addEventListener("mouseenter", (e) => {
        hx = cx = e.clientX; hy = cy = e.clientY;
        hvid.src = r.dataset.loop; hvid.play().catch(() => {});
        hov.classList.add("on");
      });
      r.addEventListener("mousemove", (e) => { hx = e.clientX; hy = e.clientY; if (!run) { run = true; requestAnimationFrame(follow); } });
      r.addEventListener("mouseleave", () => { hov.classList.remove("on"); hvid.pause(); });
    });
  }

  const player = $("#player"), pv = $("#playerVideo");
  let lastFocus = null;
  const openPlayer = (file, title) => {
    if (!file) return;
    lastFocus = document.activeElement;
    Plays.pauseAll();
    pv.src = file; $("#playerCaption").textContent = title || "";
    player.classList.add("player--open"); player.setAttribute("aria-hidden", "false");
    body.style.overflow = "hidden";
    pv.play().catch(() => {});
    $("#playerClose").focus();
  };
  const closePlayer = () => {
    if (!player.classList.contains("player--open")) return;
    player.classList.remove("player--open"); player.setAttribute("aria-hidden", "true");
    body.style.overflow = "";
    pv.pause(); pv.removeAttribute("src"); pv.load();
    Plays.resumeAll();
    if (lastFocus) lastFocus.focus();
  };
  if (player) {
    $$("[data-play][data-file]").forEach((c) => {
      c.addEventListener("click", () => openPlayer(c.dataset.file, c.dataset.title));
      c.addEventListener("keydown", (e) => { if ((e.key === "Enter" || e.key === " ") && e.target === c) { e.preventDefault(); openPlayer(c.dataset.file, c.dataset.title); } });
    });
    const reel = $("#playReel"); if (reel) reel.addEventListener("click", () => openPlayer(P(HERO.reel), "Showreel"));
    $("#playerClose").addEventListener("click", closePlayer);
    player.addEventListener("click", (e) => { if (e.target === player) closePlayer(); });
    addEventListener("keydown", (e) => {
      if (e.key === "Escape") closePlayer();
      if (e.key === "Tab" && player.classList.contains("player--open")) {
        const a = document.activeElement;
        if (!player.contains(a)) { e.preventDefault(); $("#playerClose").focus(); }
        else if (e.shiftKey && a === $("#playerClose")) { e.preventDefault(); pv.focus(); }
        else if (!e.shiftKey && a === pv) { e.preventDefault(); $("#playerClose").focus(); }
      }
    });
  }

  /* ==========================================================
     PLAYGROUND: two accordion rows; the open panel plays
     ========================================================== */
  const isPhone = matchMedia("(max-width: 760px)").matches;
  function accordion(row, start, opts) {
    const ps = $$(".pg__p", row);
    let cur = -1, visible = false, over = false, lastTouch = 0, ptype = "mouse";
    const set = (i) => {
      if (i === cur) return;
      const prev = ps[cur];
      ps.forEach((p, k) => { p.classList.toggle("is-on", k === i); p.tabIndex = k === i ? 0 : -1; });
      if (prev) { const v = prev.querySelector("video"); setTimeout(() => { if (!prev.classList.contains("is-on")) Plays.drop(v); }, 700); }
      cur = i;
      if (visible) Plays.want(ps[i].querySelector("video"));
      if (opts.onChange) opts.onChange(i);
    };
    ps.forEach((p, i) => {
      p.addEventListener("pointerdown", (e) => { ptype = e.pointerType; lastTouch = Date.now(); });
      if (FINE) {
        let t;
        p.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") t = setTimeout(() => set(i), 60); });
        p.addEventListener("pointerleave", () => clearTimeout(t));
      }
      p.addEventListener("click", () => {
        lastTouch = Date.now();
        if (i === cur || ptype === "mouse") { set(i); openPlayer(p.dataset.film, p.dataset.title); }
        else { set(i); if (opts.track) p.scrollIntoView({ inline: "center", block: "nearest", behavior: REDUCED ? "auto" : "smooth" }); }
      });
      p.addEventListener("focus", () => { if (p.matches(":focus-visible")) set(i); });
    });
    row.addEventListener("keydown", (e) => {
      const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (!d) return;
      e.preventDefault(); ps[(cur + d + ps.length) % ps.length].focus();
    });
    row.addEventListener("pointerenter", () => (over = true));
    row.addEventListener("pointerleave", () => (over = false));
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      const v = ps[cur] && ps[cur].querySelector("video");
      visible ? Plays.want(v) : Plays.drop(v);
    }, { rootMargin: "150px 0px" }).observe(row);
    if (opts.track && isPhone) {
      const cio = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) set(ps.indexOf(e.target)); }), { root: row, rootMargin: "0px -45% 0px -45%" });
      ps.forEach((p) => cio.observe(p));
      row.addEventListener("scroll", () => row.closest(".pg").classList.add("pg--dragged"), { once: true, passive: true });
    }
    if (opts.attract && !REDUCED) setInterval(() => {
      if (visible && !over && !row.contains(document.activeElement) && Date.now() - lastTouch > 8000 && !document.hidden && !player.classList.contains("player--open")) set((cur + 1) % ps.length);
    }, 3600);
    set(start);
    if (opts.track && isPhone) requestAnimationFrame(() => { row.scrollLeft = ps[start].offsetLeft - (row.clientWidth - ps[start].offsetWidth) / 2; });
    return { set };
  }
  if ($("#pgPipe")) {
    $("#pgTotal").textContent = String(PLAYGROUND.lines.length).padStart(2, "0");
    accordion($("#pgPipe"), PLAYGROUND.linesStart, {
      attract: true,
      onChange: (i) => { $("#pgNow").textContent = PLAYGROUND.lines[i].lab; const b = $("#pgCount b"); b.textContent = String(i + 1).padStart(2, "0"); b.classList.remove("roll"); void b.offsetWidth; b.classList.add("roll"); },
    });
    accordion($("#pgCams"), PLAYGROUND.camsStart, { track: true, attract: !isPhone });
  }

  /* burst tiles: a clip tile reveals its clip then opens the film; a still opens big */
  const photoBox = $("#photoBox");
  const openPhoto = (src, cap = "X Games Aspen 2025") => {
    if (!photoBox) return;
    lastFocus = document.activeElement;
    $("#photoImg").src = src; $("#photoImg").alt = cap; $("#photoCap").textContent = cap;
    photoBox.classList.add("player--open"); photoBox.setAttribute("aria-hidden", "false");
    body.style.overflow = "hidden"; $("#photoClose").focus();
  };
  const closePhoto = () => {
    if (!photoBox || !photoBox.classList.contains("player--open")) return;
    photoBox.classList.remove("player--open"); photoBox.setAttribute("aria-hidden", "true");
    body.style.overflow = ""; if (lastFocus) lastFocus.focus();
  };
  if (photoBox) {
    $("#photoClose").addEventListener("click", closePhoto);
    photoBox.addEventListener("click", (e) => { if (e.target === photoBox) closePhoto(); });
    addEventListener("keydown", (e) => {
      if (e.key === "Escape") closePhoto();
      if (e.key === "Tab" && photoBox.classList.contains("player--open")) { e.preventDefault(); $("#photoClose").focus(); }
    });
  }
  /* Pipe Masters band: a background film that plays while on screen; click to watch */
  const pipeV = $("#pipeVideo");
  if (pipeV) {
    pipeV.dataset.src = P(isPhone ? pipeV.dataset.srcM : pipeV.dataset.src);
    new IntersectionObserver(([e]) => (e.isIntersecting ? Plays.want(pipeV) : Plays.drop(pipeV)), { rootMargin: "100px 0px" }).observe(pipeV);
    const pp = $("#pipePlay");
    pp.addEventListener("click", () => openPlayer(P(pp.dataset.film), pp.dataset.title));
  }

  $$(".ctile__card").forEach((card) => {
    const go = () => {
      if (card.dataset.photo) return openPhoto(card.dataset.photo, card.dataset.cap);
      const t = card.closest(".ctile");
      if (t.classList.contains("is-live")) return openPlayer(card.dataset.film, card.dataset.title);
      t._forced = true; t._on = true; t.classList.add("is-live"); Plays.want(card.querySelector("video"));
      setTimeout(() => openPlayer(card.dataset.film, card.dataset.title), 450);
    };
    card.addEventListener("click", go);
    card.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
  });

  $$(".cs__photos .photo").forEach((ph) => {
    const go = () => openPhoto(ph.dataset.photo, ph.querySelector("img").alt);
    ph.addEventListener("click", go);
    ph.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
  });

  /* mobile menu */
  const menuBtn = $("#navMenu");
  if (menuBtn) {
    menuBtn.addEventListener("click", () => {
      const open = menuBtn.getAttribute("aria-expanded") !== "true";
      menuBtn.setAttribute("aria-expanded", open); menuBtn.textContent = open ? "Close" : "Menu";
      $("#nav").classList.toggle("nav--open", open);
    });
    $$("#navDrawer a").forEach((a) => a.addEventListener("click", () => { menuBtn.setAttribute("aria-expanded", "false"); menuBtn.textContent = "Menu"; $("#nav").classList.remove("nav--open"); }));
  }

  /* ==========================================================
     MOTION
     ========================================================== */

  /* statement: split into words, light them as you scroll */
  const scrub = $("#statementText");
  if (scrub) scrub.innerHTML = scrub.textContent.split(/(\s+)/).map((w) => (/^\s+$/.test(w) ? w : `<span class="sw">${esc(w)}</span>`)).join("");

  /* reveal on view */
  const rvIO = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("in"); rvIO.unobserve(e.target); }
  }), { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
  const rvSel = ".display:not(.collage__title), .pg__row, .pg__sub, .eyebrow, .rv, .row, .svc, .node, .stepc, .card, .qa, .about__text p, .start__intro p, .form";
  $$(rvSel).forEach((el) => el.classList.add("rv"));
  if (REDUCED) $$(".rv").forEach((el) => el.classList.add("in"));
  else $$(".rv").forEach((el) => rvIO.observe(el));

  /* cursor: a small dot that becomes "Play" over anything playable */
  const cur = $("#cursor");
  if (cur && FINE && !REDUCED) {
    body.classList.add("has-cursor");
    let tx = -100, ty = -100, cx = tx, cy = ty, running = false;
    function loop() {
      cx += (tx - cx) * 0.22; cy += (ty - cy) * 0.22;
      if (Math.abs(tx - cx) < 0.1 && Math.abs(ty - cy) < 0.1) { cx = tx; cy = ty; running = false; }
      cur.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      if (running) requestAnimationFrame(loop);
    }
    addEventListener("mousemove", (e) => {
      tx = e.clientX; ty = e.clientY; cur.classList.add("on");
      if (!running) { running = true; requestAnimationFrame(loop); }
    });
    document.addEventListener("mouseleave", () => cur.classList.remove("on"));
    document.addEventListener("mouseover", (e) => {
      const tgt = e.target.closest("[data-cursor]");
      const play = !e.target.closest("a") && !!e.target.closest("[data-play], #playReel, .row, [data-cursor]");
      cur.firstElementChild.textContent = tgt ? tgt.dataset.cursor : "Play";
      cur.classList.toggle("cursor--play", play);
      cur.classList.toggle("cursor--link", !play && !!e.target.closest("a, button, .pill"));
    });
  }

  /* scroll-linked scenes */
  const nav = $("#nav"), heroEl = $(".hero"), words = $$(".sw"), stEl = $("#statement");
  const collage = $("#collage"), ctitle = $(".collage__title"), tiles = $$(".ctile"), clipTiles = $$(".ctile--clip");
  const proc = $("#track"), fill = $("#trackFill");
  const progIn = (el, start = 0.85, len = 0.9) => { if (!el) return 0; const r = el.getBoundingClientRect(); return clamp((innerHeight * start - r.top) / (r.height * len)); };

  let lastY = scrollY, vel = 0, mx = 0, paused = false, ticking = false;
  const track = $("#marqueeTrack");
  if (track) { track.addEventListener("mouseenter", () => (paused = true)); track.addEventListener("mouseleave", () => (paused = false)); }

  const frame = () => {
    ticking = false;
    const y = scrollY;
    if (nav) {
      nav.classList.toggle("nav--solid", y > (heroEl ? heroEl.offsetHeight - 80 : 40));
      nav.classList.toggle("nav--hidden", y > 600 && y > lastY + 2);
      if (y < lastY) nav.classList.remove("nav--hidden");
    }
    vel = Math.min(40, vel + Math.abs(y - lastY) * 0.12);
    lastY = y;
    if (REDUCED) return;
    if (heroEl && y < innerHeight * 1.2) heroEl.style.setProperty("--hy", (y / innerHeight).toFixed(3));
    if (words.length) {
      const p = progIn(stEl, 0.8, 0.75);
      const lit = Math.round(p * words.length);
      words.forEach((w, i) => w.classList.toggle("lit", i < lit));
    }
    if (collage) {
      const r = collage.getBoundingClientRect();
      const p = clamp(-r.top / Math.max(1, r.height - innerHeight));
      const onScreen = r.bottom > 0 && r.top < innerHeight;
      if (onScreen) {
        const ex = clamp((p - 0.82) / 0.18);                 // exit: tiles keep flying out and fade
        collage.style.setProperty("--k", (1 + ex * 0.5).toFixed(3));
        tiles.forEach((t, i) => {
          const b = easeOut(clamp((p - 0.03 - i * 0.025) / 0.32));
          t.style.setProperty("--b", b.toFixed(3));
          t.style.setProperty("--o", ((1 - ex) * Math.min(1, b * 2)).toFixed(3));
        });
        collage.classList.toggle("burst-done", p > 0.4 && p < 0.9);
        if (ctitle) { ctitle.classList.toggle("in", p > 0.05); ctitle.classList.toggle("is-out", ex > 0.5); }
      }
      clipTiles.forEach((t, k) => {
        const on = onScreen && ((p > 0.42 + k * 0.06 && p < 0.97) || t._forced);
        if (on !== !!t._on) { t._on = on; t.classList.toggle("is-live", on); const v = t.querySelector("video"); on ? Plays.want(v) : Plays.drop(v); }
        if (!onScreen) t._forced = false;
      });
    }
    if (proc && fill) fill.style.setProperty("--p", progIn(proc).toFixed(3));
    if (proc) $$(".stepc").forEach((s, i, all) => s.classList.toggle("on", progIn(proc) >= i / all.length));
  };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }, { passive: true });
  addEventListener("resize", frame);
  frame();
  if (REDUCED) { words.forEach((w) => w.classList.add("lit")); if (fill) fill.style.setProperty("--p", 1); if (ctitle) ctitle.classList.add("in"); tiles.forEach((t) => { t.style.setProperty("--b", 1); t.style.setProperty("--o", 1); }); $$(".stepc").forEach((s) => s.classList.add("on")); }

  /* marquee: drifts on its own, speeds up while you scroll, only while on screen */
  if (track && !REDUCED) {
    const sets = $$(".marquee__set", track), box = $("#marquee");
    const base = sets[0].innerHTML;
    let reps = 1;
    while (sets[0].offsetWidth < box.clientWidth && reps < 8) { reps++; sets.forEach((st) => (st.innerHTML = base.repeat(reps))); }
    let w = sets[0].offsetWidth, visible = false, running = false;
    new ResizeObserver(() => (w = sets[0].offsetWidth)).observe(sets[0]);
    const tick = () => {
      if (!paused) {
        mx -= 0.45 + vel * 0.2;
        if (w && -mx >= w) mx += w;
        track.style.transform = `translate3d(${mx}px,0,0)`;
      }
      vel *= 0.93;
      if (visible) requestAnimationFrame(tick); else running = false;
    };
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !running) { running = true; requestAnimationFrame(tick); }
    }).observe(box);
  }
})();
