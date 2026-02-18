---
"@joai/warps": patch
"@joai/warps-adapter-multiversx": patch
---

Fix next warp resolution in evaluateOutput. Adapter's getActionExecution no longer calls getNextInfo (it lacks adapters), executor now computes next with the full adapter context.
