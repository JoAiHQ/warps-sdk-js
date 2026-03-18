import { WarpAssets, WarpChainAsset, WarpChainName } from '@joai/warps'

const TempoChain = WarpChainName.Tempo

export const TempoTokens: WarpChainAsset[] = [
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
    identifier: '0x20c000000000000000000000b9537d11c60e8b50',
    name: 'Bridged USDC (Stargate)',
    symbol: 'USDC.e',
    decimals: 6,
    logoUrl: WarpAssets.tokenLogo('usdc.svg'),
  },
  {
    chain: TempoChain,
    identifier: '0x20c0000000000000000000001621e21f71cf12fb',
    name: 'Bridged EURC (Stargate)',
    symbol: 'EURC.e',
    decimals: 6,
    logoUrl: WarpAssets.tokenLogo('eurc.svg'),
  },
  {
    chain: TempoChain,
    identifier: '0x20c00000000000000000000014f22ca97301eb73',
    name: 'USDT0',
    symbol: 'USDT0',
    decimals: 6,
    logoUrl: WarpAssets.tokenLogo('usdt.svg'),
  },
  {
    chain: TempoChain,
    identifier: '0x20c0000000000000000000003554d28269e0f3c2',
    name: 'Frax USD',
    symbol: 'frxUSD',
    decimals: 6,
    logoUrl: WarpAssets.tokenLogo('frxusd.svg'),
  },
  {
    chain: TempoChain,
    identifier: '0x20c0000000000000000000000520792dcccccccc',
    name: 'Cap USD',
    symbol: 'cUSD',
    decimals: 6,
    logoUrl: WarpAssets.tokenLogo('cusd.svg'),
  },
  {
    chain: TempoChain,
    identifier: '0x20c00000000000000000000031f228af88888888',
    name: 'Staked Cap USD',
    symbol: 'stcUSD',
    decimals: 6,
    logoUrl: WarpAssets.tokenLogo('stcusd.svg'),
  },
]
