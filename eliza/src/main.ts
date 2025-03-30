import { CIDUploader } from './cidUploader';
import dotenv from 'dotenv';

dotenv.config();

// Example usage
const uploader = new CIDUploader();
const cid = 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco'; // Replace with your CID

uploader.execute(cid)
  .then(result => {
    console.log('Transaction Details:');
    console.log(`CID: ${result.cid}`);
    console.log(`Signature: ${result.txSignature}`);
    console.log(`Explorer: ${result.explorerLink}`);
  })
  .catch(error => console.error('Process failed:', error));