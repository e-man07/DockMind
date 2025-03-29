from sqlalchemy import (
    JSON,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Table,
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

Base = declarative_base()

# Association tables for many-to-many relationships
protein_category_association = Table(
    "protein_category_association",
    Base.metadata,
    Column("protein_id", Integer, ForeignKey("proteins.id")),
    Column("category_id", Integer, ForeignKey("protein_categories.id")),
)


class Protein(Base):
    """Protein structure data"""

    __tablename__ = "proteins"

    id = Column(Integer, primary_key=True)
    status = Column(String)  # 'processed', 'failed', 'pending'
    pdb_id = Column(String, unique=True, index=True)
    title = Column(String)
    description = Column(String)
    resolution = Column(Float)
    deposition_date = Column(DateTime)
    experiment_type = Column(String)
    num_chains = Column(Integer)
    chain_data = Column(JSON)  # Chain IDs, lengths, etc.

    # Relationships
    ligands = relationship("Ligand", back_populates="protein")
    categories = relationship("ProteinCategory", secondary=protein_category_association)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())


class Ligand(Base):
    """Ligand data"""

    __tablename__ = "ligands"

    id = Column(Integer, primary_key=True)
    protein_id = Column(Integer, ForeignKey("proteins.id"))
    residue_name = Column(String)
    chain_id = Column(String)
    residue_id = Column(String)
    num_atoms = Column(Integer)
    center_x = Column(Float)
    center_y = Column(Float)
    center_z = Column(Float)
    smiles = Column(String)
    inchi = Column(String)

    # Chemical properties
    molecular_weight = Column(Float)
    logp = Column(Float)
    h_donors = Column(Integer)
    h_acceptors = Column(Integer)
    rotatable_bonds = Column(Integer)
    tpsa = Column(Float)
    qed = Column(Float)  # Drug-likeness score

    # Binding site properties
    binding_site_data = Column(JSON)

    # Relationships
    protein = relationship("Protein", back_populates="ligands")

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())


class ProteinCategory(Base):
    """Protein classification categories"""

    __tablename__ = "protein_categories"

    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True)
    description = Column(String)

    created_at = Column(DateTime, server_default=func.now())


class DataIntegrityRecord(Base):
    """Blockchain data integrity records"""

    __tablename__ = "data_integrity_records"

    id = Column(Integer, primary_key=True)
    data_type = Column(String)  # 'protein', 'ligand', 'docking_result', etc.
    data_id = Column(Integer)  # ID of the referenced data
    hash_value = Column(String)  # Content hash
    blockchain_tx = Column(String)  # Transaction ID on Solana
    blockchain_status = Column(String)  # 'pending', 'confirmed', 'failed'
    meta_info = Column(JSON)  # Additional metadata

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
