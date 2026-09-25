/**
 * Afsa Helper · Algebra
 * Adaptive algebra practice for middle school (levels 1–7)
 */
(function () {
  "use strict";

  const SYNC_TOKEN_KEY = "afsa_algebra_gh_token";
  const SYNC_OWNER = "sabirpatel";
  const SYNC_REPO = "AfsasWorld";
  const SYNC_LABEL = "afsa-progress";
  let lastSessionPayload = null;

  const STORAGE_KEY = "afsa-algebra-v1";
  const PLACEMENT_LEN = 6;
  const PRACTICE_LEN = 10;
  const CHALLENGE_LEN = 9;
  const MAX_LEVEL = 7;

  const LEVEL_NAMES = [
    "",
    "One-step equations",
    "Two-step equations",
    "Both sides / distribute",
    "Fractions / clear denominators",
    "Rational: variable in denominator",
    "Harder rationals & checks",
    "Multi-step rationals & undefined",
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
    mode: "welcome", // welcome | placement | practice | challenge | summary | example
    placementIndex: 0,
    practiceIndex: 0,
    placementResults: [],
    practiceResults: [],
    challengeResults: [],
    challengeIndex: 0,
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


  function genLevel7(attempt) {
    // Multi-step rationals, x in num+den, undefined checks — integer answers only
    attempt = (attempt | 0) + 1;
    if (attempt > 40) {
      // Safe fallback: classic rational with integer answer
      const c = pick([3, 4, 5, 6]);
      const b = randInt(2, 10);
      const mult = randInt(2, 12);
      const a = c * mult;
      const x = mult + b;
      return {
        level: 7,
        topic: "Multi-step rationals & undefined",
        display: `${a}/(x − ${b}) + 2 = ${c + 2}`,
        answer: x,
        excluded: b,
        steps: [
          `Excluded: x ≠ ${b}. Isolate: ${a}/(x − ${b}) = ${c}.`,
          `x − ${b} = ${mult} → x = ${x}. Check defined.`,
        ],
      };
    }
    const type = pick(["twostep", "proportion", "numx_neg", "nested", "check"]);
    if (type === "twostep") {
      // a/(x - b) + c = d  →  a/(x-b) = d-c  → x = a/(d-c) + b
      const c = pick([-4, -3, -2, 2, 3, 4, 5]);
      const diff = pick([-5, -4, -3, -2, 2, 3, 4, 5, 6]); // d - c
      const d = c + diff;
      const mult = randInt(2, 12) * (Math.random() < 0.35 ? -1 : 1);
      const a = diff * mult;
      const b = randInt(-6, 10);
      const x = mult + b;
      if (x === b || a === 0 || diff === 0) return genLevel7(attempt);
      const bDisp = b < 0 ? `x + ${-b}` : `x − ${b}`;
      const cDisp = c >= 0 ? `+ ${c}` : `− ${-c}`;
      return {
        level: 7,
        topic: "Multi-step rational (isolate, then clear)",
        display: `${a}/(${bDisp}) ${cDisp} = ${d}`,
        answer: x,
        excluded: b,
        steps: [
          `Excluded: x ≠ ${b}. First isolate the fraction: ${a}/(${bDisp}) = ${d} − (${c}) = ${diff}.`,
          `Multiply both sides by (${bDisp}): ${a} = ${diff}(${bDisp}).`,
          `${a}/${diff} = ${bDisp} → ${mult} = ${bDisp}.`,
          `Solve: x = ${x}. Check x ≠ ${b} and plug back.`,
        ],
      };
    }
    if (type === "proportion") {
      // a/(x - b) = c/(x - d) — pick integers so x is integer and x ≠ b, x ≠ d
      const a = pick([2, 3, 4, 5, 6, 8]);
      let c = pick([2, 3, 4, 5, 6, 8].filter((n) => n !== a));
      const b = randInt(-5, 8);
      let x = randInt(-8, 14);
      if (x === b) x = b + pick([-4, -3, -2, 2, 3, 4]);
      // a/(x-b) = c/(x-d) → a(x-d) = c(x-b) → a x - a d = c x - c b
      // a d = a x - c x + c b → d = x - (c*(x-b))/a  need a | c(x-b)
      const gap = x - b;
      if (gap === 0 || (c * gap) % a !== 0) return genLevel7(attempt);
      const d = x - (c * gap) / a;
      if (!Number.isInteger(d) || d === b || x === d) return genLevel7(attempt);
      const denomCoeff = a - c;
      const num = a * d - c * b;
      const bDisp = b < 0 ? `x + ${-b}` : `x − ${b}`;
      const dDisp = d < 0 ? `x + ${-d}` : `x − ${d}`;
      return {
        level: 7,
        topic: "Rational proportion (two excluded values)",
        display: `${a}/(${bDisp}) = ${c}/(${dDisp})`,
        answer: x,
        excluded: b,
        excludedExtra: d,
        steps: [
          `Excluded values: x ≠ ${b} and x ≠ ${d}.`,
          `Cross-multiply: ${a}(${dDisp}) = ${c}(${bDisp}).`,
          `${a}x − ${a * d} = ${c}x − ${c * b}.`,
          `Collect x: ${a}x − ${c}x = ${a * d} − ${c * b} → ${denomCoeff}x = ${num} → x = ${x}.`,
          `Check: x ≠ ${b}, x ≠ ${d}.`,
        ],
      };
    }
    if (type === "numx_neg") {
      // (x + a)/(x - b) = c  with negatives / harder coeffs
      const c = pick([-4, -3, -2, 2, 3, 4, 5, -5]);
      const b = randInt(-8, 9);
      let x = randInt(b + 2, b + 15);
      if (Math.random() < 0.4) x = randInt(b - 15, b - 2);
      if (x === b) return genLevel7(attempt);
      const a = c * (x - b) - x;
      const aDisp = a >= 0 ? `x + ${a}` : `x − ${-a}`;
      const bDisp = b < 0 ? `x + ${-b}` : `x − ${b}`;
      return {
        level: 7,
        topic: "x in num & den (harder signs)",
        display: `(${aDisp})/(${bDisp}) = ${c}`,
        answer: x,
        excluded: b,
        steps: [
          `x ≠ ${b}. Multiply: ${aDisp} = ${c}(${bDisp}).`,
          `${aDisp} = ${c}x − ${c * b}.`,
          `x − ${c}x = ${-c * b} − (${a}) → ${1 - c}x = ${-c * b - a}.`,
          `x = ${x}. Verify denominator ≠ 0.`,
        ],
      };
    }
    if (type === "nested") {
      // (ax + b)/(x - c) = d
      const d = pick([-5, -4, -3, -2, 2, 3, 4, 5, 6]);
      const c = randInt(-6, 10);
      const a = pick([2, 3, 4, 5, -2, -3]);
      // ax + b = d(x - c) → ax + b = d x - d c → b + d c = d x - a x → b + d c = x(d - a)
      // pick x ≠ c, then b = d(x-c) - a x
      let x = randInt(-10, 16);
      if (x === c) x = c + pick([-3, -2, 2, 3, 4]);
      const b = d * (x - c) - a * x;
      if (d - a === 0) return genLevel7(attempt);
      const aDisp = a === 1 ? "x" : a === -1 ? "−x" : `${a}x`;
      const bDisp = b >= 0 ? `+ ${b}` : `− ${-b}`;
      const cDisp = c < 0 ? `x + ${-c}` : `x − ${c}`;
      return {
        level: 7,
        topic: "Linear over linear = constant",
        display: `(${aDisp} ${bDisp})/(${cDisp}) = ${d}`,
        answer: x,
        excluded: c,
        steps: [
          `Excluded: x ≠ ${c}. Multiply: ${aDisp} ${bDisp} = ${d}(${cDisp}).`,
          `${aDisp} ${bDisp} = ${d}x − ${d * c}.`,
          `Move terms: ${aDisp} − ${d}x = ${-d * c} − (${b}) → ${a - d}x = ${-d * c - b}.`,
          `x = ${x}. Check undefined value.`,
        ],
      };
    }
    // check: multi-step with explicit verification emphasis
    const c = pick([3, 4, 5, 6, 8, -3, -4]);
    const b = randInt(-5, 12);
    const add = pick([-6, -4, -3, 2, 3, 4, 5]);
    const mult = randInt(2, 10) * (Math.random() < 0.3 ? -1 : 1);
    const a = c * mult;
    const x = mult + b;
    if (x === b || a === 0) return genLevel7(attempt);
    const rhs = c + add; // wait: a/(x-b) + add = rhs where a/(x-b)=c so rhs = c+add
    const bDisp = b < 0 ? `x + ${-b}` : `x − ${b}`;
    const addDisp = add >= 0 ? `+ ${add}` : `− ${-add}`;
    return {
      level: 7,
      topic: "Solve, then prove it's defined",
      display: `${a}/(${bDisp}) ${addDisp} = ${c + add}`,
      answer: x,
      excluded: b,
      steps: [
        `Note undefined at x = ${b}. Isolate: ${a}/(${bDisp}) = ${c + add} − (${add}) = ${c}.`,
        `${a} = ${c}(${bDisp}) → ${bDisp} = ${mult} → x = ${x}.`,
        `Check defined: ${x} ≠ ${b}. Substitute: ${a}/(${x}−(${b})) ${addDisp} = ${c} ${addDisp} = ${c + add}. ✓`,
      ],
    };
  }

  const GENERATORS = [null, genLevel1, genLevel2, genLevel3, genLevel4, genLevel5, genLevel6, genLevel7];

  function generateQuestion(level) {
    level = Math.max(1, Math.min(MAX_LEVEL, level | 0));
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
    // ~6 questions across bands; include L6–L7 so placement can reach 7
    const levels = [2, 3, 4, 5, 6, 7];
    return levels.map((lv) => generateQuestion(lv));
  }

  function buildChallenge() {
    // ~9 scored questions spanning L5–L7 (no adaptive mid-test)
    const levels = [5, 5, 6, 6, 6, 7, 7, 7, 7];
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
    const top = results.filter((r) => r.level >= 6);
    const topOk = top.filter((r) => r.correct).length;
    if (hard.length && hardOk === hard.length && results.every((r) => r.correct)) {
      est = top.length && topOk === top.length ? 7 : 6;
    } else if (top.length && topOk === top.length && hardOk === hard.length) {
      est = Math.max(est, 6);
    }
    return Math.max(1, Math.min(MAX_LEVEL, est));
  }

  // ─── Persistence ─────────────────────────────────────────
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        // Coach boost for new devices: start ready for L6–L7 stretch
        state.level = 6;
        return;
      }
      const data = JSON.parse(raw);
      if (data.name) state.name = data.name;
      if (data.level) state.level = data.level;
      if (typeof data.bestStreak === "number") state.bestStreak = data.bestStreak;
      if (typeof data.totalCorrect === "number") state.totalCorrect = data.totalCorrect;
      if (typeof data.totalAnswered === "number") state.totalAnswered = data.totalAnswered;
      if (typeof data.sessionsCompleted === "number") state.sessionsCompleted = data.sessionsCompleted;
      // Coach boost: if stored level < 6, bump to 6 (ready for L6–L7 / challenge)
      if (state.level < 6) {
        state.level = 6;
        save();
      } else if (state.level > MAX_LEVEL) {
        state.level = MAX_LEVEL;
        save();
      }
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
        if (state.level < MAX_LEVEL) {
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
    settings: $("#screen-settings"),
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
      levelEl.innerHTML = `Level <strong>${state.level}</strong>/${MAX_LEVEL}`;
    if (accEl) {
      const pct =
        state.totalAnswered > 0
          ? Math.round((100 * state.totalCorrect) / state.totalAnswered)
          : "—";
      accEl.innerHTML = `Accuracy <strong>${pct}${pct === "—" ? "" : "%"}</strong>`;
    }
    // Hide stats on welcome
    const bar = $("#stats-bar");
    if (bar) bar.classList.toggle("hidden", state.mode === "welcome" || state.mode === "settings");
  }

  function renderLevelDots(container, current) {
    if (!container) return;
    container.innerHTML = "";
    for (let i = 1; i <= MAX_LEVEL; i++) {
      const d = document.createElement("span");
      d.className = "level-dot" + (i <= current ? " on" : "") + (i === current ? " current" : "");
      d.title = LEVEL_NAMES[i];
      container.appendChild(d);
    }
  }

  // Placement / challenge questions held in memory
  let placementQs = [];
  let challengeQs = [];
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

  function modePrefix(mode) {
    return mode === "placement" ? "p" : "q";
  }

  function modeTotal(mode) {
    if (mode === "placement") return PLACEMENT_LEN;
    if (mode === "challenge") return CHALLENGE_LEN;
    return PRACTICE_LEN;
  }

  function modeIndex(mode) {
    if (mode === "placement") return state.placementIndex;
    if (mode === "challenge") return state.challengeIndex;
    return state.practiceIndex;
  }


  function startChallenge() {
    const nameInput = $("#name-input");
    if (nameInput && nameInput.value.trim()) {
      state.name = nameInput.value.trim();
    }
    save();
    challengeQs = buildChallenge();
    state.challengeIndex = 0;
    state.challengeResults = [];
    state.streak = 0;
    state.correctInRow = 0;
    state.wrongInRow = 0;
    pendingExample = null;
    showScreen("practice"); // reuse practice UI shell
    showQuestion("challenge");
  }

  function showQuestion(mode) {
    state.answered = false;
    state.lastConfidence = null;
    state.questionStart = Date.now();

    let q;
    if (mode === "placement") {
      q = placementQs[state.placementIndex];
    } else if (mode === "challenge") {
      q = challengeQs[state.challengeIndex];
    } else {
      q = generateQuestion(state.level);
      // Mix nearby levels so practice stays varied
      if (state.level === 4 && Math.random() < 0.25) q = generateQuestion(5);
      if (state.level === 6 && Math.random() < 0.3) q = generateQuestion(5);
      if (state.level === 7 && Math.random() < 0.35) q = generateQuestion(pick([5, 6, 6]));
    }
    state.currentQ = q;

    const prefix = modePrefix(mode);
    const total = modeTotal(mode);
    const idx = modeIndex(mode);

    const badgeLabel =
      mode === "placement" ? "Placement check" : mode === "challenge" ? "Level-up Challenge" : "Practice";
    const badgeClass =
      mode === "placement" ? " placement" : mode === "challenge" ? " challenge" : "";
    $(`#${prefix}-mode-badge`).textContent = badgeLabel;
    $(`#${prefix}-mode-badge`).className = "mode-badge" + badgeClass;
    $(`#${prefix}-progress-label`).textContent = `Question ${idx + 1} of ${total}`;
    $(`#${prefix}-progress-fill`).style.width = `${((idx) / total) * 100}%`;
    $(`#${prefix}-topic`).textContent = q.topic;
    $(`#${prefix}-equation`).textContent = formatEq(q.display);
    const excl = $(`#${prefix}-excluded`);
    if (q.excluded != null) {
      const extra = q.excludedExtra != null ? ` and x ≠ ${q.excludedExtra}` : "";
      excl.textContent = `Remember: x ≠ ${q.excluded}${extra} (undefined)`;
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

    renderLevelDots($(`#${prefix}-dots`), mode === "practice" ? state.level : q.level);
    $(`#${prefix}-level-name`).textContent =
      mode === "placement"
        ? `Exploring: ${LEVEL_NAMES[q.level]}`
        : mode === "challenge"
          ? `Challenge band: L${q.level} — ${LEVEL_NAMES[q.level]}`
          : `Your level: ${state.level} — ${LEVEL_NAMES[state.level]}`;

    // Greeting
    const greet = $(`#${prefix}-greet`);
    if (greet) {
      greet.textContent =
        mode === "placement"
          ? `Hi ${state.name}! Quick check so we start in the right place.`
          : mode === "challenge"
            ? `Level-up Challenge, ${state.name} — scored L5–L7. Show what you've got!`
            : `Let's practice, ${state.name}. You've got this.`;
    }
  }

  function submitAnswer(mode) {
    if (state.answered) return;
    const prefix = modePrefix(mode);
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
    const hitExcluded =
      (q.excluded != null && answersEqual(parsed, q.excluded)) ||
      (q.excludedExtra != null && answersEqual(parsed, q.excludedExtra));
    if (hitExcluded) {
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
    const total = modeTotal(mode);
    const idx = modeIndex(mode);
    $(`#${prefix}-progress-fill`).style.width = `${((idx + 1) / total) * 100}%`;

    updateHeaderStats();
    save();
  }

  function recordResult(mode, correct, q) {
    state.totalAnswered++;
    if (correct) state.totalCorrect++;
    const entry = { level: q.level, correct, topic: q.topic, display: q.display };
    if (mode === "placement") state.placementResults.push(entry);
    else if (mode === "challenge") state.challengeResults.push(entry);
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
    } else if (mode === "challenge") {
      state.challengeIndex++;
      if (state.challengeIndex >= CHALLENGE_LEN) {
        finishChallenge();
        return;
      }
      showQuestion("challenge");
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
    // Challenge is scored — similar practice is allowed but doesn't change score already recorded
    state.answered = false;
    const q = generateQuestion(state.currentQ.level);
    state.currentQ = q;
    state.questionStart = Date.now();
    const prefix = modePrefix(mode);
    $(`#${prefix}-equation`).textContent = formatEq(q.display);
    $(`#${prefix}-topic`).textContent = q.topic + " (similar)";
    const excl = $(`#${prefix}-excluded`);
    if (q.excluded != null) {
      const extra = q.excludedExtra != null ? ` and x ≠ ${q.excludedExtra}` : "";
      excl.textContent = `Remember: x ≠ ${q.excluded}${extra} (undefined)`;
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
    let lead = `You got ${correct} of ${PLACEMENT_LEN} on the placement. We'll start practice at Level ${est}.`;
    if (correct === PLACEMENT_LEN) {
      lead += ` Perfect score — you're ready for Level 6–7 practice and the Level-up Challenge Test!`;
    }
    $("#summary-lead").textContent = lead;
    renderSummaryStats(state.placementResults, est);
    $("#summary-review").innerHTML = buildReviewHtml(state.placementResults);
    $("#btn-summary-continue").textContent = "Start practice →";
    $("#btn-summary-continue").onclick = () => startPractice(true);
    showScreen("summary");
    maybeAutoSync("placement", state.placementResults);
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
    maybeAutoSync("practice", state.practiceResults);
  }


  function finishChallenge() {
    state.sessionsCompleted++;
    // Soft bump toward challenge performance (cap at 7)
    const correct = state.challengeResults.filter((r) => r.correct).length;
    const acc = Math.round((100 * correct) / Math.max(1, state.challengeResults.length));
    if (acc >= 80 && state.level < MAX_LEVEL) {
      state.level = Math.min(MAX_LEVEL, Math.max(state.level, 6));
      if (acc === 100) state.level = MAX_LEVEL;
    }
    save();
    $("#summary-title").textContent = `Challenge complete, ${state.name}!`;
    $("#summary-lead").textContent =
      acc >= 90
        ? `Outstanding — ${correct}/${CHALLENGE_LEN} (${acc}%). Level-up Challenge crushed. You're operating at the top band.`
        : acc >= 70
          ? `Strong challenge — ${correct}/${CHALLENGE_LEN} (${acc}%). Review misses below, then run it again when ready.`
          : `Challenge score ${correct}/${CHALLENGE_LEN} (${acc}%). Use the review notes, practice L5–L7, then retry the Level-up Challenge.`;
    renderSummaryStats(state.challengeResults, state.level);
    $("#summary-review").innerHTML = buildReviewHtml(state.challengeResults);
    $("#btn-summary-continue").textContent = "Back to home →";
    $("#btn-summary-continue").onclick = () => {
      showScreen("welcome");
      refreshWelcome();
    };
    showScreen("summary");
    maybeAutoSync("challenge", state.challengeResults);
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


  // ─── GitHub progress sync ────────────────────────────────
  function getSyncToken() {
    try { return localStorage.getItem(SYNC_TOKEN_KEY) || ""; } catch (_) { return ""; }
  }
  function setSyncToken(t) {
    try {
      if (t) localStorage.setItem(SYNC_TOKEN_KEY, t);
      else localStorage.removeItem(SYNC_TOKEN_KEY);
    } catch (_) {}
  }

  function buildSessionPayload(kind, results) {
    const correct = results.filter((r) => r.correct).length;
    const total = results.length;
    const acc = total ? Math.round((100 * correct) / total) : 0;
    const missedTopics = [...new Set(results.filter((r) => !r.correct).map((r) => r.topic))];
    const focusTopics = [...new Set(results.map((r) => r.topic))];
    return {
      app: "Afsa Helper · Algebra",
      kind, // placement | practice | challenge
      learner: state.name || "Afsa",
      when: new Date().toISOString(),
      level: state.level,
      levelName: LEVEL_NAMES[state.level] || "",
      correct,
      total,
      accuracy: acc,
      streak: state.streak,
      bestStreak: state.bestStreak,
      sessionsCompleted: state.sessionsCompleted,
      missedTopics,
      focusTopics,
      results: results.map((r) => ({
        topic: r.topic,
        level: r.level,
        correct: !!r.correct,
        display: r.display || r.equation || "",
      })),
    };
  }

  function sessionIssueBody(payload) {
    const miss = payload.missedTopics.length
      ? payload.missedTopics.map((t) => `- ${t}`).join("\n")
      : "- (none)";
    return [
      `## ${payload.kind === "placement" ? "Placement" : payload.kind === "challenge" ? "Level-up Challenge" : "Practice"} session`,
      "",
      `- **Learner:** ${payload.learner}`,
      `- **When:** ${payload.when}`,
      `- **Level:** ${payload.level} (${payload.levelName})`,
      `- **Score:** ${payload.correct}/${payload.total} (${payload.accuracy}%)`,
      `- **Best streak:** ${payload.bestStreak}`,
      "",
      "### Missed topics",
      miss,
      "",
      "### Focus topics this session",
      payload.focusTopics.map((t) => `- ${t}`).join("\n") || "- (n/a)",
      "",
      "<details><summary>Session JSON</summary>",
      "",
      "```json",
      JSON.stringify(payload, null, 2),
      "```",
      "",
      "</details>",
      "",
      "_Saved by Afsa Helper · Algebra for coaching._",
    ].join("\n");
  }

  async function syncSessionToGitHub(payload) {
    const token = getSyncToken();
    if (!token) {
      return { ok: false, error: "Add a GitHub token in Settings first." };
    }
    const title = `[${payload.kind}] ${payload.learner} · L${payload.level} · ${payload.accuracy}% · ${payload.when.slice(0, 16).replace("T", " ")}`;
    const body = sessionIssueBody(payload);
    const res = await fetch(`https://api.github.com/repos/${SYNC_OWNER}/${SYNC_REPO}/issues`, {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({ title, body, labels: [SYNC_LABEL] }),
    });
    if (!res.ok) {
      let detail = "";
      try { detail = (await res.json()).message || ""; } catch (_) {}
      return { ok: false, error: `GitHub ${res.status}${detail ? ": " + detail : ""}` };
    }
    const data = await res.json();
    return { ok: true, url: data.html_url, number: data.number };
  }

  function setSyncStatus(el, msg, cls) {
    if (!el) return;
    el.textContent = msg;
    el.className = "sync-status" + (cls ? " " + cls : "");
  }

  async function maybeAutoSync(kind, results) {
    lastSessionPayload = buildSessionPayload(kind, results);
    const status = $("#sync-status");
    if (!getSyncToken()) {
      setSyncStatus(status, "Session ready. Parent: open Settings to connect GitHub, then tap Save session.", "");
      return;
    }
    setSyncStatus(status, "Saving session to AfsasWorld…", "pending");
    const result = await syncSessionToGitHub(lastSessionPayload);
    if (result.ok) {
      setSyncStatus(status, `Saved to AfsasWorld as issue #${result.number}. Afsa Helper can review it.`, "ok");
    } else {
      setSyncStatus(status, result.error || "Save failed.", "err");
    }
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
    const btnChallenge = $("#btn-start-challenge");
    if (btnChallenge) btnChallenge.addEventListener("click", startChallenge);

    $("#p-submit").addEventListener("click", () => submitAnswer("placement"));
    $("#q-submit").addEventListener("click", () => submitAnswer(state.mode === "challenge" ? "challenge" : "practice"));
    $("#p-next").addEventListener("click", () => nextQuestion("placement"));
    $("#q-next").addEventListener("click", () => nextQuestion(state.mode === "challenge" ? "challenge" : "practice"));
    $("#p-similar").addEventListener("click", () => trySimilar("placement"));
    $("#q-similar").addEventListener("click", () => trySimilar(state.mode === "challenge" ? "challenge" : "practice"));

    ["p-answer", "q-answer"].forEach((id) => {
      const el = $("#" + id);
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const mode = id.startsWith("p")
            ? "placement"
            : state.mode === "challenge"
              ? "challenge"
              : "practice";
          if (!state.answered) submitAnswer(mode);
          else nextQuestion(mode);
        }
      });
    });

    $("#btn-home").addEventListener("click", () => {
      showScreen("welcome");
      refreshWelcome();
    });


    const btnSettings = $("#btn-settings");
    if (btnSettings) btnSettings.addEventListener("click", () => {
      const tok = getSyncToken();
      const input = $("#sync-token");
      input.value = tok ? "••••••••••••" : "";
      input.dataset.hasToken = tok ? "1" : "0";
      setSyncStatus($("#settings-status"), tok ? "Token saved on this device." : "No token yet.", tok ? "ok" : "");
      showScreen("settings");
    });
    const btnSettingsBack = $("#btn-settings-back");
    if (btnSettingsBack) btnSettingsBack.addEventListener("click", () => {
      showScreen("welcome");
      refreshWelcome();
    });
    const syncTokenInput = $("#sync-token");
    if (syncTokenInput) syncTokenInput.addEventListener("focus", () => {
      if (syncTokenInput.dataset.hasToken === "1") {
        syncTokenInput.value = "";
        syncTokenInput.dataset.hasToken = "0";
      }
    });
    const btnSaveSettings = $("#btn-save-settings");
    if (btnSaveSettings) btnSaveSettings.addEventListener("click", () => {
      const v = $("#sync-token").value.trim();
      if (!v || v.startsWith("••")) {
        setSyncStatus($("#settings-status"), "Paste a new token to save.", "err");
        return;
      }
      setSyncToken(v);
      $("#sync-token").value = "••••••••••••";
      $("#sync-token").dataset.hasToken = "1";
      setSyncStatus($("#settings-status"), "Saved. New sessions will sync to AfsasWorld.", "ok");
    });
    const btnClearToken = $("#btn-clear-token");
    if (btnClearToken) btnClearToken.addEventListener("click", () => {
      setSyncToken("");
      $("#sync-token").value = "";
      $("#sync-token").dataset.hasToken = "0";
      setSyncStatus($("#settings-status"), "Token cleared from this device.", "");
    });
    const btnSyncSession = $("#btn-sync-session");
    if (btnSyncSession) btnSyncSession.addEventListener("click", async () => {
      if (!lastSessionPayload) {
        setSyncStatus($("#sync-status"), "No session to save yet.", "err");
        return;
      }
      setSyncStatus($("#sync-status"), "Saving…", "pending");
      const result = await syncSessionToGitHub(lastSessionPayload);
      if (result.ok) setSyncStatus($("#sync-status"), `Saved as issue #${result.number}.`, "ok");
      else setSyncStatus($("#sync-status"), result.error || "Save failed.", "err");
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
    const bits = [];
    if (state.totalAnswered > 0) {
      bits.push(`Welcome back! Level ${state.level} · ${LEVEL_NAMES[state.level]} · ${state.sessionsCompleted} session(s) saved.`);
    }
    bits.push(`Coach note: after a 100% placement you're ready for Level 6–7 practice and the Level-up Challenge Test.`);
    resume.classList.remove("hidden");
    resume.textContent = bits.join(" ");
  }

  // ─── Init ────────────────────────────────────────────────
  function init() {
    load();
    bind();
    refreshWelcome();
    updateHeaderStats();
    showScreen("welcome");
    const params = new URLSearchParams(location.search);
    const hash = (location.hash || "").replace(/^#/, "");
    if (params.get("challenge") === "1" || hash === "challenge") {
      // Deep link from home "Tests & assignments"
      setTimeout(() => startChallenge(), 0);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
