---
"@joai/warps": patch
---

Set `immediateExecution.envs` after the action's output is merged into the accumulated bag, so every action's envs includes its own output. Previously the last action's output was never reflected in its envs, breaking warp suggestion URLs that referenced outputs from the final action.
