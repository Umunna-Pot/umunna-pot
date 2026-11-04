// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {UmunnaPot} from "../src/UmunnaPot.sol";

contract DeployUmunnaPot is Script {
    function run() external returns (MockUSDC usdc, UmunnaPot pot) {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address relayerAddress = vm.envOr("RELAYER_ADDRESS", address(0));

        vm.startBroadcast(deployerPrivateKey);

        usdc = new MockUSDC();
        pot = new UmunnaPot(address(usdc));

        if (relayerAddress != address(0) && relayerAddress != vm.addr(deployerPrivateKey)) {
            usdc.mint(relayerAddress, 100_000 * 10 ** 6);
        }

        vm.stopBroadcast();

        console2.log("MockUSDC deployed at:", address(usdc));
        console2.log("UmunnaPot deployed at:", address(pot));
    }
}

