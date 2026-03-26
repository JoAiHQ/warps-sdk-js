---
"@joai/warps": minor
---

Add `loop` warp action type.

`WarpLoopAction` is a cortex-native action that re-executes the warp after each iteration, enabling continuous polling or recurring actions without a cron schedule.

Fields:
- `when` (optional): condition to evaluate before each iteration; loop stops when falsy
- `delay` (optional, default `0`): milliseconds to wait between iterations
- `maxIterations` (optional, default `10000`): hard safety cap on total iterations
