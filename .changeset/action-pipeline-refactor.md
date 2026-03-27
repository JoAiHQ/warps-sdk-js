---
"@joai/warps": minor
"@joai/warps-mcp": patch
---

Action pipeline with output chaining, state, loops, and prompt generation

- **Output chaining**: Each action's output accumulates into a shared bag, available to subsequent actions via `{{KEY}}` placeholders
- **`onPromptGenerate` handler**: SDK calls host for LLM text generation during prompt actions, sets `output.MESSAGE`
- **State actions in SDK**: Read/write/clear handled via SDK cache with `scope` parameter for isolation
- **Loop actions in SDK**: When-condition evaluation, iteration tracking, and `onLoop` handler for host re-execution
- **`onMountAction` handler**: Mount/unmount actions delegated to host
- **Removed `primary` field**: Auto-detection via `getWarpInputAction()` (first non-pipeline action)
- **Removed `primaryResolvedInputs`**: Output chaining via envs replaces cross-action input fallbacks
- **Removed `buildInputBag` primaryInputs parameter**: No more `{{primary.NAME}}` pattern
- **`isWarpActionAutoExecute`**: Links require explicit `auto: true`, removed unused `warp` parameter
- **`scope` parameter**: On `execute()` meta for state and loop key isolation
- **`stop()` method**: On `WarpExecutor` to halt loop re-executions

### Breaking changes
- `getWarpPrimaryAction` renamed to `getWarpInputAction`
- `primary` field removed from all action types
- `isWarpActionAutoExecute(action)` — second `warp` parameter removed
- `applyInputs(text, inputs, serializer)` — fourth `primaryInputs` parameter removed
- `buildInputBag(inputs, serializer)` — third `primaryInputs` parameter removed
- `ExecutionHandlers` has new optional fields: `onPromptGenerate`, `onMountAction`, `onLoop`
