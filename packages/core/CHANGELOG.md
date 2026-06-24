# @joai/warps

## 4.39.1

### Patch Changes

- a509531: Add accept metadata arrays to Warp action inputs for file upload controls.

## 4.39.0

### Minor Changes

- 5040e08: feat: add model field to WarpPromptAction for per-action model selection

  Prompt actions can now specify a `model` field to override the default model,
  either as a profile name (`"quality"`, `"fastCheap"`, etc.) or an exact model
  identifier (`"gpt-4o"`, `"gemini-3.1-pro-preview"`, etc.). The `onPromptGenerate`
  handler also receives the model as a third parameter.

## 4.38.1

### Patch Changes

- Add `stripWarpQuery` helper and update `isEqualWarpIdentifier` to ignore query parameters when comparing warp identifiers. WARP_VIEW identifiers may include `?key=value` for display context — matching should ignore the query portion.

## 4.38.0

### Minor Changes

- 21228ea: **Checkpoint/resume for inline warp actions with missing field inputs.**
  - Inline actions now check for required field inputs BEFORE executing the sub-warp — prevents running unknown action types (contract, transfer, compute) with partial data.
  - When `onInputRequest` fires for an inline action, the SDK saves a checkpoint (`actionIndex`, accumulated `outputs`, `warpIdentifier`) to the warp cache.
  - On the next `execute()` call with the same scope + warp, the SDK auto-resumes by skipping already-completed actions up to and including the checkpoint action. `onInputRequest` is not called again.
  - After a resumed execution completes successfully without creating a new checkpoint, the checkpoint is cleared from the cache.
  - New exported type: `WarpExecutorCheckpoint`.

## 4.37.0

### Minor Changes

- 7d46b30: Add `logLevel` config option ('debug' | 'info' | 'warning' | 'error') that controls WarpLogger output. When set to 'debug', logs when condition evaluations, action inputs/outputs, inline warp resolutions, and outputBag state changes for easier troubleshooting.

## 4.36.1

### Patch Changes

- 3a168dc: fix: resolve env placeholders in collect action headers

  Headers now go through replacePlaceholders with envs, matching the
  existing URL behavior. This ensures `{{JOAI_AGENT_AUTH_KEY}}` and
  similar env vars are resolved in collect request headers.

## 4.36.0

### Minor Changes

- 152e266: feat: forward resolved inputs between warp actions via outputBag

  Resolved inputs with an `as` field are now accumulated into the
  outputBag alongside action outputs and mapped values. This makes
  input values available as template variables (e.g. `{{destination}}`)
  in subsequent actions and the next chain.

## 4.35.6

### Patch Changes

- 4c5fad8: Set `immediateExecution.envs` after the action's output is merged into the accumulated bag, so every action's envs includes its own output. Previously the last action's output was never reflected in its envs, breaking warp suggestion URLs that referenced outputs from the final action.

## 4.35.5

### Patch Changes

- 1cc66cf: fix: guard hasInputPrefix against non-string values

  hasInputPrefix calls input.includes() which throws on non-string values (objects, booleans, numbers). Added a typeof guard to safely return false, allowing nativeToString to handle native type conversion instead.

## 4.35.4

### Patch Changes

- c3b1e88: Fix `hasKnownTypePrefix` in `WarpFactory` to also recognize `type[]` prefixes. This is the function actually used by `getStringTypedInputs` to decide whether an input already has a type prefix. Without this fix, `string[]:` prefixed values were double-serialized by `nativeToString`.

## 4.35.3

### Patch Changes

- 3d149ed: Fix `hasInputPrefix` to recognize `type[]` prefixes (e.g., `string[]`, `uint64[]`, `bool[]`). Previously only bare types like `string` were recognized, causing `getStringTypedInputs` to double-serialize already-prefixed array values by calling `nativeToString` again on the full `type[]:value` string.

## 4.35.2

### Patch Changes

