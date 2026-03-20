---
"@joai/warps-adapter-multiversx": patch
---

Extract NFT identifier from ESDTNFTCreate built-in function output

Added `tryExtractBuiltInFunctionOutput` to handle `ESDTNFTCreate` transactions called on the user's own wallet. Uses `TokenManagementTransactionsOutcomeParser.parseNftCreate()` to extract the collection identifier and nonce from the transaction log event, then constructs the full NFT identifier (e.g. `PGTEST-294182-01`). This enables `"out.1"` output mapping for ESDTNFTCreate warps without requiring an ABI.
