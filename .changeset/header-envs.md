---
'@joai/warps': patch
---

fix: resolve env placeholders in collect action headers

Headers now go through replacePlaceholders with envs, matching the
existing URL behavior. This ensures `{{JOAI_AGENT_AUTH_KEY}}` and
similar env vars are resolved in collect request headers.
