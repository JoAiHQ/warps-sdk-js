---
"@joai/warps-adapter-multiversx": patch
---

Fix wallet providers using wrong address HRP for sovereign chains. The `Account` object was created without the chain's `addressHrp`, causing sender addresses to default to `erd` prefix instead of the chain-specific HRP (e.g. `claw`).
