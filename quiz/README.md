# AfsasWorld Quizzes

JSONBin-backed quiz player. Persistence is **JSONBin only** — no GitHub Issues / git sync for results.

## Live

https://sabirpatel.github.io/AfsasWorld/quiz/

## Bin

- ID: `6ab6df70ac6210605af59ddd` (AfsaQuiz)
- Private; `schemaVersion: 2` with `attempts: []`
- Read: `GET …/v3/b/<id>/latest?meta=false` with `X-Master-Key`
- Update: `PUT …/v3/b/<id>` with `Content-Type: application/json`, `X-Master-Key`

## Parent setup

1. Open the quiz page.
2. Paste the JSONBin **Master Key** on the setup screen (or Settings).
3. Key is stored only in `localStorage` (`afsa_jsonbin_key`) on that device.
4. Never commit the Master Key or put it in site source.

## Behavior

- Catalog lists `status: "published"` tests.
- On finish: build attempt → append to `attempts` (newest first, cap 200) → PUT → show “Saved to JSONBin” or Retry.
- History: list / filter / detail / delete (confirm → remove → PUT).
- Test create/edit: edit the bin JSON in the JSONBin dashboard.

## Assets

Cache-bust with `?v=20260925quiz2` on `styles.css` and `app.js`.
