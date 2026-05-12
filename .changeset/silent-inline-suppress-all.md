---
"@joai/warps": patch
---

Silent inline actions (`silent: true`) now suppress all internal sub-warp action callbacks, not just the outer wrapper callback. Previously, sub-warp internal progress messages and WARP_VIEW cards were still surfaced even when the inline action was marked silent.
