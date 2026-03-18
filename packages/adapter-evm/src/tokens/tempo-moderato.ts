import { WarpAssets, WarpChainAsset, WarpChainName } from '@joai/warps'

const TempoChain = WarpChainName.Tempo

export const TempoModeratoTokens: WarpChainAsset[] = [
  {
    chain: TempoChain,
    identifier: '0x20c0000000000000000000000000000000000000',
    name: 'PathUSD',
    symbol: 'pathUSD',
    decimals: 6,
    logoUrl: WarpAssets.tokenLogo('pathusd.svg'),
  },
  {
    chain: TempoChain,
    identifier: '0x20c0000000000000000000000000000000000001',
    name: 'AlphaUSD',
    symbol: 'alphaUSD',
    decimals: 6,
    logoUrl: WarpAssets.tokenLogo('pathusd.svg'),
  },
  {
    chain: TempoChain,
    identifier: '0x20c0000000000000000000000000000000000002',
    name: 'BetaUSD',
    symbol: 'betaUSD',
    decimals: 6,
    logoUrl: WarpAssets.tokenLogo('pathusd.svg'),
  },
  {
    chain: TempoChain,
    identifier: '0x20c0000000000000000000000000000000000003',
    name: 'ThetaUSD',
    symbol: 'thetaUSD',
    decimals: 6,
    logoUrl: WarpAssets.tokenLogo('pathusd.svg'),
  },
  {
    chain: TempoChain,
    identifier: '0x20c0000000000000000000009e8d7eb59b783726',
    name: 'Bridged USDC (Stargate)',
    symbol: 'USDC.e',
    decimals: 6,
    logoUrl: WarpAssets.tokenLogo('usdc.svg'),
  },
  {
    chain: TempoChain,
    identifier: '0x20c000000000000000000000d72572838bbee59c',
    name: 'Bridged EURC (Stargate)',
    symbol: 'EURC.e',
    decimals: 6,
    logoUrl: WarpAssets.tokenLogo('eurc.svg'),
  },
]
