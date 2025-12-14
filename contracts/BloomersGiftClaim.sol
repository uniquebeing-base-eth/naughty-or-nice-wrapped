// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title BloomersGiftClaim
 * @dev Secure token claiming contract with owner-controlled reset functionality
 * 
 * DEPLOYMENT PARAMETERS:
 * - _rewardToken: ENB token address (0xf73978b3a7d1d4974abae11f696c1b4408c027a0)
 * - _rewardAmount: tokens per claim (e.g., 1000000000000000000000 for 1000 ENB with 18 decimals)
 * 
 * OWNER CONTROLS:
 * - resetClaim(address): Reset one user's claim status
 * - resetAllClaims(): Reset everyone (starts new period)
 * - setRewardAmount(uint256): Change reward amount
 * - pause()/unpause(): Emergency controls
 * - withdrawTokens(address, uint256): Recover funds
 */
contract BloomersGiftClaim is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    IERC20 public immutable rewardToken;
    uint256 public rewardAmount;
    
    // Tracks if address has claimed in current period
    mapping(address => bool) public hasClaimed;
    
    // Claim period tracking (owner increments to reset all claims)
    uint256 public claimPeriod;
    mapping(address => uint256) public lastClaimPeriod;

    event GiftClaimed(address indexed user, uint256 amount, uint256 period);
    event RewardAmountUpdated(uint256 oldAmount, uint256 newAmount);
    event ClaimReset(address indexed user);
    event AllClaimsReset(uint256 newPeriod);
    event TokensWithdrawn(address indexed token, uint256 amount);

    constructor(
        address _rewardToken,
        uint256 _rewardAmount
    ) Ownable(msg.sender) {
        require(_rewardToken != address(0), "Invalid token address");
        require(_rewardAmount > 0, "Reward must be > 0");
        
        rewardToken = IERC20(_rewardToken);
        rewardAmount = _rewardAmount;
        claimPeriod = 1;
    }

    /**
     * @dev Claim gift tokens. Each address can only claim once per period.
     */
    function claimGift() external nonReentrant whenNotPaused {
        require(!hasClaimed[msg.sender] || lastClaimPeriod[msg.sender] < claimPeriod, "Already claimed");
        require(rewardToken.balanceOf(address(this)) >= rewardAmount, "Insufficient contract balance");

        hasClaimed[msg.sender] = true;
        lastClaimPeriod[msg.sender] = claimPeriod;

        rewardToken.safeTransfer(msg.sender, rewardAmount);

        emit GiftClaimed(msg.sender, rewardAmount, claimPeriod);
    }

    /**
     * @dev Check if user can claim in current period
     */
    function canClaim(address user) external view returns (bool) {
        if (paused()) return false;
        if (rewardToken.balanceOf(address(this)) < rewardAmount) return false;
        if (hasClaimed[user] && lastClaimPeriod[user] >= claimPeriod) return false;
        return true;
    }

    /**
     * @dev Reset claim status for a specific user (owner only)
     */
    function resetClaim(address user) external onlyOwner {
        hasClaimed[user] = false;
        emit ClaimReset(user);
    }

    /**
     * @dev Reset ALL claims by incrementing the period (owner only)
     */
    function resetAllClaims() external onlyOwner {
        claimPeriod++;
        emit AllClaimsReset(claimPeriod);
    }

    /**
     * @dev Update reward amount (owner only)
     */
    function setRewardAmount(uint256 _newAmount) external onlyOwner {
        require(_newAmount > 0, "Reward must be > 0");
        emit RewardAmountUpdated(rewardAmount, _newAmount);
        rewardAmount = _newAmount;
    }

    /**
     * @dev Pause claiming (owner only)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause claiming (owner only)
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Withdraw tokens from contract (owner only)
     */
    function withdrawTokens(address token, uint256 amount) external onlyOwner {
        require(token != address(0), "Invalid token");
        IERC20(token).safeTransfer(msg.sender, amount);
        emit TokensWithdrawn(token, amount);
    }

    /**
     * @dev Get contract's reward token balance
     */
    function getContractBalance() external view returns (uint256) {
        return rewardToken.balanceOf(address(this));
    }
}
