import { safeWindow } from './constants'
import {
  evaluateWhenCondition,
  extractCollectOutput,
  findWarpAdapterForChain,
  getNextInfo,
  getWarpActionByIndex,
  getWarpPrimaryAction,
  isWarpActionAutoExecute,
  replacePlaceholdersInWhenExpression,
} from './helpers'
import { extractPromptOutput } from './helpers/output'
import { buildHttpRequest } from './helpers/http'
import { applyOutputToMessages } from './helpers/messages'
import { buildMappedOutput, extractResolvedInputValues } from './helpers/payload'
import { getWarpWalletAddressFromConfig } from './helpers/wallet'
import { handleX402Payment } from './helpers/x402'
import {
  ChainAdapter,
  ResolvedInput,
  Warp,
  WarpAction,
  WarpActionExecutionResult,
  WarpActionIndex,
  WarpAdapterGenericTransaction,
  WarpChainAction,
  WarpChainInfo,
  WarpClientConfig,
  WarpCollectAction,
  WarpCollectDestinationHttp,
  WarpExecutable,
  WarpLinkAction,
  WarpMcpAction,
  WarpPromptAction,
} from './types'
import { WarpFactory } from './WarpFactory'
import { WarpInterpolator } from './WarpInterpolator'
import { WarpLogger } from './WarpLogger'

export type ExecutionHandlers = {
  onExecuted?: (result: WarpActionExecutionResult) => void | Promise<void>
  onError?: (params: { message: string; result: WarpActionExecutionResult }) => void
  onSignRequest?: (params: { message: string; chain: WarpChainInfo }) => string | Promise<string>
  onActionExecuted?: (params: {
    action: WarpActionIndex
    chain: WarpChainInfo | null
    execution: WarpActionExecutionResult | null
    tx: WarpAdapterGenericTransaction | null
  }) => void
  onActionUnhandled?: (params: {
    action: WarpActionIndex
    chain: WarpChainInfo | null
    execution: WarpActionExecutionResult | null
    tx: WarpAdapterGenericTransaction | null
  }) => void
}

export class WarpExecutor {
  private factory: WarpFactory

  constructor(
    private config: WarpClientConfig,
    private adapters: ChainAdapter[],
    private handlers?: ExecutionHandlers
  ) {
    this.handlers = handlers
    this.factory = new WarpFactory(config, adapters)
  }

  async execute(
    warp: Warp,
    inputs: string[],
    meta: { envs?: Record<string, any>; queries?: Record<string, any> } = {}
  ): Promise<{
    txs: WarpAdapterGenericTransaction[]
    chain: WarpChainInfo | null
    immediateExecutions: WarpActionExecutionResult[]
    resolvedInputs: string[]
  }> {
    let txs: WarpAdapterGenericTransaction[] = []
    let chainInfo: WarpChainInfo | null = null
    let immediateExecutions: WarpActionExecutionResult[] = []
    let resolvedInputs: string[] = []

    const warpQueries = warp.meta?.query ?? {}
    const mergedQueries = { ...warpQueries, ...meta.queries }
    const mergedMeta = { ...meta, queries: mergedQueries }

    const { action: primaryAction, index: primaryIndex } = getWarpPrimaryAction(warp)

    for (let index = 1; index <= warp.actions.length; index++) {
      const action = getWarpActionByIndex(warp, index)
      if (!isWarpActionAutoExecute(action, warp)) continue
      const { tx, chain, immediateExecution, executable } = await this.executeAction(warp, index, inputs, mergedMeta)
      if (tx) txs.push(tx)
      if (chain) chainInfo = chain
      if (immediateExecution) immediateExecutions.push(immediateExecution)

      // Extract resolved inputs from primary action's executable
      if (executable && index === primaryIndex + 1 && executable.resolvedInputs) {
        resolvedInputs = extractResolvedInputValues(executable.resolvedInputs)
      }
    }

    if (!chainInfo && txs.length > 0) throw new Error(`WarpExecutor: Chain not found for ${txs.length} transactions`)

    // Call onExecuted handler after all actions are executed – if there are no transactions, call it with the last immediate execution
    // If there are transactions to be executed, defer onExecuted call to transaction result evaluation
    if (txs.length === 0 && immediateExecutions.length > 0) {
      const lastImmediateExecution = immediateExecutions[immediateExecutions.length - 1]
      await this.callHandler(() => this.handlers?.onExecuted?.(lastImmediateExecution))
    }

    return { txs, chain: chainInfo, immediateExecutions, resolvedInputs }
  }

