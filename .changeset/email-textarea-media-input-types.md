---
"@joai/warps": minor
---

Add email, textarea, and media as first-class input types. These are UI-semantic types that serialize as plain strings, enabling warp definitions to use `type: "email"`, `type: "textarea"`, and `type: "media"` without triggering an unsupported type error in the serializer.
