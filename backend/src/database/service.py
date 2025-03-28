import ast
import json
from pathlib import Path
from typing import Dict, List, Optional

import pandas as pd
from loguru import logger
from sqlalchemy import create_engine, func
from sqlalchemy.orm import sessionmaker

from .models import (
    Base,
    DataIntegrityRecord,
    DockingJob,
    DockingPose,
    Ligand,
    Protein,
    ProteinCategory,
    protein_category_association,
)


class DatabaseService:
    """
    Service for interacting with the application database.
    """

    def get_db_path():
        """Ensures the database directory exists and returns the full path"""
        db_dir = Path("/home/kshitij/dev/data-management/backend/data")
        db_dir.mkdir(parents=True, exist_ok=True)
        return str(db_dir / "docking_db.sqlite")

    # Then when creating your engine, use:
    engine = create_engine(
        f"sqlite:///{get_db_path()}", connect_args={"check_same_thread": False}
    )

    def __init__(self, db_url: str = "sqlite:///./data/docking_db.sqlite"):
        """
        Initialize the database service.

        Args:
            db_url: SQLAlchemy database URL
        """
        self.engine = self.engine  # Reference the class engine as instance attribute
        self.SessionLocal = sessionmaker(
            autocommit=False, autoflush=False, bind=self.engine
        )
        logger.info(f"Database service initialized with {db_url}")

    def create_tables(self):
        """Create all database tables if they don't exist."""
        Base.metadata.create_all(bind=self.engine)
        logger.info("Database tables created")

    def get_session(self):
        """Get a database session."""
        return self.SessionLocal()

    def import_enhanced_structures(self, csv_file_path: str):
        """
        Import enhanced structure data from CSV with specialized columns.

        Args:
            csv_file_path: Path to the enhanced structures CSV file with
                           columns for protein families, binding metrics, etc.

        Returns:
            bool: True if import was successful, False otherwise
        """

        if not Path(csv_file_path).exists():
            logger.error(f"CSV file not found: {csv_file_path}")
            return False

        # Read CSV file
        try:
            df = pd.read_csv(csv_file_path)
            logger.info(f"Loaded {len(df)} structures from {csv_file_path}")
        except Exception as e:
            logger.error(f"Error reading CSV file: {e}")
            return False

        session = self.get_session()
        try:
            # Track import stats
            imported_count = 0
            updated_count = 0

            # Process each row
            for _, row in df.iterrows():
                pdb_id = row["pdb_id"]

                # Check if protein already exists
                existing = (
                    session.query(Protein).filter(Protein.pdb_id == pdb_id).first()
                )
                if existing:
                    logger.debug(f"Protein {pdb_id} already exists, updating...")
                    protein = existing
                    updated_count += 1
                else:
                    # Create new protein entry with enhanced data
                    # Parse chains data safely
                    try:
                        chains_data = row["chains"]
                        if isinstance(chains_data, str):
                            chains_data = json.loads(chains_data.replace("'", '"'))
                    except (json.JSONDecodeError, TypeError, KeyError) as e:
                        chains_data = {}
                        logger.warning(f"Could not parse chains data for {pdb_id}: {e}")

                    # Parse experimental quality data safely
                    exp_quality = {}
                    if "experimental_quality" in row and pd.notna(
                        row["experimental_quality"]
                    ):
                        exp_quality = {"quality_level": row["experimental_quality"]}
                        logger.debug(
                            f"Parsed experimental quality for {pdb_id}: {exp_quality}"
                        )

                    # Create protein object
                    protein = Protein(
                        pdb_id=pdb_id,
                        title=f"Structure {pdb_id}",  # Default title
                        description=f"Enhanced structure {pdb_id} from categorization pipeline",
                        resolution=exp_quality.get("resolution")
                        if exp_quality
                        else None,
                        experiment_type=exp_quality.get("structure_method", ""),
                        num_chains=row.get("num_chains", 0),
                        chain_data=chains_data,
                        status=row.get("status", ""),
                    )
                    session.add(protein)
                    session.flush()  # Get protein ID
                    imported_count += 1

                # Add protein families/categories
                if "protein_families" in row and pd.notna(row["protein_families"]):
                    try:
                        # Handle different formats (string, list, etc.)
                        families = row["protein_families"]
                        if isinstance(families, str):
                            # Try to parse as JSON/list
                            try:
                                families = json.loads(families.replace("'", '"'))
                            except (json.JSONDecodeError, ValueError):
                                # If can't parse, treat as single string
                                families = [families]

                        # Convert to list if it's a single item
                        if not isinstance(families, list):
                            families = [families]

                        # Update protein categories
                        for family in families:
                            # Check if category exists
                            category = (
                                session.query(ProteinCategory)
                                .filter(ProteinCategory.name == family)
                                .first()
                            )
                            if not category:
                                category = ProteinCategory(
                                    name=family, description=f"Protein family: {family}"
                                )
                                session.add(category)
                                session.flush()

                            # Add category to protein if not already there
                            if category not in protein.categories:
                                protein.categories.append(category)
                    except Exception as e:
                        logger.warning(
                            f"Error processing protein families for {pdb_id}: {e}"
                        )

                # Process binding sites and metrics if available
                binding_metrics = {}
                if "binding_metrics" in row and pd.notna(row["binding_metrics"]):
                    try:
                        if isinstance(row["binding_metrics"], str):
                            binding_metrics = json.loads(
                                row["binding_metrics"].replace("'", '"')
                            )
                        else:
                            binding_metrics = row["binding_metrics"]
                    except (json.JSONDecodeError, TypeError, ValueError) as e:
                        logger.warning(
                            f"Could not parse binding metrics for {pdb_id}: {e}"
                        )

                # Process experimental conditions
                if "experimental_conditions" in row and pd.notna(
                    row["experimental_conditions"]
                ):
                    try:
                        if isinstance(row["experimental_conditions"], str):
                            exp_conditions = json.loads(
                                row["experimental_conditions"].replace("'", '"')
                            )
                        else:
                            exp_conditions = row["experimental_conditions"]

                        # Store experimental conditions as metadata on the protein
                        protein.exp_conditions = exp_conditions
                    except (json.JSONDecodeError, TypeError, ValueError) as e:
                        logger.warning(
                            f"Could not parse experimental conditions for {pdb_id}: {e}"
                        )

                # Process ligands
                if ("ligands" in row and pd.notna(row["ligands"])) or (
                    "enhanced_ligands" in row and pd.notna(row["enhanced_ligands"])
                ):
                    # Prefer enhanced ligands if available
                    ligand_data_field = (
                        "enhanced_ligands"
                        if "enhanced_ligands" in row
                        and pd.notna(row["enhanced_ligands"])
                        else "ligands"
                    )

                    try:
                        # Parse ligand data
                        ligands_data = row[ligand_data_field]
                        if isinstance(ligands_data, str):
                            # Try various parsing methods
                            try:
                                ligands_data = json.loads(
                                    ligands_data.replace("'", '"')
                                )
                            except (json.JSONDecodeError, TypeError):
                                try:
                                    ligands_data = ast.literal_eval(ligands_data)
                                except (ValueError, SyntaxError) as e:
                                    logger.warning(
                                        f"Could not parse ligands for {pdb_id}: {e}"
                                    )
                                    ligands_data = []

                        # Clear existing ligands if updating
                        if existing:
                            session.query(Ligand).filter(
                                Ligand.protein_id == protein.id
                            ).delete()

                        # Add new ligands
                        for ligand in ligands_data:
                            # Get center coordinates safely
                            center = [0, 0, 0]
                            if "center" in ligand:
                                try:
                                    center = ligand["center"]
                                    if isinstance(center, str):
                                        center = json.loads(center.replace("'", '"'))
                                except (
                                    KeyError,
                                    json.JSONDecodeError,
                                    TypeError,
                                    ValueError,
                                ) as e:
                                    logger.warning(
                                        f"Could not parse ligand center for {pdb_id}: {e}"
                                    )

                            # Create ligand with all enhanced properties
                            new_ligand = Ligand(
                                protein_id=protein.id,
                                residue_name=ligand.get("residue_name", ""),
                                chain_id=ligand.get("chain_id", ""),
                                residue_id=str(ligand.get("ligand_id", "")),
                                num_atoms=ligand.get("num_atoms", 0),
                                center_x=center[0] if len(center) > 0 else 0,
                                center_y=center[1] if len(center) > 1 else 0,
                                center_z=center[2] if len(center) > 2 else 0,
                                smiles=ligand.get("smiles", ""),
                                inchi=ligand.get("inchi", ""),
                                # Add enhanced chemical properties if available
                                molecular_weight=ligand.get("molecular_weight"),
                                logp=ligand.get("logp"),
                                h_donors=ligand.get("h_donors"),
                                h_acceptors=ligand.get("h_acceptors"),
                                rotatable_bonds=ligand.get("rotatable_bonds"),
                                tpsa=ligand.get("tpsa"),
                            )

                            # Add binding metrics if available for this ligand
                            if binding_metrics and "ligand_binding" in binding_metrics:
                                ligand_id = ligand.get("ligand_id", "")
                                chain_id = ligand.get("chain_id", "")
                                binding_key = f"{chain_id}_{ligand_id}"

                                if binding_key in binding_metrics["ligand_binding"]:
                                    ligand_binding = binding_metrics["ligand_binding"][
                                        binding_key
                                    ]
                                    # Store binding data as JSON in the database
                                    new_ligand.binding_data = ligand_binding

                            session.add(new_ligand)
                    except Exception as e:
                        logger.warning(f"Error processing ligands for {pdb_id}: {e}")

                # Commit every 10 proteins for performance
                if (imported_count + updated_count) % 10 == 0:
                    session.commit()
                    logger.debug("Committed batch of 10 proteins")

            # Final commit
            session.commit()
            logger.info(
                f"Database import complete: {imported_count} new proteins, {updated_count} updated"
            )
            return True

        except Exception as e:
            session.rollback()
            logger.error(f"Error during database import: {e}")
            return False
        finally:
            session.close()

    def get_all_proteins(self, limit=100, offset=0):
        """Get all proteins from the database with pagination."""
        session = self.get_session()
        try:
            proteins = (
                session.query(Protein)
                .order_by(Protein.pdb_id)
                .limit(limit)
                .offset(offset)
                .all()
            )
            return proteins
        finally:
            session.close()

    def get_protein_by_pdb_id(self, pdb_id):
        """Get a protein by PDB ID."""
        session = self.get_session()
        try:
            protein = session.query(Protein).filter(Protein.pdb_id == pdb_id).first()
            return protein
        finally:
            session.close()

    def get_ligands_by_protein_id(self, protein_id):
        """Get all ligands for a protein."""
        session = self.get_session()
        try:
            ligands = (
                session.query(Ligand).filter(Ligand.protein_id == protein_id).all()
            )
            return ligands
        finally:
            session.close()

    def get_proteins_by_category(self, category_name, limit=100, offset=0):
        """Get proteins by category name."""
        session = self.get_session()
        try:
            proteins = (
                session.query(Protein)
                .join(
                    protein_category_association,
                    Protein.id == protein_category_association.c.protein_id,
                )
                .join(
                    ProteinCategory,
                    ProteinCategory.id == protein_category_association.c.category_id,
                )
                .filter(ProteinCategory.name == category_name)
                .order_by(Protein.pdb_id)
                .limit(limit)
                .offset(offset)
                .all()
            )

            return proteins
        finally:
            session.close()

    def get_database_stats(self):
        """Get basic database statistics."""
        session = self.get_session()
        try:
            stats = {
                "protein_count": session.query(func.count(Protein.id)).scalar(),
                "ligand_count": session.query(func.count(Ligand.id)).scalar(),
                "category_count": session.query(
                    func.count(ProteinCategory.id)
                ).scalar(),
                "docking_job_count": session.query(func.count(DockingJob.id)).scalar(),
                "docking_pose_count": session.query(
                    func.count(DockingPose.id)
                ).scalar(),
            }
            return stats
        finally:
            session.close()

    def update_ligand_properties(self, ligand_id: int, properties: Dict):
        """
        Update ligand properties in the database.

        Args:
            ligand_id: Database ID of the ligand
            properties: Dictionary of properties to update
        """
        session = self.get_session()
        try:
            ligand = session.query(Ligand).filter(Ligand.id == ligand_id).first()
            if not ligand:
                logger.error(f"Ligand with ID {ligand_id} not found")
                return

            # Update properties
            for key, value in properties.items():
                if hasattr(ligand, key):
                    setattr(ligand, key, value)

            session.commit()
            logger.debug(f"Updated properties for ligand {ligand_id}")

        except Exception as e:
            session.rollback()
            logger.error(f"Error updating ligand properties: {e}")
        finally:
            session.close()

    def update_protein_categories(self, protein_id: int, categories: List[str]):
        """
        Update protein categories in the database.

        Args:
            protein_id: Database ID of the protein
            categories: List of category names
        """
        session = self.get_session()
        try:
            protein = session.query(Protein).filter(Protein.id == protein_id).first()
            if not protein:
                logger.error(f"Protein with ID {protein_id} not found")
                return

            # Clear existing categories
            protein.categories = []

            # Add new categories
            for category_name in categories:
                # Get or create category
                category = (
                    session.query(ProteinCategory)
                    .filter(ProteinCategory.name == category_name)
                    .first()
                )

                if not category:
                    category = ProteinCategory(name=category_name)
                    session.add(category)
                    session.flush()

                protein.categories.append(category)

            session.commit()
            logger.debug(f"Updated categories for protein {protein_id}: {categories}")

        except Exception as e:
            session.rollback()
            logger.error(f"Error updating protein categories: {e}")
        finally:
            session.close()

    def create_docking_job(
        self, protein_id: int, job_name: str, software: str, parameters: Dict
    ) -> Optional[int]:
        """
        Create a new docking job.

        Args:
            protein_id: Database ID of the protein
            job_name: Name of the job
            software: Docking software name
            parameters: Docking parameters

        Returns:
            ID of the created job or None if failed
        """
        session = self.get_session()
        try:
            # Create job directory name using protein ID and job name
            job_dir = f"protein_{protein_id}_{job_name.replace(' ', '_').lower()}"

            job = DockingJob(
                protein_id=protein_id,
                job_name=job_name,
                docking_software=software,
                parameters=parameters,
                status="pending",
                job_directory=job_dir,
            )

            session.add(job)
            session.commit()
            logger.info(f"Created docking job {job.id}: {job_name}")

            return job.id

        except Exception as e:
            session.rollback()
            logger.error(f"Error creating docking job: {e}")
            return None
        finally:
            session.close()

    def update_docking_job_status(self, job_id: int, status: str, completed_at=None):
        """
        Update the status of a docking job.

        Args:
            job_id: Database ID of the job
            status: New status ('pending', 'running', 'completed', 'failed')
            completed_at: Completion timestamp
        """
        session = self.get_session()
        try:
            job = session.query(DockingJob).filter(DockingJob.id == job_id).first()
            if not job:
                logger.error(f"Docking job with ID {job_id} not found")
                return

            job.status = status
            if status == "running" and not job.started_at:
                job.started_at = func.now()
            if status in ["completed", "failed"] and completed_at:
                job.completed_at = completed_at

            session.commit()
            logger.debug(f"Updated docking job {job_id} status to {status}")

        except Exception as e:
            session.rollback()
            logger.error(f"Error updating docking job status: {e}")
        finally:
            session.close()

    def add_docking_pose(
        self, job_id: int, ligand_id: int, pose_data: Dict
    ) -> Optional[int]:
        """
        Add a docking pose to the database.

        Args:
            job_id: Database ID of the docking job
            ligand_id: Database ID of the ligand
            pose_data: Dictionary with pose data

        Returns:
            ID of the created pose or None if failed
        """
        session = self.get_session()
        try:
            pose = DockingPose(
                docking_job_id=job_id,
                ligand_id=ligand_id,
                pose_rank=pose_data.get("pose_rank", 1),
                score=pose_data.get("score", 0.0),
                rmsd_to_reference=pose_data.get("rmsd", None),
                pose_file_path=pose_data.get("pose_file_path", ""),
            )

            session.add(pose)
            session.commit()
            logger.debug(
                f"Added docking pose {pose.id} for job {job_id}, ligand {ligand_id}"
            )

            return pose.id

        except Exception as e:
            session.rollback()
            logger.error(f"Error adding docking pose: {e}")
            return None
        finally:
            session.close()

    def add_integrity_record(
        self, data_type: str, data_id: int, hash_value: str
    ) -> Optional[int]:
        """
        Add a data integrity record.

        Args:
            data_type: Type of data ('protein', 'ligand', 'docking_result', etc.)
            data_id: ID of the referenced data
            hash_value: Content hash

        Returns:
            ID of the created record or None if failed
        """
        session = self.get_session()
        try:
            record = DataIntegrityRecord(
                data_type=data_type,
                data_id=data_id,
                hash_value=hash_value,
                blockchain_status="pending",
            )

            session.add(record)
            session.commit()
            logger.debug(
                f"Added integrity record {record.id} for {data_type} {data_id}"
            )

            return record.id

        except Exception as e:
            session.rollback()
            logger.error(f"Error adding integrity record: {e}")
            return None
        finally:
            session.close()

    def update_integrity_record(self, record_id: int, tx_id: str, status: str):
        """
        Update a data integrity record with blockchain transaction info.

        Args:
            record_id: Database ID of the record
            tx_id: Blockchain transaction ID
            status: Transaction status
        """
        session = self.get_session()
        try:
            record = (
                session.query(DataIntegrityRecord)
                .filter(DataIntegrityRecord.id == record_id)
                .first()
            )

            if not record:
                logger.error(f"Integrity record with ID {record_id} not found")
                return

            record.blockchain_tx = tx_id
            record.blockchain_status = status

            session.commit()
            logger.debug(f"Updated integrity record {record_id} with TX {tx_id}")

        except Exception as e:
            session.rollback()
            logger.error(f"Error updating integrity record: {e}")
        finally:
            session.close()