  async executeAction(
    warp: Warp,
    actionIndex: WarpActionIndex,
    inputs: string[],
    meta: { envs?: Record<string, any>; queries?: Record<string, any> } = {}
  ): Promise<{
    tx: WarpAdapterGenericTransaction | null
    chain: WarpChainInfo | null
    immediateExecution: WarpActionExecutionResult | null
    executable: WarpExecutable | null
  }> {
    const action = getWarpActionByIndex(warp, actionIndex)

    if (action.type === 'link') {
      if (action.when) {
        const shouldExecute = await this.evaluateWhenCondition(warp, action, inputs, meta)
        if (!shouldExecute) {
          return { tx: null, chain: null, immediateExecution: null, executable: null }
        }
      }

      await this.callHandler(async () => {
        const url = (action as WarpLinkAction).url
        if (this.config.interceptors?.openLink) {
          await this.config.interceptors.openLink(url)
        } else {
          safeWindow.open(url, '_blank')
        }
      })

      return { tx: null, chain: null, immediateExecution: null, executable: null }
    }

    if (action.type === 'prompt') {
      const result = await this.executePrompt(warp, action as WarpPromptAction, actionIndex, inputs, meta)
      if (result.status === 'success') {
        await this.callHandler(() => this.handlers?.onActionExecuted?.({ action: actionIndex, chain: null, execution: result, tx: null }))
        return { tx: null, chain: null, immediateExecution: result, executable: null }
      } else {
        const errorMessage = result.output._DATA instanceof Error ? result.output._DATA.message : JSON.stringify(result.output._DATA)
        this.handlers?.onError?.({ message: errorMessage, result })
        return { tx: null, chain: null, immediateExecution: result, executable: null }
      }
    }

    const executable = await this.factory.createExecutable(warp, actionIndex, inputs, meta)

    if (action.when) {
      const shouldExecute = await this.evaluateWhenCondition(warp, action, inputs, meta, executable.resolvedInputs, executable.chain.name)
      if (!shouldExecute) {
        return { tx: null, chain: null, immediateExecution: null, executable: null }
      }
    }

    if (action.type === 'collect') {
      const result = await this.executeCollect(executable)
      if (result.status === 'success') {
        await this.callHandler(() => this.handlers?.onActionExecuted?.({ action: actionIndex, chain: null, execution: result, tx: null }))
        return { tx: null, chain: null, immediateExecution: result, executable }
      } else if (result.status === 'unhandled') {
        await this.callHandler(() => this.handlers?.onActionUnhandled?.({ action: actionIndex, chain: null, execution: result, tx: null }))
        return { tx: null, chain: null, immediateExecution: result, executable }
      } else {
        const errorMessage = result.output._DATA instanceof Error ? result.output._DATA.message : JSON.stringify(result.output._DATA)
        this.handlers?.onError?.({ message: errorMessage, result })
      }
      return { tx: null, chain: null, immediateExecution: null, executable }
    }

    if (action.type === 'mcp') {
      const result = await this.executeMcp(executable)
      if (result.status === 'success') {
        await this.callHandler(() => this.handlers?.onActionExecuted?.({ action: actionIndex, chain: null, execution: result, tx: null }))
        return { tx: null, chain: null, immediateExecution: result, executable }
      } else if (result.status === 'unhandled') {
        await this.callHandler(() => this.handlers?.onActionUnhandled?.({ action: actionIndex, chain: null, execution: result, tx: null }))
        return { tx: null, chain: null, immediateExecution: result, executable }
      } else {
        const errorMessage = result.output._DATA instanceof Error ? result.output._DATA.message : JSON.stringify(result.output._DATA)
        this.handlers?.onError?.({ message: errorMessage, result })
        return { tx: null, chain: null, immediateExecution: result, executable }
      }
    }

    const adapter = findWarpAdapterForChain(executable.chain.name, this.adapters)

    if (action.type === 'query') {
      const result = await adapter.executor.executeQuery(executable)
      if (result.status === 'success') {
        await this.callHandler(() =>
          this.handlers?.onActionExecuted?.({ action: actionIndex, chain: executable.chain, execution: result, tx: null })
        )
      } else {
        const errorMessage = result.output._DATA instanceof Error ? result.output._DATA.message : JSON.stringify(result.output._DATA)
        this.handlers?.onError?.({ message: errorMessage, result })
      }
      return { tx: null, chain: executable.chain, immediateExecution: result, executable }
    }

    const tx = await adapter.executor.createTransaction(executable)

    return { tx, chain: executable.chain, immediateExecution: null, executable }
  }