- 19a9eb3: Silent inline actions (`silent: true`) now suppress all internal sub-warp action callbacks, not just the outer wrapper callback. Previously, sub-warp internal progress messages and WARP_VIEW cards were still surfaced even when the inline action was marked silent.

## 4.35.1

### Patch Changes

- ca087b1: Add encodeQueryValues helper to URL-encode query param values in warp identifiers. Used by the suggestions system to encode JSON array values in suggestion URLs so they round-trip correctly through the command parser.

## 4.35.0

### Minor Changes

- f8af665: feat: add `envs` field to `WarpActionExecutionResult` with accumulated outputs from all prior actions

  Each action execution result now includes the full accumulated `envs` bag — the merged outputs from all actions that ran before it. This allows consumers (like the cortex) to read the complete execution context without manually merging action results.

  feat: add `outputs` field to `WarpExecutor.execute()` return with all accumulated outputs

  The execute method now returns `outputs` — the merged output bag across all executed actions, including both warp-level outputs and input values.

  feat: add `resolveRelatedEntries()` helper for resolving `{{var}}` placeholders in warp `related` entries

  Similar to `getNextInfoForStatus` for `next` entries, this function resolves template variables in related warp identifiers against the accumulated envs bag.

  fix: propagate `silent` flag from inline actions to sub-warp metadata

  When an inline action has `silent: true`, the flag is now set on the sub-warp's metadata so the cortex can suppress WARP_VIEW emissions.

## 4.34.0

### Minor Changes

- dd71af1: feat: extend `related` field to support objects with `bot` text for LLM context

  The `related` field on warps now accepts entries as either strings or objects:

  ```json
  "related": [
    "simple-warp-id",
    { "identifier": "complex-warp", "bot": "Ask the user if they want to proceed" }
  ]
  ```

  The `bot` text is injected into the LLM context after the warp executes, guiding the agent on when to suggest the related warp to the user.

## 4.33.0

### Minor Changes

- 9cab8b1: feat: add `messages` field to all action types for per-action chat messages

  Actions can now emit their own success/error messages visible in the chat, independent of the warp-level `messages`. The cortex's `onActionExecuted` handler resolves `{{var}}` placeholders against the action's output and sends the message.

  ```json
  {
    "as": "hourlyRate",
    "type": "prompt",
    "prompt": "Output only the number...",
    "messages": {
      "success": "No hourly rate found for {{hours}}h. What should I bill?"
    }
  }
  ```

## 4.32.0

### Minor Changes

- 09745dc: feat: add `output` field to inline actions, with `append:` prefix for appending to arrays

  Inline actions can now declare an `output` field to extract values from the sub-warp's execution result. The `append:` prefix on a path appends the resolved value to an existing array instead of replacing it.

  ```json
  {
    "type": "inline",
    "warp": "@joai/service-create?name=Hourly%20Rate&price={{hourlyRate}}",
    "when": "hourlyRate !== '0'",
    "output": {
      "serviceIds": "append:out.id"
    }
  }
  ```

## 4.31.2

### Patch Changes

- b1bff5c: fix: prevent double-JSON-stringify of array values in nativeToString — when a string[] input receives a JSON-encoded array string from query params, parse it before re-encoding so the request body gets a proper array instead of a doubly-escaped string

## 4.31.1

### Patch Changes

- 5732140: fix: JSON-stringify objects/arrays in `WarpInterpolator.applyEnvs` — prevents `[object Object]` when env values are arrays/objects replacing `{{placeholders}}` in warp templates

  ## Also adds 2 pipeline tests (collect → inline → prompt) that verify the full output flow end-to-end.

## 4.30.0

### Minor Changes

- c78fd05: feat: add conditional next chains — `WarpNextEntry` objects now support a `when` field with a JS expression (`{{VAR}}` placeholders interpolated from execution output). Next entries whose `when` condition evaluates to false are skipped, allowing warps to conditionally chain only when output variables meet criteria (e.g. only send a message when `{{MESSAGE}}` is non-empty).

### Patch Changes

