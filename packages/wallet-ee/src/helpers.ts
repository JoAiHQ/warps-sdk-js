import { WalletProviderFactory, WarpChainInfo, WarpClientConfig } from '@joai/warps'
import { CustomCloudWalletProvider, EeWalletProvider } from './EeWalletProvider'
import { CustomCloudWalletProviderConfig, EeWalletProviderConfig } from './types'

export const createCustomCloudWalletProvider = (cloudConfig: CustomCloudWalletProviderConfig): WalletProviderFactory => {
  return (config: WarpClientConfig, chain: WarpChainInfo) => new CustomCloudWalletProvider(config, chain, cloudConfig)
}

export const createEeWalletProvider = (eeConfig: EeWalletProviderConfig): WalletProviderFactory => {
  return (config: WarpClientConfig, chain: WarpChainInfo) => new EeWalletProvider(config, chain, eeConfig)
}
