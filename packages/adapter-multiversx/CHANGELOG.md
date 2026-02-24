# @joai/warps-adapter-multiversx

## 1.2.2

### Patch Changes

- 7fe8b1b: Fix crash on transactions with multiple writeLog events (e.g. DEX swaps) by deferring parseExecute until an `out.` output mapping is actually needed. Event-only output warps no longer crash on these transactions. Also add support for nested event field access (e.g. `event.swap.4.token_amount_out`) to drill into struct fields within event outputs.

## 1.2.1

### Patch Changes

- 4b5782c: Fix next warp resolution in evaluateOutput. Adapter's getActionExecution no longer calls getNextInfo (it lacks adapters), executor now computes next with the full adapter context. Add WarpClient.getActionExecution for high-level action execution with resolved next.
- Updated dependencies [4b5782c]
  - @joai/warps@3.2.4

## 1.2.0

### Minor Changes

- 595336b: Add EnumType support to MultiversX serializer and ABI builder
  - Handle EnumType in typeToString, stringToTyped, typedToString, and nativeToType
  - Populate enum variant options in endpointsToWarps for UI dropdowns and MCP tool validation
  - Use discriminant values as option keys with variant names as labels

## 1.1.7

### Patch Changes

- fa811cf: Add `endpointsToWarps` method to ABI builder for converting ABI endpoints into Warp objects for contract interaction previews
- Updated dependencies [fa811cf]
  - @joai/warps@3.2.2

## 1.1.6

### Patch Changes

- Add `endpointsToWarps` method to ABI builder for converting ABI endpoints into Warp objects for contract interaction previews
- Updated dependencies
  - @joai/warps@3.2.1

## 1.1.5

### Patch Changes

- 8a5f452: Move nonce cache update from signTransaction to sendTransaction. Previously, a failed or rejected transaction (e.g. due to insufficient gas price) would leave a stale incremented nonce in cache, causing subsequent transactions to use nonce 1 when the account is still at nonce 0.

## 1.1.4

### Patch Changes

- b711fde: Add optional `minGasPrice` to `WarpChainInfo` and apply it to transactions after creation. Fixes "insufficient gas price" error on Claws sovereign chain which requires a gas price of 20000000000000 vs the MultiversX default of 1000000000.
- Updated dependencies [b711fde]
  - @joai/warps@3.1.1

## 1.1.3

### Patch Changes

- 7cbbb8c: Fix wallet providers using wrong address HRP for sovereign chains. The `Account` object was created without the chain's `addressHrp`, causing sender addresses to default to `erd` prefix instead of the chain-specific HRP (e.g. `claw`).

## 1.1.1

### Patch Changes

- 5c87a24: Fix wallet providers using wrong address HRP for custom chains (e.g. Claws). The `Account` object was created without the chain's `addressHrp`, defaulting to `erd` instead of the chain-specific HRP like `claw`. This caused API calls to fail with 404 when using non-MultiversX sovereign chains.

## 1.1.0

### Minor Changes

- 8562c8e: Rename Vibechain to Claws chain

### Patch Changes

- Updated dependencies [8562c8e]
  - @joai/warps@3.1.0

## 1.0.0

### Major Changes

- 1608055: migrate to joai org

### Minor Changes

- 1f9aa05: add user multi-wallet
- 4a5076c: further rearch
- c721f10: add wallet manager
- 74eaaca: update codec
- 042a162: update warp identifiers
- 9518f3f: further rearch
- cc79e6b: further rearch
- 67223b1: update registry configs
- 5321a6b: further rearch
- 924b053: further rearch
- b8988d5: add custom provider configs
- bf84508: update asset encoding
- 13b6127: update assets
- caf0979: update custom types + add type aliases
- 29b84b6: add data loader get-action
- c680090: add native token info to chain info
- dfaea22: add request signing
- a0c17ea: upgrade deps
- 40e8470: rearch + adapters
- 02ce817: add custom types
- 455faa2: update builds
- 795b560: update provider configs
- ed15620: update adapters
- 19db0e8: fix tests + move to esm
- 6a4249c: add wallet public key method
- 9a37aca: implement mvx transfers
- a6d698b: upgrade deps
- 90f1a05: add wallet providers
- d48e19b: update input preprocessing
- 66cd2fd: expand registry multi-chain
- 9b46d12: add local chain infos
- 627badf: add further struct support
- 73c3a6e: add adapter data loaders
- 3bd42a7: add multi-action exec
- 4d143d7: add data loader get-asset
- e97ec34: add x402 + update wallet management
- 06ad967: update builds
- 7299456: add asset type
- 0d22c03: update codec
- 3e86317: add wallet import + export
- 53f5231: rename results to output
- 1a32114: add chain explorers
- f0fccb0: update exec results
- 588aaf3: update adapter data loaders
- d005120: update exec results

