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
    
    Tip[] public tips;
    
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
    
    // ============ Errors ============
    
    error InvalidSignature();
    error InvalidNonce();
    error SignatureExpired();
    error InsufficientAllowance();
    error InsufficientBalance();
    error InvalidRecipient();
    error ZeroAmount();

    // ============ Constructor ============
    
    constructor(address _bloomToken, address _signer) Ownable(msg.sender) {
        require(_bloomToken != address(0), "Invalid token address");
        require(_signer != address(0), "Invalid signer address");
        
        bloomToken = IERC20(_bloomToken);
        signer = _signer;
    }

    // ============ Core Functions ============
    
    /**
     * @dev Process a tip with signature verification
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
        tips.push(Tip({
            from: msg.sender,
            to: to,
            amount: amount,
            fromFid: fromFid,
            toFid: toFid,
            castHash: castHash,
            timestamp: block.timestamp
        }));
        
        // Transfer tokens
        bloomToken.safeTransferFrom(msg.sender, to, amount);
        
        emit TipSent(msg.sender, to, amount, fromFid, toFid, castHash, block.timestamp);
    }
    
    /**
     * @dev Batch process multiple tips (gas efficient for backend)
     * No restrictions on re-tipping same casts.
     */
    function batchTip(
        address[] calldata recipients,
        uint256[] calldata amounts,
        uint256[] calldata fromFids,
        uint256[] calldata toFids,
        bytes32[] calldata castHashes,
        uint256[] calldata tipNonces,
        uint256[] calldata deadlines,
        bytes[] calldata signatures
    ) external nonReentrant whenNotPaused {
        require(recipients.length == amounts.length, "Length mismatch");
        require(recipients.length == signatures.length, "Length mismatch");
        require(recipients.length <= 50, "Too many tips"); // Gas limit
        
        for (uint256 i = 0; i < recipients.length; i++) {
            _processTip(
                recipients[i],
                amounts[i],
                fromFids[i],
                toFids[i],
                castHashes[i],
                tipNonces[i],
                deadlines[i],
                signatures[i]
            );
        }
    }
    
    function _processTip(
        address to,
        uint256 amount,
        uint256 fromFid,
        uint256 toFid,
        bytes32 castHash,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) internal {
        // Skip invalid tips silently in batch
        if (to == address(0) || to == msg.sender) return;
        if (amount == 0) return;
        if (nonces[msg.sender] != nonce) return;
        if (block.timestamp > deadline) return;
        
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
        
        if (recoveredSigner != signer) return;
        if (bloomToken.allowance(msg.sender, address(this)) < amount) return;
        if (bloomToken.balanceOf(msg.sender) < amount) return;
        
        nonces[msg.sender]++;
        
        tips.push(Tip({
            from: msg.sender,
            to: to,
            amount: amount,
            fromFid: fromFid,
            toFid: toFid,
            castHash: castHash,
            timestamp: block.timestamp
        }));
        
        bloomToken.safeTransferFrom(msg.sender, to, amount);
        
        emit TipSent(msg.sender, to, amount, fromFid, toFid, castHash, block.timestamp);
    }

    // ============ View Functions ============
    
    function getTipCount() external view returns (uint256) {
        return tips.length;
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