- ## f9db8cf: fix: JSON-stringify objects/arrays in inline action URL query params — prevents `[object Object]` and empty-string collapses for array/object values

## 4.29.7

### Patch Changes

- ## 0428b76: fix: JSON-stringify arrays in when expression placeholders — prevents SyntaxError when comparing `[]` (empty array) in `when` conditions

## 4.29.6

### Patch Changes

- ## 8bfc8c8: fix: pass envs to destination URL resolution in collect actions — allows `{{JOAI_API_BASE}}` in private warp URLs

## 4.29.5

### Patch Changes

- ## cb486df: fix: pass accumulated inline action outputs (outputBag) to prompt envs — enables `{{variable}}` from previous steps to resolve in prompt templates

## 4.29.4

### Patch Changes

- ## 926f170: fix: JSON-stringify arrays in replacePlaceholders — prevents `[object Object]` for product lists and fixes URL encoding for array params

## 4.29.3

### Patch Changes

- ## 562cc62: fix: JSON-stringify plain objects in replacePlaceholders — prevents `[object Object]` when passing structured product data to LLM prompts

## 4.29.2

### Patch Changes

- ## 50c4470: fix: escape newlines and special characters in when expression placeholder values — prevents SyntaxError when variable contains multiline content

## 4.29.1

### Patch Changes

- ## fae9b15: fix: return empty array for type[] when input value is empty — prevents null crashes in downstream consumers

## 4.29.0

### Minor Changes

- 4279e9a: feat: add generic `type[]` syntax for JSON array inputs

  Any type can be suffixed with `[]` to declare an array of that type (e.g. `string[]`, `uint32[]`, `address[]`, `bool[]`). Values are serialized as JSON arrays via `JSON.parse`/`JSON.stringify`.

  Also adds `json` as a native serializable type (previously unsupported) and `string[]` as a `BaseWarpActionInputType`.

  ***

## 4.28.0

### Minor Changes

- e469a15: feat: add `as` field to `WarpPromptAction` for named prompt output

  Prompt actions can now specify an `as` field to store the LLM-generated response in a named variable instead of (or in addition to) the default `MESSAGE` variable. This allows multiple prompt actions in a single warp without variable collision.

  Example:

  ```json
  {"type": "prompt", "as": "productIds", "prompt": "Match products..."}
  {"type": "prompt", "prompt": "Generate PDF HTML..."}
  {"type": "inline", "warp": "@joai/order-create?productIds={{productIds}}"}
  ```

  Also defaults schema validation to the bundled `warp-schema.json` instead of fetching from CDN, using the remote URL only when explicitly configured.

## 4.27.0

### Minor Changes

- e16bb29: feat: add `silent` property to `WarpInlineAction` to suppress WARP_VIEW output

  Inline actions can now set `silent: true` to skip emitting a WARP_VIEW
  embed for that step. This is useful for internal sub-warps (e.g.
  product listing, activity logging) that should not show UI output.

## 4.26.0

### Minor Changes

- 7bcabaa: - Add onActionProcessing callback to ExecutionHandlers for inline sub-warp thoughts
  - Resolve warp vars in execute() so inline actions get resolved values
  - Add tests for warp vars resolution in inline actions

## 4.25.3

### Patch Changes

- 32eb9e9: fix: include local-positioned inputs in collect output values for outputBag

## 4.25.2

### Patch Changes

- 86a3775: fix: add debug logging for inline template resolution to trace [object Object] bug

## 4.25.1

### Patch Changes

- e6746f3: fix: pass parent meta to inline sub-warp execution so auth vars and envs are available

## 4.25.0

### Minor Changes

- bfaa0c6: feat: add inline action type for composing warps

  Adds a new `inline` action type that lets a warp reference and execute another warp as a step. Inline actions use query param syntax (`@joai/warp?key={{value}}`) to pass data, resolve template variables from parent warp outputs, and feed their results back to subsequent actions.

  Includes `WarpInlineAction` type, `warpResolver` callback on `WarpExecutor`, full dispatch in the action execution loop with `when` condition support, and 8 tests covering resolution, param passthrough, env interpolation, cross-action output flow, and edge cases.

