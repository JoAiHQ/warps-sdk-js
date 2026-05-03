---
"@joai/warps": minor
---

feat: add inline action type for composing warps

Adds a new `inline` action type that lets a warp reference and execute another warp as a step. Inline actions use query param syntax (`@joai/warp?key={{value}}`) to pass data, resolve template variables from parent warp outputs, and feed their results back to subsequent actions.

Includes `WarpInlineAction` type, `warpResolver` callback on `WarpExecutor`, full dispatch in the action execution loop with `when` condition support, and 8 tests covering resolution, param passthrough, env interpolation, cross-action output flow, and edge cases.
