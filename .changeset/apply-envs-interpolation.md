---
"@joai/warps": minor
---

Add `applyEnvs()` to `WarpInterpolator` for runtime env injection.

`WarpInterpolator.apply()` now accepts `meta.envs` and applies them as a final JSON-safe substitution pass over the entire warp — replacing any `{{KEY}}` placeholders not handled by `applyVars`. This covers runtime-injected values such as `JOAI_MESSAGE_TEXT`, `state.KEY`, and other cortex-side injectables that were previously not reaching compute action modifiers and `when` conditions.

Keys are regex-escaped so dotted keys like `state.secret` match literally. Values are JSON-safe encoded to prevent broken JSON during the round-trip.
