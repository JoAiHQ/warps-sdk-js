import { WarpChainName, WarpConstants } from './constants'
import { findWarpAdapterForChain, getWarpActionByIndex, getWarpPrimaryAction, shiftBigintBy, splitInput } from './helpers'
import { extractResolvedInputValues } from './helpers/payload'
import { getWarpWalletAddressFromConfig } from './helpers/wallet'
import {
  ChainAdapter,
  ResolvedInput,
  Warp,
  WarpAction,
  WarpActionInput,
  WarpChainAssetValue,
  WarpChainEnv,
  WarpChainInfo,
  WarpClientConfig,
  WarpCollectAction,
  WarpContractAction,
  WarpExecutable,
  WarpMcpAction,
  WarpTransferAction,
} from './types'
import { asset } from './utils.codec'
import { CacheTtl, WarpCache, WarpCacheKey } from './WarpCache'
import { WarpInterpolator } from './WarpInterpolator'
import { WarpLogger } from './WarpLogger'
import { WarpSerializer } from './WarpSerializer'

export class WarpFactory {
  private url: URL
  private serializer: WarpSerializer
  private cache: WarpCache

  constructor(
    private config: WarpClientConfig,
    private adapters: ChainAdapter[]
  ) {
    if (!config.currentUrl) throw new Error('WarpFactory: currentUrl config not set')
    this.url = new URL(config.currentUrl)
    this.serializer = new WarpSerializer()
    this.cache = new WarpCache(config.env, config.cache)
  }

  getSerializer(): WarpSerializer {
    return this.serializer
  }

  getResolvedInputsFromCache(env: WarpChainEnv, warpHash: string | undefined, actionIndex: number): string[] {
    const cachedInputs = this.cache.get<ResolvedInput[]>(WarpCacheKey.WarpExecutable(env, warpHash || '', actionIndex)) || []
    return extractResolvedInputValues(cachedInputs)
  }

  async createExecutable(
    warp: Warp,
    actionIndex: number,
    inputs: string[],
    meta: { envs?: Record<string, any>; queries?: Record<string, any> } = {}
  ): Promise<WarpExecutable> {
    const action = getWarpActionByIndex(warp, actionIndex) as WarpTransferAction | WarpContractAction | WarpCollectAction | WarpMcpAction
    if (!action) throw new Error('WarpFactory: Action not found')
    const chain = await this.getChainInfoForWarp(warp, inputs)
    const adapter = findWarpAdapterForChain(chain.name, this.adapters)
    const interpolator = new WarpInterpolator(this.config, adapter, this.adapters)
    const preparedWarp = await interpolator.apply(warp, meta)
    const preparedAction = getWarpActionByIndex(preparedWarp, actionIndex) as
      | WarpTransferAction
      | WarpContractAction
      | WarpCollectAction
      | WarpMcpAction

    const { action: primaryAction, index: primaryIndex } = getWarpPrimaryAction(preparedWarp)
    const primaryTypedInputs = this.getStringTypedInputs(primaryAction, inputs)
    const primaryResolved = await this.getResolvedInputs(chain.name, primaryAction, primaryTypedInputs, interpolator)
    const primaryResolvedInputs = await this.getModifiedInputs(primaryResolved)

    let resolvedInputs: ResolvedInput[] = []
    let modifiedInputs: ResolvedInput[] = []
    if (primaryIndex === actionIndex - 1) {
      // Reuse primary action's resolved inputs for chained actions
      resolvedInputs = primaryResolved
      modifiedInputs = primaryResolvedInputs
    } else if (this.requiresPayloadInputs(preparedAction)) {
      // Actions with payload: positions need their own inputs resolved
      resolvedInputs = await this.resolveActionInputs(chain.name, preparedAction, inputs, interpolator)
      modifiedInputs = await this.getModifiedInputs(resolvedInputs)
    }

    const destinationInput = modifiedInputs.find((i) => i.input.position === 'receiver' || i.input.position === 'destination')?.value
    const destinationInAction = this.getDestinationFromAction(preparedAction)
    let destination = destinationInput ? (this.serializer.stringToNative(destinationInput)[1] as string) : destinationInAction
    if (destination) destination = interpolator.applyInputs(destination, modifiedInputs, this.serializer, primaryResolvedInputs)
    if (!destination && action.type !== 'collect' && action.type !== 'mcp')
      throw new Error('WarpActionExecutor: Destination/Receiver not provided')

    let args = this.getPreparedArgs(preparedAction, modifiedInputs)
    args = args.map((arg) => interpolator.applyInputs(arg, modifiedInputs, this.serializer, primaryResolvedInputs))

    const valueInput = modifiedInputs.find((i) => i.input.position === 'value')?.value || null
    const valueInAction = 'value' in preparedAction ? preparedAction.value : null
    const valueString = valueInput?.split(WarpConstants.ArgParamsSeparator)[1] || valueInAction || '0'
    const interpolatedValueString = interpolator.applyInputs(valueString, modifiedInputs, this.serializer, primaryResolvedInputs)
    let value = BigInt(interpolatedValueString)

    const transferInputs = modifiedInputs.filter((i) => i.input.position === 'transfer' && i.value).map((i) => i.value) as string[]
    const transfersInAction = 'transfers' in preparedAction ? preparedAction.transfers : []
    const transfersMerged = [...(transfersInAction || []), ...(transferInputs || [])]
    const transfers = transfersMerged.map((t) => {
      const interpolated = interpolator.applyInputs(t, modifiedInputs, this.serializer, primaryResolvedInputs)
      return this.serializer.stringToNative(interpolated)[1]
    }) as WarpChainAssetValue[]

    const dataInput = modifiedInputs.find((i) => i.input.position === 'data')?.value
    const dataInAction = 'data' in preparedAction ? preparedAction.data || '' : null
    const dataString = dataInput || dataInAction || null
    const data = dataString ? interpolator.applyInputs(dataString, modifiedInputs, this.serializer, primaryResolvedInputs) : null

    const executable: WarpExecutable = {
      adapter,
      warp: preparedWarp,
      chain,
      action: actionIndex,
      destination,
      args,
      value,
      transfers,
      data,
      resolvedInputs: modifiedInputs,
    }

    this.cache.set(
      WarpCacheKey.WarpExecutable(this.config.env, preparedWarp.meta?.hash || '', actionIndex),
      executable.resolvedInputs,
      CacheTtl.OneWeek
    )

    return executable
  }

