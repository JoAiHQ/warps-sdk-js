---
"@joai/warps": patch
---

Remove `next` from `WarpTrigger` webhook type. The top-level `Warp.next` field already serves this purpose — use that instead to declare which warp to chain to after a webhook trigger fires.

`WarpValidator` now enforces that webhook trigger input keys are uppercase, consistent with `vars` and `output` field naming rules.