### Patch Changes

- 3c58126: update mvx msg signing
- 6016b18: upgrade deps
- 94fb6d3: add opt brand to registry upgrade
- 5b50409: upgrade deps
- c390d84: update wallets
- ac6195b: update brand meta
- cff4951: upgrade deps
- 38716b0: add codec utils export
- 4aab0b2: update transforms
- 47a02a1: add name to chain configs
- 60574d5: fix brand references
- 9982ae8: fix mvx wallet undefined provider handling
- af8225c: update assets
- 4731910: update opt dest
- dca45d6: further rearch
- 1042334: add constants export
- ba2711c: further wallet updates
- b71bf40: update mvx wallet nonce management
- ce0daea: fix import
- f67aea4: update wallet gen to async
- cf8f0b1: further mvx sov chain support
- 836d6a8: update custom types
- 881e947: fix mvx missing logo value
- 1683154: update wallet mnemonics
- 050ec48: update caching
- 9d28cff: update wallet pub key fns
- 3dbc599: add chain to warp meta
- 0378c4e: update collect exec payloads
- 4e09d48: improve complex struct serialization
- df142e1: fix invalid import
- c9eb27c: update adapter chain configs
- 36fce86: add mvx helper exports
- 5850188: update mvx tx handling
- 552fe5e: improve external wallet provider support
- 440b74e: update chain infos
- bcce744: update executable transfers type
- 0dfbec0: update wallets
- 7885ddd: further rearch
- abf215f: fix mvx queries
- bd42722: add missing mvx bignum dep
- 0d85c51: further rearch
- 912ef91: fix import
- fcea985: update chain names
- b66881b: add readonly wallets
- dd226b9: add generic tx to warp executions
- 7a84c89: update egld token name
- 339cae5: update adapter configs
- 5f93802: refactor mvx tokens
- 0a18156: fix tx signing
- 9f92c0d: add destination to exec results
- d139b82: add further explorer endpoints
- 8a3c7c5: update chain prefixs
- 373292e: fix mvx egld asset serialization
- 9a4d7b7: further wallet updates
- 8e3d840: add registry config accessor
- 7591091: add mvx egld preprocessing support
- c3b3728: add resolved inputs to exec results
- fa98f00: update wallets
- 5af41e0: add further mvx tokens
- 7845948: update mvx nonce management
- 7927cf3: unify native token with assets
- 92c2d54: add further chain asset info
- 42de588: add mvx egld multi-transfer support
- aafaa2c: update mvx transfers
- a4b7dd5: fix mvx empty vector handling
- 071b45a: expose mvx chain names
- 4056843: update logo urls
- 4f0d6a7: further message localization updates
- 2fcba36: expose query results raw data
- 2ed4c75: fix circular dep
- ac459b0: update logo urls
- 3cbdf74: further wallet updates
- a919434: add missing mvx exports
- eb57e0d: add chain logos
- 5b91c62: update mvx preprocessing
- 6d787ae: add further mvx token transfer support
- Updated dependencies [6dc80d4]
- Updated dependencies [e145b00]
- Updated dependencies [1565180]
- Updated dependencies [e13b84e]
- Updated dependencies [1ee3790]
- Updated dependencies [6016b18]
- Updated dependencies [6aaf181]
- Updated dependencies [62a9872]
- Updated dependencies [2422598]
- Updated dependencies [1f9aa05]
- Updated dependencies [b674296]
- Updated dependencies [5b50409]
- Updated dependencies [bf64bcf]
- Updated dependencies [4a5076c]
- Updated dependencies [c390d84]
- Updated dependencies [d3a902d]
- Updated dependencies [3d5fb6c]
- Updated dependencies [ecc89cc]
- Updated dependencies [01e5545]
- Updated dependencies [d14ce36]
- Updated dependencies [15c79ad]
- Updated dependencies [c721f10]
- Updated dependencies [790aa8e]
- Updated dependencies [0956fc2]
- Updated dependencies [74eaaca]
- Updated dependencies [ac6195b]
- Updated dependencies [2f7e079]
- Updated dependencies [ece9c33]
- Updated dependencies [f842245]
- Updated dependencies [d54c656]
- Updated dependencies [cff4951]
- Updated dependencies [0a7a600]
- Updated dependencies [52413c2]
- Updated dependencies [8396ad3]
- Updated dependencies [1e09810]
- Updated dependencies [042a162]
- Updated dependencies [e35c4ae]
- Updated dependencies [67b18b2]
- Updated dependencies [c919e13]
- Updated dependencies [ed0d334]
- Updated dependencies [4aab0b2]
- Updated dependencies [9518f3f]
- Updated dependencies [cc79e6b]
- Updated dependencies [47a02a1]
- Updated dependencies [af8225c]
- Updated dependencies [29942ac]
- Updated dependencies [1fa32fc]
- Updated dependencies [fc92560]
- Updated dependencies [24d7d13]
- Updated dependencies [77980a4]
- Updated dependencies [ea6a310]
- Updated dependencies [7062a92]
- Updated dependencies [8113897]
- Updated dependencies [67223b1]
- Updated dependencies [51471f3]
- Updated dependencies [5321a6b]
- Updated dependencies [4731910]
- Updated dependencies [36f2e89]
- Updated dependencies [b6a76d9]
- Updated dependencies [6f02004]
- Updated dependencies [924b053]
- Updated dependencies [dca45d6]
- Updated dependencies [ba2711c]
- Updated dependencies [ea04086]
- Updated dependencies [b8988d5]
- Updated dependencies [a08385f]
- Updated dependencies [e354f53]
- Updated dependencies [8c61537]
- Updated dependencies [f67aea4]
- Updated dependencies [bf84508]
- Updated dependencies [68b361c]
- Updated dependencies [13b6127]
- Updated dependencies [836d6a8]
- Updated dependencies [caf0979]
- Updated dependencies [f372b98]
- Updated dependencies [a7696aa]
- Updated dependencies [685f80f]
- Updated dependencies [a37cb66]
- Updated dependencies [40e26de]
- Updated dependencies [90d2716]
- Updated dependencies [29b84b6]
- Updated dependencies [0e291f6]
- Updated dependencies [755115e]
- Updated dependencies [430edc0]
- Updated dependencies [e1fdbfb]
- Updated dependencies [ad9af2a]
- Updated dependencies [b6fbfef]
- Updated dependencies [5c50caf]
- Updated dependencies [6a6fa41]
- Updated dependencies [d791a5c]
- Updated dependencies [62f31d0]
- Updated dependencies [9953e4b]
- Updated dependencies [b7c77a6]
- Updated dependencies [18bac26]
- Updated dependencies [050ec48]
- Updated dependencies [ffb78b9]
- Updated dependencies [1608055]
- Updated dependencies [c680090]
- Updated dependencies [3dbc599]
- Updated dependencies [35c63e0]
- Updated dependencies [1460f4e]
- Updated dependencies [df20c26]
- Updated dependencies [fe5ae46]
- Updated dependencies [dedea75]
- Updated dependencies [dfaea22]
- Updated dependencies [0378c4e]
- Updated dependencies [c4287f5]
- Updated dependencies [a0c17ea]
- Updated dependencies [68ef882]
- Updated dependencies [4e09d48]
- Updated dependencies [40e8470]
- Updated dependencies [02ce817]
- Updated dependencies [b7bd1d6]
- Updated dependencies [517e93c]
- Updated dependencies [455faa2]
- Updated dependencies [ae4d46e]
- Updated dependencies [785b1cd]
- Updated dependencies [3ad6ca0]
- Updated dependencies [b22adbf]
- Updated dependencies [552fe5e]
- Updated dependencies [795b560]
- Updated dependencies [451e003]
- Updated dependencies [1957541]
- Updated dependencies [e69c5b9]
- Updated dependencies [51ab733]
- Updated dependencies [8d57441]
- Updated dependencies [440b74e]
- Updated dependencies [f2a9fa4]
- Updated dependencies [08f2815]
- Updated dependencies [bcce744]
- Updated dependencies [4af1b7d]
- Updated dependencies [19db0e8]
- Updated dependencies [7885ddd]
- Updated dependencies [986eb76]
- Updated dependencies [c51a381]
- Updated dependencies [53cdfdd]
- Updated dependencies [0d85c51]
- Updated dependencies [6a4249c]
- Updated dependencies [694c989]
- Updated dependencies [0016189]
- Updated dependencies [67f44af]
- Updated dependencies [b6277da]
- Updated dependencies [fd56907]
- Updated dependencies [fcea985]
- Updated dependencies [0d9bbc7]
- Updated dependencies [d9bb08c]
- Updated dependencies [68aadaf]
- Updated dependencies [0cf15c7]
- Updated dependencies [cf418e1]
- Updated dependencies [d639fab]
- Updated dependencies [eff7bda]
- Updated dependencies [b66881b]
- Updated dependencies [a6d698b]
- Updated dependencies [92e516d]
- Updated dependencies [52a0958]
- Updated dependencies [e546232]
- Updated dependencies [dd226b9]
- Updated dependencies [735334a]
- Updated dependencies [1f7ba22]
- Updated dependencies [522ea70]
- Updated dependencies [f243b65]
- Updated dependencies [1e420bd]
- Updated dependencies [90f1a05]
- Updated dependencies [f9628d4]
- Updated dependencies [d48e19b]
- Updated dependencies [66cd2fd]
- Updated dependencies [9b46d12]
- Updated dependencies [9f77831]
- Updated dependencies [970fc74]
- Updated dependencies [7a96317]
- Updated dependencies [f1781da]
- Updated dependencies [627badf]
- Updated dependencies [88f92f7]
- Updated dependencies [73c3a6e]
- Updated dependencies [d1393e9]
- Updated dependencies [3bd42a7]
- Updated dependencies [c8b0a9b]
- Updated dependencies [f6ee4e7]
- Updated dependencies [0a56c3f]
- Updated dependencies [9f92c0d]
- Updated dependencies [d139b82]
- Updated dependencies [8a3c7c5]
- Updated dependencies [3f391a6]
- Updated dependencies [12ea059]
- Updated dependencies [472039c]
- Updated dependencies [aa0d529]
- Updated dependencies [9a4d7b7]
- Updated dependencies [8e3d840]
- Updated dependencies [cef7d58]
- Updated dependencies [4d143d7]
- Updated dependencies [6b15123]
- Updated dependencies [c3b3728]
- Updated dependencies [8739a1f]
- Updated dependencies [27a5e55]
- Updated dependencies [073d9d9]
- Updated dependencies [5d02aa5]
- Updated dependencies [c113bf6]
- Updated dependencies [7c563e5]
- Updated dependencies [fa98f00]
- Updated dependencies [91f4117]
- Updated dependencies [59047d1]
- Updated dependencies [c2c95c7]
- Updated dependencies [14b21c0]
- Updated dependencies [2c038bf]
- Updated dependencies [d919b6e]
- Updated dependencies [4eed1a3]
- Updated dependencies [1de97fd]
- Updated dependencies [e97ec34]
- Updated dependencies [06ad967]
- Updated dependencies [7299456]
- Updated dependencies [4ce5b8c]
- Updated dependencies [f371878]
- Updated dependencies [92c2d54]
- Updated dependencies [ca86180]
- Updated dependencies [496987c]
- Updated dependencies [0d22c03]
- Updated dependencies [0476e7e]
- Updated dependencies [3e86317]
- Updated dependencies [d71157b]
- Updated dependencies [657d125]
- Updated dependencies [396f7bb]
- Updated dependencies [93fbd3d]
- Updated dependencies [80d0af8]
- Updated dependencies [53f5231]
- Updated dependencies [57685fc]
- Updated dependencies [98a47e1]
- Updated dependencies [1a32114]
- Updated dependencies [54bed31]
- Updated dependencies [4f0d6a7]
- Updated dependencies [bd2031e]
- Updated dependencies [822d380]
- Updated dependencies [f0fccb0]
- Updated dependencies [6cbd2f2]
- Updated dependencies [9b2716f]
- Updated dependencies [588aaf3]
- Updated dependencies [7173aa3]
- Updated dependencies [3cbdf74]
- Updated dependencies [df98dcd]
- Updated dependencies [d647f6a]
- Updated dependencies [eb57e0d]
- Updated dependencies [65baae4]
- Updated dependencies [ace8d3e]
- Updated dependencies [3926ed6]
- Updated dependencies [df7ab42]
- Updated dependencies [d005120]
- Updated dependencies [17100a4]
- Updated dependencies [38bb15f]
- Updated dependencies [71bcf40]
- Updated dependencies [1613364]
  - @joai/warps@3.0.0

