---
"@joai/warps": minor
---

feat: add `output` field to inline actions, with `append:` prefix for appending to arrays

Inline actions can now declare an `output` field to extract values from the sub-warp's execution result. The `append:` prefix on a path appends the resolved value to an existing array instead of replacing it.

```json
{
  "type": "inline",
  "warp": "@joai/service-create?name=Hourly%20Rate&price={{hourlyRate}}",
  "when": "hourlyRate !== '0'",
  "output": {
    "serviceIds": "append:out.id"
  }
}
```
