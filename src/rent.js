import { JsonRpcProvider, Wallet, ethers } from "ethers";
import json from '../artifacts/contracts/RentalInfo.sol/Rental.json' assert { type: "json" };
const rentalAbi = json.abi;
import * as dotenv from "dotenv";
dotenv.config();
import nftjson from '../artifacts/contracts/NFT.sol/TestNonFungibleToken.json' assert { type: "json" };
const nftAbi = nftjson.abi;

async function rent() {
    const provider = new JsonRpcProvider("https://polygon-mumbai-bor.publicnode.com")
    const wallet  = new Wallet(process.env.PRIVATE_KEY, provider);
    const contractAddress = "0xBE71754cF535AA6A93E8717edF852026e1379957";
    const contract = new ethers.Contract(contractAddress, rentalAbi, wallet);
    const nftAddress = "0x714575EE8893d514131883e30976af531100912F";
    const result = await contract.rent(nftAddress, 1, 1703954401n);
    console.log('result', result);
}

rent();

