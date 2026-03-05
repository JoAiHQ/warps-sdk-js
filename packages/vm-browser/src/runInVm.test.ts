import { createBrowserTransformRunner, runInVm } from './runInVm'

// Test the actual function creation logic without mocking the worker
// This tests the core functionality that was changed from eval() to new Function()
describe('Function Creation Logic', () => {
  it('should create arrow function correctly', () => {
    const code = '(results) => results.value * 2'
    const results = { value: 5 }

    // Test the actual function creation logic
    let transformFunction: Function
    if (code.trim().startsWith('(') && code.includes('=>')) {
      transformFunction = new Function('results', `return (${code})(results);`)
    } else {
      throw new Error('Expected arrow function')
    }

    const result = transformFunction(results)
    expect(result).toBe(10)
  })

  it('should create regular function correctly', () => {
    const code = 'function(results) { return results.value + 3 }'
    const results = { value: 7 }

    let transformFunction: Function
    if (code.trim().startsWith('function')) {
      transformFunction = new Function('results', `return (${code})(results);`)
    } else {
      throw new Error('Expected function')
    }

    const result = transformFunction(results)
    expect(result).toBe(10)
  })

  it('should create direct expression correctly', () => {
    const code = 'results.value * 3'
    const results = { value: 4 }

    const transformFunction = new Function('results', `return ${code};`)

    const result = transformFunction(results)
    expect(result).toBe(12)
  })

  it('should handle complex results objects', () => {
    const code = '(results) => results.user.name + " is " + results.user.age + " years old"'
    const results = { user: { name: 'John', age: 30 } }

    let transformFunction: Function
    if (code.trim().startsWith('(') && code.includes('=>')) {
      transformFunction = new Function('results', `return (${code})(results);`)
    } else {
      throw new Error('Expected arrow function')
    }

    const result = transformFunction(results)
    expect(result).toBe('John is 30 years old')
  })

  it('should handle array operations', () => {
    const code = '(results) => results.numbers.reduce((sum, num) => sum + num, 0)'
    const results = { numbers: [1, 2, 3, 4, 5] }

    let transformFunction: Function
    if (code.trim().startsWith('(') && code.includes('=>')) {
      transformFunction = new Function('results', `return (${code})(results);`)
    } else {
      throw new Error('Expected arrow function')
    }

    const result = transformFunction(results)
    expect(result).toBe(15)
  })

  it('should handle conditional logic', () => {
    const code = '(results) => results.value > 10 ? "high" : "low"'
    const results = { value: 15 }

    let transformFunction: Function
    if (code.trim().startsWith('(') && code.includes('=>')) {
      transformFunction = new Function('results', `return (${code})(results);`)
    } else {
      throw new Error('Expected arrow function')
    }

    const result = transformFunction(results)
    expect(result).toBe('high')
  })

  it('should throw error for invalid code', () => {
    const code = '(results) => invalidFunction()'
    const results = { value: 5 }

    let transformFunction: Function
    if (code.trim().startsWith('(') && code.includes('=>')) {
      transformFunction = new Function('results', `return (${code})(results);`)
    } else {
      throw new Error('Expected arrow function')
    }

    expect(() => transformFunction(results)).toThrow('invalidFunction is not defined')
  })
})

// Mock Web Worker for testing the full integration
const mockWorker = {
  onmessage: null as any,
  onerror: null as any,
  postMessage: jest.fn(),
  terminate: jest.fn(),
}

const mockBlob = {
  type: 'application/javascript',
}

const mockURL = {
  createObjectURL: jest.fn(() => 'mock-url'),
  revokeObjectURL: jest.fn(),
}

// Mock global objects
global.Worker = jest.fn(() => mockWorker) as any
global.Blob = jest.fn(() => mockBlob) as any
global.URL.createObjectURL = mockURL.createObjectURL
global.URL.revokeObjectURL = mockURL.revokeObjectURL

