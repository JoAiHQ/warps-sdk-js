---
"@joai/warps": minor
---

feat: add `envs` field to `WarpActionExecutionResult` with accumulated outputs from all prior actions

Each action execution result now includes the full accumulated `envs` bag — the merged outputs from all actions that ran before it. This allows consumers (like the cortex) to read the complete execution context without manually merging action results.

feat: add `outputs` field to `WarpExecutor.execute()` return with all accumulated outputs

The execute method now returns `outputs` — the merged output bag across all executed actions, including both warp-level outputs and input values.

feat: add `resolveRelatedEntries()` helper for resolving `{{var}}` placeholders in warp `related` entries

Similar to `getNextInfoForStatus` for `next` entries, this function resolves template variables in related warp identifiers against the accumulated envs bag.

fix: propagate `silent` flag from inline actions to sub-warp metadata

When an inline action has `silent: true`, the flag is now set on the sub-warp's metadata so the cortex can suppress WARP_VIEW emissions.
