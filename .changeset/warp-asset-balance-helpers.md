---
"@joai/warps": minor
---

Add `getRequiredAssetIds` and `checkWarpAssetBalance` helpers for pre-flight wallet balance checks.

`getRequiredAssetIds(warp, chainInfo)` returns the asset identifiers a warp's primary action requires the wallet to hold. Gates on contract/transfer action types and inspects input positions (`value`, `transfer`) and the `asset` input type.

`checkWarpAssetBalance(warp, address, chain, adapters)` verifies the wallet holds all required assets before execution. Returns false if any required asset has zero balance, true if no assets are needed or on network error (non-fatal).
