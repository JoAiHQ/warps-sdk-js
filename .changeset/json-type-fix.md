---
"@warps-sdk/core": patch
---

Fix JSON type handling: prevent double-stringification in HTTP payload and add proper JSON.parse fallback in `toInputPayloadValue`
