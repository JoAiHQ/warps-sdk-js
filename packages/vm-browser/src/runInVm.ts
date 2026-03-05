import type { TransformRunner } from '@joai/warps'

export const runInVm = async (code: string, results: any): Promise<any> => {
  return new Promise((resolve, reject) => {
    try {
      const blob = new Blob(
        [
          `
            self.onmessage = function(e) {
              try {
                const results = e.data;
                const isFunctionCode =
                  (${JSON.stringify(code.trim())}.startsWith('(') && ${JSON.stringify(code)}.includes('=>')) ||
                  ${JSON.stringify(code.trim())}.startsWith('function');
                const transformFunction = new Function(
                  'results',
                  'out',
                  'inputs',
                  isFunctionCode ? \`return (\${${JSON.stringify(code)}})(results);\` : \`return \${${JSON.stringify(code)}};\`
                );
                const output = transformFunction(results, results.out, results.inputs);
                self.postMessage({ result: output });
              } catch (error) {
                self.postMessage({ error: error.toString() });
              }
            };
          `,
        ],
        { type: 'application/javascript' }
      )
      const url = URL.createObjectURL(blob)
      const worker = new Worker(url)
      worker.onmessage = function (e) {
        if (e.data.error) {
          reject(new Error(e.data.error))
        } else {
          resolve(e.data.result)
        }
        worker.terminate()
        URL.revokeObjectURL(url)
      }
      worker.onerror = function (e) {
        reject(new Error(`Error in transform: ${e.message}`))
        worker.terminate()
        URL.revokeObjectURL(url)
      }
      worker.postMessage(results)
    } catch (err) {
      return reject(err)
    }
  })
}

export const createBrowserTransformRunner = (): TransformRunner => ({
  run: runInVm,
})
