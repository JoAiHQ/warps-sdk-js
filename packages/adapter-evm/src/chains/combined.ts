import { WarpChainName } from '@joai/warps'

export const getAllEvmChainNames = (): WarpChainName[] => [
  WarpChainName.Ethereum,
  WarpChainName.Base,
  WarpChainName.Arbitrum,
  WarpChainName.Polygon,
  WarpChainName.Somnia,
  WarpChainName.Tempo,
]
