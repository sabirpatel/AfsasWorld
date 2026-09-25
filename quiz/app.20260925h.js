/* AfsasWorld Quizzes — JSONBin public bin AfsaQuizPublic (CRUD attempts) + scratch pad */
(function () {
  "use strict";

  const BIN_ID = "6ab6e407ffd5d160532f453f";
  const BIN_LATEST = `https://api.jsonbin.io/v3/b/${BIN_ID}/latest?meta=false`;
  const BIN_PUT = `https://api.jsonbin.io/v3/b/${BIN_ID}`;
  const ATTEMPTS_CAP = 200;

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const state = {
    catalog: null,
    tests: [],
    currentTest: null,
    queue: [],
    index: 0,
    answers: [],
    selectedChoiceId: null,
    checked: false,
    startedAt: null,
    pendingAttempt: null,
    historyFilterTestId: null,
    viewingAttempt: null,
    catalogFilter: "todo",
  };


  /* —— Scratch pad (finger / Apple Pencil; not saved to JSONBin) —— */
  let scratch = null;

  function destroyScratchPad() {
    if (!scratch) return;
    try {
      if (scratch.ro) scratch.ro.disconnect();
    } catch (_) {}
    const canvas = scratch.canvas;
    if (canvas) {
      canvas.removeEventListener("pointerdown", scratch.onDown);
      canvas.removeEventListener("pointermove", scratch.onMove);
      canvas.removeEventListener("pointerup", scratch.onUp);
      canvas.removeEventListener("pointercancel", scratch.onUp);
      canvas.removeEventListener("lostpointercapture", scratch.onUp);
    }
    if (scratch.onToolClick) {
      scratch.toolButtons.forEach((btn) => {
        btn.removeEventListener("click", scratch.onToolClick);
      });
    }
    scratch = null;
  }

  function clearScratchPad() {
    if (!scratch) return;
    const { ctx, backing, bctx, canvas } = scratch;
    bctx.setTransform(1, 0, 0, 1, 0, 0);
    bctx.clearRect(0, 0, backing.width, backing.height);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function initScratchPad() {
    const canvas = $("#scratch-canvas");
    const pad = $("#scratch-pad");
    if (!canvas || !pad) return;

    destroyScratchPad();

    const backing = document.createElement("canvas");
    const bctx = backing.getContext("2d");
    const ctx = canvas.getContext("2d");

    let tool = "pen";
    let color = "#1f2937";
    let drawing = false;
    let lastX = 0;
    let lastY = 0;
    let activePointer = null;

    function dpr() {
      return Math.max(1, window.devicePixelRatio || 1);
    }

    let lastCssW = 0;
    let lastCssH = 0;
    let ro = null;
    let resizing = false;

    function resize() {
      if (resizing) return;
      const wrap = canvas.parentElement || canvas;
      // Width from layout; height from fixed CSS on .scratch-canvas-wrap
      const cssW = Math.max(1, Math.floor(wrap.clientWidth));
      const cssH = Math.max(1, Math.floor(wrap.clientHeight));
      if (cssW === lastCssW && cssH === lastCssH) return;

      resizing = true;
      if (ro) {
        try { ro.disconnect(); } catch (_) {}
      }

      try {
        lastCssW = cssW;
        lastCssH = cssH;
        const ratio = dpr();
        const w = Math.max(1, Math.floor(cssW * ratio));
        const h = Math.max(1, Math.floor(cssH * ratio));

        const prevW = backing.width;
        const prevH = backing.height;
        let snapshot = null;
        if (prevW > 0 && prevH > 0) {
          snapshot = document.createElement("canvas");
          snapshot.width = prevW;
          snapshot.height = prevH;
          snapshot.getContext("2d").drawImage(backing, 0, 0);
        }

        canvas.width = w;
        canvas.height = h;
        // Do not set inline height — CSS height:100% fills the fixed wrap
        canvas.style.width = "";
        canvas.style.height = "";
        backing.width = w;
        backing.height = h;

        bctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        if (snapshot) {
          bctx.drawImage(snapshot, 0, 0, w, h);
        }
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(backing, 0, 0);
      } finally {
        resizing = false;
        if (ro) {
          try { ro.observe(wrap); } catch (_) {}
        }
      }
    }

    function pos(e) {
      const rect = canvas.getBoundingClientRect();
      const ratio = dpr();
      return {
        x: (e.clientX - rect.left) * ratio,
        y: (e.clientY - rect.top) * ratio,
      };
    }

    function strokeBoth(x0, y0, x1, y1) {
      const ratio = dpr();
      const targets = [bctx, ctx];
      targets.forEach((c) => {
        c.save();
        c.lineCap = "round";
        c.lineJoin = "round";
        if (tool === "eraser") {
          c.globalCompositeOperation = "destination-out";
          c.strokeStyle = "rgba(0,0,0,1)";
          c.lineWidth = 22 * ratio;
        } else {
          c.globalCompositeOperation = "source-over";
          c.strokeStyle = color;
          c.lineWidth = 3.25 * ratio;
        }
        c.beginPath();
        c.moveTo(x0, y0);
        c.lineTo(x1, y1);
        c.stroke();
        c.restore();
      });
    }

    function onDown(e) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      e.preventDefault();
      activePointer = e.pointerId;
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch (_) {}
      drawing = true;
      const p = pos(e);
      lastX = p.x;
      lastY = p.y;
      strokeBoth(lastX, lastY, lastX + 0.01, lastY + 0.01);
    }

    function onMove(e) {
      if (!drawing || e.pointerId !== activePointer) return;
      e.preventDefault();
      const p = pos(e);
      strokeBoth(lastX, lastY, p.x, p.y);
      lastX = p.x;
      lastY = p.y;
    }

    function onUp(e) {
      if (e.pointerId !== activePointer && activePointer != null) return;
      drawing = false;
      activePointer = null;
      try {
        if (canvas.hasPointerCapture && canvas.hasPointerCapture(e.pointerId)) {
          canvas.releasePointerCapture(e.pointerId);
        }
      } catch (_) {}
    }

    canvas.style.touchAction = "none";
    canvas.addEventListener("pointerdown", onDown, { passive: false });
    canvas.addEventListener("pointermove", onMove, { passive: false });
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    canvas.addEventListener("lostpointercapture", onUp);

    const toolButtons = Array.from(
      pad.querySelectorAll(".scratch-swatch, .scratch-tool[data-tool], #scratch-clear")
    );

    function syncToolUI() {
      pad.querySelectorAll(".scratch-swatch").forEach((btn) => {
        btn.classList.toggle("active", tool === "pen" && btn.dataset.color === color);
      });
      const eraser = $("#scratch-eraser");
      if (eraser) eraser.classList.toggle("active", tool === "eraser");
    }

    function onToolClick(e) {
      const btn = e.currentTarget;
      if (btn.id === "scratch-clear") {
        clearScratchPad();
        return;
      }
      if (btn.dataset.tool === "eraser") {
        tool = "eraser";
        syncToolUI();
        return;
      }
      if (btn.dataset.color) {
        tool = "pen";
        color = btn.dataset.color;
        syncToolUI();
      }
    }

    toolButtons.forEach((btn) => btn.addEventListener("click", onToolClick));
    syncToolUI();

    if (typeof ResizeObserver !== "undefined") {
      let debounceTimer = null;
      ro = new ResizeObserver(() => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => resize(), 50);
      });
      ro.observe(canvas.parentElement || canvas);
    } else {
      window.addEventListener("resize", resize);
    }

    resize();
    // second pass after layout settles (iPad rotation / wide grid)
    requestAnimationFrame(() => resize());

    scratch = {
      canvas,
      ctx,
      backing,
      bctx,
      onDown,
      onMove,
      onUp,
      onToolClick,
      toolButtons,
      ro,
      _onWinResize: typeof ResizeObserver === "undefined" ? resize : null,
    };
  }


  function showScreen(name) {
    const prev = $(".screen.active");
    const prevName = prev && prev.id ? prev.id.replace(/^screen-/, "") : null;
    $$(".screen").forEach((el) => el.classList.remove("active"));
    const screen = $(`#screen-${name}`);
    if (screen) screen.classList.add("active");

    if (name === "question") {
      initScratchPad();
    } else if (prevName === "question" || scratch) {
      destroyScratchPad();
    }
  }

  function setStatus(el, msg, kind) {
    if (!el) return;
    el.textContent = msg || "";
    el.classList.remove("ok", "err");
    if (kind) el.classList.add(kind);
  }

  

  

  

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function normalizeText(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/[“”"']/g, "")
      .trim();
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function parseRoute() {
    const hash = location.hash || "";
    const mHash = hash.match(/#\/?test\/([^/?#]+)/i);
    if (mHash) return decodeURIComponent(mHash[1]);
    const params = new URLSearchParams(location.search);
    const q = params.get("test");
    return q ? decodeURIComponent(q) : null;
  }

  function setRoute(testId) {
    if (testId) {
      const next = `#/test/${encodeURIComponent(testId)}`;
      if (location.hash !== next) history.replaceState(null, "", next);
    } else if (location.hash) {
      history.replaceState(null, "", location.pathname + location.search);
    }
  }

  function makeAttemptId() {
    const ts = Date.now();
    const rand = Math.random().toString(36).slice(2, 8);
    return `att_${ts}_${rand}`;
  }

  async function fetchCatalog() {
    const headers = { Accept: "application/json" };
    const res = await fetch(BIN_LATEST, { headers, cache: "no-store" });
    if (res.status === 401 || res.status === 403) {
      const err = new Error(
        "JSONBin returned " + res.status + "."
      );
      err.code = res.status;
      throw err;
    }
    if (!res.ok) {
      throw new Error("Could not load catalog (HTTP " + res.status + ").");
    }
    const data = await res.json();
    if (!Array.isArray(data.attempts)) data.attempts = [];
    if (!Array.isArray(data.tests)) data.tests = [];
    return data;
  }

  async function saveCatalog(record) {
    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };
    const body = Object.assign({}, record, {
      updatedAt: new Date().toISOString(),
    });
    if (!Array.isArray(body.attempts)) body.attempts = [];
    const res = await fetch(BIN_PUT, {
      method: "PUT",
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (res.status === 401 || res.status === 403) {
      const err = new Error(
        "Save failed (HTTP " + res.status + ")."
      );
      err.code = res.status;
      throw err;
    }
    if (!res.ok) {
      let detail = "";
      try {
        const j = await res.json();
        detail = j && (j.message || j.error) ? ": " + (j.message || j.error) : "";
      } catch (_) { /* ignore */ }
      throw new Error("Could not save catalog (HTTP " + res.status + ")" + detail);
    }
    // JSONBin PUT returns { record, metadata }; prefer record when present
    let out = body;
    try {
      const j = await res.json();
      if (j && j.record) out = j.record;
    } catch (_) { /* use body we sent */ }
    if (!Array.isArray(out.attempts)) out.attempts = [];
    state.catalog = out;
    state.tests = publishedTests(out);
    return out;
  }

  function publishedTests(catalog) {
    const list = (catalog && Array.isArray(catalog.tests) ? catalog.tests : [])
      .filter((t) => t && t.status === "published")
      .slice()
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    return list;
  }

  

  function completedTestIds() {
    const ids = new Set();
    const attempts = (state.catalog && Array.isArray(state.catalog.attempts)
      ? state.catalog.attempts
      : []);
    attempts.forEach((a) => {
      if (a && a.testId && a.finishedAt) ids.add(a.testId);
    });
    return ids;
  }

  function latestAttemptFor(testId) {
    const attempts = (state.catalog && Array.isArray(state.catalog.attempts)
      ? state.catalog.attempts
      : []).filter((a) => a && a.testId === testId && a.finishedAt);
    if (!attempts.length) return null;
    attempts.sort((a, b) => String(b.finishedAt).localeCompare(String(a.finishedAt)));
    return attempts[0];
  }

  function syncCatalogFilterUI() {
    $$(".filter-chip").forEach((btn) => {
      const on = btn.getAttribute("data-filter") === state.catalogFilter;
      btn.classList.toggle("active", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
    });
  }

  function renderCatalog() {
    const listEl = $("#test-list");
    const status = $("#catalog-status");
    const title = $("#site-title");
    const blurb = $("#site-blurb");
    if (!listEl) return;

    if (state.catalog && state.catalog.site) {
      if (title && state.catalog.site.title) title.textContent = state.catalog.site.title;
      if (blurb && state.catalog.site.homeBlurb) blurb.textContent = state.catalog.site.homeBlurb;
    }

    syncCatalogFilterUI();
    listEl.innerHTML = "";

    if (!state.tests.length) {
      setStatus(status, "No published tests yet.", "");
      return;
    }

    const doneIds = completedTestIds();
    const filter = state.catalogFilter || "todo";
    let visible = state.tests.slice();
    if (filter === "todo") {
      visible = visible.filter((t) => !doneIds.has(t.id));
    } else if (filter === "done") {
      visible = visible.filter((t) => doneIds.has(t.id));
    }

    const doneCount = state.tests.filter((t) => doneIds.has(t.id)).length;
    const todoCount = state.tests.length - doneCount;
    setStatus(
      status,
      todoCount + " to do · " + doneCount + " finished",
      "ok"
    );

    if (!visible.length) {
      const empty = document.createElement("p");
      empty.className = "test-list-empty";
      if (filter === "todo") {
        empty.textContent = "You're caught up — no new tests right now. Check Old tests for ones you've finished.";
      } else if (filter === "done") {
        empty.textContent = "No finished tests yet. Complete a quiz and it will show up here.";
      } else {
        empty.textContent = "No tests in this list.";
      }
      listEl.appendChild(empty);
      return;
    }

    visible.forEach((t) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "test-card";
      btn.setAttribute("data-test-id", t.id);
      const qCount = Array.isArray(t.questions) ? t.questions.length : 0;
      const metaBits = [t.subject || "General", t.topic].filter(Boolean).map(escapeHtml);
      const latest = latestAttemptFor(t.id);
      const scoreChip = latest && latest.score
        ? `<span class="chip score">${escapeHtml(String(latest.score.percent))}% last</span>`
        : "";
      btn.innerHTML =
        `<div class="test-card-top">` +
        `<div class="test-card-main">` +
        `<div class="meta">${metaBits.join(" · ")}</div>` +
        `<h3>${escapeHtml(t.name || t.id)}</h3>` +
        `</div>` +
        `<div class="chip-row-right">` +
        scoreChip +
        `<span class="chip qcount">${qCount} question${qCount === 1 ? "" : "s"}</span>` +
        `</div>` +
        `</div>` +
        (t.description
          ? `<p class="test-card-desc">${escapeHtml(t.description)}</p>`
          : "") +
        `<span class="test-card-go" aria-hidden="true">→</span>`;
      btn.addEventListener("click", () => openIntro(t.id));
      listEl.appendChild(btn);
    });
  }

  async function loadCatalogAndRoute() {
    const status = $("#catalog-status");
    setStatus(status, "Loading catalog…", "");
    showScreen("catalog");
    try {
      const data = await fetchCatalog();
      state.catalog = data;
      state.tests = publishedTests(data);
      renderCatalog();
      const routeId = parseRoute();
      if (routeId) {
        const found = state.tests.find((t) => t.id === routeId);
        if (found) openIntro(routeId);
        else setStatus(status, "Test not found or not published: " + routeId, "err");
      } else {
        showScreen("catalog");
      }
    } catch (err) {
      state.catalog = null;
      state.tests = [];
      // public bin — show error on catalog
      renderCatalog();
      setStatus(status, err.message || "Failed to load catalog.", "err");
      showScreen("catalog");
    }
  }

  function openIntro(testId) {
    const test = state.tests.find((t) => t.id === testId);
    if (!test) return;
    state.currentTest = test;
    setRoute(testId);

    $("#intro-name").textContent = test.name || test.id;
    $("#intro-meta").textContent =
      [test.subject, test.topic].filter(Boolean).join(" · ") || "Test";
    $("#intro-desc").textContent = test.description || "";
    $("#intro-badge").textContent = "Test";

    const settings = test.settings || {};
    const qCount = Array.isArray(test.questions) ? test.questions.length : 0;
    const facts = [];
    facts.push(`${qCount} question${qCount === 1 ? "" : "s"}`);
    if (settings.passingScorePercent != null) {
      facts.push(`Passing score: ${settings.passingScorePercent}%`);
    }
    if (settings.allowRetry) facts.push("Retries allowed");
    if (settings.shuffleQuestions) facts.push("Questions shuffled");
    if (settings.timeLimitSec) facts.push(`Time limit: ${settings.timeLimitSec}s`);

    const ul = $("#intro-facts");
    ul.innerHTML = facts.map((f) => `<li>${escapeHtml(f)}</li>`).join("");
    showScreen("intro");
  }

  function startTest() {
    const test = state.currentTest;
    if (!test || !Array.isArray(test.questions) || !test.questions.length) return;
    const settings = test.settings || {};
    let queue = test.questions.map((q, i) => ({ ...q, _origIndex: i }));
    if (settings.shuffleQuestions) queue = shuffle(queue);

    state.queue = queue.map((q) => {
      const copy = { ...q };
      if (q.type === "multiple_choice" && Array.isArray(q.choices)) {
        copy.choices = settings.shuffleChoices ? shuffle(q.choices) : q.choices.slice();
      }
      return copy;
    });
    state.index = 0;
    state.answers = [];
    state.checked = false;
    state.selectedChoiceId = null;
    state.startedAt = Date.now();
    state.pendingAttempt = null;
    showScreen("question");
    renderQuestion();
  }

  function typeLabel(type) {
    const map = {
      numeric: "Numeric",
      multiple_choice: "Multiple choice",
      short_answer: "Short answer",
      true_false: "True / False",
    };
    return map[type] || "Question";
  }

  function renderQuestion() {
    const q = state.queue[state.index];
    if (!q) return;
    state.checked = false;
    state.selectedChoiceId = null;

    const total = state.queue.length;
    const n = state.index + 1;
    $("#q-progress-label").textContent = `Question ${n} of ${total}`;
    $("#q-points-label").textContent =
      q.points != null ? `${q.points} pt${q.points === 1 ? "" : "s"}` : "";
    $("#q-progress-fill").style.width = `${((n - 1) / total) * 100}%`;
    $("#q-type-badge").textContent = typeLabel(q.type);
    $("#q-prompt").textContent = q.prompt || "";

    const detail = $("#q-prompt-detail");
    if (q.promptDetail) {
      detail.textContent = q.promptDetail;
      detail.classList.remove("hidden");
    } else {
      detail.textContent = "";
      detail.classList.add("hidden");
    }

    const area = $("#q-answer-area");
    area.innerHTML = "";
    const feedback = $("#q-feedback");
    feedback.className = "feedback hidden";
    feedback.innerHTML = "";

    $("#btn-check").classList.remove("hidden");
    $("#btn-check").disabled = false;
    $("#btn-next").classList.add("hidden");

    if (scratch) clearScratchPad();
    else initScratchPad();

    if (q.type === "multiple_choice") {
      const list = document.createElement("div");
      list.className = "choice-list";
      (q.choices || []).forEach((c) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "choice-btn";
        b.setAttribute("data-choice-id", c.id);
        b.textContent = c.text;
        b.addEventListener("click", () => {
          if (state.checked) return;
          state.selectedChoiceId = c.id;
          $$(".choice-btn", list).forEach((x) => x.classList.remove("selected"));
          b.classList.add("selected");
        });
        list.appendChild(b);
      });
      area.appendChild(list);
    } else if (q.type === "true_false") {
      const row = document.createElement("div");
      row.className = "tf-row";
      ["true", "false"].forEach((val) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "choice-btn";
        b.setAttribute("data-tf", val);
        b.textContent = val === "true" ? "True" : "False";
        b.addEventListener("click", () => {
          if (state.checked) return;
          state.selectedChoiceId = val;
          $$(".choice-btn", row).forEach((x) => x.classList.remove("selected"));
          b.classList.add("selected");
        });
        row.appendChild(b);
      });
      area.appendChild(row);
    } else {
      const input = document.createElement("input");
      input.type = "text";
      input.className = "answer-input";
      input.id = "answer-input";
      input.autocomplete = "off";
      input.placeholder = q.type === "numeric" ? "Enter a number" : "Type your answer";
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !state.checked) {
          e.preventDefault();
          checkAnswer();
        }
      });
      area.appendChild(input);
      setTimeout(() => input.focus(), 50);
    }
  }

  function gradeQuestion(q, raw) {
    const ans = q.answer || {};
    if (q.type === "multiple_choice") {
      const ok = raw != null && String(raw) === String(ans.choiceId);
      return { ok, given: raw, expected: ans.choiceId };
    }
    if (q.type === "true_false") {
      const expected = !!ans.value;
      const given = raw === "true" || raw === true;
      return { ok: given === expected, given, expected };
    }
    if (q.type === "numeric") {
      const text = normalizeText(raw).replace(/,/g, "");
      const accept = Array.isArray(ans.accept) ? ans.accept : [];
      for (const a of accept) {
        if (
          normalizeText(a) === text ||
          normalizeText(a).replace(/\s*=\s*/g, "=") === text.replace(/\s*=\s*/g, "=")
        ) {
          return { ok: true, given: raw, expected: ans.value };
        }
      }
      const m = text.match(/-?\d+(?:\.\d+)?/);
      if (m && ans.value != null) {
        const num = parseFloat(m[0]);
        const target = Number(ans.value);
        const tol = ans.tolerance != null ? Number(ans.tolerance) : 0;
        if (!Number.isNaN(num) && Math.abs(num - target) <= tol) {
          return { ok: true, given: raw, expected: ans.value };
        }
      }
      return { ok: false, given: raw, expected: ans.value };
    }
    const text = normalizeText(raw);
    const accept = Array.isArray(ans.accept) ? ans.accept : [];
    const match = ans.match || "contains";
    let ok = false;
    for (const a of accept) {
      const na = normalizeText(a);
      if (!na) continue;
      if (match === "exact") {
        if (text === na) {
          ok = true;
          break;
        }
      } else {
        if (text.includes(na) || na.includes(text)) {
          ok = true;
          break;
        }
      }
    }
    return { ok, given: raw, expected: accept[0] || "" };
  }

  function checkAnswer() {
    if (state.checked) return;
    const q = state.queue[state.index];
    if (!q) return;

    let raw = null;
    if (q.type === "multiple_choice" || q.type === "true_false") {
      raw = state.selectedChoiceId;
      if (raw == null) {
        const feedback = $("#q-feedback");
        feedback.className = "feedback err";
        feedback.textContent = "Pick an answer first.";
        feedback.classList.remove("hidden");
        return;
      }
    } else {
      const input = $("#answer-input");
      raw = input ? input.value : "";
      if (!String(raw).trim()) {
        const feedback = $("#q-feedback");
        feedback.className = "feedback err";
        feedback.textContent = "Enter an answer first.";
        feedback.classList.remove("hidden");
        return;
      }
    }

    const result = gradeQuestion(q, raw);
    state.checked = true;
    state.answers.push({
      questionId: q.id,
      type: q.type,
      prompt: q.prompt,
      promptDetail: q.promptDetail,
      points: q.points != null ? Number(q.points) : 1,
      ok: result.ok,
      given: result.given,
      expected: result.expected,
      explanation: q.explanation || "",
      hint: q.hint || "",
    });

    const settings = (state.currentTest && state.currentTest.settings) || {};
    const feedback = $("#q-feedback");
    feedback.className = "feedback " + (result.ok ? "ok" : "err");
    let html = result.ok ? "<strong>Correct!</strong>" : "<strong>Not quite.</strong>";
    if (!result.ok && settings.showHintAfterMiss && q.hint) {
      html += `<div class="hint">Hint: ${escapeHtml(q.hint)}</div>`;
    }
    if (settings.showExplanationAfterAnswer && q.explanation) {
      html += `<div class="explain">${escapeHtml(q.explanation)}</div>`;
    }
    feedback.innerHTML = html;
    feedback.classList.remove("hidden");

    if (q.type === "multiple_choice") {
      $$(".choice-btn").forEach((b) => {
        b.disabled = true;
        const id = b.getAttribute("data-choice-id");
        if (id === String((q.answer || {}).choiceId)) b.classList.add("correct");
        else if (id === String(raw) && !result.ok) b.classList.add("wrong");
      });
    } else if (q.type === "true_false") {
      $$(".choice-btn").forEach((b) => {
        b.disabled = true;
        const val = b.getAttribute("data-tf") === "true";
        const expected = !!(q.answer || {}).value;
        if (val === expected) b.classList.add("correct");
        else if (b.classList.contains("selected") && !result.ok) b.classList.add("wrong");
      });
    } else {
      const input = $("#answer-input");
      if (input) input.disabled = true;
    }

    $("#btn-check").classList.add("hidden");
    const nextBtn = $("#btn-next");
    nextBtn.classList.remove("hidden");
    nextBtn.textContent = state.index + 1 >= state.queue.length ? "See results →" : "Next →";

    const total = state.queue.length;
    $("#q-progress-fill").style.width = `${((state.index + 1) / total) * 100}%`;
  }

  function goNext() {
    if (state.index + 1 >= state.queue.length) {
      finishAndShowResults();
    } else {
      state.index += 1;
      renderQuestion();
    }
  }

  function buildAttempt() {
    const test = state.currentTest || {};
    const answers = state.answers;
    const correct = answers.filter((a) => a.ok).length;
    const total = answers.length;
    const pointsEarned = answers.reduce((s, a) => s + (a.ok ? a.points : 0), 0);
    const pointsPossible = answers.reduce((s, a) => s + a.points, 0) || 1;
    const percent = Math.round((pointsEarned / pointsPossible) * 100);
    const settings = test.settings || {};
    const passAt = settings.passingScorePercent != null ? Number(settings.passingScorePercent) : 70;
    const passed = percent >= passAt;
    const finishedAt = new Date().toISOString();
    const durationSec = state.startedAt
      ? Math.max(0, Math.round((Date.now() - state.startedAt) / 1000))
      : 0;

    return {
      id: makeAttemptId(),
      testId: test.id || "",
      testName: test.name || test.id || "",
      subject: test.subject || "",
      topic: test.topic || "",
      finishedAt,
      durationSec,
      score: {
        correct,
        total,
        pointsEarned,
        pointsPossible,
        percent,
        passed,
      },
      answers: answers.map((a) => ({
        questionId: a.questionId,
        prompt: a.prompt || "",
        ok: !!a.ok,
        given: a.given == null ? "" : String(typeof a.given === "boolean" ? (a.given ? "true" : "false") : a.given),
        expected: a.expected == null ? "" : String(typeof a.expected === "boolean" ? (a.expected ? "true" : "false") : a.expected),
        points: a.points,
      })),
    };
  }

  async function persistAttempt(attempt) {
    let catalog = state.catalog;
    try {
      catalog = await fetchCatalog();
    } catch (_) {
      if (!catalog) throw new Error("No catalog loaded; cannot save attempt.");
    }
    const attempts = Array.isArray(catalog.attempts) ? catalog.attempts.slice() : [];
    // Avoid duplicate if same id already present (retry)
    const without = attempts.filter((a) => a && a.id !== attempt.id);
    without.unshift(attempt);
    catalog.attempts = without.slice(0, ATTEMPTS_CAP);
    return saveCatalog(catalog);
  }

  async function finishAndShowResults() {
    const attempt = buildAttempt();
    state.pendingAttempt = attempt;
    const score = attempt.score;
    const settings = (state.currentTest && state.currentTest.settings) || {};
    const passAt = settings.passingScorePercent != null ? Number(settings.passingScorePercent) : 70;

    $("#results-emoji").textContent = score.passed ? "🎉" : "💪";
    $("#results-title").textContent = score.passed ? "You passed!" : "Keep practicing";
    $("#results-score").textContent = `${score.percent}%`;
    $("#results-summary").textContent =
      `${score.pointsEarned} of ${score.pointsPossible} points · passing is ${passAt}%` +
      (state.currentTest ? ` · ${state.currentTest.name}` : "");

    const retryBtn = $("#btn-retry");
    if (settings.allowRetry) retryBtn.classList.remove("hidden");
    else retryBtn.classList.add("hidden");

    $("#review-list").classList.add("hidden");
    $("#review-list").innerHTML = "";
    $("#btn-retry-save").classList.add("hidden");
    setStatus($("#results-save-status"), "Saving to JSONBin…", "");
    showScreen("results");

    try {
      await persistAttempt(attempt);
      setStatus($("#results-save-status"), "Saved to JSONBin", "ok");
      state.pendingAttempt = null;
    } catch (err) {
      setStatus(
        $("#results-save-status"),
        (err && err.message) || "Save failed.",
        "err"
      );
      $("#btn-retry-save").classList.remove("hidden");
    }
  }

  async function retrySave() {
    if (!state.pendingAttempt) {
      setStatus($("#results-save-status"), "Nothing to retry.", "");
      return;
    }
    setStatus($("#results-save-status"), "Saving to JSONBin…", "");
    $("#btn-retry-save").classList.add("hidden");
    try {
      await persistAttempt(state.pendingAttempt);
      setStatus($("#results-save-status"), "Saved to JSONBin", "ok");
      state.pendingAttempt = null;
    } catch (err) {
      setStatus(
        $("#results-save-status"),
        (err && err.message) || "Save failed.",
        "err"
      );
      $("#btn-retry-save").classList.remove("hidden");
    }
  }

  function renderReview() {
    const list = $("#review-list");
    list.innerHTML = "";
    state.answers.forEach((a, i) => {
      const div = document.createElement("div");
      div.className = "review-item";
      const givenStr = formatGiven(a);
      const expectedStr = formatExpected(a);
      div.innerHTML =
        `<div class="ri-head">` +
        `<span class="ri-num">Q${i + 1} · ${escapeHtml(typeLabel(a.type))}</span>` +
        `<span class="ri-mark ${a.ok ? "ok" : "err"}">${a.ok ? "Correct" : "Missed"}</span>` +
        `</div>` +
        `<div class="ri-prompt">${escapeHtml(a.prompt || "")}</div>` +
        (a.promptDetail
          ? `<div class="ri-line" style="font-family:var(--mono);margin-bottom:0.35rem">${escapeHtml(a.promptDetail)}</div>`
          : "") +
        `<div class="ri-line">Your answer: <strong>${escapeHtml(givenStr)}</strong></div>` +
        (!a.ok
          ? `<div class="ri-line">Expected: <strong>${escapeHtml(expectedStr)}</strong></div>`
          : "") +
        (a.explanation
          ? `<div class="ri-explain">${escapeHtml(a.explanation)}</div>`
          : "");
      list.appendChild(div);
    });
    list.classList.remove("hidden");
  }

  function formatGiven(a) {
    if (a.type === "true_false") return a.given === true || a.given === "true" ? "True" : "False";
    if (a.type === "multiple_choice") {
      const q =
        state.queue.find((x) => x.id === a.questionId) ||
        (state.currentTest &&
          (state.currentTest.questions || []).find((x) => x.id === a.questionId));
      const choice = q && (q.choices || []).find((c) => c.id === a.given);
      return choice ? choice.text : String(a.given);
    }
    return String(a.given == null ? "" : a.given);
  }

  function formatExpected(a) {
    if (a.type === "true_false") return a.expected ? "True" : "False";
    if (a.type === "multiple_choice") {
      const q =
        state.queue.find((x) => x.id === a.questionId) ||
        (state.currentTest &&
          (state.currentTest.questions || []).find((x) => x.id === a.questionId));
      const choice = q && (q.choices || []).find((c) => c.id === a.expected);
      return choice ? choice.text : String(a.expected);
    }
    return String(a.expected == null ? "" : a.expected);
  }

  function formatDate(iso) {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      return d.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch (_) {
      return String(iso);
    }
  }

  function getAttemptsList() {
    const all = (state.catalog && Array.isArray(state.catalog.attempts)
      ? state.catalog.attempts
      : []
    ).filter(Boolean);
    if (!state.historyFilterTestId) return all;
    return all.filter((a) => a.testId === state.historyFilterTestId);
  }

  function renderHistory() {
    const listEl = $("#history-list");
    const status = $("#history-status");
    const filter = $("#history-filter");
    if (!listEl) return;

    // Populate filter options once from known tests + attempt test names
    if (filter) {
      const prev = state.historyFilterTestId || "";
      const opts = [{ id: "", label: "All tests" }];
      const seen = new Set();
      (state.tests || []).forEach((t) => {
        if (t && t.id && !seen.has(t.id)) {
          seen.add(t.id);
          opts.push({ id: t.id, label: t.name || t.id });
        }
      });
      ((state.catalog && state.catalog.attempts) || []).forEach((a) => {
        if (a && a.testId && !seen.has(a.testId)) {
          seen.add(a.testId);
          opts.push({ id: a.testId, label: a.testName || a.testId });
        }
      });
      filter.innerHTML = opts
        .map(
          (o) =>
            `<option value="${escapeHtml(o.id)}"${o.id === prev ? " selected" : ""}>${escapeHtml(o.label)}</option>`
        )
        .join("");
    }

    const attempts = getAttemptsList();
    listEl.innerHTML = "";
    if (!attempts.length) {
      setStatus(status, "No saved attempts yet.", "");
      return;
    }
    setStatus(
      status,
      attempts.length + " attempt" + (attempts.length === 1 ? "" : "s"),
      "ok"
    );

    attempts.forEach((att) => {
      const score = att.score || {};
      const passed = !!score.passed;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "history-card";
      btn.setAttribute("data-attempt-id", att.id);
      btn.innerHTML =
        `<div class="meta">${escapeHtml(formatDate(att.finishedAt))}` +
        (att.subject ? ` · ${escapeHtml(att.subject)}` : "") +
        `</div>` +
        `<h3>${escapeHtml(att.testName || att.testId || "Attempt")}</h3>` +
        `<div class="chip-row">` +
        `<span class="chip ${passed ? "live" : ""}">${score.percent != null ? score.percent + "%" : "—"}</span>` +
        `<span class="chip ${passed ? "pass" : "fail"}">${passed ? "Passed" : "Did not pass"}</span>` +
        `</div>`;
      btn.addEventListener("click", () => openAttemptDetail(att.id));
      listEl.appendChild(btn);
    });
  }

  async function openHistory() {
    setRoute(null);
    setStatus($("#history-status"), "Loading…", "");
    showScreen("history");
    try {
      const data = await fetchCatalog();
      state.catalog = data;
      state.tests = publishedTests(data);
      renderHistory();
    } catch (err) {
      // public bin — show error on history
      setStatus($("#history-status"), err.message || "Failed to load history.", "err");
      renderHistory();
    }
  }

  function openAttemptDetail(attemptId) {
    const att = ((state.catalog && state.catalog.attempts) || []).find(
      (a) => a && a.id === attemptId
    );
    if (!att) return;
    state.viewingAttempt = att;
    const score = att.score || {};
    $("#detail-title").textContent = att.testName || att.testId || "Attempt";
    $("#detail-meta").textContent =
      [formatDate(att.finishedAt), att.subject, att.topic].filter(Boolean).join(" · ");
    $("#detail-score").textContent =
      (score.percent != null ? score.percent + "%" : "—") +
      (score.passed ? " · Passed" : " · Did not pass");
    $("#detail-summary").textContent =
      `${score.correct != null ? score.correct : "—"} of ${score.total != null ? score.total : "—"} correct` +
      (score.pointsEarned != null
        ? ` · ${score.pointsEarned}/${score.pointsPossible} points`
        : "") +
      (att.durationSec != null ? ` · ${att.durationSec}s` : "");

    const list = $("#detail-answers");
    list.innerHTML = "";
    (att.answers || []).forEach((a, i) => {
      const div = document.createElement("div");
      div.className = "review-item";
      div.innerHTML =
        `<div class="ri-head">` +
        `<span class="ri-num">Q${i + 1}</span>` +
        `<span class="ri-mark ${a.ok ? "ok" : "err"}">${a.ok ? "Correct" : "Missed"}</span>` +
        `</div>` +
        `<div class="ri-prompt">${escapeHtml(a.prompt || a.questionId || "")}</div>` +
        `<div class="ri-line">Your answer: <strong>${escapeHtml(String(a.given == null ? "" : a.given))}</strong></div>` +
        (!a.ok
          ? `<div class="ri-line">Expected: <strong>${escapeHtml(String(a.expected == null ? "" : a.expected))}</strong></div>`
          : "") +
        (a.points != null
          ? `<div class="ri-line">${a.ok ? a.points : 0}/${a.points} pts</div>`
          : "");
      list.appendChild(div);
    });
    setStatus($("#detail-status"), "", "");
    showScreen("history-detail");
  }

  async function deleteViewingAttempt() {
    const att = state.viewingAttempt;
    if (!att || !att.id) return;
    const ok = window.confirm(
      "Delete this attempt from JSONBin? This cannot be undone."
    );
    if (!ok) return;
    setStatus($("#detail-status"), "Deleting…", "");
    try {
      let catalog = state.catalog;
      try {
        catalog = await fetchCatalog();
      } catch (_) {
        if (!catalog) throw new Error("No catalog loaded.");
      }
      const next = (catalog.attempts || []).filter((a) => a && a.id !== att.id);
      catalog.attempts = next;
      await saveCatalog(catalog);
      state.viewingAttempt = null;
      setStatus($("#history-status"), "Attempt deleted.", "ok");
      renderHistory();
      showScreen("history");
    } catch (err) {
      setStatus($("#detail-status"), (err && err.message) || "Delete failed.", "err");
    }
  }

  

  function wireEvents() {
    $$(".filter-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        const next = btn.getAttribute("data-filter") || "todo";
        if (state.catalogFilter === next) return;
        state.catalogFilter = next;
        renderCatalog();
      });
    });

    $("#btn-reload-catalog").addEventListener("click", () => {
      setRoute(null);
      loadCatalogAndRoute();
    });

    $("#btn-open-history").addEventListener("click", () => openHistory());

    $("#btn-start-test").addEventListener("click", startTest);
    $("#btn-intro-back").addEventListener("click", () => {
      setRoute(null);
      showScreen("catalog");
      renderCatalog();
    });

    $("#btn-check").addEventListener("click", checkAnswer);
    $("#btn-next").addEventListener("click", goNext);

    $("#btn-retry").addEventListener("click", () => {
      if (state.currentTest) startTest();
    });
    $("#btn-review").addEventListener("click", renderReview);
    $("#btn-results-home").addEventListener("click", () => {
      setRoute(null);
      // After finishing, default back to To do so completed tests leave the main list
      state.catalogFilter = "todo";
      showScreen("catalog");
      renderCatalog();
    });
    $("#btn-retry-save").addEventListener("click", () => retrySave());

    $("#btn-history-back").addEventListener("click", () => {
      showScreen("catalog");
      renderCatalog();
    });
    $("#btn-history-reload").addEventListener("click", () => openHistory());
    $("#history-filter").addEventListener("change", () => {
      state.historyFilterTestId = $("#history-filter").value || null;
      renderHistory();
    });

    $("#btn-detail-back").addEventListener("click", () => {
      state.viewingAttempt = null;
      renderHistory();
      showScreen("history");
    });
    $("#btn-delete-attempt").addEventListener("click", () => deleteViewingAttempt());



    





    window.addEventListener("hashchange", () => {
      const id = parseRoute();
      if (!id) {
        if (state.catalog) showScreen("catalog");
        return;
      }
      if (state.tests.length) openIntro(id);
    });
  }

  wireEvents();
  loadCatalogAndRoute();
})();
