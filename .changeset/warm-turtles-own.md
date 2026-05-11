---
'@joai/warps': minor
---

feat: add conditional next chains — `WarpNextEntry` objects now support a `when` field with a JS expression (`{{VAR}}` placeholders interpolated from execution output). Next entries whose `when` condition evaluates to false are skipped, allowing warps to conditionally chain only when output variables meet criteria (e.g. only send a message when `{{MESSAGE}}` is non-empty).
