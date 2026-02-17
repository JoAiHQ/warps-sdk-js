---
'@joai/warps-vm-node': patch
'@joai/warps-vm-browser': patch
---

Spread transform context keys into VM sandbox scope so variables like `out` are accessible as top-level variables in transform expressions (e.g. `() => out?.balance`)
