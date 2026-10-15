---
'@joai/warps': patch
---

Hidden and fallback input defaults resolve from one bag of query values and same-step inputs that have values (inputs win on overlap). A default that is still only unresolved `{{placeholders}}` resolves to null so the field is omitted from the payload.
