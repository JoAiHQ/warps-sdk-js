import { WarpConstants } from './constants'
import { findWarpAdapterForChain } from './helpers'
import { replacePlaceholders } from './helpers/general'
import { getWarpWalletAddressFromConfig } from './helpers/wallet'
import { WarpChainName } from './constants'
import { ChainAdapter, InterpolationBag, ResolvedInput, Warp, WarpAction, WarpClientConfig } from './types'
import { WarpSerializer } from './WarpSerializer'

export class WarpInterpolator {
  constructor(
    private config: WarpClientConfig,
    private adapter: ChainAdapter,
    private adapters?: ChainAdapter[]
  ) {}

  async apply(warp: Warp, meta: { envs?: Record<string, any>; queries?: Record<string, any> } = {}): Promise<Warp> {
    const modifiable = this.applyVars(warp, meta)
    return await this.applyGlobals(modifiable)
  }

  async applyGlobals(warp: Warp): Promise<Warp> {
    let modifiable = { ...warp }
    modifiable.actions = await Promise.all((modifiable.actions || []).map(async (action) => await this.applyActionGlobals(action)))

    modifiable = await this.applyRootGlobals(modifiable)

    return modifiable
  }

  applyVars(warp: Warp, meta: { envs?: Record<string, any>; queries?: Record<string, any> } = {}): Warp {
    if (!warp?.vars) return warp
    const wallet = getWarpWalletAddressFromConfig(this.config, this.adapter.chainInfo.name)
    let modifiable = JSON.stringify(warp)

    const modify = (placeholder: string, value: string | number) => {
      modifiable = modifiable.replace(new RegExp(`{{${placeholder.toUpperCase()}}}`, 'g'), value.toString())
    }

    Object.entries(warp.vars).forEach(([placeholder, value]) => {
      if (typeof value !== 'string') {
        modify(placeholder, value)
      } else if (value.startsWith(WarpConstants.Vars.Query + WarpConstants.ArgParamsSeparator)) {
        const queryVar = value.slice(WarpConstants.Vars.Query.length + 1)
        const [queryName, _queryDescription] = queryVar.split(WarpConstants.ArgCompositeSeparator)
        const queryValueInUrl = this.config.currentUrl ? new URLSearchParams(this.config.currentUrl.split('?')[1]).get(queryName) : null
        const queryValueInMeta = meta.queries?.[queryName] ?? null
        const queryValue = queryValueInMeta ?? queryValueInUrl
        if (queryValue !== null && queryValue !== undefined) modify(placeholder, queryValue)
      } else if (value.startsWith(WarpConstants.Vars.Env + WarpConstants.ArgParamsSeparator)) {
        const envVar = value.slice(WarpConstants.Vars.Env.length + 1)
        const [envVarName, _envVarDescription] = envVar.split(WarpConstants.ArgCompositeSeparator)
        const combinedEnvs = { ...this.config.vars, ...meta.envs }
        const envVarValue = combinedEnvs?.[envVarName]
        if (envVarValue !== undefined && envVarValue !== null) modify(placeholder, envVarValue)
      } else if (value === WarpConstants.Source.UserWallet && wallet) {
        modify(placeholder, wallet)
      } else {
        modify(placeholder, value)
      }
    })

    return JSON.parse(modifiable)
  }

  private async applyRootGlobals(warp: Warp): Promise<Warp> {
    let modifiable = JSON.stringify(warp)

    const rootBag: InterpolationBag = {
      config: this.config,
      adapter: this.adapter,
    }

    Object.values(WarpConstants.Globals).forEach((global) => {
      const value = global.Accessor(rootBag)
      if (value !== undefined && value !== null) {
        modifiable = modifiable.replace(new RegExp(`{{${global.Placeholder}}}`, 'g'), value.toString())
      }
      modifiable = this.replacePlaceholdersWithChain(modifiable, global.Placeholder, rootBag, global.Accessor)
    })

    return JSON.parse(modifiable)
  }

