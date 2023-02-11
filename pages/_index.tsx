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
        const candyMachine = new PublicKey('2cMgvNiVs8ULqm482uEfHjWT8kCVg7e8JdENGF4ahDHN');
        const destination = new PublicKey("3ZQgnUCPVYufuMycRhjRp7UaoBwqzYYm87jGeMSS7NMo");
        const mint_ix = await mintInstruction(candyMachine,wallet,mint,provider.connection,[{
            pubkey:destination,
            isSigner:false,
            isWritable:true
        }]);
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