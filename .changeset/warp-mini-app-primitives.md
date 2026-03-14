---
"@joai/warps": minor
---

Add warp mini-app primitives: `WarpStateAction`, `WarpMountAction`, `WarpUnmountAction`, and `WarpTrigger` types.

These enable stateful mini-apps (games, polls, quizzes) to be expressed as warps:
- `state` action: read/write/clear room-scoped key-value state
- `mount`/`unmount` actions: activate/deactivate message trigger listeners per room
- `trigger` field on `Warp`: declares the message pattern a warp listens for when mounted
