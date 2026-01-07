
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title BloomersNFTV2
 * @dev NFT contract using ERC721URIStorage - tokenURI passed at mint time
 * No baseURI needed - each token stores its full metadata URI
 */
contract BloomersNFTV2 is ERC721URIStorage, Ownable, ReentrancyGuard {
    
    uint256 private _tokenIdCounter;
    
    // Pricing
    uint256 public mintPrice = 0.0004 ether;
    uint256 public discountedMintPrice = 0.0002 ether;
    
    // ENB token for discount eligibility
    IERC20 public enbToken;
    uint256 public enbThreshold = 100000 * 10**18; // 100,000 ENB tokens
    
    // Events
    event Minted(address indexed to, uint256 indexed tokenId, string tokenURI);
    
    constructor(address _enbToken) ERC721("Bloomers", "BLOOM") Ownable(msg.sender) {
        enbToken = IERC20(_enbToken);
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
     * @dev Mint a single NFT with metadata URI
     * @param metadataURI The full metadata URI for this token
     */
    function mint(string memory metadataURI) external payable nonReentrant {
        require(bytes(metadataURI).length > 0, "URI cannot be empty");
        
        uint256 price = getMintPrice(msg.sender);
        require(msg.value >= price, "Insufficient payment");
        
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, metadataURI);
        
        emit Minted(msg.sender, tokenId, metadataURI);
        
        // Refund excess payment
        if (msg.value > price) {
            uint256 refund = msg.value - price;
            (bool success, ) = payable(msg.sender).call{value: refund}("");
            require(success, "Refund failed");
        }
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
    
    function withdrawFunds() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds");
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdraw failed");
    }
}