  async evaluateOutput(warp: Warp, actions: WarpChainAction[]): Promise<void> {
    if (actions.length === 0) return
    if (warp.actions.length === 0) return
    if (!this.handlers) return

    const chain = await this.factory.getChainInfoForWarp(warp)
    const adapter = findWarpAdapterForChain(chain.name, this.adapters)

    const outputs = (
      await Promise.all(
        warp.actions.map(async (action, index) => {
          if (!isWarpActionAutoExecute(action, warp)) return null
          if (action.type !== 'transfer' && action.type !== 'contract') return null
          const chainAction = actions[index]
          const currentActionIndex = index + 1

          if (!chainAction) {
            const resolvedInputs = this.factory.getResolvedInputsFromCache(this.config.env, warp.meta?.hash, currentActionIndex)

            const errorResult: WarpActionExecutionResult = {
              status: 'error',
              warp,
              action: currentActionIndex,
              user: getWarpWalletAddressFromConfig(this.config, chain.name),
              txHash: null,
              tx: null,
              next: null,
              values: { string: [], native: [], mapped: {} },
              output: {},
              messages: {},
              destination: null,
              resolvedInputs,
            }
            await this.callHandler(() =>
              this.handlers?.onError?.({ message: `Action ${currentActionIndex} failed: Transaction not found`, result: errorResult })
            )
            return errorResult
          }

          const result = await adapter.output.getActionExecution(warp, currentActionIndex, chainAction.tx)
          result.next = getNextInfo(this.config, this.adapters, warp, currentActionIndex, result.output)

          if (result.status === 'success') {
            await this.callHandler(() =>
              this.handlers?.onActionExecuted?.({
                action: currentActionIndex,
                chain: chain,
                execution: result,
                tx: chainAction,
              })
            )
          } else {
            await this.callHandler(() => this.handlers?.onError?.({ message: 'Action failed: ' + JSON.stringify(result.values), result }))
          }

          return result
        })
      )
    ).filter((r) => r !== null)

    if (outputs.every((r) => r.status === 'success')) {
      const lastOutput = outputs[outputs.length - 1]
      await this.callHandler(() => this.handlers?.onExecuted?.(lastOutput))
    } else {
      const result = outputs.find((r) => r.status !== 'success')!
      await this.callHandler(() => this.handlers?.onError?.({ message: `Warp failed: ${JSON.stringify(outputs)}`, result }))
    }
  }

  private async executeCollect(executable: WarpExecutable, extra?: Record<string, any>): Promise<WarpActionExecutionResult> {
    const wallet = getWarpWalletAddressFromConfig(this.config, executable.chain.name)
    const collectAction = getWarpActionByIndex(executable.warp, executable.action) as WarpCollectAction

    const serializer = this.factory.getSerializer()
    const payload = buildMappedOutput(executable.resolvedInputs, serializer)

    if (collectAction.destination && typeof collectAction.destination === 'object' && 'url' in collectAction.destination) {
      return await this.doHttpRequest(executable, collectAction.destination, wallet, payload, extra)
    }

    const { values, output } = await extractCollectOutput(
      executable.warp,
      payload,
      executable.action,
      executable.resolvedInputs,
      serializer,
      this.config
    )

    return this.buildCollectResult(executable, wallet, 'unhandled', values, output)
  }

