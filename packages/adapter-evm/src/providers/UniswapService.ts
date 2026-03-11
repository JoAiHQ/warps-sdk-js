import { CacheTtl, WarpCache } from '@joai/warps'
import { UniswapToken, UniswapTokenList } from '../types'

export class UniswapService {
  private static readonly UNISWAP_TOKEN_LIST_URL = 'https://tokens.uniswap.org'
  private cache: WarpCache
  private chainId: number

  constructor(cache: WarpCache, chainId: number) {
    this.cache = cache
    this.chainId = chainId
  }

  async getTokenList(): Promise<UniswapTokenList> {
    try {
      const response = await fetch(UniswapService.UNISWAP_TOKEN_LIST_URL)
      if (!response.ok) {
        throw new Error(`Failed to fetch Uniswap token list: ${response.status}`)
      }

      const tokenList: UniswapTokenList = await response.json()
      return tokenList
    } catch (error) {
      throw new Error(`Failed to fetch Uniswap token list: ${error}`)
    }
  }

  async findToken(address: string): Promise<UniswapToken | null> {
    const normalizedAddress = address.toLowerCase()
    const cacheKey = `uniswap:token:${this.chainId}:${normalizedAddress}`

    // Check cache first
    const cachedToken = await this.cache.get<UniswapToken>(cacheKey)
    if (cachedToken) {
      return cachedToken
    }

    try {
      const tokenList = await this.getTokenList()
      const token = tokenList.tokens.find((token: UniswapToken) => token.address.toLowerCase() === normalizedAddress) || null

      // Additional safety check: if we found a token, make sure it's for the right chain
      if (token && token.chainId !== this.chainId) {
        return null // Wrong chain, don't return it
      }

      // Cache the result (including null results to avoid repeated fetches)
      if (token) {
        await this.cache.set(cacheKey, token, CacheTtl.OneHour)
      } else {
        // Cache null results for a shorter time to allow for new tokens
        await this.cache.set(cacheKey, null, CacheTtl.OneMinute * 5)
      }

      return token
    } catch (error) {
      // If we can't fetch the list, return null (fallback to contract data)
      return null
    }
  }

  async getTokenMetadata(address: string): Promise<{
    name: string
    symbol: string
    decimals: number
    logoUrl: string
  } | null> {
    const normalizedAddress = address.toLowerCase()
    const cacheKey = `uniswap:metadata:${this.chainId}:${normalizedAddress}`

    // Check cache first
    const cachedMetadata = await this.cache.get<{
      name: string
      symbol: string
      decimals: number
      logoUrl: string
    }>(cacheKey)
    if (cachedMetadata !== null) {
      return cachedMetadata
    }

    const token = await this.findToken(address)
    if (!token) {
      // Cache null result to avoid repeated lookups
      await this.cache.set(cacheKey, null, CacheTtl.OneMinute * 5)
      return null
    }

    const metadata = {
      name: token.name,
      symbol: token.symbol,
      decimals: token.decimals,
      logoUrl: token.logoURI,
    }

    // Cache the metadata result
    await this.cache.set(cacheKey, metadata, CacheTtl.OneHour)
    return metadata
  }

  async getBridgeInfo(address: string): Promise<Record<string, string> | null> {
    const normalizedAddress = address.toLowerCase()
    const cacheKey = `uniswap:bridge:${this.chainId}:${normalizedAddress}`

    // Check cache first
    const cachedBridgeInfo = await this.cache.get<Record<string, string>>(cacheKey)
    if (cachedBridgeInfo !== null) {
      return cachedBridgeInfo
    }

    const token = await this.findToken(address)
    if (!token?.extensions?.bridgeInfo) {
      // Cache null result to avoid repeated lookups
      await this.cache.set(cacheKey, null, CacheTtl.OneMinute * 5)
      return null
    }

    const bridgeInfo: Record<string, string> = {}
    for (const [chainId, info] of Object.entries(token.extensions.bridgeInfo)) {
      bridgeInfo[chainId] = (info as { tokenAddress: string }).tokenAddress
    }

    // Cache the bridge info result
    await this.cache.set(cacheKey, bridgeInfo, CacheTtl.OneHour)
    return bridgeInfo
  }
}
