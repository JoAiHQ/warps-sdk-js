---
'@joai/warps': patch
---

Avoid double-prefixing already typed hidden and query input values during resolution, so prefixes like `string:` no longer leak into HTTP payloads.
