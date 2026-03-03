import type { WarpChainInfo, WarpClientConfig, WarpWalletDetails } from '@joai/warps'
import { WarpChainName, WarpClient, withAdapterFallback } from '@joai/warps'
import { getAllEvmAdapters } from '@joai/warps-adapter-evm'
import { FastsetAdapter } from '@joai/warps-adapter-fastset'
import { getAllMultiversxAdapters, MultiversxAdapter } from '@joai/warps-adapter-multiversx'
import { NearAdapter } from '@joai/warps-adapter-near'
import { SolanaAdapter } from '@joai/warps-adapter-solana'
import { SuiAdapter } from '@joai/warps-adapter-sui'
import { createNodeTransformRunner } from '@joai/warps-vm-node'
import { createCoinbaseWalletProvider } from '@joai/warps-wallet-coinbase'
import { createCustomCloudWalletProvider } from '@joai/warps-wallet-ee'
import { createGaupaWalletProvider } from '@joai/warps-wallet-gaupa'
import console from 'console'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dotenv = await import('dotenv')
dotenv.config({ path: path.join(__dirname, '.env') })

const parseInputs = (value: string | undefined, fallback: string[]) => {
  if (!value) return fallback
  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) return parsed.map((item) => String(item))
  } catch {
    return fallback
  }
  return fallback
}

const Chain: WarpChainName = (process.env.PLAYGROUND_CHAIN as WarpChainName) || WarpChainName.Multiversx
const WarpToTest = process.env.PLAYGROUND_WARP || 'transfer.json'
const WarpInputs: string[] = parseInputs(process.env.PLAYGROUND_INPUTS, [
  'string:multiversx',
  'address:erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
  'asset:EGLD|0.000001',
])
const warpsDir = path.join(__dirname, 'warps')

// Shared Coinbase provider factory (reuse across EVM chains)
const coinbaseWalletFactory = createCoinbaseWalletProvider({
  apiKeyId: process.env.COINBASE_API_KEY_ID || '',
  apiKeySecret: process.env.COINBASE_API_KEY_SECRET || '',
  walletSecret: process.env.COINBASE_WALLET_SECRET || '',
})

const eeWalletFactory = createCustomCloudWalletProvider({
  providerName: 'ee',
  baseUrl: process.env.EE_BASE_URL || 'http://localhost:3008',
  serviceToken: process.env.EE_SERVICE_TOKEN,
  accessToken: process.env.EE_ACCESS_TOKEN,
})

