---
'@joai/warps': patch
---

Stop rewriting alias identifiers into chain-qualified `@chain:alias` form when resolving registry warps.

Alias identifiers now stay chainless, while hash identifiers continue to require an explicit chain.
