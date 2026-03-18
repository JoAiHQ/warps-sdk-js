import { ChainAdapterFactory, WarpChainAsset, WarpChainName } from '@joai/warps'
import { createNearAdapter } from './common'

export const NativeTokenNear: WarpChainAsset = {
  chain: WarpChainName.Near,
  identifier: 'NEAR',
  symbol: 'NEAR',
  name: 'NEAR',
  decimals: 24,
  logoUrl: {
    light: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/tokens/logos/near-white.svg',
    dark: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/tokens/logos/near-black.svg',
  },
}

export const NearAdapter: ChainAdapterFactory = createNearAdapter(WarpChainName.Near, {
  mainnet: {
    name: WarpChainName.Near,
    displayName: 'NEAR',
    chainId: 'mainnet',
    blockTime: 1200,
    addressHrp: '',
    defaultApiUrl: 'https://rpc.mainnet.near.org',
    logoUrl: {
      light: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/chains/logos/near-white.svg',
      dark: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/chains/logos/near-black.svg',
    },
    nativeToken: NativeTokenNear,
  },
  testnet: {
    name: WarpChainName.Near,
    displayName: 'NEAR Testnet',
    chainId: 'testnet',
    blockTime: 1200,
    addressHrp: '',
    defaultApiUrl: 'https://rpc.testnet.near.org',
    logoUrl: {
      light: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/chains/logos/near-white.svg',
      dark: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/chains/logos/near-black.svg',
    },
    nativeToken: NativeTokenNear,
  },
  devnet: {
    name: WarpChainName.Near,
    displayName: 'NEAR Devnet',
    chainId: 'testnet',
    blockTime: 1200,
    addressHrp: '',
    defaultApiUrl: 'https://rpc.testnet.near.org',
    logoUrl: {
      light: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/chains/logos/near-white.svg',
      dark: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/chains/logos/near-black.svg',
    },
    nativeToken: NativeTokenNear,
  },
})
