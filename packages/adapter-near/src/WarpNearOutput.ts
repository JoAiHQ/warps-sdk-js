import {
  AdapterWarpOutput,
  evaluateOutputCommon,
  extractResolvedInputValues,
  getProviderConfig,
  getWarpWalletAddressFromConfig,
  parseOutputOutIndex,
  ResolvedInput,
  Warp,
  WarpActionExecutionResult,
  WarpActionIndex,
  WarpAdapterGenericRemoteTransaction,
  WarpCache,
  WarpCacheKey,
  WarpChainAction,
  WarpChainInfo,
  WarpClientConfig,
  WarpConstants,
  WarpExecutionOutput,
  WarpNativeValue,
} from '@joai/warps'
import { connect, keyStores } from 'near-api-js'
import { WarpNearSerializer } from './WarpNearSerializer'

export class WarpNearOutput implements AdapterWarpOutput {
  private readonly serializer: WarpNearSerializer
  private readonly nearConfig: any
  private readonly cache: WarpCache

  constructor(
    private readonly config: WarpClientConfig,
    private readonly chain: WarpChainInfo
  ) {
    this.serializer = new WarpNearSerializer()
    const providerConfig = getProviderConfig(this.config, this.chain.name, this.config.env, this.chain.defaultApiUrl)

    this.nearConfig = {
      networkId: this.config.env === 'mainnet' ? 'mainnet' : this.config.env === 'testnet' ? 'testnet' : 'testnet',
      nodeUrl: providerConfig.url,
      keyStore: new keyStores.InMemoryKeyStore(),
    }
    this.cache = new WarpCache(config.env, config.cache)
  }

  async getActionExecution(
    warp: Warp,
    actionIndex: WarpActionIndex,
    tx: WarpAdapterGenericRemoteTransaction
  ): Promise<WarpActionExecutionResult> {
    const inputs: ResolvedInput[] = this.cache.get(WarpCacheKey.WarpExecutable(this.config.env, warp.meta?.hash || '', actionIndex)) ?? []
    const resolvedInputs = extractResolvedInputValues(inputs)

    if (!tx) {
      return this.createFailedExecution(warp, actionIndex, resolvedInputs)
    }

    if ('status' in tx && typeof tx.status === 'string') {
      return this.handleWarpChainAction(warp, actionIndex, tx as WarpChainAction, resolvedInputs)
    }

    if (typeof tx === 'string') {
      return this.handleTransactionHash(warp, actionIndex, tx, resolvedInputs)
    }

    return this.createFailedExecution(warp, actionIndex, resolvedInputs)
  }

  private createFailedExecution(warp: Warp, actionIndex: WarpActionIndex, resolvedInputs: string[] = []): WarpActionExecutionResult {
    return {
      status: 'error',
      warp,
      action: actionIndex,
      user: getWarpWalletAddressFromConfig(this.config, this.chain.name),
      txHash: '',
      tx: null,
      next: null,
      values: { string: [], native: [], mapped: {} },
      output: {},
      messages: {},
      destination: null,
      resolvedInputs,
    }
  }

  private handleWarpChainAction(
    warp: Warp,
    actionIndex: WarpActionIndex,
    tx: WarpChainAction,
    resolvedInputs: string[] = []
  ): WarpActionExecutionResult {
    const success = tx.status === 'success'
    const transactionHash = tx.id || tx.tx?.hash || ''

    const rawValues = [transactionHash]
    const stringValues = rawValues.map(String)

    return {
      status: success ? 'success' : 'error',
      warp,
      action: actionIndex,
      user: getWarpWalletAddressFromConfig(this.config, this.chain.name),
      txHash: transactionHash,
      tx,
      next: null,
      values: { string: stringValues, native: rawValues, mapped: {} },
      output: {},
      messages: {},
      destination: null,
      resolvedInputs,
    }
  }

