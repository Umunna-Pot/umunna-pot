"use client"

import * as React from "react"
import {
  useAccount,
  useChainId,
  usePublicClient,
  useReadContract,
  useWriteContract,
} from "wagmi"
import { isAddress } from "viem"
import {
  BASE_SEPOLIA_CHAIN_ID,
  MOCK_USDC_ABI,
  MOCK_USDC_ADDRESS,
  UMUNNA_POT_ABI,
  UMUNNA_POT_ADDRESS,
  isContractConfigured,
} from "@/lib/contracts"
import {
  extractVaultCreatedEvent,
  extractVaultReleasedEvent,
  verifyOnChainStateMatchesEvent,
  syncConfirmedVaultWithApi,
  type SyncDripVaultResult,
  type SyncStatus,
  type OnChainVaultState,
} from "@/lib/dripVaultSync"

export interface OnChainDripVault {
  funder: `0x${string}`
  beneficiary: `0x${string}`
  guardian: `0x${string}`
  totalAmount: bigint
  remainingAmount: bigint
  installmentAmount: bigint
  intervalSeconds: bigint
  nextReleaseAt: bigint
  releasedCount: number
  active: boolean
  earlyExitRequested: boolean
  exists: boolean
}

export interface CreateVaultParams {
  totalAmount: bigint // base units (6 decimals)
  installmentAmount: bigint // base units (6 decimals)
  intervalSeconds: bigint // >= 30 seconds
  firstReleaseAt: bigint // 0 for automatic (now + interval) or future epoch
  beneficiary: `0x${string}`
  guardian: `0x${string}`
}

export interface ReleaseResult {
  txHash: `0x${string}`
  vaultId: bigint
  releasedAmount: bigint
  remainingAmount: bigint
  beneficiary: `0x${string}`
  updatedState: OnChainDripVault
}

