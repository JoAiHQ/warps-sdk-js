import {
  AdapterTypeRegistry,
  AdapterWarpOutput,
  applyOutputToMessages,
  evaluateOutputCommon,
  extractResolvedInputValues,
  getWarpActionByIndex,
  getWarpWalletAddressFromConfig,
  parseOutputOutIndex,
  ResolvedInput,
  Warp,
  WarpActionExecutionResult,
  WarpActionIndex,
  WarpAdapterGenericRemoteTransaction,
  WarpCache,
  WarpCacheKey,
  WarpChainInfo,
  WarpClientConfig,
  WarpConstants,
  WarpContractAction,
  WarpExecutionOutput,
} from '@joai/warps'
import {
  findEventsByFirstTopic,
  SmartContractTransactionsOutcomeParser,
  TransactionEventsParser,
  TransactionOnNetwork,
  TypedValue,
} from '@multiversx/sdk-core'
import { WarpMultiversxAbiBuilder } from './WarpMultiversxAbiBuilder'
import { WarpMultiversxSerializer } from './WarpMultiversxSerializer'

export class WarpMultiversxOutput implements AdapterWarpOutput {
  private readonly abi: WarpMultiversxAbiBuilder
  private readonly serializer: WarpMultiversxSerializer
  private readonly cache: WarpCache

  constructor(
    private readonly config: WarpClientConfig,
    private readonly chain: WarpChainInfo,
    private readonly typeRegistry: AdapterTypeRegistry
  ) {
    this.abi = new WarpMultiversxAbiBuilder(config, chain)
    this.serializer = new WarpMultiversxSerializer({ typeRegistry: this.typeRegistry })
    this.cache = new WarpCache(config.env, config.cache)
  }

  async getActionExecution(
    warp: Warp,
    actionIndex: WarpActionIndex,
    tx: WarpAdapterGenericRemoteTransaction
  ): Promise<WarpActionExecutionResult> {
    // Restore inputs via cache as transactions are broadcasted and processed asynchronously
    const inputs: ResolvedInput[] = this.cache.get(WarpCacheKey.WarpExecutable(this.config.env, warp.meta?.hash || '', actionIndex)) ?? []

    const output = await this.extractContractOutput(warp, actionIndex, tx, inputs)
    const messages = applyOutputToMessages(warp, output.output, this.config)

    const resolvedInputs = extractResolvedInputValues(inputs)
    return {
      status: tx.status?.isSuccessful?.() ? 'success' : 'error',
      warp,
      action: actionIndex,
      user: getWarpWalletAddressFromConfig(this.config, this.chain.name),
      txHash: tx.hash,
      tx,
      next: null,
      values: output.values,
      output: output.output,
      messages,
      destination: null,
      resolvedInputs,
    }
  }

  async extractContractOutput(
    warp: Warp,
    actionIndex: WarpActionIndex,
    tx: TransactionOnNetwork,
    inputs: ResolvedInput[]
  ): Promise<{ values: { string: string[]; native: any[]; mapped: Record<string, any> }; output: WarpExecutionOutput }> {
    const action = getWarpActionByIndex(warp, actionIndex) as WarpContractAction
    let stringValues: string[] = []
    let nativeValues: any[] = []
    let output: WarpExecutionOutput = {}
    if (!warp.output || action.type !== 'contract') {
      return { values: { string: stringValues, native: nativeValues, mapped: {} }, output }
    }
    const needsAbi = Object.values(warp.output).some((resultPath) => resultPath.includes('out') || resultPath.includes('event'))
    if (!needsAbi) {
      for (const [resultName, resultPath] of Object.entries(warp.output)) {
        output[resultName] = resultPath
      }
      return {
        values: { string: stringValues, native: nativeValues, mapped: {} },
        output: await evaluateOutputCommon(warp, output, nativeValues, actionIndex, inputs, this.serializer.coreSerializer, this.config),
      }
    }
    const abi = await this.abi.getAbiForAction(action)
    const eventParser = new TransactionEventsParser({ abi })
    const outcomeParser = new SmartContractTransactionsOutcomeParser({ abi })

    // Lazy: only call parseExecute when an `out.` mapping is actually needed.
    // This avoids crashing on transactions with multiple writeLog events (e.g. DEX swaps)
    // when the warp only uses event-based output mappings.
    let outcome: ReturnType<SmartContractTransactionsOutcomeParser['parseExecute']> | null = null
    let outcomeParsed = false
    const getOutcome = () => {
      if (outcomeParsed) return outcome
      outcomeParsed = true
      outcome = outcomeParser.parseExecute({ transactionOnNetwork: tx, function: action.func || undefined })
      return outcome
    }
    for (const [resultName, resultPath] of Object.entries(warp.output)) {
      if (resultPath.startsWith(WarpConstants.Transform.Prefix)) continue
      if (resultPath.startsWith('input.')) {
        output[resultName] = resultPath
        continue
      }
      const currentActionIndex = parseOutputOutIndex(resultPath)
      if (currentActionIndex !== null && currentActionIndex !== actionIndex) {
        output[resultName] = null
        continue
      }
      const [resultType, partOne, partTwo, partThree] = resultPath.split('.')
      if (resultType === 'event') {
        if (!partOne || isNaN(Number(partTwo))) continue
        const topicPosition = Number(partTwo)
        const events = findEventsByFirstTopic(tx, partOne)
        const outcome = eventParser.parseEvents({ events })[0]
        if (!outcome || typeof outcome !== 'object') {
          output[resultName] = null
          continue
        }
        let outcomeAtPosition = (Object.values(outcome)[topicPosition] || null) as any
        if (outcomeAtPosition && partThree && typeof outcomeAtPosition === 'object') {
          outcomeAtPosition = outcomeAtPosition[partThree] ?? null
        }
        if (outcomeAtPosition && typeof outcomeAtPosition === 'object') {
          outcomeAtPosition = 'toFixed' in outcomeAtPosition ? outcomeAtPosition.toFixed() : outcomeAtPosition.valueOf()
        }
        stringValues.push(String(outcomeAtPosition))
        nativeValues.push(outcomeAtPosition)
        output[resultName] = outcomeAtPosition ? outcomeAtPosition.valueOf() : outcomeAtPosition
      } else if (resultType === 'out' || resultType.startsWith('out[')) {
        if (!partOne) continue
        const parsedOutcome = getOutcome()!
        const outputIndex = Number(partOne)
        let outputAtPosition = parsedOutcome.values[outputIndex - 1] || null
        if (partTwo) {
          outputAtPosition = outputAtPosition[partTwo] || null
        }
        if (outputAtPosition && typeof outputAtPosition === 'object') {
          outputAtPosition = 'toFixed' in outputAtPosition ? outputAtPosition.toFixed() : outputAtPosition.valueOf()
        }
        stringValues.push(String(outputAtPosition))
        nativeValues.push(outputAtPosition)
        output[resultName] = outputAtPosition ? outputAtPosition.valueOf() : outputAtPosition
      } else {
        output[resultName] = resultPath
      }
    }
    return {
      values: { string: stringValues, native: nativeValues, mapped: {} },
      output: await evaluateOutputCommon(warp, output, nativeValues, actionIndex, inputs, this.serializer.coreSerializer, this.config),
    }
  }