const runWarp = async (warpFile: string) => {
  const warpPath = path.join(warpsDir, warpFile)
  if (!warpFile.endsWith('.json')) return
  const warpRaw = fs.readFileSync(warpPath, 'utf-8')

  const allWallets = await loadAllWallets()
  const filteredWallets: Record<string, any> = {}
  for (const [chain, wallet] of Object.entries(allWallets)) {
    if (wallet && wallet.provider) {
      filteredWallets[chain] = wallet
    }
  }
  console.log('🔑 All wallets loaded:', Object.keys(filteredWallets))

  const tempConfig: WarpClientConfig = {
    env: 'devnet',
    currentUrl: 'https://usewarp.to',
    user: {
      id: process.env.PLAYGROUND_AGENT_ID || 'playground-agent',
      email: process.env.PLAYGROUND_AGENT_EMAIL || 'playground@joai.ai',
      name: process.env.PLAYGROUND_AGENT_NAME || 'Playground Agent',
      wallets: filteredWallets,
    },
    walletProviders: {
      multiversx: {
        gaupa: createGaupaWalletProvider({
          apiKey: process.env.GAUPA_API_KEY || '',
          publicKey: process.env.GAUPA_PUBLIC_KEY,
        }),
        ee: eeWalletFactory,
      },
      ethereum: {
        coinbase: coinbaseWalletFactory,
        ee: eeWalletFactory,
      },
      base: {
        coinbase: coinbaseWalletFactory,
        ee: eeWalletFactory,
      },
      arbitrum: {
        ee: eeWalletFactory,
      },
      polygon: {
        coinbase: coinbaseWalletFactory,
        ee: eeWalletFactory,
      },
      somnia: {
        ee: eeWalletFactory,
      },
    },
    transform: { runner: createNodeTransformRunner() },
  }

  const tempClient = new WarpClient(tempConfig, {
    chains: [
      ...getAllMultiversxAdapters(),
      ...getAllEvmAdapters(MultiversxAdapter),
      withAdapterFallback(SolanaAdapter, MultiversxAdapter),
      withAdapterFallback(SuiAdapter, MultiversxAdapter),
      withAdapterFallback(NearAdapter, MultiversxAdapter),
      withAdapterFallback(FastsetAdapter, MultiversxAdapter),
    ],
  })

  const chainAdapter = tempClient.chains.find((a) => a.chainInfo.name.toLowerCase() === Chain.toLowerCase())
  if (!chainAdapter) throw new Error(`Chain adapter not found for: ${Chain}`)

  let walletForChain = filteredWallets[Chain]
  const chainNameForWalletCheck = chainAdapter.chainInfo.name.toLowerCase()
  if (!walletForChain && [WarpChainName.Multiversx, WarpChainName.Ethereum, WarpChainName.Base, WarpChainName.Arbitrum, WarpChainName.Polygon, WarpChainName.Somnia].includes(chainNameForWalletCheck as WarpChainName)) {
    const eeWallet = await ensureEeWallet(tempConfig, Chain, chainAdapter.chainInfo)
    walletForChain = eeWallet
  }
  if (!walletForChain && (chainNameForWalletCheck === WarpChainName.Ethereum || chainNameForWalletCheck === WarpChainName.Base)) {
    const coinbaseWallet = await ensureCoinbaseWallet(tempConfig, Chain, chainAdapter.chainInfo)
    walletForChain = coinbaseWallet
  } else if (!walletForChain && chainNameForWalletCheck === WarpChainName.Multiversx) {
    const gaupaWallet = await ensureGaupaWallet(tempConfig, Chain, chainAdapter.chainInfo)
    walletForChain = gaupaWallet
  } else if (!walletForChain) {
    throw new Error(`Wallet not found for chain: ${Chain}. Please create a wallet file at wallets/${Chain}.json`)
  }

  const config: WarpClientConfig = {
    ...tempConfig,
    user: {
      id: '123',
      email: 'test@test.com',
      name: 'Test Agent',
      wallets: {
        ...filteredWallets,
        [Chain]: walletForChain,
      },
    },
  }

  const client = new WarpClient(config, {
    chains: [
      ...getAllMultiversxAdapters(),
      ...getAllEvmAdapters(MultiversxAdapter),
      withAdapterFallback(SolanaAdapter, MultiversxAdapter),
      withAdapterFallback(SuiAdapter, MultiversxAdapter),
      withAdapterFallback(NearAdapter, MultiversxAdapter),
      withAdapterFallback(FastsetAdapter, MultiversxAdapter),
    ],
  })

  const walletAddress = walletForChain.address
  console.log(`💰 Wallet address: ${walletAddress}`)

  const address = walletAddress
  const dataLoader = client.getDataLoader(Chain)
  const accountAssets = await dataLoader.getAccountAssets(address)

  console.log('📊 Account assets:', accountAssets)

  const warp = await client.createBuilder(Chain).createFromRaw(warpRaw, false)
  warp.chain = Chain

  const executionResults: ExecutionResult[] = []

  const { txs, chain, evaluateOutput, resolvedInputs, immediateExecutions } = await client.executeWarp(warp, WarpInputs, {
    onActionExecuted: (result) => {
      console.log('✅ Single action executed:', result)
      executionResults.push({ type: 'action', result })
    },
    onExecuted: (result) => {
      console.log('✅ Warp executed:', result)
      executionResults.push({ type: 'warp', result })
    },
    onError: (result) => {
      console.log('❌ Error:', result)
      executionResults.push({ type: 'error', result })
    },
  })

  console.log('📋 Resolved inputs:', resolvedInputs)

  if (chain) {
    const signedTxs = await client.getWallet(chain.name).signTransactions(txs)
    const hashes = await Promise.all(
      signedTxs.map(async (tx) => {
        if ((tx as any).transactionHash) {
          return (tx as any).transactionHash
        }
        return await client.getWallet(chain.name).sendTransaction(tx)
      })
    )

    console.log('📤 Transaction hashes:', hashes)

    const explorer = client.getExplorer(chain.name)
    const explorerUrl = explorer.getTransactionUrl(hashes[0])

    console.log('🔍 Transaction explorer URL:', explorerUrl)

    const remoteTxs = await client.getActions(chain.name, hashes, true)
    try {
      await evaluateOutput(remoteTxs)
    } catch (err) {
      console.warn('⚠️ evaluateOutput failed:', (err as Error)?.message || err)
    }

    console.log('✅ Remote transactions:', remoteTxs)
    console.log(`\n🎉 Warp completed! View on explorer: ${explorerUrl}`)

    writeResults({
      warpFile: WarpToTest,
      chain: Chain,
      inputs: WarpInputs,
      resolvedInputs,
      immediateExecutions,
      txs,
      hashes,
      explorerUrl,
      executionResults,
      remoteTxs,
    })

    console.log(`\n🎉 Warp completed! View on explorer: ${explorerUrl}`)

    return
  }

  console.log('🔍 Execution results:', JSON.stringify(executionResults, null, 2))
}

