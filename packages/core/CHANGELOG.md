# @vleap/warp-sdk-core

## 3.2.5

### Patch Changes

- Fix transfers without asset: prefix in warp definitions. Transfers are always assets, so the SDK now adds the asset: prefix when missing.

## 3.2.4

### Patch Changes

- 4b5782c: Fix next warp resolution in evaluateOutput. Adapter's getActionExecution no longer calls getNextInfo (it lacks adapters), executor now computes next with the full adapter context. Add WarpClient.getActionExecution for high-level action execution with resolved next.

## 3.2.3

### Patch Changes

- ace27ae: Fix BigInt cache serialization prefix collision with typed input values. Changed prefix from `biguint:` to `$bigint:` to prevent the reviver from corrupting ResolvedInput value strings like `"biguint:99900000000000000"` into native BigInts, which caused `stringToNative` to crash with `t.split is not a function`.

## 3.2.2

### Patch Changes

- fa811cf: Add `endpointsToWarps` method to ABI builder for converting ABI endpoints into Warp objects for contract interaction previews

## 3.2.1

### Patch Changes

- Add `endpointsToWarps` method to ABI builder for converting ABI endpoints into Warp objects for contract interaction previews

## 3.2.0

### Minor Changes

- c55b591: Add `WarpSchedule` type and optional `schedule` field to `Warp` for defining recurring task schedules (minutely, hourly, daily, weekly, monthly, yearly)

## 3.1.1

### Patch Changes

- b711fde: Add optional `minGasPrice` to `WarpChainInfo` and apply it to transactions after creation. Fixes "insufficient gas price" error on Claws sovereign chain which requires a gas price of 20000000000000 vs the MultiversX default of 1000000000.

## 3.1.0

### Minor Changes

- 8562c8e: Rename Vibechain to Claws chain

## 3.0.2

### Patch Changes

- 44000d0: Add removeWarpChainPrefix helper to core identifier helpers.

## 3.0.1

### Patch Changes

- fix(core): remove implicit output unwrapping and inject 'out' into transform context

## 3.0.0

### Major Changes

- 1608055: migrate to joai org
- 8d57441: re-arch multi-package + adapters
- 694c989: prepend warp prefix to vars + types
- d647f6a: update collect exec body

### Minor Changes

- 6dc80d4: add structs and complex type fixes
- 6aaf181: add custom collector payloads
- 1f9aa05: add user multi-wallet
- 4a5076c: further rearch
- c721f10: add wallet manager
- f842245: update protocol version
- d54c656: add prompts default output
- 042a162: update warp identifiers
- 9518f3f: further rearch
- cc79e6b: further rearch
- fc92560: update transformations
- ea6a310: add input transform modifier
- 7062a92: add input-based results
- 67223b1: update registry configs
- 5321a6b: further rearch
- 6f02004: add prompt action outputs
- 924b053: further rearch
- ea04086: add action conditionals
- b8988d5: add custom provider configs
- bf84508: update asset encoding
- 13b6127: update assets
- caf0979: update custom types + add type aliases
- 90d2716: add query to warp meta
- 29b84b6: add data loader get-action
- 430edc0: add automatic input typing
- ad9af2a: add primary input references
- b6fbfef: update executor
- 5c50caf: add alert types
- 62f31d0: add asset object positions + nested primary references
- c680090: add native token info to chain info
- dfaea22: add request signing
- c4287f5: add index to client
- a0c17ea: upgrade deps
- 40e8470: rearch + adapters
- 02ce817: add custom types
- 455faa2: update builds
- ae4d46e: rearch + adapters
- 785b1cd: add input interpolation
- 795b560: update provider configs
- 19db0e8: fix tests + move to esm
- c51a381: add brand i18
- 6a4249c: add wallet public key method
- 0016189: add cache static strategy
- fd56907: add dynamic env injection to executor
- a6d698b: upgrade deps
- 52a0958: add evm somnia network
- e546232: add hidden input sources
- 90f1a05: add wallet providers
- d48e19b: update input preprocessing
- 66cd2fd: expand registry multi-chain
- 9b46d12: add local chain infos
- 627badf: add further struct support
- 73c3a6e: add adapter data loaders
- 3bd42a7: add multi-action exec
- 12ea059: update result evaluations
- aa0d529: add warp prompts
- 4d143d7: add data loader get-asset
- 5d02aa5: add near adapter
- 59047d1: update i18n
- d919b6e: add vars query description support
- e97ec34: add x402 + update wallet management
- 06ad967: update builds
- 7299456: add asset type
- f371878: add registry chain management
- 496987c: add mcp
- 0d22c03: update codec
- 0476e7e: add input defaults
- 3e86317: add wallet import + export
- 657d125: add transformations
- 53f5231: rename results to output
- 57685fc: add cache file strategy
- 98a47e1: update client executor impl
- 1a32114: add chain explorers
- f0fccb0: update exec results
- 588aaf3: update adapter data loaders
- 65baae4: add chain position
- d005120: update exec results
- 38bb15f: add localized messages

### Patch Changes