## 1.0.0-beta.101

### Patch Changes

- 9982ae8: fix mvx wallet undefined provider handling

## 1.0.0-beta.100

### Patch Changes

- 5850188: update mvx tx handling

## 1.0.0-beta.99

### Major Changes

- 1608055: migrate to joai org

### Patch Changes

- Updated dependencies [1608055]
  - @joai/warps@3.0.0-beta.198

## 0.2.0-beta.98

### Patch Changes

- 050ec48: update caching
- Updated dependencies [050ec48]
  - @joai/warps@3.0.0-beta.192

## 0.2.0-beta.97

### Patch Changes

- 4056843: update logo urls
- Updated dependencies [0016189]
- Updated dependencies [57685fc]
  - @joai/warps@3.0.0-beta.189

## 0.2.0-beta.96

### Patch Changes

- fa98f00: update wallets
- Updated dependencies [fa98f00]
  - @joai/warps@3.0.0-beta.187

## 0.2.0-beta.95

### Patch Changes

- 1683154: update wallet mnemonics

## 0.2.0-beta.94

### Patch Changes

- 0a18156: fix tx signing

## 0.2.0-beta.93

### Patch Changes

- 912ef91: fix import

## 0.2.0-beta.92

### Patch Changes

- c390d84: update wallets
- fcea985: update chain names
- Updated dependencies [c390d84]
- Updated dependencies [fcea985]
  - @joai/warps@3.0.0-beta.185

