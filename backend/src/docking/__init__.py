import json
import os
import subprocess
import tempfile
from pathlib import Path
from typing import Dict, List, Optional, Union

import pandas as pd
from loguru import logger


class DockingManager:
    """
    Manages molecular docking simulations and results.
    """

    def __init__(self, output_dir: str = "data/docking"):
        """
        Initialize the docking manager.

        Args:
            output_dir: Directory to store docking results
        """
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"Docking Manager initialized. Output directory: {self.output_dir}")

    def prepare_receptor(
        self,
        protein_file: Union[str, Path],
        output_dir: Optional[Union[str, Path]] = None,
    ) -> Path:
        """
        Prepare a protein structure for docking.

        Args:
            protein_file: Path to protein PDB file
            output_dir: Directory to save prepared files

        Returns:
            Path to prepared receptor file
        """
        protein_file = Path(protein_file)
        if output_dir is None:
            output_dir = self.output_dir / "receptors"
            output_dir.mkdir(exist_ok=True)

        output_file = Path(output_dir) / f"{protein_file.stem}_prepared.pdbqt"

        try:
            # Using MGLTools' prepare_receptor script (common with AutoDock)
            cmd = [
                "prepare_receptor4.py",
                "-r",
                str(protein_file),
                "-o",
                str(output_file),
                "-A",
                "hydrogens",  # Add hydrogens
            ]

            # Execute the command
            subprocess.run(cmd, check=True, capture_output=True)
            logger.info(f"Prepared receptor: {output_file}")
            return output_file

        except subprocess.CalledProcessError as e:
            logger.error(f"Error preparing receptor: {e.stderr.decode()}")
            return None
        except Exception as e:
            logger.error(f"Error in prepare_receptor: {e}")
            return None

    def prepare_ligand(
        self,
        ligand_file: Union[str, Path],
        output_dir: Optional[Union[str, Path]] = None,
    ) -> Path:
        """
        Prepare a ligand for docking.

        Args:
            ligand_file: Path to ligand file (mol2, sdf, etc.)
            output_dir: Directory to save prepared files

        Returns:
            Path to prepared ligand file
        """
        ligand_file = Path(ligand_file)
        if output_dir is None:
            output_dir = self.output_dir / "ligands"
            output_dir.mkdir(exist_ok=True)

        output_file = Path(output_dir) / f"{ligand_file.stem}_prepared.pdbqt"

        try:
            # Using MGLTools' prepare_ligand script
            cmd = [
                "prepare_ligand4.py",
                "-l",
                str(ligand_file),
                "-o",
                str(output_file),
                "-A",
                "hydrogens",
            ]

            # Execute the command
            subprocess.run(cmd, check=True, capture_output=True)
            logger.info(f"Prepared ligand: {output_file}")
            return output_file

        except subprocess.CalledProcessError as e:
            logger.error(f"Error preparing ligand: {e.stderr.decode()}")
            return None
        except Exception as e:
            logger.error(f"Error in prepare_ligand: {e}")
            return None

    def run_autodock_vina(
        self,
        receptor_file: Union[str, Path],
        ligand_file: Union[str, Path],
        center: List[float],
        box_size: List[float] = [20, 20, 20],
        num_modes: int = 9,
        exhaustiveness: int = 8,
    ) -> Dict:
        """
        Run AutoDock Vina docking.

        Args:
            receptor_file: Path to prepared receptor file
            ligand_file: Path to prepared ligand file
            center: Center coordinates [x, y, z]
            box_size: Box dimensions [x, y, z]
            num_modes: Number of binding modes to generate
            exhaustiveness: Exhaustiveness of search

        Returns:
            Dictionary with docking results
        """
        receptor_file = Path(receptor_file)
        ligand_file = Path(ligand_file)

        # Create output directory
        job_dir = self.output_dir / f"{receptor_file.stem}_{ligand_file.stem}"
        job_dir.mkdir(exist_ok=True)

        # Output files
        output_pdbqt = job_dir / "docked.pdbqt"
        log_file = job_dir / "vina.log"

        try:
            # Create config file
            config_file = job_dir / "vina_config.txt"
            with open(config_file, "w") as f:
                f.write(f"receptor = {receptor_file}\n")
                f.write(f"ligand = {ligand_file}\n")
                f.write(f"center_x = {center[0]}\n")
                f.write(f"center_y = {center[1]}\n")
                f.write(f"center_z = {center[2]}\n")
                f.write(f"size_x = {box_size[0]}\n")
                f.write(f"size_y = {box_size[1]}\n")
                f.write(f"size_z = {box_size[2]}\n")
                f.write(f"out = {output_pdbqt}\n")
                f.write(f"log = {log_file}\n")
                f.write(f"num_modes = {num_modes}\n")
                f.write(f"exhaustiveness = {exhaustiveness}\n")

            # Run Vina
            cmd = ["vina", "--config", str(config_file)]
            result = subprocess.run(cmd, check=True, capture_output=True, text=True)

            # Parse results
            binding_affinities = []
            for line in result.stdout.split("\n"):
                if "Affinity" in line:
                    parts = line.split()
                    try:
                        mode = int(parts[0])
                        affinity = float(parts[1])
                        binding_affinities.append({"mode": mode, "affinity": affinity})
                    except (ValueError, IndexError):
                        pass

            # Store results
            results = {
                "receptor": str(receptor_file.stem),
                "ligand": str(ligand_file.stem),
                "output_file": str(output_pdbqt),
                "log_file": str(log_file),
                "binding_modes": binding_affinities,
                "best_affinity": min([mode["affinity"] for mode in binding_affinities])
                if binding_affinities
                else None,
            }

            # Save results as JSON
            results_file = job_dir / "results.json"
            with open(results_file, "w") as f:
                json.dump(results, f, indent=2)

            logger.info(f"Docking completed: {receptor_file.stem} - {ligand_file.stem}")
            return results

        except subprocess.CalledProcessError as e:
            logger.error(f"Error in AutoDock Vina: {e.stderr}")
            return {"error": e.stderr}
        except Exception as e:
            logger.error(f"Error in run_autodock_vina: {e}")
            return {"error": str(e)}

    def extract_ligand_from_pdb(
        self, pdb_file: Union[str, Path], ligand_info: Dict
    ) -> Path:
        """
        Extract a ligand from a PDB file.

        Args:
            pdb_file: Path to PDB file
            ligand_info: Dictionary with ligand information

        Returns:
            Path to extracted ligand file
        """
        pdb_file = Path(pdb_file)
        ligand_dir = self.output_dir / "extracted_ligands"
        ligand_dir.mkdir(exist_ok=True)

        # Get ligand identifier
        residue_name = ligand_info["residue_name"]
        chain_id = ligand_info["chain_id"]
        lig_id = ligand_info["ligand_id"]
        if isinstance(lig_id, tuple):
            # Unpack tuple if needed
            lig_id = lig_id[1]

        output_file = ligand_dir / f"{pdb_file.stem}_{residue_name}_{lig_id}.mol2"

        try:
            # Using OpenBabel to extract and convert ligand
            with tempfile.NamedTemporaryFile(suffix=".pdb") as temp_file:
                # Extract the ligand to a temporary PDB
                cmd = [
                    "pdb_selchain",  # Using pdb-tools
                    "-" + chain_id,
                    str(pdb_file),
                    "|",
                    "pdb_selres",
                    "-" + str(lig_id),
                    ">",
                    temp_file.name,
                ]

                os.system(" ".join(cmd))  # Use os.system for pipe redirection

                # Convert to mol2 using OpenBabel
                obabel_cmd = [
                    "obabel",
                    temp_file.name,
                    "-O",
                    str(output_file),
                    "-h",  # Add hydrogens
                ]

                subprocess.run(obabel_cmd, check=True, capture_output=True)

            logger.info(f"Extracted ligand to {output_file}")
            return output_file

        except subprocess.CalledProcessError as e:
            logger.error(f"Error extracting ligand: {e.stderr}")
            return None
        except Exception as e:
            logger.error(f"Error in extract_ligand_from_pdb: {e}")
            return None

    def run_redocking_validation(self, pdb_id: str, ligand_info: Dict) -> Dict:
        """
        Run a re-docking validation experiment.

        Args:
            pdb_id: PDB ID of the structure
            ligand_info: Dictionary with ligand information

        Returns:
            Dictionary with validation results
        """
        # Paths
        pdb_file = Path(f"data/raw/{pdb_id}.pdb")

        if not pdb_file.exists():
            logger.error(f"PDB file not found: {pdb_file}")
            return {"error": "PDB file not found"}

        try:
            # 1. Extract ligand
            ligand_file = self.extract_ligand_from_pdb(pdb_file, ligand_info)
            if not ligand_file:
                return {"error": "Failed to extract ligand"}

            # 2. Prepare receptor (protein)
            receptor_file = self.prepare_receptor(pdb_file)
            if not receptor_file:
                return {"error": "Failed to prepare receptor"}

            # 3. Prepare ligand
            prepared_ligand = self.prepare_ligand(ligand_file)
            if not prepared_ligand:
                return {"error": "Failed to prepare ligand"}

            # 4. Run docking
            # Use ligand center for docking center
            center = ligand_info["center"]

            docking_results = self.run_autodock_vina(
                receptor_file,
                prepared_ligand,
                center,
                box_size=[20, 20, 20],  # Default box size
            )

            # 5. Calculate RMSD for validation
            rmsd = self.calculate_pose_rmsd(ligand_file, docking_results["output_file"])
            docking_results["rmsd"] = rmsd

            return docking_results

        except Exception as e:
            logger.error(f"Error in redocking validation: {e}")
            return {"error": str(e)}

    def calculate_pose_rmsd(
        self, reference_file: Union[str, Path], docked_file: Union[str, Path]
    ) -> float:
        """
        Calculate RMSD between reference and docked poses.

        Args:
            reference_file: Path to reference ligand file
            docked_file: Path to docked ligand file

        Returns:
            RMSD value
        """
        try:
            # Using OpenBabel for RMSD calculation
            cmd = ["obabel", str(reference_file), str(docked_file), "-ormsvalue"]

            result = subprocess.run(cmd, check=True, capture_output=True, text=True)

            # Parse RMSD from output
            for line in result.stdout.split("\n"):
                if "RMSD" in line:
                    return float(line.split()[1])

            return None

        except subprocess.CalledProcessError as e:
            logger.error(f"Error calculating RMSD: {e.stderr}")
            return None
        except Exception as e:
            logger.error(f"Error in calculate_pose_rmsd: {e}")
            return None

    def batch_redocking(
        self, pdb_ids: List[str], structures_df: pd.DataFrame
    ) -> pd.DataFrame:
        """
        Run batch redocking for multiple structures.

        Args:
            pdb_ids: List of PDB IDs to process
            structures_df: DataFrame with structure data

        Returns:
            DataFrame with docking results
        """
        results = []

        for pdb_id in pdb_ids:
            # Get structure row
            structure_row = structures_df[structures_df["pdb_id"] == pdb_id]
            if structure_row.empty:
                logger.error(f"Structure {pdb_id} not found in data")
                continue

            # Get ligand information
            ligands = (
                eval(structure_row.iloc[0]["ligands"])
                if isinstance(structure_row.iloc[0]["ligands"], str)
                else structure_row.iloc[0]["ligands"]
            )

            # Run redocking for each ligand
            for ligand in ligands:
                try:
                    redocking_result = self.run_redocking_validation(pdb_id, ligand)

                    # Add structure and ligand info to result
                    result_entry = {
                        "pdb_id": pdb_id,
                        "ligand_name": ligand["residue_name"],
                        "chain_id": ligand["chain_id"],
                        **redocking_result,
                    }

                    results.append(result_entry)

                except Exception as e:
                    logger.error(
                        f"Error in batch_redocking for {pdb_id}, ligand {ligand['residue_name']}: {e}"
                    )

        # Create DataFrame
        results_df = pd.DataFrame(results)

        # Save results
        if not results_df.empty:
            output_file = self.output_dir / "redocking_results.csv"
            results_df.to_csv(output_file, index=False)
            logger.info(f"Saved redocking results to {output_file}")

        return results_df