## 4.24.1

### Patch Changes

- 438eb9b: Fix chainless alias identifiers (e.g. `@alias`) in `next` warp chaining. `WarpLinkBuilder.buildFromPrefixedIdentifier` now handles identifiers with no chain prefix, building the URL directly from the client config without requiring a chain adapter.

## 4.24.0

### Minor Changes

- 3da6760: WarpValidator now catches two bug classes that silently break HTTP warp dispatches:
  - **URL path placeholders without url-positioned inputs.** A warp whose action URL contains `{{X}}` on a path segment must have an input with `position: "url:X"` (or declare `X` in `vars`). Otherwise the placeholder resolves to empty and the route collapses (e.g. `/v1/contacts/{{contactId}}/activities` becomes `/v1/contacts/activities`, hitting a different handler that rejects the request). Uppercase placeholders (`{{JOAI_AGENT_UUID}}`, `{{API_BASE}}`) are treated as runtime/brand globals and skipped.
  - **CLI `arg:N` positions on HTTP write actions.** Inputs with `position: "arg:N"` on a POST/PUT/PATCH/DELETE action never reach the JSON body — the API receives an empty payload and rejects with "field required" errors. Remove the position (defaults to body) or use `"payload:X"` / `"url:X"` explicitly.

## 4.23.0

### Minor Changes

- 7ad9ffd: Remove default chain concept. `WarpMeta.chain` is now `WarpChainName | null`. `getWarpInfoFromIdentifier` and `extractIdentifierInfoFromUrl` no longer accept a `defaultChain` parameter — identifiers without an explicit chain prefix resolve to `chain: null`. `WarpClientConfig.defaultChain` removed. `createBuilder` accepts `null` and returns a base `WarpBuilder` without adapter lookup. `WarpIdentifierInfo` moved from helpers to `types/warp`.

## 4.22.1

### Patch Changes

- 5d3199d: fix: use known type prefix check in getStringTypedInputs to avoid URL colons being misidentified as type separators

## 4.22.0

### Minor Changes

- c642fcc: Add `file` input type and `crypto:sha256:fieldName` modifier.
  - `WarpInputTypes.File` (`"file"`) — new type for document/binary uploads, serializes as a plain URL string
  - `modifier: "crypto:sha256:<field>"` — computes a SHA-256 hex digest of the file at the referenced field's URL at execution time, using the Web Crypto API (works in both Node.js and browser)
  - Removed `media` type — `file` supersedes it for document inputs

## 4.21.0

### Minor Changes

- 2232260: Add `mergeVars` method to `WarpClient` for runtime var injection without recreating the client.

## 4.20.0

### Minor Changes

- e77fe63: `next` in warp actions and warps now accepts `string[]` for parallel dispatch. All warps in the array receive the same output and execute in parallel. Also extends the object form: `{ success: string[], error: string[] }`.

## 4.19.0

### Minor Changes

- af09140: Add email, textarea, and media as first-class input types. These are UI-semantic types that serialize as plain strings, enabling warp definitions to use `type: "email"`, `type: "textarea"`, and `type: "media"` without triggering an unsupported type error in the serializer.

## 4.18.1

### Patch Changes

- b0975fc: Add `datetime` input type to WarpSerializer and WarpInputTypes. Datetime values serialize and deserialize as ISO 8601 strings, with the `datetime` prefix (e.g. `datetime:2026-04-19T00:00:00.000Z`).

## 4.18.0

### Minor Changes

- Add `expect` field to prompt actions for structured output

  Prompt actions now accept an optional `expect` field — a JSON Schema object or URL string — that constrains the LLM to return valid JSON matching that shape. When set, `onPromptGenerate` receives the schema as a second argument so the runtime can use provider-native structured output (JSON mode, tool use, etc.).

  This eliminates reliance on "Return ONLY raw JSON" prompt instructions and guarantees the output flowing into `{{PROMPT}}` is always valid JSON.