## 0.2.0-beta.91

### Minor Changes

- 3e86317: add wallet import + export

### Patch Changes

- f67aea4: update wallet gen to async
- Updated dependencies [f67aea4]
- Updated dependencies [3e86317]
  - @joai/warps@3.0.0-beta.184

## 0.2.0-beta.90

### Patch Changes

- ba2711c: further wallet updates
- Updated dependencies [ba2711c]
  - @joai/warps@3.0.0-beta.181

## 0.2.0-beta.89

### Patch Changes

- 3cbdf74: further wallet updates
- Updated dependencies [3cbdf74]
  - @joai/warps@3.0.0-beta.180

## 0.2.0-beta.88

### Patch Changes

- 9a4d7b7: further wallet updates
- Updated dependencies [9a4d7b7]
  - @joai/warps@3.0.0-beta.179

## 0.2.0-beta.87

### Patch Changes

- b66881b: add readonly wallets
- Updated dependencies [b66881b]
  - @joai/warps@3.0.0-beta.178

## 0.2.0-beta.86

### Minor Changes

- e97ec34: add x402 + update wallet management

### Patch Changes

- 552fe5e: improve external wallet provider support
- Updated dependencies [552fe5e]
- Updated dependencies [e97ec34]
  - @joai/warps@3.0.0-beta.175

