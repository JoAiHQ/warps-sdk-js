import {
  ChainAdapter,
  ChainAdapterFactory,
  WarpChainAsset,
  WarpChainEnv,
  WarpChainInfo,
  WarpChainName,
  WarpClientConfig,
} from '@joai/warps'
import { WarpSuiAbiBuilder } from './WarpSuiAbiBuilder'
import { WarpSuiBrandBuilder } from './WarpSuiBrandBuilder'
import { WarpSuiBuilder } from './WarpSuiBuilder'
import { WarpSuiDataLoader } from './WarpSuiDataLoader'
import { WarpSuiExecutor } from './WarpSuiExecutor'
import { WarpSuiExplorer } from './WarpSuiExplorer'
import { WarpSuiOutput } from './WarpSuiOutput'
import { WarpSuiSerializer } from './WarpSuiSerializer'
import { WarpSuiWallet } from './WarpSuiWallet'

export const NativeTokenSui: WarpChainAsset = {
  chain: WarpChainName.Sui,
  identifier: '0x2::sui::SUI',
  name: 'SUI',
  symbol: 'SUI',
  decimals: 9,
  logoUrl: 'https://assets.coingecko.com/coins/images/26375/standard/sui-ocean-square.png?1727791290',
}

function createSuiAdapter(chainName: WarpChainName, chainInfos: Record<WarpChainEnv, WarpChainInfo>): ChainAdapterFactory {
  return (config: WarpClientConfig, fallback?: ChainAdapter) => {
    if (!fallback) throw new Error(`${chainName} adapter requires a fallback adapter`)
    const chainInfo = chainInfos[config.env]
    if (!chainInfo) throw new Error(`SuiAdapter: chain info not found for chain ${chainName}`)

    return {
      chainInfo,
      builder: () => new WarpSuiBuilder(config, chainInfo),
      executor: new WarpSuiExecutor(config, chainInfo),
      output: new WarpSuiOutput(config, chainInfo),
      serializer: new WarpSuiSerializer(),
      registry: fallback.registry,
      explorer: new WarpSuiExplorer(config, chainInfo),
      abiBuilder: () => new WarpSuiAbiBuilder(config, chainInfo),
      brandBuilder: () => new WarpSuiBrandBuilder(config, chainInfo),
      dataLoader: new WarpSuiDataLoader(config, chainInfo),
      wallet: new WarpSuiWallet(config, chainInfo),
    }
  }
}

export const SuiAdapter: ChainAdapterFactory = createSuiAdapter(WarpChainName.Sui, {
  mainnet: {
    name: WarpChainName.Sui,
    displayName: 'Sui',
    chainId: '1',
    blockTime: 3000,
    addressHrp: 'sui',
    defaultApiUrl: 'https://fullnode.mainnet.sui.io',
    logoUrl: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/chains/logos/sui.svg',
    nativeToken: NativeTokenSui,
  },
  testnet: {
    name: WarpChainName.Sui,
    displayName: 'Sui Testnet',
    chainId: 'testnet',
    blockTime: 3000,
    addressHrp: 'sui',
    defaultApiUrl: 'https://fullnode.testnet.sui.io',
    logoUrl: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/chains/logos/sui.svg',
    nativeToken: NativeTokenSui,
  },
  devnet: {
    name: WarpChainName.Sui,
    displayName: 'Sui Devnet',
    chainId: 'devnet',
    blockTime: 3000,
    addressHrp: 'sui',
    defaultApiUrl: 'https://fullnode.devnet.sui.io',
    logoUrl: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/chains/logos/sui.svg',
    nativeToken: NativeTokenSui,
  },
})
