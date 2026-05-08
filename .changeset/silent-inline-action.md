---
"@joai/warps": minor
---

feat: add `silent` property to `WarpInlineAction` to suppress WARP_VIEW output

Inline actions can now set `silent: true` to skip emitting a WARP_VIEW
embed for that step. This is useful for internal sub-warps (e.g.
product listing, activity logging) that should not show UI output.