## 0.2.0-beta.85

### Minor Changes

- 90f1a05: add wallet providers

### Patch Changes

- Updated dependencies [90f1a05]
  - @joai/warps@3.0.0-beta.174

## 0.2.0-beta.84

### Patch Changes

- ac459b0: update logo urls

## 0.2.0-beta.83

### Patch Changes

- 6016b18: upgrade deps
- Updated dependencies [6016b18]
- Updated dependencies [496987c]
  - @joai/warps@3.0.0-beta.169

## 0.2.0-beta.82

### Patch Changes

- c3b3728: add resolved inputs to exec results
- Updated dependencies [c3b3728]
  - @joai/warps@3.0.0-beta.161

## 0.2.0-beta.81

### Patch Changes

- 9d28cff: update wallet pub key fns

## 0.2.0-beta.80

### Minor Changes

- 6a4249c: add wallet public key method

### Patch Changes

- Updated dependencies [6a4249c]
- Updated dependencies [7173aa3]
  - @joai/warps@3.0.0-beta.159

## 0.2.0-beta.79

### Patch Changes

- 0378c4e: update collect exec payloads
- Updated dependencies [0378c4e]
  - @joai/warps@3.0.0-beta.157

## 0.2.0-beta.78

### Patch Changes

- 9f92c0d: add destination to exec results
- Updated dependencies [9f92c0d]
  - @joai/warps@3.0.0-beta.156

## 0.2.0-beta.77

### Patch Changes

- 4f0d6a7: further message localization updates
- Updated dependencies [4f0d6a7]
  - @joai/warps@3.0.0-beta.153

## 0.2.0-alpha.76

### Patch Changes

- 4731910: update opt dest
- Updated dependencies [4731910]
- Updated dependencies [38bb15f]
  - @joai/warps@3.0.0-alpha.152

## 0.2.0-alpha.75

### Minor Changes

- 53f5231: rename results to output
- f0fccb0: update exec results

### Patch Changes

- Updated dependencies [c919e13]
- Updated dependencies [53f5231]
- Updated dependencies [f0fccb0]
  - @joai/warps@3.0.0-alpha.148

## 0.2.0-alpha.74

### Patch Changes

- 2fcba36: expose query results raw data

## 0.2.0-alpha.73

### Patch Changes

- 4aab0b2: update transforms
- Updated dependencies [4aab0b2]
  - @joai/warps@3.0.0-alpha.146

## 0.2.0-alpha.72

### Patch Changes

- 7845948: update mvx nonce management

## 0.2.0-alpha.71

### Minor Changes

- update warp identifiers

### Patch Changes

- Updated dependencies
  - @joai/warps@3.0.0-alpha.142

## 0.2.0-alpha.70

