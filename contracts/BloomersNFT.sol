// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title BloomersNFT
 * @dev NFT contract for Bloomers with ENB token discount
 * @notice Users with 100,000+ ENB tokens get 50% off mint price
 */
contract BloomersNFT is ERC721, ERC721URIStorage, ERC721Enumerable, Ownable, ReentrancyGuard, Pausable {
    
    // ENB Token contract address on Base
    IERC20 public immutable enbToken;
    
    // Mint prices
    uint256 public mintPrice = 0.0004 ether;
    uint256 public discountedMintPrice = 0.0002 ether;
    
    // ENB threshold for discount (100,000 tokens with 18 decimals)
    uint256 public enbThreshold = 100_000 * 10**18;
    
    // Token ID counter
    uint256 private _tokenIdCounter;
    
    // Max supply (0 = unlimited)
    uint256 public maxSupply;
    
    // Base URI for metadata
    string private _baseTokenURI;
    
    // Events
    event Minted(address indexed to, uint256 indexed tokenId, bool discounted, uint256 pricePaid);
    event MintPriceUpdated(uint256 newPrice, uint256 newDiscountedPrice);
    event ENBThresholdUpdated(uint256 newThreshold);
    event MaxSupplyUpdated(uint256 newMaxSupply);
    event FundsWithdrawn(address indexed to, uint256 amount);
    event BaseURIUpdated(string newBaseURI);
    
    /**
     * @dev Constructor
     * @param _enbTokenAddress ENB token contract address
     * @param _maxSupply Maximum supply (0 for unlimited)
     */
    constructor(
        address _enbTokenAddress,
        uint256 _maxSupply
    ) ERC721("Bloomers", "BLOOM") Ownable(msg.sender) {
        require(_enbTokenAddress != address(0), "Invalid ENB token address");
        enbToken = IERC20(_enbTokenAddress);
        maxSupply = _maxSupply;
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
     * @param tokenURI The metadata URI for the NFT
     */
    function mint(string calldata tokenURI) external payable nonReentrant whenNotPaused {
        require(maxSupply == 0 || _tokenIdCounter < maxSupply, "Max supply reached");
        
        uint256 requiredPrice = getMintPrice(msg.sender);
        require(msg.value >= requiredPrice, "Insufficient payment");
        
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, tokenURI);
        
        emit Minted(msg.sender, tokenId, hasDiscount(msg.sender), msg.value);
    }
    
    /**
     * @dev Batch mint multiple Bloomers (no refunds)
     * @param tokenURIs Array of metadata URIs
     */
    function batchMint(string[] calldata tokenURIs) external payable nonReentrant whenNotPaused {
        uint256 count = tokenURIs.length;
        require(count > 0 && count <= 20, "Invalid batch size (1-20)");
        require(maxSupply == 0 || _tokenIdCounter + count <= maxSupply, "Exceeds max supply");
        
        uint256 pricePerToken = getMintPrice(msg.sender);
        uint256 totalPrice = pricePerToken * count;
        require(msg.value >= totalPrice, "Insufficient payment");
        
        bool discounted = hasDiscount(msg.sender);
        
        for (uint256 i = 0; i < count; i++) {
            uint256 tokenId = _tokenIdCounter;
            _tokenIdCounter++;
            _safeMint(msg.sender, tokenId);
            _setTokenURI(tokenId, tokenURIs[i]);
            emit Minted(msg.sender, tokenId, discounted, pricePerToken);
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
     * @dev Update max supply
     * @param newMaxSupply New max supply (0 for unlimited)
     */
    function setMaxSupply(uint256 newMaxSupply) external onlyOwner {
        require(newMaxSupply == 0 || newMaxSupply >= _tokenIdCounter, "Cannot reduce below current supply");
        maxSupply = newMaxSupply;
        emit MaxSupplyUpdated(newMaxSupply);
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
    
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage, ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
    
    function _update(address to, uint256 tokenId, address auth) internal override(ERC721, ERC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
    }
    
    function _increaseBalance(address account, uint128 value) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }
}
