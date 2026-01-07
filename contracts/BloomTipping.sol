// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title BloomTipping
 * @dev Minimal, permissive tipping contract for BLOOM tokens on Farcaster
 * 
 * Philosophy: Fun, free, and repeatable. The contract is neutral infrastructure.
 * Backend decides what to sign. Contract only enforces signature validity and nonce correctness.
 * 
 * Security Features (only real security primitives):
 * - Backend signature authorization (prevents unauthorized tips)
 * - Per-user nonce tracking (prevents replay attacks)
 * - Deadline on signatures (prevents stale signatures)
 * - Reentrancy protection
 * - Pause switch for emergencies
 * 
 * NOT enforced onchain (backend handles if needed):
 * - Daily limits
 * - Max tips per day  
 * - Volume caps
 * - Min/max tip amounts
 * - One-tip-per-cast restrictions
 * 
 * Batch Behavior:
 * - Deterministic: batch either fully succeeds or fully reverts
 * - Sequential nonce enforcement: tipNonces[i] == startNonce + i
 * - No silent skips - invalid conditions revert entire batch
 * - Nonce updated once after successful batch completion
 */
contract BloomTipping is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // ============ State Variables ============
    
    IERC20 public immutable bloomToken;
    address public signer; // Backend signer for tip authorization
    
    // Per-user nonce tracking (anti-replay)
    mapping(address => uint256) public nonces;
    
    // Tip history for transparency
    struct Tip {
        address from;
        address to;
        uint256 amount;
        uint256 fromFid;
        uint256 toFid;
        bytes32 castHash;
        uint256 timestamp;
    }
    
    // Struct for batch tips (fixes stack-too-deep error)
    struct TipData {
        address to;
        uint256 amount;
        uint256 fromFid;
        uint256 toFid;
        bytes32 castHash;
        uint256 nonce;
        uint256 deadline;
        bytes signature;
    }
    
    Tip[] public tips;
    
    // User tip tracking for history
    mapping(address => uint256[]) public tipsSent;
    mapping(address => uint256[]) public tipsReceived;
    
    // ============ Events ============
    
    event TipSent(
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 fromFid,
        uint256 toFid,
        bytes32 castHash,
        uint256 timestamp
    );
    
    event SignerUpdated(address indexed oldSigner, address indexed newSigner);
    event BatchTipCompleted(address indexed from, uint256 tipCount, uint256 totalAmount);
    
    // ============ Errors ============
    
    error InvalidSignature();
    error InvalidNonce();
    error SignatureExpired();
    error InsufficientAllowance();
    error InsufficientBalance();
    error InvalidRecipient();
    error ZeroAmount();
    error EmptyBatch();
    error BatchTooLarge();
    error InvalidNonceSequence();

    // ============ Constructor ============
    
    constructor(address _bloomToken, address _signer) Ownable(msg.sender) {
        require(_bloomToken != address(0), "Invalid token address");
        require(_signer != address(0), "Invalid signer address");
        
        bloomToken = IERC20(_bloomToken);
        signer = _signer;
    }

    // ============ Single Tip (Permissive) ============
    
    /**
     * @dev Process a single tip with signature verification
     * Users can tip the same cast multiple times - no restrictions.
     * Backend controls what gets signed.
     * 
     * @param to Recipient address
     * @param amount Tip amount in BLOOM tokens
     * @param fromFid Sender's Farcaster ID
     * @param toFid Recipient's Farcaster ID
     * @param castHash Hash of the cast containing the tip (for reference only)
     * @param nonce Unique nonce for this tip (must match user's current nonce)
     * @param deadline Timestamp after which signature is invalid
     * @param signature Backend signature authorizing the tip
     */
    function tip(
        address to,
        uint256 amount,
        uint256 fromFid,
        uint256 toFid,
        bytes32 castHash,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external nonReentrant whenNotPaused {
        // Basic validation
        if (to == address(0) || to == msg.sender) revert InvalidRecipient();
        if (amount == 0) revert ZeroAmount();
        if (nonces[msg.sender] != nonce) revert InvalidNonce();
        if (block.timestamp > deadline) revert SignatureExpired();
        
        // Verify signature from authorized backend
        bytes32 messageHash = keccak256(abi.encodePacked(
            msg.sender,
            to,
            amount,
            fromFid,
            toFid,
            castHash,
            nonce,
            deadline,
            block.chainid,
            address(this)
        ));
        
        bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();
        address recoveredSigner = ethSignedHash.recover(signature);
        
        if (recoveredSigner != signer) revert InvalidSignature();
        
        // Check allowance and balance
        if (bloomToken.allowance(msg.sender, address(this)) < amount) {
            revert InsufficientAllowance();
        }
        
        if (bloomToken.balanceOf(msg.sender) < amount) {
            revert InsufficientBalance();
        }
        
        // Update state before transfer (CEI pattern)
        nonces[msg.sender]++;
        
        // Record tip for transparency
        uint256 tipIndex = tips.length;
        tips.push(Tip({
            from: msg.sender,
            to: to,
            amount: amount,
            fromFid: fromFid,
            toFid: toFid,
            castHash: castHash,
            timestamp: block.timestamp
        }));
        
        // Track for user history
        tipsSent[msg.sender].push(tipIndex);
        tipsReceived[to].push(tipIndex);
        
        // Transfer tokens
        bloomToken.safeTransferFrom(msg.sender, to, amount);
        
        emit TipSent(msg.sender, to, amount, fromFid, toFid, castHash, block.timestamp);
    }
    
    // ============ Batch Tip (Strict - All or Nothing) ============
    
    /**
     * @dev Batch process multiple tips with deterministic execution
     * 
     * Behavior:
     * - Batch either fully succeeds or fully reverts (no silent skips)
     * - Sequential nonce enforcement: tipNonces[i] == startNonce + i
     * - Nonce updated once after successful batch completion
     * - No restrictions on re-tipping same casts
     * 
     * @param tipDataArray Array of TipData structs containing all tip information
     */
    function batchTip(TipData[] calldata tipDataArray) external nonReentrant whenNotPaused {
        uint256 batchSize = tipDataArray.length;
        if (batchSize == 0) revert EmptyBatch();
        if (batchSize > 50) revert BatchTooLarge();
        
        uint256 startNonce = nonces[msg.sender];
        uint256 totalAmount = 0;
        
        // Pre-calculate total amount for upfront balance/allowance check
        for (uint256 i = 0; i < batchSize; i++) {
            totalAmount += tipDataArray[i].amount;
        }
        
        // Check balance and allowance upfront for entire batch
        if (bloomToken.balanceOf(msg.sender) < totalAmount) {
            revert InsufficientBalance();
        }
        if (bloomToken.allowance(msg.sender, address(this)) < totalAmount) {
            revert InsufficientAllowance();
        }
        
        // Process each tip strictly (reverts on any failure)
        for (uint256 i = 0; i < batchSize; i++) {
            _processTipStrict(tipDataArray[i], startNonce + i);
        }
        
        // Update nonce once after successful batch
        nonces[msg.sender] = startNonce + batchSize;
        
        emit BatchTipCompleted(msg.sender, batchSize, totalAmount);
    }
    
    /**
     * @dev Internal strict tip processing for batch operations
     * Reverts on any validation failure - no silent skips
     * Does NOT increment nonce (caller handles this)
     */
    function _processTipStrict(
        TipData calldata tipData,
        uint256 expectedNonce
    ) internal {
        // Strict validation - revert on any failure
        if (tipData.to == address(0) || tipData.to == msg.sender) {
            revert InvalidRecipient();
        }
        if (tipData.amount == 0) revert ZeroAmount();
        if (tipData.nonce != expectedNonce) revert InvalidNonceSequence();
        if (block.timestamp > tipData.deadline) revert SignatureExpired();
        
        // Verify signature
        bytes32 messageHash = keccak256(abi.encodePacked(
            msg.sender,
            tipData.to,
            tipData.amount,
            tipData.fromFid,
            tipData.toFid,
            tipData.castHash,
            tipData.nonce,
            tipData.deadline,
            block.chainid,
            address(this)
        ));
        
        bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();
        address recoveredSigner = ethSignedHash.recover(tipData.signature);
        
        if (recoveredSigner != signer) revert InvalidSignature();
        
        // Record tip
        uint256 tipIndex = tips.length;
        tips.push(Tip({
            from: msg.sender,
            to: tipData.to,
            amount: tipData.amount,
            fromFid: tipData.fromFid,
            toFid: tipData.toFid,
            castHash: tipData.castHash,
            timestamp: block.timestamp
        }));
        
        // Track for user history
        tipsSent[msg.sender].push(tipIndex);
        tipsReceived[tipData.to].push(tipIndex);
        
        // Transfer tokens
        bloomToken.safeTransferFrom(msg.sender, tipData.to, tipData.amount);
        
        emit TipSent(
            msg.sender,
            tipData.to,
            tipData.amount,
            tipData.fromFid,
            tipData.toFid,
            tipData.castHash,
            block.timestamp
        );
    }

    // ============ View Functions ============
    
    function getTipCount() external view returns (uint256) {
        return tips.length;
    }
    
    function getTip(uint256 index) external view returns (Tip memory) {
        require(index < tips.length, "Index out of bounds");
        return tips[index];
    }
    
    function getTips(uint256 offset, uint256 limit) external view returns (Tip[] memory) {
        uint256 end = offset + limit;
        if (end > tips.length) end = tips.length;
        if (offset >= tips.length) return new Tip[](0);
        
        Tip[] memory result = new Tip[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = tips[i];
        }
        return result;
    }
    
    function getUserNonce(address user) external view returns (uint256) {
        return nonces[user];
    }
    
    function getTipsSentCount(address user) external view returns (uint256) {
        return tipsSent[user].length;
    }
    
    function getTipsReceivedCount(address user) external view returns (uint256) {
        return tipsReceived[user].length;
    }
    
    function getTipsSentByUser(address user, uint256 offset, uint256 limit) 
        external view returns (Tip[] memory) 
    {
        uint256[] storage indices = tipsSent[user];
        uint256 total = indices.length;
        
        if (offset >= total) return new Tip[](0);
        
        uint256 end = offset + limit;
        if (end > total) end = total;
        
        Tip[] memory result = new Tip[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = tips[indices[i]];
        }
        return result;
    }
    
    function getTipsReceivedByUser(address user, uint256 offset, uint256 limit) 
        external view returns (Tip[] memory) 
    {
        uint256[] storage indices = tipsReceived[user];
        uint256 total = indices.length;
        
        if (offset >= total) return new Tip[](0);
        
        uint256 end = offset + limit;
        if (end > total) end = total;
        
        Tip[] memory result = new Tip[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = tips[indices[i]];
        }
        return result;
    }

    // ============ Admin Functions ============
    
    function setSigner(address _signer) external onlyOwner {
        require(_signer != address(0), "Invalid signer");
        address oldSigner = signer;
        signer = _signer;
        emit SignerUpdated(oldSigner, _signer);
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Emergency token recovery (for tokens accidentally sent to contract)
     * Cannot recover BLOOM to prevent abuse
     */
    function recoverTokens(address token, uint256 amount) external onlyOwner {
        require(token != address(bloomToken), "Cannot recover BLOOM");
        IERC20(token).safeTransfer(owner(), amount);
    }
}