  async getChainInfoForWarp(warp: Warp, inputs?: string[]): Promise<WarpChainInfo> {
    if (warp.chain) {
      const adapter = findWarpAdapterForChain(warp.chain, this.adapters)
      return adapter.chainInfo
    }

    if (inputs) {
      const chainFromInputs = await this.tryGetChainFromInputs(warp, inputs)
      if (chainFromInputs) return chainFromInputs
    }

    // Finally use default adapter
    const defaultAdapter = this.adapters[0]
    return defaultAdapter.chainInfo
  }

  public getStringTypedInputs(action: WarpAction, inputs: string[]): string[] {
    const actionInputs = action.inputs || []

    return inputs.map((input, index) => {
      const actionInput = actionInputs[index]
      if (!actionInput) return input
      if (input.includes(WarpConstants.ArgParamsSeparator)) return input
      return this.serializer.nativeToString(actionInput.type, input)
    })
  }

  public async getResolvedInputs(
    chain: WarpChainName,
    action: WarpAction,
    inputArgs: string[],
    interpolator: WarpInterpolator
  ): Promise<ResolvedInput[]> {
    const argInputs = action.inputs || []
    const interpolatedArgs = inputArgs.map((arg) => interpolator.applyInputs(arg, [], this.serializer))
    const preprocessed = await Promise.all(interpolatedArgs.map((arg) => this.preprocessInput(chain, arg)))

    const toValueByType = (input: WarpActionInput, index: number) => {
      if (input.source === WarpConstants.Source.UserWallet) {
        const wallet = getWarpWalletAddressFromConfig(this.config, chain)
        return wallet ? this.serializer.nativeToString('address', wallet) : null
      }

      if (input.source === 'hidden') {
        if (input.default === undefined) return null
        const defaultValue = interpolator ? interpolator.applyInputs(String(input.default), [], this.serializer) : String(input.default)
        return this.serializer.nativeToString(input.type, defaultValue)
      }

      if (preprocessed[index]) return preprocessed[index]
      const queryValue = this.url.searchParams.get(input.as || input.name)
      return queryValue ? this.serializer.nativeToString(input.type, queryValue) : null
    }

    return argInputs.map((input: WarpActionInput, index: number) => {
      const value = toValueByType(input, index)
      const fallbackDefault =
        input.default !== undefined
          ? interpolator
            ? interpolator.applyInputs(String(input.default), [], this.serializer)
            : String(input.default)
          : undefined
      return {
        input,
        value: value || (fallbackDefault !== undefined ? this.serializer.nativeToString(input.type, fallbackDefault) : null),
      }
    })
  }

  private requiresPayloadInputs(action: WarpAction): boolean {
    return action.inputs?.some((input) => typeof input.position === 'string' && input.position.startsWith('payload:')) ?? false
  }

  private async resolveActionInputs(
    chainName: WarpChainName,
    action: WarpAction,
    inputs: string[],
    interpolator: WarpInterpolator
  ): Promise<ResolvedInput[]> {
    const actionTypedInputs = this.getStringTypedInputs(action, inputs)
    return await this.getResolvedInputs(chainName, action, actionTypedInputs, interpolator)
  }

