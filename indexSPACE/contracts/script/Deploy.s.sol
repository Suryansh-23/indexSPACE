// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { Script } from "forge-std/Script.sol";
import { console } from "forge-std/console.sol";
import { MockUSDC } from "../src/mocks/MockUSDC.sol";
import { IndexVault } from "../src/IndexVault.sol";

contract Deploy is Script {
    uint256 internal constant BASE_SEPOLIA_CHAIN_ID = 84532;

    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);
        address curator = vm.envOr("CURATOR_ADDRESS", deployer);
        uint256 chainId = block.chainid;

        address assetAddress;
        MockUSDC mockUsdc;

        vm.startBroadcast(deployerKey);

        if (chainId == BASE_SEPOLIA_CHAIN_ID) {
            assetAddress = vm.envAddress("BASE_SEPOLIA_USDC");
        } else {
            mockUsdc = new MockUSDC();
            assetAddress = address(mockUsdc);
        }

        IndexVault aiVault = new IndexVault(
            assetAddress,
            curator,
            "AI Acceleration Vault Share",
            "aVLT"
        );

        IndexVault cryptoVault = new IndexVault(
            assetAddress,
            curator,
            "Crypto Reflexivity Vault Share",
            "cVLT"
        );

        if (chainId != BASE_SEPOLIA_CHAIN_ID) {
            uint256 mintAmount = 1_000_000_000_000;
            mockUsdc.mint(deployer, mintAmount);
            mockUsdc.mint(curator, mintAmount);
        }

        vm.stopBroadcast();

        if (chainId != BASE_SEPOLIA_CHAIN_ID) {
            console.log("MOCK_USDC=%s", address(mockUsdc));
        }
        console.log("ASSET=%s", assetAddress);
        console.log("AI_ACCELERATION_VAULT=%s", address(aiVault));
        console.log("CRYPTO_REFLEXIVITY_VAULT=%s", address(cryptoVault));
        console.log("CURATOR=%s", curator);
    }
}
