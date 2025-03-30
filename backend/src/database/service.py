import ast
import json
from pathlib import Path
from typing import Dict, List

import pandas as pd
from loguru import logger
from sqlalchemy import create_engine, func
from sqlalchemy.orm import sessionmaker

from .models import (
    Base,
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
        db_dir = Path("/home/piyushjha/mystuff/NeuraViva2/data-management/backend/data")
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

                    if "experimental_conditions" in row and pd.notna(
                        row["experimental_conditions"]
                    ):
                        method = json.loads(
                            row["experimental_conditions"].replace("'", '"')
                        )
                        exp_quality["structure_method"] = method.get("method", "")
                        exp_quality["resolution"] = method.get("resolution", None)
                        exp_quality["temperature"] = method.get("temperature", None)
                        logger.debug(
                            f"Parsed experimental conditions for {pdb_id}: {exp_quality}"
                        )

                    # Create protein object
                    protein = Protein(
                        pdb_id=pdb_id,
                        title=row.get("title", ""),
                        description=f"Enhanced structure {pdb_id} from categorization pipeline",
                        quality=exp_quality.get("quality_level", ""),
                        temperature=exp_quality.get("temperature"),
                        resolution=exp_quality.get("resolution"),
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
                            # First try standard JSON parsing
                            try:
                                binding_metrics = json.loads(
                                    row["binding_metrics"].replace("'", '"')
                                )
                            except json.JSONDecodeError:
                                # If that fails, try with additional replacements for special characters
                                binding_metrics = json.loads(
                                    row["binding_metrics"]
                                    .replace("'", '"')
                                    .replace("&Delta;", "Delta_")
                                    .replace("-T&Delta;S", "neg_TDelta_S")
                                )
                        else:
                            binding_metrics = row["binding_metrics"]

                        logger.debug(
                            f"Parsed binding metrics for {pdb_id}: {binding_metrics}"
                        )
                    except (json.JSONDecodeError, TypeError, ValueError) as e:
                        logger.warning(
                            f"Could not parse binding metrics for {pdb_id}: {e}"
                        )
                        binding_metrics = {}

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

                            # Get binding site data if available
                            binding_site_data = {}
                            if "binding_site" in ligand and ligand["binding_site"]:
                                try:
                                    binding_site_data = ligand["binding_site"]
                                    if isinstance(binding_site_data, str):
                                        binding_site_data = json.loads(
                                            binding_site_data.replace("'", '"')
                                        )
                                except (
                                    KeyError,
                                    json.JSONDecodeError,
                                    TypeError,
                                    ValueError,
                                ) as e:
                                    logger.warning(
                                        f"Could not parse binding site data for {pdb_id}: {e}"
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
                                # Add binding site information
                                binding_site_data=binding_site_data,
                            )

                            # Add binding metrics if available for this ligand
                            if binding_metrics:
                                ligand_id = ligand.get("ligand_id", "")
                                chain_id = ligand.get("chain_id", "")
                                residue_name = ligand.get("residue_name", "")

                                # Try different keys that might identify the ligand in binding metrics
                                binding_keys = [
                                    f"{chain_id}_{ligand_id}",  # Original format
                                    residue_name,  # Just the residue name
                                    f"{chain_id}:{residue_name}",  # Chain:residue format
                                ]

                                binding_data = None
                                # Try to find the ligand in binding metrics using different possible keys
                                for key in binding_keys:
                                    if key in binding_metrics:
                                        binding_data = binding_metrics[key]
                                        break
                                    elif (
                                        "ligand_binding" in binding_metrics
                                        and key in binding_metrics["ligand_binding"]
                                    ):
                                        binding_data = binding_metrics[
                                            "ligand_binding"
                                        ][key]
                                        break

                                if binding_data:
                                    # Store binding data as JSON in the database
                                    new_ligand.binding_metrics = binding_data

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

    def get_all_proteins(self, limit=None, offset=0):
        """Get all proteins from the database without pagination."""
        session = self.get_session()
        try:
            query = session.query(Protein).order_by(Protein.pdb_id)
            # Apply limit only if specified
            if limit:
                query = query.limit(limit).offset(offset)
            proteins = query.all()
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

    def get_proteins_by_category(self, category_name, limit=None, offset=0):
        """Get all proteins by category name without pagination."""
        session = self.get_session()
        try:
            query = (
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
            )

            # Apply limit only if specified
            if limit:
                query = query.limit(limit).offset(offset)

            proteins = query.all()
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
