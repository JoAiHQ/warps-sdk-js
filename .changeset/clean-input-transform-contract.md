---
"@joai/warps": major
"@joai/warps-vm-node": major
"@joai/warps-vm-browser": major
---

Input transform callbacks now receive the current native value as their first argument and all named inputs as their second argument. Transform runners and VM entry points now accept an argument array and invoke function transforms with those arguments, while output transform callback semantics remain unchanged.