- e145b00: update types
- 1565180: update primary action selection
- e13b84e: expose resolved inputs
- 1ee3790: add logging
- 6016b18: upgrade deps
- 62a9872: add client execute from url support
- 2422598: update crypto signing
- b674296: expose client config
- 5b50409: upgrade deps
- bf64bcf: localize warp options
- c390d84: update wallets
- d3a902d: update warp theme config
- 3d5fb6c: add chain-specific wallet globals
- ecc89cc: update warp user fields to nullable
- 01e5545: update primary action func
- d14ce36: fix client create inscription fn
- 15c79ad: update execution
- 790aa8e: add factory to client
- 0956fc2: update asset codec
- 74eaaca: update codec
- ac6195b: update brand meta
- 2f7e079: update action determination
- ece9c33: fix warp detector resolved chain
- cff4951: upgrade deps
- 0a7a600: add logging
- 52413c2: update caching
- 8396ad3: add err msg to collect executor
- 1e09810: add collect response to results
- e35c4ae: update logging
- 67b18b2: update client detection
- c919e13: add custom destinations
- ed0d334: add brand logo helper
- 4aab0b2: update transforms
- 47a02a1: add name to chain configs
- af8225c: update assets
- 29942ac: add warp brand prefixes
- 1fa32fc: fix chain position from inputs
- 24d7d13: update caching
- 77980a4: update exec error handling
- 8113897: remove value serialization for collect responses
- 51471f3: fix input result resolving for contract actions
- 4731910: update opt dest
- 36f2e89: update detecter
- b6a76d9: add client registry init
- dca45d6: further rearch
- ba2711c: further wallet updates
- a08385f: fix circ dep
- e354f53: update dependencies
- 8c61537: add further integer types
- f67aea4: update wallet gen to async
- 68b361c: update remote warp detection
- 836d6a8: update custom types
- f372b98: add warp primary actions
- a7696aa: add client exec support via object
- 685f80f: update i18n
- a37cb66: fix warp from url exec
- 40e26de: add warp exec error handler
- 0e291f6: add warp releated field"
- 755115e: update meta query format
- e1fdbfb: add missing alert export
- 6a6fa41: add action link interceptor
- d791a5c: add change
- 9953e4b: update mcp
- b7c77a6: add default chain config
- 18bac26: update globals user wallet interpolation
- 050ec48: update caching
- ffb78b9: expose client data loader
- 3dbc599: add chain to warp meta
- 35c63e0: add i18n
- 1460f4e: add env helper
- df20c26: add executor immediate result
- fe5ae46: update chain asset logo to be nullable
- dedea75: fix meta query input resolution
- 0378c4e: update collect exec payloads
- 68ef882: update warp builder
- 4e09d48: improve complex struct serialization
- b7bd1d6: upgrade deps
- 517e93c: add client adapters accessor
- 3ad6ca0: further rearch
- b22adbf: update user wallets type
- 552fe5e: improve external wallet provider support
- 451e003: add missing imports
- 1957541: update detection for hashes
- e69c5b9: update u64 util
- 51ab733: add warp user
- 440b74e: update chain infos
- f2a9fa4: update utils
- 08f2815: update types
- bcce744: update executable transfers type
- 4af1b7d: add executor immediate result
- 7885ddd: further rearch
- 986eb76: update i18n
- 53cdfdd: refactor chain determination
- 0d85c51: further rearch
- 67f44af: add input query value fallbacks
- b6277da: add vibe esdt to known tokens
- fcea985: update chain names
- 0d9bbc7: add warp chain name enum
- d9bb08c: fix executor
- 68aadaf: add exec meta queries
- 0cf15c7: update execution
- cf418e1: fix input handling
- d639fab: update static cache strategy
- eff7bda: fix factory
- b66881b: add readonly wallets
- 92e516d: resolve inputs for results
- dd226b9: add generic tx to warp executions
- 735334a: add action link exec
- 1f7ba22: update solana - wip
- 522ea70: fix auth signing
- f243b65: update alias marker handling
- 1e420bd: add evm chain names constant
- f9628d4: add env secret type + helper
- 9f77831: add action to alert type
- 970fc74: update vm dependencies
- 7a96317: fix asset serialization
- f1781da: add registry native token
- 88f92f7: rearch wallet helpers
- d1393e9: update collect http
- c8b0a9b: add warp input globals interpolations
- f6ee4e7: update native esdt handling
- 0a56c3f: fix import
- 9f92c0d: add destination to exec results
- d139b82: add further explorer endpoints
- 8a3c7c5: update chain prefixs
- 3f391a6: fix registry upgrade signature
- 472039c: update io evaluations
- 9a4d7b7: further wallet updates
- 8e3d840: add registry config accessor
- cef7d58: fix crypto usage errors
- 6b15123: update primariy action + auto rules
- c3b3728: add resolved inputs to exec results
- 8739a1f: update client create from tx hash
- 27a5e55: fix multi-env caching
- 073d9d9: add alert helper
- c113bf6: fix registry chain set args
- 7c563e5: fix util asset encoding
- fa98f00: update wallets
- 91f4117: add warp uis"
- c2c95c7: add alert label
- 14b21c0: add warp languages const
- 2c038bf: add fallback adapters
- 4eed1a3: add chain to detection result
- 1de97fd: update warp builders
- 4ce5b8c: add chain + token logo themes
- 92c2d54: add further chain asset info
- ca86180: add identifier utilities
- d71157b: add brand themed logos
- 396f7bb: update gas limits
- 93fbd3d: upate env var interpolation
- 80d0af8: update identifier util
- 54bed31: add input helper function
- 4f0d6a7: further message localization updates
- bd2031e: extend warp builder
- 822d380: add exec handler async-sync
- 6cbd2f2: add warp query parsing helper
- 9b2716f: update unhandled collect output
- 7173aa3: add wallet pub key global
- 3cbdf74: further wallet updates
- df98dcd: remove obsolete registry arg
- eb57e0d: add chain logos
- ace8d3e: set client chains property to public
- 3926ed6: update executor
- df7ab42: update exec handlers to optional
- 17100a4: add execute auto-handling for meta queries
- 71bcf40: add results to client
- 1613364: update cache local storage serialization

## 3.0.0-beta.207

### Patch Changes

- dedea75: fix meta query input resolution

## 3.0.0-beta.206

### Patch Changes

- 755115e: update meta query format

## 3.0.0-beta.205

### Patch Changes

- 6cbd2f2: add warp query parsing helper
- 17100a4: add execute auto-handling for meta queries

## 3.0.0-beta.204

### Patch Changes

- 67f44af: add input query value fallbacks

## 3.0.0-beta.203

### Patch Changes

- b7c77a6: add default chain config

## 3.0.0-beta.202

### Patch Changes

- 18bac26: update globals user wallet interpolation

## 3.0.0-beta.201

### Patch Changes

- c8b0a9b: add warp input globals interpolations

## 3.0.0-beta.200

### Patch Changes

- ecc89cc: update warp user fields to nullable

## 3.0.0-beta.199

### Patch Changes

- 51ab733: add warp user
- 1e420bd: add evm chain names constant

## 3.0.0-beta.198

### Major Changes

- 1608055: migrate to joai org

## 3.0.0-beta.197

### Patch Changes

- 68b361c: update remote warp detection

## 3.0.0-beta.196

### Minor Changes

- d54c656: add prompts default output

## 3.0.0-beta.195

### Minor Changes

- 6f02004: add prompt action outputs

## 3.0.0-beta.194

### Patch Changes

- d639fab: update static cache strategy

## 3.0.0-beta.193

### Patch Changes

- 24d7d13: update caching

## 3.0.0-beta.192

### Patch Changes

- 050ec48: update caching

## 3.0.0-beta.191

### Patch Changes

- 52413c2: update caching

## 3.0.0-beta.190

### Patch Changes

- 1ee3790: add logging

## 3.0.0-beta.189

### Minor Changes

- 0016189: add cache static strategy
- 57685fc: add cache file strategy

## 3.0.0-beta.188

### Minor Changes

- aa0d529: add warp prompts

### Patch Changes

- d1393e9: update collect http

## 3.0.0-beta.187

### Patch Changes

- fa98f00: update wallets

## 3.0.0-beta.186

### Patch Changes

