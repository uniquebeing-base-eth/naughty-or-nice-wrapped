// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title UniqueHubVerdictClaim
 * @dev Contract for claiming UNIQ tokens based on Naughty or Nice verdict
 * Uses backend signature verification to ensure only users with verdicts can claim
 * Daily claim enforcement is handled by frontend/database, not this contract
 */
contract UniqueHubVerdictClaim is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // UNIQ Token contract
    IERC20 public immutable rewardToken;
    
    // Amount of UNIQ tokens to claim per day (300,000 UNIQ with 18 decimals)
    uint256 public rewardAmount;
    
    // Backend signer address for verification
    address public backendSigner;
    
    // Mapping to track last claim timestamp per user
    mapping(address => uint256) public lastClaimTimestamp;
    
    // Mapping to track total claimed per user
    mapping(address => uint256) public totalClaimed;

    // Events
    event RewardClaimed(address indexed user, uint256 amount, uint256 timestamp);
    event RewardAmountUpdated(uint256 oldAmount, uint256 newAmount);
    event BackendSignerUpdated(address oldSigner, address newSigner);
    event TokensWithdrawn(address token, uint256 amount);

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
     * @dev Claim daily UNIQ reward
     * @param signature Backend signature proving user has a verdict
     */
    function claimReward(bytes memory signature) external nonReentrant whenNotPaused {
        require(canClaimToday(msg.sender), "Already claimed today");
        require(rewardToken.balanceOf(address(this)) >= rewardAmount, "Insufficient contract balance");
        
        // Verify the signature
        bytes32 messageHash = getMessageHash(msg.sender);
        bytes32 ethSignedMessageHash = getEthSignedMessageHash(messageHash);
        address signer = recoverSigner(ethSignedMessageHash, signature);
        
        require(signer == backendSigner, "Invalid signature");
        
        // Update state
        lastClaimTimestamp[msg.sender] = block.timestamp;
        totalClaimed[msg.sender] += rewardAmount;
        
        // Transfer tokens
        rewardToken.safeTransfer(msg.sender, rewardAmount);
        
        emit RewardClaimed(msg.sender, rewardAmount, block.timestamp);
    }

    /**
     * @dev Check if user can claim today
     */
    function canClaimToday(address user) public view returns (bool) {
        uint256 lastClaim = lastClaimTimestamp[user];
        if (lastClaim == 0) return true;
        
        // Check if 24 hours have passed since last claim
        return block.timestamp >= lastClaim + 1 days;
    }

    /**
     * @dev Get time until next claim is available
     */
    function getTimeUntilNextClaim(address user) external view returns (uint256) {
        uint256 lastClaim = lastClaimTimestamp[user];
        if (lastClaim == 0) return 0;
        
        uint256 nextClaimTime = lastClaim + 1 days;
        if (block.timestamp >= nextClaimTime) return 0;
        
        return nextClaimTime - block.timestamp;
    }

    // Signature verification helpers
    function getMessageHash(address user) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(user));
    }

    function getEthSignedMessageHash(bytes32 messageHash) public pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
    }

    function recoverSigner(bytes32 ethSignedMessageHash, bytes memory signature) public pure returns (address) {
        (bytes32 r, bytes32 s, uint8 v) = splitSignature(signature);
        return ecrecover(ethSignedMessageHash, v, r, s);
    }

    function splitSignature(bytes memory sig) public pure returns (bytes32 r, bytes32 s, uint8 v) {
        require(sig.length == 65, "Invalid signature length");
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
    }

    // Admin functions
    function setRewardAmount(uint256 newAmount) external onlyOwner {
        emit RewardAmountUpdated(rewardAmount, newAmount);
        rewardAmount = newAmount;
    }

    function setBackendSigner(address newSigner) external onlyOwner {
        require(newSigner != address(0), "Invalid signer address");
        emit BackendSignerUpdated(backendSigner, newSigner);
        backendSigner = newSigner;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function withdrawTokens(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(msg.sender, amount);
        emit TokensWithdrawn(token, amount);
    }

    function getContractBalance() external view returns (uint256) {
        return rewardToken.balanceOf(address(this));
    }
}
