// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;


import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract Rental {
    struct RentalInfo {
        address owner;
        address renter;
        uint256 expiration;
    }

    mapping (address => mapping (uint256 => RentalInfo)) rentals;

    constructor() {
    }

    function lend(address nft, uint256 tokenId)public{
        address owner = IERC721(nft).ownerOf(tokenId);
        require(owner == msg.sender, "You are not the owner of this NFT");
        RentalInfo memory rental = RentalInfo(msg.sender, address(0), 0);
        rentals[nft][tokenId] = rental;
    }

    function rent(address nft, uint256 tokenId, uint256 expiration)public{
        RentalInfo storage rentalInfo = rentals[nft][tokenId];
        require(rentalInfo.owner != address(0), "This NFT is not available for rent");
        require(rentalInfo.renter == address(0), "This NFT is already rented");
        rentalInfo.renter = msg.sender;
        rentalInfo.expiration = expiration;
        IERC721(nft).transferFrom(rentalInfo.owner, rentalInfo.renter, tokenId);
    }

    function back(address nft, uint256 tokenId)public{
        RentalInfo storage rentalInfo = rentals[nft][tokenId];
        require(rentalInfo.renter == msg.sender, "You are not the renter of this NFT");
        require(isExpired(nft, tokenId), "You can't return this NFT yet");
        delete rentals[nft][tokenId];
        IERC721(nft).transferFrom(msg.sender, rentalInfo.owner, tokenId);
    }

    function isExpired(address nft, uint256 tokenId)public view returns(bool){
        return rentals[nft][tokenId].expiration > 0 && rentals[nft][tokenId].expiration < block.timestamp;
    }
}