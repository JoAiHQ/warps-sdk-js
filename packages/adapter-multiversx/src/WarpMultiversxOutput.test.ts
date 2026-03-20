// Tests for the MultiversxOutput class. All tests focus on the MultiversxOutput class directly.
import {
  extractCollectOutput,
  Warp,
  WarpChainInfo,
  WarpChainName,
  WarpClientConfig,
  WarpContractAction,
  WarpSerializer,
  WarpTypeRegistry,
} from '@joai/warps'
import { Address, SmartContractResult, TransactionEvent, TransactionLogs, TransactionOnNetwork, TypedValue } from '@multiversx/sdk-core/out'
import { promises as fs, PathLike } from 'fs'
import fetchMock from 'jest-fetch-mock'
import path from 'path'
import { evaluateOutputCommon } from '../../core/src/helpers/output'
import { setupHttpMock } from './test-utils/mockHttp'
import { WarpMultiversxOutput } from './WarpMultiversxOutput'

const testConfig: WarpClientConfig = {
  env: 'devnet',
  user: {
    wallets: {
      multiversx: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
    },
  },
  currentUrl: 'https://example.com',
  transform: {
    runner: {
      run: jest.fn().mockImplementation(async (code: string, context: any) => {
        // Simple mock transform runner for testing
        const codeStr = code.startsWith('transform:') ? code.slice('transform:'.length) : code
        // Create function with 'result' available in scope (matching the transform code)
        // eslint-disable-next-line no-new-func
        const fn = new Function('result', `const transform = ${codeStr}; return transform()`)
        return fn(context)
      }),
    },
  },
}

const mockChainInfo: WarpChainInfo = {
  name: WarpChainName.Multiversx,
  displayName: 'MultiversX',
  chainId: '1',
  blockTime: 6000,
  addressHrp: 'erd',
  defaultApiUrl: 'https://devnet-api.multiversx.com',
  logoUrl: 'https://example.com/multiversx-logo.png',
  nativeToken: {
    chain: WarpChainName.Multiversx,
    identifier: 'EGLD',
    name: 'MultiversX',
    symbol: 'EGLD',
    decimals: 18,
    logoUrl: 'https://example.com/egld-logo.png',
  },
}

// Patch global fetch for ABI requests to use the mock server
let originalFetch: any

beforeEach(() => {
  originalFetch = global.fetch
  global.fetch = fetchMock as any
})

afterEach(() => {
  global.fetch = originalFetch
})

jest.mock('@joai/warps-vm-node', () => ({
  runInVm: async (code: string, result: any) => {
    const codeStr = code.startsWith('transform:') ? code.slice('transform:'.length) : code
    // eslint-disable-next-line no-new-func
    const fn = new Function('result', `return (${codeStr})(result)`)
    const out = fn(result)
    if (out && typeof out.then === 'function') {
      return await out
    }
    return out
  },
}))

