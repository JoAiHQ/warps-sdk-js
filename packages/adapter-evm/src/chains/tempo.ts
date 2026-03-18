import { ChainAdapterFactory, WarpAssets, WarpChainAsset, WarpChainName } from '@joai/warps'
import { createEvmAdapter } from './common'

export const NativeTokenTempo: WarpChainAsset = {
  chain: WarpChainName.Tempo,
  identifier: 'USD',
  name: 'USD',
  symbol: 'USD',
  decimals: 6,
  logoUrl: WarpAssets.tokenLogo('pathusd.svg'),
}

export const TempoAdapter: ChainAdapterFactory = createEvmAdapter(WarpChainName.Tempo, {
  mainnet: {
    name: WarpChainName.Tempo,
    displayName: 'Tempo',
    chainId: '4217',
    blockTime: 500,
    addressHrp: '0x',
    defaultApiUrl: 'https://rpc.tempo.xyz',
    logoUrl: {
      light: WarpAssets.chainLogo('tempo-white.svg'),
      dark: WarpAssets.chainLogo('tempo-black.svg'),
    },
    nativeToken: NativeTokenTempo,
  },
  testnet: {
    name: WarpChainName.Tempo,
    displayName: 'Tempo Moderato',
    chainId: '42431',
    blockTime: 500,
    addressHrp: '0x',
    defaultApiUrl: 'https://rpc.moderato.tempo.xyz',
    logoUrl: {
      light: WarpAssets.chainLogo('tempo-white.svg'),
      dark: WarpAssets.chainLogo('tempo-black.svg'),
    },
    nativeToken: NativeTokenTempo,
  },
  devnet: {
    name: WarpChainName.Tempo,
    displayName: 'Tempo Devnet',
    chainId: '31318',
    blockTime: 500,
    addressHrp: '0x',
    defaultApiUrl: 'https://rpc.devnet.tempoxyz.dev',
    logoUrl: {
      light: WarpAssets.chainLogo('tempo-white.svg'),
      dark: WarpAssets.chainLogo('tempo-black.svg'),
    },
    nativeToken: NativeTokenTempo,
  },
})
