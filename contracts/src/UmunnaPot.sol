// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title UmunnaPot
 * @notice Programmable group treasury (multi-sig quorum) and self-discipline salary
 *         drip vault paired with Roqqu API Services (RAS) inflow/off-ramp rails.
 */
contract UmunnaPot is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── Errors ───────────────────────────────────────────────────────────────
    error InvalidName();
    error InvalidSigners();
    error InvalidThreshold();
    error DuplicateOrZeroSigner();
    error CommunityNotFound();
    error NotCommunitySigner();
    error InvalidAmount();
    error InvalidRecipient();
    error InsufficientPotBalance(uint256 available, uint256 requested);
    error PayoutNotFound();
    error AlreadyApproved();
    error AlreadyExecuted();
    error QuorumNotReached(uint8 currentApprovals, uint8 requiredThreshold);

    error InvalidSchedule();
    error InvalidParticipants();
    error VaultNotFound();
    error VaultInactive();
    error ReleaseNotDue(uint64 currentTimestamp, uint64 nextReleaseAt);
    error NotBeneficiary();
    error NotGuardian();
    error EarlyExitNotRequested();

    // ─── Constants & Immutables ───────────────────────────────────────────────
    uint64 public constant MIN_INTERVAL_SECONDS = 30;
    IERC20 public immutable usdc;

    // ─── Data Structures ──────────────────────────────────────────────────────
    struct Community {
        string name;
        address creator;
        uint8 threshold;
        uint256 balance;
        uint256 totalContributed;
        uint64 createdAt;
        address[] signers;
        bool exists;
    }

    struct ContributionRecord {
        address sender;
        uint256 amount;
        uint64 timestamp;
        string contributorTag;
    }

    struct Payout {
        uint256 communityId;
        address proposer;
        address recipient;
        uint256 amount;
        uint8 approvalCount;
        bool executed;
        uint64 createdAt;
        string reason;
        string settlementRail;
        bool exists;
    }

    struct DripVault {
        address funder;
        address beneficiary;
        address guardian;
        uint256 totalAmount;
        uint256 remainingAmount;
        uint256 installmentAmount;
        uint64 intervalSeconds;
        uint64 nextReleaseAt;
        uint32 releasedCount;
        bool active;
        bool earlyExitRequested;
        bool exists;
    }

    // ─── State ────────────────────────────────────────────────────────────────
    uint256 public communityCount;
    uint256 public payoutCount;
    uint256 public vaultCount;

    mapping(uint256 => Community) private _communities;
    mapping(uint256 => mapping(address => bool)) public isCommunitySigner;
    mapping(uint256 => ContributionRecord[]) private _communityContributions;
    mapping(uint256 => uint256[]) private _communityPayoutIds;

    mapping(uint256 => Payout) private _payouts;
    mapping(uint256 => mapping(address => bool)) public hasApproved;

    mapping(uint256 => DripVault) private _vaults;
    mapping(address => uint256[]) private _userVaultIds;

    // ─── Events ───────────────────────────────────────────────────────────────
    event CommunityCreated(
        uint256 indexed communityId,
        string name,
        address indexed creator,
        uint8 threshold,
        uint256 signerCount
    );
    event Contributed(
        uint256 indexed communityId,
        address indexed sender,
        uint256 amount,
        string contributorTag
    );
    event PayoutProposed(
        uint256 indexed payoutId,
        uint256 indexed communityId,
        address indexed proposer,
        address recipient,
        uint256 amount,
        string reason,
        string settlementRail
    );
    event PayoutApproved(
        uint256 indexed payoutId,
        uint256 indexed communityId,
        address indexed signer,
        uint8 approvalCount,
        uint8 threshold
    );
    event PayoutExecuted(
        uint256 indexed payoutId,
        uint256 indexed communityId,
        address indexed recipient,
        uint256 amount,
        string settlementRail
    );
    event VaultCreated(
        uint256 indexed vaultId,
        address indexed funder,
        address indexed beneficiary,
        address guardian,
        uint256 totalAmount,
        uint256 installmentAmount,
        uint64 intervalSeconds,
        uint64 firstReleaseAt
    );
    event VaultReleased(
        uint256 indexed vaultId,
        address indexed beneficiary,
        uint256 amount,
        uint256 remainingAmount
    );
    event EarlyExitRequested(uint256 indexed vaultId, address indexed beneficiary);
    event EarlyExitApproved(
        uint256 indexed vaultId,
        address indexed beneficiary,
        address indexed guardian,
        uint256 refundedAmount
    );

    constructor(address usdcAddress) {
        if (usdcAddress == address(0)) revert InvalidRecipient();
        usdc = IERC20(usdcAddress);
    }

    // ─── Community Treasury Logic ─────────────────────────────────────────────

    function createCommunity(
        string calldata name,
        address[] calldata signers,
        uint8 threshold
    ) external returns (uint256 communityId) {
        if (bytes(name).length == 0) revert InvalidName();
        if (signers.length == 0 || signers.length > 20) revert InvalidSigners();
        if (threshold == 0 || threshold > signers.length) revert InvalidThreshold();

        communityId = ++communityCount;
        Community storage c = _communities[communityId];
        c.name = name;
        c.creator = msg.sender;
        c.threshold = threshold;
        c.createdAt = uint64(block.timestamp);
        c.exists = true;

        for (uint256 i = 0; i < signers.length; i++) {
            address signer = signers[i];
            if (signer == address(0) || isCommunitySigner[communityId][signer]) {
                revert DuplicateOrZeroSigner();
            }
            isCommunitySigner[communityId][signer] = true;
            c.signers.push(signer);
        }

        emit CommunityCreated(communityId, name, msg.sender, threshold, signers.length);
    }

    function contribute(
        uint256 communityId,
        uint256 amount,
        string calldata contributorTag
    ) external nonReentrant {
        Community storage c = _communities[communityId];
        if (!c.exists) revert CommunityNotFound();
        if (amount == 0) revert InvalidAmount();

        usdc.safeTransferFrom(msg.sender, address(this), amount);

        c.balance += amount;
        c.totalContributed += amount;
        _communityContributions[communityId].push(
            ContributionRecord({
                sender: msg.sender,
                amount: amount,
                timestamp: uint64(block.timestamp),
                contributorTag: contributorTag
            })
        );

        emit Contributed(communityId, msg.sender, amount, contributorTag);
    }

    function proposePayout(
        uint256 communityId,
        address recipient,
        uint256 amount,
        string calldata reason,
        string calldata settlementRail
    ) external returns (uint256 payoutId) {
        Community storage c = _communities[communityId];
        if (!c.exists) revert CommunityNotFound();
        if (!isCommunitySigner[communityId][msg.sender]) revert NotCommunitySigner();
        if (recipient == address(0)) revert InvalidRecipient();
        if (amount == 0) revert InvalidAmount();
        if (amount > c.balance) revert InsufficientPotBalance(c.balance, amount);

        payoutId = ++payoutCount;
        Payout storage p = _payouts[payoutId];
        p.communityId = communityId;
        p.proposer = msg.sender;
        p.recipient = recipient;
        p.amount = amount;
        p.approvalCount = 1;
        p.createdAt = uint64(block.timestamp);
        p.reason = reason;
        p.settlementRail = bytes(settlementRail).length == 0 ? "ONCHAIN" : settlementRail;
        p.exists = true;

        // Proposer automatically records approval #1
        hasApproved[payoutId][msg.sender] = true;
        _communityPayoutIds[communityId].push(payoutId);

        emit PayoutProposed(payoutId, communityId, msg.sender, recipient, amount, reason, p.settlementRail);
        emit PayoutApproved(payoutId, communityId, msg.sender, 1, c.threshold);
    }

    function approvePayout(uint256 payoutId) external {
        Payout storage p = _payouts[payoutId];
        if (!p.exists) revert PayoutNotFound();
        if (p.executed) revert AlreadyExecuted();
        if (!isCommunitySigner[p.communityId][msg.sender]) revert NotCommunitySigner();
        if (hasApproved[payoutId][msg.sender]) revert AlreadyApproved();

        hasApproved[payoutId][msg.sender] = true;
        uint8 updatedCount = ++p.approvalCount;

        emit PayoutApproved(payoutId, p.communityId, msg.sender, updatedCount, _communities[p.communityId].threshold);
    }

    function executePayout(uint256 payoutId) external nonReentrant {
        Payout storage p = _payouts[payoutId];
        if (!p.exists) revert PayoutNotFound();
        if (p.executed) revert AlreadyExecuted();

        Community storage c = _communities[p.communityId];
        if (p.approvalCount < c.threshold) revert QuorumNotReached(p.approvalCount, c.threshold);
        if (p.amount > c.balance) revert InsufficientPotBalance(c.balance, p.amount);

        p.executed = true;
        c.balance -= p.amount;
        usdc.safeTransfer(p.recipient, p.amount);

        emit PayoutExecuted(payoutId, p.communityId, p.recipient, p.amount, p.settlementRail);
    }

    // ─── Freelancer Drip Vault Logic ──────────────────────────────────────────

    function createDripVault(
        uint256 totalAmount,
        uint256 installmentAmount,
        uint64 intervalSeconds,
        uint64 firstReleaseAt,
        address beneficiary,
        address guardian
    ) external nonReentrant returns (uint256 vaultId) {
        if (totalAmount == 0 || installmentAmount == 0 || installmentAmount > totalAmount) revert InvalidSchedule();
        if (intervalSeconds < MIN_INTERVAL_SECONDS) revert InvalidSchedule();
        if (beneficiary == address(0) || guardian == address(0) || beneficiary == guardian) {
            revert InvalidParticipants();
        }

        uint64 initialRelease = firstReleaseAt == 0 ? uint64(block.timestamp) + intervalSeconds : firstReleaseAt;
        if (initialRelease < block.timestamp) revert InvalidSchedule();

        usdc.safeTransferFrom(msg.sender, address(this), totalAmount);

        vaultId = ++vaultCount;
        _vaults[vaultId] = DripVault({
            funder: msg.sender,
            beneficiary: beneficiary,
            guardian: guardian,
            totalAmount: totalAmount,
            remainingAmount: totalAmount,
            installmentAmount: installmentAmount,
            intervalSeconds: intervalSeconds,
            nextReleaseAt: initialRelease,
            releasedCount: 0,
            active: true,
            earlyExitRequested: false,
            exists: true
        });

        _userVaultIds[msg.sender].push(vaultId);
        if (beneficiary != msg.sender) _userVaultIds[beneficiary].push(vaultId);
        if (guardian != msg.sender && guardian != beneficiary) _userVaultIds[guardian].push(vaultId);

        emit VaultCreated(
            vaultId,
            msg.sender,
            beneficiary,
            guardian,
            totalAmount,
            installmentAmount,
            intervalSeconds,
            initialRelease
        );
    }

    function releaseDue(uint256 vaultId) external nonReentrant {
        DripVault storage v = _vaults[vaultId];
        if (!v.exists) revert VaultNotFound();
        if (!v.active) revert VaultInactive();
        if (block.timestamp < v.nextReleaseAt) revert ReleaseNotDue(uint64(block.timestamp), v.nextReleaseAt);

        uint256 releaseAmount = v.remainingAmount < v.installmentAmount ? v.remainingAmount : v.installmentAmount;
        v.remainingAmount -= releaseAmount;
        v.releasedCount += 1;

        if (v.remainingAmount == 0) {
            v.active = false;
            v.earlyExitRequested = false;
        } else {
            v.nextReleaseAt += v.intervalSeconds;
        }

        usdc.safeTransfer(v.beneficiary, releaseAmount);
        emit VaultReleased(vaultId, v.beneficiary, releaseAmount, v.remainingAmount);
    }

    function requestEarlyExit(uint256 vaultId) external {
        DripVault storage v = _vaults[vaultId];
        if (!v.exists) revert VaultNotFound();
        if (!v.active) revert VaultInactive();
        if (msg.sender != v.beneficiary) revert NotBeneficiary();

        v.earlyExitRequested = true;
        emit EarlyExitRequested(vaultId, msg.sender);
    }

    function approveEarlyExit(uint256 vaultId) external nonReentrant {
        DripVault storage v = _vaults[vaultId];
        if (!v.exists) revert VaultNotFound();
        if (!v.active) revert VaultInactive();
        if (msg.sender != v.guardian) revert NotGuardian();
        if (!v.earlyExitRequested) revert EarlyExitNotRequested();

        uint256 refundAmount = v.remainingAmount;
        v.remainingAmount = 0;
        v.active = false;
        v.earlyExitRequested = false;

        usdc.safeTransfer(v.beneficiary, refundAmount);
        emit EarlyExitApproved(vaultId, v.beneficiary, msg.sender, refundAmount);
    }

    // ─── View Helpers for Frontend & Keeper ───────────────────────────────────

    function getCommunity(uint256 communityId)
        external
        view
        returns (
            string memory name,
            address creator,
            uint8 threshold,
            uint256 balance,
            uint256 totalContributed,
            uint64 createdAt,
            address[] memory signers
        )
    {
        Community storage c = _communities[communityId];
        if (!c.exists) revert CommunityNotFound();
        return (c.name, c.creator, c.threshold, c.balance, c.totalContributed, c.createdAt, c.signers);
    }

    function getCommunityContributions(uint256 communityId) external view returns (ContributionRecord[] memory) {
        if (!_communities[communityId].exists) revert CommunityNotFound();
        return _communityContributions[communityId];
    }

    function getCommunityPayoutIds(uint256 communityId) external view returns (uint256[] memory) {
        if (!_communities[communityId].exists) revert CommunityNotFound();
        return _communityPayoutIds[communityId];
    }

    function getPayout(uint256 payoutId) external view returns (Payout memory) {
        if (!_payouts[payoutId].exists) revert PayoutNotFound();
        return _payouts[payoutId];
    }

    function getDripVault(uint256 vaultId) external view returns (DripVault memory) {
        if (!_vaults[vaultId].exists) revert VaultNotFound();
        return _vaults[vaultId];
    }

    function getUserVaultIds(address account) external view returns (uint256[] memory) {
        return _userVaultIds[account];
    }

    function getDueVaultIds() external view returns (uint256[] memory dueIds) {
        uint256 dueCount = 0;
        for (uint256 i = 1; i <= vaultCount; i++) {
            DripVault storage v = _vaults[i];
            if (v.active && block.timestamp >= v.nextReleaseAt) dueCount++;
        }
        dueIds = new uint256[](dueCount);
        uint256 idx = 0;
        for (uint256 i = 1; i <= vaultCount; i++) {
            DripVault storage v = _vaults[i];
            if (v.active && block.timestamp >= v.nextReleaseAt) dueIds[idx++] = i;
        }
    }
}
