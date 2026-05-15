---
'@joai/warps': minor
---

feat: forward resolved inputs between warp actions via outputBag

Resolved inputs with an `as` field are now accumulated into the
outputBag alongside action outputs and mapped values. This makes
input values available as template variables (e.g. `{{destination}}`)
in subsequent actions and the next chain.
