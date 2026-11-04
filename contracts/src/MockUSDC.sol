// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockUSDC
 * @notice 6-decimal testnet ERC-20 token on Base Sepolia for Umunna Pot demos
 *         and Roqqu RAS webhook-to-chain Treasury Relayer settlements.
 */
contract MockUSDC is ERC20 {
    uint256 public constant DEMO_FAUCET_AMOUNT = 500 * 10 ** 6; // 500 mUSDC

    constructor() ERC20("Mock USD Coin", "mUSDC") {
        // Seed initial 1,000,000 mUSDC to deployer / Treasury Relayer
        _mint(msg.sender, 1_000_000 * 10 ** 6);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /**
     * @notice Mint arbitrary test tokens (used by Treasury Relayer & test suites).
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /**
     * @notice One-click 500 mUSDC claim helper for judges & live testers.
     */
    function claimDemoFaucet() external {
        _mint(msg.sender, DEMO_FAUCET_AMOUNT);
    }
}

