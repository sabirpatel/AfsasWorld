# AfsasWorld

Shared home for Afsa school projects: practice apps, quizzes, tests, and assignments.

**Live site:** https://sabirpatel.github.io/AfsasWorld/

## Topics

| Path | What | Status |
|------|------|--------|
| [algebra/](https://sabirpatel.github.io/AfsasWorld/algebra/) | Adaptive algebra practice L1–7 (placement + adaptive + Level-up Challenge; GitHub Issues sync) | Live |
| Reading | Comprehension practice | Planned |
| [quiz/](https://sabirpatel.github.io/AfsasWorld/quiz/) | JSONBin-driven quizzes & assignments (catalog Bin ID `6ab6df70ac6210605af59ddd`) | Live |

## Quizzes (JSONBin only)

The quiz player at `quiz/` loads and saves a **private** JSONBin catalog:

- Bin ID: `6ab6df70ac6210605af59ddd` (AfsaQuiz)
- Schema: `schemaVersion: 2` with `tests[]`, `attempts[]`, `site`, `updatedAt`
- **Parent setup (once per device):** open Quizzes → paste JSONBin **Master Key** in Settings (or the setup screen). Stored only in `localStorage` as `afsa_jsonbin_key`. Never commit keys.
- Finishing a quiz **appends** an attempt to `attempts` (newest first, capped) via `PUT`.
- **History** lists attempts from the bin; delete removes one attempt and `PUT`s the catalog.
- **No GitHub Issues / git sync** for quiz results. Ignore any `tests[].sync.github` fields in the bin.
- To add or edit tests: update the bin JSON in the [JSONBin dashboard](https://jsonbin.io/) (or API). Only `status: "published"` tests appear in the catalog.

## Progress sync (algebra)

After practice or the Level-up Challenge, sessions can sync to GitHub Issues labeled `afsa-progress` (kinds: `placement`, `practice`, `challenge`). Parent Settings: fine-grained PAT with Issues read/write on this repo only. Afsa Helper reads those issues to coach. This does **not** apply to the quiz player.

## Layout

- `index.html` / `home.css` — home page with topic links
- `algebra/` — adaptive algebra app
- `quiz/` — JSONBin quiz player (CRUD attempts)
- `.nojekyll` — static GitHub Pages (no Jekyll)
