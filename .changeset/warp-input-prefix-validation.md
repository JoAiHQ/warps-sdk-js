---
'@joai/warps': patch
---

Reject submitted inputs whose type prefix does not match the action input type (e.g. `select:` on a `string` options field) instead of re-wrapping them as `string:select:…`.
