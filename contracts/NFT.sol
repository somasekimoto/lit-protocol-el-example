
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract TestNonFungibleToken is ERC721 {
    constructor() ERC721("TestNonFungibleToken", "TNFT"){}

    function safeMint(address to, uint256 tokenId) public {
        _safeMint(to, tokenId);
    }
}