- b22adbf: update user wallets type

## 3.0.0-beta.185

### Patch Changes

- c390d84: update wallets
- fcea985: update chain names

## 3.0.0-beta.184

### Minor Changes

- 3e86317: add wallet import + export

### Patch Changes

- f67aea4: update wallet gen to async

## 3.0.0-beta.183

### Patch Changes

- d3a902d: update warp theme config

## 3.0.0-beta.182

### Patch Changes

- 4ce5b8c: add chain + token logo themes

## 3.0.0-beta.181

### Patch Changes

- ba2711c: further wallet updates

## 3.0.0-beta.180

### Patch Changes

- 3cbdf74: further wallet updates

## 3.0.0-beta.179

### Patch Changes

- 9a4d7b7: further wallet updates

## 3.0.0-beta.178

### Patch Changes

- b66881b: add readonly wallets

## 3.0.0-beta.177

### Patch Changes

- ace8d3e: set client chains property to public

## 3.0.0-beta.176

### Patch Changes

- b7bd1d6: upgrade deps

## 3.0.0-beta.175

### Minor Changes

- e97ec34: add x402 + update wallet management

### Patch Changes

- 552fe5e: improve external wallet provider support

## 3.0.0-beta.174

### Minor Changes

- 90f1a05: add wallet providers

## 3.0.0-beta.173

### Patch Changes

- 91f4117: add warp uis"

## 3.0.0-beta.172

### Minor Changes

- 5d02aa5: add near adapter

## 3.0.0-beta.171

### Patch Changes

- 9953e4b: update mcp

## 3.0.0-beta.170

### Patch Changes

- 68ef882: update warp builder

## 3.0.0-beta.169

### Minor Changes

- 496987c: add mcp

### Patch Changes

- 6016b18: upgrade deps

## 3.0.0-beta.168

### Patch Changes

- 77980a4: update exec error handling

## 3.0.0-beta.167

### Patch Changes

- 1f7ba22: update solana - wip

## 3.0.0-beta.166

### Minor Changes

- ea04086: add action conditionals

## 3.0.0-beta.165

### Patch Changes

- 3d5fb6c: add chain-specific wallet globals

## 3.0.0-beta.164

### Patch Changes

- 36f2e89: update detecter

## 3.0.0-beta.163

### Patch Changes

- ece9c33: fix warp detector resolved chain

## 3.0.0-beta.162

### Minor Changes

- ea6a310: add input transform modifier

## 3.0.0-beta.161

### Patch Changes

- c3b3728: add resolved inputs to exec results

## 3.0.0-beta.160

### Minor Changes

- 62f31d0: add asset object positions + nested primary references

### Patch Changes

- e13b84e: expose resolved inputs

## 3.0.0-beta.159

### Minor Changes

- 6a4249c: add wallet public key method

### Patch Changes

- 7173aa3: add wallet pub key global

## 3.0.0-beta.158

### Minor Changes

- ad9af2a: add primary input references

## 3.0.0-beta.157

### Patch Changes

- 0378c4e: update collect exec payloads

## 3.0.0-beta.156

### Patch Changes

- 9f92c0d: add destination to exec results

## 3.0.0-beta.155

### Patch Changes

- 80d0af8: update identifier util

## 3.0.0-beta.154

### Patch Changes

- ca86180: add identifier utilities

## 3.0.0-beta.153

### Patch Changes

- 4f0d6a7: further message localization updates

## 3.0.0-alpha.152

### Minor Changes

- 38bb15f: add localized messages

### Patch Changes

- 4731910: update opt dest

## 3.0.0-alpha.151

### Minor Changes

- 90d2716: add query to warp meta

## 3.0.0-alpha.150

### Patch Changes

- 472039c: update io evaluations

## 3.0.0-alpha.149

### Patch Changes

- 9b2716f: update unhandled collect output

## 3.0.0-alpha.148

### Minor Changes

- 53f5231: rename results to output
- f0fccb0: update exec results

### Patch Changes

- c919e13: add custom destinations

## 3.0.0-alpha.147

### Patch Changes

- d14ce36: fix client create inscription fn

## 3.0.0-alpha.146

### Patch Changes

- 4aab0b2: update transforms

## 3.0.0-alpha.145

### Patch Changes

- 0e291f6: add warp releated field"

## 3.0.0-alpha.144

### Minor Changes

- 785b1cd: add input interpolation

## 3.0.0-alpha.143

### Patch Changes

- d791a5c: add change

## 3.0.0-alpha.142

### Minor Changes

- update warp identifiers

## 3.0.0-alpha.141

### Patch Changes

- 14b21c0: add warp languages const

## 3.0.0-alpha.140

### Patch Changes

- bf64bcf: localize warp options

## 3.0.0-alpha.139

### Minor Changes

- 795b560: update provider configs

## 3.0.0-alpha.138

### Patch Changes

- 1565180: update primary action selection

## 3.0.0-alpha.137

### Patch Changes

- 0a56c3f: fix import

## 3.0.0-alpha.136

### Patch Changes

- ed0d334: add brand logo helper

## 3.0.0-alpha.135

### Patch Changes

- d71157b: add brand themed logos

## 3.0.0-alpha.134

### Patch Changes

- 073d9d9: add alert helper

## 3.0.0-alpha.133

### Patch Changes

- e1fdbfb: add missing alert export
- c2c95c7: add alert label

## 3.0.0-alpha.132

### Minor Changes

- 59047d1: update i18n

## 3.0.0-alpha.131

### Minor Changes

- a0c17ea: upgrade deps

### Patch Changes

- f243b65: update alias marker handling

## 3.0.0-alpha.130

### Patch Changes

- 9f77831: add action to alert type

## 3.0.0-alpha.129

### Patch Changes

- update client detection

## 3.0.0-alpha.128

### Minor Changes

- 5c50caf: add alert types

## 3.0.0-alpha.127

### Patch Changes

- 685f80f: update i18n

## 3.0.0-alpha.126

### Patch Changes

- e145b00: update types

## 3.0.0-alpha.125

### Patch Changes

- 986eb76: update i18n

## 3.0.0-alpha.124

### Minor Changes

- c51a381: add brand i18

## 3.0.0-alpha.123

### Patch Changes

- 35c63e0: add i18n

## 3.0.0-alpha.122

### Minor Changes

- 430edc0: add automatic input typing

## 3.0.0-alpha.121

### Patch Changes

- 6b15123: update primariy action + auto rules

## 3.0.0-alpha.120

### Patch Changes

- 01e5545: update primary action func

## 3.0.0-alpha.119

### Patch Changes

- f372b98: add warp primary actions

## 3.0.0-alpha.118

### Minor Changes

