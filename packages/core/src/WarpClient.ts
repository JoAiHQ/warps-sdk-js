import { findWarpAdapterForChain, getNextInfo, getWarpInfoFromIdentifier, getWarpPrimaryAction } from './helpers'
import { resolveWarpText } from './helpers/i18n'
import { getWarpWalletAddressFromConfig } from './helpers/wallet'

import { WarpChainName } from './constants'
import {
    AdapterWarpDataLoader,
    AdapterWarpExplorer,
    AdapterWarpOutput,
    AdapterWarpRegistry,
    AdapterWarpSerializer,
    AdapterWarpWallet,
    ChainAdapter,
    ChainAdapterFactory,
    Warp,
    WarpActionExecutionResult,
    WarpActionIndex,
    WarpAdapterGenericRemoteTransaction,
    WarpAdapterGenericTransaction,
    WarpCacheConfig,
    WarpChainAction,
    WarpChainInfo,
    WarpClientConfig,
} from './types'
import { WarpText } from './types/i18n'
import { ExecutionHandlers, WarpExecutor } from './WarpExecutor'
import { WarpFactory } from './WarpFactory'
import { WarpIndex } from './WarpIndex'
import { WarpLinkBuilder } from './WarpLinkBuilder'
import { DetectionResult, WarpLinkDetecter } from './WarpLinkDetecter'

type WarpClientOptions = {
  chains: ChainAdapterFactory[]
}

export class WarpClient {
  public readonly chains: ChainAdapter[]

  constructor(
    private readonly config: WarpClientConfig,
    private readonly options: WarpClientOptions
  ) {
    this.chains = options.chains.map((factory) => factory(this.config))
  }

  getConfig(): WarpClientConfig {
    return this.config
  }

  createExecutor(handlers?: ExecutionHandlers): WarpExecutor {
    return new WarpExecutor(this.config, this.chains, handlers)
  }

  async detectWarp(urlOrId: string, cache?: WarpCacheConfig): Promise<DetectionResult> {
    const detecter = new WarpLinkDetecter(this.config, this.chains)
    return detecter.detect(urlOrId, cache)
  }

  async executeWarp(
    warpOrIdentifierOrUrl: string | Warp,
    inputs: string[],
    handlers?: ExecutionHandlers,
    params: { cache?: WarpCacheConfig; queries?: Record<string, any> } = {}
  ): Promise<{
    txs: WarpAdapterGenericTransaction[]
    chain: WarpChainInfo | null
    immediateExecutions: WarpActionExecutionResult[]
    evaluateOutput: (remoteTxs: WarpAdapterGenericRemoteTransaction[]) => Promise<void>
    resolvedInputs: string[]
  }> {
    const isWarp = typeof warpOrIdentifierOrUrl === 'object'
    const isUrl = !isWarp && warpOrIdentifierOrUrl.startsWith('http') && warpOrIdentifierOrUrl.endsWith('.json')

    let warp: Warp | null = isWarp ? warpOrIdentifierOrUrl : null

    if (!warp && isUrl) {
      const response = await fetch(warpOrIdentifierOrUrl)
      if (!response.ok) throw new Error('WarpClient: executeWarp - invalid url')
      warp = (await response.json()) as Warp
    }

    if (!warp) {
      warp = (await this.detectWarp(warpOrIdentifierOrUrl as string, params.cache)).warp
    }

    if (!warp) throw new Error('Warp not found')

    const executor = this.createExecutor(handlers)
    const { txs, chain, immediateExecutions, resolvedInputs } = await executor.execute(warp, inputs, {
      queries: params.queries,
    })

    const evaluateOutput = async (actions: WarpChainAction[]): Promise<void> => {
      await executor.evaluateOutput(warp, actions)
    }

    return { txs, chain, immediateExecutions, evaluateOutput, resolvedInputs }
  }

