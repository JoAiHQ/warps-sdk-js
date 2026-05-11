---
'@joai/warps': patch
---

fix: JSON-stringify objects/arrays in `WarpInterpolator.applyEnvs` — prevents `[object Object]` when env values are arrays/objects replacing `{{placeholders}}` in warp templates

Also adds 2 pipeline tests (collect → inline → prompt) that verify the full output flow end-to-end.
---