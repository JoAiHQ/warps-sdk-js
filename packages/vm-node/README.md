# @joai/warps-vm-node

Node.js VM runtime for Warps SDK input and output transformations. Safely executes transformation code using vm2 in a sandboxed environment.

## Installation

```bash
npm install @joai/warps-vm-node
```

**Note:** This package requires `vm2` as an optional dependency. Install it separately:

```bash
npm install vm2
```

## Usage

```typescript
import { createNodeTransformRunner } from '@joai/warps-vm-node'
import { WarpClient } from '@joai/warps'

const config = {
  env: 'mainnet',
  transform: {
    runner: createNodeTransformRunner(),
  },
  // ... rest of config
}

const client = new WarpClient(config, { chains: [...] })
```

## Features

- Safe code execution using vm2
- Sandboxed environment
- Supports arrow functions, regular functions, and expressions
- Error handling and timeout protection

## How It Works

The Node.js VM uses vm2 to execute transformation code in an isolated sandbox, preventing access to Node.js globals and ensuring security.

`runInVm` accepts transformation code and an argument array. Function transformations are called with every argument in the array. Output transformations receive one context argument, while input transformations receive the current value and the complete inputs object.

Expression transformations can use the `results`, `out`, and `inputs` globals. `results` is the first argument, `out` is `results?.out`, and `inputs` is the second argument when present or `results?.inputs` otherwise.

## Example Transformation

```typescript
import { runInVm } from '@joai/warps-vm-node'

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

## Security

The vm2 sandbox provides isolation from the Node.js runtime, preventing unauthorized access to system resources.
