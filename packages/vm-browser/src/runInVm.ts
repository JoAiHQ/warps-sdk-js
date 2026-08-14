import type { TransformRunner } from '@joai/warps'

export const runInVm = async (code: string, args: any[]): Promise<any> => {
  return new Promise((resolve, reject) => {
    try {
      const blob = new Blob(
        [
          `
            self.onmessage = function(e) {
              try {
                const args = e.data;
                const results = args[0];
                const out = results?.out;
                const inputs = args.length > 1 ? args[1] : results?.inputs;
                const isFunctionCode =
                  (${JSON.stringify(code.trim())}.startsWith('(') && ${JSON.stringify(code)}.includes('=>')) ||
                  ${JSON.stringify(code.trim())}.startsWith('function');
                const transformFunction = new Function(
                  'args',
                  'results',
                  'out',
                  'inputs',
                  isFunctionCode ? \`return (\${${JSON.stringify(code)}})(...args);\` : \`return \${${JSON.stringify(code)}};\`
                );
                const output = transformFunction(args, results, out, inputs);
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
      worker.postMessage(args)
    } catch (err) {
      return reject(err)
    }
  })
}

export const createBrowserTransformRunner = (): TransformRunner => ({
  run: runInVm,
})
