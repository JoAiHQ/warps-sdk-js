---
"@joai/warps": minor
---

**Checkpoint/resume for inline warp actions with missing field inputs.**

- Inline actions now check for required field inputs BEFORE executing the sub-warp — prevents running unknown action types (contract, transfer, compute) with partial data.
- When `onInputRequest` fires for an inline action, the SDK saves a checkpoint (`actionIndex`, accumulated `outputs`, `warpIdentifier`) to the warp cache.
- On the next `execute()` call with the same scope + warp, the SDK auto-resumes by skipping already-completed actions up to and including the checkpoint action. `onInputRequest` is not called again.
- After a resumed execution completes successfully without creating a new checkpoint, the checkpoint is cleared from the cache.
- New exported type: `WarpExecutorCheckpoint`.
