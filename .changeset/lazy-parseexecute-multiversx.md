---
'@joai/warps-adapter-multiversx': patch
---

Fix crash on transactions with multiple writeLog events (e.g. DEX swaps) by deferring parseExecute until an `out.` output mapping is actually needed. Event-only output warps no longer crash on these transactions. Also add support for nested event field access (e.g. `event.swap.4.token_amount_out`) to drill into struct fields within event outputs.
