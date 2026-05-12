---
"@joai/warps": minor
---

feat: add `messages` field to all action types for per-action chat messages

Actions can now emit their own success/error messages visible in the chat, independent of the warp-level `messages`. The cortex's `onActionExecuted` handler resolves `{{var}}` placeholders against the action's output and sends the message.

```json
{
  "as": "hourlyRate",
  "type": "prompt",
  "prompt": "Output only the number...",
  "messages": {
    "success": "No hourly rate found for {{hours}}h. What should I bill?"
  }
}
```
