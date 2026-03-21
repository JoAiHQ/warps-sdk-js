import fetchMock from 'jest-fetch-mock'
import { TextEncoder, TextDecoder } from 'util'
import { Buffer } from 'buffer'

if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder as any
}
if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer
}

fetchMock.enableMocks()

// Export mocks for moduleNameMapper
export const createKeyPairSignerFromBytes = jest.fn(async (bytes: Uint8Array) => ({
  signMessage: jest.fn(),
  signTransaction: jest.fn(),
}))

// Mock ESM-only modules that Jest can't handle
jest.mock('@solana/kit', () => ({
  createKeyPairSignerFromBytes,
}))
