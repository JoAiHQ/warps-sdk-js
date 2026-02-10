---
"@joai/warps-adapter-multiversx": patch
---

Normalize all addresses to the chain's HRP in executor, data loader, and contract loader. Addresses from warp definitions or wallet configs with a different HRP (e.g. `erd1` on Claws network) are now re-encoded with the correct chain prefix before use in transactions and API calls.
