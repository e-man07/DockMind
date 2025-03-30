import { Connection, Keypair } from '@solana/web3.js';
import dotenv from 'dotenv';

dotenv.config();

export const solanaConfig = {
  connection: new Connection(process.env.SOLANA_RPC_URL!),
  wallet: Keypair.fromSecretKey(
    new Uint8Array(process.env.PRIVATE_KEY!.split(',').map(Number))
  )
};