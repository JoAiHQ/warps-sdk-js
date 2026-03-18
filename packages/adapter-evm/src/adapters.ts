import { ChainAdapterFactory, withAdapterFallback } from '@joai/warps'
import { ArbitrumAdapter } from './chains/arbitrum'
import { BaseAdapter } from './chains/base'
import { EthereumAdapter } from './chains/ethereum'
import { PolygonAdapter } from './chains/polygon'
import { SomniaAdapter } from './chains/somnia'
import { TempoAdapter } from './chains/tempo'

export const getAllEvmAdapters = (fallbackFactory: ChainAdapterFactory): ChainAdapterFactory[] => [
  withAdapterFallback(EthereumAdapter, fallbackFactory),
  withAdapterFallback(BaseAdapter, fallbackFactory),
  withAdapterFallback(ArbitrumAdapter, fallbackFactory),
  withAdapterFallback(PolygonAdapter, fallbackFactory),
  withAdapterFallback(SomniaAdapter, fallbackFactory),
  withAdapterFallback(TempoAdapter, fallbackFactory),
]
