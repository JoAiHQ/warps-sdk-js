export const WarpSolanaConstants = {
  ComputeUnitLimit: {
    Default: 200000,
    Transfer: 5000,
    TokenTransfer: 10000,
    ContractCall: 200000,
  },
  PriorityFee: {
    Default: 1000,
  },
  Validation: {
    MinComputeUnits: 1000,
    MaxComputeUnits: 1400000,
  },
  Programs: {
    TokenProgram: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    SystemProgram: '11111111111111111111111111111111',
  },
  NativeToken: {
    Identifier: 'SOL',
    Decimals: 9,
  },
}

export enum SolanaExplorers {
  Solscan = 'solscan',
  SolscanMainnet = 'solscan_mainnet',
  SolscanDevnet = 'solscan_devnet',
  SolanaExplorer = 'solana_explorer',
  SolanaExplorerMainnet = 'solana_explorer_mainnet',
  SolanaExplorerDevnet = 'solana_explorer_devnet',
}

export type ExplorerName = SolanaExplorers

export const SolanaExplorerMap = {
  solana: {
    mainnet: [SolanaExplorers.SolscanMainnet, SolanaExplorers.SolanaExplorerMainnet] as const,
    testnet: [SolanaExplorers.Solscan, SolanaExplorers.SolanaExplorer] as const,
    devnet: [SolanaExplorers.SolscanDevnet, SolanaExplorers.SolanaExplorerDevnet] as const,
  },
} as const

export const ExplorerUrls: Record<ExplorerName, string> = {
  [SolanaExplorers.Solscan]: 'https://solscan.io',
  [SolanaExplorers.SolscanMainnet]: 'https://solscan.io',
  [SolanaExplorers.SolscanDevnet]: 'https://solscan.io',
  [SolanaExplorers.SolanaExplorer]: 'https://explorer.solana.com',
  [SolanaExplorers.SolanaExplorerMainnet]: 'https://explorer.solana.com',
  [SolanaExplorers.SolanaExplorerDevnet]: 'https://explorer.solana.com',
}

export const SolanaExplorerNames = {
  mainnet: [SolanaExplorers.SolscanMainnet, SolanaExplorers.SolanaExplorerMainnet] as const,
  testnet: [SolanaExplorers.Solscan, SolanaExplorers.SolanaExplorer] as const,
  devnet: [SolanaExplorers.SolscanDevnet, SolanaExplorers.SolanaExplorerDevnet] as const,
} as const

export const SolanaExplorerUrls: Record<ExplorerName, string> = ExplorerUrls