## 4.17.1

### Patch Changes

- deb2ba2: Add `local` input position type. Inputs with `position: "local"` are available for `{{interpolation}}` in subsequent actions but are excluded from the HTTP request body. Use this for inputs that should stay client-side — e.g., values needed by a `prompt` action but not by the API destination.

## 4.17.0

### Minor Changes

- Add `WarpSection` type and `sections` field to the `Warp` type for multi-section wizard UI support

## 4.16.1

### Patch Changes

- 543c0a5: Update default client URL from usewarp.to to joai.ai. Add joai.ai variants to SuperClientUrls.

## 4.16.0

### Minor Changes

- 94b69da: Add contract deploy/upgrade to executor interface

  Introduces ContractFlags, ContractDeployParams, ContractUpgradeParams to
  AdapterWarpExecutor. WarpMultiversxExecutor implements createDeployTransaction
  and createUpgradeTransaction with nonce fetching and chain-agnostic flags.
  All other adapters implement the interface with unsupported stubs.

## 4.15.2

### Patch Changes

- b04cd78: Include input values in message template interpolation so `{{inputAs}}` placeholders resolve in success/error messages alongside output variables.

## 4.15.1

### Patch Changes

- 9377ce3: Handle `chain` and `nft` as UI-only input types in the serializer. These types are used in warp input definitions for rendering chain selectors and NFT pickers in clients, but serialize as plain strings when executed programmatically (e.g. via MCP tools).

## 4.15.0

### Minor Changes

- 39548a2: Action pipeline with output chaining, state, loops, and prompt generation
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

- 549aa26: Merge alerts into webhook trigger system
  - Add `triggers?: WarpTrigger[]` to `Warp` type for multi-trigger support
  - Extend `WarpTrigger` webhook variant with optional `label`, `subject`, and `body` fields to carry notification content (previously stored in the `alerts` block)
  - Deprecate `WarpAlerts`, `WarpAlert`, and `WarpAlertName` types — use `triggers` with `{ type: 'webhook', source: 'kepler' }` instead
  - Deprecate `Warp.alerts` field in favour of `Warp.trigger` / `Warp.triggers`

## 4.14.0

### Minor Changes

- 605afc4: Add `loop` warp action type.

  `WarpLoopAction` is a cortex-native action that re-executes the warp after each iteration, enabling continuous polling or recurring actions without a cron schedule.

  Fields:
  - `when` (optional): condition to evaluate before each iteration; loop stops when falsy
  - `delay` (optional, default `0`): milliseconds to wait between iterations
  - `maxIterations` (optional, default `10000`): hard safety cap on total iterations

## 4.13.1

### Patch Changes

- Add type alias resolution in WarpSerializer for common alternative type names (`boolean` → `bool`, `integer` → `uint32`, `number` → `uint64`). Fixes `Unsupported input type: boolean` error when warp definitions use `boolean` instead of the canonical `bool` type.

## 4.13.0

### Minor Changes

- 0c64e38: Replace x402 with MPP (Machine Payments Protocol) using the official mppx SDK.
  - `@joai/warps`: HTTP collect actions now use `mppx/client` to auto-handle 402 Payment Required responses. The new `getMppFetch()` helper returns an mppx-powered fetch that transparently pays and retries on 402, replacing manual challenge/retry logic. Removed `x402` helpers.
  - `@joai/warps-adapter-evm`: Replaced `registerX402Handlers` with `getMppAccount()` returning a viem Account for mppx client signing on the Tempo chain.
  - `@joai/warps-adapter-solana`: Removed x402 Solana handlers (`registerX402SvmHandlers`) — MPP is EVM/Tempo only.

- fde528b: Support object `next` config with `success`/`error` branches for conditional warp chaining based on execution status

### Patch Changes

