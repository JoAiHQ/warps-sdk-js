import {
  Warp,
  WarpActionInput,
  WarpActionInputPosition,
  WarpBuilder,
  WarpChainName,
  WarpClientConfig,
  buildGeneratedSourceWarpIdentifier,
  stampGeneratedWarpMeta,
} from '@joai/warps'
import { JsonLikeObject, OpenApiConvertOptions, OpenApiOperation } from '../types'
import { extractOpenApiOperations, getOpenApiName } from './openapi'

const DefaultChain = WarpChainName.Multiversx

export const convertOpenApiToWarps = async (
  config: WarpClientConfig,
  spec: JsonLikeObject,
  options?: OpenApiConvertOptions
): Promise<Warp[]> => {
  const sourceUrl = options?.sourceUrl
  const chain = options?.chain || DefaultChain

  const operations = extractOpenApiOperations(spec, sourceUrl)
  const selectedOperations = options?.endpoints?.length
    ? operations.filter((operation) => options.endpoints!.includes(operation.identifier))
    : operations

  const apiName = getOpenApiName(spec)
  const warps: Warp[] = []

  for (const operation of selectedOperations) {
    const warp = await buildWarpFromOperation(config, apiName, operation, chain, sourceUrl)
    warps.push(warp)
  }

  return warps
}

const buildWarpFromOperation = async (
  config: WarpClientConfig,
  apiName: string,
  operation: OpenApiOperation,
  chain: WarpChainName,
  sourceUrl?: string
): Promise<Warp> => {
  const warpName = `${apiName}: ${operation.title}`
  const inputs: WarpActionInput[] = [
    ...operation.parameters.map<WarpActionInput>((parameter) => ({
      name: parameter.name,
      as: parameter.name,
      description: parameter.description,
      type: parameter.type,
      source: 'field',
      required: parameter.required,
      position: `${parameter.in === 'path' ? 'url' : 'query'}:${parameter.name}` as WarpActionInputPosition,
      default: parameter.defaultValue,
    })),
    ...operation.payloadInputs,
  ]

  const destination: {
    url: string
    method: 'GET' | 'POST' | 'PUT' | 'DELETE'
    headers?: Record<string, string>
  } = {
    url: operation.url,
    method: operation.method.toUpperCase() as 'GET' | 'POST' | 'PUT' | 'DELETE',
  }

  if (operation.payloadInputs.length > 0) {
    destination.headers = { 'Content-Type': 'application/json' }
  }

  const warp = await new WarpBuilder(config)
    .setName(warpName)
    .setTitle(operation.title)
    .setDescription(operation.description)
    .addAction({
      type: 'collect',
      label: operation.title,
      destination,
      inputs,
    })
    .build(false)

  const identifier = buildGeneratedSourceWarpIdentifier(
    { type: 'openapi', url: sourceUrl || null, contract: null },
    operation.identifier,
    warpName
  )
  stampGeneratedWarpMeta(warp, chain, identifier, warpName)

  return warp
}
