---
"@joai/warps": patch
---

Treat empty HTTP collect responses (e.g. DELETE 204) as success instead of throwing "Unexpected end of JSON input".