- 26a0983: Add `match` conditions to webhook trigger type for deterministic event-type filtering. Expose `matchesTrigger`, `resolveInputs`, and `resolvePath` utilities from `WarpWebhookTriggerMatcher`.

## 4.12.2

### Patch Changes

- 06fbbe7: fix: re-derive resolved inputs from warp.meta.query on evaluateOutput cache miss

  When evaluateOutput is called in a different process than the one that ran execute
  (e.g. PWA evaluating output for a cortex cloud-executed warp), the factory cache is
  cold and getRawResolvedInputsFromCache returns []. This caused in.FIELD output mappings
  like "COLLECTION_ID": "in.COLLECTION_ID" to resolve to null, producing empty
  placeholders in next-warp URLs (e.g. ?COLLECTION_ID=).

  WarpExecutor.evaluateOutput now falls back to WarpFactory.resolveInputsFromQuery when
  the cache is empty and warp.meta.query is set, re-deriving the inputs from the query
  params passed with the warp. WarpFactory gains a public resolveInputsFromQuery helper
  for this purpose.

## 4.12.1

### Patch Changes

- 9faad95: Fix `{{PLACEHOLDER}}` in `next` resolving to empty string when output mapping returns null. Resolved inputs are now used as a fallback when building the variable bag for `getNextInfo`, so values like `COLLECTION_ID` are always available even if the on-chain output section fails to populate them.
- bdf199b: Remove `next` from `WarpTrigger` webhook type. The top-level `Warp.next` field already serves this purpose — use that instead to declare which warp to chain to after a webhook trigger fires.

  `WarpValidator` now enforces that webhook trigger input keys are uppercase, consistent with `vars` and `output` field naming rules.

## 4.12.0

### Minor Changes

- 4e8a3cd: Fix `in.FIELD` output references not resolving in warp chains

  `WarpExecutor.evaluateOutput` now retrieves the full `ResolvedInput[]` from the
  factory cache and passes it to `getActionExecution` via `injectedInputs`. This
  ensures `in.FIELD_NAME` output mappings (e.g. `"COLLECTION_ID": "in.COLLECTION_ID"`)
  resolve correctly when chaining warps — previously the adapter had a separate
  `WarpCache` instance that was never written to, so `inputs` was always empty and
  the value came through as `null`, breaking the next-warp URL placeholder.

  All adapter `Output` classes have been cleaned up to remove the now-dead
  `WarpCache` dependency and use `injectedInputs ?? []` directly.

## 4.11.0

### Minor Changes

- fe1000a: Add NFT support via optional `getAccountNfts` on `AdapterWarpDataLoader`.

  New types: `WarpChainAssetType` (`'fungible' | 'nft' | 'sft'`) and `WarpChainAssetNftMetadata` (collection, nonce, mediaUrl, thumbnailUrl, attributes, royalties, rank, creator). `WarpChainAsset` gains optional `type` and `nft` fields — fully backward compatible.

  MultiversX fetches NFTs and SFTs from `accounts/{address}/nfts`, filters MetaESDT, and normalises IPFS URLs to HTTPS. `getAsset` now correctly resolves nonce-based identifiers via the `nfts/{identifier}` endpoint. EVM, Solana, Sui, and NEAR adapters implement the method; Solana detects NFTs from zero-decimal single-amount token accounts, Sui filters owned objects excluding coin types.

## 4.10.1

### Patch Changes

- 5b2de7a: Fix getChainLogo() variant logic: dark background now correctly returns the light/white logo

## 4.10.0

### Minor Changes

- 6d61206: Add static chain display name and logo helpers: WarpChainDisplayNames, getChainDisplayName(), WarpChainLogos, getChainLogo()

## 4.9.0

### Minor Changes

- 3d28626: Add Tempo (Stripe L1) to WarpChainName enum and EvmWalletChainNames

### Patch Changes

- 0817308: Add WarpAssets helper for constructing JoAi asset URLs (chainLogo, tokenLogo, walletLogo)

## 4.8.4

### Patch Changes

- 537139c: Resolve destination from inputs in prompt actions, matching collect and mcp behavior

