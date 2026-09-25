# AfsasWorld

Shared home for Afsa school projects: practice apps, quizzes, tests, and assignments.

**Live site:** https://sabirpatel.github.io/AfsasWorld/

## Topics

| Path | What | Status |
|------|------|--------|
| [algebra/](https://sabirpatel.github.io/AfsasWorld/algebra/) | Adaptive algebra practice L1–7 (placement + adaptive + Level-up Challenge; GitHub Issues sync) | Live |
| Reading | Comprehension practice | Planned |
| [quiz/](https://sabirpatel.github.io/AfsasWorld/quiz/) | JSONBin-driven quizzes & assignments (catalog Bin ID `6ab6df70ac6210605af59ddd`) | Live |

## Quizzes (JSONBin)

The quiz player at `quiz/` loads a public catalog from JSONBin (`GET …/v3/b/<binId>/latest?meta=false`). Parent Settings can store an optional JSONBin Master/Access key in `localStorage` (`afsa_jsonbin_key`) if the bin ever returns 401 — never commit keys.

Schema: `tests[]` with question types `numeric`, `multiple_choice`, `short_answer`, `true_false`. Only `status: "published"` tests are listed.

## Progress sync (algebra)

After practice or the Level-up Challenge, sessions can sync to GitHub Issues labeled `afsa-progress` (kinds: `placement`, `practice`, `challenge`). Parent Settings: fine-grained PAT with Issues read/write on this repo only. Afsa Helper reads those issues to coach.

## Layout

- `index.html` / `home.css` — home page with topic links
- `algebra/` — adaptive algebra app
- `quiz/` — JSONBin quiz player
- `.nojekyll` — static GitHub Pages (no Jekyll)
