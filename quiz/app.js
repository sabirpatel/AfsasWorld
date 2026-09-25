/* AfsasWorld Quizzes — JSONBin-backed quiz player */
(function () {
  "use strict";

  const BIN_ID = "6ab6df70ac6210605af59ddd";
  const BIN_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}/latest?meta=false`;
  const KEY_STORAGE = "afsa_jsonbin_key";

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
    returnScreen: "catalog",
  };

  function showScreen(name) {
    $$(".screen").forEach((el) => el.classList.remove("active"));
    const screen = $(`#screen-${name}`);
    if (screen) screen.classList.add("active");
  }

  function setStatus(el, msg, kind) {
    if (!el) return;
    el.textContent = msg || "";
    el.classList.remove("ok", "err");
    if (kind) el.classList.add(kind);
  }

  function getStoredKey() {
    try {
      return localStorage.getItem(KEY_STORAGE) || "";
    } catch (_) {
      return "";
    }
  }

  function setStoredKey(key) {
    try {
      if (key) localStorage.setItem(KEY_STORAGE, key);
      else localStorage.removeItem(KEY_STORAGE);
    } catch (_) { /* ignore */ }
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

  async function fetchCatalog() {
    const headers = { Accept: "application/json" };
    const key = getStoredKey();
    if (key) {
      // Support either master or access key depending on what parent pasted
      headers["X-Master-Key"] = key;
      headers["X-Access-Key"] = key;
    }
    const res = await fetch(BIN_URL, { headers, cache: "no-store" });
    if (res.status === 401 || res.status === 403) {
      const err = new Error("JSONBin returned " + res.status + ". Add a key in Settings if the bin is private.");
      err.code = res.status;
      throw err;
    }
    if (!res.ok) {
      throw new Error("Could not load catalog (HTTP " + res.status + ").");
    }
    return res.json();
  }

  function publishedTests(catalog) {
    const list = (catalog && Array.isArray(catalog.tests) ? catalog.tests : [])
      .filter((t) => t && t.status === "published")
      .slice()
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    return list;
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

    listEl.innerHTML = "";
    if (!state.tests.length) {
      setStatus(status, "No published tests yet.", "");
      return;
    }
    setStatus(status, state.tests.length + " published test" + (state.tests.length === 1 ? "" : "s"), "ok");

    state.tests.forEach((t) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "test-card";
      btn.setAttribute("data-test-id", t.id);
      const qCount = Array.isArray(t.questions) ? t.questions.length : 0;
      btn.innerHTML =
        `<div class="meta">${escapeHtml(t.subject || "General")}` +
        (t.topic ? ` · ${escapeHtml(t.topic)}` : "") +
        `</div>` +
        `<h3>${escapeHtml(t.name || t.id)}</h3>` +
        `<p>${escapeHtml(t.description || "")}</p>` +
        `<div class="chip-row">` +
        `<span class="chip live">Published</span>` +
        `<span class="chip">${qCount} question${qCount === 1 ? "" : "s"}</span>` +
        `</div>`;
      btn.addEventListener("click", () => openIntro(t.id));
      listEl.appendChild(btn);
    });
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  async function loadCatalogAndRoute() {
    const status = $("#catalog-status");
    setStatus(status, "Loading catalog…", "");
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
    renderQuestion();
    showScreen("question");
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
    $("#q-points-label").textContent = q.points != null ? `${q.points} pt${q.points === 1 ? "" : "s"}` : "";
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
      // numeric or short_answer
      const input = document.createElement("input");
      input.type = q.type === "numeric" ? "text" : "text";
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
        if (normalizeText(a) === text || normalizeText(a).replace(/\s*=\s*/g, "=") === text.replace(/\s*=\s*/g, "=")) {
          return { ok: true, given: raw, expected: ans.value };
        }
      }
      // Extract first number-like token
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
    // short_answer
    const text = normalizeText(raw);
    const accept = Array.isArray(ans.accept) ? ans.accept : [];
    const match = ans.match || "contains";
    let ok = false;
    for (const a of accept) {
      const na = normalizeText(a);
      if (!na) continue;
      if (match === "exact") {
        if (text === na) { ok = true; break; }
      } else {
        if (text.includes(na) || na.includes(text)) { ok = true; break; }
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

    // Visual for choices
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
    $("#q-progress-fill").style.width = `${(state.index + 1) / total * 100}%`;
  }

  function goNext() {
    if (state.index + 1 >= state.queue.length) {
      showResults();
    } else {
      state.index += 1;
      renderQuestion();
    }
  }

  function showResults() {
    const answers = state.answers;
    const earned = answers.reduce((s, a) => s + (a.ok ? a.points : 0), 0);
    const possible = answers.reduce((s, a) => s + a.points, 0) || 1;
    const pct = Math.round((earned / possible) * 100);
    const settings = (state.currentTest && state.currentTest.settings) || {};
    const passAt = settings.passingScorePercent != null ? Number(settings.passingScorePercent) : 70;
    const passed = pct >= passAt;

    $("#results-emoji").textContent = passed ? "🎉" : "💪";
    $("#results-title").textContent = passed ? "You passed!" : "Keep practicing";
    $("#results-score").textContent = `${pct}%`;
    $("#results-summary").textContent =
      `${earned} of ${possible} points · passing is ${passAt}%` +
      (state.currentTest ? ` · ${state.currentTest.name}` : "");

    const retryBtn = $("#btn-retry");
    if (settings.allowRetry) retryBtn.classList.remove("hidden");
    else retryBtn.classList.add("hidden");

    $("#review-list").classList.add("hidden");
    $("#review-list").innerHTML = "";
    showScreen("results");
  }

  function renderReview() {
    const list = $("#review-list");
    list.innerHTML = "";
    state.answers.forEach((a, i) => {
      const div = document.createElement("div");
      div.className = "review-item";
      let givenStr = formatGiven(a);
      let expectedStr = formatExpected(a);
      div.innerHTML =
        `<div class="ri-head">` +
        `<span class="ri-num">Q${i + 1} · ${escapeHtml(typeLabel(a.type))}</span>` +
        `<span class="ri-mark ${a.ok ? "ok" : "err"}">${a.ok ? "Correct" : "Missed"}</span>` +
        `</div>` +
        `<div class="ri-prompt">${escapeHtml(a.prompt || "")}</div>` +
        (a.promptDetail ? `<div class="ri-line" style="font-family:var(--mono);margin-bottom:0.35rem">${escapeHtml(a.promptDetail)}</div>` : "") +
        `<div class="ri-line">Your answer: <strong>${escapeHtml(givenStr)}</strong></div>` +
        (!a.ok ? `<div class="ri-line">Expected: <strong>${escapeHtml(expectedStr)}</strong></div>` : "") +
        (a.explanation ? `<div class="ri-explain">${escapeHtml(a.explanation)}</div>` : "");
      list.appendChild(div);
    });
    list.classList.remove("hidden");
  }

  function formatGiven(a) {
    if (a.type === "true_false") return a.given === true || a.given === "true" ? "True" : "False";
    if (a.type === "multiple_choice") {
      const q = state.queue.find((x) => x.id === a.questionId);
      const choice = q && (q.choices || []).find((c) => c.id === a.given);
      return choice ? choice.text : String(a.given);
    }
    return String(a.given == null ? "" : a.given);
  }

  function formatExpected(a) {
    if (a.type === "true_false") return a.expected ? "True" : "False";
    if (a.type === "multiple_choice") {
      const q = state.queue.find((x) => x.id === a.questionId) ||
        (state.currentTest && (state.currentTest.questions || []).find((x) => x.id === a.questionId));
      const choice = q && (q.choices || []).find((c) => c.id === a.expected);
      return choice ? choice.text : String(a.expected);
    }
    return String(a.expected == null ? "" : a.expected);
  }

  function wireEvents() {
    $("#btn-reload-catalog").addEventListener("click", () => {
      setRoute(null);
      loadCatalogAndRoute();
    });

    $("#btn-start-test").addEventListener("click", startTest);
    $("#btn-intro-back").addEventListener("click", () => {
      setRoute(null);
      showScreen("catalog");
    });

    $("#btn-check").addEventListener("click", checkAnswer);
    $("#btn-next").addEventListener("click", goNext);

    $("#btn-retry").addEventListener("click", () => {
      if (state.currentTest) startTest();
    });
    $("#btn-review").addEventListener("click", renderReview);
    $("#btn-results-home").addEventListener("click", () => {
      setRoute(null);
      showScreen("catalog");
    });

    $("#btn-settings").addEventListener("click", () => {
      state.returnScreen =
        $("#screen-catalog").classList.contains("active") ? "catalog" :
        $("#screen-intro").classList.contains("active") ? "intro" :
        $("#screen-results").classList.contains("active") ? "results" :
        $("#screen-question").classList.contains("active") ? "question" : "catalog";
      const key = getStoredKey();
      $("#jsonbin-key").value = "";
      setStatus(
        $("#settings-status"),
        key ? "A key is saved on this device." : "No key saved — public reads work without one.",
        key ? "ok" : ""
      );
      showScreen("settings");
    });

    $("#btn-settings-back").addEventListener("click", () => {
      showScreen(state.returnScreen || "catalog");
    });

    $("#btn-save-settings").addEventListener("click", () => {
      const val = ($("#jsonbin-key").value || "").trim();
      if (!val) {
        setStatus($("#settings-status"), "Paste a key to save, or use Clear key.", "err");
        return;
      }
      setStoredKey(val);
      $("#jsonbin-key").value = "";
      setStatus($("#settings-status"), "Saved on this device. Reloading catalog…", "ok");
      loadCatalogAndRoute();
    });

    $("#btn-clear-key").addEventListener("click", () => {
      setStoredKey("");
      $("#jsonbin-key").value = "";
      setStatus($("#settings-status"), "Key cleared from this device.", "");
      loadCatalogAndRoute();
    });

    window.addEventListener("hashchange", () => {
      const id = parseRoute();
      if (!id) {
        showScreen("catalog");
        return;
      }
      if (state.tests.length) openIntro(id);
    });
  }

  wireEvents();
  loadCatalogAndRoute();
})();
