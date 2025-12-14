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
 * DEPLOYMENT PARAMETERS (in Remix, enter these values):
 * 
 * 1. tokenAddress: The ERC20 token users will receive
 *    Example: 0xf73978b3a7d1d4974abae11f696c1b4408c027a0 (ENB on Base)
 * 
 * 2. tokensPerClaim: Amount of tokens each user receives (in wei/smallest unit)
 *    For 1000 tokens with 18 decimals: 1000000000000000000000
 *    For 100 tokens with 18 decimals:  100000000000000000000
 *    For 10 tokens with 18 decimals:   10000000000000000000
 * 
 * AFTER DEPLOYMENT:
 * - Send tokens to the contract address
 * - Users can then call claimGift() to receive tokens
 * 
 * OWNER CONTROLS:
 * - resetClaim(address): Allow a specific user to claim again
 * - resetAllClaims(): Allow ALL users to claim again (new period)
 * - setRewardAmount(uint256): Change how many tokens per claim
 * - pause()/unpause(): Emergency stop/start
 * - withdrawTokens(address, uint256): Recover any tokens
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

    /**
     * @param tokenAddress The ERC20 token contract address (e.g., ENB token)
     * @param tokensPerClaim How many tokens each user receives per claim (in wei)
     */
    constructor(
        address tokenAddress,
        uint256 tokensPerClaim
    ) Ownable(msg.sender) {
        require(tokenAddress != address(0), "Invalid token address");
        require(tokensPerClaim > 0, "Tokens per claim must be > 0");
        
        rewardToken = IERC20(tokenAddress);
        rewardAmount = tokensPerClaim;
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
