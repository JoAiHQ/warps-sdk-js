export const WarpEvmConstants = {
  GasLimit: {
    Default: 21000,
    ContractCall: 100000,
    ContractDeploy: 500000,
    Transfer: 21000,
    TokenTransfer: 65000, // ERC-20 transfer gas limit
    Approve: 46000,
    Swap: 200000,
  },
  GasPrice: {
    Default: '1200010',
  },
  Validation: {
    MinGasLimit: 21000,
    MaxGasLimit: 30000000,
  },
}

export enum EthereumExplorers {
  Etherscan = 'etherscan',
  EtherscanSepolia = 'etherscan_sepolia',
  Ethplorer = 'ethplorer',
  Blockscout = 'blockscout',
  BlockscoutSepolia = 'blockscout_sepolia',
}

export enum ArbitrumExplorers {
  Arbiscan = 'arbiscan',
  ArbiscanSepolia = 'arbiscan_sepolia',
  BlockscoutArbitrum = 'blockscout_arbitrum',
  BlockscoutArbitrumSepolia = 'blockscout_arbitrum_sepolia',
}

export enum BaseExplorers {
  Basescan = 'basescan',
  BasescanSepolia = 'basescan_sepolia',
  BlockscoutBase = 'blockscout_base',
  BlockscoutBaseSepolia = 'blockscout_base_sepolia',
}

export enum PolygonExplorers {
  Polygonscan = 'polygonscan',
  PolygonscanMumbai = 'polygonscan_mumbai',
  BlockscoutPolygon = 'blockscout_polygon',
  BlockscoutPolygonMumbai = 'blockscout_polygon_mumbai',
}

export enum TempoExplorers {
  TempoExplorer = 'tempo_explorer',
  TempoExplorerTestnet = 'tempo_explorer_testnet',
  TempoExplorerDevnet = 'tempo_explorer_devnet',
}

export type ExplorerName = EthereumExplorers | ArbitrumExplorers | BaseExplorers | PolygonExplorers | TempoExplorers

export const EvmExplorers = {
  ethereum: {
    mainnet: [EthereumExplorers.Etherscan, EthereumExplorers.Ethplorer, EthereumExplorers.Blockscout] as const,
    testnet: [EthereumExplorers.EtherscanSepolia, EthereumExplorers.BlockscoutSepolia] as const,
    devnet: [EthereumExplorers.EtherscanSepolia, EthereumExplorers.BlockscoutSepolia] as const,
  },
  arbitrum: {
    mainnet: [ArbitrumExplorers.Arbiscan, ArbitrumExplorers.BlockscoutArbitrum] as const,
    testnet: [ArbitrumExplorers.ArbiscanSepolia, ArbitrumExplorers.BlockscoutArbitrumSepolia] as const,
    devnet: [ArbitrumExplorers.ArbiscanSepolia, ArbitrumExplorers.BlockscoutArbitrumSepolia] as const,
  },
  base: {
    mainnet: [BaseExplorers.Basescan, BaseExplorers.BlockscoutBase] as const,
    testnet: [BaseExplorers.BasescanSepolia, BaseExplorers.BlockscoutBaseSepolia] as const,
    devnet: [BaseExplorers.BasescanSepolia, BaseExplorers.BlockscoutBaseSepolia] as const,
  },
  polygon: {
    mainnet: [PolygonExplorers.Polygonscan, PolygonExplorers.BlockscoutPolygon] as const,
    testnet: [PolygonExplorers.PolygonscanMumbai, PolygonExplorers.BlockscoutPolygonMumbai] as const,
    devnet: [PolygonExplorers.PolygonscanMumbai, PolygonExplorers.BlockscoutPolygonMumbai] as const,
  },
  tempo: {
    mainnet: [TempoExplorers.TempoExplorer] as const,
    testnet: [TempoExplorers.TempoExplorerTestnet] as const,
    devnet: [TempoExplorers.TempoExplorerDevnet] as const,
  },
} as const

