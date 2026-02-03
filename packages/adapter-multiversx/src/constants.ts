export const WarpMultiversxConstants = {
  Egld: {
    Identifier: 'EGLD',
    EsdtIdentifier: 'EGLD-000000',
    DisplayName: 'eGold',
    Decimals: 18,
  },
}

export const WarpMultiversxInputTypes = {
  Null: 'null',
  Optional: 'optional',
  List: 'list',
  Token: 'token',
  CodeMeta: 'codemeta',
}

export enum MultiversxExplorers {
  MultiversxExplorer = 'multiversx_explorer',
  MultiversxExplorerDevnet = 'multiversx_explorer_devnet',
  MultiversxExplorerTestnet = 'multiversx_explorer_testnet',
}

export enum ClawsExplorers {
  ClawsExplorer = 'claws_explorer',
  ClawsExplorerDevnet = 'claws_explorer_devnet',
  ClawsExplorerTestnet = 'claws_explorer_testnet',
}

export type ExplorerName = MultiversxExplorers | ClawsExplorers

export const MultiversxExplorersConfig = {
  multiversx: {
    mainnet: [MultiversxExplorers.MultiversxExplorer] as const,
    testnet: [MultiversxExplorers.MultiversxExplorerTestnet] as const,
    devnet: [MultiversxExplorers.MultiversxExplorerDevnet] as const,
  },
  claws: {
    mainnet: [ClawsExplorers.ClawsExplorer] as const,
    testnet: [ClawsExplorers.ClawsExplorerTestnet] as const,
    devnet: [ClawsExplorers.ClawsExplorerDevnet] as const,
  },
} as const

export const ExplorerUrls: Record<ExplorerName, string> = {
  [MultiversxExplorers.MultiversxExplorer]: 'https://explorer.multiversx.com',
  [MultiversxExplorers.MultiversxExplorerDevnet]: 'https://devnet-explorer.multiversx.com',
  [MultiversxExplorers.MultiversxExplorerTestnet]: 'https://testnet-explorer.multiversx.com',

  [ClawsExplorers.ClawsExplorer]: 'https://explorer.claws.network',
  [ClawsExplorers.ClawsExplorerDevnet]: 'https://explorer.claws.network',
  [ClawsExplorers.ClawsExplorerTestnet]: 'https://explorer.claws.network',
}
