import { Eliza } from '@eliza/core';
import { SolanaPlugin } from '@eliza/solana-plugin';
import { solanaConfig } from '../config/solana';

export interface IChainResult {
  cid: string;
  txSignature: string;
  explorerLink: string;
}

export class CIDUploader {
  private eliza: Eliza;

  constructor() {
    this.eliza = new Eliza();
    this.eliza.use(new SolanaPlugin(solanaConfig));
  }

  private validateCID(cid: string): void {
    const cidRegex = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$|^baf[0-9A-Za-z]{50}$/;
    if (!cidRegex.test(cid)) {
      throw new Error(`Invalid CID format: ${cid}`);
    }
  }

  public async storeCIDOnChain(cid: string): Promise<IChainResult> {
    try {
      this.validateCID(cid);
      
      const transaction = await this.eliza.solana.createCIDTransaction(cid);
      const signature = await this.eliza.solana.sendTransaction(transaction);
      
      return {
        cid,
        txSignature: signature,
        explorerLink: `https://explorer.solana.com/tx/${signature}?cluster=devnet`
      };
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Failed to store CID ${cid}: ${error.message}`);
      }
      throw error;
    }
  }

  public async execute(cid: string): Promise<IChainResult> {
    try {
      const result = await this.storeCIDOnChain(cid);
      console.log(`Successfully stored CID: ${cid}`);
      return result;
    } catch (error) {
      console.error(`Failed to process CID ${cid}:`);
      throw error;
    }
  }
}