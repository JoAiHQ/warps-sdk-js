import { SuiClient } from '@mysten/sui/client'
import {
  AdapterWarpOutput,
  applyOutputToMessages,
  evaluateOutputCommon,
  getNextInfo,
  getProviderConfig,
  getWarpWalletAddressFromConfig,
  parseOutputOutIndex,
  ResolvedInput,
  Warp,
  WarpActionExecutionResult,
  WarpActionIndex,
  WarpAdapterGenericRemoteTransaction,
  WarpChainInfo,
  WarpClientConfig,
  WarpConstants,
  WarpExecutionOutput,
} from '@joai/warps'
import { WarpSuiSerializer } from './WarpSuiSerializer'

export class WarpSuiOutput implements AdapterWarpOutput {
  private readonly serializer: WarpSuiSerializer
  private readonly client: SuiClient

  constructor(
    private readonly config: WarpClientConfig,
    private readonly chain: WarpChainInfo
  ) {
    this.serializer = new WarpSuiSerializer()
    const providerConfig = getProviderConfig(this.config, this.chain.name, this.config.env, this.chain.defaultApiUrl)
    this.client = new SuiClient({ url: providerConfig.url })
  }

  async getActionExecution(
    warp: Warp,
    actionIndex: WarpActionIndex,
    tx: WarpAdapterGenericRemoteTransaction
  ): Promise<WarpActionExecutionResult> {
    const output = await this.extractContractOutput(warp, actionIndex, tx, [])
    const next = getNextInfo(this.config, [], warp, actionIndex, output.output)
    const messages = applyOutputToMessages(warp, output.output, this.config)
    return {
      status: tx.effects?.status?.status === 'success' ? 'success' : 'error',
      warp,
      action: actionIndex,
      user: getWarpWalletAddressFromConfig(this.config, this.chain.name),
      txHash: tx.digest,
      tx,
      next,
      values: output.values,
      output: output.output,
      messages,
      destination: null,
      resolvedInputs: [] as string[],
    }
  }

  async extractContractOutput(
    warp: Warp,
    actionIndex: WarpActionIndex,
    tx: any,
    inputs: ResolvedInput[]
  ): Promise<{ values: { string: string[]; native: any[]; mapped: Record<string, any> }; output: WarpExecutionOutput }> {
    // SUI: extract results from tx effects or return values
    let stringValues: string[] = []
    let nativeValues: any[] = []
    let output: WarpExecutionOutput = {}
    if (!warp.output) return { values: { string: stringValues, native: nativeValues, mapped: {} }, output }
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
      // SUI: support extracting from tx return values or events
      if (resultPath.startsWith('out.')) {
        // For SUI, use tx.effects?.events or tx.returnValues
        const nativeValue = tx.returnValues ? tx.returnValues[resultName] : null
        output[resultName] = nativeValue
        stringValues.push(String(nativeValue))
        nativeValues.push(nativeValue)
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
    typedValues: any[],
    actionIndex: number,
    inputs: ResolvedInput[]
  ): Promise<{ values: { string: string[]; native: any[]; mapped: Record<string, any> }; output: WarpExecutionOutput }> {
    // SUI: typedValues are direct query results
    const stringValues = typedValues.map((native) => String(native))
    const nativeValues = typedValues
    const values = { string: stringValues, native: nativeValues, mapped: {} }
    let output: WarpExecutionOutput = {}
    if (!warp.output) return { values, output }
    for (const [key, path] of Object.entries(warp.output)) {
      if (path.startsWith(WarpConstants.Transform.Prefix)) continue
      const currentActionIndex = parseOutputOutIndex(path)
      if (currentActionIndex !== null && currentActionIndex !== actionIndex) {
        output[key] = null
        continue
      }
      if (path.startsWith('out.') || path === 'out') {
        // If values is an array of objects, extract the property
        if (Array.isArray(typedValues) && typedValues.length > 0 && typeof typedValues[0] === 'object' && typedValues[0] !== null) {
          const prop = path.replace(/^out\./, '')
          output[key] = typedValues[0][prop]
        } else {
          output[key] = typedValues[0]
        }
      } else {
        output[key] = path
      }
    }
    return { values, output: await evaluateOutputCommon(warp, output, nativeValues, actionIndex, inputs, this.serializer.coreSerializer, this.config) }
  }
}
