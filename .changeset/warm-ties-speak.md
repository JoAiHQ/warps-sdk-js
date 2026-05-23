---
"@joai/warps": minor
---

feat: add model field to WarpPromptAction for per-action model selection

Prompt actions can now specify a `model` field to override the default model,
either as a profile name (`"quality"`, `"fastCheap"`, etc.) or an exact model
identifier (`"gpt-4o"`, `"gemini-3.1-pro-preview"`, etc.). The `onPromptGenerate`
handler also receives the model as a third parameter.