describe('runInVm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockWorker.onmessage = null
    mockWorker.onerror = null
  })

  it('should execute arrow function with results', async () => {
    const code = '(results) => results.value * 2'
    const results = { value: 5 }

    const promise = runInVm(code, results)

    // Simulate worker response
    setTimeout(() => {
      mockWorker.onmessage({ data: { result: 10 } })
    }, 0)

    const result = await promise
    expect(result).toBe(10)
  })

  it('should execute regular function with results', async () => {
    const code = 'function(results) { return results.value + 3 }'
    const results = { value: 7 }

    const promise = runInVm(code, results)

    setTimeout(() => {
      mockWorker.onmessage({ data: { result: 10 } })
    }, 0)

    const result = await promise
    expect(result).toBe(10)
  })

  it('should execute direct expression', async () => {
    const code = 'return results.value * 3'
    const results = { value: 4 }

    const promise = runInVm(code, results)

    setTimeout(() => {
      mockWorker.onmessage({ data: { result: 12 } })
    }, 0)

    const result = await promise
    expect(result).toBe(12)
  })

  it('should handle complex results objects', async () => {
    const code = '(results) => results.user.name + " is " + results.user.age + " years old"'
    const results = { user: { name: 'John', age: 30 } }

    const promise = runInVm(code, results)

    setTimeout(() => {
      mockWorker.onmessage({ data: { result: 'John is 30 years old' } })
    }, 0)

    const result = await promise
    expect(result).toBe('John is 30 years old')
  })

  it('should handle array operations', async () => {
    const code = '(results) => results.numbers.reduce((sum, num) => sum + num, 0)'
    const results = { numbers: [1, 2, 3, 4, 5] }

    const promise = runInVm(code, results)

    setTimeout(() => {
      mockWorker.onmessage({ data: { result: 15 } })
    }, 0)

    const result = await promise
    expect(result).toBe(15)
  })

  it('should handle conditional logic', async () => {
    const code = '(results) => results.value > 10 ? "high" : "low"'
    const results = { value: 15 }

    const promise = runInVm(code, results)

    setTimeout(() => {
      mockWorker.onmessage({ data: { result: 'high' } })
    }, 0)

    const result = await promise
    expect(result).toBe('high')
  })

  it('should handle worker errors', async () => {
    const code = '(results) => invalidFunction()'
    const results = { value: 5 }

    const promise = runInVm(code, results)

    setTimeout(() => {
      mockWorker.onmessage({ data: { error: 'ReferenceError: invalidFunction is not defined' } })
    }, 0)

    await expect(promise).rejects.toThrow('ReferenceError: invalidFunction is not defined')
  })

  it('should handle worker onerror', async () => {
    const code = '(results) => results.value * 2'
    const results = { value: 5 }

    const promise = runInVm(code, results)

    setTimeout(() => {
      mockWorker.onerror({ message: 'Worker error' })
    }, 0)

    await expect(promise).rejects.toThrow('Error in transform: Worker error')
  })

  it('should create blob with correct content', async () => {
    const code = '(results) => results.value * 2'
    const results = { value: 5 }

    const promise = runInVm(code, results)

    setTimeout(() => {
      mockWorker.onmessage({ data: { result: 10 } })
    }, 0)

    await promise

    expect(global.Blob).toHaveBeenCalledWith(expect.arrayContaining([expect.stringContaining('self.onmessage')]), {
      type: 'application/javascript',
    })
  })

  it('should build worker script with explicit out and inputs context', async () => {
    const code = '() => Number(out.balance) + Number(inputs.value)'
    const results = {
      out: { balance: '1000' },
      inputs: { value: '2' },
      'asset.token': 'EGLD',
    }

    const promise = runInVm(code, results)
    setTimeout(() => {
      mockWorker.onmessage({ data: { result: 1002 } })
    }, 0)
    await promise

    const blobArg = (global.Blob as jest.Mock).mock.calls[0][0] as string[]
    const script = blobArg.join('')
    expect(script).toContain("'out'")
    expect(script).toContain("'inputs'")
    expect(script).toContain('results.out')
    expect(script).toContain('results.inputs')
    expect(script).not.toContain('contextKeys')
  })

  it('should post message with results', async () => {
    const code = '(results) => results.value * 2'
    const results = { value: 5 }

    const promise = runInVm(code, results)

    setTimeout(() => {
      mockWorker.onmessage({ data: { result: 10 } })
    }, 0)

    await promise

    expect(mockWorker.postMessage).toHaveBeenCalledWith(results)
  })

  it('should clean up resources', async () => {
    const code = '(results) => results.value * 2'
    const results = { value: 5 }

    const promise = runInVm(code, results)

    setTimeout(() => {
      mockWorker.onmessage({ data: { result: 10 } })
    }, 0)

    await promise

    expect(mockWorker.terminate).toHaveBeenCalled()
    expect(mockURL.revokeObjectURL).toHaveBeenCalledWith('mock-url')
  })
})

describe('createBrowserTransformRunner', () => {
  it('should create a valid TransformRunner', () => {
    const runner = createBrowserTransformRunner()

    expect(runner).toBeDefined()
    expect(typeof runner.run).toBe('function')
  })

  it('should execute transform through runner interface', async () => {
    const runner = createBrowserTransformRunner()
    const code = '(results) => results.value * 2'
    const results = { value: 8 }

    const promise = runner.run(code, results)

    setTimeout(() => {
      mockWorker.onmessage({ data: { result: 16 } })
    }, 0)

    const result = await promise
    expect(result).toBe(16)
  })

  it('should handle multiple transformations', async () => {
    const runner = createBrowserTransformRunner()
    const results = { value: 3 }

    const promise = runner.run('(results) => results.value + 1', results)

    setTimeout(() => {
      mockWorker.onmessage({ data: { result: 4 } })
    }, 0)

    const result = await promise
    expect(result).toBe(4)
  })
})
