/**
 * Afsa Helper · Algebra
 * Adaptive algebra practice for middle school (levels 1–6)
 */
(function () {
  "use strict";

  const STORAGE_KEY = "afsa-algebra-v1";
  const PLACEMENT_LEN = 6;
  const PRACTICE_LEN = 10;

  const LEVEL_NAMES = [
    "",
    "One-step equations",
    "Two-step equations",
    "Both sides / distribute",
    "Fractions / clear denominators",
    "Rational: variable in denominator",
    "Harder rationals & checks",
  ];

  const ENCOURAGE_RIGHT = [
    "Nice work!",
    "You got it!",
    "Solid!",
    "That's right — keep going!",
    "Excellent!",
    "You're on a roll!",
    "Sharp thinking!",
  ];

  const ENCOURAGE_WRONG = [
    "No worries — let's break it down.",
    "Almost! Here's how to think about it.",
    "Mistakes help you learn. Check this out:",
    "Let's walk through it together.",
  ];

  // ─── State ───────────────────────────────────────────────
  let state = {
    name: "Afsa",
    level: 3,
    mode: "welcome", // welcome | placement | practice | summary | example
    placementIndex: 0,
    practiceIndex: 0,
    placementResults: [],
    practiceResults: [],
    streak: 0,
    bestStreak: 0,
    correctInRow: 0,
    wrongInRow: 0,
    totalCorrect: 0,
    totalAnswered: 0,
    currentQ: null,
    answered: false,
    questionStart: 0,
    lastConfidence: null,
    sessionsCompleted: 0,
  };

  // ─── Utilities ───────────────────────────────────────────
  function randInt(a, b) {
    return Math.floor(Math.random() * (b - a + 1)) + a;
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function gcd(a, b) {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b) {
      const t = b;
      b = a % b;
      a = t;
    }
    return a || 1;
  }

  function formatEq(s) {
    return s.replace(/\*/g, "·");
  }

  function parseAnswer(raw) {
    if (raw == null) return null;
    let s = String(raw).trim().replace(/\s+/g, "");
    if (s === "") return null;
    // Allow x=12 or =12
    s = s.replace(/^[xX]=/, "").replace(/^=/, "");
    if (/^-?\d+$/.test(s)) return parseInt(s, 10);
    // Simple fractions like 3/2 (optional)
    const m = s.match(/^(-?\d+)\/(-?\d+)$/);
    if (m) {
      const num = parseInt(m[1], 10);
      const den = parseInt(m[2], 10);
      if (den === 0) return NaN;
      if (num % den === 0) return num / den;
      return num / den; // keep as float for compare with tolerance
    }
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  function answersEqual(a, b) {
    if (a == null || b == null || Number.isNaN(a) || Number.isNaN(b)) return false;
    if (Number.isInteger(a) && Number.isInteger(b)) return a === b;
    return Math.abs(a - b) < 1e-9;
  }

  // ─── Question generators (levels 1–6) ────────────────────
  // Each returns: { level, topic, display, answer, excluded, steps, similarHint }

  function genLevel1() {
    const type = pick(["add", "sub", "mul", "div"]);
    if (type === "add") {
      const a = randInt(2, 20);
      const x = randInt(1, 25);
      const b = x + a;
      return {
        level: 1,
        topic: "One-step (addition)",
        display: `x + ${a} = ${b}`,
        answer: x,
        excluded: null,
        steps: [
          `We want x alone. Subtract ${a} from both sides.`,
          `${b} − ${a} = ${x}`,
          `So x = ${x}.`,
        ],
      };
    }
    if (type === "sub") {
      const a = randInt(2, 15);
      const x = randInt(a + 1, 30);
      const b = x - a;
      return {
        level: 1,
        topic: "One-step (subtraction)",
        display: `x − ${a} = ${b}`,
        answer: x,
        excluded: null,
        steps: [
          `Add ${a} to both sides to undo the subtraction.`,
          `${b} + ${a} = ${x}`,
          `So x = ${x}.`,
        ],
      };
    }
    if (type === "mul") {
      const a = pick([2, 3, 4, 5, 6, 7, 8]);
      const x = randInt(2, 12);
      const b = a * x;
      return {
        level: 1,
        topic: "One-step (multiplication)",
        display: `${a}x = ${b}`,
        answer: x,
        excluded: null,
        steps: [
          `Divide both sides by ${a}.`,
          `${b} ÷ ${a} = ${x}`,
          `So x = ${x}.`,
        ],
      };
    }
    // div: x/a = b
    const a = pick([2, 3, 4, 5]);
    const x = a * randInt(2, 10);
    const b = x / a;
    return {
      level: 1,
      topic: "One-step (division)",
      display: `x/${a} = ${b}`,
      answer: x,
      excluded: null,
      steps: [
        `Multiply both sides by ${a}.`,
        `${b} × ${a} = ${x}`,
        `So x = ${x}.`,
      ],
    };
  }

  function genLevel2() {
    const a = pick([2, 3, 4, 5, 6]);
    const b = randInt(1, 12);
    const x = randInt(2, 12);
    const useAdd = Math.random() < 0.5;
    if (useAdd) {
      const c = a * x + b;
      return {
        level: 2,
        topic: "Two-step equation",
        display: `${a}x + ${b} = ${c}`,
        answer: x,
        excluded: null,
        steps: [
          `Subtract ${b} from both sides: ${a}x = ${c - b}.`,
          `Divide both sides by ${a}: x = ${(c - b) / a}.`,
          `Check: ${a}(${x}) + ${b} = ${c}. ✓`,
        ],
      };
    }
    const c = a * x - b;
    // Prefer positive c for friendliness
    if (c <= 0) return genLevel2();
    return {
      level: 2,
      topic: "Two-step equation",
      display: `${a}x − ${b} = ${c}`,
      answer: x,
      excluded: null,
      steps: [
        `Add ${b} to both sides: ${a}x = ${c + b}.`,
        `Divide both sides by ${a}: x = ${(c + b) / a}.`,
        `Check: ${a}(${x}) − ${b} = ${c}. ✓`,
      ],
    };
  }

  function genLevel3() {
    const type = pick(["both", "both", "distribute"]);
    if (type === "both") {
      // ax + b = cx + d  →  (a-c)x = d-b
      let a = randInt(3, 8);
      let c = randInt(1, a - 1);
      const x = randInt(2, 10);
      const b = randInt(1, 15);
      const d = (a - c) * x + b;
      return {
        level: 3,
        topic: "Variables on both sides",
        display: `${a}x + ${b} = ${c}x + ${d}`,
        answer: x,
        excluded: null,
        steps: [
          `Subtract ${c}x from both sides: ${a - c}x + ${b} = ${d}.`,
          `Subtract ${b} from both sides: ${a - c}x = ${d - b}.`,
          `Divide by ${a - c}: x = ${x}.`,
        ],
      };
    }
    // distribute: a(x + b) = c
    const a = pick([2, 3, 4, 5]);
    const b = randInt(1, 8);
    const x = randInt(1, 10);
    const c = a * (x + b);
    return {
      level: 3,
      topic: "Distribute then solve",
      display: `${a}(x + ${b}) = ${c}`,
      answer: x,
      excluded: null,
      steps: [
        `Distribute: ${a}x + ${a * b} = ${c}.`,
        `Subtract ${a * b}: ${a}x = ${c - a * b}.`,
        `Divide by ${a}: x = ${x}.`,
      ],
    };
  }

  function genLevel4() {
    // Clear denominators: x/a + b = c  or  x/a + x/d = ...
    const type = pick(["simple", "simple", "twofrac"]);
    if (type === "simple") {
      const a = pick([2, 3, 4, 5]);
      const b = randInt(1, 8);
      const x = a * randInt(2, 8);
      const c = x / a + b;
      return {
        level: 4,
        topic: "Equation with a fraction",
        display: `x/${a} + ${b} = ${c}`,
        answer: x,
        excluded: null,
        steps: [
          `Subtract ${b} from both sides: x/${a} = ${c - b}.`,
          `Multiply both sides by ${a}: x = ${(c - b) * a}.`,
          `So x = ${x}.`,
        ],
      };
    }
    // x/2 + x/3 = k  →  clear with LCD
    const a = 2;
    const b = 3;
    const x = 6 * randInt(1, 5); // divisible by 6 for integer
    const k = x / a + x / b;
    return {
      level: 4,
      topic: "Clear denominators",
      display: `x/${a} + x/${b} = ${k}`,
      answer: x,
      excluded: null,
      steps: [
        `LCD of ${a} and ${b} is 6. Multiply every term by 6.`,
        `6·(x/${a}) + 6·(x/${b}) = 6·${k} → ${6 / a}x + ${6 / b}x = ${6 * k}.`,
        `${6 / a + 6 / b}x = ${6 * k} → x = ${x}.`,
      ],
    };
  }

  function genLevel5() {
    // a/(x - b) = c  →  a = c(x - b) → x = a/c + b
    // Choose so answer is integer and x ≠ b
    const c = pick([2, 3, 4, 5, 6, 7, 8, 10, 12, 17]);
    const b = randInt(2, 15);
    // a must be divisible by c for integer x
    const mult = randInt(2, 25);
    const a = c * mult;
    // Avoid a = 0 edge
    const x = mult + b; // since a/c + b = mult + b
    // Ensure x ≠ b (always true if mult ≠ 0)
    if (x === b) return genLevel5();

    return {
      level: 5,
      topic: "Rational equation (variable in denominator)",
      display: `${a}/(x − ${b}) = ${c}`,
      answer: x,
      excluded: b,
      steps: [
        `Note: x ≠ ${b} (denominator can't be zero).`,
        `Multiply both sides by (x − ${b}): ${a} = ${c}(x − ${b}).`,
        `Divide both sides by ${c}: ${a}/${c} = x − ${b} → ${mult} = x − ${b}.`,
        `Add ${b}: x = ${mult} + ${b} = ${x}.`,
      ],
    };
  }

  function genLevel6() {
    const type = pick(["neg", "numx", "check", "rational"]);
    if (type === "neg" || type === "rational") {
      // a/(x - b) = c with possible negatives
      const c = pick([-5, -4, -3, -2, 2, 3, 4, 5, -6, 6]);
      const b = randInt(-8, 12);
      const mult = randInt(2, 12) * (Math.random() < 0.3 ? -1 : 1);
      const a = c * mult;
      const x = mult + b;
      if (x === b || a === 0) return genLevel6();
      const bDisp = b < 0 ? `x + ${-b}` : `x − ${b}`;
      return {
        level: 6,
        topic: "Harder rational (watch signs)",
        display: `${a}/(${bDisp}) = ${c}`,
        answer: x,
        excluded: b,
        steps: [
          `Excluded value: x ≠ ${b} (makes denominator 0).`,
          `Multiply both sides by the denominator: ${a} = ${c}(${bDisp}).`,
          `${a}/${c} = ${bDisp} → ${mult} = ${bDisp}.`,
          `Solve: x = ${x}. Always check it isn't the excluded value.`,
        ],
      };
    }
    if (type === "numx") {
      // (x + a)/(x - b) = c  → x + a = c(x - b) → x - c x = -c b - a → x(1-c) = ...
      const c = pick([2, 3, 4, 5]);
      const b = randInt(1, 8);
      // pick x ≠ b, then compute a so it works
      let x = randInt(b + 2, b + 12);
      // (x+a) = c(x-b) → a = c(x-b) - x
      const a = c * (x - b) - x;
      const aDisp = a >= 0 ? `x + ${a}` : `x − ${-a}`;
      return {
        level: 6,
        topic: "x in numerator and denominator",
        display: `(${aDisp})/(x − ${b}) = ${c}`,
        answer: x,
        excluded: b,
        steps: [
          `x ≠ ${b}. Multiply both sides by (x − ${b}).`,
          `${aDisp} = ${c}(x − ${b}) = ${c}x − ${c * b}.`,
          `Collect x terms: x − ${c}x = ${-c * b} − (${a}) → ${1 - c}x = ${-c * b - a}.`,
          `x = ${x}. Check: plug in and confirm denominator ≠ 0.`,
        ],
      };
    }
    // check type: similar to level 5 but emphasize verification
    const c = pick([3, 4, 5, 6, 8]);
    const b = randInt(3, 14);
    const mult = randInt(3, 20);
    const a = c * mult;
    const x = mult + b;
    return {
      level: 6,
      topic: "Solve & check for undefined",
      display: `${a}/(x − ${b}) = ${c}`,
      answer: x,
      excluded: b,
      steps: [
        `First note the excluded value: x ≠ ${b}.`,
        `Cross-multiply idea: ${a} = ${c}(x − ${b}).`,
        `x − ${b} = ${mult} → x = ${x}.`,
        `Check: ${x} ≠ ${b}, and ${a}/(${x}−${b}) = ${a}/${mult} = ${c}. ✓`,
      ],
    };
  }

  const GENERATORS = [null, genLevel1, genLevel2, genLevel3, genLevel4, genLevel5, genLevel6];

  function generateQuestion(level) {
    level = Math.max(1, Math.min(6, level | 0));
    let q = GENERATORS[level]();
    // Safety retries if somehow invalid
    for (let i = 0; i < 5 && (!q || q.answer === q.excluded); i++) {
      q = GENERATORS[level]();
    }
    q.id = Date.now() + "-" + Math.random().toString(36).slice(2, 7);
    return q;
  }

  function workedExample(level) {
    const q = generateQuestion(Math.max(1, level));
    return q;
  }

  // ─── Placement set ───────────────────────────────────────
  function buildPlacement() {
    // ~6 questions across bands: 1,2,3,4,5,5 (emphasize rational)
    const levels = [1, 2, 3, 4, 5, 5];
    return levels.map((lv) => generateQuestion(lv));
  }

  function estimateLevelFromPlacement(results) {
    // results: [{level, correct}]
    if (!results.length) return 3;
    let score = 0;
    let weight = 0;
    results.forEach((r) => {
      const w = r.level >= 5 ? 1.4 : 1;
      weight += w;
      if (r.correct) score += r.level * w;
      else score += Math.max(1, r.level - 1) * 0.35 * w;
    });
    let est = Math.round(score / weight);
    // If last (hard) ones wrong, bias down; if all correct bias up
    const hard = results.filter((r) => r.level >= 5);
    const hardOk = hard.filter((r) => r.correct).length;
    if (hard.length && hardOk === 0) est = Math.min(est, 4);
    if (hard.length && hardOk === hard.length && results.every((r) => r.correct)) est = 6;
    return Math.max(1, Math.min(6, est));
  }

  // ─── Persistence ─────────────────────────────────────────
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.name) state.name = data.name;
      if (data.level) state.level = data.level;
      if (typeof data.bestStreak === "number") state.bestStreak = data.bestStreak;
      if (typeof data.totalCorrect === "number") state.totalCorrect = data.totalCorrect;
      if (typeof data.totalAnswered === "number") state.totalAnswered = data.totalAnswered;
      if (typeof data.sessionsCompleted === "number") state.sessionsCompleted = data.sessionsCompleted;
    } catch (_) { /* ignore */ }
  }

  function save() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          name: state.name,
          level: state.level,
          bestStreak: state.bestStreak,
          totalCorrect: state.totalCorrect,
          totalAnswered: state.totalAnswered,
          sessionsCompleted: state.sessionsCompleted,
        })
      );
    } catch (_) { /* ignore */ }
  }

  function resetProgress() {
    localStorage.removeItem(STORAGE_KEY);
    state.level = 3;
    state.streak = 0;
    state.bestStreak = 0;
    state.totalCorrect = 0;
    state.totalAnswered = 0;
    state.sessionsCompleted = 0;
    state.correctInRow = 0;
    state.wrongInRow = 0;
  }

  // ─── Adaptive rules ──────────────────────────────────────
  function adaptAfterAnswer(correct, fast) {
    if (correct) {
      state.correctInRow++;
      state.wrongInRow = 0;
      state.streak++;
      if (state.streak > state.bestStreak) state.bestStreak = state.streak;
      // 2 correct in a row → bump (especially if fast/confident)
      const need = fast || state.lastConfidence === "sure" ? 2 : 2;
      if (state.correctInRow >= need) {
        if (state.level < 6) {
          state.level++;
          state.correctInRow = 0;
        }
      }
    } else {
      state.wrongInRow++;
      state.correctInRow = 0;
      state.streak = 0;
      if (state.wrongInRow >= 2) {
        if (state.level > 1) state.level--;
        state.wrongInRow = 0;
        return "show_example";
      }
      // 1 wrong → stay or soft drop if at high level recently struggling
      // stay by default
    }
    return null;
  }

  // ─── DOM refs ────────────────────────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const screens = {
    welcome: $("#screen-welcome"),
    placement: $("#screen-placement"),
    practice: $("#screen-practice"),
    summary: $("#screen-summary"),
    example: $("#screen-example"),
  };

  function showScreen(name) {
    state.mode = name;
    Object.keys(screens).forEach((k) => {
      screens[k].classList.toggle("active", k === name);
    });
    updateHeaderStats();
  }

  function updateHeaderStats() {
    const streakEl = $("#stat-streak");
    const levelEl = $("#stat-level");
    const accEl = $("#stat-acc");
    if (streakEl) streakEl.innerHTML = `🔥 <strong>${state.streak}</strong>`;
    if (levelEl)
      levelEl.innerHTML = `Level <strong>${state.level}</strong>/6`;
    if (accEl) {
      const pct =
        state.totalAnswered > 0
          ? Math.round((100 * state.totalCorrect) / state.totalAnswered)
          : "—";
      accEl.innerHTML = `Accuracy <strong>${pct}${pct === "—" ? "" : "%"}</strong>`;
    }
    // Hide stats on welcome
    const bar = $("#stats-bar");
    if (bar) bar.classList.toggle("hidden", state.mode === "welcome");
  }

  function renderLevelDots(container, current) {
    if (!container) return;
    container.innerHTML = "";
    for (let i = 1; i <= 6; i++) {
      const d = document.createElement("span");
      d.className = "level-dot" + (i <= current ? " on" : "") + (i === current ? " current" : "");
      d.title = LEVEL_NAMES[i];
      container.appendChild(d);
    }
  }

  // Placement questions held in memory
  let placementQs = [];
  let pendingExample = null;

  function startPlacement() {
    const nameInput = $("#name-input");
    if (nameInput && nameInput.value.trim()) {
      state.name = nameInput.value.trim();
    }
    save();
    placementQs = buildPlacement();
    state.placementIndex = 0;
    state.placementResults = [];
    state.streak = 0;
    state.correctInRow = 0;
    state.wrongInRow = 0;
    showScreen("placement");
    showQuestion("placement");
  }

  function startPractice(skipPlacement) {
    const nameInput = $("#name-input");
    if (nameInput && nameInput.value.trim()) {
      state.name = nameInput.value.trim();
    }
    save();
    state.practiceIndex = 0;
    state.practiceResults = [];
    state.streak = 0;
    state.correctInRow = 0;
    state.wrongInRow = 0;
    showScreen("practice");
    showQuestion("practice");
  }

  function showQuestion(mode) {
    state.answered = false;
    state.lastConfidence = null;
    state.questionStart = Date.now();

    let q;
    if (mode === "placement") {
      q = placementQs[state.placementIndex];
    } else {
      q = generateQuestion(state.level);
      // Bias toward level 5 if she's around there and needs practice
      if (state.level === 4 && Math.random() < 0.25) q = generateQuestion(5);
      if (state.level === 6 && Math.random() < 0.35) q = generateQuestion(5);
    }
    state.currentQ = q;

    const prefix = mode === "placement" ? "p" : "q";
    const total = mode === "placement" ? PLACEMENT_LEN : PRACTICE_LEN;
    const idx = mode === "placement" ? state.placementIndex : state.practiceIndex;

    $(`#${prefix}-mode-badge`).textContent =
      mode === "placement" ? "Placement check" : "Practice";
    $(`#${prefix}-mode-badge`).className =
      "mode-badge" + (mode === "placement" ? " placement" : "");
    $(`#${prefix}-progress-label`).textContent =
      mode === "placement"
        ? `Question ${idx + 1} of ${total}`
        : `Question ${idx + 1} of ${total}`;
    $(`#${prefix}-progress-fill`).style.width = `${((idx) / total) * 100}%`;
    $(`#${prefix}-topic`).textContent = q.topic;
    $(`#${prefix}-equation`).textContent = formatEq(q.display);
    const excl = $(`#${prefix}-excluded`);
    if (q.excluded != null) {
      excl.textContent = `Remember: x ≠ ${q.excluded} (undefined)`;
      excl.classList.remove("hidden");
    } else {
      excl.classList.add("hidden");
    }

    const input = $(`#${prefix}-answer`);
    input.value = "";
    input.disabled = false;
    input.focus();

    $(`#${prefix}-feedback`).className = "feedback";
    $(`#${prefix}-feedback`).innerHTML = "";
    $(`#${prefix}-actions-answer`).classList.remove("hidden");
    $(`#${prefix}-actions-next`).classList.add("hidden");

    renderLevelDots($(`#${prefix}-dots`), mode === "placement" ? q.level : state.level);
    $(`#${prefix}-level-name`).textContent =
      mode === "placement"
        ? `Exploring: ${LEVEL_NAMES[q.level]}`
        : `Your level: ${state.level} — ${LEVEL_NAMES[state.level]}`;

    // Greeting
    const greet = $(`#${prefix}-greet`);
    if (greet) {
      greet.textContent =
        mode === "placement"
          ? `Hi ${state.name}! Quick check so we start in the right place.`
          : `Let's practice, ${state.name}. You've got this.`;
    }
  }

  function submitAnswer(mode) {
    if (state.answered) return;
    const prefix = mode === "placement" ? "p" : "q";
    const input = $(`#${prefix}-answer`);
    const raw = input.value;
    const parsed = parseAnswer(raw);
    const q = state.currentQ;

    if (parsed === null || Number.isNaN(parsed)) {
      input.focus();
      input.style.borderColor = "var(--error)";
      setTimeout(() => (input.style.borderColor = ""), 600);
      return;
    }

    state.answered = true;
    input.disabled = true;
    const elapsed = Date.now() - state.questionStart;
    const fast = elapsed < 25000; // under 25s feels confident/quick

    // Division by zero / excluded value
    if (q.excluded != null && answersEqual(parsed, q.excluded)) {
      showFeedback(prefix, "undefined", q, parsed);
      // Count as incorrect for adaptive
      recordResult(mode, false, q);
      if (mode === "practice") {
        const action = adaptAfterAnswer(false, false);
        if (action === "show_example") pendingExample = workedExample(state.level);
      }
      $(`#${prefix}-actions-answer`).classList.add("hidden");
      $(`#${prefix}-actions-next`).classList.remove("hidden");
      updateHeaderStats();
      save();
      return;
    }

    const correct = answersEqual(parsed, q.answer);
    showFeedback(prefix, correct ? "correct" : "incorrect", q, parsed);
    recordResult(mode, correct, q);

    if (mode === "practice") {
      const action = adaptAfterAnswer(correct, fast);
      if (action === "show_example") pendingExample = workedExample(Math.max(1, state.level));
    }

    $(`#${prefix}-actions-answer`).classList.add("hidden");
    $(`#${prefix}-actions-next`).classList.remove("hidden");
    // Update progress fill to include current
    const total = mode === "placement" ? PLACEMENT_LEN : PRACTICE_LEN;
    const idx = mode === "placement" ? state.placementIndex : state.practiceIndex;
    $(`#${prefix}-progress-fill`).style.width = `${((idx + 1) / total) * 100}%`;

    updateHeaderStats();
    save();
  }

  function recordResult(mode, correct, q) {
    state.totalAnswered++;
    if (correct) state.totalCorrect++;
    const entry = { level: q.level, correct, topic: q.topic, display: q.display };
    if (mode === "placement") state.placementResults.push(entry);
    else state.practiceResults.push(entry);
  }

  function showFeedback(prefix, kind, q, userAns) {
    const box = $(`#${prefix}-feedback`);
    box.className = "feedback show " + kind;

    let title, body;
    if (kind === "correct") {
      title = "✓ " + pick(ENCOURAGE_RIGHT);
      body = `<p>x = <strong>${q.answer}</strong> is correct.</p>`;
      if (q.excluded != null) {
        body += `<p class="encouragement">And you avoided the undefined value x = ${q.excluded}. Nice.</p>`;
      }
    } else if (kind === "undefined") {
      title = "⚠ That value makes it undefined";
      body = `<p>If x = ${q.excluded}, the denominator is zero — the expression isn't defined.</p>`;
      body += `<p>We need a different number. Here's how to solve it:</p>`;
      body += `<ol class="steps">${q.steps.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ol>`;
      body += `<p class="encouragement">The solution is x = <strong>${q.answer}</strong> (and x ≠ ${q.excluded}).</p>`;
    } else {
      title = pick(ENCOURAGE_WRONG);
      body = `<p>You entered <strong>${userAns}</strong>. The correct answer is x = <strong>${q.answer}</strong>.</p>`;
      body += `<ol class="steps">${q.steps.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ol>`;
      body += `<p class="encouragement">Try the next one — similar ideas build muscle memory.</p>`;
    }

    box.innerHTML = `<div class="feedback-title">${title}</div>${body}`;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function nextQuestion(mode) {
    if (pendingExample && mode === "practice") {
      showWorkedExample(pendingExample);
      pendingExample = null;
      return;
    }

    if (mode === "placement") {
      state.placementIndex++;
      if (state.placementIndex >= PLACEMENT_LEN) {
        finishPlacement();
        return;
      }
      showQuestion("placement");
    } else {
      state.practiceIndex++;
      if (state.practiceIndex >= PRACTICE_LEN) {
        finishPractice();
        return;
      }
      showQuestion("practice");
    }
  }

  function trySimilar(mode) {
    // Stay on same level, generate similar (same level), don't advance index
    state.answered = false;
    const q = generateQuestion(state.currentQ.level);
    state.currentQ = q;
    state.questionStart = Date.now();
    const prefix = mode === "placement" ? "p" : "q";
    $(`#${prefix}-equation`).textContent = formatEq(q.display);
    $(`#${prefix}-topic`).textContent = q.topic + " (similar)";
    const excl = $(`#${prefix}-excluded`);
    if (q.excluded != null) {
      excl.textContent = `Remember: x ≠ ${q.excluded} (undefined)`;
      excl.classList.remove("hidden");
    } else {
      excl.classList.add("hidden");
    }
    const input = $(`#${prefix}-answer`);
    input.value = "";
    input.disabled = false;
    input.focus();
    $(`#${prefix}-feedback`).className = "feedback";
    $(`#${prefix}-feedback`).innerHTML = "";
    $(`#${prefix}-actions-answer`).classList.remove("hidden");
    $(`#${prefix}-actions-next`).classList.add("hidden");
  }

  function finishPlacement() {
    const est = estimateLevelFromPlacement(state.placementResults);
    state.level = est;
    save();
    // Brief result then practice
    const correct = state.placementResults.filter((r) => r.correct).length;
    $("#summary-title").textContent = `Nice check-in, ${state.name}!`;
    $("#summary-lead").textContent =
      `You got ${correct} of ${PLACEMENT_LEN} on the placement. We'll start practice at Level ${est}.`;
    renderSummaryStats(state.placementResults, est);
    $("#summary-review").innerHTML = buildReviewHtml(state.placementResults);
    $("#btn-summary-continue").textContent = "Start practice →";
    $("#btn-summary-continue").onclick = () => startPractice(true);
    showScreen("summary");
  }

  function finishPractice() {
    state.sessionsCompleted++;
    save();
    const correct = state.practiceResults.filter((r) => r.correct).length;
    const acc = Math.round((100 * correct) / Math.max(1, state.practiceResults.length));
    $("#summary-title").textContent = `Session complete, ${state.name}!`;
    $("#summary-lead").textContent =
      acc >= 80
        ? `Strong session — ${correct}/${PRACTICE_LEN} correct (${acc}%). You're building real algebra power.`
        : acc >= 60
          ? `Solid effort — ${correct}/${PRACTICE_LEN} correct (${acc}%). Review the notes below and try another round.`
          : `You finished ${correct}/${PRACTICE_LEN} correct (${acc}%). Every miss is a map of what to practice next.`;
    renderSummaryStats(state.practiceResults, state.level);
    $("#summary-review").innerHTML = buildReviewHtml(state.practiceResults);
    $("#btn-summary-continue").textContent = "Practice again →";
    $("#btn-summary-continue").onclick = () => startPractice(true);
    showScreen("summary");
  }

  function renderSummaryStats(results, level) {
    const correct = results.filter((r) => r.correct).length;
    const acc = results.length ? Math.round((100 * correct) / results.length) : 0;
    $("#sum-correct").textContent = `${correct}/${results.length}`;
    $("#sum-accuracy").textContent = `${acc}%`;
    $("#sum-level").textContent = `${level}`;
    $("#sum-streak").textContent = `${state.bestStreak}`;
    renderLevelDots($("#sum-dots"), level);
    $("#sum-level-name").textContent = LEVEL_NAMES[level] || "";
  }

  function buildReviewHtml(results) {
    const missed = results.filter((r) => !r.correct);
    if (!missed.length) {
      return `<div class="review-box" style="background:var(--success-bg);border-color:#bbf7d0">
        <h3 style="color:var(--success)">Nothing urgent to review</h3>
        <p style="font-size:0.88rem;color:var(--ink)">You handled this set well. Keep stretching into harder rational equations!</p>
      </div>`;
    }
    const topics = [...new Set(missed.map((r) => r.topic))];
    return `<div class="review-box">
      <h3>Worth reviewing</h3>
      <ul>${topics.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ul>
      <p style="font-size:0.85rem;margin-top:0.5rem;color:var(--ink-soft)">Tip for rationals like a/(x−b)=c: multiply both sides by (x−b), then solve — and never plug in x=b.</p>
    </div>`;
  }

  function showWorkedExample(q) {
    showScreen("example");
    $("#ex-equation").textContent = formatEq(q.display);
    $("#ex-steps").innerHTML = q.steps.map((s) => `<li>${escapeHtml(s)}</li>`).join("");
    $("#ex-answer").textContent = `Solution: x = ${q.answer}` +
      (q.excluded != null ? `  (undefined at x = ${q.excluded})` : "");
    $("#btn-ex-continue").onclick = () => {
      showScreen("practice");
      showQuestion("practice");
    };
  }

  // ─── Wire events ─────────────────────────────────────────
  function bind() {
    $("#btn-start-placement").addEventListener("click", startPlacement);
    $("#btn-skip-practice").addEventListener("click", () => {
      const nameInput = $("#name-input");
      if (nameInput && nameInput.value.trim()) state.name = nameInput.value.trim();
      save();
      startPractice(true);
    });

    $("#p-submit").addEventListener("click", () => submitAnswer("placement"));
    $("#q-submit").addEventListener("click", () => submitAnswer("practice"));
    $("#p-next").addEventListener("click", () => nextQuestion("placement"));
    $("#q-next").addEventListener("click", () => nextQuestion("practice"));
    $("#p-similar").addEventListener("click", () => trySimilar("placement"));
    $("#q-similar").addEventListener("click", () => trySimilar("practice"));

    ["p-answer", "q-answer"].forEach((id) => {
      const el = $("#" + id);
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const mode = id.startsWith("p") ? "placement" : "practice";
          if (!state.answered) submitAnswer(mode);
          else nextQuestion(mode);
        }
      });
    });

    $("#btn-home").addEventListener("click", () => {
      showScreen("welcome");
      refreshWelcome();
    });

    $("#btn-reset").addEventListener("click", () => {
      if (confirm("Reset saved level and stats? (Your name stays.)")) {
        const name = state.name;
        resetProgress();
        state.name = name;
        save();
        refreshWelcome();
        updateHeaderStats();
      }
    });
  }

  function refreshWelcome() {
    $("#name-input").value = state.name || "Afsa";
    const resume = $("#resume-note");
    if (state.totalAnswered > 0) {
      resume.classList.remove("hidden");
      resume.textContent = `Welcome back! Level ${state.level} · ${LEVEL_NAMES[state.level]} · ${state.sessionsCompleted} session(s) saved.`;
    } else {
      resume.classList.add("hidden");
    }
  }

  // ─── Init ────────────────────────────────────────────────
  function init() {
    load();
    bind();
    refreshWelcome();
    updateHeaderStats();
    showScreen("welcome");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
