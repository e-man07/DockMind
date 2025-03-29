import requests
import json 
import os 
from dotenv import load_dotenv 
from typing import List, Dict, Any, Optional

# load env variable from .env
load_dotenv()

def upload_json_to_ipfs(json_files: List[Dict[str, Any]]) -> List[Dict[str, str]]:
    """
    Upload JSON files to IPFS via Pinata
    Returns a list of dictionaries containing IPFS hashes and protein IDs
    """
    url = "https://api.pinata.cloud/pinning/pinJSONToIPFS" 
    jwt_token = os.getenv("PINATA_JWT_TOKEN")
    
    if not jwt_token:
        print("JWT token not found. Please set the PINATA_JWT_TOKEN environment variable.")
        return []

    headers = {
        "Authorization": f"Bearer {jwt_token}",
        "Content-Type": "application/json"
    }

    ipfs_results = []
    for json_file in json_files:
        try:
            response = requests.post(url, headers=headers, json=json_file)
            response.raise_for_status()
            ipfs_hash = response.json().get('IpfsHash')
            
            if ipfs_hash:
                protein_id = json_file.get('protein', {}).get('pdb_id')
                result = {
                    'hash': ipfs_hash,
                    'protein_id': protein_id
                }
                ipfs_results.append(result)
            else:
                print(f"Error: No IPFS hash in response - {response.json()}")
                ipfs_results.append({'hash': None, 'protein_id': None})
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            ipfs_results.append({'hash': None, 'protein_id': None})
    
    return ipfs_results