import { WarpChainName, WarpChainAsset, WarpChainEnv } from '@joai/warps'
import { ArbitrumTokens } from './tokens/arbitrum'
import { ArbitrumSepoliaTokens } from './tokens/arbitrum-sepolia'
import { BaseTokens } from './tokens/base'
import { BaseSepoliaTokens } from './tokens/base-sepolia'
import { EthereumTokens } from './tokens/ethereum'
import { EthereumSepoliaTokens } from './tokens/ethereum-sepolia'
import { PolygonTokens } from './tokens/polygon'
import { PolygonMumbaiTokens } from './tokens/polygon-mumbai'
import { TempoTokens } from './tokens/tempo'
import { TempoModeratoTokens } from './tokens/tempo-moderato'

export const KnownTokens: Partial<Record<WarpChainName, Record<string, WarpChainAsset[]>>> = {
  [WarpChainName.Ethereum]: {
    mainnet: EthereumTokens,
    testnet: EthereumSepoliaTokens,
    devnet: EthereumSepoliaTokens,
  },
  [WarpChainName.Base]: {
    mainnet: BaseTokens,
    testnet: BaseSepoliaTokens,
    devnet: BaseSepoliaTokens,
  },
  [WarpChainName.Arbitrum]: {
    mainnet: ArbitrumTokens,
    testnet: ArbitrumSepoliaTokens,
    devnet: ArbitrumSepoliaTokens,
  },
  [WarpChainName.Polygon]: {
    mainnet: PolygonTokens,
    testnet: PolygonMumbaiTokens,
    devnet: PolygonMumbaiTokens,
  },
  [WarpChainName.Tempo]: {
    mainnet: TempoTokens,
    testnet: TempoModeratoTokens,
    devnet: TempoModeratoTokens,
  },
}

export const findKnownTokenById = (chain: WarpChainName, env: WarpChainEnv, id: string): WarpChainAsset | null => {
  const chainTokens = KnownTokens[chain]?.[env] || []
  return chainTokens.find((token) => token.identifier === id) || null
}

export const getKnownTokensForChain = (chainName: WarpChainName, env: string = 'mainnet'): WarpChainAsset[] => {
  return KnownTokens[chainName]?.[env] || []
}
