# Afsa Helper · Algebra

Adaptive algebra practice for a middle-schooler (built for **Afsa**). Starts with a short placement check, estimates a level (1–6), then runs adaptive practice with step-by-step help — especially on rational equations like `374/(x−10)=17`.

## How to open

**Easiest:** double-click `index.html` (or open it in Chrome / Edge / Safari / Firefox).

**Or** from this folder, run a tiny local server:

```bash
# Python 3
python3 -m http.server 8080

# then visit http://localhost:8080
```

No install, no build step, no npm. Works offline after the files are on disk (no CDN required).

## Files

| File | Role |
|------|------|
| `index.html` | App shell |
| `styles.css` | Layout & theme |
| `app.js` | Questions, adaptive logic, localStorage |
| `README.md` | This file |

## Features

- **Placement** (~6 questions across difficulty bands) → starting level 1–6
- **Adaptive practice** (10 questions per session)
  - 2 correct in a row → level up (max 6)
  - 1 wrong → stay (with explanation)
  - 2 wrong in a row → drop a level + worked example
- **Hints:** 2–4 step explanations on misses; “Try a similar one”
- **Undefined values:** if she enters the excluded denominator value, the app explains why it’s undefined
- **Progress saved** in `localStorage` (name, level, streaks, totals)
- Mobile-friendly UI

## Topic levels

1. One-step equations  
2. Two-step equations  
3. Variables on both sides / distribute  
4. Fractions / clearing denominators  
5. Rational equations with variable in denominator ★  
6. Harder rationals, negatives, x in numerator, checking undefined  

## Privacy

Everything stays on the device. No accounts, no network calls.
