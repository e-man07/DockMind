from datetime import datetime
from typing import Dict, List, Optional

from api.dependencies import get_db_service
from api.models import (
    CategoryResponse,
    LigandResponse,
    ProteinListResponse,
    ProteinResponse,
    ProteinWithLigandsResponse,
)
from database.service import DatabaseService
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from ipfs.pinata_post import upload_json_to_ipfs  # Add this import at the top
from loguru import logger
from pydantic import BaseModel  # Add this import for the new response model


# Update the response model for this endpoint
class IPFSHashResponse(BaseModel):
    hash: str
    protein_id: str


# Initialize FastAPI app
app = FastAPI(
    title="Molecular Docking Data Management API",
    description="API for managing protein structures, ligands, and docking results with blockchain verification",
    version="1.0.0",
)

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def serialize_datetime(obj):
    """Helper function to serialize datetime objects"""
    if isinstance(obj, datetime):
        return obj.isoformat()
    return obj


# Protein management endpoints
@app.get("/proteins/", response_model=ProteinListResponse)
async def get_proteins(
    category: Optional[str] = None,
    db_service: DatabaseService = Depends(get_db_service),
):
    """
    Retrieve a list of all protein structures.

    - **category**: Optional filter by protein category/family
    """
    try:
        if category:
            proteins = db_service.get_proteins_by_category(category)
        else:
            proteins = db_service.get_all_proteins()

        # Transform chain_data from list to dictionary for all proteins
        for protein in proteins:
            # If chain_data is a list, convert it to a dictionary with chains as keys
            if isinstance(protein.chain_data, list):
                chain_dict = {}
                for chain in protein.chain_data:
                    chain_id = chain.get("chain_id")
                    if chain_id:
                        # Remove chain_id from the dict since it's now a key
                        chain_data = {k: v for k, v in chain.items() if k != "chain_id"}
                        chain_dict[chain_id] = chain_data
                protein.chain_data = chain_dict

        return {
            "total": len(proteins),
            "offset": 0,
            "limit": len(proteins),
            "proteins": proteins,
        }
    except Exception as e:
        logger.error(f"Error retrieving proteins: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.get("/proteins/{pdb_id}", response_model=ProteinResponse)
async def get_protein_by_id(
    pdb_id: str, db_service: DatabaseService = Depends(get_db_service)
):
    """
    Retrieve detailed information about a protein structure by PDB ID.

    - **pdb_id**: PDB identifier of the protein
    """
    session = db_service.get_session()
    try:
        # Use the session to get the protein with categories eagerly loaded
        from database.models import Protein
        from sqlalchemy.orm import joinedload

        protein = (
            session.query(Protein)
            .options(joinedload(Protein.categories))
            .filter(Protein.pdb_id == pdb_id)
            .first()
        )

        if not protein:
            raise HTTPException(
                status_code=404, detail=f"Protein with PDB ID {pdb_id} not found"
            )

        # Transform chain_data from list to dictionary
        if isinstance(protein.chain_data, list):
            chain_dict = {}
            for chain in protein.chain_data:
                chain_id = chain.get("chain_id")
                if chain_id:
                    # Remove chain_id from the dict since it's now a key
                    chain_data = {k: v for k, v in chain.items() if k != "chain_id"}
                    chain_dict[chain_id] = chain_data
            protein.chain_data = chain_dict

        # Get ligands for this protein
        ligands = db_service.get_ligands_by_protein_id(protein.id)

        # Create a copy of the protein data
        protein_data = {
            "id": protein.id,
            "pdb_id": protein.pdb_id,
            "title": protein.title,
            "quality": protein.quality,
            "temperature": protein.temperature,
            "description": protein.description,
            "experiment_type": protein.experiment_type,
            "chain_data": protein.chain_data,
            "resolution": protein.resolution,
            "categories": [
                {"id": c.id, "name": c.name, "description": c.description}
                for c in protein.categories
            ],
            "created_at": protein.created_at,
            "updated_at": protein.updated_at,
        }

        return {"protein": protein_data, "ligands": ligands}
    finally:
        session.close()


# Ligand management endpoints
@app.get("/ligands/{ligand_id}", response_model=LigandResponse)
async def get_ligand_by_id(
    ligand_id: int, db_service: DatabaseService = Depends(get_db_service)
):
    """
    Retrieve detailed information about a ligand by ID.

    - **ligand_id**: Database ID of the ligand
    """
    # Implement ligand retrieval from database
    session = db_service.get_session()
    try:
        from database.models import Ligand

        ligand = session.query(Ligand).filter(Ligand.id == ligand_id).first()
        print(ligand.binding_metrics)
        if not ligand:
            raise HTTPException(
                status_code=404, detail=f"Ligand with ID {ligand_id} not found"
            )

        return {"ligand": ligand}
    finally:
        session.close()


# Category management endpoints
@app.get("/categories/", response_model=List[CategoryResponse])
async def get_categories(db_service: DatabaseService = Depends(get_db_service)):
    """
    Retrieve all protein categories/families in the database.
    """
    session = db_service.get_session()
    try:
        from database.models import ProteinCategory

        categories = session.query(ProteinCategory).all()
        return categories
    finally:
        session.close()


# New endpoint to get all proteins with their ligands
@app.get("/proteins-with-ligands/", response_model=List[IPFSHashResponse])
async def get_all_proteins_with_ligands(
    db_service: DatabaseService = Depends(get_db_service),
):
    """
    Retrieve all proteins along with their corresponding ligands and store them in IPFS.
    Returns a list of IPFS hashes with their corresponding protein IDs.
    """
    session = db_service.get_session()
    try:
        import json

        from database.models import Protein
        from sqlalchemy.orm import joinedload

        proteins = session.query(Protein).options(joinedload(Protein.categories)).all()
        ipfs_results = []

        for protein in proteins:
            # Transform chain_data
            if isinstance(protein.chain_data, list):
                chain_dict = {}
                for chain in protein.chain_data:
                    chain_id = chain.get("chain_id")
                    if chain_id:
                        chain_data = {k: v for k, v in chain.items() if k != "chain_id"}
                        chain_dict[chain_id] = chain_data
                protein.chain_data = chain_dict

            # Get ligands for this protein
            ligands_objects = db_service.get_ligands_by_protein_id(protein.id)

            # Convert ligand objects to dictionaries
            ligands = []
            for ligand in ligands_objects:
                ligand_dict = {
                    "id": ligand.id,
                    "residue_name": ligand.residue_name,
                    "chain_id": ligand.chain_id,
                    "residue_id": ligand.residue_id,
                    "num_atoms": ligand.num_atoms,
                    "center_x": ligand.center_x,
                    "center_y": ligand.center_y,
                    "center_z": ligand.center_z,
                    "binding_site_data": ligand.binding_site_data,
                    "created_at": serialize_datetime(ligand.created_at),
                    "updated_at": serialize_datetime(ligand.updated_at),
                }
                ligands.append(ligand_dict)

            # Create protein data with categories
            protein_data = {
                "id": protein.id,
                "pdb_id": protein.pdb_id,
                "title": protein.title,
                "description": protein.description,
                "chain_data": protein.chain_data,
                "resolution": protein.resolution,
                "categories": [
                    {"id": c.id, "name": c.name, "description": c.description}
                    for c in protein.categories
                ],
                "created_at": serialize_datetime(protein.created_at),
                "updated_at": serialize_datetime(protein.updated_at),
            }

            # Prepare data for IPFS
            protein_with_ligands = {"protein": protein_data, "ligands": ligands}

            # Upload to IPFS and get hash
            ipfs_response = upload_json_to_ipfs(protein_with_ligands)

            # Extract just the hash string from the response
            if isinstance(ipfs_response, dict) and "hash" in ipfs_response:
                ipfs_hash = ipfs_response["hash"]
            elif hasattr(ipfs_response, "hash"):
                ipfs_hash = ipfs_response.hash
            else:
                ipfs_hash = str(ipfs_response)

            # Store the hash in the database (only the string)
            db_service.store_protein_ipfs_hash(protein.pdb_id, ipfs_hash)

            # Add to results - use pdb_id (not the primary key)
            ipfs_results.append({"hash": ipfs_hash, "protein_id": protein.pdb_id})

        return ipfs_results
    except Exception as e:
        logger.error(f"Error uploading to IPFS: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
    finally:
        session.close()


# Define a response model for the IPFS hash endpoint
class ProteinIPFSResponse(BaseModel):
    ipfs_hash: str
    created_at: Optional[datetime] = None


@app.get("/proteins/{pdb_id}/ipfs", response_model=ProteinIPFSResponse)
async def get_ipfs_hash_by_protein_id(
    pdb_id: str, db_service: DatabaseService = Depends(get_db_service)
):
    """
    Retrieve the IPFS hash for a specific protein by its PDB ID.

    - **pdb_id**: PDB identifier of the protein
    """
    try:
        ipfs_data = db_service.get_ipfs_hash_by_protein_id(pdb_id)
        if not ipfs_data:
            raise HTTPException(
                status_code=404,
                detail=f"IPFS hash for protein with PDB ID {pdb_id} not found",
            )

        return {
            "ipfs_hash": ipfs_data["hash"],
        }
    except Exception as e:
        logger.error(f"Error retrieving IPFS hash: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


# Statistics endpoints
@app.get("/stats")
async def get_database_stats(db_service: DatabaseService = Depends(get_db_service)):
    """
    Get database statistics including counts of proteins, ligands, and categories.
    """
    return db_service.get_database_stats()
