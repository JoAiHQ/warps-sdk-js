---
'@joai/warps': patch
---

fix: guard hasInputPrefix against non-string values

hasInputPrefix calls input.includes() which throws on non-string values (objects, booleans, numbers). Added a typeof guard to safely return false, allowing nativeToString to handle native type conversion instead.
