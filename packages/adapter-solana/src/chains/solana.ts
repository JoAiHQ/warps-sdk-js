import { ChainAdapterFactory, WarpChainAsset, WarpChainName } from '@joai/warps'
import { createSolanaAdapter } from './common'

export const NativeTokenSol: WarpChainAsset = {
  chain: WarpChainName.Solana,
  identifier: 'SOL',
  symbol: 'SOL',
  name: 'SOL',
  decimals: 9,
  logoUrl: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/tokens/logos/sol.svg',
}

export const SolanaAdapter: ChainAdapterFactory = createSolanaAdapter(WarpChainName.Solana, {
  mainnet: {
    name: WarpChainName.Solana,
    displayName: 'Solana',
    chainId: '101',
    blockTime: 400,
    addressHrp: '',
    defaultApiUrl: 'https://api.mainnet-beta.solana.com',
    logoUrl: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/chains/logos/solana.svg',
    nativeToken: NativeTokenSol,
  },
  testnet: {
    name: WarpChainName.Solana,
    displayName: 'Solana Testnet',
    chainId: '103',
    blockTime: 400,
    addressHrp: '',
    defaultApiUrl: 'https://api.testnet.solana.com',
    logoUrl: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/chains/logos/solana.svg',
    nativeToken: NativeTokenSol,
  },
  devnet: {
    name: WarpChainName.Solana,
    displayName: 'Solana Devnet',
    chainId: '103',
    blockTime: 400,
    addressHrp: '',
    defaultApiUrl: 'https://api.devnet.solana.com',
    logoUrl: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/chains/logos/solana.svg',
    nativeToken: NativeTokenSol,
  },
})
