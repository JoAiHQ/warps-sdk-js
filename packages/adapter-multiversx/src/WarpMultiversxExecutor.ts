import {
  Address,
  ArgSerializer,
  SmartContractTransactionsFactory,
  Token,
  TokenComputer,
  TokenTransfer,
  Transaction,
  TransactionsFactoryConfig,
  TransferTransactionsFactory,
} from '@multiversx/sdk-core'
import {
  AdapterWarpExecutor,
  applyOutputToMessages,
  extractResolvedInputValues,
  getNextInfo,
  getWarpActionByIndex,
  getWarpWalletAddressFromConfig,
  WarpActionExecutionResult,
  WarpChainAssetValue,
  WarpChainInfo,
  WarpClientConfig,
  WarpExecutable,
  WarpQueryAction,
} from '@joai/warps'
import { AdapterTypeRegistry } from '@joai/warps/src/types'
import { getMultiversxEntrypoint, toChainAddress } from './helpers/general'
import { WarpMultiversxAbiBuilder } from './WarpMultiversxAbiBuilder'
import { WarpMultiversxOutput } from './WarpMultiversxOutput'
import { WarpMultiversxSerializer } from './WarpMultiversxSerializer'

const EgldIdentifierMultiTransfer = 'EGLD-000000'

export class WarpMultiversxExecutor implements AdapterWarpExecutor {
  private readonly serializer: WarpMultiversxSerializer
  private readonly abi: WarpMultiversxAbiBuilder
  private readonly output: WarpMultiversxOutput

  constructor(
    private readonly config: WarpClientConfig,
    private readonly chain: WarpChainInfo,
    private readonly typeRegistry: AdapterTypeRegistry
  ) {
    this.serializer = new WarpMultiversxSerializer({ typeRegistry: this.typeRegistry })
    this.abi = new WarpMultiversxAbiBuilder(this.config, this.chain)
    this.output = new WarpMultiversxOutput(this.config, this.chain, this.typeRegistry)
  }

  async createTransaction(executable: WarpExecutable): Promise<Transaction> {
    const action = getWarpActionByIndex(executable.warp, executable.action)

    let tx: Transaction | null = null
    if (action.type === 'transfer') {
      tx = await this.createTransferTransaction(executable)
    } else if (action.type === 'contract') {
      tx = await this.createContractCallTransaction(executable)
    } else if (action.type === 'query') {
      throw new Error('WarpMultiversxExecutor: Invalid action type for createTransactionForExecute; Use executeQuery instead')
    } else if (action.type === 'collect') {
      throw new Error('WarpMultiversxExecutor: Invalid action type for createTransactionForExecute; Use executeCollect instead')
    }

    if (!tx) throw new Error(`WarpMultiversxExecutor: Invalid action type (${action.type})`)

    return tx
  }

  async createTransferTransaction(executable: WarpExecutable): Promise<Transaction> {
    if (!executable.destination) throw new Error('WarpMultiversxExecutor: createTransfer - destination not set')
    const userWallet = getWarpWalletAddressFromConfig(this.config, executable.chain.name)
    if (!userWallet) throw new Error('WarpMultiversxExecutor: createTransfer - user address not set')
    const sender = toChainAddress(userWallet, this.chain)
    const config = new TransactionsFactoryConfig({ chainID: executable.chain.chainId })
    const data = executable.data ? Buffer.from(this.serializer.stringToTyped(executable.data).valueOf()) : null

    const isSingleNativeTransfer =
      executable.transfers.length === 1 && executable.transfers[0].identifier === this.chain.nativeToken?.identifier

    const nativeAmountInTransfers = isSingleNativeTransfer ? executable.transfers[0].amount : 0n
    const nativeAmountTotal = nativeAmountInTransfers + executable.value

    return await new TransferTransactionsFactory({ config }).createTransactionForTransfer(sender, {
      receiver: toChainAddress(executable.destination, executable.chain),
      nativeAmount: nativeAmountTotal,
      tokenTransfers: isSingleNativeTransfer ? [] : this.toTokenTransfers(executable.transfers),
      data: data ? new Uint8Array(data) : undefined,
    })
  }