export function useDripVault() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const publicClient = usePublicClient()
  const { writeContractAsync } = useWriteContract()
  const liveContract = isContractConfigured()
  const isCorrectChain = chainId === BASE_SEPOLIA_CHAIN_ID

  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isRetryingSync, setIsRetryingSync] = React.useState(false)
  const [syncStatus, setSyncStatus] = React.useState<SyncStatus>("IDLE")
  const [lastTxHash, setLastTxHash] = React.useState<`0x${string}` | null>(null)
  const [lastVaultId, setLastVaultId] = React.useState<bigint | null>(null)
  const [lastSyncResult, setLastSyncResult] = React.useState<SyncDripVaultResult | null>(null)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  // 1. Read: User's MockUSDC balance
  const usdcBalanceRead = useReadContract({
    address: MOCK_USDC_ADDRESS,
    abi: MOCK_USDC_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: liveContract && Boolean(address) && isCorrectChain },
  })

  // 2. Read: MockUSDC allowance for UmunnaPot
  const usdcAllowanceRead = useReadContract({
    address: MOCK_USDC_ADDRESS,
    abi: MOCK_USDC_ABI,
    functionName: "allowance",
    args: address ? [address, UMUNNA_POT_ADDRESS] : undefined,
    query: { enabled: liveContract && Boolean(address) && isCorrectChain },
  })

  // 3. Read: Total Vault Count
  const vaultCountRead = useReadContract({
    address: UMUNNA_POT_ADDRESS,
    abi: UMUNNA_POT_ABI,
    functionName: "vaultCount",
    query: { enabled: liveContract && isCorrectChain },
  })

  // 4. Read: User's Vault IDs
  const userVaultIdsRead = useReadContract({
    address: UMUNNA_POT_ADDRESS,
    abi: UMUNNA_POT_ABI,
    functionName: "getUserVaultIds",
    args: address ? [address] : undefined,
    query: { enabled: liveContract && Boolean(address) && isCorrectChain },
  })

  // 5. Read: Due Vault IDs (for claimable sweeps)
  const dueVaultIdsRead = useReadContract({
    address: UMUNNA_POT_ADDRESS,
    abi: UMUNNA_POT_ABI,
    functionName: "getDueVaultIds",
    query: { enabled: liveContract && isCorrectChain },
  })

  const usdcBalance = (usdcBalanceRead.data as bigint | undefined) ?? 0n
  const usdcAllowance = (usdcAllowanceRead.data as bigint | undefined) ?? 0n
  const vaultCount = Number((vaultCountRead.data as bigint | undefined) ?? 0n)
  const userVaultIds = ((userVaultIdsRead.data as bigint[] | undefined) ?? []).map((id) => BigInt(id))
  const dueVaultIds = ((dueVaultIdsRead.data as bigint[] | undefined) ?? []).map((id) => BigInt(id))

  /**
   * Reads full on-chain DripVault struct for a specific vaultId directly via publicClient
   */
  const getDripVault = React.useCallback(
    async (vaultId: bigint): Promise<OnChainDripVault> => {
      if (!publicClient) throw new Error("Base Sepolia public client not available")
      const result = await publicClient.readContract({
        address: UMUNNA_POT_ADDRESS,
        abi: UMUNNA_POT_ABI,
        functionName: "getDripVault",
        args: [vaultId],
      })
      return result as unknown as OnChainDripVault
    },
    [publicClient]
  )

  /**
   * Approves MockUSDC for the UmunnaPot contract and awaits on-chain receipt confirmation
   */
  const approveUsdc = React.useCallback(
    async (amount: bigint): Promise<`0x${string}`> => {
      if (!isConnected || !address) throw new Error("Wallet not connected.")
      if (!isCorrectChain) throw new Error("Connected wallet is on wrong network. Please switch to Base Sepolia.")
      if (!publicClient) throw new Error("Public client not available.")

      setErrorMessage(null)
      setIsSubmitting(true)
      try {
        const hash = await writeContractAsync({
          address: MOCK_USDC_ADDRESS,
          abi: MOCK_USDC_ABI,
          functionName: "approve",
          args: [UMUNNA_POT_ADDRESS, amount],
        })

        const receipt = await publicClient.waitForTransactionReceipt({ hash })
        if (receipt.status !== "success") {
          throw new Error("Approval transaction reverted on-chain.")
        }

        await usdcAllowanceRead.refetch()
        return hash
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Approval failed"
        setErrorMessage(msg)
        throw err
      } finally {
        setIsSubmitting(false)
      }
    },
    [isConnected, address, isCorrectChain, publicClient, writeContractAsync, usdcAllowanceRead]
  )

  /**
   * Creates a new Drip Vault:
   * 1. Checks balance and allowance (initiating approval if needed).
   * 2. Broadcasts createDripVault.
   * 3. Awaits receipt confirmation.
   * 4. Extracts & strictly validates VaultCreated against submitted params.
   * 5. Reads contract state and verifies state matches event.
   * 6. Idempotently synchronizes transaction with backend API.
   */
  const createDripVault = React.useCallback(
    async (params: CreateVaultParams): Promise<SyncDripVaultResult> => {
      if (isSubmitting) throw new Error("A transaction is already in progress.")
      if (!isConnected || !address) throw new Error("Wallet not connected.")
      if (!isCorrectChain) throw new Error("Connected wallet is on wrong network. Please switch to Base Sepolia.")
      if (!publicClient) throw new Error("Public client not available.")

      // Form validation
      if (!isAddress(params.beneficiary)) throw new Error("Invalid beneficiary address.")
      if (!isAddress(params.guardian)) throw new Error("Invalid guardian address.")
      if (params.beneficiary.toLowerCase() === params.guardian.toLowerCase()) {
        throw new Error("Beneficiary and Guardian must be distinct addresses.")
      }
      if (params.totalAmount <= 0n) throw new Error("Total amount must be greater than zero.")
      if (params.installmentAmount <= 0n) throw new Error("Installment amount must be greater than zero.")
      if (params.installmentAmount > params.totalAmount) {
        throw new Error("Installment amount cannot exceed total amount.")
      }
      if (params.intervalSeconds < 30n) throw new Error("Minimum release interval is 30 seconds.")

      // Check balance
      if (usdcBalance < params.totalAmount) {
        throw new Error("Insufficient MockUSDC balance for vault creation.")
      }

      // Check and prompt allowance
      if (usdcAllowance < params.totalAmount) {
        await approveUsdc(params.totalAmount)
      }

      setErrorMessage(null)
      setIsSubmitting(true)
      setSyncStatus("PENDING_ON_CHAIN")

      try {
        // Broadcast on-chain transaction
        const txHash = await writeContractAsync({
          address: UMUNNA_POT_ADDRESS,
          abi: UMUNNA_POT_ABI,
          functionName: "createDripVault",
          args: [
            params.totalAmount,
            params.installmentAmount,
            params.intervalSeconds,
            params.firstReleaseAt,
            params.beneficiary,
            params.guardian,
          ],
        })

        setLastTxHash(txHash)

        // Await confirmation receipt
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
        if (receipt.status !== "success") {
          throw new Error("Vault creation transaction reverted on Base Sepolia.")
        }

        // Verify VaultCreated event in receipt against submitted parameters
        const event = extractVaultCreatedEvent(
          {
            logs: receipt.logs,
            status: receipt.status,
            to: receipt.to,
            from: receipt.from,
            blockNumber: receipt.blockNumber,
            blockHash: receipt.blockHash,
            transactionHash: receipt.transactionHash,
          },
          {
            funder: address,
            beneficiary: params.beneficiary,
            guardian: params.guardian,
            totalAmount: params.totalAmount,
            installmentAmount: params.installmentAmount,
            intervalSeconds: params.intervalSeconds,
            firstReleaseAt: params.firstReleaseAt,
          }
        )

        setLastVaultId(event.vaultId)

        // Read contract state getDripVault(vaultId) and verify state matches event
        const onChainState = (await publicClient.readContract({
          address: UMUNNA_POT_ADDRESS,
          abi: UMUNNA_POT_ABI,
          functionName: "getDripVault",
          args: [event.vaultId],
        })) as unknown as OnChainVaultState

        verifyOnChainStateMatchesEvent(onChainState, event)

        setSyncStatus("ON_CHAIN_SUCCESS_DATABASE_SYNC_PENDING")

        // Refetch on-chain state
        await Promise.all([
          vaultCountRead.refetch(),
          userVaultIdsRead.refetch(),
          usdcBalanceRead.refetch(),
        ])

        // Synchronize with API
        const syncResult = await syncConfirmedVaultWithApi(txHash, event.vaultId, receipt.blockNumber)
        setLastSyncResult(syncResult)
        setSyncStatus(syncResult.status)

        return syncResult
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Vault creation failed."
        setErrorMessage(msg)
        setSyncStatus("FAILED")
        throw err
      } finally {
        setIsSubmitting(false)
      }
    },
    [
      isSubmitting,
      isConnected,
      address,
      isCorrectChain,
      publicClient,
      usdcBalance,
      usdcAllowance,
      approveUsdc,
      writeContractAsync,
      vaultCountRead,
      userVaultIdsRead,
      usdcBalanceRead,
    ]
  )

  /**
   * Safely retries synchronizing an already confirmed on-chain vault with the database API.
   * GUARANTEE: Never invokes createDripVault or creates a second on-chain vault.
   * Prevents concurrent retry executions.
   */
  const retrySync = React.useCallback(async (): Promise<SyncDripVaultResult> => {
    if (isRetryingSync) throw new Error("Retry synchronization is already in progress.")
    if (!lastTxHash) throw new Error("No pending transaction hash available to retry.")

    setIsRetryingSync(true)
    try {
      const result = await syncConfirmedVaultWithApi(lastTxHash, lastVaultId ?? undefined)
      setLastSyncResult(result)
      setSyncStatus(result.status)
      if (result.status === "ON_CHAIN_SUCCESS_DATABASE_SYNCED") {
        setErrorMessage(null)
      } else if (result.error) {
        setErrorMessage(result.error)
      }
      return result
    } finally {
      setIsRetryingSync(false)
    }
  }, [isRetryingSync, lastTxHash, lastVaultId])

  /**
   * Releases an installment for a due vault:
   * 1. Confirms vault exists and is active.
   * 2. Confirms block.timestamp >= nextReleaseAt.
   * 3. Submits releaseDue transaction.
   * 4. Awaits receipt confirmation.
   * 5. Strictly decodes and verifies VaultReleased event from receipt.
   * 6. Reads contract state to confirm released and remaining amounts updated.
   * 7. Refetches balances and due lists only upon confirmed verification.
   */
  const releaseDue = React.useCallback(
    async (vaultId: bigint): Promise<ReleaseResult> => {
      if (isSubmitting) throw new Error("A transaction is already in progress.")
      if (!isConnected || !address) throw new Error("Wallet not connected.")
      if (!isCorrectChain) throw new Error("Connected wallet is on wrong network. Please switch to Base Sepolia.")
      if (!publicClient) throw new Error("Public client not available.")

      const preState = await getDripVault(vaultId)
      if (!preState.exists) throw new Error("Vault not found on-chain.")
      if (!preState.active) throw new Error("Vault is inactive or already completed.")

      const block = await publicClient.getBlock()
      if (block.timestamp < preState.nextReleaseAt) {
        throw new Error("Release is not yet due according to contract schedule.")
      }

      setIsSubmitting(true)
      setErrorMessage(null)
      try {
        const hash = await writeContractAsync({
          address: UMUNNA_POT_ADDRESS,
          abi: UMUNNA_POT_ABI,
          functionName: "releaseDue",
          args: [vaultId],
        })

        const receipt = await publicClient.waitForTransactionReceipt({ hash })
        if (receipt.status !== "success") {
          throw new Error("Release transaction reverted on Base Sepolia.")
        }

        // Strictly verify VaultReleased log in receipt
        const event = extractVaultReleasedEvent(
          {
            logs: receipt.logs,
            status: receipt.status,
            to: receipt.to,
            blockNumber: receipt.blockNumber,
            blockHash: receipt.blockHash,
            transactionHash: receipt.transactionHash,
          },
          vaultId,
          preState.beneficiary
        )

        // Read updated vault state from contract
        const postState = await getDripVault(vaultId)

        // Validate state matches event transition
        if (postState.remainingAmount !== event.remainingAmount) {
          throw new Error("Contract remaining amount does not match VaultReleased event.")
        }
        if (postState.releasedCount !== preState.releasedCount + 1) {
          throw new Error("Contract releasedCount did not increment after release.")
        }

        // Only after full verification, refetch reactive lists
        await Promise.all([
          dueVaultIdsRead.refetch(),
          usdcBalanceRead.refetch(),
        ])

        return {
          txHash: hash,
          vaultId,
          releasedAmount: event.amount,
          remainingAmount: event.remainingAmount,
          beneficiary: event.beneficiary,
          updatedState: postState,
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Release execution failed."
        setErrorMessage(msg)
        throw err
      } finally {
        setIsSubmitting(false)
      }
    },
    [
      isSubmitting,
      isConnected,
      address,
      isCorrectChain,
      publicClient,
      getDripVault,
      writeContractAsync,
      dueVaultIdsRead,
      usdcBalanceRead,
    ]
  )

  return {
    // States
    isConnected,
    isCorrectChain,
    isSubmitting,
    isRetryingSync,
    syncStatus,
    lastTxHash,
    lastVaultId,
    lastSyncResult,
    errorMessage,

    // Balances & Metrics
    usdcBalance,
    usdcAllowance,
    vaultCount,
    userVaultIds,
    dueVaultIds,

    // Methods
    getDripVault,
    approveUsdc,
    createDripVault,
    retrySync,
    releaseDue,
    refetchAll: () =>
      Promise.all([
        usdcBalanceRead.refetch(),
        usdcAllowanceRead.refetch(),
        vaultCountRead.refetch(),
        userVaultIdsRead.refetch(),
        dueVaultIdsRead.refetch(),
      ]),
  }
}
