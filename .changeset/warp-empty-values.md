---
'@joai/warps': patch
'@joai/warps-mcp': patch
---

Keep omitted warp inputs distinct from explicit empty values: omitted inputs are left out of mapped payloads, explicit empty strings are sent as empty, and contract args keep their slot.
