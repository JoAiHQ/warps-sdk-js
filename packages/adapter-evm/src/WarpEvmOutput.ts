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
  WarpChainAction,
  WarpChainInfo,
  WarpClientConfig,
  WarpConstants,
  WarpExecutionOutput,
  WarpNativeValue,
  WarpCache,
  WarpCacheKey,
} from '@joai/warps'
import { ethers } from 'ethers'
import { WarpEvmSerializer } from './WarpEvmSerializer'

export class WarpEvmOutput implements AdapterWarpOutput {
  private readonly serializer: WarpEvmSerializer
  private readonly provider: ethers.JsonRpcProvider
  private readonly cache: WarpCache

  constructor(
    private readonly config: WarpClientConfig,
    private readonly chain: WarpChainInfo
  ) {
    this.serializer = new WarpEvmSerializer()
    const providerConfig = getProviderConfig(this.config, this.chain.name, this.config.env, this.chain.defaultApiUrl)
    const network = new ethers.Network(this.chain.name, parseInt(this.chain.chainId))
    this.provider = new ethers.JsonRpcProvider(providerConfig.url, network)
    this.cache = new WarpCache(config.env, config.cache)
  }

  async getActionExecution(
    warp: Warp,
    actionIndex: WarpActionIndex,
    tx: WarpAdapterGenericRemoteTransaction
  ): Promise<WarpActionExecutionResult> {
    // Restore inputs via cache as transactions are broadcasted and processed asynchronously
    const inputs: ResolvedInput[] = this.cache.get(WarpCacheKey.WarpExecutable(this.config.env, warp.meta?.hash || '', actionIndex)) ?? []
    const resolvedInputs = extractResolvedInputValues(inputs)

    if (!tx) {
      return this.createFailedExecution(warp, actionIndex, resolvedInputs)
    }

    if ('status' in tx && typeof tx.status === 'string') {
      return this.handleWarpChainAction(warp, actionIndex, tx as WarpChainAction, resolvedInputs)
    }

    return this.handleTransactionReceipt(warp, actionIndex, tx as ethers.TransactionReceipt, resolvedInputs)
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

  private handleWarpChainAction(warp: Warp, actionIndex: WarpActionIndex, tx: WarpChainAction, resolvedInputs: string[] = []): WarpActionExecutionResult {
    const success = tx.status === 'success'
    const transactionHash = tx.id || tx.tx?.hash || ''
    const gasUsed = tx.tx?.gasLimit || '0'
    const gasPrice = tx.tx?.gasPrice || '0'
    const blockNumber = tx.tx?.blockNumber || '0'

    const rawValues = [transactionHash, blockNumber, gasUsed, gasPrice]
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

  private handleTransactionReceipt(warp: Warp, actionIndex: WarpActionIndex, tx: ethers.TransactionReceipt, resolvedInputs: string[] = []): WarpActionExecutionResult {
    const success = tx.status === 1
    const gasUsed = tx.gasUsed?.toString() || '0'
    const gasPrice = tx.gasPrice?.toString() || '0'
    const blockNumber = tx.blockNumber?.toString() || '0'
    const transactionHash = tx.hash

    const logs = tx.logs.map((log) => ({
      address: log.address,
      topics: [...log.topics],
      data: log.data,
      blockNumber: log.blockNumber?.toString() || '0',
      transactionHash: log.transactionHash,
      index: log.index?.toString() || '0',
    }))

    const rawValues = [transactionHash, blockNumber, gasUsed, gasPrice, ...(logs.length > 0 ? logs : [])]
    const stringValues = rawValues.map(String)

    return {
      status: success ? 'success' : 'error',
      warp,
      action: actionIndex,
      user: getWarpWalletAddressFromConfig(this.config, this.chain.name),
      txHash: transactionHash,
      tx: {
        ...tx,
        status: tx.status,
      },
      next: null,
      values: { string: stringValues, native: rawValues, mapped: {} },
      output: {},
      messages: {},
      destination: null,
      resolvedInputs,
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
      const receipt = await this.provider.getTransactionReceipt(txHash)

      if (!receipt) {
        return { status: 'pending' }
      }

      return {
        status: receipt.status === 1 ? 'confirmed' : 'failed',
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
      }
    } catch (error) {
      throw new Error(`Failed to get transaction status: ${error}`)
    }
  }

  async getTransactionReceipt(txHash: string): Promise<ethers.TransactionReceipt | null> {
    try {
      return await this.provider.getTransactionReceipt(txHash)
    } catch (error) {
      return null
    }
  }
}
