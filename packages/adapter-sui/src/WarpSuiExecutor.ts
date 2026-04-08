import { SuiClient } from '@mysten/sui/client'
import { Transaction } from '@mysten/sui/transactions'
import {
  AdapterWarpExecutor,
  applyOutputToMessages,
  extractResolvedInputValues,
  getNextInfo,
  getProviderConfig,
  getWarpActionByIndex,
  getWarpWalletAddressFromConfig,
  WarpActionExecutionResult,
  WarpChainInfo,
  WarpClientConfig,
  WarpContractAction,
  WarpExecutable,
  WarpQueryAction,
} from '@joai/warps'
import { WarpSuiOutput } from './WarpSuiOutput'
import { WarpSuiSerializer } from './WarpSuiSerializer'

export class WarpSuiExecutor implements AdapterWarpExecutor {
  private readonly serializer: WarpSuiSerializer
  private readonly output: WarpSuiOutput
  private readonly client: SuiClient
  private readonly userWallet: string | null

  constructor(
    private readonly config: WarpClientConfig,
    private readonly chain: WarpChainInfo
  ) {
    this.serializer = new WarpSuiSerializer()
    this.output = new WarpSuiOutput(this.config, this.chain)
    const providerConfig = getProviderConfig(this.config, this.chain.name, this.config.env, this.chain.defaultApiUrl)
    this.client = new SuiClient({ url: providerConfig.url })
    this.userWallet = getWarpWalletAddressFromConfig(this.config, this.chain.name)
  }

  async createTransaction(executable: WarpExecutable): Promise<Transaction> {
    const action = getWarpActionByIndex(executable.warp, executable.action)
    if (action.type === 'transfer') {
      return this.createTransferTransaction(executable)
    } else if (action.type === 'contract') {
      return this.createContractCallTransaction(executable)
    } else if (action.type === 'query') {
      throw new Error('WarpSuiExecutor: Invalid action type for createTransaction; Use executeQuery instead')
    } else if (action.type === 'collect') {
      throw new Error('WarpSuiExecutor: Invalid action type for createTransaction; Use executeCollect instead')
    }
    throw new Error(`WarpSuiExecutor: Invalid action type (${action.type})`)
  }

  async createTransferTransaction(executable: WarpExecutable): Promise<Transaction> {
    if (!this.userWallet) throw new Error('WarpSuiExecutor: createTransfer - user address not set')

    if (!executable.destination) {
      throw new Error('WarpSuiExecutor: Invalid destination address')
    }

    if (executable.value < 0) {
      throw new Error(`WarpSuiExecutor: Transfer value cannot be negative: ${executable.value}`)
    }

    const tx = new Transaction()
    const transferObjects: any[] = []

    // Handle native SUI transfer from executable.value
    if (executable.value > 0) {
      const suiCoin = await this.handleCoinTransfer(tx, '0x2::sui::SUI', executable.value)
      transferObjects.push(suiCoin)
    }

    // Handle token transfers dynamically by querying coin objects
    for (const transfer of executable.transfers) {
      const tokenCoin = await this.handleCoinTransfer(tx, transfer.identifier, transfer.amount)
      transferObjects.push(tokenCoin)
    }

    if (transferObjects.length > 0) {
      tx.transferObjects(transferObjects, tx.pure.address(executable.destination))
    }

    return tx
  }

  async createContractCallTransaction(executable: WarpExecutable): Promise<Transaction> {
    if (!this.userWallet) throw new Error('WarpSuiExecutor: createContractCall - user address not set')
    if (!executable.destination) throw new Error('WarpSuiExecutor: Invalid contract address')
    if (executable.value < 0) throw new Error(`WarpSuiExecutor: Contract call value cannot be negative: ${executable.value}`)

    const action = getWarpActionByIndex(executable.warp, executable.action) as WarpContractAction
    if (!action.func) throw new Error('WarpSuiExecutor: createContractCall - function not set')

    const tx = new Transaction()
    tx.setSender(this.userWallet)

    const args: any[] = []
    if (executable.value > 0) args.push(await this.handleCoinTransfer(tx, '0x2::sui::SUI', executable.value))
    for (const transfer of executable.transfers) args.push(await this.handleCoinTransfer(tx, transfer.identifier, transfer.amount))

    const { target, typeArguments } = this.parseMoveCallTarget(action)
    const typedArgs = executable.args.map((arg) => this.serializer.stringToTyped(arg, tx))

    if (target === '0x2::transfer::public_transfer') {
      args.push(...(await this.buildPublicTransferArgs(tx, executable, typedArgs)))
    } else {
      args.push(...typedArgs)
    }

    tx.moveCall({ target, arguments: args, typeArguments })
    tx.setGasBudget(100000000)
    return tx
  }

