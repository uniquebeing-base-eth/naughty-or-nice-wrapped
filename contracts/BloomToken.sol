
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BLOOM Token
 * @dev ERC20 token with 1 billion max supply
 * @notice The Bloomers ecosystem token
 */
contract BloomToken is ERC20, ERC20Burnable, Ownable {
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18; // 1 billion tokens

    constructor(address initialOwner) ERC20("BLOOM", "BLOOM") Ownable(initialOwner) {
        // Mint entire supply to the owner
        _mint(initialOwner, MAX_SUPPLY);
    }

    /**
     * @dev Returns the number of decimals used for token - standard 18
     */
    function decimals() public pure override returns (uint8) {
        return 18;
    }
}
