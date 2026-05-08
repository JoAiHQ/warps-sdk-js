---
'@joai/warps': minor
---

feat: add `as` field to `WarpPromptAction` for named prompt output

Prompt actions can now specify an `as` field to store the LLM-generated response in a named variable instead of (or in addition to) the default `MESSAGE` variable. This allows multiple prompt actions in a single warp without variable collision.

Example:
```json
{"type": "prompt", "as": "productIds", "prompt": "Match products..."}
{"type": "prompt", "prompt": "Generate PDF HTML..."}
{"type": "inline", "warp": "@joai/order-create?productIds={{productIds}}"}
```

Also defaults schema validation to the bundled `warp-schema.json` instead of fetching from CDN, using the remote URL only when explicitly configured.