  async executeQuery(executable: WarpExecutable): Promise<WarpActionExecutionResult> {
    if (!executable.destination) throw new Error('WarpSuiExecutor: executeQuery - destination not set')
    const action = getWarpActionByIndex(executable.warp, executable.action) as WarpQueryAction
    if (action.type !== 'query') throw new Error(`WarpSuiExecutor: Invalid action type for executeQuery: ${action.type}`)
    const result = await this.client.getObject({ id: executable.destination, options: { showContent: true } })
    const values = [result]
    const { values: extractedValues, output } = await this.output.extractQueryOutput(
      executable.warp,
      values,
      executable.action,
      executable.resolvedInputs
    )
    const next = getNextInfo(this.config, [], executable.warp, executable.action, output)

    const destinationInput = executable.resolvedInputs.find(
      (i) => i.input.position === 'receiver' || i.input.position === 'destination'
    )
    const destination = destinationInput?.value || executable.destination

    const resolvedInputs = extractResolvedInputValues(executable.resolvedInputs)
    return {
      status: 'success',
      warp: executable.warp,
      action: executable.action,
      user: this.userWallet,
      txHash: null,
      tx: null,
      next,
      values: extractedValues,
      output: { ...output, _DATA: result },
      resolvedInputs,
      messages: applyOutputToMessages(executable.warp, output, this.config),
      destination,
    }
  }

  async signMessage(message: string, privateKey: string): Promise<string> {
    throw new Error('Not implemented')
  }

  private parseMoveCallTarget(action: WarpContractAction): { target: string; typeArguments?: string[] } {
    if (!action.func) throw new Error('WarpSuiExecutor: Function not set')
    
    let target = `${action.address}::${action.func}`
    let typeArguments = (action as any).typeArguments

    if (!typeArguments && action.func.includes('<') && action.func.includes('>')) {
      const match = action.func.match(/<([^>]+)>/)
      if (match) {
        typeArguments = [match[1]]
        target = `${action.address}::${action.func.replace(/<[^>]+>/, '')}`
      }
    }

    return { target, typeArguments }
  }

  private async buildPublicTransferArgs(tx: Transaction, executable: WarpExecutable, typedArgs: any[]): Promise<any[]> {
    const objectArg = executable.resolvedInputs.find((ri) => String(ri.input.position) === 'arg:0')?.value || executable.args[0]
    const recipientArg =
      executable.resolvedInputs.find((ri) => String(ri.input.position) === 'arg:1')?.value ||
      executable.resolvedInputs.find((ri) => ri.input.type === 'address' && String(ri.input.position) !== 'arg:0')?.value ||
      executable.args[1]

    const objectId = this.extractObjectId(objectArg)
    if (!objectId) return typedArgs

    try {
      const obj = await this.client.getObject({ id: objectId, options: { showType: true, showContent: true } })
      if (!obj.data?.type?.startsWith('0x2::coin::Coin<')) return typedArgs

      const recipient = recipientArg
        ? this.serializer.stringToTyped(recipientArg.includes(':') ? recipientArg : `address:${recipientArg}`, tx)
        : typedArgs[1] || tx.pure.address(this.userWallet!)

      return [tx.object(objectId), recipient]
    } catch {
      return typedArgs
    }
  }

  private extractObjectId(value: string | null): string | null {
    if (!value || typeof value !== 'string') return null
    const id = value.startsWith('object:') ? value.substring(7) : value
    return id.startsWith('0x') ? id : null
  }

  private async handleCoinTransfer(tx: Transaction, coinType: string, amount: bigint): Promise<any> {
    if (coinType === '0x2::sui::SUI') {
      try {
        return tx.splitCoins(tx.gas, [amount.toString()])[0]
      } catch {
        // Gas coin insufficient, fall back to coin objects
      }
    }
    return this.createCoinTransferFromObjects(tx, coinType, amount)
  }

  private async createCoinTransferFromObjects(tx: Transaction, coinType: string, amount: bigint): Promise<any> {
    const coins = await this.getCoinObjectsForTransfer(coinType, amount)
    if (coins.length === 0) throw new Error(`No coin objects found for ${coinType}`)

    const primaryCoin = tx.object(coins[0].coinObjectId)
    if (coins.length > 1) tx.mergeCoins(primaryCoin, coins.slice(1).map((c) => tx.object(c.coinObjectId)))

    return tx.splitCoins(primaryCoin, [amount.toString()])[0]
  }

  private async getCoinObjectsForTransfer(coinType: string, requiredAmount: bigint): Promise<Array<{ coinObjectId: string; balance: string }>> {
    if (!this.userWallet) throw new Error('User wallet not set')

    const { data } = await this.client.getCoins({ owner: this.userWallet, coinType })
    const sorted = data.map((c) => ({ coinObjectId: c.coinObjectId, balance: c.balance })).sort((a, b) => (BigInt(b.balance) > BigInt(a.balance) ? 1 : -1))

    let total = BigInt(0)
    const selected: typeof sorted = []
    for (const coin of sorted) {
      selected.push(coin)
      total += BigInt(coin.balance)
      if (total >= requiredAmount) return selected
    }

    throw new Error(`Insufficient ${coinType} balance. Required: ${requiredAmount}, Available: ${total}`)
  }

  async createDeployTransaction(): Promise<never> {
    throw new Error('WarpSuiExecutor: Contract deployment not supported')
  }

  async createUpgradeTransaction(): Promise<never> {
    throw new Error('WarpSuiExecutor: Contract upgrade not supported')
  }
}
