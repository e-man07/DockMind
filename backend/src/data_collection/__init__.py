import json
import time
from pathlib import Path
from typing import Dict, List, Optional

import requests
from loguru import logger


class PDBCollector:
    """
    A class to collect protein structure data from the RCSB PDB database.
    """

    BASE_URL = "https://data.rcsb.org/rest/v1/core"
    SEARCH_URL = "https://search.rcsb.org/rcsbsearch/v2/query"
    DOWNLOAD_URL = "https://files.rcsb.org/download"

    def __init__(self, output_dir: str = "data/raw"):
        """
        Initialize the PDB collector.

        Args:
            output_dir: Directory to store downloaded PDB files
        """
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"PDB Collector initialized. Output directory: {self.output_dir}")

    def search_by_query(self, query: Dict) -> List[str]:
        """
        Search PDB entries using the RCSB Search API.

        Args:
            query: A dictionary representing the search query in RCSB format

        Returns:
            List of PDB IDs matching the query
        """

        logger.debug(f"Sending query to RCSB: {query}")
        try:
            response = requests.post(self.SEARCH_URL, json=query)

            # Check if response is valid JSON before raising for status
            try:
                response_data = response.json()
            except ValueError:
                logger.error(f"Invalid JSON response: {response.text}")
                return []

            # Now check the HTTP status
            if response.status_code != 200:
                logger.error(
                    f"API error: Status {response.status_code}, Response: {response_data}"
                )
                return []

            # Extract results
            results = response_data.get("result_set", [])
            pdb_ids = [result["identifier"].split("_")[0] for result in results]
            logger.info(f"Found {len(pdb_ids)} PDB entries matching the query")
            return pdb_ids
        except requests.exceptions.RequestException as e:
            logger.error(f"Error searching PDB: {e}")
            return []
        except KeyError as e:
            logger.error(f"Unexpected response structure: {e}")
            return []

    def download_pdb(self, pdb_id: str, file_format: str = "pdb") -> Optional[Path]:
        """
        Download a PDB file.

        Args:
            pdb_id: The 4-character PDB ID
            file_format: Format to download (pdb, cif, xml, etc.)

        Returns:
            Path to the downloaded file or None if download failed
        """
        pdb_id = pdb_id.lower()
        
        # Determine correct file extension and URL extension
        if file_format == "pdb":
            file_ext = "pdb"  # Changed from "ent" to "pdb" for local storage
            url_ext = "pdb"   # Use pdb extension in URL
        else:
            file_ext = file_format
            url_ext = file_format
        
        output_file = self.output_dir / f"{pdb_id}.{file_ext}"

        # Skip if file already exists
        if output_file.exists():
            logger.debug(f"File {output_file} already exists, skipping download")
            return output_file

        try:
            url = f"{self.DOWNLOAD_URL}/{pdb_id}.{url_ext}"
            logger.debug(f"Downloading from URL: {url}")
            
            response = requests.get(url)
            response.raise_for_status()

            with open(output_file, "wb") as f:
                f.write(response.content)

            logger.info(f"Downloaded {pdb_id} to {output_file}")
            return output_file
        except requests.exceptions.RequestException as e:
            logger.error(f"Error downloading {pdb_id}: {e}")
            return None

    def batch_download(
        self,
        pdb_ids: List[str],
        file_format: str = "pdb",
        max_retries: int = 3,
        delay: float = 0.5,
        collect_metadata: bool = True
    ) -> List[Path]:
        """
        Download multiple PDB files with retries and rate limiting.

        Args:
            pdb_ids: List of PDB IDs to download
            file_format: Format to download files in
            max_retries: Maximum number of retry attempts for failed downloads
            delay: Delay between requests in seconds
            collect_metadata: Whether to collect metadata during download

        Returns:
            List of paths to successfully downloaded files
        """
        downloaded_files = []
        total = len(pdb_ids)
        
        logger.info(f"Starting batch download of {total} PDB files in {file_format} format")
        
        # If collecting metadata, prepare dictionary and directory
        metadata_dict = {}
        if collect_metadata:
            logger.info("Metadata collection enabled")
            metadata_dir = Path("data/processed")
            metadata_dir.mkdir(parents=True, exist_ok=True)
        
        for idx, pdb_id in enumerate(pdb_ids, 1):
            success = False
            
            for attempt in range(max_retries):
                file_path = self.download_pdb(pdb_id, file_format)
                if file_path:
                    downloaded_files.append(file_path)
                    success = True
                    
                    # Collect metadata if enabled
                    if collect_metadata:
                        try:
                            logger.debug(f"Fetching metadata for {pdb_id}")
                            metadata = self.get_metadata(pdb_id)
                            if metadata:
                                # Process and store essential metadata
                                processed_metadata = self._process_metadata(pdb_id, metadata)
                                metadata_dict[pdb_id] = processed_metadata
                        except Exception as e:
                            logger.error(f"Error collecting metadata for {pdb_id}: {e}")
                    
                    break
                    
                logger.warning(f"Retry {attempt + 1}/{max_retries} for {pdb_id}")
                time.sleep(delay * (attempt + 1))  # Exponential backoff
            
            if not success:
                logger.error(f"Failed to download {pdb_id} after {max_retries} attempts")
            
            # Log progress periodically
            if idx % 10 == 0 or idx == total:
                logger.info(f"Progress: {idx}/{total} ({idx/total:.1%})")
                
                # Save metadata periodically to avoid losing progress
                if collect_metadata and metadata_dict:
                    with open("data/processed/metadata.json", "w") as f:
                        json.dump(metadata_dict, f, indent=2)
                    logger.info(f"Saved metadata for {len(metadata_dict)} structures")
                
            time.sleep(delay)  # Rate limiting between requests

        logger.info(f"Batch download complete. Downloaded {len(downloaded_files)}/{total} files")
        
        # Save final metadata
        if collect_metadata and metadata_dict:
            with open("data/processed/metadata.json", "w") as f:
                json.dump(metadata_dict, f, indent=2)
            logger.info(f"Metadata collection complete. Saved metadata for {len(metadata_dict)} structures")
        
        return downloaded_files

    def _process_metadata(self, pdb_id: str, raw_metadata: Dict) -> Dict:
        """
        Process raw metadata into a format useful for categorization.
        
        Args:
            pdb_id: The PDB ID
            raw_metadata: Raw metadata from the RCSB API
            
        Returns:
            Processed metadata dictionary
        """
        processed = {}
        
        try:
            # Basic information
            processed["title"] = raw_metadata.get("struct", {}).get("title", "")
            
            # Organism information
            entity_source = raw_metadata.get("rcsb_entity_source_organism", [{}])
            if entity_source and len(entity_source) > 0:
                taxonomy = entity_source[0].get("taxonomy_lineage", [])
                if taxonomy and len(taxonomy) > 0:
                    processed["organism"] = taxonomy[0].get("name", "Unknown")
                
            # Classification
            if "rcsb_struct_class" in raw_metadata:
                processed["classification"] = raw_metadata["rcsb_struct_class"]
                
            if "refine" in raw_metadata and len(raw_metadata["refine"]) > 0:
                processed["resolution"] = raw_metadata["refine"][0].get("ls_dres_high")
                processed["r_factor"] = raw_metadata["refine"][0].get("ls_rfactor_obs")
                processed["r_free"] = raw_metadata["refine"][0].get("ls_rfactor_rfree")

            if "exptl" in raw_metadata and len(raw_metadata["exptl"]) > 0:
                processed["experimental_method"] = raw_metadata["exptl"][0].get("method")
                
            if "diffrn" in raw_metadata and len(raw_metadata["diffrn"]) > 0:
                processed["temperature"] = raw_metadata["diffrn"][0].get("ambient_temp")

            if "citation" in raw_metadata and len(raw_metadata["citation"]) > 0:
                citation = raw_metadata["citation"][0]
                processed["publication"] = {
                    "doi": citation.get("pdbx_database_id_doi"),
                    "pubmed_id": citation.get("pdbx_database_id_pub_med"),
                    "title": citation.get("title"),
                    "year": citation.get("year")
                }

            if "pdbx_database_related" in raw_metadata:
                related = raw_metadata["pdbx_database_related"]
                processed["related_structures"] = [
                    {"pdb_id": entry.get("db_id"), "details": entry.get("details")}
                    for entry in related if entry.get("db_name") == "PDB"
                ]
            # Keywords
            struct_keywords = raw_metadata.get("struct_keywords", {})
            if struct_keywords:
                processed["keywords"] = struct_keywords.get("pdbx_keywords", "").split(", ")
                
            # Protein function and family
            annotations = raw_metadata.get("rcsb_polymer_entity_annotation", [])
            if annotations:
                functions = []
                families = []
                for annotation in annotations:
                    if annotation.get("type") == "Function":
                        functions.append(annotation.get("annotation_value", ""))
                    elif annotation.get("type") in ["SCOP Class", "CATH Class", "Pfam"]:
                        families.append(annotation.get("annotation_value", ""))
                
                if functions:
                    processed["functions"] = functions
                if families:
                    processed["protein_families"] = families
                    
            # Binding affinities if available
            binding_data = raw_metadata.get("rcsb_binding_affinity", [])
            if binding_data:
                processed["binding_data"] = binding_data
                
        except Exception as e:
            logger.error(f"Error processing metadata for {pdb_id}: {e}")
        
        return processed

    def get_metadata(self, pdb_id: str) -> Dict:
        """
        Fetch metadata for a PDB entry.

        Args:
            pdb_id: The 4-character PDB ID

        Returns:
            Dictionary containing metadata
        """
        try:
            url = f"{self.BASE_URL}/entry/{pdb_id}"
            response = requests.get(url)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching metadata for {pdb_id}: {e}")
            return {}

    @staticmethod
    def create_query_for_protein_ligand_complexes(
        resolution_cutoff: float = 2.5, has_ligands: bool = True
    ) -> Dict:
        """
        Create a search query for protein-ligand complexes.

        Args:
            resolution_cutoff: Maximum resolution in Angstroms
            has_ligands: Whether to require the presence of ligands

        Returns:
            Query dictionary for the RCSB Search API
        """
        query = {
            "query": {
                "type": "group",
                "logical_operator": "and",
                "nodes": [
                    {
                        "type": "terminal",
                        "service": "text",
                        "parameters": {
                            "attribute": "entity_poly.rcsb_entity_polymer_type",
                            "operator": "exact_match",
                            "value": "Protein",
                        },
                    },
                    {
                        "type": "terminal",
                        "service": "text",
                        "parameters": {
                            "attribute": "rcsb_entry_info.resolution_combined",
                            "operator": "less_or_equal",
                            "value": resolution_cutoff,
                        },
                    },
                ],
            },
            "return_type": "entry",
            "request_options": {
                "paginate": {"start": 0, "rows": 1000},
                "scoring_strategy": "combined",
                "sort": [
                    {
                        "sort_by": "rcsb_entry_info.resolution_combined",
                        "direction": "asc",
                    }
                ],
            },
        }

        if has_ligands:
            query["query"]["nodes"].append(
                {
                    "type": "terminal",
                    "service": "text",
                    "parameters": {
                        "attribute": "rcsb_binding_affinity.value",
                        "operator": "exists",
                    },
                }
            )

        return query
