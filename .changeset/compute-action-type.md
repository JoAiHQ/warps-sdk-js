---
"@joai/warps": minor
---

Add `compute` action type for local-only transform execution.

- New `WarpComputeAction` type and `'compute'` added to `WarpActionType`
- `compute` is detectable as a primary action alongside `collect`, `query`, etc.
- `WarpExecutor` executes `compute` like `collect` but always returns `success` — never `unhandled`, never calls a backend
- `state`, `mount`, and `unmount` actions now skip gracefully in the SDK executor (host-managed types)
- `WarpFactory` destination check updated to allow `compute`, `state`, `mount`, `unmount` without a receiver