  public async getModifiedInputs(inputs: ResolvedInput[]): Promise<ResolvedInput[]> {
    // Note: 'scale' modifier means that the value is multiplied by 10^modifier; the modifier can also be the name of another input field
    // Example: 'scale:10' means that the value is multiplied by 10^10
    // Example 2: 'scale:{amount}' means that the value is multiplied by the value of the 'amount' input field
    // Note: 'transform' modifier allows transforming the value using a transform runner
    // Example: 'transform:() => inputs.asset.includes("ETH") ? "0x0000000000000000000000000000000000000000" : inputs.asset'

    const results: ResolvedInput[] = []

    for (let index = 0; index < inputs.length; index++) {
      const resolved = inputs[index]

      if (resolved.input.modifier?.startsWith('scale:')) {
        const [, exponent] = resolved.input.modifier.split(':')
        if (isNaN(Number(exponent))) {
          // Scale by another input field
          const exponentVal = Number(inputs.find((i) => i.input.name === exponent)?.value?.split(':')[1])
          if (!exponentVal) throw new Error(`WarpActionExecutor: Exponent value not found for input ${exponent}`)
          const scalableVal = resolved.value?.split(':')[1]
          if (!scalableVal) throw new Error('WarpActionExecutor: Scalable value not found')
          const scaledVal = shiftBigintBy(scalableVal, +exponentVal)
          results.push({ ...resolved, value: `${resolved.input.type}:${scaledVal}` })
        } else {
          // Scale by fixed amount
          const scalableVal = resolved.value?.split(':')[1]
          if (!scalableVal) throw new Error('WarpActionExecutor: Scalable value not found')
          const scaledVal = shiftBigintBy(scalableVal, +exponent)
          results.push({ ...resolved, value: `${resolved.input.type}:${scaledVal}` })
        }
      } else if (resolved.input.modifier?.startsWith(WarpConstants.Transform.Prefix)) {
        const code = resolved.input.modifier.substring(WarpConstants.Transform.Prefix.length)
        const transformRunner = this.config.transform?.runner

        if (!transformRunner || typeof transformRunner.run !== 'function') {
          throw new Error(
            'Transform modifier is defined but no transform runner is configured. Provide a runner via config.transform.runner.'
          )
        }

        const inputsContext = this.buildInputContext(inputs, index, resolved)
        const transformedValue = await transformRunner.run(code, inputsContext)

        if (transformedValue === null || transformedValue === undefined) {
          results.push(resolved)
        } else {
          const transformedString = this.serializer.nativeToString(resolved.input.type, transformedValue)
          results.push({ ...resolved, value: transformedString })
        }
      } else {
        results.push(resolved)
      }
    }

    return results
  }

  /**
   * Builds a context object containing all previous evaluated inputs for use in transform modifiers.
   *
   * The context object provides access to inputs by their `as` field (if present) or `name` field.
   * For asset-type inputs, additional properties are available:
   * - `{key}` - The full asset object with `identifier` and `amount` properties
   * - `{key}.token` - The asset identifier as a string
   * - `{key}.amount` - The asset amount as a string
   * - `{key}.identifier` - Alias for `{key}.token`
   *
   * @example
   * // Given inputs:
   * // - { name: 'Asset', as: 'asset', type: 'asset', value: 'asset:ETH|1000000000000000000' }
   * // - { name: 'Amount', type: 'uint256', value: 'uint256:500' }
   *
   * // The context will be:
   * {
   *   asset: { identifier: 'ETH', amount: 1000000000000000000n },
   *   'asset.token': 'ETH',
   *   'asset.amount': '1000000000000000000',
   *   'asset.identifier': 'ETH',
   *   Amount: 500n
   * }
   *
   * // Usage in transform modifier:
   * // "modifier": "transform:(inputs) => inputs.asset?.identifier === 'ETH' ? {...} : inputs.asset"
   *
   * @param inputs - Array of all resolved inputs
   * @param currentIndex - Index of the current input being processed
   * @param currentInput - The current input being transformed (optional, included in context)
   * @returns Context object with all previous inputs accessible by name/as
   */
  private buildInputContext(inputs: ResolvedInput[], currentIndex: number, currentInput?: ResolvedInput): Record<string, any> {
    const inputsObj: Record<string, any> = {}

    for (let i = 0; i < currentIndex; i++) {
      const resolvedInput = inputs[i]
      if (!resolvedInput.value) continue

      const key = resolvedInput.input.as || resolvedInput.input.name
      const [, nativeValue] = this.serializer.stringToNative(resolvedInput.value)
      inputsObj[key] = nativeValue

      if (resolvedInput.input.type === 'asset' && typeof nativeValue === 'object' && nativeValue !== null) {
        const asset = nativeValue as { identifier?: string; amount?: bigint }
        if ('identifier' in asset && 'amount' in asset) {
          inputsObj[`${key}.token`] = String(asset.identifier)
          inputsObj[`${key}.amount`] = String(asset.amount)
          inputsObj[`${key}.identifier`] = String(asset.identifier)
        }
      }
    }

    if (currentInput && currentInput.value) {
      const key = currentInput.input.as || currentInput.input.name
      const [, nativeValue] = this.serializer.stringToNative(currentInput.value)
      inputsObj[key] = nativeValue

      if (currentInput.input.type === 'asset' && typeof nativeValue === 'object' && nativeValue !== null) {
        const asset = nativeValue as { identifier?: string; amount?: bigint }
        if ('identifier' in asset && 'amount' in asset) {
          inputsObj[`${key}.token`] = String(asset.identifier)
          inputsObj[`${key}.amount`] = String(asset.amount)
          inputsObj[`${key}.identifier`] = String(asset.identifier)
        }
      }
    }

    return inputsObj
  }

