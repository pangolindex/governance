// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol";
import "@boringcrypto/boring-solidity/contracts/libraries/BoringMath.sol";

import "./interfaces/IRewarder.sol";

contract RewarderSimple is IRewarder {
    using BoringMath for uint256;
    using BoringERC20 for IERC20;

    IERC20[] private rewardTokens;
    uint256[] private rewardMultipliers;
    address private immutable MASTERCHEF_V2;

    /// @notice Should match the precision of the base reward token (PNG)
    uint256 private constant REWARD_TOKEN_DIVISOR = 1e18;

    /// @param _rewardMultipliers The amount of each reward token to be claimable for every 1 base reward (PNG) being claimed
    /// @notice Each reward multiplier should have a precision matching that individual token
    constructor (
        address[] memory _rewardTokens,
        uint256[] memory _rewardMultipliers,
        address _MASTERCHEF_V2
    ) public {
        require(
            _rewardTokens.length > 0
             && _rewardTokens.length == _rewardMultipliers.length,
            "RewarderSimple::Invalid input lengths"
        );

        require(
            _MASTERCHEF_V2 != address(0),
            "RewarderSimple::Invalid chef address"
        );

        for (uint256 i; i < _rewardTokens.length; i++) {
            require(_rewardTokens[i] != address(0), "RewarderSimple::Cannot reward zero address");
            require(_rewardMultipliers[i] > 0, "RewarderSimple::Invalid multiplier");

            rewardTokens[i] = IERC20(_rewardTokens[i]);
        }

        rewardMultipliers = _rewardMultipliers;
        MASTERCHEF_V2 = _MASTERCHEF_V2;
    }

    function onReward(uint256, address, address to, uint256 rewardAmount, uint256) onlyMCV2 override external {
        for (uint256 i; i < rewardTokens.length; i++) {
            uint256 pendingReward = rewardAmount.mul(rewardMultipliers[i]) / REWARD_TOKEN_DIVISOR;
            uint256 rewardBal = rewardTokens[i].balanceOf(address(this));
            if (pendingReward > rewardBal) {
                rewardTokens[i].safeTransfer(to, rewardBal);
            } else {
                rewardTokens[i].safeTransfer(to, pendingReward);
            }
        }
    }

    function pendingTokens(uint256, address, uint256 rewardAmount) override external view returns (IERC20[] memory tokens, uint256[] memory amounts) {
        for (uint256 i; i < rewardTokens.length; i++) {
            uint256 pendingReward = rewardAmount.mul(rewardMultipliers[i]) / REWARD_TOKEN_DIVISOR;
            uint256 rewardBal = rewardTokens[i].balanceOf(address(this));
            if (pendingReward > rewardBal) {
                amounts[i] = rewardBal;
            } else {
                amounts[i] = pendingReward;
            }
        }
        return (rewardTokens, amounts);
    }

    modifier onlyMCV2 {
        require(
            msg.sender == MASTERCHEF_V2,
            "Only MCV2 can call this function."
        );
        _;
    }

}