- 3bd42a7: add multi-action exec
- d919b6e: add vars query description support

### Patch Changes

- 6a6fa41: add action link interceptor
- 68aadaf: add exec meta queries
- 735334a: add action link exec

## 3.0.0-alpha.117

### Patch Changes

- 88f92f7: rearch wallet helpers

## 3.0.0-alpha.116

### Minor Changes

- d005120: update exec results

## 3.0.0-alpha.115

### Patch Changes

- 53ac884: update complex type serialization

## 3.0.0-alpha.114

### Minor Changes

- 0d22c03: update codec

## 3.0.0-alpha.113

### Patch Changes

- 4e09d48: improve complex struct serialization

## 3.0.0-alpha.112

### Minor Changes

- caf0979: update custom types + add type aliases

### Patch Changes

- df20c26: add executor immediate result
- 4af1b7d: add executor immediate result

## 3.0.0-alpha.111

### Patch Changes

- 822d380: add exec handler async-sync

## 3.0.0-alpha.110

### Minor Changes

- 627badf: add further struct support

## 3.0.0-alpha.109

### Minor Changes

- 6dc80d4: add structs + complex type fixes

## 3.0.0-alpha.108

### Patch Changes

- 74eaaca: update codec

## 3.0.0-alpha.107

### Patch Changes

- 0956fc2: update asset codec

## 3.0.0-alpha.106

### Patch Changes

- fe5ae46: update chain asset logo to be nullable

## 3.0.0-alpha.105

### Patch Changes

- 8a3c7c5: update chain prefixs

## 3.0.0-alpha.104

### Patch Changes

- eb57e0d: add chain logos

## 3.0.0-alpha.103

### Patch Changes

- 92c2d54: add further chain asset info

## 3.0.0-alpha.102

### Minor Changes

- c721f10: add wallet manager

### Patch Changes

- 93fbd3d: upate env var interpolation

## 3.0.0-alpha.101

### Patch Changes

- 1460f4e: add env helper
- f9628d4: add env secret type + helper

## 3.0.0-alpha.100

### Patch Changes

- e35c4ae: update logging

## 3.0.0-alpha.99

### Minor Changes

- fd56907: add dynamic env injection to executor

### Patch Changes

- 8113897: remove value serialization for collect responses

## 3.0.0-alpha.98

### Minor Changes

- 6aaf181: add custom collector payloads
- e546232: add hidden input sources

## 3.0.0-alpha.97

### Patch Changes

- ac6195b: update brand meta

## 3.0.0-alpha.96

### Patch Changes

- 3f391a6: fix registry upgrade signature

## 3.0.0-alpha.95

### Patch Changes

- 5b50409: upgrade deps
- a7696aa: add client exec support via object
- 1613364: update cache local storage serialization

## 3.0.0-alpha.94

### Minor Changes

- 52a0958: add evm somnia network

### Patch Changes

- 15c79ad: update execution

## 3.0.0-alpha.93

### Patch Changes

- 54bed31: add input helper function

## 3.0.0-alpha.92

### Minor Changes

- d48e19b: update input preprocessing
- 588aaf3: update adapter data loaders

### Patch Changes

- cf418e1: fix input handling

## 3.0.0-alpha.91

### Minor Changes

- 29b84b6: add data loader get-action
- 4d143d7: add data loader get-asset

### Patch Changes

- 7a96317: fix asset serialization

## 3.0.0-alpha.90

### Patch Changes

- af8225c: update assets

## 3.0.0-alpha.89

### Minor Changes

- bf84508: update asset encoding

## 3.0.0-alpha.88

### Minor Changes

- 13b6127: update assets

## 3.0.0-alpha.87

### Minor Changes

- 455faa2: update builds

### Patch Changes

- 8c61537: add further integer types

## 3.0.0-alpha.86

### Patch Changes

- eff7bda: fix factory

## 3.0.0-alpha.85

### Minor Changes

- c680090: add native token info to chain info

## 3.0.0-alpha.84

### Patch Changes

- dd226b9: add generic tx to warp executions

## 3.0.0-alpha.83

### Patch Changes

- bcce744: update executable transfers type

## 3.0.0-alpha.82

### Patch Changes

- 7c563e5: fix util asset encoding

## 3.0.0-alpha.81

### Patch Changes

- f2a9fa4: update utils

## 3.0.0-alpha.80

### Patch Changes

- a37cb66: fix warp from url exec

## 3.0.0-alpha.79

### Patch Changes

- 62a9872: add client execute from url support

## 3.0.0-alpha.78

### Patch Changes

- 836d6a8: update custom types

## 3.0.0-alpha.77

### Minor Changes

- 02ce817: add custom types
- 7299456: add asset type

## 3.0.0-alpha.76

### Minor Changes

- b8988d5: add custom provider configs

## 3.0.0-alpha.75

### Minor Changes

- 06ad967: update builds

## 3.0.0-alpha.74

### Patch Changes

- 7445aa3: exclude test files from builds

## 3.0.0-alpha.73

### Minor Changes

- 19db0e8: fix tests + move to esm

## 3.0.0-alpha.72

### Patch Changes

- cff4951: upgrade deps

## 3.0.0-alpha.71

### Patch Changes

- 1de97fd: update warp builders

## 3.0.0-alpha.70

### Patch Changes

- d139b82: add further explorer endpoints

## 3.0.0-alpha.69

### Patch Changes

- ffb78b9: expose client data loader

## 3.0.0-alpha.68

### Minor Changes

- 73c3a6e: add adapter data loaders

## 3.0.0-alpha.67

### Patch Changes

- 2422598: update crypto signing

## 3.0.0-alpha.66

### Minor Changes

- fc92560: update transformations

## 3.0.0-alpha.65

### Patch Changes

- cef7d58: fix crypto usage errors

## 3.0.0-alpha.64

### Patch Changes

- 522ea70: fix auth signing

## 3.0.0-alpha.63

### Patch Changes

- 440b74e: update chain infos

## 3.0.0-alpha.62

### Patch Changes

- 47a02a1: add name to chain configs

## 3.0.0-alpha.61

### Minor Changes

- 9b46d12: add local chain infos

## 3.0.0-alpha.60

### Minor Changes

- dfaea22: add request signing

### Patch Changes

- 2c038bf: add fallback adapters

## 3.0.0-alpha.59

### Patch Changes

- 0d9bbc7: add warp chain name enum

## 3.0.0-alpha.58

### Minor Changes

- a6d698b: upgrade deps

## 3.0.0-alpha.57

### Patch Changes

- 4eed1a3: add chain to detection result

## 3.0.0-alpha.56

### Minor Changes

- 4a5076c: further rearch
- 9518f3f: further rearch

