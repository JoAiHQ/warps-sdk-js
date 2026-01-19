import { WarpChainName, WarpConstants } from './constants'
import {
    createWarpIdentifier,
    extractIdentifierInfoFromUrl,
    extractQueryStringFromIdentifier,
    extractQueryStringFromUrl,
    findWarpAdapterForChain,
    getWarpInfoFromIdentifier,
} from './helpers'
import { ChainAdapter, Warp, WarpBrand, WarpCacheConfig, WarpClientConfig, WarpRegistryInfo } from './types'
import { WarpInterpolator } from './WarpInterpolator'
import { WarpLogger } from './WarpLogger'

export type DetectionResult = {
  match: boolean
  url: string
  warp: Warp | null
  chain: WarpChainName | null
  registryInfo: WarpRegistryInfo | null
  brand: WarpBrand | null
}

export type DetectionResultFromHtml = {
  match: boolean
  output: {
    url: string
    warp: Warp
  }[]
}

// Example Link (Transaction Hash as ID): https://usewarp.to/to?warp=hash%3A<MYHASH>
// Example Link (Alias as ID): https://usewarp.to/to?warp=alias%3A<MYALIAS>
export class WarpLinkDetecter {
  constructor(
    private config: WarpClientConfig,
    private adapters: ChainAdapter[]
  ) {}

  isValid(url: string): boolean {
    if (!url.startsWith(WarpConstants.HttpProtocolPrefix)) return false
    const idResult = extractIdentifierInfoFromUrl(url, this.config.defaultChain)
    return !!idResult
  }

  async detectFromHtml(content: string): Promise<DetectionResultFromHtml> {
    if (!content.length) return { match: false, output: [] }
    const links = [...content.matchAll(/https?:\/\/[^\s"'<>]+/gi)].map((link) => link[0])
    const warpLinks = links.filter((link) => this.isValid(link))
    const detectionReqs = warpLinks.map((link) => this.detect(link))
    const detectionResults = await Promise.all(detectionReqs)
    const validDetections = detectionResults.filter((result) => result.match)
    const hasMatch = validDetections.length > 0
    const output = validDetections.map((result) => ({ url: result.url, warp: result.warp! }))

    return { match: hasMatch, output }
  }

  async detect(urlOrId: string, cache?: WarpCacheConfig): Promise<DetectionResult> {
    const emptyResult: DetectionResult = { match: false, url: urlOrId, warp: null, chain: null, registryInfo: null, brand: null }

    const identifierResult = urlOrId.startsWith(WarpConstants.HttpProtocolPrefix)
      ? extractIdentifierInfoFromUrl(urlOrId, this.config.defaultChain)
      : getWarpInfoFromIdentifier(urlOrId, this.config.defaultChain)

    if (!identifierResult) {
      return emptyResult
    }

    try {
      const { type, identifierBase } = identifierResult
      let warp: Warp | null = null
      let registryInfo: WarpRegistryInfo | null = null
      let brand: WarpBrand | null = null

      const adapter = findWarpAdapterForChain(identifierResult.chain, this.adapters)

      const queryString = urlOrId.startsWith(WarpConstants.HttpProtocolPrefix)
        ? extractQueryStringFromUrl(urlOrId)
        : extractQueryStringFromIdentifier(identifierResult.identifier)

      if (type === 'hash') {
        warp = await adapter.builder().createFromTransactionHash(identifierBase, cache)
        const result = await adapter.registry.getInfoByHash(identifierBase, cache)
        registryInfo = result.registryInfo
        brand = result.brand
      } else if (type === 'alias') {
        const result = await adapter.registry.getInfoByAlias(identifierBase, cache)
        registryInfo = result.registryInfo
        brand = result.brand
        if (result.registryInfo) {
          warp = await adapter.builder().createFromTransactionHash(result.registryInfo.hash, cache)
        }
      }

      if (warp && warp.meta) {
        modifyWarpMetaIdentifier(warp, adapter.chainInfo.name, registryInfo, identifierResult.identifier)
        warp.meta.query = queryString
      }

      if (!warp) {
        return emptyResult
      }

      const warpChain = warp.chain || adapter.chainInfo.name
      const warpAdapter = findWarpAdapterForChain(warpChain, this.adapters)
      const preparedWarp = await new WarpInterpolator(this.config, warpAdapter, this.adapters).apply(warp)

      return { match: true, url: urlOrId, warp: preparedWarp, chain: warpChain, registryInfo, brand }
    } catch (e) {
      WarpLogger.error('Error detecting warp link', e)
      return emptyResult
    }
  }
}

const modifyWarpMetaIdentifier = (warp: Warp, chain: WarpChainName, registryInfo: WarpRegistryInfo | null, identifier: string) => {
  if (!warp.meta) return
  warp.meta.identifier = registryInfo?.alias
    ? createWarpIdentifier(chain, 'alias', registryInfo.alias)
    : createWarpIdentifier(chain, 'hash', registryInfo?.hash ?? identifier)
}