### Minor Changes

- 795b560: update provider configs

### Patch Changes

- Updated dependencies [795b560]
  - @joai/warps@3.0.0-alpha.139

## 0.2.0-alpha.69

### Patch Changes

- 881e947: fix mvx missing logo value

## 0.2.0-alpha.68

### Patch Changes

- bd42722: add missing mvx bignum dep

## 0.2.0-alpha.67

### Minor Changes

- a0c17ea: upgrade deps

### Patch Changes

- Updated dependencies [a0c17ea]
- Updated dependencies [f243b65]
  - @joai/warps@3.0.0-alpha.131

## 0.2.0-alpha.66

### Patch Changes

- 3c58126: update mvx msg signing

## 0.2.0-alpha.65

### Minor Changes

- 3bd42a7: add multi-action exec

### Patch Changes

- Updated dependencies [6a6fa41]
- Updated dependencies [68aadaf]
- Updated dependencies [735334a]
- Updated dependencies [3bd42a7]
- Updated dependencies [d919b6e]
  - @joai/warps@3.0.0-alpha.118

## 0.2.0-alpha.64

### Minor Changes

- d005120: update exec results

### Patch Changes

- Updated dependencies [d005120]
  - @joai/warps@3.0.0-alpha.116

## 0.2.0-alpha.63

### Patch Changes

- 53ac884: update complex type serialization
- Updated dependencies [53ac884]
  - @joai/warps@3.0.0-alpha.115

## 0.2.0-alpha.62

### Minor Changes

- 0d22c03: update codec

### Patch Changes

- Updated dependencies [0d22c03]
  - @joai/warps@3.0.0-alpha.114

## 0.2.0-alpha.61

### Patch Changes

- a4b7dd5: fix mvx empty vector handling

## 0.2.0-alpha.60

### Patch Changes

- 4e09d48: improve complex struct serialization
- Updated dependencies [4e09d48]
  - @joai/warps@3.0.0-alpha.113

## 0.2.0-alpha.59

### Minor Changes

- caf0979: update custom types + add type aliases

### Patch Changes

- Updated dependencies [caf0979]
- Updated dependencies [df20c26]
- Updated dependencies [4af1b7d]
  - @joai/warps@3.0.0-alpha.112

## 0.2.0-alpha.58

### Minor Changes

- 627badf: add further struct support

### Patch Changes

- Updated dependencies [627badf]
  - @joai/warps@3.0.0-alpha.110

## 0.2.0-alpha.57

### Minor Changes

- 74eaaca: update codec

### Patch Changes

- Updated dependencies [74eaaca]
  - @joai/warps@3.0.0-alpha.108

## 0.2.0-alpha.56

### Patch Changes

- b71bf40: update mvx wallet nonce management
- aafaa2c: update mvx transfers

## 0.2.0-alpha.55

### Patch Changes

- 5f93802: refactor mvx tokens
- 5af41e0: add further mvx tokens
- Updated dependencies [0956fc2]
  - @joai/warps@3.0.0-alpha.107

## 0.2.0-alpha.54

### Patch Changes

- 0dfbec0: update wallets
- 8a3c7c5: update chain prefixs
- Updated dependencies [8a3c7c5]
  - @joai/warps@3.0.0-alpha.105

## 0.2.0-alpha.53

### Patch Changes

- eb57e0d: add chain logos
- Updated dependencies [eb57e0d]
  - @joai/warps@3.0.0-alpha.104

## 0.2.0-alpha.52

### Patch Changes

- 36fce86: add mvx helper exports
- 92c2d54: add further chain asset info
- Updated dependencies [92c2d54]
  - @joai/warps@3.0.0-alpha.103

## 0.2.0-alpha.51

### Minor Changes

- c721f10: add wallet manager

### Patch Changes

- Updated dependencies [c721f10]
- Updated dependencies [93fbd3d]
  - @joai/warps@3.0.0-alpha.102

## 0.2.0-alpha.50

### Patch Changes

- ac6195b: update brand meta
- Updated dependencies [ac6195b]
  - @joai/warps@3.0.0-alpha.97

## 0.2.0-alpha.49

### Patch Changes

- 94fb6d3: add opt brand to registry upgrade

## 0.2.0-alpha.48

### Patch Changes

- 5b50409: upgrade deps
- Updated dependencies [5b50409]
- Updated dependencies [a7696aa]
- Updated dependencies [1613364]
  - @joai/warps@3.0.0-alpha.95

## 0.2.0-alpha.47

### Minor Changes

- d48e19b: update input preprocessing
- 588aaf3: update adapter data loaders

### Patch Changes