  private async applyActionGlobals(action: WarpAction): Promise<WarpAction> {
    let modifiable = JSON.stringify(action)

    const bag: InterpolationBag = {
      config: this.config,
      adapter: this.adapter,
    }

    Object.values(WarpConstants.Globals).forEach((global) => {
      const value = global.Accessor(bag)
      if (value !== undefined && value !== null) {
        modifiable = modifiable.replace(new RegExp(`{{${global.Placeholder}}}`, 'g'), value.toString())
      }
      modifiable = this.replacePlaceholdersWithChain(modifiable, global.Placeholder, bag, global.Accessor)
    })

    return JSON.parse(modifiable)
  }

  applyInputs(text: string, resolvedInputs: ResolvedInput[], serializer: WarpSerializer, primaryInputs?: ResolvedInput[]): string {
    if (!text || typeof text !== 'string') return text
    if (!text.includes('{{')) return text

    let result = this.applyGlobalsToText(text)
    const bag = this.buildInputBag(resolvedInputs, serializer, primaryInputs)
    return replacePlaceholders(result, bag)
  }

  private applyGlobalsToText(text: string): string {
    const globalPlaceholders = Object.values(WarpConstants.Globals).map((g) => g.Placeholder)
    const hasGlobalPlaceholder = globalPlaceholders.some(
      (placeholder) => text.includes(`{{${placeholder}}}`) || text.includes(`{{${placeholder}:`)
    )
    if (!hasGlobalPlaceholder) return text

    const rootBag: InterpolationBag = {
      config: this.config,
      adapter: this.adapter,
    }

    let result = text
    Object.values(WarpConstants.Globals).forEach((global) => {
      const value = global.Accessor(rootBag)
      if (value !== undefined && value !== null) {
        result = result.replace(new RegExp(`{{${global.Placeholder}}}`, 'g'), value.toString())
      }
      result = this.replacePlaceholdersWithChain(result, global.Placeholder, rootBag, global.Accessor)
    })

    return result
  }

  private replacePlaceholdersWithChain(
    text: string,
    placeholder: string,
    defaultBag: InterpolationBag,
    accessor: (bag: InterpolationBag) => any
  ): string {
    const regex = new RegExp(`\\{\\{${placeholder}:([^}]+)\\}\\}`, 'g')
    return text.replace(regex, (match, chainName) => {
      const chain = chainName.trim().toLowerCase()
      if (!this.adapters) {
        return match
      }
      try {
        const chainAdapter = findWarpAdapterForChain(chain as WarpChainName, this.adapters)
        const chainBag: InterpolationBag = {
          config: this.config,
          adapter: chainAdapter,
        }
        const value = accessor(chainBag)
        return value !== undefined && value !== null ? value.toString() : match
      } catch {
        return match
      }
    })
  }

  buildInputBag(resolvedInputs: ResolvedInput[], serializer: WarpSerializer, primaryInputs?: ResolvedInput[]): Record<string, string> {
    const bag: Record<string, string> = {}

    resolvedInputs.forEach((resolvedInput) => {
      if (!resolvedInput.value) return
      const key = resolvedInput.input.as || resolvedInput.input.name
      const [, nativeValue] = serializer.stringToNative(resolvedInput.value)
      bag[key] = String(nativeValue)
    })

    if (primaryInputs) {
      primaryInputs.forEach((resolvedInput) => {
        if (!resolvedInput.value) return
        const key = resolvedInput.input.as || resolvedInput.input.name
        const [, nativeValue] = serializer.stringToNative(resolvedInput.value)
        bag[`primary.${key}`] = String(nativeValue)

        if (resolvedInput.input.type === 'asset' && typeof resolvedInput.input.position === 'object') {
          const asset = nativeValue as { identifier: string; amount: bigint }
          if (asset && typeof asset === 'object' && 'identifier' in asset && 'amount' in asset) {
            bag[`primary.${key}.token`] = String(asset.identifier)
            bag[`primary.${key}.amount`] = String(asset.amount)
          }
        }
      })
    }

    return bag
  }
}
