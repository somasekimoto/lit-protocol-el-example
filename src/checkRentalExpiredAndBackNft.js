import * as LitJsSdk from "@lit-protocol/lit-node-client-nodejs";
import { SiweMessage } from 'siwe';
import { Wallet, ethers } from 'ethers';
import json from '../artifacts/contracts/RentalInfo.sol/Rental.json' assert { type: "json" };
const rentalAbi = json.abi;
import { serialize } from "@ethersproject/transactions";
import * as dotenv from "dotenv";
dotenv.config();


// LitActionsで実行するJSコード
const litActionCode = `
const go = async () => {  
  // test an access control condition
  const testResult = await LitActions.checkConditions({conditions, authSig, chain})

  console.log('testResult', testResult)

  // only sign if the access condition is true
  if (!testResult){
    return;
  }

  const fromAddress = ethers.utils.computeAddress(publicKey);
  const nonce = await LitActions.getLatestNonce({address: fromAddress, chain});
  const tx = {...txParams, nonce};
  const serializedTx = ethers.utils.serializeTransaction(tx);
  const rlpEncodedTxn = ethers.utils.arrayify(serializedTx);
  const unsignedTxHash = ethers.utils.keccak256(rlpEncodedTxn);
  const toSign = ethers.utils.arrayify(unsignedTxHash);
  const sigShare = await LitActions.signEcdsa({ toSign, publicKey , sigName });

  LitActions.setResponse({response: JSON.stringify({tx})});
  console.log('sigShare', sigShare)
  
  
};

go();
`;

/**
 * 
 * @param {string} contractAddress 
 * @param {string} nftAddress 
 * @param {number} nftTokenId 
 * @param {string} chain 
 * @param {string} privateKey 
 * @param {string} rpcUrl 
 */
async function checkRentalExpiredAndBackNft(contractAddress, nftAddress, nftTokenId, chain, privateKey, rpcUrl) {
  // this code will be run on the nodejs server
  const litNodeClient = new LitJsSdk.LitNodeClientNodeJs({
    litNetwork: "cayenne",
    debug: true,
  });
  await litNodeClient.connect();

  /**
   * Creates a Siwe message for the given wallet address, statement, NFT contract address, and NFT token ID.
   * @param {string} address - The wallet address.
   * @param {string} statement - The statement.
   * @param {string} nft - The NFT contract address.
   * @param {number} tokenId - The NFT token ID.
   * @returns {string} The Siwe message.
   */
  function createSiweMessage(address, statement, nft, tokenId) {
    const domain = "localhost";
    const origin = "https://localhost/login";
    const encodedTokenId = LitJsSdk.uint8arrayToString(
      LitJsSdk.uint8arrayFromString(`${tokenId}`, "utf8"),
      "base64url"
    );
    const encodedNft = LitJsSdk.uint8arrayToString(
      LitJsSdk.uint8arrayFromString(nft, "utf8"),
      "base64url"
    );
    const siweMessage = new SiweMessage({
      domain,
      address,
      statement,
      uri: origin,
      version: '1',
      chainId: 80001,
      // ISO 8601 datetime tommorrow
      expirationTime: new Date(Date.now() + 86400000).toISOString(),
      // LitActions上で、checkConditionsを実行する際に使用する
      resources: [`litParam:tokenId:${encodedTokenId}`, `litParam:nft:${encodedNft}`],
    });
    return siweMessage.prepareMessage();
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new Wallet(privateKey, provider);
  const walletAddress = await wallet.getAddress();
  const statement = "I want to back my NFT";

  // Create a Siwe message for the given wallet address, statement, NFT contract address, and NFT token ID.
  const siweMessage = createSiweMessage(
    walletAddress,
    statement,
    nftAddress,
    nftTokenId,
  )
  const sig = await wallet.signMessage(siweMessage);
  
  // Create an authSig object.
  const authSig = {
    sig,
    derivedVia: "web3.eth.personal.sign",
    signedMessage: siweMessage,
    address: walletAddress,
  };
  console.log("authSig: ", authSig);
  
  // LitActionsで実行するJSコードの条件 今回はRentalInfo.solのisExpired関数を実行してtrueが返ってくるかどうか
  const conditions = [
    {
      contractAddress,
      functionName: "isExpired",
      functionParams: [":litParam:nft", ":litParam:tokenId"],
      functionAbi: {
        "inputs": [
          {
            "internalType": "address",
            "name": "nft",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "tokenId",
            "type": "uint256"
          }
        ],
        "name": "isExpired",
        "outputs": [
          {
            "internalType": "bool",
            "name": "",
            "type": "bool"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      chain,
      returnValueTest: {
        key: "",
        comparator: "=",
        value: "true",
      },
    },
  ];

  const contract = new ethers.Contract(contractAddress, rentalAbi, provider);
  const encodedData = contract.interface.encodeFunctionData("back", [nftAddress, nftTokenId]);
  const feeData = await provider.getFeeData();

  // LitActionsで実行するJSコードのパラメーター
  const signatures = await litNodeClient.executeJs({
    code: litActionCode,
    authSig,
    // all jsParams can be used anywhere in your litActionCode
    jsParams: {
        authSig,
        conditions,
        chain,
        publicKey: process.env.PKP_PUBLIC_KEY,
        sigName: "sig1",
        txParams: {
          to: contractAddress,
          value: "0x0",
          data: encodedData,
          chainId: 80001,
          type: 2,
          maxFeePerGas: feeData.maxFeePerGas.toString(),
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas.toString(),
        }
    },
  });
  console.log("signatures: ", signatures);

  // LitActionsの実行結果を取得し、トランザクションを送信する
  const txSig = signatures.signatures["sig1"].signature;

  const serializedTx = serialize(signatures.response.tx, txSig)
  
  const result = await provider.broadcastTransaction(serializedTx)
  console.log('result',result);
}

checkRentalExpiredAndBackNft(
  "0xBE71754cF535AA6A93E8717edF852026e1379957",
  "0x714575EE8893d514131883e30976af531100912F",
  1,
  "mumbai",
  process.env.PRIVATE_KEY,
  "https://polygon-mumbai-bor.publicnode.com",
);