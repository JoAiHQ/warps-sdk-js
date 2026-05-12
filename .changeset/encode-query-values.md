---
"@joai/warps": patch
---

Add encodeQueryValues helper to URL-encode query param values in warp identifiers. Used by the suggestions system to encode JSON array values in suggestion URLs so they round-trip correctly through the command parser.
