// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Script } from "forge-std/Script.sol";
import { console } from "forge-std/console.sol";
import { MockUSDC } from "../src/mocks/MockUSDC.sol";
import { IndexVault } from "../src/IndexVault.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);
        address curator = vm.envOr("CURATOR_ADDRESS", deployer);

        vm.startBroadcast(deployerKey);

        MockUSDC usdc = new MockUSDC();

        IndexVault aiVault = new IndexVault(
            address(usdc),
            curator,
            "AI Acceleration Vault Share",
            "aVLT"
        );

        IndexVault cryptoVault = new IndexVault(
            address(usdc),
            curator,
            "Crypto Reflexivity Vault Share",
            "cVLT"
        );

        uint256 mintAmount = 1_000_000_000_000;
        usdc.mint(deployer, mintAmount);
        usdc.mint(curator, mintAmount);

        vm.stopBroadcast();

        console.log("MOCK_USDC=%s", address(usdc));
        console.log("AI_ACCELERATION_VAULT=%s", address(aiVault));
        console.log("CRYPTO_REFLEXIVITY_VAULT=%s", address(cryptoVault));
        console.log("CURATOR=%s", curator);
    }
}