## 3.0.0-alpha.55

### Patch Changes

- 40e26de: add warp exec error handler

## 3.0.0-alpha.54

### Patch Changes

- 3dbc599: add chain to warp meta

## 3.0.0-alpha.53

### Patch Changes

- 8e3d840: add registry config accessor

## 3.0.0-alpha.52

### Patch Changes

- b6a76d9: add client registry init

## 3.0.0-alpha.51

### Patch Changes

- 517e93c: add client adapters accessor

## 3.0.0-alpha.50

### Minor Changes

- c4287f5: add index to client

### Patch Changes

- 8739a1f: update client create from tx hash

## 3.0.0-alpha.49

### Patch Changes

- e69c5b9: update u64 util

## 3.0.0-alpha.48

### Minor Changes

- 1f9aa05: add user multi-wallet

## 3.0.0-alpha.47

### Minor Changes

- 67223b1: update registry configs

### Patch Changes

- 0cf15c7: update execution

## 3.0.0-alpha.46

### Minor Changes

- 66cd2fd: expand registry multi-chain

## 3.0.0-alpha.45

### Minor Changes

- 1a32114: add chain explorers

## 3.0.0-alpha.44

### Minor Changes

- 924b053: further rearch

## 3.0.0-alpha.43

### Patch Changes

- 790aa8e: add factory to client
- 71bcf40: add results to client

## 3.0.0-alpha.42

### Patch Changes

- b674296: expose client config

## 3.0.0-alpha.41

### Minor Changes

- 98a47e1: update client executor impl

## 3.0.0-alpha.40

### Minor Changes

- cc79e6b: further rearch

## 3.0.0-alpha.39

### Patch Changes

- 08f2815: update types

## 3.0.0-alpha.38

### Patch Changes

- a08385f: fix circ dep

## 3.0.0-alpha.37

### Patch Changes

- 2f7e079: update action determination
- df7ab42: update exec handlers to optional

## 3.0.0-alpha.36

### Patch Changes

- 451e003: add missing imports

## 3.0.0-alpha.35

### Patch Changes

- bd2031e: extend warp builder

## 3.0.0-alpha.34

### Patch Changes

- 3ad6ca0: further rearch
- 0d85c51: further rearch

## 3.0.0-alpha.33

### Patch Changes

- dca45d6: further rearch
- 7885ddd: further rearch
- Updated dependencies [dca45d6]
- Updated dependencies [7885ddd]
  - @joai/warps@0.2.0-alpha.5

## 3.0.0-alpha.32

### Minor Changes

- 5321a6b: further rearch

### Patch Changes

- Updated dependencies [5321a6b]
- Updated dependencies [a707263]
  - @joai/warps@0.2.0-alpha.4
  - @joai/warps-adapter-multiversx@0.2.0-alpha.3

## 3.0.0-alpha.31

### Patch Changes

- 3926ed6: update executor

## 3.0.0-alpha.30

### Patch Changes

- 29942ac: add warp brand prefixes
- Updated dependencies [60574d5]
- Updated dependencies [29942ac]
  - @joai/warps-adapter-multiversx@0.2.0-alpha.2
  - @joai/warps@0.2.0-alpha.3

## 3.0.0-alpha.29

### Patch Changes

- e354f53: update dependencies
- Updated dependencies [e354f53]
  - @joai/warps@0.2.0-alpha.1

## 3.0.0-alpha.28

### Patch Changes

- d9bb08c: fix executor
- Updated dependencies [1042334]
  - @joai/warps-adapter-multiversx@0.2.0-alpha.1

## 3.0.0-alpha.27

### Minor Changes

- b6fbfef: update executor

## 3.0.0-alpha.26

### Major Changes

- 8d57441: re-arch multi-package + adapters

### Minor Changes

- 40e8470: rearch + adapters
- rearch + adapters

### Patch Changes

- Updated dependencies [40e8470]
  - @joai/warps-adapter-multiversx@0.2.0-alpha.0
  - @joai/warps@0.2.0-alpha.0

## 3.0.0-alpha.25

### Patch Changes

- b6277da: add vibe esdt to known tokens

## 3.0.0-alpha.24

### Patch Changes

- f6ee4e7: update native esdt handling

## 3.0.0-alpha.23

### Patch Changes

- 53cdfdd: refactor chain determination

## 3.0.0-alpha.22

### Patch Changes

- 1fa32fc: fix chain position from inputs

## 3.0.0-alpha.21

### Minor Changes

- f842245: update protocol version

## 3.0.0-alpha.20

### Minor Changes

- 0476e7e: add input defaults

## 3.0.0-alpha.19

### Minor Changes

- 65baae4: add chain position

## 3.0.0-alpha.18

### Patch Changes

- 396f7bb: update gas limits

## 3.0.0-alpha.17

### Patch Changes

- df98dcd: remove obsolete registry arg

## 3.0.0-alpha.16

### Patch Changes

- c113bf6: fix registry chain set args

## 3.0.0-alpha.15

### Minor Changes

- f371878: add registry chain management

## 3.0.0-alpha.14

### Patch Changes

- f1781da: add registry native token

## 3.0.0-alpha.13

### Patch Changes

- 1957541: update detection for hashes

## 3.0.0-alpha.12

### Patch Changes

- 27a5e55: fix multi-env caching

## 3.0.0-alpha.11

### Major Changes

- a88cbbb: update collect exec body

## 3.0.0-alpha.10

### Patch Changes

- 0a7a600: add logging

## 3.0.0-alpha.9

### Patch Changes

- 1e09810: add collect response to results

## 3.0.0-alpha.8

### Major Changes

- 694c989: prepend warp prefix to vars + types

### Patch Changes

- 8396ad3: add err msg to collect executor

## 2.3.0-alpha.7

### Patch Changes

- 51471f3: fix input result resolving for contract actions

## 2.3.0-alpha.6

### Patch Changes

- 92e516d: resolve inputs for results

## 2.3.0-alpha.5

### Patch Changes

- 970fc74: update vm dependencies

## 2.3.0-alpha.4

### Minor Changes

- 7062a92: add input-based results
- 12ea059: update result evaluations

## 2.3.0-alpha.0

### Minor Changes

- 657d125: add transformations

## 2.2.0

### Minor Changes

- 039965b: add chain explorer helper

## 2.1.1

### Patch Changes

- b67b76e: add chain name to info

## 2.1.0

### Minor Changes

- 4ae0571: add further chain properties
- c084637: add registry chain infos

## 2.0.3

### Patch Changes

- 9f68518: add logging

## 2.0.2

### Patch Changes

- 1a1e749: add interpolation to link detection

## 2.0.1

### Patch Changes