  private async handleTransactionHash(
    warp: Warp,
    actionIndex: WarpActionIndex,
    hash: string,
    resolvedInputs: string[] = []
  ): Promise<WarpActionExecutionResult> {
    try {
      const near = await connect(this.nearConfig)
      const txStatus = await (near.connection.provider as any).txStatus(hash, this.nearConfig.networkId)

      if (!txStatus) {
        return this.createFailedExecution(warp, actionIndex, resolvedInputs)
      }

      const statusObj = txStatus.status as any
      const success = statusObj && ('SuccessValue' in statusObj || 'SuccessReceiptId' in statusObj)
      const transaction = txStatus.transaction

      const rawValues = [hash]
      const stringValues = rawValues.map(String)

      return {
        status: success ? 'success' : 'error',
        warp,
        action: actionIndex,
        user: getWarpWalletAddressFromConfig(this.config, this.chain.name),
        txHash: hash,
        tx: {
          hash,
          transaction,
          status: txStatus.status,
        } as any,
        next: null,
        values: { string: stringValues, native: rawValues, mapped: {} },
        output: {},
        messages: {},
        destination: null,
        resolvedInputs,
      }
    } catch (error) {
      return this.createFailedExecution(warp, actionIndex, resolvedInputs)
    }
  }

  async extractQueryOutput(
    warp: Warp,
    typedValues: unknown[],
    actionIndex: number,
    inputs: ResolvedInput[]
  ): Promise<{ values: { string: string[]; native: WarpNativeValue[]; mapped: Record<string, any> }; output: WarpExecutionOutput }> {
    const stringValues = typedValues.map((t) => this.serializer.typedToString(t))
    const nativeValues = typedValues.map((t) => this.serializer.typedToNative(t)[1])
    const values = { string: stringValues, native: nativeValues, mapped: {} }
    let output: WarpExecutionOutput = {}

    if (!warp.output) return { values, output }

    const getNestedValue = (path: string): unknown => {
      const indices = path
        .split('.')
        .slice(1)
        .map((i) => parseInt(i) - 1)
      if (indices.length === 0) return undefined
      let value: unknown = nativeValues[indices[0]]
      for (let i = 1; i < indices.length; i++) {
        if (value === undefined || value === null) return undefined
        value = (value as Record<string, unknown>)[indices[i]]
      }
      return value
    }

    for (const [key, path] of Object.entries(warp.output)) {
      if (path.startsWith(WarpConstants.Transform.Prefix)) continue
      const currentActionIndex = parseOutputOutIndex(path)
      if (currentActionIndex !== null && currentActionIndex !== actionIndex) {
        output[key] = null
        continue
      }
      if (path.startsWith('out.') || path === 'out' || path.startsWith('out[')) {
        output[key] = getNestedValue(path) || null
      } else {
        output[key] = path
      }
    }

    return { values, output: await evaluateOutputCommon(warp, output, nativeValues, actionIndex, inputs, this.serializer.coreSerializer, this.config) }
  }

  async getTransactionStatus(
    txHash: string
  ): Promise<{ status: 'pending' | 'confirmed' | 'failed'; blockNumber?: number; gasUsed?: bigint }> {
    try {
      const near = await connect(this.nearConfig)
      const txStatus = await (near.connection.provider as any).txStatus(txHash, this.nearConfig.networkId)

      if (!txStatus) {
        return { status: 'pending' }
      }

      const statusObj = txStatus.status as any
      const isSuccess = statusObj && ('SuccessValue' in statusObj || 'SuccessReceiptId' in statusObj)
      return {
        status: isSuccess ? 'confirmed' : 'failed',
        blockNumber: (txStatus.transaction_outcome as any)?.block_hash ? 0 : undefined,
        gasUsed: BigInt(0),
      }
    } catch (error) {
      throw new Error(`Failed to get transaction status: ${error}`)
    }
  }

  async getTransactionReceipt(txHash: string): Promise<any> {
    try {
      const near = await connect(this.nearConfig)
      const txStatus = await (near.connection.provider as any).txStatus(txHash, this.nearConfig.networkId)

      if (!txStatus) {
        return null
      }

      return {
        hash: txHash,
        transaction: txStatus.transaction,
        status: txStatus.status as any,
      }
    } catch (error) {
      return null
    }
  }
}
