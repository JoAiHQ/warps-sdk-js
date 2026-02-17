---
"@joai/warps-adapter-multiversx": minor
---

Add EnumType support to MultiversX serializer and ABI builder

- Handle EnumType in typeToString, stringToTyped, typedToString, and nativeToType
- Populate enum variant options in endpointsToWarps for UI dropdowns and MCP tool validation
- Use discriminant values as option keys with variant names as labels
