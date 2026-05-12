---
"@joai/warps": minor
---

feat: extend `related` field to support objects with `bot` text for LLM context

The `related` field on warps now accepts entries as either strings or objects:

```json
"related": [
  "simple-warp-id",
  { "identifier": "complex-warp", "bot": "Ask the user if they want to proceed" }
]
```

The `bot` text is injected into the LLM context after the warp executes, guiding the agent on when to suggest the related warp to the user.
