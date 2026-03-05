import type { TransformRunner } from '@joai/warps'

let vm2Module: typeof import('vm2') | null = null

async function getVM2(): Promise<typeof import('vm2')> {
  if (vm2Module) {
    return vm2Module
  }

  try {
    vm2Module = await import('vm2')
    return vm2Module
  } catch (error: any) {
    if (error?.code === 'MODULE_NOT_FOUND' || error?.message?.includes('Cannot find module')) {
      throw new Error(
        'The optional dependency "vm2" is not installed. To use runInVm in Node.js, please install vm2: npm install vm2 --save.'
      )
    }
    throw error
  }
}

export const runInVm = async (code: string, results: any): Promise<any> => {
  try {
    const { VM } = await getVM2()
    const vm = new VM({
      timeout: 2000,
      sandbox: { results, out: results?.out, inputs: results?.inputs },
      eval: false,
      wasm: false,
    })
    const isFunctionCode = (code.trim().startsWith('(') && code.includes('=>')) || code.trim().startsWith('function')
    return vm.run(isFunctionCode ? `(${code})(results)` : `(${code})`)
  } catch (e: any) {
    if (e?.message?.includes('The optional dependency "vm2" is not installed')) {
      throw e
    }
    throw new Error(`Transform error: ${e?.message || String(e)}`)
  }
}

export const createNodeTransformRunner = (): TransformRunner => ({
  run: runInVm,
})
