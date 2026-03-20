---
"@joai/warps": patch
---

fix: re-derive resolved inputs from warp.meta.query on evaluateOutput cache miss

When evaluateOutput is called in a different process than the one that ran execute
(e.g. PWA evaluating output for a cortex cloud-executed warp), the factory cache is
cold and getRawResolvedInputsFromCache returns []. This caused in.FIELD output mappings
like "COLLECTION_ID": "in.COLLECTION_ID" to resolve to null, producing empty
placeholders in next-warp URLs (e.g. ?COLLECTION_ID=).

WarpExecutor.evaluateOutput now falls back to WarpFactory.resolveInputsFromQuery when
the cache is empty and warp.meta.query is set, re-deriving the inputs from the query
params passed with the warp. WarpFactory gains a public resolveInputsFromQuery helper
for this purpose.
