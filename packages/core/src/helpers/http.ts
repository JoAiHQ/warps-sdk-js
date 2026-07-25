import { ResolvedInput, WarpCollectDestinationHttp, WarpExecutable } from '../types'
import { WarpInterpolator } from '../WarpInterpolator'
import { WarpSerializer } from '../WarpSerializer'
import { createAuthHeaders, createAuthMessage } from './signing'

export const HttpInputNames = {
  Queries: 'QUERIES',
  Payload: 'PAYLOAD',
  Headers: 'HEADERS',
} as const

export const HttpMethods = {
  Get: 'GET',
  Post: 'POST',
  Put: 'PUT',
  Delete: 'DELETE',
} as const

export type HttpRequestConfig = {
  url: string
  method: string
  headers: Headers
  body?: string
}

export const getJsonFromInput = (resolvedInputs: ResolvedInput[], inputName: string, serializer: WarpSerializer): string | null => {
  const input = resolvedInputs.find((ri) => ri.input.as === inputName || ri.input.name === inputName)
  if (!input?.value) return null
  const [, nativeValue] = serializer.stringToNative(input.value)
  return typeof nativeValue === 'string' ? nativeValue : JSON.stringify(nativeValue)
}

export const parseJsonSafely = (json: string): any => {
  try {
    return JSON.parse(json)
  } catch {
    return null
  }
}

export const buildHeaders = async (
  interpolator: WarpInterpolator,
  destination: WarpCollectDestinationHttp,
  executable: WarpExecutable,
  wallet: string | null,
  serializer: WarpSerializer,
  onSignRequest?: (params: { message: string; chain: any }) => Promise<string | undefined>
): Promise<Headers> => {
  const headers = new Headers()
  headers.set('Content-Type', 'application/json')
  headers.set('Accept', 'application/json')

  if (onSignRequest && wallet) {
    const { message, nonce, expiresAt } = await createAuthMessage(wallet, `${executable.chain.name}-adapter`)
    const signature = await onSignRequest({ message, chain: executable.chain })
    if (signature) {
      Object.entries(createAuthHeaders(wallet, signature, nonce, expiresAt)).forEach(([k, v]) => headers.set(k, v))
    }
  }

  const headersJson = getJsonFromInput(executable.resolvedInputs, HttpInputNames.Headers, serializer)
  if (headersJson) {
    const parsed = parseJsonSafely(headersJson)
    if (parsed && typeof parsed === 'object') {
      Object.entries(parsed).forEach(([k, v]) => typeof v === 'string' && headers.set(k, v))
    }
  } else if (destination.headers) {
    Object.entries(destination.headers).forEach(([k, v]) => {
      headers.set(k, interpolator.applyInputs(v as string, executable.resolvedInputs, serializer))
    })
  }

  return headers
}

export const buildUrl = (
  interpolator: WarpInterpolator,
  destination: WarpCollectDestinationHttp,
  executable: WarpExecutable,
  method: string,
  serializer: WarpSerializer
): string => {
  let url = interpolator.applyInputs(destination.url, executable.resolvedInputs, serializer)

  if (method === HttpMethods.Get) {
    const queriesJson = getJsonFromInput(executable.resolvedInputs, HttpInputNames.Queries, serializer)
    if (queriesJson) {
      const parsed = parseJsonSafely(queriesJson)
      if (parsed && typeof parsed === 'object') {
        const urlObj = new URL(url)
        Object.entries(parsed).forEach(([k, v]) => v != null && urlObj.searchParams.set(k, String(v)))
        url = urlObj.toString()
      }
    }
  }

  return url
}

export const buildBody = (
  method: string,
  executable: WarpExecutable,
  payload: any,
  serializer: WarpSerializer,
  extra?: Record<string, any>
): string | undefined => {
  if (method === HttpMethods.Get) return undefined

  const payloadJson = getJsonFromInput(executable.resolvedInputs, HttpInputNames.Payload, serializer)
  if (payloadJson && parseJsonSafely(payloadJson) !== null) return payloadJson

  const { [HttpInputNames.Payload]: _, [HttpInputNames.Queries]: __, ...cleanPayload } = payload
  return JSON.stringify({ ...cleanPayload, ...extra })
}

export const buildHttpRequest = async (
  interpolator: WarpInterpolator,
  destination: WarpCollectDestinationHttp,
  executable: WarpExecutable,
  wallet: string | null,
  payload: any,
  serializer: WarpSerializer,
  extra?: Record<string, any>,
  onSignRequest?: (params: { message: string; chain: any }) => Promise<string | undefined>
): Promise<HttpRequestConfig> => {
  const method = destination.method || HttpMethods.Get

  const headers = await buildHeaders(interpolator, destination, executable, wallet, serializer, onSignRequest)
  const url = buildUrl(interpolator, destination, executable, method, serializer)
  const body = buildBody(method, executable, payload, serializer, extra)

  return { url, method, headers, body }
}
