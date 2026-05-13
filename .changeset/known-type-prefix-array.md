---
"@joai/warps": patch
---

Fix `hasKnownTypePrefix` in `WarpFactory` to also recognize `type[]` prefixes. This is the function actually used by `getStringTypedInputs` to decide whether an input already has a type prefix. Without this fix, `string[]:` prefixed values were double-serialized by `nativeToString`.