- 5c99634: update input options type
- 834ad73: update protocol version in config

## 2.0.0

### Major Changes

- edd1760: update version to v2
- 329a791: add results + messages v2

### Minor Changes

- 7458732: add warp logger
- e1a5401: update multi chain
- 60a3fc6: add registry brand configuration on register
- 8677223: update vars preparations
- a3aa83d: add globals
- 48432d7: update user source + config
- 3a37f74: update config structure
- 0228460: add vars user wallet source
- 17c2311: update next results + url query support for ids
- b978b7a: add next var + result placeholder replacements
- 04c2d80: add cache forget
- dc17400: add multi-next warp support
- 73c0057: add registry transfer ownership

### Patch Changes

- 34cf858: fix builder validation handling
- 198fd65: add warp link detect caching
- f55412d: add further info to execution result
- 7d50e91: add missing type export
- 3cc2a32: fix link building
- 6fe2da5: fix warp link detection
- aecfa73: update validator
- 9fda71f: update registry abi
- f5c434b: update registry config
- a43d025: update globals
- 942ddd8: fix validator
- baf7e4b: update builder validation
- dc6842d: add registry soft err handling
- f806686: move chain info for action to utils
- 329a791: extend validator
- 204ba91: fix next links
- fcddba6: optimize in-memory cache
- a1e04a4: add warp link detect error catching
- 13e7464: fix collect results
- 7eb23d2: update position field to be optional
- 9bce92b: add cache ttl constants
- 578e1b3: update collect action params to be optional
- 60cd189: add further info to exec result
- a46773a: add upgrade timestamps
- 8159b44: update warp var resolution
- 82a45c1: update warp var handling
- 437731c: fix warp detection
- 7c605ee: fix registry config parsing
- 8a00d9e: remove builder from raw vars preperation
- 5ca0cbe: fix action collect get requests
- c22e11a: remove logging

## 2.0.0-beta.36

### Minor Changes

- 7458732: add warp logger
- a3aa83d: add globals

### Patch Changes

- a43d025: update globals
- fcddba6: optimize in-memory cache
- 9bce92b: add cache ttl constants

## 2.0.0-beta.35

### Minor Changes

- 3a37f74: update config structure

## 2.0.0-beta.34

### Patch Changes

- 7c605ee: fix registry config parsing

## 2.0.0-beta.33

### Minor Changes

- 60a3fc6: add registry brand configuration on register

### Patch Changes

- f5c434b: update registry config

## 2.0.0-beta.32

### Patch Changes

- c22e11a: remove logging

## 2.0.0-beta.31

### Patch Changes

- 204ba91: fix next links

## 2.0.0-beta.30

### Minor Changes

- 8677223: update vars preparations

## 2.0.0-beta.29

### Patch Changes

- 8a00d9e: remove builder from raw vars preperation

## 2.0.0-beta.28

### Minor Changes

- 04c2d80: add cache forget

## 2.0.0-beta.27

### Patch Changes

- a46773a: add upgrade timestamps

## 2.0.0-beta.26

### Patch Changes

- 9fda71f: update registry abi

## 2.0.0-beta.25

### Minor Changes

- 73c0057: add registry transfer ownership

## 2.0.0-beta.24

### Patch Changes

- 437731c: fix warp detection

## 2.0.0-alpha.23

### Major Changes

- edd1760: update version to v2

### Patch Changes

- dc6842d: add registry soft err handling

## 2.0.0-alpha.22

### Patch Changes

- 8159b44: update warp var resolution

## 2.0.0-alpha.21

### Patch Changes

- 6fe2da5: fix warp link detection

## 2.0.0-alpha.20

### Patch Changes

- 198fd65: add warp link detect caching
- a1e04a4: add warp link detect error catching

## 2.0.0-alpha.19

### Patch Changes

- 3cc2a32: fix link building

## 2.0.0-alpha.18

### Minor Changes

- dc17400: add multi-next warp support

## 2.0.0-alpha.17

### Patch Changes

- 13e7464: fix collect results

## 2.0.0-alpha.16

### Patch Changes

- 5ca0cbe: fix action collect get requests

## 2.0.0-alpha.15

### Patch Changes

- 82a45c1: update warp var handling

## 2.0.0-alpha.14

### Patch Changes

- 578e1b3: update collect action params to be optional

## 2.0.0-alpha.13

### Minor Changes

- 48432d7: update user source + config
- 0228460: add vars user wallet source

## 2.0.0-alpha.12

### Patch Changes

- 7eb23d2: update position field to be optional

## 2.0.0-alpha.11

### Patch Changes

- baf7e4b: update builder validation

## 2.0.0-alpha.10

### Patch Changes

- 34cf858: fix builder validation handling

## 2.0.0-alpha.9

### Patch Changes

- aecfa73: update validator

## 2.0.0-alpha.8

### Patch Changes

- 942ddd8: fix validator

## 2.0.0-alpha.7

### Minor Changes

- b978b7a: add next var + result placeholder replacements

## 2.0.0-alpha.6

### Minor Changes

- update next results + url query support for ids

## 2.0.0-alpha.5

### Minor Changes

- update multi chain

## 2.0.0-alpha.4

### Patch Changes

- f806686: move chain info for action to utils

## 2.0.0-alpha.3

### Patch Changes

- 60cd189: add further info to exec result

## 2.0.0-alpha.2

### Patch Changes

- f55412d: add further info to execution result

## 2.0.0-alpha.1

### Patch Changes

- 7d50e91: add missing type export

## 2.0.0-alpha.0

### Major Changes

- add results + messages v2

### Patch Changes

- extend validator

## 1.5.0

### Minor Changes

- e161030: add results and messages

### Patch Changes

- 0fbf9c7: rearch types

## 1.4.4

### Patch Changes

- dc1cc27: update biguint helper

## 1.4.3

### Patch Changes

- 8821c65: improve collect action payload construction

## 1.4.2

### Patch Changes

- c6f809c: fix action input source resolvements

## 1.4.1

### Patch Changes

- 3967021: update protocol version

## 1.4.0

### Minor Changes

- e5bf3ea: update collect action payload structure
- 8755b28: add action input source for user wallet

## 1.3.0

### Minor Changes

- 3eb51b4: update collect exec input handling

## 1.2.1

### Patch Changes

- update local storage caching

## 1.2.0

### Minor Changes

- d08711e: add multi-chain support
- 4051239: add cache strategies

## 1.1.1

### Patch Changes

- action executor improvements

## 1.1.0

### Minor Changes

- c7cfc65: update arg serializer type conversion

## 1.0.3

### Patch Changes

- e0a5284: add missing exports

## 1.0.2

### Patch Changes

