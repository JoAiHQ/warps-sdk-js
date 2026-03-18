---
"@joai/warps-adapter-multiversx": patch
---

Fix system SC output parsing falling through to ABI path when token parsing fails (e.g. in embed context), causing 404 errors on the verification endpoint.