- Updated dependencies [cf418e1]
- Updated dependencies [d48e19b]
- Updated dependencies [588aaf3]
  - @joai/warps@3.0.0-alpha.92

## 0.2.0-alpha.46

### Minor Changes

- 29b84b6: add data loader get-action
- 4d143d7: add data loader get-asset

### Patch Changes

- cf8f0b1: further mvx sov chain support
- Updated dependencies [29b84b6]
- Updated dependencies [7a96317]
- Updated dependencies [4d143d7]
  - @joai/warps@3.0.0-alpha.91

## 0.2.0-alpha.45

### Patch Changes

- af8225c: update assets
- Updated dependencies [af8225c]
  - @joai/warps@3.0.0-alpha.90

## 0.2.0-alpha.44

### Patch Changes

- 373292e: fix mvx egld asset serialization

## 0.2.0-alpha.43

### Patch Changes

- 7591091: add mvx egld preprocessing support

## 0.2.0-alpha.42

### Minor Changes

- bf84508: update asset encoding

### Patch Changes

- Updated dependencies [bf84508]
  - @joai/warps@3.0.0-alpha.89

## 0.2.0-alpha.41

### Patch Changes

- 7927cf3: unify native token with assets

## 0.2.0-alpha.40

### Minor Changes

- 13b6127: update assets

### Patch Changes

- Updated dependencies [13b6127]
  - @joai/warps@3.0.0-alpha.88

## 0.2.0-alpha.39

### Minor Changes

- 455faa2: update builds

### Patch Changes

- Updated dependencies [8c61537]
- Updated dependencies [455faa2]
  - @joai/warps@3.0.0-alpha.87

## 0.2.0-alpha.38

### Minor Changes

- ed15620: update adapters

### Patch Changes

- df142e1: fix invalid import
- c9eb27c: update adapter chain configs
- abf215f: fix mvx queries
- Updated dependencies [eff7bda]
  - @joai/warps@3.0.0-alpha.86

## 0.2.0-alpha.37

### Patch Changes

- 7a84c89: update egld token name

## 0.2.0-alpha.36

### Minor Changes

- c680090: add native token info to chain info

### Patch Changes

- 42de588: add mvx egld multi-transfer support
- Updated dependencies [c680090]
  - @joai/warps@3.0.0-alpha.85

## 0.2.0-alpha.35

### Patch Changes

- dd226b9: add generic tx to warp executions
- 6d787ae: add further mvx token transfer support
- Updated dependencies [dd226b9]
  - @joai/warps@3.0.0-alpha.84

## 0.2.0-alpha.34

### Minor Changes

- 9a37aca: implement mvx transfers

### Patch Changes

- bcce744: update executable transfers type
- Updated dependencies [bcce744]
  - @joai/warps@3.0.0-alpha.83

## 0.2.0-alpha.33

### Patch Changes

- 5b91c62: update mvx preprocessing
- Updated dependencies [f2a9fa4]
  - @joai/warps@3.0.0-alpha.81

## 0.2.0-alpha.32

### Patch Changes

- 836d6a8: update custom types
- Updated dependencies [836d6a8]
  - @joai/warps@3.0.0-alpha.78

## 0.2.0-alpha.31

### Minor Changes

- 02ce817: add custom types
- 7299456: add asset type

### Patch Changes

- Updated dependencies [02ce817]
- Updated dependencies [7299456]
  - @joai/warps@3.0.0-alpha.77

## 0.2.0-alpha.30

### Minor Changes

- b8988d5: add custom provider configs

### Patch Changes

- Updated dependencies [b8988d5]
  - @joai/warps@3.0.0-alpha.76

## 0.2.0-alpha.29

### Minor Changes

- 06ad967: update builds

### Patch Changes

- Updated dependencies [06ad967]
  - @joai/warps@3.0.0-alpha.75

## 0.2.0-alpha.28

### Minor Changes

- 19db0e8: fix tests + move to esm

### Patch Changes

- Updated dependencies [19db0e8]
  - @joai/warps@3.0.0-alpha.73

## 0.2.0-alpha.27

### Patch Changes

- cff4951: upgrade deps
- Updated dependencies [cff4951]
  - @joai/warps@3.0.0-alpha.72

## 0.2.0-alpha.26

### Patch Changes

- 071b45a: expose mvx chain names

## 0.2.0-alpha.25

### Patch Changes

- d139b82: add further explorer endpoints
- Updated dependencies [d139b82]
  - @joai/warps@3.0.0-alpha.70

## 0.2.0-alpha.24

### Minor Changes

- 73c3a6e: add adapter data loaders

### Patch Changes

