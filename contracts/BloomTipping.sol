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
 * @dev Secure tipping contract for BLOOM tokens on Farcaster
 * 
 * Security Features:
 * - Signature-based authorization (prevents unauthorized tips)
 * - Nonce tracking (prevents replay attacks)
 * - Rate limiting per user (anti-Sybil)
 * - Daily tip limits (anti-abuse)
 * - Pausable for emergencies
 * - Reentrancy protection
 */
contract BloomTipping is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // ============ State Variables ============
    
    IERC20 public immutable bloomToken;
    address public signer; // Backend signer for tip authorization
    
    // Anti-Sybil: Rate limiting
    uint256 public maxTipsPerDay = 50; // Max tips per user per day
    uint256 public maxTipAmount = 1_000_000 * 1e18; // Max single tip: 1M BLOOM
    uint256 public minTipAmount = 1 * 1e18; // Min single tip: 1 BLOOM
    uint256 public dailyTipLimit = 10_000_000 * 1e18; // Max total tips per user per day: 10M BLOOM
    
    // Nonce tracking per user (anti-replay)
    mapping(address => uint256) public nonces;
    
    // Daily rate limiting
    mapping(address => mapping(uint256 => uint256)) public dailyTipCount; // user => day => count
    mapping(address => mapping(uint256 => uint256)) public dailyTipVolume; // user => day => volume
    
    // Farcaster ID verification (optional extra security)
    mapping(uint256 => address) public fidToAddress; // FID => verified address
    mapping(address => uint256) public addressToFid; // address => FID
    
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
    mapping(bytes32 => bool) public processedCasts; // castHash => processed
    
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
    event FidVerified(uint256 indexed fid, address indexed wallet);
    event LimitsUpdated(uint256 maxTipsPerDay, uint256 maxTipAmount, uint256 dailyTipLimit);
    
    // ============ Errors ============
    
    error InvalidSignature();
    error InvalidNonce();
    error TipAlreadyProcessed();
    error ExceedsMaxTipAmount();
    error BelowMinTipAmount();
    error ExceedsDailyTipCount();
    error ExceedsDailyTipLimit();
    error InsufficientAllowance();
    error InsufficientBalance();
    error InvalidRecipient();
    error FidAlreadyVerified();
    error AddressAlreadyVerified();

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
     * @param to Recipient address
     * @param amount Tip amount in BLOOM tokens
     * @param fromFid Sender's Farcaster ID
     * @param toFid Recipient's Farcaster ID
     * @param castHash Hash of the cast containing the tip
     * @param nonce Unique nonce for this tip
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
        // Validate inputs
        if (to == address(0) || to == msg.sender) revert InvalidRecipient();
        if (amount > maxTipAmount) revert ExceedsMaxTipAmount();
        if (amount < minTipAmount) revert BelowMinTipAmount();
        if (nonces[msg.sender] != nonce) revert InvalidNonce();
        if (processedCasts[castHash]) revert TipAlreadyProcessed();
        
        // Check deadline
        require(block.timestamp <= deadline, "Signature expired");
        
        // Verify signature
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
        
        // Rate limiting checks
        uint256 today = block.timestamp / 1 days;
        
        if (dailyTipCount[msg.sender][today] >= maxTipsPerDay) {
            revert ExceedsDailyTipCount();
        }
        
        if (dailyTipVolume[msg.sender][today] + amount > dailyTipLimit) {
            revert ExceedsDailyTipLimit();
        }
        
        // Check allowance and balance
        if (bloomToken.allowance(msg.sender, address(this)) < amount) {
            revert InsufficientAllowance();
        }
        
        if (bloomToken.balanceOf(msg.sender) < amount) {
            revert InsufficientBalance();
        }
        
        // Update state before transfer (CEI pattern)
        nonces[msg.sender]++;
        dailyTipCount[msg.sender][today]++;
        dailyTipVolume[msg.sender][today] += amount;
        processedCasts[castHash] = true;
        
        // Record tip
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
        require(recipients.length <= 20, "Too many tips"); // Gas limit
        
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
        if (to == address(0) || to == msg.sender) return; // Skip invalid
        if (amount > maxTipAmount || amount < minTipAmount) return;
        if (nonces[msg.sender] != nonce) return;
        if (processedCasts[castHash]) return;
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
        
        uint256 today = block.timestamp / 1 days;
        if (dailyTipCount[msg.sender][today] >= maxTipsPerDay) return;
        if (dailyTipVolume[msg.sender][today] + amount > dailyTipLimit) return;
        if (bloomToken.allowance(msg.sender, address(this)) < amount) return;
        if (bloomToken.balanceOf(msg.sender) < amount) return;
        
        nonces[msg.sender]++;
        dailyTipCount[msg.sender][today]++;
        dailyTipVolume[msg.sender][today] += amount;
        processedCasts[castHash] = true;
        
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

    // ============ FID Verification ============
    
    /**
     * @dev Verify a Farcaster ID is linked to an address (for enhanced security)
     * Only the signer (backend) can verify FIDs
     */
    function verifyFid(
        uint256 fid,
        address wallet,
        bytes calldata signature
    ) external {
        if (fidToAddress[fid] != address(0)) revert FidAlreadyVerified();
        if (addressToFid[wallet] != 0) revert AddressAlreadyVerified();
        
        bytes32 messageHash = keccak256(abi.encodePacked(
            "VERIFY_FID",
            fid,
            wallet,
            block.chainid,
            address(this)
        ));
        
        bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();
        address recoveredSigner = ethSignedHash.recover(signature);
        
        if (recoveredSigner != signer) revert InvalidSignature();
        
        fidToAddress[fid] = wallet;
        addressToFid[wallet] = fid;
        
        emit FidVerified(fid, wallet);
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
    
    function getUserStats(address user) external view returns (
        uint256 nonce,
        uint256 todayTipCount,
        uint256 todayTipVolume,
        uint256 remainingTips,
        uint256 remainingVolume
    ) {
        uint256 today = block.timestamp / 1 days;
        nonce = nonces[user];
        todayTipCount = dailyTipCount[user][today];
        todayTipVolume = dailyTipVolume[user][today];
        remainingTips = maxTipsPerDay > todayTipCount ? maxTipsPerDay - todayTipCount : 0;
        remainingVolume = dailyTipLimit > todayTipVolume ? dailyTipLimit - todayTipVolume : 0;
    }

    // ============ Admin Functions ============
    
    function setSigner(address _signer) external onlyOwner {
        require(_signer != address(0), "Invalid signer");
        address oldSigner = signer;
        signer = _signer;
        emit SignerUpdated(oldSigner, _signer);
    }
    
    function setLimits(
        uint256 _maxTipsPerDay,
        uint256 _maxTipAmount,
        uint256 _minTipAmount,
        uint256 _dailyTipLimit
    ) external onlyOwner {
        require(_maxTipAmount >= _minTipAmount, "Invalid limits");
        maxTipsPerDay = _maxTipsPerDay;
        maxTipAmount = _maxTipAmount;
        minTipAmount = _minTipAmount;
        dailyTipLimit = _dailyTipLimit;
        emit LimitsUpdated(_maxTipsPerDay, _maxTipAmount, _dailyTipLimit);
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
