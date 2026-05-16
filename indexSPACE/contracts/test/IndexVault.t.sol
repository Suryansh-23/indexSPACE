// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import { IndexVault, RequestKind, RequestStatus } from "../src/IndexVault.sol";
import { MockUSDC } from "../src/mocks/MockUSDC.sol";

contract IndexVaultTest is Test {
    MockUSDC public usdc;
    IndexVault public vault;

    address public curator = makeAddr("curator");
    address public user = makeAddr("user");
    address public other = makeAddr("other");

    uint256 constant DEPOSIT_AMOUNT = 100_000_000; // 100 USDC (6 decimals)

    event DepositRequest(
        uint256 indexed internalRequestId,
        address indexed controller,
        address indexed owner,
        uint256 assets
    );

    event RedeemRequest(
        uint256 indexed internalRequestId,
        address indexed controller,
        address indexed owner,
        uint256 shares
    );

    event DepositFulfilled(
        uint256 indexed internalRequestId,
        address indexed controller,
        uint256 assets,
        uint256 shares
    );

    event RedeemFulfilled(
        uint256 indexed internalRequestId,
        address indexed controller,
        uint256 shares,
        uint256 assets
    );

    event DepositClaimed(
        uint256 indexed internalRequestId,
        address indexed controller,
        address indexed receiver,
        uint256 shares
    );

    event RedeemClaimed(
        uint256 indexed internalRequestId,
        address indexed controller,
        address indexed receiver,
        uint256 assets
    );

    function setUp() public {
        usdc = new MockUSDC();
        vault = new IndexVault(address(usdc), curator, "Test Vault Share", "tVLT");

        usdc.mint(user, 1000 * DEPOSIT_AMOUNT);
    }

    // --- Deposit lifecycle: request -> fulfill -> claim ---

    function test_depositLifecycle() public {
        vm.startPrank(user);
        usdc.approve(address(vault), DEPOSIT_AMOUNT);

        vm.expectEmit(true, true, true, true);
        emit DepositRequest(1, user, user, DEPOSIT_AMOUNT);
        vault.requestDeposit(DEPOSIT_AMOUNT, user, user);
        vm.stopPrank();

        (uint256 pendingAssets, uint256 pendingShares) = vault.pendingDepositRequest(0, user);
        assertEq(pendingAssets, DEPOSIT_AMOUNT);
        assertEq(pendingShares, 0);

        assertEq(usdc.balanceOf(address(vault)), DEPOSIT_AMOUNT);

        vm.prank(curator);
        vm.expectEmit(true, true, true, true);
        emit DepositFulfilled(1, user, DEPOSIT_AMOUNT, DEPOSIT_AMOUNT);
        vault.fulfillDeposit(user, DEPOSIT_AMOUNT);

        (uint256 claimableAssets, uint256 claimableShares) = vault.claimableDepositRequest(0, user);
        assertEq(claimableAssets, DEPOSIT_AMOUNT);
        assertEq(claimableShares, DEPOSIT_AMOUNT);

        vm.prank(user);
        vm.expectEmit(true, true, true, true);
        emit DepositClaimed(1, user, user, DEPOSIT_AMOUNT);
        vault.claimDeposit(user, user);

        assertEq(vault.balanceOf(user), DEPOSIT_AMOUNT);

        (pendingAssets, pendingShares) = vault.pendingDepositRequest(0, user);
        assertEq(pendingAssets, 0);
        assertEq(pendingShares, 0);
    }

    // --- Redeem lifecycle: request -> fulfill -> claim ---

    function test_redeemLifecycle() public {
        _doFullDeposit(user, DEPOSIT_AMOUNT);

        assertEq(vault.balanceOf(user), DEPOSIT_AMOUNT);

        uint256 redeemShares = 50_000_000; // 50 shares

        vm.startPrank(user);
        vm.expectEmit(true, true, true, true);
        emit RedeemRequest(2, user, user, redeemShares);
        vault.requestRedeem(redeemShares, user, user);
        vm.stopPrank();

        assertEq(vault.balanceOf(address(vault)), redeemShares);
        assertEq(vault.balanceOf(user), DEPOSIT_AMOUNT - redeemShares);

        (uint256 pendingAssets, uint256 pendingShares) = vault.pendingRedeemRequest(0, user);
        assertEq(pendingAssets, 0);
        assertEq(pendingShares, redeemShares);

        uint256 redeemAssets = 50_000_000;

        vm.prank(curator);
        vm.expectEmit(true, true, true, true);
        emit RedeemFulfilled(2, user, redeemShares, redeemAssets);
        vault.fulfillRedeem(user, redeemAssets);

        (uint256 claimableAssets, uint256 claimableShares) = vault.claimableRedeemRequest(0, user);
        assertEq(claimableAssets, redeemAssets);
        assertEq(claimableShares, redeemShares);

        vm.prank(user);
        vm.expectEmit(true, true, true, true);
        emit RedeemClaimed(2, user, user, redeemAssets);
        vault.claimRedeem(user, user);

        assertEq(usdc.balanceOf(user), 999 * DEPOSIT_AMOUNT + redeemAssets);
        assertEq(vault.balanceOf(user), DEPOSIT_AMOUNT - redeemShares);
        // Redeemed shares must be burned: vault holds no shares, totalSupply reduced
        assertEq(vault.balanceOf(address(vault)), 0);
        assertEq(vault.totalSupply(), DEPOSIT_AMOUNT - redeemShares);
    }

    // --- Duplicate request rejection ---

    function test_secondDepositRequestReverts() public {
        _doDepositRequest(user, DEPOSIT_AMOUNT);

        vm.startPrank(user);
        usdc.approve(address(vault), DEPOSIT_AMOUNT);
        vm.expectRevert(IndexVault.ActiveRequest.selector);
        vault.requestDeposit(DEPOSIT_AMOUNT, user, user);
        vm.stopPrank();
    }

    function test_secondRedeemRequestReverts() public {
        _doFullDeposit(user, DEPOSIT_AMOUNT);

        uint256 redeemShares = 10_000_000;

        vm.prank(user);
        vault.requestRedeem(redeemShares, user, user);

        vm.expectRevert(IndexVault.ActiveRequest.selector);
        vm.prank(user);
        vault.requestRedeem(redeemShares, user, user);
    }

    function test_depositRequestBlocksRedeemRequest() public {
        _doDepositRequest(user, DEPOSIT_AMOUNT);

        vm.expectRevert(IndexVault.ActiveRequest.selector);
        vm.prank(user);
        vault.requestRedeem(0, user, user);
    }

    function test_redeemRequestBlocksDepositRequest() public {
        _doFullDeposit(user, DEPOSIT_AMOUNT);

        vm.prank(user);
        vault.requestRedeem(10_000_000, user, user);

        vm.startPrank(user);
        usdc.approve(address(vault), DEPOSIT_AMOUNT);
        vm.expectRevert(IndexVault.ActiveRequest.selector);
        vault.requestDeposit(DEPOSIT_AMOUNT, user, user);
        vm.stopPrank();
    }

    // --- Curator gate ---

    function test_nonCuratorCannotFulfillDeposit() public {
        _doDepositRequest(user, DEPOSIT_AMOUNT);

        vm.expectRevert(IndexVault.NotCurator.selector);
        vm.prank(other);
        vault.fulfillDeposit(user, DEPOSIT_AMOUNT);
    }

    function test_nonCuratorCannotFulfillRedeem() public {
        _doFullDeposit(user, DEPOSIT_AMOUNT);

        vm.prank(user);
        vault.requestRedeem(10_000_000, user, user);

        vm.expectRevert(IndexVault.NotCurator.selector);
        vm.prank(other);
        vault.fulfillRedeem(user, 10_000_000);
    }

    // --- Operator functions ---

    function test_operatorCanClaim() public {
        _doFullDeposit(user, DEPOSIT_AMOUNT);

        vm.prank(user);
        vault.requestRedeem(10_000_000, user, user);

        vm.prank(curator);
        vault.fulfillRedeem(user, 10_000_000);

        address operator = makeAddr("operator");
        vm.prank(user);
        vault.setOperator(operator, true);

        assertTrue(vault.isOperator(user, operator));

        vm.prank(operator);
        vault.claimRedeem(user, user);

        assertEq(usdc.balanceOf(user), 999 * DEPOSIT_AMOUNT + 10_000_000);
    }

    // --- Helpers ---

    function _doDepositRequest(address who, uint256 amount) internal {
        vm.startPrank(who);
        usdc.approve(address(vault), amount);
        vault.requestDeposit(amount, who, who);
        vm.stopPrank();
    }

    function _doFullDeposit(address who, uint256 amount) internal {
        _doDepositRequest(who, amount);

        vm.prank(curator);
        vault.fulfillDeposit(who, amount);

        vm.prank(who);
        vault.claimDeposit(who, who);
    }
}
