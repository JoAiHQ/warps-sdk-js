import { ChainAdapterFactory, WarpChainAsset, WarpChainName } from '@joai/warps'
import { createEvmAdapter } from './common'

export const NativeTokenEth: WarpChainAsset = {
  chain: WarpChainName.Ethereum,
  identifier: 'ETH',
  symbol: 'ETH',
  name: 'Ether',
  decimals: 18,
  logoUrl: {
    light: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/tokens/logos/eth-white.svg',
    dark: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/tokens/logos/eth-black.svg',
  },
}

export const EthereumAdapter: ChainAdapterFactory = createEvmAdapter(WarpChainName.Ethereum, {
  mainnet: {
    name: WarpChainName.Ethereum,
    displayName: 'Ethereum',
    chainId: '1',
    blockTime: 12000,
    addressHrp: '0x',
    defaultApiUrl: 'https://ethereum-rpc.publicnode.com',
    logoUrl: {
      light: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/chains/logos/ethereum-white.svg',
      dark: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/chains/logos/ethereum-black.svg',
    },
    nativeToken: NativeTokenEth,
  },
  testnet: {
    name: WarpChainName.Ethereum,
    displayName: 'Ethereum Sepolia',
    chainId: '11155111',
    blockTime: 12000,
    addressHrp: '0x',
    defaultApiUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    logoUrl: {
      light: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/chains/logos/ethereum-white.svg',
      dark: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/chains/logos/ethereum-black.svg',
    },
    nativeToken: NativeTokenEth,
  },
  devnet: {
    name: WarpChainName.Ethereum,
    displayName: 'Ethereum Sepolia',
    chainId: '11155111',
    blockTime: 12000,
    addressHrp: '0x',
    defaultApiUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    logoUrl: {
      light: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/chains/logos/ethereum-white.svg',
      dark: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/chains/logos/ethereum-black.svg',
    },
    nativeToken: NativeTokenEth,
  },
})
