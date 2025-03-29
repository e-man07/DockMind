from pydantic import BaseModel, validator
from typing import List, Dict, Optional, Any
from datetime import datetime

# Base models
class CategoryBase(BaseModel):
    """Base model for protein categories/families"""
    id: int
    name: str
    description: Optional[str] = None
    
    class Config:
        from_attributes = True  # For SQLAlchemy compatibility

class LigandBase(BaseModel):
    """Base model for ligand data"""
    id: int
    residue_name: str
    chain_id: str
    residue_id: str
    num_atoms: int
    center_x: float
    center_y: float
    center_z: float
    smiles: Optional[str] = None
    inchi: Optional[str] = None
    molecular_weight: Optional[float] = None
    logp: Optional[float] = None
    h_donors: Optional[int] = None
    h_acceptors: Optional[int] = None
    rotatable_bonds: Optional[int] = None
    tpsa: Optional[float] = None
    qed: Optional[float] = None
    binding_site_data: Optional[Dict[str, Any]] = None
    
    class Config:
        from_attributes = True

class ProteinBase(BaseModel):
    """Base model for protein structure data"""
    id: int
    pdb_id: str
    title: Optional[str] = None
    description: Optional[str] = None
    resolution: Optional[float] = None
    deposition_date: Optional[datetime] = None
    experiment_type: Optional[str] = None
    num_chains: Optional[int] = None
    chain_data: Optional[Dict[str, Any]] = None
    status: str = "processed"
    
    class Config:
        from_attributes = True

class DockingResultBase(BaseModel):
    """Base model for docking results"""
    id: int
    protein_id: int
    ligand_id: int
    docking_score: float
    rmsd: Optional[float] = None
    binding_energy: Optional[float] = None
    poses_count: Optional[int] = None
    docking_program: str
    docking_parameters: Optional[Dict[str, Any]] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

# Response models
class CategoryResponse(CategoryBase):
    """Response model for protein categories"""
    protein_count: Optional[int] = None

class LigandResponse(BaseModel):
    """Response model for ligand data"""
    ligand: LigandBase
    binding_metrics: Optional[Dict[str, Any]] = None

class ProteinDetailedResponse(ProteinBase):
    """Detailed protein response including categories"""
    categories: List[CategoryBase] = []

class ProteinResponse(BaseModel):
    """Response model for protein data with its ligands"""
    protein: ProteinDetailedResponse
    ligands: List[LigandBase] = []

class ProteinListResponse(BaseModel):
    """Response model for a list of proteins"""
    total: int
    offset: int
    limit: int
    proteins: List[ProteinBase]

class DockingResultResponse(DockingResultBase):
    """Response model for docking results"""
    protein_pdb_id: str
    ligand_name: str
    visualization_url: Optional[str] = None

class DataProcessingResponse(BaseModel):
    """Response model for data processing operations"""
    message: str
    status: str
    file_count: Optional[int] = None
    error: Optional[str] = None

class BlockchainVerificationResponse(BaseModel):
    """Response model for blockchain verification"""
    verified: bool
    data_type: str
    data_id: int
    blockchain_tx: Optional[str] = None
    timestamp: str
    error: Optional[str] = None

class ProteinWithLigandsResponse(BaseModel):
    """Response model for a protein with its associated ligands"""
    protein: Dict[str, Any]
    ligands: List[Dict[str, Any]]

# Request models
class UploadPDBRequest(BaseModel):
    """Request model for PDB file uploads"""
    process_immediately: bool = True
    collect_metadata: bool = True

class CategoryUpdateRequest(BaseModel):
    """Request model for updating protein categories"""
    category_names: List[str]

class DockingSubmitRequest(BaseModel):
    """Request model for submitting a docking job"""
    protein_id: str
    ligand_smiles: str
    center_x: float
    center_y: float
    center_z: float
    box_size: float = 20.0
    exhaustiveness: int = 8
    docking_program: str = "vina"
    
    @validator('box_size')
    def box_size_must_be_positive(cls, v):
        if v <= 0:
            raise ValueError('Box size must be positive')
        return v