export const ExplorerUrls: Record<ExplorerName, string> = {
  [EthereumExplorers.Etherscan]: 'https://etherscan.io',
  [EthereumExplorers.EtherscanSepolia]: 'https://sepolia.etherscan.io',
  [EthereumExplorers.Ethplorer]: 'https://ethplorer.io',
  [EthereumExplorers.Blockscout]: 'https://eth.blockscout.com',
  [EthereumExplorers.BlockscoutSepolia]: 'https://sepolia.blockscout.com',

  [ArbitrumExplorers.Arbiscan]: 'https://arbiscan.io',
  [ArbitrumExplorers.ArbiscanSepolia]: 'https://sepolia.arbiscan.io',
  [ArbitrumExplorers.BlockscoutArbitrum]: 'https://arbitrum.blockscout.com',
  [ArbitrumExplorers.BlockscoutArbitrumSepolia]: 'https://sepolia.blockscout.com',

  [BaseExplorers.Basescan]: 'https://basescan.org',
  [BaseExplorers.BasescanSepolia]: 'https://sepolia.basescan.org',
  [BaseExplorers.BlockscoutBase]: 'https://base.blockscout.com',
  [BaseExplorers.BlockscoutBaseSepolia]: 'https://sepolia.blockscout.com',

  [PolygonExplorers.Polygonscan]: 'https://polygonscan.com',
  [PolygonExplorers.PolygonscanMumbai]: 'https://mumbai.polygonscan.com',
  [PolygonExplorers.BlockscoutPolygon]: 'https://polygon.blockscout.com',
  [PolygonExplorers.BlockscoutPolygonMumbai]: 'https://mumbai.blockscout.com',

  [TempoExplorers.TempoExplorer]: 'https://explore.tempo.xyz',
  [TempoExplorers.TempoExplorerTestnet]: 'https://explore.testnet.tempo.xyz',
  [TempoExplorers.TempoExplorerDevnet]: 'https://explore.devnet.tempo.xyz',
}

export const EvmChainIds = {
  Ethereum: {
    Mainnet: 1,
    Goerli: 5,
    Sepolia: 11155111,
  },
  Polygon: {
    Mainnet: 137,
    Mumbai: 80001,
  },
  Arbitrum: {
    Mainnet: 42161,
    Sepolia: 421614,
  },
  Base: {
    Mainnet: 8453,
    Sepolia: 84532,
  },
  Optimism: {
    Mainnet: 10,
    Sepolia: 11155420,
  },
  Tempo: {
    Mainnet: 4217,
    Moderato: 42431,
    Devnet: 31318,
  },
} as const

export const EvmChainIdMap: Record<string, number> = {
  'ethereum:mainnet': EvmChainIds.Ethereum.Mainnet,
  'ethereum:goerli': EvmChainIds.Ethereum.Goerli,
  'ethereum:sepolia': EvmChainIds.Ethereum.Sepolia,
  'polygon:mainnet': EvmChainIds.Polygon.Mainnet,
  'polygon:mumbai': EvmChainIds.Polygon.Mumbai,
  'arbitrum:mainnet': EvmChainIds.Arbitrum.Mainnet,
  'arbitrum:sepolia': EvmChainIds.Arbitrum.Sepolia,
  'base:mainnet': EvmChainIds.Base.Mainnet,
  'base:sepolia': EvmChainIds.Base.Sepolia,
  'optimism:mainnet': EvmChainIds.Optimism.Mainnet,
  'optimism:sepolia': EvmChainIds.Optimism.Sepolia,
  'tempo:mainnet': EvmChainIds.Tempo.Mainnet,
  'tempo:moderato': EvmChainIds.Tempo.Moderato,
  'tempo:devnet': EvmChainIds.Tempo.Devnet,
}

export const SupportedEvmChainIds: number[] = [
  EvmChainIds.Ethereum.Mainnet,
  EvmChainIds.Ethereum.Goerli,
  EvmChainIds.Ethereum.Sepolia,
  EvmChainIds.Polygon.Mainnet,
  EvmChainIds.Polygon.Mumbai,
  EvmChainIds.Arbitrum.Mainnet,
  EvmChainIds.Arbitrum.Sepolia,
  EvmChainIds.Base.Mainnet,
  EvmChainIds.Base.Sepolia,
  EvmChainIds.Optimism.Mainnet,
  EvmChainIds.Optimism.Sepolia,
  EvmChainIds.Tempo.Mainnet,
  EvmChainIds.Tempo.Moderato,
  EvmChainIds.Tempo.Devnet,
]
