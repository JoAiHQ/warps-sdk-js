---
"@joai/warps-adapter-multiversx": minor
---

Support `datetime` input type in MultiversX contract arg encoding — converts ISO 8601 strings to u64 Unix timestamps in seconds. Empty or "0" values encode as u64 zero (no deadline).
