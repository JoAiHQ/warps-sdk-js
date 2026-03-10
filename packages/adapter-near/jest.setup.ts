import { Buffer } from 'buffer'
import fetchMock from 'jest-fetch-mock'
import { TextDecoder, TextEncoder } from 'util'

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