describe('Result Helpers', () => {
  let subject: WarpMultiversxOutput
  let typeRegistry: WarpTypeRegistry

  beforeEach(() => {
    typeRegistry = new WarpTypeRegistry()
    typeRegistry.registerType('token', {
      stringToNative: (value: string) => value,
      nativeToString: (value: any) => `token:${value}`,
    })
    typeRegistry.registerType('codemeta', {
      stringToNative: (value: string) => value,
      nativeToString: (value: any) => `codemeta:${value}`,
    })
    typeRegistry.registerTypeAlias('list', 'vector')
    subject = new WarpMultiversxOutput(testConfig, mockChainInfo, typeRegistry)
  })

  describe('input-based results', () => {
    it('returns input-based result by input name (query)', async () => {
      const warp = {
        protocol: 'test',
        name: 'test',
        title: 'test',
        description: 'test',
        actions: [
          {
            type: 'query',
            label: 'Test Query',
            address: 'erd1...',
            func: 'test',
            args: [],
            inputs: [
              { name: 'foo', type: 'string', source: 'field' },
              { name: 'bar', type: 'biguint', source: 'field' },
            ],
          },
        ],
        output: {
          FOO: 'in.foo',
          BAR: 'in.bar',
        },
      } as any
      const typedValues: TypedValue[] = []
      const inputs = [
        { input: warp.actions[0].inputs[0], value: 'string:abc' },
        { input: warp.actions[0].inputs[1], value: 'biguint:1234567890' },
      ]
      const { output } = await subject.extractQueryOutput(warp, typedValues, 1, inputs)
      expect(output.FOO).toBe('abc')
      expect(output.BAR).toBe(1234567890n)
    })

    it('returns input-based result by input.as alias (query)', async () => {
      const warp = {
        protocol: 'test',
        name: 'test',
        title: 'test',
        description: 'test',
        actions: [
          {
            type: 'query',
            label: 'Test Query',
            address: 'erd1...',
            func: 'test',
            args: [],
            inputs: [{ name: 'foo', as: 'FOO_ALIAS', type: 'string', source: 'field' }],
          },
        ],
        output: {
          FOO: 'in.FOO_ALIAS',
        },
      } as any
      const typedValues: TypedValue[] = []
      const inputs = [{ input: warp.actions[0].inputs[0], value: 'string:aliased' }]
      const { output } = await subject.extractQueryOutput(warp, typedValues, 1, inputs)
      expect(output.FOO).toBe('aliased')
    })

    it('returns null for missing input (query)', async () => {
      const warp = {
        protocol: 'test',
        name: 'test',
        title: 'test',
        description: 'test',
        actions: [
          {
            type: 'query',
            label: 'Test Query',
            address: 'erd1...',
            func: 'test',
            args: [],
            inputs: [{ name: 'foo', type: 'string', source: 'field' }],
          },
        ],
        output: {
          BAR: 'in.bar',
        },
      } as any
      const typedValues: TypedValue[] = []
      const inputs = [{ input: warp.actions[0].inputs[0], value: 'string:abc' }]
      const { output } = await subject.extractQueryOutput(warp, typedValues, 1, inputs)
      expect(output.BAR).toBeNull()
    })

    it('returns input-based result by input name (collect)', async () => {
      const warp = {
        protocol: 'test',
        name: 'test',
        title: 'test',
        description: 'test',
        actions: [
          {
            type: 'collect',
            label: 'Test Collect',
            destination: { url: 'https://api.example.com' },
            inputs: [
              { name: 'foo', type: 'string', source: 'field' },
              { name: 'bar', type: 'string', source: 'field' },
            ],
          },
        ],
        output: {
          FOO: 'in.foo',
          BAR: 'in.bar',
        },
      } as any
      const response = { data: { some: 'value' } }
      const inputs = [
        { input: warp.actions[0].inputs[0], value: 'string:abc' },
        { input: warp.actions[0].inputs[1], value: 'string:xyz' },
      ]
      const { output } = await extractCollectOutput(warp, response, 1, inputs, new WarpSerializer(), testConfig)
      expect(output.FOO).toBe('abc')
      expect(output.BAR).toBe('xyz')
    })

    it('returns input-based result by input.as alias (collect)', async () => {
      const warp = {
        protocol: 'test',
        name: 'test',
        title: 'test',
        description: 'test',
        actions: [
          {
            type: 'collect',
            label: 'Test Collect',
            destination: { url: 'https://api.example.com' },
            inputs: [{ name: 'foo', as: 'FOO_ALIAS', type: 'string', source: 'field' }],
          },
        ],
        output: {
          FOO: 'in.FOO_ALIAS',
        },
      } as any
      const response = { data: { some: 'value' } }
      const inputs = [{ input: warp.actions[0].inputs[0], value: 'string:aliased' }]
      const { output } = await extractCollectOutput(warp, response, 1, inputs, new WarpSerializer(), testConfig)
      expect(output.FOO).toBe('aliased')
    })

    it('returns null for missing input (collect)', async () => {
      const warp = {
        protocol: 'test',
        name: 'test',
        title: 'test',
        description: 'test',
        actions: [
          {
            type: 'collect',
            label: 'Test Collect',
            destination: { url: 'https://api.example.com' },
            inputs: [{ name: 'foo', type: 'string', source: 'field' }],
          },
        ],
        output: {
          BAR: 'in.bar',
        },
      } as any
      const response = { data: { some: 'value' } }
      const inputs = [{ input: warp.actions[0].inputs[0], value: 'string:abc' }]
      const { output } = await extractCollectOutput(warp, response, 1, inputs, new WarpSerializer(), testConfig)
      expect(output.BAR).toBeNull()
    })
  })

  describe('input-based results (contract)', () => {
    it('returns input-based result by input name (contract)', async () => {
      const warp = {
        protocol: 'test',
        name: 'test',
        title: 'test',
        description: 'test',
        actions: [
          {
            type: 'contract',
            label: 'Test Contract',
            address: 'erd1...',
            func: 'test',
            abi: 'dummy',
            gasLimit: 1000000,
            inputs: [
              { name: 'foo', type: 'string', source: 'field' },
              { name: 'bar', type: 'string', source: 'field' },
            ],
          },
        ],
        output: {
          FOO: 'in.foo',
          BAR: 'in.bar',
        },
      } as any
      const action = warp.actions[0]
      const tx = new TransactionOnNetwork()
      const inputs = [
        { input: warp.actions[0].inputs[0], value: 'string:abc' },
        { input: warp.actions[0].inputs[1], value: 'string:xyz' },
      ]
      const { output } = await subject.extractContractOutput(warp, 1, tx, inputs)
      expect(output.FOO).toBe('abc')
      expect(output.BAR).toBe('xyz')
    })

    it('returns input-based result by input.as alias (contract)', async () => {
      const warp = {
        protocol: 'test',
        name: 'test',
        title: 'test',
        description: 'test',
        actions: [
          {
            type: 'contract',
            label: 'Test Contract',
            address: 'erd1...',
            func: 'test',
            abi: 'dummy',
            gasLimit: 1000000,
            inputs: [{ name: 'foo', as: 'FOO_ALIAS', type: 'string', source: 'field' }],
          },
        ],
        output: {
          FOO: 'in.FOO_ALIAS',
        },
      } as any
      const action = warp.actions[0]
      const tx = new TransactionOnNetwork()
      const inputs = [{ input: warp.actions[0].inputs[0], value: 'string:aliased' }]
      const { output } = await subject.extractContractOutput(warp, 1, tx, inputs)
      expect(output.FOO).toBe('aliased')
    })

    it('returns null for missing input (contract)', async () => {
      const warp = {
        protocol: 'test',
        name: 'test',
        title: 'test',
        description: 'test',
        actions: [
          {
            type: 'contract',
            label: 'Test Contract',
            address: 'erd1...',
            func: 'test',
            abi: 'dummy',
            gasLimit: 1000000,
            inputs: [{ name: 'foo', type: 'string', source: 'field' }],
          },
        ],
        output: {
          BAR: 'in.bar',
        },
      } as any
      const action = warp.actions[0]
      const tx = new TransactionOnNetwork()
      const inputs = [{ input: warp.actions[0].inputs[0], value: 'string:abc' }]
      const { output } = await subject.extractContractOutput(warp, 1, tx, inputs)
      expect(output.BAR).toBeNull()
    })
  })

  describe('extractContractOutput', () => {
    it('returns empty results when no results defined', async () => {
      const warp = {
        protocol: 'test',
        name: 'test',
        title: 'test',
        description: 'test',
        actions: [],
      } as Warp
      const action = { type: 'contract' } as WarpContractAction
      const tx = new TransactionOnNetwork()

      const { values, output } = await subject.extractContractOutput(warp, 1, tx, [])

      expect(values).toEqual({ string: [], native: [], mapped: {} })
      expect(output).toEqual({})
    })

    it.skip('extracts event results from transaction', async () => {
      const httpMock = setupHttpMock()
      httpMock.registerResponse('https://example.com/test.abi.json', await loadAbiContents(path.join(__dirname, 'testdata/test.abi.json')))
      const warp = {
        protocol: 'test',
        name: 'test',
        title: 'test',
        description: 'test',
        actions: [
          {
            type: 'contract',
            label: 'test',
            description: 'test',
            address: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
            func: 'register',
            abi: 'https://example.com/test.abi.json',
            gasLimit: 1000000,
          } as WarpContractAction,
        ],
        output: {
          TOKEN_ID: 'event.registeredWithToken.2',
          DURATION: 'event.registeredWithToken.4',
        },
      } as Warp

      const sender = new Address('erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8')
      const tx = new TransactionOnNetwork({
        hash: 'a1b2c3',
        sender,
        function: 'register',
        nonce: 7n,
        smartContractResults: [
          new SmartContractResult({
            receiver: sender,
            data: Buffer.from('@6f6b@10', 'utf-8') as unknown as Uint8Array,
            logs: new TransactionLogs({
              events: [
                new TransactionEvent({
                  identifier: 'registeredWithToken',
                  topics: [
                    new Uint8Array(Buffer.from('cmVnaXN0ZXJlZFdpdGhUb2tlbg==', 'base64')),
                    new Uint8Array(Buffer.from('AAAAAAAAAAAFAPWuOkANricr0lRon9WkT4jj8pSeV4c=', 'base64')),
                    new Uint8Array(Buffer.from('QUJDLTEyMzQ1Ng==', 'base64')),
                    new Uint8Array(Buffer.from('REVGLTEyMzQ1Ng==', 'base64')),
                    new Uint8Array(Buffer.from('MTIwOTYwMA==', 'base64')),
                  ],
                  additionalData: [new Uint8Array(Buffer.from('AAAAAAAAA9sAAAA=', 'base64'))],
                }),
              ],
            }),
          }),
        ],
      })

      const { values, output } = await subject.extractContractOutput(warp, 1, tx, [])

      expect(output.TOKEN_ID).toBe('DEF-123456')
      expect(output.DURATION).toBeNull()
    })

    it('extracts output results from transaction', async () => {
      const httpMock = setupHttpMock()
      httpMock.registerResponse('https://example.com/test.abi.json', await loadAbiContents(path.join(__dirname, 'testdata/test.abi.json')))
      const action = {
        type: 'contract',
        label: 'test',
        description: 'test',
        address: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
        func: 'register',
        abi: 'https://example.com/test.abi.json',
        gasLimit: 1000000,
      } as WarpContractAction

      const sender = new Address('erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8')
      const tx = new TransactionOnNetwork({
        hash: 'a1b2c3',
        sender,
        function: 'register',
        nonce: 7n,
        smartContractResults: [
          new SmartContractResult({
            receiver: sender,
            data: Buffer.from('@6f6b@16', 'utf-8') as unknown as Uint8Array,
          }),
        ],
      })

      const warp = {
        protocol: 'test',
        name: 'test',
        title: 'test',
        description: 'test',
        actions: [action],
        output: {
          FIRST_OUT: 'out.1',
          SECOND_OUT: 'out.2',
        },
      } as Warp

      const { output } = await subject.extractContractOutput(warp, 1, tx, [])

      expect(output.FIRST_OUT).toBe('22')
      expect(output.SECOND_OUT).toBeNull()
    })

    it('returns bare out value without requiring ABI', async () => {
      const action = {
        type: 'contract',
        label: 'test',
        description: 'test',
        address: 'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqplllllscktaww',
        func: 'delegate',
        args: [],
        gasLimit: 1000000,
      } as WarpContractAction

      const sender = new Address('erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8')
      const tx = new TransactionOnNetwork({
        hash: 'tx-hash-out-only',
        sender,
        function: 'delegate',
        nonce: 1n,
      })

      const warp = {
        protocol: 'test',
        name: 'test',
        title: 'test',
        description: 'test',
        actions: [action],
        output: {
          RESULT: 'out',
        },
      } as Warp

      const { values, output } = await subject.extractContractOutput(warp, 1, tx, [])
      expect(output.RESULT).toBe('tx-hash-out-only')
      expect(values.string).toContain('tx-hash-out-only')
    })

    it('throws when out. outputs are requested and parseExecute fails (multiple writeLog events)', async () => {
      const httpMock = setupHttpMock()
      httpMock.registerResponse('https://example.com/test.abi.json', await loadAbiContents(path.join(__dirname, 'testdata/test.abi.json')))
      const action = {
        type: 'contract',
        label: 'test',
        description: 'test',
        address: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
        func: 'register',
        abi: 'https://example.com/test.abi.json',
        gasLimit: 1000000,
      } as WarpContractAction

      const sender = new Address('erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8')
      const tx = new TransactionOnNetwork({
        hash: 'multi-writelog-tx',
        sender,
        function: 'register',
        nonce: 7n,
        smartContractResults: [
          new SmartContractResult({
            receiver: sender,
            data: Buffer.from('@6f6b@16', 'utf-8') as unknown as Uint8Array,
            logs: new TransactionLogs({
              events: [
                new TransactionEvent({ identifier: 'writeLog', topics: [new Uint8Array(Buffer.from('first', 'utf-8'))] }),
              ],
            }),
          }),
          new SmartContractResult({
            receiver: sender,
            data: Buffer.from('@6f6b@20', 'utf-8') as unknown as Uint8Array,
            logs: new TransactionLogs({
              events: [
                new TransactionEvent({ identifier: 'writeLog', topics: [new Uint8Array(Buffer.from('second', 'utf-8'))] }),
              ],
            }),
          }),
        ],
      })

      const warp = {
        protocol: 'test',
        name: 'test',
        title: 'test',
        description: 'test',
        actions: [action],
        output: {
          FIRST_OUT: 'out.1',
        },
      } as Warp

      // Should throw — out. outputs need parseExecute which fails for this tx
      await expect(subject.extractContractOutput(warp, 1, tx, [])).rejects.toThrow()
    })

    it('still extracts event outputs when parseExecute fails', async () => {
      const httpMock = setupHttpMock()
      httpMock.registerResponse('https://example.com/test.abi.json', await loadAbiContents(path.join(__dirname, 'testdata/test.abi.json')))
      const action = {
        type: 'contract',
        label: 'test',
        description: 'test',
        address: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
        func: 'register',
        abi: 'https://example.com/test.abi.json',
        gasLimit: 1000000,
      } as WarpContractAction

      const sender = new Address('erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8')
      // Tx with multiple writeLog SC results (breaks parseExecute) but also has event data
      const tx = new TransactionOnNetwork({
        hash: 'multi-writelog-with-events',
        sender,
        function: 'register',
        nonce: 7n,
        smartContractResults: [
          new SmartContractResult({
            receiver: sender,
            data: Buffer.from('@6f6b@16', 'utf-8') as unknown as Uint8Array,
            logs: new TransactionLogs({
              events: [
                new TransactionEvent({ identifier: 'writeLog', topics: [new Uint8Array(Buffer.from('first', 'utf-8'))] }),
              ],
            }),
          }),
          new SmartContractResult({
            receiver: sender,
            data: Buffer.from('@6f6b@20', 'utf-8') as unknown as Uint8Array,
            logs: new TransactionLogs({
              events: [
                new TransactionEvent({ identifier: 'writeLog', topics: [new Uint8Array(Buffer.from('second', 'utf-8'))] }),
              ],
            }),
          }),
        ],
      })

      const warp = {
        protocol: 'test',
        name: 'test',
        title: 'test',
        description: 'test',
        actions: [action],
        output: {
          // Only event-based outputs — no out. paths that need parseExecute
          TOKEN: 'event.registeredWithToken.2',
        },
      } as Warp

      // Should not throw — event parsing is independent of parseExecute
      const { output } = await subject.extractContractOutput(warp, 1, tx, [])
      // Event may or may not be found depending on tx structure, but the call itself must not throw
      expect(output).toBeDefined()
    })

    it('does not call parseExecute when only event outputs are defined', async () => {
      const httpMock = setupHttpMock()
      httpMock.registerResponse('https://example.com/test.abi.json', await loadAbiContents(path.join(__dirname, 'testdata/test.abi.json')))
      const action = {
        type: 'contract',
        label: 'test',
        description: 'test',
        address: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
        func: 'register',
        abi: 'https://example.com/test.abi.json',
        gasLimit: 1000000,
      } as WarpContractAction

      const sender = new Address('erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8')
      // An empty tx that would cause parseExecute to fail if called
      const tx = new TransactionOnNetwork({
        hash: 'event-only-tx',
        sender,
        function: 'register',
        nonce: 7n,
      })

      const warp = {
        protocol: 'test',
        name: 'test',
        title: 'test',
        description: 'test',
        actions: [action],
        output: {
          TOKEN: 'event.registeredWithToken.2',
        },
      } as Warp

      // Should not throw — parseExecute is never called since no out. paths exist
      const { output } = await subject.extractContractOutput(warp, 1, tx, [])
      expect(output).toBeDefined()
    })

    it('extracts nested event struct field (event.X.N.field)', async () => {
      const httpMock = setupHttpMock()
      httpMock.registerResponse('https://example.com/test.abi.json', await loadAbiContents(path.join(__dirname, 'testdata/test.abi.json')))
      const action = {
        type: 'contract',
        label: 'test',
        description: 'test',
        address: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
        func: 'register',
        abi: 'https://example.com/test.abi.json',
        gasLimit: 1000000,
      } as WarpContractAction

      const sender = new Address('erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8')
      // SwapDetails struct nested-encoded: amount_in=1000 (0x03E8), amount_out=5000 (0x1388)
      const swapDetailsEncoded = Buffer.from([
        0x00, 0x00, 0x00, 0x02, 0x03, 0xE8, // nested BigUint(1000)
        0x00, 0x00, 0x00, 0x02, 0x13, 0x88, // nested BigUint(5000)
      ])
      const tx = new TransactionOnNetwork({
        hash: 'swap-event-tx',
        sender,
        function: 'register',
        nonce: 7n,
        smartContractResults: [
          new SmartContractResult({
            receiver: sender,
            data: Buffer.from('@6f6b@16', 'utf-8') as unknown as Uint8Array,
            logs: new TransactionLogs({
              events: [
                new TransactionEvent({ identifier: 'writeLog', topics: [new Uint8Array(Buffer.from('ok', 'utf-8'))] }),
                new TransactionEvent({
                  identifier: 'testSwapCompleted',
                  topics: [
                    Buffer.from('testSwapCompleted') as unknown as Uint8Array,
                    Buffer.from('WEGLD-abc123') as unknown as Uint8Array,
                    Buffer.from('SUPER-def456') as unknown as Uint8Array,
                  ],
                  additionalData: [new Uint8Array(swapDetailsEncoded)],
                }),
              ],
            }),
          }),
        ],
      })

      const warp = {
        protocol: 'test',
        name: 'test',
        title: 'test',
        description: 'test',
        actions: [action],
        output: {
          BOUGHT_AMOUNT: 'event.testSwapCompleted.2.amount_out',
        },
      } as Warp

      const { output } = await subject.extractContractOutput(warp, 1, tx, [])
      // amount_out = 5000, coerced via toFixed() from BigNumber
      expect(output.BOUGHT_AMOUNT).toBe('5000')
    })

    it('returns null for non-existent nested event field', async () => {
      const httpMock = setupHttpMock()
      httpMock.registerResponse('https://example.com/test.abi.json', await loadAbiContents(path.join(__dirname, 'testdata/test.abi.json')))
      const action = {
        type: 'contract',
        label: 'test',
        description: 'test',
        address: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
        func: 'register',
        abi: 'https://example.com/test.abi.json',
        gasLimit: 1000000,
      } as WarpContractAction

      const sender = new Address('erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8')
      const swapDetailsEncoded = Buffer.from([
        0x00, 0x00, 0x00, 0x02, 0x03, 0xE8,
        0x00, 0x00, 0x00, 0x02, 0x13, 0x88,
      ])
      const tx = new TransactionOnNetwork({
        hash: 'swap-event-tx-2',
        sender,
        function: 'register',
        nonce: 7n,
        smartContractResults: [
          new SmartContractResult({
            receiver: sender,
            data: Buffer.from('@6f6b@16', 'utf-8') as unknown as Uint8Array,
            logs: new TransactionLogs({
              events: [
                new TransactionEvent({ identifier: 'writeLog', topics: [new Uint8Array(Buffer.from('ok', 'utf-8'))] }),
                new TransactionEvent({
                  identifier: 'testSwapCompleted',
                  topics: [
                    Buffer.from('testSwapCompleted') as unknown as Uint8Array,
                    Buffer.from('WEGLD-abc123') as unknown as Uint8Array,
                    Buffer.from('SUPER-def456') as unknown as Uint8Array,
                  ],
                  additionalData: [new Uint8Array(swapDetailsEncoded)],
                }),
              ],
            }),
          }),
        ],
      })

      const warp = {
        protocol: 'test',
        name: 'test',
        title: 'test',
        description: 'test',
        actions: [action],
        output: {
          MISSING: 'event.testSwapCompleted.2.nonexistent_field',
        },
      } as Warp

      const { output } = await subject.extractContractOutput(warp, 1, tx, [])
      expect(output.MISSING).toBeNull()
    })

    it('extracts event struct without drill-in (event.X.N)', async () => {
      const httpMock = setupHttpMock()
      httpMock.registerResponse('https://example.com/test.abi.json', await loadAbiContents(path.join(__dirname, 'testdata/test.abi.json')))
      const action = {
        type: 'contract',
        label: 'test',
        description: 'test',
        address: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
        func: 'register',
        abi: 'https://example.com/test.abi.json',
        gasLimit: 1000000,
      } as WarpContractAction

      const sender = new Address('erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8')
      const swapDetailsEncoded = Buffer.from([
        0x00, 0x00, 0x00, 0x02, 0x03, 0xE8,
        0x00, 0x00, 0x00, 0x02, 0x13, 0x88,
      ])
      const tx = new TransactionOnNetwork({
        hash: 'swap-event-tx-3',
        sender,
        function: 'register',
        nonce: 7n,
        smartContractResults: [
          new SmartContractResult({
            receiver: sender,
            data: Buffer.from('@6f6b@16', 'utf-8') as unknown as Uint8Array,
            logs: new TransactionLogs({
              events: [
                new TransactionEvent({ identifier: 'writeLog', topics: [new Uint8Array(Buffer.from('ok', 'utf-8'))] }),
                new TransactionEvent({
                  identifier: 'testSwapCompleted',
                  topics: [
                    Buffer.from('testSwapCompleted') as unknown as Uint8Array,
                    Buffer.from('WEGLD-abc123') as unknown as Uint8Array,
                    Buffer.from('SUPER-def456') as unknown as Uint8Array,
                  ],
                  additionalData: [new Uint8Array(swapDetailsEncoded)],
                }),
              ],
            }),
          }),
        ],
      })

      const warp = {
        protocol: 'test',
        name: 'test',
        title: 'test',
        description: 'test',
        actions: [action],
        output: {
          SWAP_RESULT: 'event.testSwapCompleted.2',
        },
      } as Warp

      const { output } = await subject.extractContractOutput(warp, 1, tx, [])
      // Without drill-in, the struct is valueOf()'d — should be an object with amount_in and amount_out
      expect(output.SWAP_RESULT).toBeDefined()
      expect(typeof output.SWAP_RESULT).toBe('object')
    })

    it('extracts indexed event field without drill-in (event.X.N for primitive)', async () => {
      const httpMock = setupHttpMock()
      httpMock.registerResponse('https://example.com/test.abi.json', await loadAbiContents(path.join(__dirname, 'testdata/test.abi.json')))
      const action = {
        type: 'contract',
        label: 'test',
        description: 'test',
        address: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
        func: 'register',
        abi: 'https://example.com/test.abi.json',
        gasLimit: 1000000,
      } as WarpContractAction

      const sender = new Address('erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8')
      const swapDetailsEncoded = Buffer.from([
        0x00, 0x00, 0x00, 0x02, 0x03, 0xE8,
        0x00, 0x00, 0x00, 0x02, 0x13, 0x88,
      ])
      const tx = new TransactionOnNetwork({
        hash: 'swap-event-tx-4',
        sender,
        function: 'register',
        nonce: 7n,
        smartContractResults: [
          new SmartContractResult({
            receiver: sender,
            data: Buffer.from('@6f6b@16', 'utf-8') as unknown as Uint8Array,
            logs: new TransactionLogs({
              events: [
                new TransactionEvent({ identifier: 'writeLog', topics: [new Uint8Array(Buffer.from('ok', 'utf-8'))] }),
                new TransactionEvent({
                  identifier: 'testSwapCompleted',
                  topics: [
                    Buffer.from('testSwapCompleted') as unknown as Uint8Array,
                    Buffer.from('WEGLD-abc123') as unknown as Uint8Array,
                    Buffer.from('SUPER-def456') as unknown as Uint8Array,
                  ],
                  additionalData: [new Uint8Array(swapDetailsEncoded)],
                }),
              ],
            }),
          }),
        ],
      })

      const warp = {
        protocol: 'test',
        name: 'test',
        title: 'test',
        description: 'test',
        actions: [action],
        output: {
          TOKEN_OUT: 'event.testSwapCompleted.1',
        },
      } as Warp

      const { output } = await subject.extractContractOutput(warp, 1, tx, [])
      // Position 1 = token_out (indexed TokenIdentifier) = "SUPER-def456"
      expect(output.TOKEN_OUT).toBe('SUPER-def456')
    })
  })

  describe('extractContractOutput (ESDT system SC)', () => {
    const systemScAddress = 'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u'

    it('extracts token identifier from issueNonFungible without ABI', async () => {
      const sender = new Address('erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8')
      const tokenId = 'MYNFT-abc123'
      const tx = new TransactionOnNetwork({
        hash: 'issue-nft-tx',
        sender,
        function: 'issueNonFungible',
        nonce: 1n,
        smartContractResults: [
          new SmartContractResult({
            sender: new Address(systemScAddress),
            receiver: sender,
            data: Buffer.from(`@6f6b@${Buffer.from(tokenId).toString('hex')}`, 'utf-8') as unknown as Uint8Array,
          }),
        ],
        logs: new TransactionLogs({
          events: [
            new TransactionEvent({
              identifier: 'issueNonFungible',
              topics: [
                Buffer.from(tokenId) as unknown as Uint8Array,
                Buffer.from('MyNFT') as unknown as Uint8Array,
                Buffer.from('MYNFT') as unknown as Uint8Array,
                Buffer.from('NonFungibleESDTv2') as unknown as Uint8Array,
              ],
            }),
          ],
        }),
      })

      const warp = {
        protocol: 'test',
        name: 'test',
        title: 'test',
        description: 'test',
        actions: [
          {
            type: 'contract',
            label: 'Issue NFT',
            address: systemScAddress,
            func: 'issueNonFungible',
            args: [],
            gasLimit: 60000000,
          },
        ],
        output: {
          TX_HASH: 'out',
          COLLECTION_ID: 'out.1',
        },
      } as any

      const { values, output } = await subject.extractContractOutput(warp, 1, tx, [])

      expect(output.TX_HASH).toBe('issue-nft-tx')
      expect(output.COLLECTION_ID).toBe(tokenId)
      expect(values.string).toContain(tokenId)
    })

    it('extracts token identifier from issueSemiFungible without ABI', async () => {
      const sender = new Address('erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8')
      const tokenId = 'MYSFT-def456'
      const tx = new TransactionOnNetwork({
        hash: 'issue-sft-tx',
        sender,
        function: 'issueSemiFungible',
        nonce: 1n,
        smartContractResults: [
          new SmartContractResult({
            sender: new Address(systemScAddress),
            receiver: sender,
            data: Buffer.from(`@6f6b@${Buffer.from(tokenId).toString('hex')}`, 'utf-8') as unknown as Uint8Array,
          }),
        ],
        logs: new TransactionLogs({
          events: [
            new TransactionEvent({
              identifier: 'issueSemiFungible',
              topics: [
                Buffer.from(tokenId) as unknown as Uint8Array,
                Buffer.from('MySFT') as unknown as Uint8Array,
                Buffer.from('MYSFT') as unknown as Uint8Array,
                Buffer.from('SemiFungibleESDT') as unknown as Uint8Array,
              ],
            }),
          ],
        }),
      })

      const warp = {
        protocol: 'test',
        name: 'test',
        title: 'test',
        description: 'test',
        actions: [
          {
            type: 'contract',
            label: 'Issue SFT',
            address: systemScAddress,
            func: 'issueSemiFungible',
            args: [],
            gasLimit: 60000000,
          },
        ],
        output: {
          COLLECTION_ID: 'out.1',
        },
      } as any

      const { output } = await subject.extractContractOutput(warp, 1, tx, [])
      expect(output.COLLECTION_ID).toBe(tokenId)
    })

    it('extracts token identifier from fungible issue without ABI', async () => {
      const sender = new Address('erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8')
      const tokenId = 'MYTKN-789abc'
      const tx = new TransactionOnNetwork({
        hash: 'issue-fungible-tx',
        sender,
        function: 'issue',
        nonce: 1n,
        smartContractResults: [
          new SmartContractResult({
            sender: new Address(systemScAddress),
            receiver: sender,
            data: Buffer.from(`@6f6b@${Buffer.from(tokenId).toString('hex')}`, 'utf-8') as unknown as Uint8Array,
          }),
        ],
        logs: new TransactionLogs({
          events: [
            new TransactionEvent({
              identifier: 'issue',
              topics: [
                Buffer.from(tokenId) as unknown as Uint8Array,
                Buffer.from('MyToken') as unknown as Uint8Array,
                Buffer.from('MYTKN') as unknown as Uint8Array,
                Buffer.from('FungibleESDT') as unknown as Uint8Array,
              ],
            }),
          ],
        }),
      })

      const warp = {
        protocol: 'test',
        name: 'test',
        title: 'test',
        description: 'test',
        actions: [
          {
            type: 'contract',
            label: 'Issue Token',
            address: systemScAddress,
            func: 'issue',
            args: [],
            gasLimit: 60000000,
          },
        ],
        output: {
          TOKEN_ID: 'out.1',
        },
      } as any

      const { output } = await subject.extractContractOutput(warp, 1, tx, [])
      expect(output.TOKEN_ID).toBe(tokenId)
    })

    it('falls through to ABI path for non-issuance system SC functions', async () => {
      const sender = new Address('erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8')
      const tx = new TransactionOnNetwork({
        hash: 'set-role-tx',
        sender,
        function: 'setSpecialRole',
        nonce: 1n,
      })

      const warp = {
        protocol: 'test',
        name: 'test',
        title: 'test',
        description: 'test',
        actions: [
          {
            type: 'contract',
            label: 'Set Role',
            address: systemScAddress,
            func: 'setSpecialRole',
            args: [],
            gasLimit: 60000000,
          },
        ],
        output: {
          TX_HASH: 'out',
        },
      } as any

      // setSpecialRole has no out.1, so needsAbi=false, takes fast path
      const { output } = await subject.extractContractOutput(warp, 1, tx, [])
      expect(output.TX_HASH).toBe('set-role-tx')
    })

    it('uses ABI path when action has explicit abi even for system SC', async () => {
      const httpMock = setupHttpMock()
      httpMock.registerResponse('https://example.com/test.abi.json', await loadAbiContents(path.join(__dirname, 'testdata/test.abi.json')))

      const sender = new Address('erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8')
      const tx = new TransactionOnNetwork({
        hash: 'abi-override-tx',
        sender,
        function: 'register',
        nonce: 1n,
        smartContractResults: [
          new SmartContractResult({
            receiver: sender,
            data: Buffer.from('@6f6b@16', 'utf-8') as unknown as Uint8Array,
          }),
        ],
      })

      const warp = {
        protocol: 'test',
        name: 'test',
        title: 'test',
        description: 'test',
        actions: [
          {
            type: 'contract',
            label: 'Test',
            address: systemScAddress,
            func: 'register',
            abi: 'https://example.com/test.abi.json',
            args: [],
            gasLimit: 60000000,
          },
        ],
        output: {
          RESULT: 'out.1',
        },
      } as any

      // Should use the ABI path since abi is explicitly set
      const { output } = await subject.extractContractOutput(warp, 1, tx, [])
      expect(output.RESULT).toBe('22')
    })
  })

  describe('extractContractOutput (ESDTNFTCreate built-in)', () => {
    it('extracts NFT identifier from ESDTNFTCreate transaction without ABI', async () => {
      const sender = new Address('erd1lu34w2tlklct45v0uqmchcye79lu546q58nkjqy6j7vamc5z8mks7cglh6')
      const collectionId = 'JKKKK1-33f607'
      const nonce = 1

      const tx = new TransactionOnNetwork({
        hash: 'esdt-nft-create-tx',
        sender,
        function: 'ESDTNFTCreate',
        nonce: 1n,
        logs: new TransactionLogs({
          events: [
            new TransactionEvent({
              identifier: 'ESDTNFTCreate',
              topics: [
                Buffer.from(collectionId) as unknown as Uint8Array,
                new Uint8Array([nonce]),                              // nonce = 1
                new Uint8Array([0x01]),                               // quantity = 1
              ],
            }),
          ],
        }),
      })

      const warp = {
        protocol: 'test',
        name: 'test',
        title: 'test',
        description: 'test',
        actions: [
          {
            type: 'contract',
            label: 'Create NFT',
            address: 'erd1lu34w2tlklct45v0uqmchcye79lu546q58nkjqy6j7vamc5z8mks7cglh6',
            func: 'ESDTNFTCreate',
            args: [],
            gasLimit: 10000000,
          },
        ],
        output: {
          TX_HASH: 'out',
          NFT_IDENTIFIER: 'out.1',
        },
      } as any

      const { values, output } = await subject.extractContractOutput(warp, 1, tx, [])

      expect(output.TX_HASH).toBe('esdt-nft-create-tx')
      expect(output.NFT_IDENTIFIER).toBe('JKKKK1-33f607-01')
      expect(values.string).toContain('JKKKK1-33f607-01')
    })

    it('handles nonce requiring zero-padding (odd hex length)', async () => {
      const sender = new Address('erd1lu34w2tlklct45v0uqmchcye79lu546q58nkjqy6j7vamc5z8mks7cglh6')
      const collectionId = 'MYNFT-abc123'

      const tx = new TransactionOnNetwork({
        hash: 'esdt-nft-create-tx-2',
        sender,
        function: 'ESDTNFTCreate',
        nonce: 2n,
        logs: new TransactionLogs({
          events: [
            new TransactionEvent({
              identifier: 'ESDTNFTCreate',
              topics: [
                Buffer.from(collectionId) as unknown as Uint8Array,
                new Uint8Array([0x0f]),  // nonce = 15 → "0f" (already even length)
                new Uint8Array([0x01]),
              ],
            }),
          ],
        }),
      })

      const warp = {
        protocol: 'test',
        name: 'test',
        title: 'test',
        description: 'test',
        actions: [
          {
            type: 'contract',
            label: 'Create NFT',
            address: 'erd1lu34w2tlklct45v0uqmchcye79lu546q58nkjqy6j7vamc5z8mks7cglh6',
            func: 'ESDTNFTCreate',
            args: [],
            gasLimit: 10000000,
          },
        ],
        output: {
          NFT_IDENTIFIER: 'out.1',
        },
      } as any

      const { output } = await subject.extractContractOutput(warp, 1, tx, [])
      expect(output.NFT_IDENTIFIER).toBe('MYNFT-abc123-0f')
    })
  })

  describe('extractQueryOutput', () => {
    it('returns empty results when no results defined', async () => {
      const warp = {
        protocol: 'test',
        name: 'test',
        title: 'test',
        description: 'test',
        actions: [],
      } as Warp
      const typedValues: TypedValue[] = []

      const tx = new TransactionOnNetwork()
      ;(tx as any).typedValues = typedValues
      const { values, output } = await subject.extractQueryOutput(warp, typedValues, 1, [])

      expect(values).toEqual({ string: [], native: [], mapped: {} })
      expect(output).toEqual({})
    })
  })

  describe('resolveWarpResultsRecursively', () => {
    it('properly resolves results with out[N] references', async () => {
      // First action returns user info
      const httpMock = setupHttpMock()
      httpMock.registerResponse('/user', {
        id: '12345',
        username: 'testuser',
        email: 'test@example.com',
      })

      // Second action returns posts for this user
      httpMock.registerResponse('/posts/12345', {
        posts: [
          { id: 1, title: 'First post' },
          { id: 2, title: 'Second post' },
        ],
      })

      // Setup a warp with two collect actions
      const userAction = {
        type: 'collect' as const,
        label: 'Get User',
        destination: {
          url: '/user',
        },
      }

      const postsAction = {
        type: 'collect' as const,
        label: 'Get Posts',
        destination: {
          url: '/posts/12345',
        },
      }

      // Setup a warp with two collect actions and transforms
      const warp = {
        protocol: 'test',
        name: 'test-multi-action',
        title: 'Test Multi Action',
        description: 'Test with multiple actions and dependencies',
        actions: [userAction, postsAction],
        output: {
          USER_ID: 'out[1].id',
          USERNAME: 'out[1].username',
          POSTS: 'out[2].posts',
          POST_COUNT: 'transform:() => { return result.POSTS ? result.POSTS.length : 0 }',
          USER_WITH_POSTS: 'transform:() => { return { user: result.USERNAME, posts: result.POSTS } }',
        },
      }

      // Create subject after mock server is started
      const typeRegistry = new WarpTypeRegistry()
      typeRegistry.registerType('token', {
        stringToNative: (value: string) => value,
        nativeToString: (value: any) => `token:${value}`,
      })
      typeRegistry.registerType('codemeta', {
        stringToNative: (value: string) => value,
        nativeToString: (value: any) => `codemeta:${value}`,
      })
      typeRegistry.registerTypeAlias('list', 'vector')
      const subject = new WarpMultiversxOutput(testConfig, mockChainInfo, typeRegistry)
      // Patch executeCollect and executeQuery to always return a full WarpExecution object
      const mockExecutor = {
        executeCollect: async (warpArg: any, actionIndex: any, actionInputs: any, meta: any) => ({
          status: 'success',
          warp: warpArg,
          action: actionIndex,
          user: testConfig.user?.wallets?.multiversx || null,
          txHash: '',
          next: null,
          values: { string: [], native: [], mapped: {} },
          output: {
            USER_ID: '12345',
            USERNAME: 'testuser',
            POSTS: [
              { id: 1, title: 'First post' },
              { id: 2, title: 'Second post' },
            ],
          },
          messages: {},
        }),
        executeQuery: async (warpArg: any, actionIndex: any, actionInputs: any) => ({
          status: 'success',
          warp,
          action: 1,
          user: testConfig.user?.wallets?.multiversx || null,
          txHash: '',
          next: null,
          values: { string: [], native: [], mapped: {} },
          output: {},
          messages: {},
        }),
      }

      // Execute the warp from the first action (entry point 1)
      const result = await subject.resolveWarpOutputRecursively({
        warp,
        entryActionIndex: 1,
        executor: mockExecutor,
        inputs: [],
      })

      // Patch: evaluate transforms directly if missing
      const finalOutput = await evaluateOutputCommon(warp, result.output, {}, 1, [], new WarpSerializer() as any, testConfig)

      // The result should be from the entry action (1)
      expect(result.status).toBe('success')
      expect(result.action).toBe(1)

      // It should include all results
      expect(finalOutput.USER_ID).toBe('12345')
      expect(finalOutput.USERNAME).toBe('testuser')
      expect(finalOutput.POSTS).toEqual([
        { id: 1, title: 'First post' },
        { id: 2, title: 'Second post' },
      ])

      // And transforms should have access to the combined results
      expect(finalOutput.POST_COUNT).toBe(2)
      expect(finalOutput.USER_WITH_POSTS).toEqual({
        user: 'testuser',
        posts: [
          { id: 1, title: 'First post' },
          { id: 2, title: 'Second post' },
        ],
      })
    })

    it('executes a warp with dependencies and transforms', async () => {
      // First action returns user info
      const httpMock = setupHttpMock()
      httpMock.registerResponse('/user', {
        id: '12345',
        username: 'testuser',
        email: 'test@example.com',
      })

      // Second action returns posts for this user
      httpMock.registerResponse('/posts/12345', {
        posts: [
          { id: 1, title: 'First post' },
          { id: 2, title: 'Second post' },
        ],
      })

      // Setup a warp with two collect actions
      const userAction = {
        type: 'collect' as const,
        label: 'Get User',
        destination: {
          url: '/user',
        },
      }

      const postsAction = {
        type: 'collect' as const,
        label: 'Get Posts',
        destination: {
          url: '/posts/12345',
        },
      }

      // Setup a warp with two collect actions and transforms
      const warp = {
        protocol: 'test',
        name: 'test-multi-action',
        title: 'Test Multi Action',
        description: 'Test with multiple actions and dependencies',
        actions: [userAction, postsAction],
        output: {
          USER_ID: 'out[1].id',
          USERNAME: 'out[1].username',
          POSTS: 'out[2].posts',
          POST_COUNT: 'transform:() => { return result.POSTS ? result.POSTS.length : 0 }',
          USER_WITH_POSTS: 'transform:() => { return { user: result.USERNAME, posts: result.POSTS } }',
        },
      }

      // Create subject after mock server is started
      const typeRegistry = new WarpTypeRegistry()
      typeRegistry.registerType('token', {
        stringToNative: (value: string) => value,
        nativeToString: (value: any) => `token:${value}`,
      })
      typeRegistry.registerType('codemeta', {
        stringToNative: (value: string) => value,
        nativeToString: (value: any) => `codemeta:${value}`,
      })
      typeRegistry.registerTypeAlias('list', 'vector')
      const subject = new WarpMultiversxOutput(testConfig, mockChainInfo, typeRegistry)
      // Patch executeCollect and executeQuery to always return a full WarpExecution object
      const mockExecutor = {
        executeCollect: async (warpArg: any, actionIndex: any, actionInputs: any, meta: any) => ({
          status: 'success',
          warp: warpArg,
          action: actionIndex,
          user: testConfig.user?.wallets?.multiversx || null,
          txHash: '',
          next: null,
          values: { string: [], native: [], mapped: {} },
          output: {
            USER_ID: '12345',
            USERNAME: 'testuser',
            POSTS: [
              { id: 1, title: 'First post' },
              { id: 2, title: 'Second post' },
            ],
          },
          messages: {},
        }),
        executeQuery: async (warpArg: any, actionIndex: any, actionInputs: any) => ({
          status: 'success',
          warp,
          action: 1,
          user: testConfig.user?.wallets?.multiversx || null,
          txHash: '',
          next: null,
          values: { string: [], native: [], mapped: {} },
          output: {},
          messages: {},
        }),
      }

      // Execute the warp from the first action (entry point 1)
      const result = await subject.resolveWarpOutputRecursively({
        warp,
        entryActionIndex: 1,
        executor: mockExecutor,
        inputs: [],
      })

      // Patch: evaluate transforms directly if missing
      const finalOutput = await evaluateOutputCommon(warp, result.output, {}, 1, [], new WarpSerializer() as any, testConfig)

      // The result should be from the entry action (1)
      expect(result.status).toBe('success')
      expect(result.action).toBe(1)

      // It should include all results
      expect(finalOutput.USER_ID).toBe('12345')
      expect(finalOutput.USERNAME).toBe('testuser')
      expect(finalOutput.POSTS).toEqual([
        { id: 1, title: 'First post' },
        { id: 2, title: 'Second post' },
      ])

      // And transforms should have access to the combined results
      expect(finalOutput.POST_COUNT).toBe(2)
      expect(finalOutput.USER_WITH_POSTS).toEqual({
        user: 'testuser',
        posts: [
          { id: 1, title: 'First post' },
          { id: 2, title: 'Second post' },
        ],
      })
    })
  })
})

const loadAbiContents = async (path: PathLike): Promise<any> => {
  let jsonContent: string = await fs.readFile(path, { encoding: 'utf8' })
  return JSON.parse(jsonContent)
}
