---
"@joai/warps": patch
---

Fix detectWarp crashing on warps with no matching chain adapter (e.g. MCP warps with chain "none"). Skip interpolation instead of throwing.