  private async doHttpRequest(
    executable: WarpExecutable,
    destination: WarpCollectDestinationHttp,
    wallet: string | null,
    payload: any,
    extra: Record<string, any> | undefined
  ): Promise<WarpActionExecutionResult> {
    const interpolator = new WarpInterpolator(this.config, findWarpAdapterForChain(executable.chain.name, this.adapters), this.adapters)
    const serializer = this.factory.getSerializer()

    const { url, method, headers, body } = await buildHttpRequest(
      interpolator,
      destination,
      executable,
      wallet,
      payload,
      serializer,
      extra,
      async (params) => await this.callHandler(() => this.handlers?.onSignRequest?.(params))
    )

    WarpLogger.debug('WarpExecutor: Executing HTTP collect', { url, method, headers, body })

    try {
      const fetchOptions: RequestInit = { method, headers, body }
      let response = await fetch(url, fetchOptions)
      WarpLogger.debug('Collect response status', { status: response.status })

      if (response.status === 402) {
        response = await handleX402Payment(response, url, method, body, this.adapters)
      }

      const content = await response.json()
      WarpLogger.debug('Collect response content', { content })
      const { values, output } = await extractCollectOutput(
        executable.warp,
        content,
        executable.action,
        executable.resolvedInputs,
        this.factory.getSerializer(),
        this.config
      )

      return this.buildCollectResult(
        executable,
        getWarpWalletAddressFromConfig(this.config, executable.chain.name),
        response.ok ? 'success' : 'error',
        values,
        output,
        content
      )
    } catch (error) {
      WarpLogger.error('WarpActionExecutor: Error executing collect', error)
      const resolvedInputs = extractResolvedInputValues(executable.resolvedInputs)
      return {
        status: 'error',
        warp: executable.warp,
        action: executable.action,
        user: wallet,
        txHash: null,
        tx: null,
        next: null,
        values: { string: [], native: [], mapped: {} },
        output: { _DATA: error },
        messages: {},
        destination: this.getDestinationFromResolvedInputs(executable),
        resolvedInputs,
      }
    }
  }

  private getDestinationFromResolvedInputs(executable: WarpExecutable): string | null {
    const destinationInput = executable.resolvedInputs.find((i) => i.input.position === 'receiver' || i.input.position === 'destination')
    return destinationInput?.value || executable.destination
  }

