// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {UmunnaPot} from "../src/UmunnaPot.sol";

contract DripVaultTest is Test {
    MockUSDC internal usdc;
    UmunnaPot internal pot;

    address internal freelancer = makeAddr("freelancer");
    address internal guardian = makeAddr("guardian");
    address internal keeper = makeAddr("keeper");
    address internal stranger = makeAddr("stranger");

    uint256 internal constant ONE_USDC = 1e6;

    function setUp() public {
        usdc = new MockUSDC();
        pot = new UmunnaPot(address(usdc));

        usdc.mint(freelancer, 1_000 * ONE_USDC);
    }

    function _createStandardVault() internal returns (uint256 vaultId) {
        vm.startPrank(freelancer);
        usdc.approve(address(pot), 300 * ONE_USDC);
        vaultId = pot.createDripVault(
            300 * ONE_USDC,
            50 * ONE_USDC,
            60, // 60-second demo cadence
            0,  // auto-sets firstReleaseAt = block.timestamp + 60
            freelancer,
            guardian
        );
        vm.stopPrank();
    }

    function test_RevertWhen_ReleaseCalledBeforeSchedule() public {
        uint256 vaultId = _createStandardVault();
        uint64 expectedDue = uint64(block.timestamp) + 60;

        vm.warp(block.timestamp + 25);
        vm.expectRevert(
            abi.encodeWithSelector(
                UmunnaPot.ReleaseNotDue.selector,
                uint64(block.timestamp),
                expectedDue
            )
        );
        pot.releaseDue(vaultId);
    }

    function test_ReleaseDueInstallmentsUntilCompleted() public {
        uint256 startBalance = usdc.balanceOf(freelancer);
        uint256 vaultId = _createStandardVault();
        assertEq(usdc.balanceOf(freelancer), startBalance - 300 * ONE_USDC);

        // Release all 6 installments of 50 USDC at 60s intervals
        for (uint256 i = 1; i <= 6; i++) {
            vm.warp(block.timestamp + 60);

            uint256[] memory due = pot.getDueVaultIds();
            assertEq(due.length, 1);
            assertEq(due[0], vaultId);

            vm.prank(keeper);
            pot.releaseDue(vaultId);

            assertEq(
                usdc.balanceOf(freelancer),
                startBalance - 300 * ONE_USDC + (i * 50 * ONE_USDC)
            );
        }

        UmunnaPot.DripVault memory v = pot.getDripVault(vaultId);
        assertFalse(v.active);
        assertEq(v.remainingAmount, 0);
        assertEq(v.releasedCount, 6);

        // Subsequent release on completed vault reverts
        vm.warp(block.timestamp + 60);
        vm.expectRevert(UmunnaPot.VaultInactive.selector);
        pot.releaseDue(vaultId);
    }

    function test_EmergencyEarlyExitRequiresBeneficiaryAndGuardian() public {
        uint256 vaultId = _createStandardVault();

        // Drip installment #1 first (50 USDC released, 250 USDC remaining)
        vm.warp(block.timestamp + 60);
        pot.releaseDue(vaultId);

        // Guardian cannot approve before beneficiary requests early exit
        vm.prank(guardian);
        vm.expectRevert(UmunnaPot.EarlyExitNotRequested.selector);
        pot.approveEarlyExit(vaultId);

        // Non-beneficiary cannot request early exit
        vm.prank(stranger);
        vm.expectRevert(UmunnaPot.NotBeneficiary.selector);
        pot.requestEarlyExit(vaultId);

        // Beneficiary requests emergency exit
        vm.prank(freelancer);
        pot.requestEarlyExit(vaultId);

        // Non-guardian still cannot approve
        vm.prank(freelancer);
        vm.expectRevert(UmunnaPot.NotGuardian.selector);
        pot.approveEarlyExit(vaultId);

        // Guardian approves -> full remaining 250 USDC refunded to freelancer
        uint256 balBefore = usdc.balanceOf(freelancer);
        vm.prank(guardian);
        pot.approveEarlyExit(vaultId);

        assertEq(usdc.balanceOf(freelancer), balBefore + 250 * ONE_USDC);

        UmunnaPot.DripVault memory v = pot.getDripVault(vaultId);
        assertFalse(v.active);
        assertEq(v.remainingAmount, 0);
    }
}

