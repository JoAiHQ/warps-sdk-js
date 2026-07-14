---
"@joai/warps": patch
---

Fix buildNestedPayload double-nesting when position key matches field name.
Now correctly produces { key: value } instead of { key: { key: value } }.
