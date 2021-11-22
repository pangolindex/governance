pragma solidity 0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ITreasuryVester {
    function claim() external returns (uint);
    function recipient() external returns (address);
}

interface IMiniChefV2 {
    function fundRewards(uint256 newFunding, uint256 duration) external;
}

// SPDX-License-Identifier: MIT

contract TreasuryVesterProxy is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public png;
    ITreasuryVester public treasuryVester;
    IMiniChefV2 public chef;
    address public treasury;

    uint constant PNG_INITIAL_MAX_SUPPLY = 538_000_000e18;
    uint constant PNG_NEW_MAX_SUPPLY = 230_000_000e18;
    uint constant TREASURY_TARGET_BALANCE = 30_000_000e18;
    uint constant PNG_VESTING_CLIFF = 86_400;
    uint constant DIVERSION_STEP = 1_000e18;
    address constant BURN_ADDRESS = address(0x000000000000000000000000000000000000dEaD);

    bool initialized;
    uint public pngVested;

    uint public distributionCount;

    uint public treasuryDiversionRemaining;

    uint public diversionAmount;
    uint public diversionGain;

    constructor(address _png, address _treasuryVester, address _treasury, address _chef) {
        require(
            _png != address(0)
            && _treasuryVester != address(0)
            && _treasury != address(0)
            && _chef != address(0),
            "TreasuryVesterProxy::Cannot construct with zero address"
        );

        png = IERC20(_png);
        treasuryVester = ITreasuryVester(_treasuryVester);
        treasury = _treasury;
        chef = IMiniChefV2(_chef);
    }

    function init() external onlyOwner {
        require(treasuryVester.recipient() == address(this), "TreasuryVesterProxy::Invalid treasury vester recipient");

        uint unvestedPng = png.balanceOf(address(treasuryVester));
        uint treasuryBalance = png.balanceOf(treasury);

        // PNG that has already been vested
        pngVested = PNG_INITIAL_MAX_SUPPLY - unvestedPng;

        // PNG that should be diverted to the treasury to reach the target balance
        treasuryDiversionRemaining = TREASURY_TARGET_BALANCE - treasuryBalance;

        // Required for chef.fundRewards()
        png.approve(address(chef), type(uint256).max);

        initialized = true;
    }

    function claimAndDistribute() external {
        require(initialized == true, "TreasuryVesterProxy::Not initialized");
        uint vestedAmountRemaining = treasuryVester.claim();
        require(vestedAmountRemaining > 0, "TreasuryVesterProxy::Nothing vested");

        // Increase rate of diversion gain once every 300 days
        if (distributionCount % 300 == 0) {
            diversionGain += DIVERSION_STEP;
        }

        // Increase diversion every 30 days
        if (distributionCount % 30 == 0) {
            diversionAmount += diversionGain;
        }

        // Clamps diversionAmount to [1, vestedAmountRemaining]
        if (diversionAmount > vestedAmountRemaining) {
            diversionAmount = vestedAmountRemaining;
        }

        uint treasuryAmountMax = (diversionAmount > treasuryDiversionRemaining)
            ? treasuryDiversionRemaining // Avoid overfunding Treasury
            : diversionAmount;
        uint chefAmountMax = vestedAmountRemaining - diversionAmount;

        if (treasuryDiversionRemaining > 0) {
            uint treasuryAmount = pngVested + treasuryAmountMax > PNG_NEW_MAX_SUPPLY
                ? PNG_NEW_MAX_SUPPLY - pngVested // Avoid overvesting PNG
                : treasuryAmountMax;

            pngVested += treasuryAmount;
            vestedAmountRemaining -= treasuryAmount;
            treasuryDiversionRemaining -= treasuryAmount;
            png.safeTransfer(treasury, treasuryAmount);
        }

        if (pngVested < PNG_NEW_MAX_SUPPLY) {
            uint chefAmount = (pngVested + chefAmountMax > PNG_NEW_MAX_SUPPLY)
                ? PNG_NEW_MAX_SUPPLY - pngVested // Avoid overvesting PNG
                : chefAmountMax;

            if (chefAmount > 0) {
                pngVested += chefAmount;
                vestedAmountRemaining -= chefAmount;
                chef.fundRewards(chefAmount, PNG_VESTING_CLIFF);
            }
        }

        if (vestedAmountRemaining > 0) {
            // Logical burn since PNG cannot be sent to the 0 address
            png.safeTransfer(BURN_ADDRESS, vestedAmountRemaining);
        }

        distributionCount++;
    }

}
