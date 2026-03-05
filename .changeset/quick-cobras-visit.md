---
"@joai/warps-vm-node": patch
"@joai/warps-vm-browser": patch
---

Harden transform VM context injection by exposing explicit `results`, `out`, and `inputs` variables, avoiding dynamic top-level key injection issues.
