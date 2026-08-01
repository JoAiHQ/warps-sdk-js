---
"@joai/warps": patch
---

Interpolate resolved inputs in next URLs for collect/compute/mcp/prompt and on-chain actions via a shared `buildNextVars` helper, so `{{inputName}}` placeholders in `next` resolve consistently across all action types.
