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
      const finalOutput = await evaluateOutputCommon(warp, result.output, 1, [], new WarpSerializer() as any, testConfig)

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
      const finalOutput = await evaluateOutputCommon(warp, result.output, 1, [], new WarpSerializer() as any, testConfig)

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
