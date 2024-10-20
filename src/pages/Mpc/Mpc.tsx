import { KeyShare, PierMpcVaultSdk, SessionKind } from "@pier-wallet/mpc-lib";
import { createPierMpcSdkWasm } from "@pier-wallet/mpc-lib/wasm";
import { useEffect, useState } from "react";

import { PierMpcEthereumWallet } from "@pier-wallet/mpc-lib/ethers-v5";
import { ethers } from "ethers";


// REMARK: Use should use your own ethers provider - this is just for demo purposes
const ethereumProvider = new ethers.providers.JsonRpcProvider(
  "https://ethereum-sepolia.publicnode.com"
);

const pierMpc = new PierMpcVaultSdk(createPierMpcSdkWasm());
export default function Mpc() {
  const [signedIn, setSignedIn] = useState(false);
  const [keyShare, setKeyShare] = useState<KeyShare | null>(null);
  const [ethWallet, setEthWallet] = useState<PierMpcEthereumWallet | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);

  const [logData, setLogData] = useState("");

  // Establish connection with pier's MPC server
  useEffect(() => {
    if (!keyShare) return;
    (async () => {
      const signConnection = await pierMpc.establishConnection(
        SessionKind.SIGN,
        keyShare.partiesParameters
      );
      const ethWallet = new PierMpcEthereumWallet(
        keyShare,
        signConnection,
        pierMpc,
        ethereumProvider
      );
      

      setEthWallet(ethWallet);
    })();
  }, [keyShare]);

  const generateKeyShare = async () => {
    setIsLoading(true);
    try {
      console.log("generating local key share (2 out of 2)...");
      setLogData(logData + '\n' + "generating local key share (2 out of 2)...");

      const localKeyShare = await pierMpc.generateKeyShare2Of2();

      console.log("local key share generated.", localKeyShare.publicKey);
      setLogData(
        logData + '\n' + "local key share generated: " + localKeyShare.publicKey
      );
      // TODO: Implement storing local key share somewhere (typically on the server of the application)
      setKeyShare(localKeyShare);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const sendEthereumTransaction = async () => {
    if (!ethWallet) return;

    setIsLoading(true);
    try {
      const receiver = '0xD15a8382Db1CD57B3B3823EE90ef057C639E3328'
      const balance = await ethWallet.getBalance();
      const amountToSend = balance.div(2);
      if (amountToSend.isZero()) {
        console.log("no funds to send");
        setLogData(logData + '\n' + "no funds on address:" + ethWallet.address);
        return;
      }
      console.log("sending", amountToSend.toString(), "to", receiver);
      setLogData(logData + '\n' + "sending " + amountToSend.toString() + " to " + receiver);

      // sign the transaction locally & send it to the network once we have the full signature
      const tx = await ethWallet.sendTransaction({
        to: receiver,
        value: amountToSend,
      });
      console.log("tx", tx.hash);
      setLogData(logData + '\n' + "SENT!!!\ntx:" + tx.hash);
    } catch (e) {
      console.error(e);
      setLogData(logData + '\n' + 'ERORR!!!');
      setLogData(logData + '\n' + JSON.stringify(e));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: "1rem" }}>
      <button
        disabled={isLoading}
        onClick={async () => {
          setIsLoading(true);
          try {
            await pierMpc.auth.signInWithPassword({
              email: "mpc-lib-test@example.com",
              password: "123456",
            });
            setSignedIn(true);
          } finally {
            setIsLoading(false);
          }

          console.log("signed in as test user");
          setLogData(logData + "signed in as test user");
        }}
      >
        {signedIn ? "Signed in" : "Sign in as Test User"}
      </button>
      <button onClick={generateKeyShare} disabled={isLoading}>
        Generate Key Share
      </button>
      <button onClick={sendEthereumTransaction} disabled={isLoading}>
        Send Ethereum
      </button>
      
      <div>PublicKey: {keyShare?.publicKey}</div>
      <div>ETH Address: {ethWallet?.address}</div>
      <div>
        <textarea value={logData} readOnly rows={30} cols={50} />
      </div>
    </div>
  );
}
