---
"@joai/warps-adapter-multiversx": patch
---

Fix wallet providers using wrong address HRP for custom chains (e.g. Claws). The `Account` object was created without the chain's `addressHrp`, defaulting to `erd` instead of the chain-specific HRP like `claw`. This caused API calls to fail with 404 when using non-MultiversX sovereign chains.
