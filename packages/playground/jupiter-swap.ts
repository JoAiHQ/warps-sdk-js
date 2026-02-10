/**
 * Jupiter Swap — End-to-end test script
 *
 * Executes a real Jupiter swap on Solana mainnet:
 *   1. Fetches a quote from Jupiter
 *   2. Gets a serialized swap transaction
 *   3. Deserializes, signs, and submits it
 *
 * Usage:
 *   npx ts-node jupiter-swap.ts
 *
 * Environment:
 *   JUPITER_INPUT_MINT  — Token to swap from (default: SOL)
 *   JUPITER_OUTPUT_MINT — Token to swap to (default: USDC)
 *   JUPITER_AMOUNT      — Amount in smallest unit (default: 10000000 = 0.01 SOL)
 *   JUPITER_SLIPPAGE    — Slippage in bps (default: 50 = 0.5%)
 */

import { Connection, Keypair, VersionedTransaction } from '@solana/web3.js'
import bs58 from 'bs58'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const JUPITER_API = 'https://lite-api.jup.ag'
const SOL_MINT = 'So11111111111111111111111111111111111111112'
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'

const inputMint = process.env.JUPITER_INPUT_MINT || SOL_MINT
const outputMint = process.env.JUPITER_OUTPUT_MINT || USDC_MINT
const amount = process.env.JUPITER_AMOUNT || '10000000' // 0.01 SOL
const slippageBps = process.env.JUPITER_SLIPPAGE || '50'

// Load wallet
const walletPath = path.join(__dirname, 'wallets', 'solana.json')
const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'))
const keypair = Keypair.fromSecretKey(bs58.decode(walletData.privateKey))
const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed')

console.log(`Wallet: ${keypair.publicKey.toBase58()}`)

// 1. Check balance
const balance = await connection.getBalance(keypair.publicKey)
console.log(`Balance: ${(balance / 1e9).toFixed(4)} SOL`)

if (balance < Number(amount) + 5000) {
  console.error(`Insufficient balance. Need at least ${((Number(amount) + 5000) / 1e9).toFixed(4)} SOL.`)
  console.error(`Send SOL to: ${keypair.publicKey.toBase58()}`)
  process.exit(1)
}

// 2. Get quote
console.log(`\nQuoting: ${amount} of ${inputMint} -> ${outputMint} (slippage: ${slippageBps}bps)`)

const quoteUrl = `${JUPITER_API}/swap/v1/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}`
const quoteRes = await fetch(quoteUrl)
if (!quoteRes.ok) {
  console.error('Quote failed:', await quoteRes.text())
  process.exit(1)
}
const quoteResponse = await quoteRes.json()

console.log(`Route: ${quoteResponse.inAmount} -> ${quoteResponse.outAmount} (impact: ${quoteResponse.priceImpactPct}%)`)
console.log(`Routes: ${quoteResponse.routePlan?.length || 0}`)

// 3. Get swap transaction
console.log('\nBuilding swap transaction...')

const swapRes = await fetch(`${JUPITER_API}/swap/v1/swap`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    quoteResponse,
    userPublicKey: keypair.publicKey.toBase58(),
    wrapAndUnwrapSol: true,
    dynamicComputeUnitLimit: true,
    dynamicSlippage: true,
  }),
})

if (!swapRes.ok) {
  console.error('Swap failed:', await swapRes.text())
  process.exit(1)
}

const { swapTransaction } = await swapRes.json()

// 4. Deserialize, sign, submit
const txBuffer = Buffer.from(swapTransaction, 'base64')
const transaction = VersionedTransaction.deserialize(txBuffer)

transaction.sign([keypair])

console.log('Submitting transaction...')
const txHash = await connection.sendRawTransaction(transaction.serialize(), {
  skipPreflight: false,
  maxRetries: 3,
})

console.log(`\nTransaction: ${txHash}`)
console.log(`Explorer: https://solscan.io/tx/${txHash}`)

// 5. Confirm
console.log('Confirming...')
const confirmation = await connection.confirmTransaction(txHash, 'confirmed')

if (confirmation.value.err) {
  console.error('Transaction failed:', confirmation.value.err)
  process.exit(1)
}

console.log('Swap confirmed!')
