---
"@joai/warps": patch
---

Fix `hasInputPrefix` to recognize `type[]` prefixes (e.g., `string[]`, `uint64[]`, `bool[]`). Previously only bare types like `string` were recognized, causing `getStringTypedInputs` to double-serialize already-prefixed array values by calling `nativeToString` again on the full `type[]:value` string.
