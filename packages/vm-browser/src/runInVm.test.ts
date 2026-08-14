import { createBrowserTransformRunner, runInVm } from './runInVm'

type MockBlob = {
  source: string
  type: string
}

type MessageHandler = ((event: { data: any }) => void) | null
type ErrorHandler = ((event: { message: string }) => void) | null

const blobs = new Map<string, MockBlob>()
const workers: MockWorker[] = []
let nextUrl = 0

class MockWorker {
  onmessage: MessageHandler = null
  onerror: ErrorHandler = null
  terminate = jest.fn()
  private workerMessage: MessageHandler = null

  constructor(script: string) {
    const workerScope = {
      onmessage: null as MessageHandler,
      postMessage: (data: any) => queueMicrotask(() => this.onmessage?.({ data })),
    }
    new Function('self', script)(workerScope)
    this.workerMessage = workerScope.onmessage
  }

  postMessage = jest.fn((data: any) => queueMicrotask(() => this.workerMessage?.({ data })))
}

const mockBlob = jest.fn(
  (parts: string[], options: { type: string }): MockBlob => ({
    source: parts.join(''),
    type: options.type,
  })
)
const mockCreateObjectURL = jest.fn((blob: MockBlob) => {
  const url = `mock-url-${nextUrl++}`
  blobs.set(url, blob)
  return url
})
const mockRevokeObjectURL = jest.fn((url: string) => blobs.delete(url))
const mockWorker = jest.fn((url: string) => {
  const blob = blobs.get(url)
  if (!blob) throw new Error(`Missing blob for ${url}`)
  const worker = new MockWorker(blob.source)
  workers.push(worker)
  return worker
})

global.Blob = mockBlob as any
global.Worker = mockWorker as any
global.URL.createObjectURL = mockCreateObjectURL
global.URL.revokeObjectURL = mockRevokeObjectURL

describe('runInVm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    blobs.clear()
    workers.length = 0
    nextUrl = 0
  })

  it('should execute arrow function with a single output context', async () => {
    await expect(runInVm('(results) => results.value * 2', [{ value: 5 }])).resolves.toBe(10)
  })

  it('should execute regular function with a single output context', async () => {
    await expect(runInVm('function(results) { return results.value + 3 }', [{ value: 7 }])).resolves.toBe(10)
  })

  it('should execute direct expressions with output globals', async () => {
    const results = {
      out: { balance: '1000' },
      inputs: { value: '2' },
      'asset.token': 'EGLD',
    }

    await expect(
      runInVm('Number(out.balance) + Number(inputs.value) + (results["asset.token"] === "EGLD" ? 1 : 0)', [results])
    ).resolves.toBe(1003)
  })

  it('should spread two arguments into function code', async () => {
    await expect(runInVm('(value, inputs) => value * inputs.multiplier', [4, { multiplier: 3 }])).resolves.toBe(12)
  })

  it('should preserve bigint asset values across arguments', async () => {
    await expect(
      runInVm('(value, inputs) => value.amount + inputs.fee', [
        { identifier: 'USDC-123', amount: 1000000n, decimals: 6 },
        { fee: 2n },
      ])
    ).resolves.toBe(1000002n)
  })

  it('should expose the second argument as inputs in direct expressions', async () => {
    await expect(runInVm('results * inputs.multiplier', [4, { multiplier: 3 }])).resolves.toBe(12)
  })

  it('should prefer the second argument over results.inputs', async () => {
    await expect(runInVm('inputs.value', [{ inputs: { value: 2 } }, { value: 5 }])).resolves.toBe(5)
  })

  it('should reject transform errors', async () => {
    await expect(runInVm('(results) => invalidFunction(results)', [{ value: 5 }])).rejects.toThrow('invalidFunction is not defined')
  })

  it('should reject worker errors', async () => {
    const promise = runInVm('(results) => results.value * 2', [{ value: 5 }])
    workers[0].onerror?.({ message: 'Worker error' })

    await expect(promise).rejects.toThrow('Error in transform: Worker error')
  })

  it('should build a worker script for the argument-array contract', async () => {
    await runInVm('(value, inputs) => value * inputs.multiplier', [4, { multiplier: 3 }])

    const script = mockBlob.mock.calls[0][0].join('')
    expect(script).toContain('const args = e.data')
    expect(script).toContain('const results = args[0]')
    expect(script).toContain('const out = results?.out')
    expect(script).toContain('const inputs = args.length > 1 ? args[1] : results?.inputs')
    expect(script).toContain(')(...args)')
  })

  it('should post the full argument array and clean up resources', async () => {
    const args = [4, { multiplier: 3 }]

    await runInVm('(value, inputs) => value * inputs.multiplier', args)

    expect(workers[0].postMessage).toHaveBeenCalledWith(args)
    expect(workers[0].terminate).toHaveBeenCalled()
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('mock-url-0')
  })
})

describe('createBrowserTransformRunner', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    blobs.clear()
    workers.length = 0
    nextUrl = 0
  })

  it('should create a valid TransformRunner', () => {
    const runner = createBrowserTransformRunner()

    expect(runner).toBeDefined()
    expect(typeof runner.run).toBe('function')
  })

  it('should execute transform through the runner interface', async () => {
    const runner = createBrowserTransformRunner()

    await expect(runner.run('(value, inputs) => value * inputs.multiplier', [4, { multiplier: 3 }])).resolves.toBe(12)
  })
})
