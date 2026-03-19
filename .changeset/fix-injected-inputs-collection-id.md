---
"@joai/warps": minor
"@joai/warps-adapter-multiversx": minor
"@joai/warps-adapter-evm": patch
"@joai/warps-adapter-near": patch
"@joai/warps-adapter-solana": patch
"@joai/warps-adapter-sui": patch
"@joai/warps-adapter-fastset": patch
---

Fix `in.FIELD` output references not resolving in warp chains

`WarpExecutor.evaluateOutput` now retrieves the full `ResolvedInput[]` from the
factory cache and passes it to `getActionExecution` via `injectedInputs`. This
ensures `in.FIELD_NAME` output mappings (e.g. `"COLLECTION_ID": "in.COLLECTION_ID"`)
resolve correctly when chaining warps — previously the adapter had a separate
`WarpCache` instance that was never written to, so `inputs` was always empty and
the value came through as `null`, breaking the next-warp URL placeholder.

All adapter `Output` classes have been cleaned up to remove the now-dead
`WarpCache` dependency and use `injectedInputs ?? []` directly.
