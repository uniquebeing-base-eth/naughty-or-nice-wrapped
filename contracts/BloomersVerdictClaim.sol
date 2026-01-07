
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title BloomersVerdictClaim
 * @notice Daily ENB rewards for users who have a Naughty or Nice verdict
 * @dev Uses backend signature to verify user has completed their verdict
 * 
 * DEPLOYMENT (Remix):
 * 
 * 1. tokenAddress: ENB token on Base
 *    0xf73978b3a7d1d4974abae11f696c1b4408c027a0
 * 
 * 2. rewardAmount: Tokens per claim (in wei)
 *    For 1000 ENB: 1000000000000000000000
 *    For 100 ENB:  100000000000000000000
 * 
 * 3. backendSigner: Your wallet address that signs claims
 *    (This wallet verifies users have verdicts in your database)
 * 
 * AFTER DEPLOYMENT:
 * - Send ENB tokens to the contract
 * - Set up backend to sign claims for eligible users
 */
contract BloomersVerdictClaim is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    IERC20 public immutable rewardToken;
    uint256 public rewardAmount;
    address public backendSigner;
    
    // User => Last claim timestamp
    mapping(address => uint256) public lastClaimTimestamp;
    
    // User => Total claimed all time
    mapping(address => uint256) public totalClaimed;
    
    // Events
    event RewardClaimed(address indexed user, uint256 amount, uint256 timestamp);
    event RewardAmountUpdated(uint256 oldAmount, uint256 newAmount);
    event BackendSignerUpdated(address oldSigner, address newSigner);
    event TokensWithdrawn(address indexed token, uint256 amount);
    
    /**
     * @param tokenAddress ENB token contract address
     * @param tokensPerClaim How many tokens per daily claim (in wei)
     * @param signerAddress Your wallet that signs eligible claims
     */
    constructor(
        address tokenAddress,
        uint256 tokensPerClaim,
        address signerAddress
    ) Ownable(msg.sender) {
        require(tokenAddress != address(0), "Invalid token address");
        require(tokensPerClaim > 0, "Reward must be > 0");
        require(signerAddress != address(0), "Invalid signer address");
        
        rewardToken = IERC20(tokenAddress);
        rewardAmount = tokensPerClaim;
        backendSigner = signerAddress;
    }
    
    /**
     * @notice Claim daily reward (requires backend signature proving you have a verdict)
     * @param signature Backend signature verifying user eligibility
     */
    function claimReward(bytes memory signature) external nonReentrant {
        require(canClaimToday(msg.sender), "Already claimed today");
        require(rewardToken.balanceOf(address(this)) >= rewardAmount, "Insufficient balance");
        
        // Verify signature from backend (proves user has a verdict)
        bytes32 messageHash = getMessageHash(msg.sender);
        bytes32 ethSignedMessageHash = getEthSignedMessageHash(messageHash);
        require(
            recoverSigner(ethSignedMessageHash, signature) == backendSigner,
            "Invalid signature - no verdict found"
        );
        
        // Update state
        lastClaimTimestamp[msg.sender] = block.timestamp;
        totalClaimed[msg.sender] += rewardAmount;
        
        // Transfer tokens
        rewardToken.safeTransfer(msg.sender, rewardAmount);
        
        emit RewardClaimed(msg.sender, rewardAmount, block.timestamp);
    }
    
    /**
     * @notice Check if user can claim today
     */
    function canClaimToday(address user) public view returns (bool) {
        uint256 lastClaim = lastClaimTimestamp[user];
        if (lastClaim == 0) return true;
        return block.timestamp >= lastClaim + 1 days;
    }
    
    /**
     * @notice Get seconds until next claim available
     */
    function getTimeUntilNextClaim(address user) public view returns (uint256) {
        uint256 lastClaim = lastClaimTimestamp[user];
        if (lastClaim == 0) return 0;
        
        uint256 nextClaimTime = lastClaim + 1 days;
        if (block.timestamp >= nextClaimTime) return 0;
        
        return nextClaimTime - block.timestamp;
    }
    
    // ============ Signature Verification ============
    
    function getMessageHash(address user) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(user));
    }
    
    function getEthSignedMessageHash(bytes32 messageHash) public pure returns (bytes32) {
        return keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );
    }
    
    function recoverSigner(
        bytes32 ethSignedMessageHash,
        bytes memory signature
    ) public pure returns (address) {
        (bytes32 r, bytes32 s, uint8 v) = splitSignature(signature);
        return ecrecover(ethSignedMessageHash, v, r, s);
    }
    
    function splitSignature(bytes memory sig)
        public
        pure
        returns (bytes32 r, bytes32 s, uint8 v)
    {
        require(sig.length == 65, "Invalid signature length");
        
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
    }
    
    // ============ Admin Functions ============
    
    function setRewardAmount(uint256 newAmount) external onlyOwner {
        require(newAmount > 0, "Reward must be > 0");
        emit RewardAmountUpdated(rewardAmount, newAmount);
        rewardAmount = newAmount;
    }
    
    function setBackendSigner(address newSigner) external onlyOwner {
        require(newSigner != address(0), "Invalid address");
        emit BackendSignerUpdated(backendSigner, newSigner);
        backendSigner = newSigner;
    }
    
    function withdrawTokens(address token, uint256 amount) external onlyOwner {
        require(token != address(0), "Invalid token");
        IERC20(token).safeTransfer(msg.sender, amount);
        emit TokensWithdrawn(token, amount);
    }
    
    function getContractBalance() external view returns (uint256) {
        return rewardToken.balanceOf(address(this));
    }
}
