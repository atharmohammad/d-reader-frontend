import React, { useEffect , useState } from 'react';
import {
    useAnchorWallet,
    useConnection,
    useWallet,
} from '@solana/wallet-adapter-react';
import {
    AnchorProvider, Provider, web3, setProvider,Program, Idl
  } from '@project-serum/anchor'
import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import idl from "./candy_guard.json"
import { mintInstruction } from './utils/mintHelper';

const programID = new PublicKey(idl.metadata.address);
const network = "https://explorer-api.devnet.solana.com/";
function MintComponent() {
    const wallet = useAnchorWallet();
    const walletAddress = wallet?.publicKey.toString();
    const [allAccount,setAllAccounts] : [any , any] = useState(null);
    const { connection } = useConnection();
    async function getProvider() {
        const connection = new Connection(network, "processed");

        const provider = wallet ? new AnchorProvider(
            connection, wallet, {
                preflightCommitment: 'recent',
                commitment: 'recent',
              }
        ):null;
        return provider;
    }
    const jsonString = JSON.stringify(idl);
    const idlJSON = JSON.parse(jsonString);
    const mintNft = async()=>{
        console.log("start")
        const provider = await getProvider();
        if(!provider || !wallet)return;
        const program  = new Program(idlJSON, idl.metadata.address, provider);
        const mint = Keypair.generate();
        const candyMachine = new PublicKey('B7BnAA15YqwX6YkqmBD5ktbH8qwQVTzTZ3km5FLv7tkY');
        // const key =  Keypair.fromSecretKey(
        //     new Uint8Array([209,51,22,116,112,76,53,187,35,100,116,37,253,206,248,191,90,235,45,204,192,66,204,174,95,120,45,20,110,52,243,86,90,150,196,14,140,0,201,105,169,208,130,240,117,171,205,201,241,105,26,234,14,213,128,26,147,60,103,98,136,177,251,66]),
        //   );
        const mint_ix = await mintInstruction(candyMachine,wallet,mint,provider.connection,undefined,undefined,"Group 1");
        if(!mint_ix){
            return;
        }
        const tx = new Transaction().add(...mint_ix.instructions);
        tx.feePayer = wallet.publicKey;
        tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
        tx.sign(mint)
        const signedTx = await wallet.signTransaction(tx);
        const txId = await connection.sendRawTransaction(signedTx.serialize())
        await connection.confirmTransaction(txId)
    }
    return (
        <div>
            <button onClick={mintNft}>mint</button>
        </div>
    )
}

export default MintComponent;