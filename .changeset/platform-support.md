---
"@joai/warps": minor
---

Add platform support for cross-platform CLI warps

- Add `WarpPlatformName` enum (`macos`, `linux`, `windows`) and `WarpPlatforms` array to core constants
- Add `WarpPlatformValue<T>` generic type for platform-keyed values
- Add `platform?: WarpPlatformName` to `WarpClientConfig`
- Add `resolvePlatformValue()` and `isPlatformValue()` helpers
- Update `WarpPromptAction.prompt` type to `WarpPlatformValue<string>` (backwards compatible — plain strings still work)
- `WarpExecutor` resolves platform-specific prompt values before interpolation
- Update JSON schema to support platform-keyed prompt definitions
