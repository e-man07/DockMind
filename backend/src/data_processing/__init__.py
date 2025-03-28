from pathlib import Path
from typing import Dict, List, Optional, Union

import pandas as pd
from Bio.PDB import MMCIFParser, PDBParser, Select
from Bio.PDB.Structure import Structure
from loguru import logger


class PDBProcessor:
    """
    Process PDB files to extract relevant information and prepare structures for docking.
    """

    def __init__(self, processed_dir: str = "data/processed"):
        """
        Initialize the PDB processor.

        Args:
            processed_dir: Directory to store processed data
        """
        self.processed_dir = Path(processed_dir)
        self.processed_dir.mkdir(parents=True, exist_ok=True)
        self.pdb_parser = PDBParser(QUIET=True)
        self.mmcif_parser = MMCIFParser(QUIET=True)
        logger.info(
            f"PDB Processor initialized. Output directory: {self.processed_dir}"
        )

    def parse_structure(self, file_path: Union[str, Path]) -> Optional[Structure]:
        """
        Parse a PDB or mmCIF file into a Biopython Structure object.

        Args:
            file_path: Path to the PDB or mmCIF file

        Returns:
            Biopython Structure object or None if parsing failed
        """
        file_path = Path(file_path)
        pdb_id = file_path.stem

        try:
            if file_path.suffix == ".cif":
                structure = self.mmcif_parser.get_structure(pdb_id, file_path)
            else:
                structure = self.pdb_parser.get_structure(pdb_id, file_path)
            return structure
        except Exception as e:
            logger.error(f"Error parsing structure {file_path}: {e}")
            return None

    def extract_ligands(self, structure: Structure) -> List[Dict]:
        """
        Extract ligand information from a structure.

        Args:
            structure: Biopython Structure object

        Returns:
            List of dictionaries containing ligand information
        """
        ligands = []

        for model in structure:
            for chain in model:
                for residue in chain:
                    # Check if residue is a hetero residue (ligand)
                    if residue.id[0] and residue.id[0] != " ":
                        # Skip water molecules
                        if residue.get_resname() == "HOH":
                            continue

                        # Get ligand coordinates
                        coords = [atom.get_coord() for atom in residue]
                        center = sum(coords) / len(coords) if coords else None

                        ligand_info = {
                            "ligand_id": residue.id,
                            "residue_name": residue.get_resname(),
                            "chain_id": chain.id,
                            "num_atoms": len(residue),
                            "center": center.tolist() if center is not None else None,
                        }
                        ligands.append(ligand_info)

        return ligands

    def extract_protein_chains(self, structure: Structure) -> List[Dict]:
        """
        Extract information about protein chains from a structure.

        Args:
            structure: Biopython Structure object

        Returns:
            List of dictionaries containing chain information
        """
        chains = []

        for model in structure:
            for chain in model:
                # Count residues and check if it's a protein chain
                residues = [r for r in chain if r.id[0] == " "]
                if not residues:
                    continue

                chain_info = {
                    "chain_id": chain.id,
                    "length": len(residues),
                    "residue_range": f"{residues[0].id[1]}-{residues[-1].id[1]}",
                }
                chains.append(chain_info)

        return chains

    def process_pdb_file(self, file_path: Union[str, Path]) -> Dict:
        """
        Process a PDB file to extract key information.

        Args:
            file_path: Path to the PDB file

        Returns:
            Dictionary with extracted information
        """
        file_path = Path(file_path)
        pdb_id = file_path.stem

        # Parse structure
        structure = self.parse_structure(file_path)
        if not structure:
            return {"pdb_id": pdb_id, "status": "failed"}

        # Extract information
        ligands = self.extract_ligands(structure)
        chains = self.extract_protein_chains(structure)

        # Compile results
        result = {
            "pdb_id": pdb_id,
            "status": "processed",
            "num_models": len(structure),
            "num_chains": len(chains),
            "chains": chains,
            "num_ligands": len(ligands),
            "ligands": ligands,
        }

        return result

    def batch_process(self, file_paths: List[Union[str, Path]]) -> pd.DataFrame:
        """
        Process multiple PDB files and compile results into a DataFrame.

        Args:
            file_paths: List of paths to PDB files

        Returns:
            DataFrame with processed information
        """
        results = []

        for file_path in file_paths:
            logger.info(f"Processing {file_path}")
            result = self.process_pdb_file(file_path)
            results.append(result)

        # Convert to DataFrame and save
        df = pd.DataFrame(results)
        output_file = self.processed_dir / "processed_structures.csv"
        df.to_csv(output_file, index=False)
        logger.info(f"Saved processed data to {output_file}")

        return df


class LigandExtractor(Select):
    """
    A Bio.PDB Select class for extracting ligands from PDB structures.
    """

    def __init__(self, ligand_resname):
        """
        Initialize with the residue name of the ligand to extract.

        Args:
            ligand_resname: Three-letter residue name of the ligand
        """
        self.ligand_resname = ligand_resname

    def accept_residue(self, residue):
        """
        Accept only residues that match the ligand resname.
        """
        return residue.get_resname() == self.ligand_resname

    def accept_chain(self, chain):
        """
        Accept all chains that contain the ligand.
        """
        return True

    def accept_model(self, model):
        """
        Accept all models.
        """
        return True
