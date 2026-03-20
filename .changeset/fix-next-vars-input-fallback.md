---
"@joai/warps": patch
---

Fix `{{PLACEHOLDER}}` in `next` resolving to empty string when output mapping returns null. Resolved inputs are now used as a fallback when building the variable bag for `getNextInfo`, so values like `COLLECTION_ID` are always available even if the on-chain output section fails to populate them.
