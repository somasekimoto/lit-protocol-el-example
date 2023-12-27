import * as LitJsSdk from "@lit-protocol/lit-node-client-nodejs";
import { SiweMessage } from 'siwe';
import { Wallet, getBytes, keccak256, toUtf8Bytes } from 'ethers';
import * as dotenv from "dotenv";
dotenv.config();

const wallet = new Wallet(process.env.PRIVATE_KEY);

const domain = "localhost";
const origin = "https://localhost/login";

function createSiweMessage (address, statement) {
  const siweMessage = new SiweMessage({
    domain,
    address,
    statement,
    uri: origin,
    version: '1',
    chainId: 80001,
    // ISO 8601 datetime tommorrow
    expirationTime: new Date(Date.now() + 86400000).toISOString(),
  });
  return siweMessage.prepareMessage();
}


// this code will be run on the node
const litActionCode = `
const go = async () => {  
  // this requests a signature share from the Lit Node
  // the signature share will be automatically returned in the HTTP response from the node
  // all the params (toSign, publicKey, sigName) are passed in from the LitJsSdk.executeJs() function
  const sigShare = await LitActions.signEcdsa({ toSign, publicKey , sigName });
};

go();
`;

const statement = "This is a test statement.";
// you need an AuthSig to auth with the nodes
// normally you would obtain an AuthSig by calling LitJsSdk.checkAndSignAuthMessage({chain})


const runLitAction = async () => {
  const litNodeClient = new LitJsSdk.LitNodeClientNodeJs({
    litNetwork: "cayenne",
  });
  const walletAddress = await wallet.getAddress();
  const signedMessage = createSiweMessage(
    walletAddress,
    statement
  )
  const sig = await wallet.signMessage(signedMessage);
  
  const authSig = {
    sig,
    derivedVia: "web3.eth.personal.sign",
    signedMessage,
    address: walletAddress,
  };
  console.log("authSig: ", authSig);
  await litNodeClient.connect();
  console.log('arrarrrr', toUtf8Bytes("Hello World"))
  const toSign = getBytes(keccak256(toUtf8Bytes("Hello World")));
  const signatures = await litNodeClient.executeJs({
    code: litActionCode,
    authSig,
    // all jsParams can be used anywhere in your litActionCode
    jsParams: {
      toSign,
      publicKey: process.env.PKP_PUBLIC_KEY,
      sigName: "sig1",
    },
  });
  console.log("signatures: ", signatures);
};

runLitAction();