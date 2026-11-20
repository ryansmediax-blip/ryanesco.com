/* ============================================================
   RYAN ESCANDON: site behavior (luxury edition)
   Renders content from data/work.js on every page (home, /work,
   case pages), runs the inquiry form and the player, and drives
   the motion: line rises, scroll-lit statement, floating collage,
   cursor-following previews, lit lines, process track, marquee.
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
  const card = (it, extra = "", label = it.title) => `
    <article class="card ${extra}" data-play data-file="${esc(P(it.file))}" data-title="${esc(label)}"
      data-loop="${esc(P(it.loop || ""))}" ${it.kind ? `data-kind="${it.kind}"` : ""} tabindex="0" role="button" aria-label="Play ${esc(label)}">
      <img src="${esc(P(it.poster))}" alt="" loading="lazy">
      <video muted loop playsinline preload="none"></video>
      ${it.title ? `<div class="card__meta">${it.tag ? `<p class="card__tag">${esc(it.tag)}</p>` : ""}<h3 class="card__title">${esc(it.title)}</h3></div>` : ""}
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

    /* featured film = first confirmed case */
    const feat = CASES.filter(ok)[0];
    if (feat) {
      $("#featureTitle").innerHTML = `${esc(feat.client ? feat.client + ": " : "")}<em>${esc(feat.title)}</em>`;
      $("#featureLine").textContent = `${feat.line}  ·  ${feat.chips.join(" · ")}`;
      $("#featurePoster").src = P(posterOf(feat));
      const ff = $("#featureFrame");
      ff.dataset.file = P(feat.file); ff.dataset.title = feat.client ? `${feat.client}: ${feat.title}` : feat.title;
      ff.dataset.loop = P(loopOf(feat));
      ff.setAttribute("aria-label", `Play ${ff.dataset.title}`);
    } else $("#feature").remove();

    /* collage */
    $("#collageItems").innerHTML = COLLAGE.filter((c) => c.gate !== "beijing" || ok(BEIJING)).map((c, i) =>
      `<figure class="collage__item${c.video ? " collage__item--v" : ""}" style="--x:${c.x}%;--y:${c.y}%;--w:${c.w}vw;--d:${(i % 3) - 1}">${c.video
        ? `<video muted loop playsinline preload="none" poster="${esc(P(c.poster))}" data-src="${esc(P(c.video))}"></video>`
        : `<img src="${esc(P(c.src))}" alt="" loading="lazy">`}</figure>`).join("");
    /* follow-cam loops in the collage play only while it's on screen */
    const cvids = $$("#collageItems video");
    if (cvids.length && !REDUCED && !SAVE_DATA) {
      new IntersectionObserver(([e]) => cvids.forEach((v) => {
        if (e.isIntersecting) { if (!v.src) v.src = v.dataset.src; v.play().catch(() => {}); } else v.pause();
      }), { rootMargin: "200px 0px" }).observe($("#collage"));
    }

    /* work list */
    $("#caseRows").innerHTML = CASES.filter(ok).map((c, i) => {
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
        ${c.page ? `<a class="row__case" href="${caseUrl(c.slug)}">Case study</a>` : `<span class="row__case row__case--none"></span>`}
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
              ${o.ctas.map((c) => `<a href="#start" class="btn btn--dark btn--sm" data-offer="${c.offer}" data-who="${c.who}">${esc(c.label)}</a>`).join("")}
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
    $("#loopCopy").innerHTML = LOOP_COPY.filter((p) => txt(p)).map((p) => `<p${dAttr(p)}>${esc(txt(p))}</p>`).join("");
    $("#ringNodes").innerHTML = LOOP.map((n) => `
      <li class="node" data-loop="${esc(P(loopOf(n)))}">
        <span class="node__vid"><video muted loop playsinline preload="none"></video></span>
        <span class="node__n mono">${n.n}</span>
        <span class="node__name">${esc(n.name)}</span>
        <span class="node__line">${esc(n.line)}</span>
      </li>`).join("");

    /* access */
    $("#accessBody").textContent = ACCESS_LINE;
    const namesHTML = (arr) => arr.filter(ok).map((t) => `<li${dAttr(t)}>${esc(t.name)}${t.detail ? `<small class="names__detail">${esc(t.detail)}</small>` : ""}</li>`).join("");
    $("#accessAthletes").innerHTML = namesHTML(ACCESS.athletes);
    $("#accessPlaces").innerHTML = namesHTML(ACCESS.places);

    /* process */
    $("#steps").innerHTML = STEPS.map((s, i) => `
      <li class="stepc" style="--i:${i}"><span class="stepc__n mono">${s.n}</span><h3>${esc(s.name)}</h3><p>${esc(s.line)}</p></li>`).join("");

    /* originals strip */
    $("#strip").innerHTML = ORIGINALS.filter(ok).map((o) => o.type === "img"
      ? `<figure class="tile"${dAttr(o)}><img src="${esc(P(o.src))}" alt="${esc(o.caption)}" loading="lazy"><figcaption class="mono">${esc(o.caption)}</figcaption></figure>`
      : `<div class="tile tile--v"${dAttr(o)}>${card({ ...o, title: "", tag: "" }, "", o.caption)}<p class="mono tile__cap">${esc(o.caption)}</p></div>`
    ).join("") + `<a class="tile tile--end" href="work/"><span>The full archive</span><b aria-hidden="true">→</b></a>`;
    $$("[data-strip]").forEach((b) => b.addEventListener("click", () => {
      $("#strip").scrollBy({ left: Number(b.dataset.strip) * $("#strip").clientWidth * 0.8, behavior: REDUCED ? "auto" : "smooth" });
    }));

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

    /* about photo fallback */
    const ph = $("#aboutPhoto img");
    const noPhoto = () => $("#aboutPhoto").classList.add("about__photo--empty");
    if (ph.complete && !ph.naturalWidth) noPhoto(); else ph.addEventListener("error", noPhoto);

    $("#lightboxLink").href = LIGHTBOX_URL;
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
          <h1 class="display display--xl">${c.client ? `${esc(c.client)}: ` : ""}<em>${esc(c.title)}</em></h1>
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
            ${c.related ? `<section class="cs__sec"><h2 class="eyebrow">More from this shoot</h2><div class="cs__related">${c.related.map((r) => card({ ...r, tag: "" })).join("")}</div></section>` : ""}
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
      resort: ["Destination film", "Drone / flyover", ...(ok(FORM_3D_TOUR) ? ["3D tour"] : []), "Not sure yet"],
      athlete: ["Content for my sponsors", "Help me land a partner", "Follow cam / edit"],
      agency: ["Brand film", "Destination film", "Athlete partnership", "Not sure yet"],
      other: [],
    };
    const COMPANY = { brand: "Company", resort: "Resort / company", athlete: "Your name as an athlete", agency: "Agency", other: "Company (optional)" };
    const OFFER_TO_WHAT = { "brand-film": "Brand film", destination: "Destination film", partnership: { brand: "Athlete partnership", athlete: "Help me land a partner", agency: "Athlete partnership" } };

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
  const previewables = $$(".card, .svc__media, .node, .feature__frame");
  previewables.forEach((el) => {
    const v = el.querySelector("video");
    const host = el.classList.contains("svc__media") ? el.closest(".svc") : el;
    if (FINE && !REDUCED) {
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
  const rvSel = ".display:not(.collage__title), .eyebrow, .rv, .row, .svc, .node, .names li, .stepc, .card, .tile, .qa, .about__text p, .feature__frame, .start__intro p, .form";
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
      const play = !e.target.closest("a") && !!e.target.closest("[data-play], #playReel, .row");
      cur.classList.toggle("cursor--play", play);
      cur.classList.toggle("cursor--link", !play && !!e.target.closest("a, button, .pill"));
    });
  }

  /* scroll-linked scenes */
  const nav = $("#nav"), heroEl = $(".hero"), words = $$(".sw"), stEl = $("#statement");
  const collage = $("#collage"), citems = $$(".collage__item"), ctitle = $(".collage__title");
  const lines = $$("#linesList li"), proc = $("#track"), fill = $("#trackFill");
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
      collage.style.setProperty("--p", p.toFixed(3));
      if (ctitle) ctitle.classList.toggle("in", p > 0.15);
    }
    if (lines.length) {
      const mid = innerHeight / 2;
      lines.forEach((li) => { const r = li.getBoundingClientRect(); li.classList.toggle("lit", Math.abs(r.top + r.height / 2 - mid) < innerHeight * 0.18); });
    }
    if (proc && fill) fill.style.setProperty("--p", progIn(proc).toFixed(3));
    if (proc) $$(".stepc").forEach((s, i, all) => s.classList.toggle("on", progIn(proc) >= i / all.length));
  };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }, { passive: true });
  addEventListener("resize", frame);
  frame();
  if (REDUCED) { words.forEach((w) => w.classList.add("lit")); lines.forEach((l) => l.classList.add("lit")); if (fill) fill.style.setProperty("--p", 1); if (ctitle) ctitle.classList.add("in"); $$(".stepc").forEach((s) => s.classList.add("on")); }

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
