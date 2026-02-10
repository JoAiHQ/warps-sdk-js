---
"@joai/warps-adapter-multiversx": patch
---

Move nonce cache update from signTransaction to sendTransaction. Previously, a failed or rejected transaction (e.g. due to insufficient gas price) would leave a stale incremented nonce in cache, causing subsequent transactions to use nonce 1 when the account is still at nonce 0.