  private async executeMcp(executable: WarpExecutable, extra?: Record<string, any>): Promise<WarpActionExecutionResult> {
    const wallet = getWarpWalletAddressFromConfig(this.config, executable.chain.name)
    const mcpAction = getWarpActionByIndex(executable.warp, executable.action) as WarpMcpAction

    if (!mcpAction.destination) {
      const resolvedInputs = extractResolvedInputValues(executable.resolvedInputs)
      return {
        status: 'error',
        warp: executable.warp,
        action: executable.action,
        user: wallet,
        txHash: null,
        tx: null,
        next: null,
        values: { string: [], native: [], mapped: {} },
        output: { _DATA: new Error('WarpExecutor: MCP action requires destination') },
        messages: {},
        destination: this.getDestinationFromResolvedInputs(executable),
        resolvedInputs,
      }
    }

    let Client: any
    let StreamableHTTPClientTransport: any
    try {
      const clientModule = await import('@modelcontextprotocol/sdk/client/index.js')
      Client = clientModule.Client
      const streamableHttp = await import('@modelcontextprotocol/sdk/client/streamableHttp.js')
      StreamableHTTPClientTransport = streamableHttp.StreamableHTTPClientTransport
    } catch (error) {
      const resolvedInputs = extractResolvedInputValues(executable.resolvedInputs)
      return {
        status: 'error',
        warp: executable.warp,
        action: executable.action,
        user: wallet,
        txHash: null,
        tx: null,
        next: null,
        values: { string: [], native: [], mapped: {} },
        output: { _DATA: new Error('Please install @modelcontextprotocol/sdk to execute MCP warps or mcp actions') },
        messages: {},
        destination: this.getDestinationFromResolvedInputs(executable),
        resolvedInputs,
      }
    }

    const serializer = this.factory.getSerializer()
    const interpolator = new WarpInterpolator(this.config, findWarpAdapterForChain(executable.chain.name, this.adapters), this.adapters)

    const destination = mcpAction.destination
    const url = interpolator.applyInputs(destination.url, executable.resolvedInputs, this.factory.getSerializer())
    const toolName = interpolator.applyInputs(destination.tool, executable.resolvedInputs, this.factory.getSerializer())

    const headers: Record<string, string> = {}
    if (destination.headers) {
      Object.entries(destination.headers).forEach(([key, value]) => {
        const interpolatedValue = interpolator.applyInputs(value as string, executable.resolvedInputs, this.factory.getSerializer())
        headers[key] = interpolatedValue
      })
    }

    WarpLogger.debug('WarpExecutor: Executing MCP', { url, tool: toolName, headers })

    try {
      const transport = new StreamableHTTPClientTransport(new URL(url), {
        requestInit: {
          headers,
        },
      })

      const client = new Client(
        {
          name: 'warps-mcp-client',
          version: '1.0.0',
        },
        {
          capabilities: {},
        }
      )

      await client.connect(transport)

      const toolArgs: Record<string, any> = {}

      executable.resolvedInputs.forEach(({ input, value }) => {
        if (value && input.position && typeof input.position === 'string' && input.position.startsWith('payload:')) {
          const key = input.position.replace('payload:', '')
          const [type, nativeValue] = serializer.stringToNative(value)

          if (type === 'string') {
            toolArgs[key] = String(nativeValue)
          } else if (type === 'bool') {
            toolArgs[key] = Boolean(nativeValue)
          } else if (
            type === 'uint8' ||
            type === 'uint16' ||
            type === 'uint32' ||
            type === 'uint64' ||
            type === 'uint128' ||
            type === 'uint256' ||
            type === 'biguint'
          ) {
            const numValue = typeof nativeValue === 'bigint' ? Number(nativeValue) : Number(nativeValue)
            toolArgs[key] = Number.isInteger(numValue) ? numValue : numValue
          } else {
            toolArgs[key] = nativeValue
          }
        }
      })

      if (extra) {
        Object.assign(toolArgs, extra)
      }

      const result = await client.callTool({
        name: toolName,
        arguments: toolArgs,
      })

      await client.close()

      let resultContent: any
      if (result.content && result.content.length > 0) {
        const firstContent = result.content[0]
        if (firstContent.type === 'text') {
          try {
            resultContent = JSON.parse(firstContent.text)
          } catch {
            resultContent = firstContent.text
          }
        } else if (firstContent.type === 'resource') {
          resultContent = firstContent
        } else {
          resultContent = firstContent
        }
      } else {
        resultContent = result
      }

      const { values, output } = await extractCollectOutput(
        executable.warp,
        resultContent,
        executable.action,
        executable.resolvedInputs,
        serializer,
        this.config
      )

      return this.buildCollectResult(executable, wallet, 'success', values, output, result)
    } catch (error) {
      WarpLogger.error('WarpExecutor: Error executing MCP', error)
      const resolvedInputs = extractResolvedInputValues(executable.resolvedInputs)
      return {
        status: 'error',
        warp: executable.warp,
        action: executable.action,
        user: wallet,
        txHash: null,
        tx: null,
        next: null,
        values: { string: [], native: [], mapped: {} },
        output: { _DATA: error },
        messages: {},
        destination: this.getDestinationFromResolvedInputs(executable),
        resolvedInputs,
      }
    }
  }

  private buildCollectResult(
    executable: WarpExecutable,
    wallet: string | null,
    status: 'success' | 'error' | 'unhandled',
    values: { string: string[]; native: any[]; mapped: Record<string, any> },
    output: any,
    rawData?: any
  ): WarpActionExecutionResult {
    const next = getNextInfo(this.config, this.adapters, executable.warp, executable.action, output)

    const resolvedInputs = extractResolvedInputValues(executable.resolvedInputs)
    return {
      status,
      warp: executable.warp,
      action: executable.action,
      user: wallet || getWarpWalletAddressFromConfig(this.config, executable.chain.name),
      txHash: null,
      tx: null,
      next,
      values,
      output: rawData ? { ...output, _DATA: rawData } : output,
      messages: applyOutputToMessages(executable.warp, output, this.config),
      destination: this.getDestinationFromResolvedInputs(executable),
      resolvedInputs,
    }
  }

  private async callHandler<T>(handler: (() => T | Promise<T>) | undefined): Promise<T | undefined> {
    if (!handler) return undefined
    return await handler()
  }

