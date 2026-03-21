// Polyfill for TextEncoder/TextDecoder required by viem
import { TextEncoder, TextDecoder } from 'util'

global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder as typeof global.TextDecoder

// Mock ESM-only modules that Jest can't handle
jest.mock('viem/accounts', () => ({
  privateKeyToAccount: jest.fn((key: string) => ({
    address: '0x' + '0'.repeat(40),
    signMessage: jest.fn(),
    signTypedData: jest.fn(),
  })),
}))

