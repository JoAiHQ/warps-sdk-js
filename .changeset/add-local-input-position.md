---
'@joai/warps': patch
---

Add `local` input position type. Inputs with `position: "local"` are available for `{{interpolation}}` in subsequent actions but are excluded from the HTTP request body. Use this for inputs that should stay client-side — e.g., values needed by a `prompt` action but not by the API destination.
