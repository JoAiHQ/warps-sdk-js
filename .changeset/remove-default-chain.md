---
"@joai/warps": minor
---

Remove default chain concept. `WarpMeta.chain` is now `WarpChainName | null`. `getWarpInfoFromIdentifier` and `extractIdentifierInfoFromUrl` no longer accept a `defaultChain` parameter — identifiers without an explicit chain prefix resolve to `chain: null`. `WarpClientConfig.defaultChain` removed. `createBuilder` accepts `null` and returns a base `WarpBuilder` without adapter lookup. `WarpIdentifierInfo` moved from helpers to `types/warp`.