  public async preprocessInput(chain: WarpChainName, input: string): Promise<string> {
    try {
      const [type, value] = splitInput(input)
      const adapter = findWarpAdapterForChain(chain, this.adapters)

      if (type === 'asset') {
        const [assetId, amount, existingDecimals] = value.split(WarpConstants.ArgCompositeSeparator)
        if (existingDecimals) return input
        const chainAsset = await adapter.dataLoader.getAsset(assetId)
        if (!chainAsset) throw new Error(`WarpFactory: Asset not found for asset ${assetId}`)
        if (typeof chainAsset.decimals !== 'number') throw new Error(`WarpFactory: Decimals not found for asset ${assetId}`)
        const amountBig = shiftBigintBy(amount, chainAsset.decimals)
        return asset({ ...chainAsset, amount: amountBig })
      } else {
        return input
      }
    } catch (e) {
      WarpLogger.warn('WarpFactory: Preprocess input failed', e)
      throw e
    }
  }

  private getDestinationFromAction(action: WarpAction): string | null {
    if ('address' in action && action.address) return action.address
    if ('destination' in action && action.destination) {
      if (typeof action.destination === 'string') return action.destination
      if (typeof action.destination === 'object' && 'url' in action.destination) return action.destination.url
    }
    return null
  }

  private getPreparedArgs(action: WarpAction, resolvedInputs: ResolvedInput[]): string[] {
    let args = 'args' in action ? action.args || [] : []
    const inserts: Array<{ index: number; value: string }> = []

    resolvedInputs.forEach(({ input, value }) => {
      if (!value || !input.position) return

      if (typeof input.position === 'object') {
        if (input.type !== 'asset') {
          throw new Error(`WarpFactory: Object position is only supported for asset type. Input "${input.name}" has type "${input.type}"`)
        }
        if (!input.position.token?.startsWith('arg:') || !input.position.amount?.startsWith('arg:')) {
          throw new Error(`WarpFactory: Object position must have token and amount as arg:N. Input "${input.name}"`)
        }

        const [_, assetValue] = this.serializer.stringToNative(value)
        const asset = assetValue as WarpChainAssetValue
        if (!asset || typeof asset !== 'object' || !('identifier' in asset) || !('amount' in asset)) {
          throw new Error(`WarpFactory: Invalid asset value for input "${input.name}"`)
        }

        const tokenIndex = Number(input.position.token.split(':')[1]) - 1
        const amountIndex = Number(input.position.amount.split(':')[1]) - 1

        inserts.push({ index: tokenIndex, value: this.serializer.nativeToString('address', asset.identifier) })
        inserts.push({ index: amountIndex, value: this.serializer.nativeToString('uint256', asset.amount) })
      } else if (input.position.startsWith('arg:')) {
        const argIndex = Number(input.position.split(':')[1]) - 1
        inserts.push({ index: argIndex, value })
      }
    })

    inserts.forEach(({ index, value }) => {
      while (args.length <= index) {
        args.push(undefined as any)
      }
      args[index] = value
    })

    return args.filter((arg) => arg !== undefined)
  }

  private async tryGetChainFromInputs(warp: Warp, inputs: string[]): Promise<WarpChainInfo | null> {
    const action = warp.actions.find((a) => a.inputs?.some((i) => i.position === 'chain'))
    if (!action) return null
    const chainPositionIndex = action.inputs?.findIndex((i) => i.position === 'chain')
    if (chainPositionIndex === -1 || chainPositionIndex === undefined) return null

    const chainInput = inputs[chainPositionIndex]
    if (!chainInput) throw new Error('Chain input not found')

    const chainValue = this.serializer.stringToNative(chainInput)[1] as WarpChainName
    const adapter = findWarpAdapterForChain(chainValue, this.adapters)

    return adapter.chainInfo
  }
}
