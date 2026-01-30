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
import { Connection, TransactionSignature } from '@solana/web3.js'
import { WarpSolanaSerializer } from './WarpSolanaSerializer'

export class WarpSolanaOutput implements AdapterWarpOutput {
  private readonly serializer: WarpSolanaSerializer
  private readonly connection: Connection
  private readonly cache: WarpCache

  constructor(
    private readonly config: WarpClientConfig,
    private readonly chain: WarpChainInfo
  ) {
    this.serializer = new WarpSolanaSerializer()
    const providerConfig = getProviderConfig(this.config, this.chain.name, this.config.env, this.chain.defaultApiUrl)
    this.connection = new Connection(providerConfig.url, 'confirmed')
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
      return this.handleTransactionSignature(warp, actionIndex, tx, resolvedInputs)
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

  private async handleWarpChainAction(warp: Warp, actionIndex: WarpActionIndex, tx: WarpChainAction, resolvedInputs: string[] = []): Promise<WarpActionExecutionResult> {
    const isPending = tx.status === 'pending'
    const success = tx.status === 'success'
    const transactionHash = tx.id || tx.tx?.signature || ''

    if (isPending) {
      throw new Error(`Transaction ${transactionHash} is still pending. Execution should only proceed after finalization.`)
    }

    const slot = tx.tx?.slot || 0
    const blockTime = tx.tx?.blockTime || 0
    const rawValues = [transactionHash, slot.toString(), blockTime.toString()]
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

  private async handleTransactionSignature(
    warp: Warp,
    actionIndex: WarpActionIndex,
    signature: TransactionSignature,
    resolvedInputs: string[] = []
  ): Promise<WarpActionExecutionResult> {
    try {
      const tx = await this.connection.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      })

      if (!tx) {
        return this.createFailedExecution(warp, actionIndex, resolvedInputs)
      }

      const success = !tx.meta?.err
      const slot = tx.slot
      const blockTime = tx.blockTime || 0
      const fee = tx.meta?.fee || 0

      const rawValues = [signature, slot.toString(), blockTime.toString(), fee.toString()]
      const stringValues = rawValues.map(String)

      return {
        status: success ? 'success' : 'error',
        warp,
        action: actionIndex,
        user: getWarpWalletAddressFromConfig(this.config, this.chain.name),
        txHash: signature,
        tx: {
          signature,
          slot,
          blockTime,
          fee,
          err: tx.meta?.err || null,
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
      const tx = await this.connection.getTransaction(txHash, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      })

      if (!tx) {
        return { status: 'pending' }
      }

      return {
        status: tx.meta?.err ? 'failed' : 'confirmed',
        blockNumber: tx.slot,
        gasUsed: BigInt(tx.meta?.fee || 0),
      }
    } catch (error) {
      throw new Error(`Failed to get transaction status: ${error}`)
    }
  }

  async getTransactionReceipt(txHash: string): Promise<any> {
    try {
      const tx = await this.connection.getTransaction(txHash, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      })

      if (!tx) {
        return null
      }

      return {
        signature: txHash,
        slot: tx.slot,
        blockTime: tx.blockTime,
        fee: tx.meta?.fee || 0,
        err: tx.meta?.err || null,
      }
    } catch (error) {
      return null
    }
  }
}
