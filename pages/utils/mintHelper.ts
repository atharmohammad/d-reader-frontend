import {
    Connection,
    Keypair,
    PublicKey,
    SystemProgram,
    SYSVAR_SLOT_HASHES_PUBKEY,
    TransactionInstruction,
    SYSVAR_INSTRUCTIONS_PUBKEY,
    AccountMeta,
  } from '@solana/web3.js';

import { PROGRAM_ID as CANDY_MACHINE_PROGRAM_ID } from '@metaplex-foundation/mpl-candy-machine-core';

import {
    CandyGuardData,
    createInitializeInstruction,
    createMintInstruction,
    createSetAuthorityInstruction,
    createUnwrapInstruction,
    createUpdateInstruction,
    createWithdrawInstruction,
    createWrapInstruction,
    InitializeInstructionAccounts,
    InitializeInstructionArgs,
    MintInstructionAccounts,
    MintInstructionArgs,
    PROGRAM_ID,
    SetAuthorityInstructionAccounts,
    SetAuthorityInstructionArgs,
    UnwrapInstructionAccounts,
    UpdateInstructionAccounts,
    UpdateInstructionArgs,
    WithdrawInstructionAccounts,
    WrapInstructionAccounts,
} from "@metaplex-foundation/mpl-candy-guard"

  export const METAPLEX_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

  import {
    CandyMachine,
    keypairIdentity,
    Metaplex,
    Signer,
    walletAdapterIdentity,
  } from '@metaplex-foundation/js';
import { createAssociatedTokenAccountInstruction, createInitializeMintInstruction, createMintToInstruction, MintLayout, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { AnchorWallet } from '@solana/wallet-adapter-react';

export async function mintInstruction(
    candyMachine: PublicKey,
    payer: AnchorWallet,
    mint: Keypair,
    connection: Connection,
    remainingAccounts?: AccountMeta[] | null,
    mintArgs?: Uint8Array | null,
    label?: string | null,
  ): Promise<{ instructions: TransactionInstruction[] } | undefined> {
    // candy machine object
    const metaplex = Metaplex.make(connection).use(walletAdapterIdentity(payer));
    const candyMachineObject: CandyMachine = await metaplex
      .candyMachines()
      .findByAddress({
        address: candyMachine
      });
        //address: new PublicKey('4o8Wbsp5MzSzxXdwbRi6SgdtzH4LHaRSL4Xrg8UKA9nq'),

    // PDAs required for the mint
    // const tokenProgram = metaplex.programs().getToken();
    // const systemProgram = metaplex.programs().getSystem();
    // PDAs.
    const authorityPda = metaplex.candyMachines().pdas().authority({
      candyMachine: candyMachine,
    });

    const nftMetadata = metaplex.nfts().pdas().metadata({
      mint: mint.publicKey,
    });
    const nftMasterEdition = metaplex.nfts().pdas().masterEdition({
      mint: mint.publicKey,
    });
    
    const nftTokenAccount = metaplex.tokens().pdas().associatedTokenAccount({mint : mint.publicKey, owner : payer.publicKey})

    // collection PDAs
    const collectionMetadata = metaplex.nfts().pdas().metadata({
      mint: candyMachineObject.collectionMintAddress,
    });
    const collectionMasterEdition = metaplex.nfts().pdas().masterEdition({
      mint: candyMachineObject.collectionMintAddress,
    });

    const collectionAuthorityRecord = metaplex
      .nfts()
      .pdas()
      .collectionAuthorityRecord({
        mint: candyMachineObject.collectionMintAddress,
        collectionAuthority: authorityPda,
    });

    // const tokenMetadataProgram = metaplex.programs().getTokenMetadata();
    // const guardClient = metaplex.candyMachines().guards();
    const collectionMint = candyMachineObject.collectionMintAddress;
    // retrieves the collection nft
    const collection = await metaplex.nfts().findByMint({ mintAddress: collectionMint });
    if(!candyMachineObject.candyGuard){
        console.error("no associated candyguard !");
        return;
    }
    const accounts: MintInstructionAccounts = {
      candyGuard : candyMachineObject.candyGuard?.address,
      candyMachineProgram: CANDY_MACHINE_PROGRAM_ID,
      candyMachine,
      payer: payer.publicKey,
      candyMachineAuthorityPda: authorityPda,
      nftMasterEdition: nftMasterEdition,
      nftMetadata,
      nftMint: mint.publicKey,
      nftMintAuthority: payer.publicKey,
      collectionUpdateAuthority: collection.updateAuthorityAddress,
      collectionAuthorityRecord,
      collectionMasterEdition,
      collectionMetadata,
      collectionMint,
      tokenMetadataProgram: METAPLEX_PROGRAM_ID,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      recentSlothashes: SYSVAR_SLOT_HASHES_PUBKEY,
      instructionSysvarAccount: SYSVAR_INSTRUCTIONS_PUBKEY,
    };

    if (!mintArgs) {
        mintArgs = new Uint8Array();
    }
  
    const args: MintInstructionArgs = {
        mintArgs,
        label: label ?? null,
    };

    const ixs: TransactionInstruction[] = [];
    ixs.push(
        SystemProgram.createAccount({
            fromPubkey: payer.publicKey,
            newAccountPubkey: mint.publicKey,
            lamports: await connection.getMinimumBalanceForRentExemption(MintLayout.span),
            space: MintLayout.span,
            programId: TOKEN_PROGRAM_ID,
        }),
    );
    
    ixs.push(createInitializeMintInstruction(mint.publicKey, 0, payer.publicKey, payer.publicKey));

    ixs.push(
        createAssociatedTokenAccountInstruction(
            payer.publicKey,
            nftTokenAccount,
            payer.publicKey,
            mint.publicKey,
        ),
    );

    ixs.push(createMintToInstruction(mint.publicKey, nftTokenAccount, payer.publicKey, 1, []));

    const mintIx = createMintInstruction(accounts, args);

    if (remainingAccounts) {
        mintIx.keys.push(...remainingAccounts);
    }

    ixs.push(mintIx);

    return { instructions: ixs };
}
