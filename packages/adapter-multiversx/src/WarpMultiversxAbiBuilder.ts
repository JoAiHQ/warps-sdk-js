import { AbiRegistry, Address, EnumType, OptionalType, OptionType, TransactionOnNetwork, TransactionsFactoryConfig, TransferTransactionsFactory } from '@multiversx/sdk-core'
import {
  AdapterWarpAbiBuilder,
  createWarpIdentifier,
  getLatestProtocolIdentifier,
  getWarpWalletAddressFromConfig,
  Warp,
  WarpAbi,
  WarpAbiContents,
  WarpActionInput,
  WarpActionInputPosition,
  WarpAdapterGenericTransaction,
  WarpCache,
  WarpCacheConfig,
  WarpCacheKey,
  WarpChainInfo,
  WarpClientConfig,
  WarpConstants,
  WarpContractAction,
  WarpLogger,
  WarpQueryAction,
} from '@joai/warps'
import { getMultiversxEntrypoint } from './helpers/general'
import { WarpMultiversxContractLoader } from './WarpMultiversxContractLoader'
import { WarpMultiversxSerializer } from './WarpMultiversxSerializer'

export class WarpMultiversxAbiBuilder implements AdapterWarpAbiBuilder {
  private readonly contractLoader: WarpMultiversxContractLoader
  private readonly cache: WarpCache

  constructor(
    private readonly config: WarpClientConfig,
    private readonly chain: WarpChainInfo
  ) {
    this.contractLoader = new WarpMultiversxContractLoader(this.config)
    this.cache = new WarpCache(this.config.env, this.config.cache)
  }

  async createInscriptionTransaction(abi: WarpAbiContents): Promise<WarpAdapterGenericTransaction> {
    const userWallet = getWarpWalletAddressFromConfig(this.config, this.chain.name)
    if (!userWallet) throw new Error('WarpBuilder: user address not set')
    const factoryConfig = new TransactionsFactoryConfig({ chainID: this.chain.chainId })
    const factory = new TransferTransactionsFactory({ config: factoryConfig })
    const sender = Address.newFromBech32(userWallet)

    const warpAbi: WarpAbi = {
      protocol: getLatestProtocolIdentifier('abi'),
      content: abi,
    }

    const serialized = JSON.stringify(warpAbi)

    const tx = await factory.createTransactionForTransfer(sender, {
      receiver: sender,
      nativeAmount: BigInt(0),
      data: Uint8Array.from(Buffer.from(serialized)),
    })

    tx.gasLimit = tx.gasLimit + BigInt(2_000_000) // overestimate to avoid gas limit errors for slight inaccuracies

    return tx
  }

  async createFromRaw(encoded: string): Promise<WarpAbi> {
    return JSON.parse(encoded) as WarpAbi
  }

  async createFromTransaction(tx: TransactionOnNetwork): Promise<WarpAbi> {
    const abi = await this.createFromRaw(tx.data.toString())

    abi.meta = {
      chain: this.chain.name,
      identifier: createWarpIdentifier(this.chain.name, 'hash', tx.hash),
      query: null,
      hash: tx.hash,
      creator: tx.sender.toBech32(),
      createdAt: new Date(tx.timestamp * 1000).toISOString(),
    }

    return abi
  }

  async createFromTransactionHash(hash: string, cache?: WarpCacheConfig): Promise<WarpAbi | null> {
    const cacheKey = WarpCacheKey.WarpAbi(this.config.env, hash)

    if (cache) {
      const cached = this.cache.get<WarpAbi>(cacheKey)
      if (cached) {
        WarpLogger.info(`WarpAbiBuilder (createFromTransactionHash): Warp abi found in cache: ${hash}`)
        return cached
      }
    }

    const chainEntry = getMultiversxEntrypoint(this.chain, this.config.env, this.config)
    const chainProvider = chainEntry.createNetworkProvider()

    try {
      const tx = await chainProvider.getTransaction(hash)
      const abi = await this.createFromTransaction(tx)

      if (cache && cache.ttl && abi) {
        this.cache.set(cacheKey, abi, cache.ttl)
      }

      return abi
    } catch (error) {
      WarpLogger.error('WarpAbiBuilder: Error creating from transaction hash', error)
      return null
    }
  }

  async getAbiForAction(action: WarpContractAction | WarpQueryAction): Promise<AbiRegistry> {
    if (action.abi) {
      return await this.fetchAbi(action)
    }
    if (!action.address) throw new Error('WarpActionExecutor: Address not found')
    const verification = await this.contractLoader.getVerificationInfo(action.address, this.chain)
    if (!verification) throw new Error('WarpActionExecutor: Verification info not found')

    return AbiRegistry.create(verification.abi)
  }

  async fetchAbi(action: WarpContractAction | WarpQueryAction): Promise<AbiRegistry> {
    if (!action.abi) throw new Error('WarpActionExecutor: ABI not found')
    if (action.abi.startsWith(WarpConstants.IdentifierType.Hash)) {
      const hashValue = action.abi.split(WarpConstants.ArgParamsSeparator)[1]
      const abi = await this.createFromTransactionHash(hashValue)
      if (!abi) throw new Error(`WarpActionExecutor: ABI not found for hash: ${action.abi}`)
      return AbiRegistry.create(abi.content)
    } else {
      const abiRes = await fetch(action.abi)
      const abiContents = await abiRes.json()
      return AbiRegistry.create(abiContents)
    }
  }

  endpointsToWarps(abi: AbiRegistry, contractAddress: string, rawAbiJson?: object): Warp[] {
    const serializer = new WarpMultiversxSerializer()
    const abiBase64 = rawAbiJson ? btoa(JSON.stringify(rawAbiJson)) : undefined

    return abi.getEndpoints().map((endpoint: any) => {
      const isReadonly = endpoint.modifiers.isReadonly()

      const inputs: WarpActionInput[] = endpoint.input.map((input: any, index: number) => {
        const inputDef: WarpActionInput = {
          name: input.name,
          type: serializer.typeToString(input.type as any),
          position: `arg:${index + 1}` as WarpActionInputPosition,
          source: 'field' as const,
          required: !input.type.hasClassOrSuperclass(OptionalType.ClassName) && !input.type.hasClassOrSuperclass(OptionType.ClassName),
        }

        if (input.type.hasExactClass(EnumType.ClassName)) {
          const enumType = input.type as EnumType
          inputDef.options = Object.fromEntries(enumType.variants.map((v: any) => [String(v.discriminant), v.name]))
        }

        return inputDef
      })

      const action = isReadonly
        ? { type: 'query' as const, label: endpoint.name, address: contractAddress, func: endpoint.name, args: [] as string[], abi: abiBase64, inputs }
        : { type: 'contract' as const, label: endpoint.name, address: contractAddress, func: endpoint.name, args: [] as string[], gasLimit: 10_000_000, abi: abiBase64, inputs }

      return {
        protocol: getLatestProtocolIdentifier('warp'),
        name: endpoint.name,
        title: endpoint.name,
        description: null,
        chain: this.chain.name,
        actions: [action],
      } as Warp
    })
  }
}
