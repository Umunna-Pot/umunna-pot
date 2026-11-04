// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {UmunnaPot} from "../src/UmunnaPot.sol";

contract UmunnaPotTest is Test {
    MockUSDC internal usdc;
    UmunnaPot internal pot;

    address internal signerA = makeAddr("signerA");
    address internal signerB = makeAddr("signerB");
    address internal signerC = makeAddr("signerC");
    address internal member = makeAddr("member");
    address internal relayer = makeAddr("relayer");
    address internal hospitalRecipient = makeAddr("hospitalRecipient");

    uint256 internal constant ONE_USDC = 1e6;

    function setUp() public {
        usdc = new MockUSDC();
        pot = new UmunnaPot(address(usdc));

        usdc.mint(member, 1_000 * ONE_USDC);
        usdc.mint(relayer, 5_000 * ONE_USDC);
    }

    function _createDefaultCommunity() internal returns (uint256 communityId) {
        address[] memory signers = new address[](3);
        signers[0] = signerA;
        signers[1] = signerB;
        signers[2] = signerC;

        vm.prank(signerA);
        communityId = pot.createCommunity("Enugu Town Union Health Pot", signers, 2);
    }

    function test_RevertWhen_DuplicateSignersProvided() public {
        address[] memory signers = new address[](3);
        signers[0] = signerA;
        signers[1] = signerA;
        signers[2] = signerB;

        vm.expectRevert(UmunnaPot.DuplicateOrZeroSigner.selector);
        pot.createCommunity("Duplicate Pot", signers, 2);
    }

    function test_ContributeWeb3AndRoqquRelayerTag() public {
        uint256 communityId = _createDefaultCommunity();

        vm.startPrank(member);
        usdc.approve(address(pot), 100 * ONE_USDC);
        pot.contribute(communityId, 100 * ONE_USDC, "Ada (Web3 Wallet)");
        vm.stopPrank();

        vm.startPrank(relayer);
        usdc.approve(address(pot), 50 * ONE_USDC);
        pot.contribute(communityId, 50 * ONE_USDC, "Uncle Chidi (via Roqqu TRC-20)");
        vm.stopPrank();

        (, , uint8 threshold, uint256 balance, uint256 totalContributed, , ) =
            pot.getCommunity(communityId);
        assertEq(threshold, 2);
        assertEq(balance, 150 * ONE_USDC);
        assertEq(totalContributed, 150 * ONE_USDC);

        UmunnaPot.ContributionRecord[] memory records = pot.getCommunityContributions(communityId);
        assertEq(records.length, 2);
        assertEq(records[1].contributorTag, "Uncle Chidi (via Roqqu TRC-20)");
    }

    function test_RevertWhen_ExecutingWithOneOfThreeApprovals() public {
        uint256 communityId = _createDefaultCommunity();

        vm.startPrank(member);
        usdc.approve(address(pot), 100 * ONE_USDC);
        pot.contribute(communityId, 100 * ONE_USDC, "Member Contribution");
        vm.stopPrank();

        // Signer A proposes (auto-records approval 1 of 2)
        vm.prank(signerA);
        uint256 payoutId = pot.proposePayout(
            communityId,
            hospitalRecipient,
            40 * ONE_USDC,
            "Hospital Emergency Bill",
            "ROQQU_OFFRAMP:NGN"
        );

        // Attempting execution with only 1 approval must revert
        vm.expectRevert(abi.encodeWithSelector(UmunnaPot.QuorumNotReached.selector, 1, 2));
        pot.executePayout(payoutId);
    }

    function test_ExecutePayoutWhenTwoOfThreeQuorumMet() public {
        uint256 communityId = _createDefaultCommunity();

        vm.startPrank(member);
        usdc.approve(address(pot), 100 * ONE_USDC);
        pot.contribute(communityId, 100 * ONE_USDC, "Member Contribution");
        vm.stopPrank();

        vm.prank(signerA);
        uint256 payoutId = pot.proposePayout(
            communityId,
            hospitalRecipient,
            40 * ONE_USDC,
            "Hospital Emergency Bill",
            "ROQQU_OFFRAMP:NGN"
        );

        // Double approval by Signer A reverts
        vm.prank(signerA);
        vm.expectRevert(UmunnaPot.AlreadyApproved.selector);
        pot.approvePayout(payoutId);

        // Signer B approves -> quorum 2 of 3 reached
        vm.prank(signerB);
        pot.approvePayout(payoutId);

        vm.expectEmit(true, true, true, true);
        emit UmunnaPot.PayoutExecuted(
            payoutId,
            communityId,
            hospitalRecipient,
            40 * ONE_USDC,
            "ROQQU_OFFRAMP:NGN"
        );
        pot.executePayout(payoutId);

        assertEq(usdc.balanceOf(hospitalRecipient), 40 * ONE_USDC);
        (, , , uint256 remainingBalance, , , ) = pot.getCommunity(communityId);
        assertEq(remainingBalance, 60 * ONE_USDC);

        // Re-execution reverts
        vm.expectRevert(UmunnaPot.AlreadyExecuted.selector);
        pot.executePayout(payoutId);
    }
}

