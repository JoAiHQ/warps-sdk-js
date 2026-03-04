---
'@joai/warps-adapter-multiversx': patch
---

Improve contract output parsing for bare `out` mappings in the MultiversX adapter.

- Treat bare `out` as the adapter's default action output value.
- Avoid unnecessary ABI/verification fetching when only bare `out` is requested.
- Keep existing ABI-based parsing behavior unchanged for `out.*`, `out[...]`, and `event.*` mappings.