  async createInscriptionTransaction(chain: WarpChainName, warp: Warp): Promise<WarpAdapterGenericTransaction> {
    return await findWarpAdapterForChain(chain, this.chains).builder().createInscriptionTransaction(warp)
  }

  async createFromTransaction(chain: WarpChainName, tx: WarpAdapterGenericRemoteTransaction, validate = false): Promise<Warp> {
    return findWarpAdapterForChain(chain, this.chains).builder().createFromTransaction(tx, validate)
  }

  async createFromTransactionHash(hash: string, cache?: WarpCacheConfig): Promise<Warp | null> {
    const identifierInfo = getWarpInfoFromIdentifier(hash, this.config.defaultChain)
    if (!identifierInfo) throw new Error('WarpClient: createFromTransactionHash - invalid hash')
    const adapter = findWarpAdapterForChain(identifierInfo.chain, this.chains)
    return adapter.builder().createFromTransactionHash(hash, cache)
  }

  async signMessage(chain: WarpChainName, message: string): Promise<string> {
    const walletAddress = getWarpWalletAddressFromConfig(this.config, chain)
    if (!walletAddress) throw new Error(`No wallet configured for chain ${chain}`)
    const adapter = findWarpAdapterForChain(chain, this.chains)
    return adapter.wallet.signMessage(message)
  }

  async getActions(chain: WarpChainName, ids: string[], awaitCompleted = false): Promise<WarpChainAction[]> {
    const dataLoader = this.getDataLoader(chain)
    const actions = await Promise.all(ids.map(async (id) => dataLoader.getAction(id, awaitCompleted)))
    return actions.filter((action) => action !== null)
  }

  getExplorer(chain: WarpChainName): AdapterWarpExplorer {
    return findWarpAdapterForChain(chain, this.chains).explorer
  }

  getOutput(chain: WarpChainName): AdapterWarpOutput {
    return findWarpAdapterForChain(chain, this.chains).output
  }

  async getActionExecution(
    chain: WarpChainName,
    warp: Warp,
    tx: WarpAdapterGenericRemoteTransaction,
    actionIndex?: WarpActionIndex
  ): Promise<WarpActionExecutionResult> {
    const index = actionIndex ?? getWarpPrimaryAction(warp).index + 1
    const adapter = findWarpAdapterForChain(chain, this.chains)
    const result = await adapter.output.getActionExecution(warp, index, tx)
    result.next = getNextInfo(this.config, this.chains, warp, index, result.output)
    return result
  }

  async getRegistry(chain: WarpChainName): Promise<AdapterWarpRegistry> {
    const registry = findWarpAdapterForChain(chain, this.chains).registry
    await registry.init()
    return registry
  }

  getDataLoader(chain: WarpChainName): AdapterWarpDataLoader {
    return findWarpAdapterForChain(chain, this.chains).dataLoader
  }

  getWallet(chain: WarpChainName): AdapterWarpWallet {
    return findWarpAdapterForChain(chain, this.chains).wallet
  }

  get factory(): WarpFactory {
    return new WarpFactory(this.config, this.chains)
  }

  get index(): WarpIndex {
    return new WarpIndex(this.config)
  }

  get linkBuilder(): WarpLinkBuilder {
    return new WarpLinkBuilder(this.config, this.chains)
  }

  createBuilder(chain: WarpChainName) {
    return findWarpAdapterForChain(chain, this.chains).builder()
  }

  createAbiBuilder(chain: WarpChainName) {
    return findWarpAdapterForChain(chain, this.chains).abiBuilder()
  }

  createBrandBuilder(chain: WarpChainName) {
    return findWarpAdapterForChain(chain, this.chains).brandBuilder()
  }

  createSerializer(chain: WarpChainName): AdapterWarpSerializer {
    return findWarpAdapterForChain(chain, this.chains).serializer
  }

  resolveText(warpText: WarpText): string {
    return resolveWarpText(warpText, this.config)
  }
}