## 4.8.3

### Patch Changes

- e128375: Fix themed logo resolution falling back to first available URL when requested theme key is missing

## 4.8.2

### Patch Changes

- 28fbdf8: Fix detectWarp crashing on warps with no matching chain adapter (e.g. MCP warps with chain "none"). Skip interpolation instead of throwing.

## 4.8.1

### Patch Changes

- 00405f1: fix: when conditions now resolve meta.envs placeholders (e.g. state.active)

## 4.8.0

### Minor Changes

- eec1f92: Add `applyEnvs()` to `WarpInterpolator` for runtime env injection.

  `WarpInterpolator.apply()` now accepts `meta.envs` and applies them as a final JSON-safe substitution pass over the entire warp — replacing any `{{KEY}}` placeholders not handled by `applyVars`. This covers runtime-injected values such as `JOAI_MESSAGE_TEXT`, `state.KEY`, and other cortex-side injectables that were previously not reaching compute action modifiers and `when` conditions.

  Keys are regex-escaped so dotted keys like `state.secret` match literally. Values are JSON-safe encoded to prevent broken JSON during the round-trip.

## 4.7.0

### Minor Changes

- 1f0dcdd: Add `compute` action type for local-only transform execution.
  - New `WarpComputeAction` type and `'compute'` added to `WarpActionType`
  - `compute` is detectable as a primary action alongside `collect`, `query`, etc.
  - `WarpExecutor` executes `compute` like `collect` but always returns `success` — never `unhandled`, never calls a backend
  - `state`, `mount`, and `unmount` actions now skip gracefully in the SDK executor (host-managed types)
  - `WarpFactory` destination check updated to allow `compute`, `state`, `mount`, `unmount` without a receiver

## 4.6.0

### Minor Changes

- 86dc49d: Add `getRequiredAssetIds` and `checkWarpAssetBalance` helpers for pre-flight wallet balance checks.

  `getRequiredAssetIds(warp, chainInfo)` returns the asset identifiers a warp's primary action requires the wallet to hold. Gates on contract/transfer action types and inspects input positions (`value`, `transfer`) and the `asset` input type.

  `checkWarpAssetBalance(warp, address, chain, adapters)` verifies the wallet holds all required assets before execution. Returns false if any required asset has zero balance, true if no assets are needed or on network error (non-fatal).

- 23c79c0: Add warp mini-app primitives: `WarpStateAction`, `WarpMountAction`, `WarpUnmountAction`, and `WarpTrigger` types.

  These enable stateful mini-apps (games, polls, quizzes) to be expressed as warps:
  - `state` action: read/write/clear room-scoped key-value state
  - `mount`/`unmount` actions: activate/deactivate message trigger listeners per room
  - `trigger` field on `Warp`: declares the message pattern a warp listens for when mounted

## 4.5.1

### Patch Changes

- 3041233: Interpolate input values into success message templates for unhandled collect warps

## 4.5.0

### Minor Changes

- bfae938: Add `doesWarpRequireWallet` helper that returns `{ required: boolean, chain: WarpChainName | null }`.

  Returns `required: true` for warps that need a wallet — either for signing (`transfer`/`contract` action types) or for resolving the user's address (`source: 'user:wallet'` inputs, or inputs with `{{USER_WALLET}}`/`{{USER_WALLET_PUBLICKEY}}` defaults).

## 4.4.0

### Minor Changes

- 34dabea: Add `brandSlug`, `brandName`, and `brandLogo` fields to `WarpSearchHit` so consumers can display brand identity directly from search results without an extra fetch.

## 4.3.1

### Patch Changes

- 0887c7c: Stop rewriting alias identifiers into chain-qualified `@chain:alias` form when resolving registry warps.

  Alias identifiers now stay chainless, while hash identifiers continue to require an explicit chain.

## 4.3.0

### Minor Changes