- 5328f9b: fix query result parsing

## 1.0.1

### Patch Changes

- 6f24fb2: increase protocol version

## 1.0.0

### Major Changes

- d39eec3: upgrade deps + mvx core migrations

### Minor Changes

- 88600b0: update transfer execs

## 0.14.5

### Patch Changes

- 14bcc99: update registry abi

## 0.14.4

### Patch Changes

- 2568c5b: add registry warp verify

## 0.14.3

### Patch Changes

- 9caaa61: update warp index search params

## 0.14.2

### Patch Changes

- 0bb7eb1: add warp index search optional params

## 0.14.1

### Patch Changes

- 1cf29fe: fix action queries using on-chain abi

## 0.14.0

### Minor Changes

- fbb831d: add warp abi

### Patch Changes

- 057c57c: add action query on-chain abi support

## 0.13.1

### Patch Changes

- b8c0957: add action by index helper

## 0.13.0

### Minor Changes

- add input esdt decimal preprocessing

## 0.12.0

### Minor Changes

- a704143: unify action transfers with inputs

## 0.11.0

### Minor Changes

- 443388a: update protocol version

### Patch Changes

- 285d7d0: update action args to optional

## 0.10.0

### Minor Changes

- a6e6b74: add transfer action

### Patch Changes

- a6e6b74: add action receiver position

## 0.9.10

### Patch Changes

- 900f20f: update warp preview to optional

## 0.9.9

### Patch Changes

- 9beff72: fix arg serializer biguint from abi

## 0.9.8

### Patch Changes

- d0af25a: fix arg serializer biguint from abi

## 0.9.7

### Patch Changes

- 10da864: add arg serializer big number handling

## 0.9.6

### Patch Changes

- 08b10b4: add further action validation

## 0.9.5

### Patch Changes

- 884198d: update action execution

## 0.9.4

### Patch Changes

- c7813e9: add action collect executor opt meta info

## 0.9.3

### Patch Changes

- 53a332d: add input keys to action collect request

## 0.9.2

### Patch Changes

- d38c55f: update action collect execution

## 0.9.1

### Patch Changes

- fbdf306: update collection action types

## 0.9.0

### Minor Changes

- e63a4d8: add executor for collect action
- add config vars

## 0.8.1

### Patch Changes

- 97ef011: add bot info to types
- d4fc51e: add action collect types

## 0.8.0

### Minor Changes

- 6bca998: refactor constants

### Patch Changes

- 40f5181: export helpers

## 0.7.1

### Patch Changes

- 876a7fa: make index search param name configurable

## 0.7.0

### Minor Changes

- bfc90f8: add warp index

## 0.6.8

### Patch Changes

- e809df3: update super client config

## 0.6.7

### Patch Changes

- a386cd6: add opt registry contract config

## 0.6.6

### Patch Changes

- 498ac41: add input query arg scaling

## 0.6.5

### Patch Changes

- f766215: add missing args from query source support

## 0.6.4

### Patch Changes

- 939afb0: update option utils

## 0.6.3

### Patch Changes

- 71d06fb: add arg serializer null value support

## 0.6.2

### Patch Changes

- 51bcf43: update arg serializer

## 0.6.1

### Patch Changes

- c935030: re-add arg serializer typed-to-native

## 0.6.0

### Minor Changes

- ff9937b: increase protocol version

### Patch Changes

- 2a0c660: update arg serializer

## 0.5.5

### Patch Changes

- 302d564: fix arg serializer uint64 deserialization

## 0.5.4

### Patch Changes

- 8c336d4: improve arg serializer

## 0.5.3

### Patch Changes

- 91905f3: further action execution fixes

## 0.5.2

### Patch Changes

- f142602: fix action execution value from field

## 0.5.1

### Patch Changes

- 066713e: fix bool arg serialization
- 61c75ef: prefix exported constants

## 0.5.0

### Minor Changes

- f153527: shorten bool type name

## 0.4.4

### Patch Changes

- d6a7af9: update int arg serialization

## 0.4.3

### Patch Changes

- 96adf32: add serializer esdt support

## 0.4.2

### Patch Changes

- 7b53e62: improve codec util biguint
- 7e7a0a9: add arg serializer typed-to-string

## 0.4.1

### Patch Changes

- 9b028b2: add utils codec export

## 0.4.0

### Minor Changes

- 86562d6: add codec utils

## 0.3.4

### Patch Changes

- f6b9135: add arg type token support

## 0.3.3

### Patch Changes

- 2cabb11: improve arg serializer

## 0.3.2

### Patch Changes

- 356be58: fix contract loader verification parsing
- 0e7d4a6: add further arg serializer type support
- 77fdf2e: improve query action execution

## 0.3.1

### Patch Changes

- f16c8dc: fix warp link detection on http
- 86439ad: fix contract loader abi

## 0.3.0

### Minor Changes

- 8a3484c: add contract loader

### Patch Changes

- e0a2682: add query action executor abi fallback

## 0.2.5

### Patch Changes

- 7a5fff6: update protocol version

## 0.2.4

### Patch Changes

- 6764504: fix warp query execution api config

## 0.2.3

### Patch Changes

- dbe8631: add arg serializer code metadata support

## 0.2.2

### Patch Changes

- e83938b: add arg serializer list support

## 0.2.1

### Patch Changes

- 9d9944d: improve arg serializer

## 0.2.0

### Minor Changes

- 50bb0ac: add action type query

## 0.1.1

### Patch Changes

- ff2d0e8: add warp arg serializer

## 0.1.0

### Minor Changes

- e2cafa2: add warp link detection from html

### Patch Changes

- 951ca2a: add warp link detection from prefixed identifier

## 0.0.91

### Patch Changes

- d06839c: add non-sc tx support

## 0.0.90

### Patch Changes

- 731095b: add inscription gas limit overestimation

## 0.0.89

### Patch Changes

- update registry abi

## 0.0.88

### Patch Changes

- 5fd7ed2: add registry warp upgrade
- 28585a0: add warp builder description preview utility

## 0.0.87

### Patch Changes

- 3c6057a: add action exec bigint decimals support

## 0.0.86

### Patch Changes

- 936556e: update action execution

## 0.0.85

### Patch Changes

- 85354e8: add action exec native value from field

## 0.0.84

### Patch Changes

- a57f527: add action exection args filtering + sorting

## 0.0.83

### Patch Changes

- 7748c8d: fix tx timestamp date conversion

## 0.0.82

### Patch Changes

- 72862f1: fix warp vars multiple occurrences

## 0.0.81

### Patch Changes

- a249176: update registry unit price to public

## 0.0.80

### Patch Changes

- c9935bd: add warp vars

