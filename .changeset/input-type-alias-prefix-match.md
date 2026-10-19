---
"@joai/warps": patch
---

Treat serializer type aliases as equivalent during input prefix validation and recognition so approval replays that re-serialize `number`/`integer`/`text`/`boolean` fields (as `uint64`/`uint32`/`string`/`bool`) are accepted.