- Updated dependencies [73c3a6e]
  - @joai/warps@3.0.0-alpha.68

## 0.2.0-alpha.23

### Patch Changes

- 440b74e: update chain infos
- 2ed4c75: fix circular dep
- Updated dependencies [440b74e]
  - @joai/warps@3.0.0-alpha.63

## 0.2.0-alpha.22

### Patch Changes

- 47a02a1: add name to chain configs
- Updated dependencies [47a02a1]
  - @joai/warps@3.0.0-alpha.62

## 0.2.0-alpha.21

### Patch Changes

- a919434: add missing mvx exports

## 0.2.0-alpha.20

### Minor Changes

- 9b46d12: add local chain infos

### Patch Changes

- Updated dependencies [9b46d12]
  - @joai/warps@3.0.0-alpha.61

## 0.2.0-alpha.19

### Minor Changes

- dfaea22: add request signing

### Patch Changes

- Updated dependencies [dfaea22]
- Updated dependencies [2c038bf]
  - @joai/warps@3.0.0-alpha.60

## 0.2.0-alpha.18

### Patch Changes

- 38716b0: add codec utils export

## 0.2.0-alpha.17

### Minor Changes

- a6d698b: upgrade deps

### Patch Changes

- Updated dependencies [a6d698b]
  - @joai/warps@3.0.0-alpha.58

## 0.2.0-alpha.16

### Patch Changes

- 339cae5: update adapter configs

## 0.2.0-alpha.15

### Minor Changes

- 4a5076c: further rearch
- 9518f3f: further rearch

### Patch Changes

- Updated dependencies [4a5076c]
- Updated dependencies [9518f3f]
  - @joai/warps@3.0.0-alpha.56

## 0.2.0-alpha.14

### Patch Changes

- 3dbc599: add chain to warp meta
- Updated dependencies [3dbc599]
  - @joai/warps@3.0.0-alpha.54

## 0.2.0-alpha.13

### Patch Changes

- 8e3d840: add registry config accessor
- Updated dependencies [8e3d840]
  - @joai/warps@3.0.0-alpha.53

## 0.2.0-alpha.12

### Minor Changes

- 1f9aa05: add user multi-wallet

### Patch Changes

- Updated dependencies [1f9aa05]
  - @joai/warps@3.0.0-alpha.48

## 0.2.0-alpha.11

### Minor Changes

- 67223b1: update registry configs

### Patch Changes

- Updated dependencies [67223b1]
- Updated dependencies [0cf15c7]
  - @joai/warps@3.0.0-alpha.47

## 0.2.0-alpha.10

### Minor Changes

- 66cd2fd: expand registry multi-chain

### Patch Changes

- Updated dependencies [66cd2fd]
  - @joai/warps@3.0.0-alpha.46

## 0.2.0-alpha.9

### Minor Changes

- 1a32114: add chain explorers

### Patch Changes

- Updated dependencies [1a32114]
  - @joai/warps@3.0.0-alpha.45

## 0.2.0-alpha.8

### Patch Changes

- ce0daea: fix import

## 0.2.0-alpha.7

### Minor Changes

- 924b053: further rearch

### Patch Changes

- Updated dependencies [924b053]
  - @joai/warps@3.0.0-alpha.44

## 0.2.0-alpha.6

### Minor Changes

- cc79e6b: further rearch

### Patch Changes

- Updated dependencies [cc79e6b]
  - @joai/warps@3.0.0-alpha.40

## 0.2.0-alpha.5

### Patch Changes

- 0d85c51: further rearch
- Updated dependencies [3ad6ca0]
- Updated dependencies [0d85c51]
  - @joai/warps@3.0.0-alpha.34

## 0.2.0-alpha.4

### Patch Changes

- dca45d6: further rearch
- 7885ddd: further rearch
- Updated dependencies [dca45d6]
- Updated dependencies [7885ddd]
  - @joai/warps@0.2.0-alpha.5

## 0.2.0-alpha.3

### Minor Changes

- 5321a6b: further rearch

### Patch Changes

- Updated dependencies [5321a6b]
- Updated dependencies [a707263]
  - @joai/warps@0.2.0-alpha.4

## 0.2.0-alpha.2

### Patch Changes

- 60574d5: fix brand references
- Updated dependencies [60574d5]
- Updated dependencies [29942ac]
  - @joai/warps@0.2.0-alpha.3

## 0.2.0-alpha.1

### Patch Changes

- 1042334: add constants export

## 0.2.0-alpha.0

### Minor Changes

- 40e8470: rearch + adapters

### Patch Changes

- Updated dependencies [40e8470]
  - @joai/warps@0.2.0-alpha.0
