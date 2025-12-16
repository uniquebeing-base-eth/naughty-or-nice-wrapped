// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title BloomersNFTV2
 * @dev NFT contract with proper metadata handling and ENB token discount
 */
contract BloomersNFTV2 is ERC721, Ownable, ReentrancyGuard, Pausable {
    
    uint256 private _tokenIdCounter;
    
    // Pricing
    uint256 public mintPrice = 0.0004 ether;
    uint256 public discountedMintPrice = 0.0002 ether;
    
    // ENB token for discount eligibility
    IERC20 public enbToken;
    uint256 public enbThreshold = 100000 * 10**18; // 100,000 ENB tokens
    
    // Metadata base URI - MUST end with /
    string private _baseTokenURI;
    
    // Events
    event Minted(address indexed to, uint256 indexed tokenId);
    event BaseURIUpdated(string newBaseURI);
    
    constructor(
        address _enbToken,
        string memory baseURI
    ) ERC721("Bloomers", "BLOOM") Ownable(msg.sender) {
        enbToken = IERC20(_enbToken);
        _baseTokenURI = baseURI;
    }
    
    /**
     * @dev Check if user qualifies for ENB discount
     */
    function hasDiscount(address user) public view returns (bool) {
        if (address(enbToken) == address(0)) return false;
        try enbToken.balanceOf(user) returns (uint256 balance) {
            return balance >= enbThreshold;
        } catch {
            return false;
        }
    }
    
    /**
     * @dev Get mint price for a specific user
     */
    function getMintPrice(address user) public view returns (uint256) {
        return hasDiscount(user) ? discountedMintPrice : mintPrice;
    }
    
    /**
     * @dev Mint a single NFT
     */
    function mint() external payable nonReentrant whenNotPaused {
        uint256 price = getMintPrice(msg.sender);
        require(msg.value >= price, "Insufficient payment");
        
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        
        _safeMint(msg.sender, tokenId);
        
        emit Minted(msg.sender, tokenId);
        
        // Refund excess payment
        if (msg.value > price) {
            uint256 refund = msg.value - price;
            (bool success, ) = payable(msg.sender).call{value: refund}("");
            require(success, "Refund failed");
        }
    }
    
    /**
     * @dev Batch mint multiple NFTs (max 20)
     */
    function batchMint(uint256 count) external payable nonReentrant whenNotPaused {
        require(count > 0 && count <= 20, "Invalid count (1-20)");
        
        uint256 price = getMintPrice(msg.sender);
        uint256 totalPrice = price * count;
        require(msg.value >= totalPrice, "Insufficient payment");
        
        for (uint256 i = 0; i < count; i++) {
            uint256 tokenId = _tokenIdCounter;
            _tokenIdCounter++;
            _safeMint(msg.sender, tokenId);
            emit Minted(msg.sender, tokenId);
        }
        
        // Refund excess payment
        if (msg.value > totalPrice) {
            uint256 refund = msg.value - totalPrice;
            (bool success, ) = payable(msg.sender).call{value: refund}("");
            require(success, "Refund failed");
        }
    }
    
    /**
     * @dev Returns the base URI for token metadata
     */
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }
    
    /**
     * @dev Returns the token URI for a given token ID
     * Format: baseURI + tokenId + ".json"
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        
        string memory base = _baseURI();
        return string(abi.encodePacked(base, Strings.toString(tokenId), ".json"));
    }
    
    /**
     * @dev Get total number of minted tokens
     */
    function totalMinted() public view returns (uint256) {
        return _tokenIdCounter;
    }
    
    /**
     * @dev Get user's ENB balance
     */
    function getUserENBBalance(address user) public view returns (uint256) {
        if (address(enbToken) == address(0)) return 0;
        try enbToken.balanceOf(user) returns (uint256 balance) {
            return balance;
        } catch {
            return 0;
        }
    }
    
    // Owner functions
    
    function setBaseURI(string calldata baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
        emit BaseURIUpdated(baseURI);
    }
    
    function setMintPrices(uint256 newPrice, uint256 newDiscountedPrice) external onlyOwner {
        mintPrice = newPrice;
        discountedMintPrice = newDiscountedPrice;
    }
    
    function setENBThreshold(uint256 newThreshold) external onlyOwner {
        enbThreshold = newThreshold;
    }
    
    function setENBToken(address newToken) external onlyOwner {
        enbToken = IERC20(newToken);
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    function withdrawFunds() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds");
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdraw failed");
    }
}