  async createContractCallTransaction(executable: WarpExecutable): Promise<Transaction> {
    if (!executable.destination) throw new Error('WarpMultiversxExecutor: createContractCall - destination not set')
    const userWallet = getWarpWalletAddressFromConfig(this.config, executable.chain.name)
    if (!userWallet) throw new Error('WarpMultiversxExecutor: createContractCall - user address not set')
    const action = getWarpActionByIndex(executable.warp, executable.action)
    const sender = toChainAddress(userWallet, this.chain)
    const typedArgs = executable.args.map((arg) => this.serializer.stringToTyped(arg))
    const config = new TransactionsFactoryConfig({ chainID: executable.chain.chainId })
    return new SmartContractTransactionsFactory({ config }).createTransactionForExecute(sender, {
      contract: toChainAddress(executable.destination, executable.chain),
      function: 'func' in action ? action.func || '' : '',
      gasLimit: 'gasLimit' in action ? BigInt(action.gasLimit || 0) : 0n,
      arguments: typedArgs,
      tokenTransfers: this.toTokenTransfers(executable.transfers),
      nativeTransferAmount: executable.value,
    })
  }

  async executeQuery(executable: WarpExecutable): Promise<WarpActionExecutionResult> {
    if (!executable.destination) throw new Error('WarpMultiversxExecutor: executeQuery - destination not set')
    const action = getWarpActionByIndex(executable.warp, executable.action) as WarpQueryAction
    if (action.type !== 'query') throw new Error(`WarpMultiversxExecutor: Invalid action type for executeQuery: ${action.type}`)
    const abi = await this.abi.getAbiForAction(action)
    const typedArgs = executable.args.map((arg) => this.serializer.stringToTyped(arg))
    const entrypoint = getMultiversxEntrypoint(executable.chain, this.config.env, this.config)
    const contractAddress = toChainAddress(executable.destination, executable.chain)
    const controller = entrypoint.createSmartContractController(abi)
    const query = controller.createQuery({ contract: contractAddress, function: action.func || '', arguments: typedArgs })
    const response = await controller.runQuery(query)
    const isSuccess = response.returnCode === 'ok'
    const argsSerializer = new ArgSerializer()
    const endpoint = abi.getEndpoint(response.function || action.func || '')
    const parts = (response.returnDataParts || []).map((part: any) => (typeof part === 'string' ? Buffer.from(part) : Buffer.from(part)))
    const typedValues = argsSerializer.buffersToValues(parts, endpoint.output)
    const { values, output } = await this.output.extractQueryOutput(
      executable.warp,
      typedValues,
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
      status: isSuccess ? 'success' : 'error',
      warp: executable.warp,
      action: executable.action,
      user: getWarpWalletAddressFromConfig(this.config, executable.chain.name),
      txHash: null,
      tx: null,
      next,
      values,
      output: { ...output, _DATA: typedValues },
      messages: applyOutputToMessages(executable.warp, output, this.config),
      destination,
      resolvedInputs,
    }
  }

  private toTokenTransfers(transfers: WarpChainAssetValue[]): TokenTransfer[] {
    return transfers
      .map((asset) => {
        if (asset.identifier === this.chain.nativeToken.identifier) {
          return { ...asset, identifier: EgldIdentifierMultiTransfer }
        }
        return asset
      })
      .map((t) => {
        const tokenComputer = new TokenComputer()
        const nonce = tokenComputer.extractNonceFromExtendedIdentifier(t.identifier)
        return new TokenTransfer({ token: new Token({ identifier: t.identifier, nonce: BigInt(nonce || 0) }), amount: t.amount })
      })
  }
}
