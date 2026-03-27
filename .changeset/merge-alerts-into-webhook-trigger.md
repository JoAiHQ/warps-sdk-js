---
"@joai/warps": minor
---

Merge alerts into webhook trigger system

- Add `triggers?: WarpTrigger[]` to `Warp` type for multi-trigger support
- Extend `WarpTrigger` webhook variant with optional `label`, `subject`, and `body` fields to carry notification content (previously stored in the `alerts` block)
- Deprecate `WarpAlerts`, `WarpAlert`, and `WarpAlertName` types — use `triggers` with `{ type: 'webhook', source: 'kepler' }` instead
- Deprecate `Warp.alerts` field in favour of `Warp.trigger` / `Warp.triggers`
