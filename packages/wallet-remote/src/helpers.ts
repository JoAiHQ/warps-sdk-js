import { WalletProviderFactory, WarpChainInfo, WarpClientConfig, WarpWalletProvider } from '@joai/warps'
import { RemoteWalletProvider } from './RemoteWalletProvider'
import { RemoteWalletProviderConfig, DEFAULT_REMOTE_WALLET_PROVIDER_NAME } from './types'

export const createRemoteWalletProvider = (
  remoteConfig: RemoteWalletProviderConfig,
  fallbackProviderName: WarpWalletProvider = DEFAULT_REMOTE_WALLET_PROVIDER_NAME
): WalletProviderFactory => {
  return (config: WarpClientConfig, chain: WarpChainInfo) => new RemoteWalletProvider(config, chain, remoteConfig, fallbackProviderName)
}
