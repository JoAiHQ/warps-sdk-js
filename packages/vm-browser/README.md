# @joai/warps-vm-browser

Browser VM runtime for Warps SDK input and output transformations. Safely executes transformation code in a Web Worker sandbox.

## Installation

```bash
npm install @joai/warps-vm-browser
```

## Usage

```typescript
import { createBrowserTransformRunner } from '@joai/warps-vm-browser'
import { WarpClient } from '@joai/warps'

const config = {
  env: 'mainnet',
  transform: {
    runner: createBrowserTransformRunner(),
  },
  // ... rest of config
}

const client = new WarpClient(config, { chains: [...] })
```

## Features

- Safe code execution in Web Workers
- Sandboxed environment
- Supports arrow functions, regular functions, and expressions
- Error handling and isolation

## How It Works

The browser VM uses Web Workers to execute transformation code in isolation, preventing access to the main thread's context and ensuring security.

`runInVm` accepts transformation code and an argument array. Function transformations are called with every argument in the array. Output transformations receive one context argument, while input transformations receive the current value and the complete inputs object.

Expression transformations can use the `results`, `out`, and `inputs` globals. `results` is the first argument, `out` is `results?.out`, and `inputs` is the second argument when present or `results?.inputs` otherwise.

## Example Transformation

```typescript
import { runInVm } from '@joai/warps-vm-browser'

// Warp output transformation
const transform = (results) => {
  return {
    value: results.amount * 2,
    formatted: `$${results.amount.toFixed(2)}`,
  }
}

await runInVm('(results) => results.amount * 2', [{ amount: 5 }])
await runInVm('(value, inputs) => value * inputs.multiplier', [5, { multiplier: 2 }])
```