const listWarps = () => fs.readdirSync(warpsDir).filter((f) => f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.json'))

type ExecutionResult = {
  type: 'action' | 'warp' | 'error'
  result: any
}

type PlaygroundResults = {
  warpFile: string
  chain: string
  inputs: string[]
  resolvedInputs: any[]
  immediateExecutions: any[]
  txs: any[]
  hashes: string[]
  explorerUrl: string | null
  executionResults: ExecutionResult[]
  remoteTxs: any[]
}

const writeResults = (results: PlaygroundResults) => {
  const resultsPath = path.join(__dirname, 'results.md')
  const timestamp = new Date().toISOString()

  let content = `# Playground Execution Results\n\n`
  content += `Generated: ${timestamp}\n\n`
  content += `## Execution Summary\n\n`
  content += `- **Warp File**: \`${results.warpFile}\`\n`
  content += `- **Chain**: ${results.chain}\n`
  content += `- **Inputs**: ${results.inputs.length}\n`
  content += `- **Resolved Inputs**: ${results.resolvedInputs.length}\n`
  content += `- **Immediate Executions**: ${results.immediateExecutions.length}\n`
  content += `- **Transactions**: ${results.txs.length}\n`
  content += `- **Transaction Hashes**: ${results.hashes.length}\n\n`

  if (results.inputs.length > 0) {
    content += `### Inputs Used:\n\n`
    results.inputs.forEach((input, index) => {
      const type =
        typeof input === 'string' && input.startsWith('0x')
          ? 'address'
          : typeof input === 'string' && /^\d+$/.test(input)
            ? 'uint'
            : 'string'
      content += `${index + 1}. \`${type}:${input}\`\n`
    })
    content += `\n`
  }

  if (results.resolvedInputs.length > 0) {
    content += `### Resolved Inputs:\n\n`
    results.resolvedInputs.forEach((ri, index) => {
      if (ri && typeof ri === 'object' && 'input' in ri) {
        const anyRi = ri as any
        content += `${index + 1}. **${anyRi.input.name || anyRi.input.as || `Input ${index}`}**: \`${anyRi.value || 'null'}\`\n`
      } else {
        content += `${index + 1}. \`${String(ri)}\`\n`
      }
    })
    content += `\n`
  }

  if (results.immediateExecutions.length > 0) {
    content += `### Immediate Executions:\n\n`
    results.immediateExecutions.forEach((execution, index) => {
      content += `#### Execution ${index + 1}\n\n`
      content += `- **Status**: ${execution.status === 'success' ? '✅ Success' : execution.status === 'error' ? '❌ Error' : '⚠️ ' + execution.status}\n`
      if (execution.output) {
        content += `- **Output**:\n\n\`\`\`json\n${JSON.stringify(execution.output, null, 2)}\n\`\`\`\n\n`
      }
      if (execution.error) {
        content += `- **Error**: ${execution.error}\n\n`
      }
    })
  }

  if (results.executionResults.length > 0) {
    content += `### Execution Callbacks:\n\n`
    results.executionResults.forEach((er, index) => {
      content += `#### ${er.type === 'action' ? 'Action' : er.type === 'warp' ? 'Warp' : 'Error'} ${index + 1}\n\n`
      if (er.result.status) {
        content += `- **Status**: ${er.result.status === 'success' ? '✅ Success' : er.result.status === 'error' ? '❌ Error' : '⚠️ ' + er.result.status}\n`
      }
      if (er.result.output) {
        content += `- **Output**:\n\n\`\`\`json\n${JSON.stringify(er.result.output, null, 2)}\n\`\`\`\n\n`
      }
      if (er.result.error) {
        content += `- **Error**: ${er.result.error?.message || JSON.stringify(er.result.error)}\n\n`
      }
    })
  }

  if (results.hashes.length > 0) {
    content += `### Transactions:\n\n`
    results.hashes.forEach((hash, index) => {
      content += `#### Transaction ${index + 1}\n\n`
      content += `- **Hash**: \`${hash}\`\n`
      if (results.explorerUrl && index === 0) {
        content += `- **Explorer**: [View Transaction](${results.explorerUrl})\n`
      }
      content += `\n`
    })
  }

  if (results.remoteTxs.length > 0) {
    content += `### Remote Transactions:\n\n`
    results.remoteTxs.forEach((tx, index) => {
      content += `#### Remote TX ${index + 1}\n\n`
      content += `\`\`\`json\n${JSON.stringify(tx, null, 2)}\n\`\`\`\n\n`
    })
  }

  content += `\n<!-- Generated: ${timestamp} -->\n`

  fs.writeFileSync(resultsPath, content)
  console.log(`\n📝 Results written to: ${resultsPath}`)
}

const loadWallet = async (chain: string): Promise<any> => {
  const walletPath = path.join(__dirname, 'wallets', `${chain}.json`)
  const wallet = await fs.promises.readFile(walletPath, { encoding: 'utf8' })
  return JSON.parse(wallet)
}

const loadFile = async (chain: string): Promise<string | null> => {
  const filePath = path.join(__dirname, 'wallets', `${chain}.txt`)
  if (!fs.existsSync(filePath)) return null
  const file = await fs.promises.readFile(filePath, { encoding: 'utf8' })
  return file || null
}

const loadAllWallets = async (): Promise<Record<string, any>> => {
  const walletsDir = path.join(__dirname, 'wallets')
  if (!fs.existsSync(walletsDir)) {
    return {}
  }
  const walletFiles = fs.readdirSync(walletsDir).filter((f) => f.endsWith('.json'))
  const wallets: Record<string, any> = {}

  for (const walletFile of walletFiles) {
    const chainName = walletFile.replace('.json', '')
    try {
      const walletData = await loadWallet(chainName)
      if (walletData.provider === 'coinbase' || walletData.provider === 'gaupa' || walletData.provider === 'ee') {
        wallets[chainName] = walletData
      } else {
        const privateKey = walletData.privateKey || (await loadFile(chainName))
        wallets[chainName] = { ...walletData, privateKey }
      }
    } catch (error) {
      console.warn(`⚠️  Failed to load wallet for ${chainName}:`, error)
    }
  }

  return wallets
}

const ensureCoinbaseWallet = async (
  config: WarpClientConfig,
  chain: WarpChainName,
  chainInfo: WarpChainInfo
): Promise<WarpWalletDetails> => {
  const walletPath = path.join(__dirname, 'wallets', `${chain}.json`)

  if (fs.existsSync(walletPath)) {
    const existingWallet = JSON.parse(fs.readFileSync(walletPath, 'utf-8'))
    if (existingWallet.provider === 'coinbase' && existingWallet.address) {
      console.log(`✅ Reusing existing Coinbase wallet: ${existingWallet.address}`)
      return existingWallet
    }
  }

  console.log('🔄 Creating new Coinbase wallet...')
  const walletProviderFactory = config.walletProviders?.[chain as string]?.coinbase
  if (!walletProviderFactory) {
    throw new Error(`Coinbase wallet provider not configured for chain: ${chain}`)
  }

  const walletProvider = walletProviderFactory(config, chainInfo)
  if (!walletProvider) {
    throw new Error(`Failed to create Coinbase wallet provider for chain: ${chain}`)
  }

  const walletDetails = await walletProvider.generate()

  fs.writeFileSync(walletPath, JSON.stringify(walletDetails, null, 2))
  console.log(`✅ Created and saved Coinbase wallet: ${walletDetails.address}`)

  return walletDetails
}

const ensureGaupaWallet = async (config: WarpClientConfig, chain: WarpChainName, chainInfo: WarpChainInfo): Promise<WarpWalletDetails> => {
  const walletPath = path.join(__dirname, 'wallets', `${chain}.json`)

  if (fs.existsSync(walletPath)) {
    const existingWallet = JSON.parse(fs.readFileSync(walletPath, 'utf-8'))
    if (existingWallet.provider === 'gaupa' && existingWallet.address && existingWallet.externalId) {
      console.log(`✅ Reusing existing Gaupa wallet: ${existingWallet.address}`)
      return existingWallet
    }
  }

  console.log('🔄 Creating new Gaupa wallet...')
  const walletProviderFactory = config.walletProviders?.[chain as string]?.gaupa
  if (!walletProviderFactory) {
    throw new Error(`Gaupa wallet provider not configured for chain: ${chain}`)
  }

  const walletProvider = walletProviderFactory(config, chainInfo)
  if (!walletProvider) {
    throw new Error(`Failed to create Gaupa wallet provider for chain: ${chain}`)
  }

  const walletDetails = await walletProvider.generate()

  fs.writeFileSync(walletPath, JSON.stringify(walletDetails, null, 2))
  console.log(`✅ Created and saved Gaupa wallet: ${walletDetails.address} (externalId: ${walletDetails.externalId})`)

  return walletDetails
}

const ensureEeWallet = async (config: WarpClientConfig, chain: WarpChainName, chainInfo: WarpChainInfo): Promise<WarpWalletDetails> => {
  const walletPath = path.join(__dirname, 'wallets', `${chain}.json`)

  if (fs.existsSync(walletPath)) {
    const existingWallet = JSON.parse(fs.readFileSync(walletPath, 'utf-8'))
    if (existingWallet.provider === 'ee' && existingWallet.address && existingWallet.externalId) {
      console.log(`✅ Reusing existing EE wallet: ${existingWallet.address}`)
      return existingWallet
    }
  }

  console.log('🔄 Creating new EE wallet...')
  const walletProviderFactory = config.walletProviders?.[chain as string]?.ee
  if (!walletProviderFactory) {
    throw new Error(`EE wallet provider not configured for chain: ${chain}`)
  }

  const walletProvider = walletProviderFactory(config, chainInfo)
  if (!walletProvider) {
    throw new Error(`Failed to create EE wallet provider for chain: ${chain}`)
  }

  const walletDetails = await walletProvider.generate()

  fs.writeFileSync(walletPath, JSON.stringify(walletDetails, null, 2))
  console.log(`✅ Created and saved EE wallet: ${walletDetails.address} (externalId: ${walletDetails.externalId})`)

  return walletDetails
}

const warps = listWarps()
if (warps.length === 0) {
  console.log('No warps found in playground/warps.')
  process.exit(1)
}

const warpToRun = warps.find((w) => w === WarpToTest) || warps[0]

console.log(`🎯 Testing warp: ${warpToRun}`)

runWarp(warpToRun)
