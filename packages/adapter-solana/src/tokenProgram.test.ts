import { Connection, Keypair, PublicKey } from '@solana/web3.js'
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAssociatedTokenAddress,
  getAssociatedTokenAddressSync,
  getMint,
  TOKEN_PROGRAM_ID,
} from './tokenProgram'

describe('tokenProgram helpers', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('derives the associated token address with the canonical PDA seeds', async () => {
    const owner = Keypair.generate().publicKey
    const mint = Keypair.generate().publicKey

    const [expectedAddress] = PublicKey.findProgramAddressSync(
      [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
      ASSOCIATED_TOKEN_PROGRAM_ID
    )

    await expect(getAssociatedTokenAddress(mint, owner)).resolves.toEqual(expectedAddress)
    expect(getAssociatedTokenAddressSync(mint, owner)).toEqual(expectedAddress)
  })

  it('rejects PDA owners unless explicitly allowed', () => {
    const mint = Keypair.generate().publicKey
    const [owner] = PublicKey.findProgramAddressSync([Buffer.from('owner')], Keypair.generate().publicKey)

    expect(() => getAssociatedTokenAddressSync(mint, owner)).toThrow('Owner cannot be a PDA')
    expect(getAssociatedTokenAddressSync(mint, owner, true)).toBeInstanceOf(PublicKey)
  })

  it('builds an associated token account instruction with the expected accounts', () => {
    const payer = Keypair.generate().publicKey
    const owner = Keypair.generate().publicKey
    const mint = Keypair.generate().publicKey
    const associatedToken = getAssociatedTokenAddressSync(mint, owner)

    const instruction = createAssociatedTokenAccountInstruction(payer, associatedToken, owner, mint)

    expect(instruction.programId).toEqual(ASSOCIATED_TOKEN_PROGRAM_ID)
    expect(instruction.keys.map((key) => key.pubkey.toBase58())).toEqual([
      payer.toBase58(),
      associatedToken.toBase58(),
      owner.toBase58(),
      mint.toBase58(),
      '11111111111111111111111111111111',
      TOKEN_PROGRAM_ID.toBase58(),
    ])
    expect(instruction.data.length).toBe(0)
  })

  it('builds a token transfer instruction with the expected discriminator and amount', () => {
    const source = Keypair.generate().publicKey
    const destination = Keypair.generate().publicKey
    const owner = Keypair.generate().publicKey

    const instruction = createTransferInstruction(source, destination, owner, 42n)

    expect(instruction.programId).toEqual(TOKEN_PROGRAM_ID)
    expect(instruction.data.readUInt8(0)).toBe(3)
    expect(instruction.data.readBigUInt64LE(1)).toBe(42n)
    expect(instruction.keys.map((key) => ({ signer: key.isSigner, writable: key.isWritable }))).toEqual([
      { signer: false, writable: true },
      { signer: false, writable: true },
      { signer: true, writable: false },
    ])
  })

  it('reads mint decimals from the mint account layout', async () => {
    const mint = Keypair.generate().publicKey
    const data = Buffer.alloc(82)
    data.writeUInt8(9, 44)
    data.writeUInt8(1, 45)

    const connection = new Connection('http://127.0.0.1:8899')
    jest.spyOn(connection, 'getAccountInfo').mockResolvedValue({
      owner: TOKEN_PROGRAM_ID,
      data,
      executable: false,
      lamports: 0,
      rentEpoch: 0,
    } as Awaited<ReturnType<Connection['getAccountInfo']>>)

    await expect(getMint(connection, mint)).resolves.toMatchObject({
      address: mint,
      decimals: 9,
      isInitialized: true,
    })
  })
})
