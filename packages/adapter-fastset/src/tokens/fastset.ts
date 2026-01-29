import { WarpChainAsset, WarpChainName } from '@joai/warps'

export const FastsetTokens: WarpChainAsset[] = [
  {
    chain: WarpChainName.Fastset,
    identifier: '0x37bb8861c49c6f59d869634557245b8640c2de6a2d3dffd6ad4065f6f67989f1',
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
    logoUrl: {
      light: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/tokens/logos/eth-white.svg',
      dark: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/tokens/logos/eth-black.svg',
    },
    amount: 0n,
  },
  {
    chain: WarpChainName.Fastset,
    identifier: '0ee63eaa3ff9bf6e1c84a70133c5461e6e06d3787ed93200b924a6b82f0f35ff',
    name: 'Bitcoin',
    symbol: 'BTC',
    decimals: 8,
    logoUrl: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
    amount: 0n,
  },
  {
    chain: WarpChainName.Fastset,
    identifier: 'b69f0d3a4d7609367bd893ee3191e48b3047f2c4ccd21728c2441bcc2154f70c',
    name: 'Solana',
    symbol: 'SOL',
    decimals: 9,
    logoUrl: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/tokens/logos/sol.svg',
    amount: 0n,
  },
  {
    chain: WarpChainName.Fastset,
    identifier: 'c83166ed4e5e3ca88f7b2cf0ce2d310fa8c4d2ee2fc90d741f7b2040279b2687',
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    logoUrl: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png',
    amount: 0n,
  },
  {
    chain: WarpChainName.Fastset,
    identifier: '0xfa575e7000000000000000000000000000000000000000000000000000000000',
    name: 'Wrapped SET',
    symbol: 'WSET',
    decimals: 18,
    logoUrl: {
      light: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/tokens/logos/set-white.svg',
      dark: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/tokens/logos/set-black.svg',
    },
    amount: 0n,
  },
]
