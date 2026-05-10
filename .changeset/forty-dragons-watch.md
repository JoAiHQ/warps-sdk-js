---
'@joai/warps': patch
---

fix: JSON-stringify arrays in when expression placeholders — prevents SyntaxError when comparing `[]` (empty array) in `when` conditions
---