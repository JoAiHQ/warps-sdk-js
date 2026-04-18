# @joai/warps

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