  async extractQueryOutput(
    warp: Warp,
    typedValues: TypedValue[],
    actionIndex: number,
    inputs: ResolvedInput[]
  ): Promise<{ values: { string: string[]; native: any[]; mapped: Record<string, any> }; output: WarpExecutionOutput }> {
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
      let value: any = nativeValues[indices[0]]
      for (let i = 1; i < indices.length; i++) {
        if (value === undefined || value === null) return undefined
        value = value[indices[i]]
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

    output = await evaluateOutputCommon(warp, output, nativeValues, actionIndex, inputs, this.serializer.coreSerializer, this.config)

    return { values, output }
  }

  async resolveWarpOutputRecursively(props: {
    warp: Warp
    entryActionIndex: number
    executor: { executeQuery: Function; executeCollect: Function }
    inputs: ResolvedInput[]
    meta?: Record<string, any>
  }): Promise<any> {
    const warp = props.warp
    const entryActionIndex = props.entryActionIndex
    const executor = props.executor
    const inputs = props.inputs
    const meta = props.meta
    const outputCache: Map<number, any> = new Map()
    const resolving: Set<number> = new Set()
    const self = this
    async function resolveAction(actionIndex: number, actionInputs: ResolvedInput[] = []): Promise<any> {
      if (outputCache.has(actionIndex)) return outputCache.get(actionIndex)
      if (resolving.has(actionIndex)) throw new Error(`Circular dependency detected at action ${actionIndex}`)
      resolving.add(actionIndex)
      const action = warp.actions[actionIndex - 1]
      if (!action) throw new Error(`Action ${actionIndex} not found`)
      let execution: any
      if (action.type === 'query') {
        execution = await executor.executeQuery(warp, actionIndex, actionInputs)
      } else if (action.type === 'collect') {
        execution = await executor.executeCollect(warp, actionIndex, actionInputs, meta)
      } else {
        throw new Error(`Unsupported or interactive action type: ${action.type}`)
      }
      outputCache.set(actionIndex, execution)
      if (warp.output) {
        for (const pathRaw of Object.values(warp.output)) {
          const path = String(pathRaw)
          const outIndexMatch = path.match(/^out\[(\d+)\]/)
          if (outIndexMatch) {
            const depIndex = parseInt(outIndexMatch[1], 10)
            if (depIndex !== actionIndex && !outputCache.has(depIndex)) {
              await resolveAction(depIndex)
            }
          }
        }
      }
      resolving.delete(actionIndex)
      return execution
    }
    await resolveAction(entryActionIndex, inputs)
    const combinedOutput: Record<string, any> = {}
    for (const exec of outputCache.values()) {
      for (const [key, value] of Object.entries(exec.output)) {
        if (value !== null) {
          combinedOutput[key] = value
        } else if (!(key in combinedOutput)) {
          combinedOutput[key] = null
        }
      }
    }
    const finalOutput = await evaluateOutputCommon(
      warp,
      combinedOutput,
      combinedOutput,
      entryActionIndex,
      inputs,
      this.serializer.coreSerializer,
      this.config
    )
    const entryExecution = outputCache.get(entryActionIndex)
    return {
      ...entryExecution,
      action: entryActionIndex,
      output: finalOutput,
    }
  }
}
