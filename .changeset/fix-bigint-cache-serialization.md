---
"@joai/warps": patch
---

Fix BigInt cache serialization prefix collision with typed input values. Changed prefix from `biguint:` to `$bigint:` to prevent the reviver from corrupting ResolvedInput value strings like `"biguint:99900000000000000"` into native BigInts, which caused `stringToNative` to crash with `t.split is not a function`.
