import { Address, DevnetEntrypoint, MainnetEntrypoint, NetworkEntrypoint, TestnetEntrypoint } from '@multiversx/sdk-core'
import { getProviderConfig, WarpChainEnv, WarpChainInfo, WarpClientConfig } from '@joai/warps'

// Re-encodes a bech32 address with the given chain's HRP (same public key bytes, correct HRP prefix)
export const toChainAddress = (bech32Address: string, chain: WarpChainInfo): Address => {
  const pubKey = Address.newFromBech32(bech32Address).getPublicKey()
  return new Address(pubKey, chain.addressHrp)
}

// Native tokens have identifiers that do not follow the ESDT token format, e.g. EGLD, VIBE
export const isNativeToken = (identifier: string): boolean => !identifier.includes('-')

export const getNormalizedTokenIdentifier = (identifier: string): string =>
  isNativeToken(identifier) ? `${identifier}-000000` : identifier

export const getMultiversxEntrypoint = (chainInfo: WarpChainInfo, env: WarpChainEnv, config?: WarpClientConfig): NetworkEntrypoint => {
  const clientName = 'warp-sdk'
  const kind = 'api'
  const providerConfig = config ? getProviderConfig(config, chainInfo.name, env, chainInfo.defaultApiUrl) : { url: chainInfo.defaultApiUrl }
  const url = providerConfig.url
  const networkProviderConfig = { headers: providerConfig.headers }
  if (env === 'devnet') return new DevnetEntrypoint({ url, kind, clientName, networkProviderConfig })
  if (env === 'testnet') return new TestnetEntrypoint({ url, kind, clientName, networkProviderConfig })
  return new MainnetEntrypoint({ url, kind, clientName, networkProviderConfig })
}
