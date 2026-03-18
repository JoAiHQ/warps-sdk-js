import { WarpChainName } from '../constants'
import { WarpChainInfoLogo } from '../types'

const AssetsBaseUrl = 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main'

export const WarpAssets = {
  baseUrl: AssetsBaseUrl,
  chainLogo: (name: string) => `${AssetsBaseUrl}/chains/logos/${name}`,
  tokenLogo: (name: string) => `${AssetsBaseUrl}/tokens/logos/${name}`,
  walletLogo: (name: string) => `${AssetsBaseUrl}/wallets/logos/${name}`,
}

export const WarpChainDisplayNames: Record<WarpChainName, string> = {
  [WarpChainName.Multiversx]: 'MultiversX',
  [WarpChainName.Claws]: 'Claws Network',
  [WarpChainName.Sui]: 'Sui',
  [WarpChainName.Ethereum]: 'Ethereum',
  [WarpChainName.Base]: 'Base',
  [WarpChainName.Arbitrum]: 'Arbitrum',
  [WarpChainName.Polygon]: 'Polygon',
  [WarpChainName.Somnia]: 'Somnia',
  [WarpChainName.Tempo]: 'Tempo',
  [WarpChainName.Fastset]: 'Fastset',
  [WarpChainName.Solana]: 'Solana',
  [WarpChainName.Near]: 'NEAR',
}

export const getChainDisplayName = (chain: WarpChainName): string =>
  WarpChainDisplayNames[chain] ?? chain.charAt(0).toUpperCase() + chain.slice(1)

export const WarpChainLogos: Record<WarpChainName, WarpChainInfoLogo> = {
  [WarpChainName.Ethereum]: { light: WarpAssets.chainLogo('ethereum-white.svg'), dark: WarpAssets.chainLogo('ethereum-black.svg') },
  [WarpChainName.Base]: { light: WarpAssets.chainLogo('base-white.svg'), dark: WarpAssets.chainLogo('base-black.svg') },
  [WarpChainName.Arbitrum]: WarpAssets.chainLogo('arbitrum.svg'),
  [WarpChainName.Polygon]: WarpAssets.chainLogo('polygon.svg'),
  [WarpChainName.Somnia]: WarpAssets.chainLogo('somnia.png'),
  [WarpChainName.Tempo]: { light: WarpAssets.chainLogo('tempo-white.svg'), dark: WarpAssets.chainLogo('tempo-black.svg') },
  [WarpChainName.Multiversx]: WarpAssets.chainLogo('multiversx.svg'),
  [WarpChainName.Claws]: WarpAssets.chainLogo('claws.png'),
  [WarpChainName.Sui]: WarpAssets.chainLogo('sui.svg'),
  [WarpChainName.Solana]: WarpAssets.chainLogo('solana.svg'),
  [WarpChainName.Near]: { light: WarpAssets.chainLogo('near-white.svg'), dark: WarpAssets.chainLogo('near-black.svg') },
  [WarpChainName.Fastset]: { light: WarpAssets.chainLogo('fastset-white.svg'), dark: WarpAssets.chainLogo('fastset-black.svg') },
}

export const getChainLogo = (chain: WarpChainName, variant: 'light' | 'dark' = 'dark'): string => {
  const logo = WarpChainLogos[chain]
  if (typeof logo === 'string') return logo
  return variant === 'dark' ? logo.dark : logo.light
}
