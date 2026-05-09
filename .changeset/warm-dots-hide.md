---
'@joai/warps': minor
---

feat: add generic `type[]` syntax for JSON array inputs

Any type can be suffixed with `[]` to declare an array of that type (e.g. `string[]`, `uint32[]`, `address[]`, `bool[]`). Values are serialized as JSON arrays via `JSON.parse`/`JSON.stringify`.

Also adds `json` as a native serializable type (previously unsupported) and `string[]` as a `BaseWarpActionInputType`.

---