- 1f9c145: Add wallet `delete` method to `WalletProvider` and `AdapterWarpWallet` interfaces.
  - `WalletProvider.delete(externalId)` — deletes a wallet by its external ID
  - `AdapterWarpWallet.delete(provider, externalId)` — delegates to the correct provider
  - `RemoteWalletProvider` sends a `POST` to the configured delete endpoint (default `/v1/wallets/delete`)
  - Local providers (Mnemonic, PrivateKey, ReadOnly) remove the wallet from the client config
  - Cloud providers (Gaupa, Privy, Coinbase) throw "not supported" as they manage wallets externally
  - Added `removeWarpWalletFromConfig` helper to core

## 4.2.0

### Minor Changes

- 2ec1a65: Unify `WarpCache` on an async interface and add an optional Upstash cache adapter in a separate package.
  - make all `WarpCache` operations async and replace `forget` with `delete`
  - allow custom async cache adapters through `ClientCacheConfig.adapter`
  - add `@joai/warps-cache-upstash` with an optional Upstash adapter
  - update internal SDK cache usage and linked PWA consumers to await cache access

## 4.1.0

### Minor Changes

- 3bea31e: Generalize custom wallet-provider support in the SDK and centralize remote signer integration behind backend-agnostic APIs.
  - Open `WarpWalletProvider` typing to support custom provider keys in SDK consumers.
  - Keep `CLOUD_WALLET_PROVIDERS` limited to built-in cloud providers.
  - Add new `@joai/warps-wallet-remote` package with:
    - `RemoteWalletProvider`
    - `createRemoteWalletProvider`
    - hardened endpoint validation and token validation
    - safe transaction payload handling for remote signer APIs (including bigint serialization)
    - extensibility hooks: `headers`, `getHeaders`, and `transformPayload`
  - Update NEAR and Sui adapters to support remote custom provider signing/send flows without local private-key assumptions.
  - Add regression tests for `wallet-remote`, `adapter-near`, and `adapter-sui` remote provider paths.

## 4.0.0

### Major Changes

- 9ed23b2: Add pluggable WarpResolver system for warp resolution from any source
  - Add `WarpResolver` interface with `getByAlias` and `getByHash` methods
  - Add `WarpChainResolver` (wraps existing chain adapters into WarpResolver)
  - Add `WarpCompositeResolver` (chains multiple resolvers, returns first match)
  - Add `@joai/warps-resolver-github` package for resolving warps from the GitHub catalog
  - `WarpClient` accepts optional `resolver` in options, defaults to chain-based resolution
  - `WarpRegistryInfo` fields `owner`, `createdAt`, `upgradedAt` are now nullable

## 3.5.0

### Minor Changes

- 9251911: Add platform support for cross-platform CLI warps
  - Add `WarpPlatformName` enum (`macos`, `linux`, `windows`) and `WarpPlatforms` array to core constants
  - Add `WarpPlatformValue<T>` generic type for platform-keyed values
  - Add `platform?: WarpPlatformName` to `WarpClientConfig`
  - Add `resolvePlatformValue()` and `isPlatformValue()` helpers
  - Update `WarpPromptAction.prompt` type to `WarpPlatformValue<string>` (backwards compatible — plain strings still work)
  - `WarpExecutor` resolves platform-specific prompt values before interpolation
  - Update JSON schema to support platform-keyed prompt definitions

## 3.4.1

### Patch Changes

- 1fb5758: Share transform input context construction in core helpers and expose resolved inputs (`inputs`) to output transform context.

## 3.4.0

### Minor Changes

- f7aabdf: Add `getWarpIdentifierWithQuery` helper that reconstructs a full identifier string (with query parameters) from a Warp's meta fields.

## 3.3.2

### Patch Changes

- eb9a009: fix: preserve falsy values (0, false, empty string) in placeholder interpolation

## 3.3.1

### Patch Changes

- 1a08d01: feat: add CLOUD_WALLET_PROVIDERS constant

## 3.3.0

### Minor Changes

- Add source identifier utilities for warps generated from external sources (ABI, OpenAPI).
