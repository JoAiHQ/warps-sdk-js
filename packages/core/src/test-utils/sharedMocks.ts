import { WarpChainName } from '../constants'
import { WarpClientConfig, WarpTransferAction, WarpWalletProvider } from '../types'

export const createMockChainInfo = (chainName: WarpChainName = WarpChainName.Multiversx) => ({
  name: chainName,
  displayName: chainName === WarpChainName.Multiversx ? 'MultiversX' : chainName,
  chainId: chainName === WarpChainName.Multiversx ? 'D' : chainName,
  blockTime: 6000,
  addressHrp: 'erd',
  defaultApiUrl: `https://${chainName === WarpChainName.Multiversx ? 'devnet-api.multiversx' : chainName}.com`,
  logoUrl: 'https://example.com/chain-logo.png',
  nativeToken: {
    chain: chainName,
    identifier: 'EGLD',
    name: 'MultiversX',
    symbol: 'EGLD',
    decimals: 18,
    logoUrl: 'https://example.com/egld-logo.png',
  },
})

export const createMockAdapter = (chainName: WarpChainName = WarpChainName.Multiversx) => ({
  chain: chainName,
  chainInfo: createMockChainInfo(chainName),
  prefix: chainName,
  explorer: {
    getTransactionUrl: () => '',
    getAddressUrl: () => '',
    getTokenUrl: () => '',
    getBlockUrl: () => '',
    getAccountUrl: () => '',
    getAssetUrl: () => '',
    getContractUrl: () => '',
  },
  builder: () => ({
    createInscriptionTransaction() {
      return Promise.resolve({})
    },
    createFromTransaction() {
      return Promise.resolve({ protocol: '', name: '', title: '', description: '', actions: [] })
    },
    createFromTransactionHash() {
      return Promise.resolve(null)
    },
    createFromRaw() {
      return Promise.resolve({ protocol: '', name: '', title: '', description: '', actions: [] })
    },
    createFromUrl() {
      return Promise.resolve({ protocol: '', name: '', title: '', description: '', actions: [] })
    },
    setName() {
      return this
    },
    setTitle() {
      return this
    },
    setDescription() {
      return this
    },
    setPreview() {
      return this
    },
    setActions() {
      return this
    },
    addAction() {
      return this
    },
    setOutput() {
      return this
    },
    build() {
      return Promise.resolve({ protocol: '', name: '', title: '', description: '', actions: [] })
    },
  }),
  abiBuilder: () => ({
    createInscriptionTransaction: async () => Promise.resolve({}),
    createFromRaw: async () => ({}),
    createFromTransaction: async () => ({}),
    createFromTransactionHash: async () => null,
  }),
  brandBuilder: () => ({
    createInscriptionTransaction: () => Promise.resolve({}),
    createFromTransaction: async () => ({
      protocol: 'warp',
      name: 'test-brand',
      description: 'Test Brand',
      logo: 'test-logo.png',
    }),
    createFromTransactionHash: async () => null,
  }),
  executor: {
    createTransaction() {
      return Promise.resolve([{}])
    },
    preprocessInput(chain: any, input: string, type: string, value: string) {
      return Promise.resolve(input)
    },
    signMessage(message: string, privateKey: string) {
      return Promise.resolve('mock-signature')
    },
    executeQuery(executable: any) {
      return Promise.resolve({
        status: 'success' as const, // Explicitly use 'success'
        warp: { protocol: '', name: '', title: '', description: '', actions: [] },
        action: 0,
        user: null,
        txHash: null,
        tx: null,
        next: null,
        values: { string: [], native: [], mapped: {} },
        output: {},
        messages: {},
        destination: null, // Added missing property
        resolvedInputs: [], // Added missing property
      })
    },
  },
  output: {
    getTransactionExecutionResults() {
      return Promise.resolve({
        status: 'success' as const, // Explicitly use 'success'
        warp: { protocol: '', name: '', title: '', description: '', actions: [] },
        action: 0,
        user: null,
        txHash: null,
        next: null,
        values: { string: [], native: [], mapped: {} },
        output: {},
        messages: {},
        destination: null, // Added missing property
        resolvedInputs: [], // Added missing property
      })
    },
    getActionExecution() {
      return Promise.resolve({
        status: 'success' as const,
        warp: { protocol: '', name: '', title: '', description: '', actions: [] },
        action: 0,
        user: null,
        txHash: null,
        tx: null,
        next: null,
        values: { string: [], native: [], mapped: {} },
        output: {},
        messages: {},
        destination: null,
        resolvedInputs: [],
      })
    },
  },
  dataLoader: {
    getAccount(address: string) {
      return Promise.resolve({ chain: chainName, address, balance: BigInt(0) })
    },
    getAccountAssets() {
      return Promise.resolve([])
    },
    getAsset(identifier: string) {
      // Return a mock asset with 18 decimals by default
      return Promise.resolve({
        chain: chainName,
        identifier,
        name: `Mock ${identifier}`,
        symbol: 'MOCK',
        amount: 0n,
        decimals: 18,
        logoUrl: 'https://example.com/token.png',
      })
    },
    getAccountInfo() {
      return Promise.resolve({ address: 'erd1test', balance: 0n, nonce: 0 })
    },
    getAccountActions(address: string, options?: any) {
      return Promise.resolve([])
    },
    getAction(identifier: string, awaitCompleted?: boolean) {
      return Promise.resolve(null)
    },
  },
  serializer: {
    typedToString() {
      return ''
    },
    typedToNative() {
      return ['', ''] as [string, any]
    },
    nativeToTyped() {
      return ''
    },
    nativeToType() {
      return ''
    },
    stringToTyped() {
      return ''
    },
  },
  registry: {
    init: async () => {},
    getRegistryConfig: () => ({ unitPrice: 0n, admins: [] }),
    createWarpRegisterTransaction() {
      return Promise.resolve({})
    },
    createWarpUnregisterTransaction() {
      return Promise.resolve({})
    },
    createWarpUpgradeTransaction() {
      return Promise.resolve({})
    },
    createWarpAliasSetTransaction() {
      return Promise.resolve({})
    },
    createWarpVerifyTransaction() {
      return Promise.resolve({})
    },
    createWarpTransferOwnershipTransaction() {
      return Promise.resolve({})
    },
    createBrandRegisterTransaction() {
      return Promise.resolve({})
    },
    createWarpBrandingTransaction() {
      return Promise.resolve({})
    },
    getInfoByAlias() {
      return Promise.resolve({ registryInfo: null, brand: null })
    },
    getInfoByHash() {
      return Promise.resolve({ registryInfo: null, brand: null })
    },
    getUserWarpRegistryInfos() {
      return Promise.resolve([])
    },
    getUserBrands() {
      return Promise.resolve([])
    },
    getChainInfos() {
      return Promise.resolve([])
    },
    getChainInfo(chain: string) {
      if (chain === 'multiversx') {
        return Promise.resolve(createMockChainInfo(WarpChainName.Multiversx))
      }
      return Promise.resolve(null)
    },
    setChain() {
      return Promise.resolve({})
    },
    removeChain() {
      return Promise.resolve({})
    },
    fetchBrand() {
      return Promise.resolve(null)
    },
  },
  wallet: {
    signTransaction(tx: any) {
      return Promise.resolve(tx)
    },
    signTransactions(txs: any[]) {
      return Promise.resolve(txs)
    },
    signMessage(message: string) {
      return Promise.resolve('mock-signature')
    },
    sendTransactions(txs: any[]) {
      return Promise.resolve(['mock-tx-hash'])
    },
    sendTransaction(tx: any) {
      return Promise.resolve('mock-tx-hash')
    },
    create(mnemonic: string) {
      return Promise.resolve({ provider: 'mnemonic' as const, address: 'erd1test', mnemonic })
    },
    getAddress() {
      return 'erd1test'
    },
    importFromMnemonic: async (mnemonic: string) => Promise.resolve({ provider: 'mnemonic' as const, address: 'mock-address', mnemonic }),
    importFromPrivateKey: async (privateKey: string) =>
      Promise.resolve({ provider: 'privateKey' as const, address: 'mock-address', privateKey }),
    export: async (provider: WarpWalletProvider) => Promise.resolve({ provider, address: 'mock-address' }),
    getPublicKey: () => 'mock-public-key',
    generate: async (provider: WarpWalletProvider) => Promise.resolve({ provider, address: 'mock-address' }),
  },
})

export const createMockConfig = (overrides: Partial<WarpClientConfig> = {}): WarpClientConfig => ({
  env: 'devnet',
  user: {
    wallets: { multiversx: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8' },
  },
  currentUrl: 'https://example.com',
  ...overrides,
})

export const createMockWarp = () => ({
  protocol: 'warp',
  name: 'test',
  title: 'Test Warp',
  description: 'Test Description',
  preview: 'test-preview',
  actions: [
    {
      type: 'transfer' as const,
      label: 'Test Action',
      chain: WarpChainName.Multiversx,
      address: 'erd1...',
      value: '0',
      inputs: [],
    } as WarpTransferAction,
  ],
})

export const createMockExecutionResults = () => ({
  status: 'success',
  warp: createMockWarp(),
  action: 0,
  user: null,
  txHash: null,
  next: null,
  values: { string: [], native: [], mapped: {} },
  output: {},
  messages: {},
})
