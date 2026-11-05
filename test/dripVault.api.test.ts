import { test, describe, before, after } from "node:test"
import assert from "node:assert/strict"

process.loadEnvFile?.(".env.local")

import mongoose from "mongoose"
import { GET, POST } from "../app/api/drip-vaults/route"
import DripVault from "../models/DripVault"
import { BASE_SEPOLIA_CHAIN_ID, UMUNNA_POT_ADDRESS } from "../lib/contracts"

describe("Drip Vault API Hardening & Idempotency Tests", () => {
  before(async () => {
    if (process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI, {
        dbName: process.env.MONGODB_DB || "umunna_pot",
      })
    }
  })

  after(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect()
    }
  })

  test("1. GET /api/drip-vaults rejects request without address parameter (400)", async () => {
    const req = new Request("http://localhost:3000/api/drip-vaults")
    const res = await GET(req)
    assert.equal(res.status, 400)
    const json = await res.json()
    assert.equal(json.error, "Query parameter 'address' is required.")
  })

  test("2. GET /api/drip-vaults rejects invalid EVM address format (400)", async () => {
    const req = new Request("http://localhost:3000/api/drip-vaults?address=not-an-address")
    const res = await GET(req)
    assert.equal(res.status, 400)
    const json = await res.json()
    assert.equal(json.error, "Invalid Ethereum/EVM wallet address format.")
  })

  test("3. GET /api/drip-vaults is purely read-only and never inserts synthetic seed vaults", async () => {
    const randomAddr = "0x000000000000000000000000000000000000dEaD"
    const req = new Request(`http://localhost:3000/api/drip-vaults?address=${randomAddr}`)
    const res = await GET(req)
    assert.equal(res.status, 200)
    const json = await res.json()
    assert.equal(json.count, 0)
    assert.deepEqual(json.vaults, [])
    assert.equal(json.chainId, BASE_SEPOLIA_CHAIN_ID)
    assert.equal(json.contractAddress, UMUNNA_POT_ADDRESS.toLowerCase())
  })

  test("4. POST /api/drip-vaults rejects non-JSON or empty payloads (400)", async () => {
    const req = new Request("http://localhost:3000/api/drip-vaults", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "invalid-json",
    })
    const res = await POST(req)
    assert.equal(res.status, 400)
  })

  test("5. POST /api/drip-vaults rejects missing or malformed txHash (400)", async () => {
    const req = new Request("http://localhost:3000/api/drip-vaults", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ txHash: "0x1234" }),
    })
    const res = await POST(req)
    assert.equal(res.status, 400)
    const json = await res.json()
    assert.ok(json.error.includes("txHash"))
  })

  test("6. POST /api/drip-vaults returns 404 for unconfirmed or non-existent transaction hash", async () => {
    const fakeTx = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    const req = new Request("http://localhost:3000/api/drip-vaults", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ txHash: fakeTx }),
    })
    const res = await POST(req)
    assert.equal(res.status, 404)
    const json = await res.json()
    assert.ok(json.error.includes("not found"))
  })

  test("7. Idempotency test: duplicate verified document returns existing record with status 200", async () => {
    if (mongoose.connection.readyState === 1) {
      const testVaultId = "999999"
      const testTx = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
      
      // Clean up test document if present
      await DripVault.deleteOne({ onChainVaultId: testVaultId })

      // Seed a verified record directly
      const created = await DripVault.create({
        chainId: BASE_SEPOLIA_CHAIN_ID,
        contractAddress: UMUNNA_POT_ADDRESS.toLowerCase(),
        onChainVaultId: testVaultId,
        transactionHash: testTx,
        eventLogIndex: 0,
        blockNumber: 123456,
        blockHash: "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        funderAddress: "0x1111111111111111111111111111111111111111",
        freelancerAddress: "0x1111111111111111111111111111111111111111",
        beneficiaryAddress: "0x1111111111111111111111111111111111111111",
        guardianAddress: "0x2222222222222222222222222222222222222222",
        totalLockedBaseUnits: "500000000",
        installmentAmountBaseUnits: "100000000",
        claimedBaseUnits: "0",
        remainingBaseUnits: "500000000",
        intervalSeconds: 60,
        nextReleaseAt: new Date(Date.now() + 60000),
        releasedCount: 0,
        active: true,
        earlyExitRequested: false,
        verificationStatus: "verified",
        status: "streaming",
      })

      // Submit POST with identical txHash
      const req = new Request("http://localhost:3000/api/drip-vaults", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txHash: testTx }),
      })
      const res = await POST(req)
      assert.equal(res.status, 200)
      const json = await res.json()
      assert.equal(json.idempotent, true)
      assert.equal(json.vault.onChainVaultId, testVaultId)

      // Clean up test document
      await DripVault.deleteOne({ _id: created._id })
    }
  })
})
