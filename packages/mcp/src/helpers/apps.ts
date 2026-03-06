const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

const serializeQueryValue = (value: unknown): string | null => {
  if (value == null) return null
  return typeof value === 'string' ? value : JSON.stringify(value)
}

export const resolveMcpAppInputsPayload = (params: {
  query?: unknown
  contentInputs?: unknown
  metaInputs?: string[] | null
}): Record<string, unknown> | null => {
  const queryPayload = asRecord(params.query)
  if (queryPayload) return queryPayload

  const contentInputsPayload = asRecord(params.contentInputs)
  if (contentInputsPayload) return contentInputsPayload

  const metaInputs = params.metaInputs || []
  if (metaInputs.length > 0) return { inputs: metaInputs }
  return null
}

export const resolveMcpAppOutputPayload = (params: {
  metaOutput?: unknown
  contentOutput?: unknown
}): Record<string, unknown> | null => {
  return asRecord(params.metaOutput) || asRecord(params.contentOutput)
}

export type McpAppWarpEmbedModel = {
  isMcpApp: boolean
  inputsPayload: Record<string, unknown> | null
  outputPayload: Record<string, unknown> | null
}

export const resolveMcpAppWarpEmbedModel = (params: {
  ui?: unknown
  query?: unknown
  contentInputs?: unknown
  metaInputs?: string[] | null
  metaOutput?: unknown
  contentOutput?: unknown
}): McpAppWarpEmbedModel => {
  return {
    isMcpApp: hasMcpAppUi(params.ui),
    inputsPayload: resolveMcpAppInputsPayload({
      query: params.query,
      contentInputs: params.contentInputs,
      metaInputs: params.metaInputs,
    }),
    outputPayload: resolveMcpAppOutputPayload({
      metaOutput: params.metaOutput,
      contentOutput: params.contentOutput,
    }),
  }
}

export const hasMcpAppUi = (ui: unknown): ui is string => {
  return typeof ui === 'string' && ui !== 'table'
}

export const normalizeMcpToolNameToWarpIdentifier = (toolName: string): string => {
  if (!toolName) return toolName
  if (toolName.startsWith('@')) return toolName
  if (toolName.includes(':')) return `@${toolName.replace(/^@/, '')}`
  return toolName
}

export const isMcpToolCallAllowedForWarp = (params: {
  requestedToolName: string
  activeWarpIdentifier?: string | null
}): boolean => {
  if (!params.activeWarpIdentifier) return true
  return normalizeMcpToolNameToWarpIdentifier(params.requestedToolName) === normalizeMcpToolNameToWarpIdentifier(params.activeWarpIdentifier)
}

export const buildWarpDirectIdentifierFromMcpToolCall = (
  toolName: string,
  args: Record<string, unknown> = {}
): string => {
  const warpIdentifier = normalizeMcpToolNameToWarpIdentifier(toolName)
  const query = new URLSearchParams()

  Object.entries(args).forEach(([key, value]) => {
    const serialized = serializeQueryValue(value)
    if (serialized == null) return
    query.set(key, serialized)
  })

  return query.size > 0 ? `${warpIdentifier}?${query.toString()}` : warpIdentifier
}

export const resolveMcpToolCallToWarpDirect = (params: {
  requestedToolName: string
  args?: Record<string, unknown>
  activeWarpIdentifier?: string | null
}): { allowed: boolean; warpIdentifier: string } => {
  const allowed = isMcpToolCallAllowedForWarp({
    requestedToolName: params.requestedToolName,
    activeWarpIdentifier: params.activeWarpIdentifier,
  })

  const warpIdentifier = buildWarpDirectIdentifierFromMcpToolCall(params.requestedToolName, params.args || {})
  return { allowed, warpIdentifier }
}