## 0.0.79

### Patch Changes

- dd5ce1e: add registry unit price getter

## 0.0.78

### Patch Changes

- 545b66f: add warp utils

## 0.0.77

### Patch Changes

- a3ca64f: add super client link building

## 0.0.76

### Patch Changes

- 743b67e: update super client link detection

## 0.0.75

### Patch Changes

- 42de4a3: add logging

## 0.0.74

### Patch Changes

- add warp publish unit payment

## 0.0.73

### Patch Changes

- d55640c: add super client url parsing
- b832cfb: update query param name

## 0.0.72

### Patch Changes

- 120e91f: add registry unregister tx creation

## 0.0.71

### Patch Changes

- eb045f1: add action input modifiers"

## 0.0.70

### Patch Changes

- 899dcfc: refactorings + renamings

## 0.0.69

### Patch Changes

- 39b2df7: rename warp prev to upgrade

## 0.0.68

### Patch Changes

- b8c1771: add prev warp tracking

## 0.0.67

### Patch Changes

- 409cae6: add optional pattern validation to action input

## 0.0.66

### Patch Changes

- 66b044d: fix link detection of unregistred

## 0.0.65

### Patch Changes

- 00285f6: impl action execution token transfers

## 0.0.64

### Patch Changes

- 0acfe01: add contract action transfers

## 0.0.63

### Patch Changes

- 4a566db: add registry warp set alias function
- f4e1f5b: add further action input types

## 0.0.62

### Patch Changes

- 0a3cc54: update brand types

## 0.0.61

### Patch Changes

- bb402a7: fix warp info brand encoding

## 0.0.60

### Patch Changes

- 66f35a8: update registry abi

## 0.0.59

### Patch Changes

- de8894c: fix build

## 0.0.58

### Patch Changes

- 0601428: fix registry query

## 0.0.57

### Patch Changes

- d713bb9: fix link detection brand loading

## 0.0.56

### Patch Changes

- b1c3c97: add brand to link detection

## 0.0.55

### Patch Changes

- f113a2c: fix registry warp branding tx

## 0.0.54

### Patch Changes

- 299fb71: add brand meta

## 0.0.53

### Patch Changes

- ed3e0ce: add registry brand warp tx func

## 0.0.52

### Patch Changes

- fe7076e: add registry user brands function

## 0.0.51

### Patch Changes

- f628c80: fix registry user warps func
- b48baaa: add further warp caching

## 0.0.50

### Patch Changes

- 0256016: add missing brand builder export
- e4fdb30: add brand registration to registry

## 0.0.49

### Patch Changes

- b97a126: update config registry devnet address
- 1de701c: update registry user warp info func
- 60f2403: add next field to warp type
- f07f27b: add registry brands
- 5ab8737: add caching
- f23f004: add brand field to warp info type
- 8c8bcf6: add warp meta data

## 0.0.48

### Patch Changes

- ec4414f: fix registry tx arg encoding

## 0.0.47

### Patch Changes

- 77ddfad: add registry info by hash view func

## 0.0.46

### Patch Changes

- add qr codes
- 40a7c3e: update registry endpoint names

## 0.0.45

### Patch Changes

- bb8cc1f: add further builder schema validation

## 0.0.44

### Patch Changes

- 1bb9f59: rename action input string type

## 0.0.43

### Patch Changes

- add config types

## 0.0.42

### Patch Changes

- fix build

## 0.0.41

### Patch Changes

- implement action executor
- update types
- df63cf3: update config available action input positions

## 0.0.40

### Patch Changes

- update available action input types

## 0.0.39

### Patch Changes

- 3fa3a40: add registry user warp infos func

## 0.0.38

### Patch Changes

- simplify default warp link
- 42136e9: update link building for default id type

## 0.0.37

### Patch Changes

- dfef42e: add warp link default id type

## 0.0.36

### Patch Changes

- a3211c2: fix registry config loading

## 0.0.35

### Patch Changes

- 29106cd: add registry publish function

## 0.0.34

### Patch Changes

- 80c69d2: fix registry type casting

## 0.0.33

### Patch Changes

- a09e897: fix build

## 0.0.32

### Patch Changes

- 3393eb4: update registry internals
- 9cdb739: improve link detection

## 0.0.31

### Patch Changes

- 0349acc: update registry result parsing

## 0.0.30

### Patch Changes

- d3b4eab: add action execution result type

## 0.0.29

### Patch Changes

- 8039c89: update action input types

## 0.0.28

### Patch Changes

- bfa6329: update registry tx
- d6b1e71: update action descriptions
- bb9672a: add further action input parameters

## 0.0.27

### Patch Changes

- b73d986: add warp schema validation

## 0.0.26

### Patch Changes

- ddfb9a2: remove action input label

## 0.0.25

### Patch Changes

- d1a9c85: add config available action input types

## 0.0.24

### Patch Changes

- 3280e52: add warp action executor export
- 12be282: update action input types"

## 0.0.23

### Patch Changes

- 9a8f353: add warp action inputs
- c74fc91: add warp action executor - wip
- b5ea0c8: add warp contract action value

## 0.0.22

### Patch Changes

- update registry

## 0.0.21

### Patch Changes

- add gas limit to contract action
- update registry register tx params

## 0.0.20

### Patch Changes

- 0011e8b: update build

## 0.0.19

### Patch Changes

- 1f18142: update warp action contract field name
- af6290d: add registry mainnet address"

## 0.0.18

### Patch Changes

- fix warp link detection

## 0.0.17

### Patch Changes

- 03bcc35: add warp link export

## 0.0.16

### Patch Changes

- refactoring
- add warp link
- f283652: change remove explicit warp owner

## 0.0.15

### Patch Changes

- b7ba5dd: add warp protocol identifier

## 0.0.14

### Patch Changes

- 931fd05: update tx data serialization

## 0.0.13

### Patch Changes

- 711b09c: update build

## 0.0.12

### Patch Changes

- 8736f20: add warp builder set actions

## 0.0.11

### Patch Changes

- add alias info to registry register tx

## 0.0.10

### Patch Changes

- update tx data encoding
- add further warp builder instantiation methos

## 0.0.9

### Patch Changes

- update tx data encodings
- update registry alias functions

## 0.0.8

### Patch Changes

- add logging

## 0.0.7

### Patch Changes

- fix registry config decoding

## 0.0.6

### Patch Changes

- add registry alias tx creators

## 0.0.5

### Patch Changes

- configure devent registry address

## 0.0.4

### Patch Changes

- rename package names

## 0.0.3

### Patch Changes

- add registry chain api fallback

## 0.0.2

### Patch Changes

- 0039b67: add missing exports
- fd3ba66: initial
