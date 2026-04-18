---
"@joai/warps": minor
---

`next` in warp actions and warps now accepts `string[]` for parallel dispatch. All warps in the array receive the same output and execute in parallel. Also extends the object form: `{ success: string[], error: string[] }`.
