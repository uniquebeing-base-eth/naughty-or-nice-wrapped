// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title BloomersNFT
 * @dev NFT contract for Bloomers with ENB token discount
 * @notice Users with 100,000+ ENB tokens get 50% off mint price
 * @notice Unlimited supply - anyone can mint as many as they want
 */
contract BloomersNFT is ERC721, Ownable, ReentrancyGuard, Pausable {
    
    // ENB Token contract address on Base
    IERC20 public immutable enbToken;
    
    // Mint prices
    uint256 public mintPrice = 0.0004 ether;
    uint256 public discountedMintPrice = 0.0002 ether;
    
    // ENB threshold for discount (100,000 tokens with 18 decimals)
    uint256 public enbThreshold = 100_000 * 10**18;
    
    // Token ID counter
    uint256 private _tokenIdCounter;
    
    // Base URI for metadata
    string private _baseTokenURI;
    
    // Max batch mint size
    uint256 public constant MAX_BATCH_SIZE = 20;
    
    // Events
    event Minted(address indexed to, uint256 indexed tokenId, bool discounted, uint256 pricePaid);
    event MintPriceUpdated(uint256 newPrice, uint256 newDiscountedPrice);
    event ENBThresholdUpdated(uint256 newThreshold);
    event FundsWithdrawn(address indexed to, uint256 amount);
    event BaseURIUpdated(string newBaseURI);
    
    /**
     * @dev Constructor
     * @param _enbTokenAddress ENB token contract address
     */
    constructor(
        address _enbTokenAddress
    ) ERC721("Bloomers", "BLOOM") Ownable(msg.sender) {
        require(_enbTokenAddress != address(0), "Invalid ENB token address");
        enbToken = IERC20(_enbTokenAddress);
    }
    
    /**
     * @dev Check if user qualifies for discount
     * @param user Address to check
     * @return bool True if user has >= 100,000 ENB tokens
     */
    function hasDiscount(address user) public view returns (bool) {
        return enbToken.balanceOf(user) >= enbThreshold;
    }
    
    /**
     * @dev Get mint price for a specific user
     * @param user Address to check
     * @return uint256 The mint price for the user
     */
    function getMintPrice(address user) public view returns (uint256) {
        return hasDiscount(user) ? discountedMintPrice : mintPrice;
    }
    
    /**
     * @dev Mint a Bloomer NFT
     */
    function mint() external payable nonReentrant whenNotPaused {
        uint256 requiredPrice = getMintPrice(msg.sender);
        require(msg.value >= requiredPrice, "Insufficient payment");
        
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        
        _safeMint(msg.sender, tokenId);
        
        emit Minted(msg.sender, tokenId, hasDiscount(msg.sender), requiredPrice);
        
        // Refund excess ETH
        uint256 refund = msg.value - requiredPrice;
        if (refund > 0) {
            payable(msg.sender).transfer(refund);
        }
    }
    
    /**
     * @dev Batch mint multiple Bloomers
     * @param count Number of NFTs to mint
     */
    function batchMint(uint256 count) external payable nonReentrant whenNotPaused {
        require(count > 0, "Must mint at least 1");
        require(count <= MAX_BATCH_SIZE, "Exceeds max batch size");
        
        uint256 pricePerToken = getMintPrice(msg.sender);
        uint256 totalPrice = pricePerToken * count;
        require(msg.value >= totalPrice, "Insufficient payment");
        
        bool discounted = hasDiscount(msg.sender);
        
        for (uint256 i = 0; i < count; i++) {
            uint256 tokenId = _tokenIdCounter;
            _tokenIdCounter++;
            _safeMint(msg.sender, tokenId);
            emit Minted(msg.sender, tokenId, discounted, pricePerToken);
        }
        
        // Refund excess ETH
        uint256 refund = msg.value - totalPrice;
        if (refund > 0) {
            payable(msg.sender).transfer(refund);
        }
    }
    
    // ============ Owner Functions ============
    
    /**
     * @dev Withdraw all funds to owner
     */
    function withdrawFunds() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
        
        emit FundsWithdrawn(owner(), balance);
    }
    
    /**
     * @dev Withdraw specific amount to owner
     * @param amount Amount to withdraw
     */
    function withdrawAmount(uint256 amount) external onlyOwner nonReentrant {
        require(amount > 0 && amount <= address(this).balance, "Invalid amount");
        
        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "Withdrawal failed");
        
        emit FundsWithdrawn(owner(), amount);
    }
    
    /**
     * @dev Update mint prices
     * @param newPrice New full mint price
     * @param newDiscountedPrice New discounted mint price
     */
    function setMintPrices(uint256 newPrice, uint256 newDiscountedPrice) external onlyOwner {
        require(newPrice > 0 && newDiscountedPrice > 0, "Price must be > 0");
        require(newDiscountedPrice < newPrice, "Discount must be less than full price");
        mintPrice = newPrice;
        discountedMintPrice = newDiscountedPrice;
        emit MintPriceUpdated(newPrice, newDiscountedPrice);
    }
    
    /**
     * @dev Update ENB threshold for discount
     * @param newThreshold New threshold (in wei, 18 decimals)
     */
    function setENBThreshold(uint256 newThreshold) external onlyOwner {
        require(newThreshold > 0, "Threshold must be > 0");
        enbThreshold = newThreshold;
        emit ENBThresholdUpdated(newThreshold);
    }
    
    /**
     * @dev Set base URI for all tokens
     * @param baseURI New base URI
     */
    function setBaseURI(string calldata baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
        emit BaseURIUpdated(baseURI);
    }
    
    /**
     * @dev Pause minting
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause minting
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // ============ View Functions ============
    
    /**
     * @dev Get total minted count
     */
    function totalMinted() external view returns (uint256) {
        return _tokenIdCounter;
    }
    
    /**
     * @dev Get contract balance
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Get user's ENB balance
     */
    function getUserENBBalance(address user) external view returns (uint256) {
        return enbToken.balanceOf(user);
    }
    
    // ============ Overrides ============
    
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }
    
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        
        string memory baseURI = _baseURI();
        return bytes(baseURI).length > 0 
            ? string(abi.encodePacked(baseURI, Strings.toString(tokenId), ".json"))
            : "";
    }
    
    // ============ Receive & Fallback ============
    
    receive() external payable {}
    fallback() external payable {}
}
