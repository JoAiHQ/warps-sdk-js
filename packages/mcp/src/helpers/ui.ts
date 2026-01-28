import { Warp, WarpClientConfig, WarpLogger } from '@joai/warps'
import type { WarpMcpResource } from '../types'

const RESOURCE_MIME_TYPE = 'text/html;profile=mcp-app' as const

const loadComponent = async (componentPath: string): Promise<string> => {
  if (componentPath.startsWith('http://') || componentPath.startsWith('https://')) {
    const res = await fetch(componentPath)
    if (!res.ok) throw new Error(`Failed to download component from ${componentPath}: HTTP ${res.status} ${res.statusText}`)
    return res.text()
  }

  throw new Error(`Unsupported component path: ${componentPath}`)
}

export const createAppResource = async (warp: Warp, componentPath: string, config: WarpClientConfig): Promise<WarpMcpResource | null> => {
  if (!warp.meta?.identifier) return null
  try {
    const htmlContent = await loadComponent(componentPath)

    return {
      name: warp.name,
      uri: `ui://widget/${warp.meta.identifier}`,
      description: `MCP app for ${warp.name}`,
      mimeType: RESOURCE_MIME_TYPE,
      content: htmlContent,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    WarpLogger.error(`[MCP] Failed to create app resource for warp "${warp.name}" (path: ${componentPath}):`, errorMessage)
    if (errorStack) {
      WarpLogger.error(`[MCP] Error stack:`, errorStack)
    }
    return null
  }
}
