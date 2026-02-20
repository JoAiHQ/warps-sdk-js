import { Warp, WarpClientConfig } from '@joai/warps'
import { JsonLikeObject, OpenApiConvertOptions } from './types'
import { convertOpenApiToWarps } from './helpers/warps'

export class WarpOpenApi {
  constructor(private readonly config: WarpClientConfig) {}

  async getWarpsFromUrl(url: string, options?: OpenApiConvertOptions): Promise<Warp[]> {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Failed to fetch OpenAPI schema from ${url}: ${response.status}`)

    const spec = await response.json()
    if (typeof spec !== 'object' || spec === null || Array.isArray(spec)) {
      throw new Error('Invalid OpenAPI schema: expected a JSON object')
    }

    return this.getWarpsFromSpec(spec as JsonLikeObject, {
      sourceUrl: url,
      ...options,
    })
  }

  async getWarpsFromSpec(spec: JsonLikeObject, options?: OpenApiConvertOptions): Promise<Warp[]> {
    return convertOpenApiToWarps(this.config, spec, options)
  }
}
