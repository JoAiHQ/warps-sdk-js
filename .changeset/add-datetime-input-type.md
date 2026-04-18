---
"@joai/warps": patch
---

Add `datetime` input type to WarpSerializer and WarpInputTypes. Datetime values serialize and deserialize as ISO 8601 strings, with the `datetime` prefix (e.g. `datetime:2026-04-19T00:00:00.000Z`).
