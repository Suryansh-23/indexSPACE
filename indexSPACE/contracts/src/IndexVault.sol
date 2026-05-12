// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

enum RequestKind {
    None,
    Deposit,
    Redeem
}

enum RequestStatus {
    None,
    Pending,
    Claimable
}

struct Request {
    RequestKind kind;
    RequestStatus status;
    uint256 assets;
    uint256 shares;
    uint256 requestId;
}

contract IndexVault is ERC20 {
    using SafeERC20 for IERC20;

    IERC20 public immutable asset;
    address public immutable curator;

    uint256 private _nextRequestId;

    mapping(address controller => Request) public requests;
    mapping(address controller => mapping(address operator => bool)) private _operatorApprovals;

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

    error ActiveRequest();
    error NoPendingRequest();
    error NotCurator();
    error NotControllerOrOperator();
    error NotOwner();
    error InvalidAddress();
    error InvalidRequestKind();
    error InvalidRequestStatus();

    modifier onlyCurator() {
        if (msg.sender != curator) revert NotCurator();
        _;
    }

    modifier onlyControllerOrOperator(address controller) {
        if (msg.sender != controller && !_operatorApprovals[controller][msg.sender]) {
            revert NotControllerOrOperator();
        }
        _;
    }

    constructor(address asset_, address curator_, string memory name_, string memory symbol_)
        ERC20(name_, symbol_)
    {
        asset = IERC20(asset_);
        curator = curator_;
    }

    function requestDeposit(uint256 assets_, address controller, address owner) external {
        if (controller == address(0) || owner == address(0)) revert InvalidAddress();
        if (requests[controller].status != RequestStatus.None) revert ActiveRequest();
        if (msg.sender != owner) revert NotOwner();

        _nextRequestId++;

        IERC20(asset).safeTransferFrom(owner, address(this), assets_);

        requests[controller] = Request({
            kind: RequestKind.Deposit,
            status: RequestStatus.Pending,
            assets: assets_,
            shares: 0,
            requestId: _nextRequestId
        });

        emit DepositRequest(_nextRequestId, controller, owner, assets_);
    }

    function requestRedeem(uint256 shares_, address controller, address owner) external {
        if (controller == address(0) || owner == address(0)) revert InvalidAddress();
        if (requests[controller].status != RequestStatus.None) revert ActiveRequest();
        if (msg.sender != owner) revert NotOwner();

        _nextRequestId++;

        _transfer(owner, address(this), shares_);

        requests[controller] = Request({
            kind: RequestKind.Redeem,
            status: RequestStatus.Pending,
            assets: 0,
            shares: shares_,
            requestId: _nextRequestId
        });

        emit RedeemRequest(_nextRequestId, controller, owner, shares_);
    }

    function pendingDepositRequest(uint256, address controller)
        external
        view
        returns (uint256 assets_, uint256 shares_)
    {
        Request memory req = requests[controller];
        if (req.kind != RequestKind.Deposit || req.status != RequestStatus.Pending) {
            return (0, 0);
        }
        return (req.assets, req.shares);
    }

    function claimableDepositRequest(uint256, address controller)
        external
        view
        returns (uint256 assets_, uint256 shares_)
    {
        Request memory req = requests[controller];
        if (req.kind != RequestKind.Deposit || req.status != RequestStatus.Claimable) {
            return (0, 0);
        }
        return (req.assets, req.shares);
    }

    function pendingRedeemRequest(uint256, address controller)
        external
        view
        returns (uint256 assets_, uint256 shares_)
    {
        Request memory req = requests[controller];
        if (req.kind != RequestKind.Redeem || req.status != RequestStatus.Pending) {
            return (0, 0);
        }
        return (req.assets, req.shares);
    }

    function claimableRedeemRequest(uint256, address controller)
        external
        view
        returns (uint256 assets_, uint256 shares_)
    {
        Request memory req = requests[controller];
        if (req.kind != RequestKind.Redeem || req.status != RequestStatus.Claimable) {
            return (0, 0);
        }
        return (req.assets, req.shares);
    }

    function setOperator(address operator, bool approved) external {
        _operatorApprovals[msg.sender][operator] = approved;
    }

    function isOperator(address controller, address operator) external view returns (bool) {
        return _operatorApprovals[controller][operator];
    }

    function fulfillDeposit(address controller, uint256 shares_) external onlyCurator {
        Request storage req = requests[controller];
        if (req.kind != RequestKind.Deposit || req.status != RequestStatus.Pending) {
            revert NoPendingRequest();
        }

        uint256 id = req.requestId;

        req.status = RequestStatus.Claimable;
        req.shares = shares_;

        emit DepositFulfilled(id, controller, req.assets, shares_);
    }

    function fulfillRedeem(address controller, uint256 assets_) external onlyCurator {
        Request storage req = requests[controller];
        if (req.kind != RequestKind.Redeem || req.status != RequestStatus.Pending) {
            revert NoPendingRequest();
        }

        uint256 id = req.requestId;

        req.status = RequestStatus.Claimable;
        req.assets = assets_;

        emit RedeemFulfilled(id, controller, req.shares, assets_);
    }

    function claimDeposit(address receiver, address controller) external onlyControllerOrOperator(controller) {
        Request storage req = requests[controller];
        if (req.kind != RequestKind.Deposit || req.status != RequestStatus.Claimable) {
            revert InvalidRequestStatus();
        }

        uint256 id = req.requestId;
        uint256 shares_ = req.shares;

        delete requests[controller];

        _mint(receiver, shares_);

        emit DepositClaimed(id, controller, receiver, shares_);
    }

    function claimRedeem(address receiver, address controller) external onlyControllerOrOperator(controller) {
        Request storage req = requests[controller];
        if (req.kind != RequestKind.Redeem || req.status != RequestStatus.Claimable) {
            revert InvalidRequestStatus();
        }

        uint256 id = req.requestId;
        uint256 assets_ = req.assets;

        delete requests[controller];

        IERC20(asset).safeTransfer(receiver, assets_);

        emit RedeemClaimed(id, controller, receiver, assets_);
    }
}
