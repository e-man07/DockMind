import requests
import json
import os
from dotenv import load_dotenv
from typing import List, Dict, Any, Optional, Union

# load env variable from .env
load_dotenv()


def upload_json_to_ipfs(
    json_data: Union[Dict[str, Any], List[Dict[str, Any]]],
) -> Union[Dict[str, str], List[Dict[str, str]]]:
    """
    Upload JSON data to IPFS via Pinata

    Args:
        json_data: Either a single JSON object or a list of JSON objects to upload

    Returns:
        For a single JSON object: Dictionary with 'hash' and 'protein_id'
        For multiple JSON objects: List of dictionaries with 'hash' and 'protein_id'
    """
    url = "https://api.pinata.cloud/pinning/pinJSONToIPFS"
    jwt_token = os.getenv("PINATA_JWT_TOKEN")

    if not jwt_token:
        print(
            "JWT token not found. Please set the PINATA_JWT_TOKEN environment variable."
        )
        return {"hash": None, "protein_id": None} if isinstance(json_data, dict) else []

    headers = {
        "Authorization": f"Bearer {jwt_token}",
        "Content-Type": "application/json",
    }

    # Handle single JSON object case
    if isinstance(json_data, dict):
        try:
            response = requests.post(url, headers=headers, json=json_data)
            response.raise_for_status()
            ipfs_hash = response.json().get("IpfsHash")

            if ipfs_hash:
                protein_id = json_data.get("protein", {}).get("pdb_id")
                return {"hash": ipfs_hash, "protein_id": protein_id}
            else:
                print(f"Error: No IPFS hash in response - {response.json()}")
                return {"hash": None, "protein_id": None}
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            return {"hash": None, "protein_id": None}

    # Handle list of JSON objects case
    ipfs_results = []
    for json_file in json_data:
        try:
            response = requests.post(url, headers=headers, json=json_file)
            response.raise_for_status()
            ipfs_hash = response.json().get("IpfsHash")

            if ipfs_hash:
                protein_id = json_file.get("protein", {}).get("pdb_id")
                result = {"hash": ipfs_hash, "protein_id": protein_id}
                ipfs_results.append(result)
            else:
                print(f"Error: No IPFS hash in response - {response.json()}")
                ipfs_results.append({"hash": None, "protein_id": None})
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            ipfs_results.append({"hash": None, "protein_id": None})

    return ipfs_results
