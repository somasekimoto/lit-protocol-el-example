import { Wallet, JsonRpcProvider } from "ethers";
import { CHAIN_NAME, Circuit, ContractCondition } from "lit-listener-sdk";
import json from '../artifacts/contracts/RentalInfo.sol/Rental.json' assert { type: "json" };
const rentalAbi = json.abi;
import * as dotenv from "dotenv";
dotenv.config();


const startCircuit = async () => {
  const chronicleProvider = new JsonRpcProvider("https://polygon-mumbai-bor.publicnode.com", 80001);
  // const chronicleProvider = new JsonRpcProvider("https://chain-rpc.litprotocol.com/http", 175177);
  console.log('chronicleProvider',chronicleProvider)
  const chronicleSigner = new Wallet(process.env.PRIVATE_KEY, chronicleProvider);
  console.log('chronicleSigner',chronicleSigner)

  const quickStartCircuit = new Circuit(chronicleSigner);

  quickStartCircuit.setConditions([
  new ContractCondition(
      "0x6968105460f67c3bf751be7c15f92f5286fd0ce5", // contract address
      rentalAbi, // abi
        CHAIN_NAME.MUMBAI, // chainId
        "https://your_provider_url_for_this_network", // provider URL
        "Transfer",
        ["to", "value"], // event name args
        ["0x6968105460f67c3bf751be7c15f92f5286fd0ce5", 500000n], // expected value
        "===", // match operator
        async () => { console.log("Matched!"); }, // onMatched function
        async () => { console.log("Unmatched!"); }, // onUnMatched function
        (error) => { console.log("Error:", error); } // onError function,
  ), ]);

  quickStartCircuit.setConditionalLogic({
      type: "EVERY",
      interval: 5000,
  });

  await quickStartCircuit.start({publicKey: process.env.PKP_PUBLIC_KEY});

}


startCircuit();
