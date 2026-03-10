import { Commitment, Connection, PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js'
import { WarpSolanaConstants } from './constants'

const MINT_SIZE = 82
const TOKEN_TRANSFER_INSTRUCTION = 3

// We only need a small, stable subset of the SPL Token program surface.
// Keeping these protocol-level helpers local avoids pulling browser-hostile transitive deps
// while keeping the adapter logic explicit and test-covered.

export const TOKEN_PROGRAM_ID = new PublicKey(WarpSolanaConstants.Programs.TokenProgram)
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')

type MintAccountInfo = {
  address: PublicKey
  decimals: number
  isInitialized: boolean
}

export const getAssociatedTokenAddress = async (
  mint: PublicKey,
  owner: PublicKey,
  allowOwnerOffCurve = false,
  programId = TOKEN_PROGRAM_ID,
  associatedTokenProgramId = ASSOCIATED_TOKEN_PROGRAM_ID
): Promise<PublicKey> => getAssociatedTokenAddressSync(mint, owner, allowOwnerOffCurve, programId, associatedTokenProgramId)

export const getAssociatedTokenAddressSync = (
  mint: PublicKey,
  owner: PublicKey,
  allowOwnerOffCurve = false,
  programId = TOKEN_PROGRAM_ID,
  associatedTokenProgramId = ASSOCIATED_TOKEN_PROGRAM_ID
): PublicKey => {
  if (!allowOwnerOffCurve && !PublicKey.isOnCurve(owner.toBuffer())) {
    throw new Error('Owner cannot be a PDA')
  }

  const [address] = PublicKey.findProgramAddressSync([owner.toBuffer(), programId.toBuffer(), mint.toBuffer()], associatedTokenProgramId)
  return address
}

export const createAssociatedTokenAccountInstruction = (
  payer: PublicKey,
  associatedToken: PublicKey,
  owner: PublicKey,
  mint: PublicKey,
  programId = TOKEN_PROGRAM_ID,
  associatedTokenProgramId = ASSOCIATED_TOKEN_PROGRAM_ID
): TransactionInstruction =>
  new TransactionInstruction({
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: associatedToken, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: false, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: programId, isSigner: false, isWritable: false },
    ],
    programId: associatedTokenProgramId,
    data: Buffer.alloc(0),
  })

export const createTransferInstruction = (
  source: PublicKey,
  destination: PublicKey,
  owner: PublicKey,
  amount: number | bigint,
  programId = TOKEN_PROGRAM_ID
): TransactionInstruction => {
  const data = Buffer.alloc(9)
  data.writeUInt8(TOKEN_TRANSFER_INSTRUCTION, 0)
  data.writeBigUInt64LE(BigInt(amount), 1)

  return new TransactionInstruction({
    keys: [
      { pubkey: source, isSigner: false, isWritable: true },
      { pubkey: destination, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
    programId,
    data,
  })
}

export const getMint = async (
  connection: Connection,
  address: PublicKey,
  commitment?: Commitment,
  programId = TOKEN_PROGRAM_ID
): Promise<MintAccountInfo> => {
  const info = await connection.getAccountInfo(address, commitment)

  if (!info) throw new Error('Token mint account not found')
  if (!info.owner.equals(programId)) throw new Error('Token mint account owner mismatch')
  if (info.data.length < MINT_SIZE) throw new Error('Token mint account has invalid size')

  return {
    address,
    decimals: info.data.readUInt8(44),
    isInitialized: info.data.readUInt8(45) !== 0,
  }
}
