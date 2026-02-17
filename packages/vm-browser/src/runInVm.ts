import type { TransformRunner } from '@joai/warps'

export const runInVm = async (code: string, results: any): Promise<any> => {
  // Handle browser environment by creating a Web Worker
  return new Promise((resolve, reject) => {
    try {
      const blob = new Blob(
        [
          `
            self.onmessage = function(e) {
              try {
                const results = e.data;

                // Destructure context keys into scope so they're accessible as top-level variables (e.g. 'out')
                const contextKeys = Object.keys(results || {});
                const contextArgs = contextKeys.join(', ');
                const contextValues = contextKeys.map(function(k) { return results[k]; });

                let output;
                let transformFunction;

                // Handle arrow function syntax: () => { return ... }
                if (${JSON.stringify(code.trim())}.startsWith('(') && ${JSON.stringify(code)}.includes('=>')) {
                  transformFunction = new Function('results', contextArgs, \`return (\${${JSON.stringify(code)}})(results);\`);
                }
                // Handle regular function syntax: function() { return ... }
                else if (${JSON.stringify(code.trim())}.startsWith('function')) {
                  transformFunction = new Function('results', contextArgs, \`return (\${${JSON.stringify(code)}})(results);\`);
                }
                // Handle direct expression: results.value * 2
                else {
                  transformFunction = new Function('results', contextArgs, \`return \${${JSON.stringify(code)}};\`);
                }

                output = transformFunction.apply(null, [results].concat(contextValues));
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
