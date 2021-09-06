pragma solidity 0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";

interface ILiquidityPoolManagerV2 {
    function stakes(address pair) external view returns (address);
}

interface IPangolinPair {
    function totalSupply() external view returns (uint);
    function balanceOf(address owner) external view returns (uint);
}

interface IPangolinERC20 {
    function balanceOf(address owner) external view returns (uint);
    function getCurrentVotes(address account) external view returns (uint);
    function delegates(address account) external view returns (address);
}

interface IStakingRewards {
    function balanceOf(address owner) external view returns (uint);
    function earned(address account) external view returns (uint);
}

// SPDX-License-Identifier: GPL-3.0-or-later
contract PangolinVoteCalculator is Ownable {

    IPangolinERC20 png;
    ILiquidityPoolManagerV2 liquidityManager;

    constructor(address _png, address _liquidityManager) {
        png = IPangolinERC20(_png);
        liquidityManager = ILiquidityPoolManagerV2(_liquidityManager);
    }

    function getVotesFromPairs(address voter, address[] calldata pairs) external view returns (uint votes) {
        for (uint i; i<pairs.length; i++) {
            IPangolinPair pair = IPangolinPair(pairs[i]);
            IStakingRewards staking = IStakingRewards(liquidityManager.stakes(pairs[i]));

            uint pair_total_PNG = png.balanceOf(pairs[i]);
            uint pair_total_PGL = pair.totalSupply();

            uint PGL_hodling = pair.balanceOf(voter);
            uint PGL_staking = staking.balanceOf(voter);

            uint pending_PNG = staking.earned(voter);

            votes += ((PGL_hodling + PGL_staking) * pair_total_PNG) / pair_total_PGL + pending_PNG;
        }
    }

    function getVotesFromWallets(address voter) external view returns (uint votes) {
        // Votes delegated to the voter
        votes += png.getCurrentVotes(voter);

        // Voter has never delegated
        if (png.delegates(voter) == address(0)) {
            votes += png.balanceOf(voter);
        }
    }

    function changeLiquidityPoolManager(address _liquidityManager) external onlyOwner {
        liquidityManager = ILiquidityPoolManagerV2(_liquidityManager);
    }

}