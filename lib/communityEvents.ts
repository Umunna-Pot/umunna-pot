import { toEventSelector } from "viem"

// Matches `event CommunityCreated(uint256 indexed communityId, string name,
// address indexed creator, uint8 threshold, uint256 signerCount)` in UmunnaPot.sol
const COMMUNITY_CREATED_SIGNATURE =
  "CommunityCreated(uint256,string,address,uint8,uint256)"

interface ReceiptLog {
  address: string
  topics: readonly (string | null | undefined)[]
}

/**
 * Resolves the on-chain ID of a community created by OUR transaction.
 *
 * Reads the indexed `communityId` (topic[1]) of the `CommunityCreated` event in the
 * transaction's own receipt, so it is race-free even when other users create pots at
 * the same moment. Falls back to `communityCount()` only if the log is not found.
 */
export async function resolveNewCommunityId(params: {
  logs: readonly ReceiptLog[]
  contractAddress: string
  readCommunityCount: () => Promise<bigint>
}): Promise<number | undefined> {
  const selector = toEventSelector(COMMUNITY_CREATED_SIGNATURE)
  const createdLog = params.logs.find(
    (log) =>
      log.address.toLowerCase() === params.contractAddress.toLowerCase() &&
      log.topics[0] === selector &&
      Boolean(log.topics[1])
  )

  if (createdLog?.topics[1]) {
    return Number(BigInt(createdLog.topics[1]))
  }

  try {
    return Number(await params.readCommunityCount())
  } catch (err) {
    console.warn("[Viem] Could not resolve new community ID:", err)
    return undefined
  }
}
