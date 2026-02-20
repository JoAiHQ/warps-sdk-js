import { WarpActionInput, WarpActionInputPosition } from '@joai/warps'
import { JsonLikeObject, OpenApiMethod, OpenApiOperation, OpenApiParameter } from '../types'

const OpenApiMethods: OpenApiMethod[] = ['get', 'post', 'put', 'delete']

const isObject = (value: unknown): value is JsonLikeObject => typeof value === 'object' && value !== null && !Array.isArray(value)

const getPrimitiveDefault = (value: unknown): string | number | boolean | undefined => {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value
  return undefined
}

export const mapOpenApiSchemaToWarpType = (schema: JsonLikeObject | null): string => {
  const type = typeof schema?.type === 'string' ? schema.type : null
  if (type === 'boolean') return 'bool'
  if (type === 'integer' || type === 'number') return 'number'
  return 'string'
}

export const extractOpenApiParameters = (raw: unknown): OpenApiParameter[] => {
  if (!Array.isArray(raw)) return []

  const parameters: OpenApiParameter[] = []

  for (const parameterRaw of raw) {
    if (!isObject(parameterRaw)) continue

    const parameterIn = parameterRaw.in
    if (parameterIn !== 'path' && parameterIn !== 'query') continue

    const name = parameterRaw.name
    if (typeof name !== 'string' || !name.trim()) continue

    const schema = isObject(parameterRaw.schema) ? parameterRaw.schema : null
    const required = parameterIn === 'path' ? true : parameterRaw.required === true

    parameters.push({
      name: name.trim(),
      in: parameterIn,
      required,
      description: typeof parameterRaw.description === 'string' ? parameterRaw.description : undefined,
      type: mapOpenApiSchemaToWarpType(schema),
      defaultValue: getPrimitiveDefault(schema?.default),
    })
  }

  return parameters
}

export const mergeOpenApiParameters = (baseParameters: OpenApiParameter[], operationParameters: OpenApiParameter[]): OpenApiParameter[] => {
  const merged = new Map<string, OpenApiParameter>()
  for (const parameter of baseParameters) merged.set(`${parameter.in}:${parameter.name}`, parameter)
  for (const parameter of operationParameters) merged.set(`${parameter.in}:${parameter.name}`, parameter)
  return [...merged.values()]
}

export const extractOpenApiPayloadInputs = (rawRequestBody: unknown): WarpActionInput[] => {
  if (!isObject(rawRequestBody)) return []

  const content = isObject(rawRequestBody.content) ? rawRequestBody.content : null
  const jsonContent = content && isObject(content['application/json']) ? (content['application/json'] as JsonLikeObject) : null
  const schema = jsonContent && isObject(jsonContent.schema) ? (jsonContent.schema as JsonLikeObject) : null
  if (!schema) return []

  const properties = isObject(schema.properties) ? schema.properties : null
  if (!properties) return []

  const required = new Set(Array.isArray(schema.required) ? schema.required.filter((name): name is string => typeof name === 'string') : [])
  const inputs: WarpActionInput[] = []

  for (const [propertyName, propertySchemaRaw] of Object.entries(properties)) {
    const propertySchema = isObject(propertySchemaRaw) ? propertySchemaRaw : null
    if (!propertySchema) continue

    inputs.push({
      name: propertyName,
      as: propertyName,
      description: typeof propertySchema.description === 'string' ? propertySchema.description : undefined,
      type: mapOpenApiSchemaToWarpType(propertySchema),
      source: 'field',
      required: required.has(propertyName),
      position: `payload:${propertyName}` as WarpActionInputPosition,
      default: getPrimitiveDefault(propertySchema.default),
    })
  }

  return inputs
}

const getOpenApiOperationIdentifier = (method: OpenApiMethod, path: string, operation: JsonLikeObject): string => {
  if (typeof operation.operationId === 'string' && operation.operationId.trim()) return operation.operationId.trim()
  return `${method.toUpperCase()} ${path}`
}

export const getOpenApiBaseUrl = (schema: JsonLikeObject, sourceUrl?: string): string => {
  const servers = Array.isArray(schema.servers) ? schema.servers : []
  const firstServer = servers.find((server) => isObject(server) && typeof server.url === 'string' && server.url.length > 0) as
    | (JsonLikeObject & { url: string })
    | undefined

  if (firstServer?.url) {
    if (sourceUrl) {
      try {
        return new URL(firstServer.url, sourceUrl).toString()
      } catch {
        return firstServer.url
      }
    }
    return firstServer.url
  }

  if (sourceUrl) {
    try {
      const source = new URL(sourceUrl)
      return `${source.protocol}//${source.host}`
    } catch {
      return sourceUrl
    }
  }

  return ''
}

export const buildOpenApiOperationUrl = (baseUrl: string, rawPath: string): string => {
  const normalizedBase = baseUrl.replace(/\/+$/, '')
  const normalizedPath = rawPath.replace(/^\/+/, '')
  const withPlaceholders = normalizedPath.replace(/\{([^}]+)\}/g, '{{$1}}')
  return `${normalizedBase}/${withPlaceholders}`
}

export const getOpenApiName = (schema: JsonLikeObject): string => {
  const info = isObject(schema.info) ? schema.info : null
  const title = info && typeof info.title === 'string' ? info.title.trim() : ''
  return title || 'OpenAPI'
}

export const extractOpenApiOperations = (schema: JsonLikeObject, sourceUrl?: string): OpenApiOperation[] => {
  const paths = isObject(schema.paths) ? schema.paths : null
  if (!paths) return []

  const baseUrl = getOpenApiBaseUrl(schema, sourceUrl)
  const operations: OpenApiOperation[] = []

  for (const [rawPath, pathItemRaw] of Object.entries(paths)) {
    if (!isObject(pathItemRaw)) continue

    const pathLevelParameters = extractOpenApiParameters(pathItemRaw.parameters)

    for (const method of OpenApiMethods) {
      const operationRaw = pathItemRaw[method]
      if (!isObject(operationRaw)) continue

      const identifier = getOpenApiOperationIdentifier(method, rawPath, operationRaw)
      const title = (typeof operationRaw.summary === 'string' && operationRaw.summary.trim()) || identifier
      const description = (typeof operationRaw.description === 'string' && operationRaw.description.trim()) || `Call ${method.toUpperCase()} ${rawPath}`
      const operationParameters = extractOpenApiParameters(operationRaw.parameters)
      const parameters = mergeOpenApiParameters(pathLevelParameters, operationParameters)
      const payloadInputs = extractOpenApiPayloadInputs(operationRaw.requestBody)
      const url = buildOpenApiOperationUrl(baseUrl, rawPath)

      operations.push({
        identifier,
        title,
        description,
        method,
        url,
        parameters,
        payloadInputs,
      })
    }
  }

  return operations
}

export const extractOpenApiEndpoints = (spec: unknown): string[] => {
  if (!isObject(spec) || !isObject(spec.paths)) return []

  const endpoints: string[] = []

  for (const [path, pathItemRaw] of Object.entries(spec.paths)) {
    if (!isObject(pathItemRaw)) continue

    for (const method of OpenApiMethods) {
      const operation = pathItemRaw[method]
      if (!isObject(operation)) continue
      endpoints.push(getOpenApiOperationIdentifier(method, path, operation))
    }
  }

  return [...new Set(endpoints)]
}