  private async executePrompt(
    warp: Warp,
    action: WarpPromptAction,
    actionIndex: number,
    inputs: string[],
    meta: { envs?: Record<string, any>; queries?: Record<string, any> } = {}
  ): Promise<WarpActionExecutionResult> {
    try {
      const chain = await this.factory.getChainInfoForWarp(warp, inputs)
      const adapter = findWarpAdapterForChain(chain.name, this.adapters)
      const interpolator = new WarpInterpolator(this.config, adapter, this.adapters)
      const preparedWarp = await interpolator.apply(warp, meta)
      const preparedAction = getWarpActionByIndex(preparedWarp, actionIndex) as WarpPromptAction

      const { action: primaryAction } = getWarpPrimaryAction(preparedWarp)
      const primaryTypedInputs = this.factory.getStringTypedInputs(primaryAction, inputs)
      const primaryResolved = await this.factory.getResolvedInputs(chain.name, primaryAction, primaryTypedInputs, interpolator, meta.queries)
      const primaryResolvedInputs = await this.factory.getModifiedInputs(primaryResolved)

      let resolvedInputs: ResolvedInput[] = primaryResolvedInputs
      if (action.inputs && action.inputs.length > 0) {
        const actionTypedInputs = this.factory.getStringTypedInputs(action, inputs)
        const actionResolved = await this.factory.getResolvedInputs(chain.name, action, actionTypedInputs, interpolator, meta.queries)
        resolvedInputs = await this.factory.getModifiedInputs(actionResolved)
      }

      const interpolatedPrompt = interpolator.applyInputs(
        preparedAction.prompt,
        resolvedInputs,
        this.factory.getSerializer(),
        primaryResolvedInputs
      )

      const extractedInputs = extractResolvedInputValues(resolvedInputs)
      const wallet = getWarpWalletAddressFromConfig(this.config, chain.name)
      const serializer = this.factory.getSerializer()

      const { values, output } = await extractPromptOutput(
        preparedWarp,
        interpolatedPrompt,
        actionIndex,
        resolvedInputs,
        serializer,
        this.config
      )

      return {
        status: 'success',
        warp: preparedWarp,
        action: actionIndex,
        user: wallet,
        txHash: null,
        tx: null,
        next: getNextInfo(this.config, this.adapters, preparedWarp, actionIndex, output),
        values,
        output,
        messages: applyOutputToMessages(preparedWarp, output, this.config),
        destination: null,
        resolvedInputs: extractedInputs,
      }
    } catch (error) {
      WarpLogger.error('WarpExecutor: Error executing prompt action', error)
      return {
        status: 'error',
        warp,
        action: actionIndex,
        user: null,
        txHash: null,
        tx: null,
        next: null,
        values: { string: [], native: [], mapped: {} },
        output: { _DATA: error },
        messages: {},
        destination: null,
        resolvedInputs: [],
      }
    }
  }

  private async evaluateWhenCondition(
    warp: Warp,
    action: WarpAction,
    inputs: string[],
    meta: { envs?: Record<string, any>; queries?: Record<string, any> },
    resolvedInputs?: ResolvedInput[],
    chainName?: string
  ): Promise<boolean> {
    if (!action.when) return true

    const chain = chainName ? ({ name: chainName } as WarpChainInfo) : await this.factory.getChainInfoForWarp(warp, inputs)
    const adapter = findWarpAdapterForChain(chain.name, this.adapters)
    const interpolator = new WarpInterpolator(this.config, adapter, this.adapters)
    const { action: primaryAction } = getWarpPrimaryAction(warp)
    const primaryTypedInputs = this.factory.getStringTypedInputs(primaryAction, inputs)
    const primaryResolved = await this.factory.getResolvedInputs(chain.name, primaryAction, primaryTypedInputs, interpolator, meta.queries)
    const primaryResolvedInputs = await this.factory.getModifiedInputs(primaryResolved)

    let actionResolvedInputs: ResolvedInput[]
    if (resolvedInputs) {
      actionResolvedInputs = resolvedInputs
    } else {
      const actionResolved = await this.factory.getResolvedInputs(
        chain.name,
        action,
        this.factory.getStringTypedInputs(action, inputs),
        interpolator,
        meta.queries
      )
      actionResolvedInputs = await this.factory.getModifiedInputs(actionResolved)
    }

    const bag = interpolator.buildInputBag(actionResolvedInputs, this.factory.getSerializer(), primaryResolvedInputs)
    const interpolatedWhen = replacePlaceholdersInWhenExpression(action.when, bag)
    return evaluateWhenCondition(interpolatedWhen)
  }
}
