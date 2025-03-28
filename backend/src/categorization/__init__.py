from pathlib import Path
from typing import Dict, List

import pandas as pd
from Bio.PDB import PDBParser
from loguru import logger
from rdkit import Chem
from rdkit.Chem import QED, Descriptors, Lipinski


class StructureCategorizer:
    """
    Categorizes protein structures and ligands based on various properties.
    """

    def __init__(self, data_dir: str = "data/processed"):
        """
        Initialize the structure categorizer.

        Args:
            data_dir: Directory containing processed structure data
        """
        self.data_dir = Path(data_dir)
        self.pdb_parser = PDBParser(QUIET=True)
        self.structures_df = None
        logger.info(
            f"Structure Categorizer initialized. Data directory: {self.data_dir}"
        )

        # Load protein family/function classifications
        # This could be expanded with external data sources
        self.protein_families = {
            # Example classifications for common protein families
            "kinase": ["kinase", "phosphorylase", "phosphotransferase"],
            "protease": ["protease", "peptidase", "hydrolase"],
            "gpcr": ["receptor", "gpcr", "g-protein", "transmembrane"],
            "nuclear_receptor": ["nuclear", "hormone", "receptor"],
            "oxidoreductase": ["dehydrogenase", "reductase", "oxidase"],
        }

    def load_processed_data(self) -> pd.DataFrame:
        """
        Load previously processed structure data.

        Returns:
            DataFrame with processed structures
        """
        try:
            structures_file = self.data_dir / "processed_structures.csv"
            if not structures_file.exists():
                logger.error(f"Processed structures file not found: {structures_file}")
                return pd.DataFrame()

            self.structures_df = pd.read_csv(structures_file)
            logger.info(f"Loaded {len(self.structures_df)} processed structures")
            return self.structures_df

        except Exception as e:
            logger.error(f"Error loading processed structures: {e}")
            return pd.DataFrame()

    def categorize_by_protein_family(self, metadata_dict: Dict) -> List[str]:
        """
        Categorize a protein by family based on metadata.

        Args:
            metadata_dict: Dictionary containing protein metadata

        Returns:
            List of protein family categories
        """
        # Extract relevant fields from metadata
        protein_description = metadata_dict.get("title", "").lower()
        classification = metadata_dict.get("keywords", [])

        categories = []

        # Check for matches in protein families
        for family, keywords in self.protein_families.items():
            for keyword in keywords:
                if keyword in protein_description:
                    categories.append(family)
                    break

                if any(
                    keyword in item.lower() if isinstance(item, str) else False
                    for item in classification
                ):
                    categories.append(family)
                    break

        return list(set(categories))  # Remove duplicates

    def extract_binding_site_info(self, structure, ligand_data: Dict) -> Dict:
        """
        Extract binding site information for a ligand.

        Args:
            structure: BioPython Structure object
            ligand_data: Dictionary containing ligand information

        Returns:
            Dictionary with binding site properties
        """
        binding_site = {}

        try:
            # Extract ligand residue
            model = structure[0]
            chain_id = ligand_data["chain_id"]
            ligand_id = ligand_data["ligand_id"]

            chain = model[chain_id]
            ligand = chain[ligand_id]

            # Define binding site as residues within 5A of ligand
            binding_residues = []
            ligand_atoms = list(ligand.get_atoms())

            for chain in model:
                for residue in chain:
                    if residue.id[0] == " ":  # Only consider standard residues
                        for res_atom in residue.get_atoms():
                            for lig_atom in ligand_atoms:
                                if res_atom - lig_atom < 5.0:  # Distance in Angstroms
                                    binding_residues.append(
                                        {
                                            "chain_id": chain.id,
                                            "residue_id": residue.id[1],
                                            "residue_name": residue.get_resname(),
                                            "distance": res_atom - lig_atom,
                                        }
                                    )
                                    break

            # Calculate binding site properties
            binding_site = {
                "num_binding_residues": len(binding_residues),
                "binding_residues": binding_residues,
                "avg_distance": sum(r["distance"] for r in binding_residues)
                / len(binding_residues)
                if binding_residues
                else None,
                "pocket_polarity": self._calculate_pocket_polarity(binding_residues),
            }

        except Exception as e:
            logger.error(f"Error extracting binding site: {e}")

        return binding_site

    def _calculate_pocket_polarity(self, binding_residues: List[Dict]) -> float:
        """
        Calculate the polarity of a binding pocket.

        Args:
            binding_residues: List of binding site residues

        Returns:
            Polarity score (0-1)
        """
        if not binding_residues:
            return 0.0

        # Residue polarity classification
        polar_residues = [
            "ARG",
            "LYS",
            "ASP",
            "GLU",
            "GLN",
            "ASN",
            "HIS",
            "SER",
            "THR",
            "TYR",
        ]

        # Count polar residues
        polar_count = sum(
            1 for r in binding_residues if r["residue_name"] in polar_residues
        )

        # Return polarity ratio
        return polar_count / len(binding_residues)

    def calculate_ligand_properties(self, ligand_smiles: str) -> Dict:
        """
        Calculate chemical properties for a ligand.

        Args:
            ligand_smiles: SMILES string of the ligand

        Returns:
            Dictionary of calculated properties
        """
        try:
            mol = Chem.MolFromSmiles(ligand_smiles)
            if not mol:
                return {"error": "Invalid SMILES string"}

            properties = {
                "molecular_weight": Descriptors.MolWt(mol),
                "logp": Descriptors.MolLogP(mol),
                "h_donors": Lipinski.NumHDonors(mol),
                "h_acceptors": Lipinski.NumHAcceptors(mol),
                "rotatable_bonds": Descriptors.NumRotatableBonds(mol),
                "rings": Descriptors.RingCount(mol),
                "qed": QED.qed(mol),  # Drug-likeness score
                "tpsa": Descriptors.TPSA(mol),
                "lipinski_violations": sum(
                    1
                    for x in [
                        Descriptors.MolWt(mol) > 500,
                        Lipinski.NumHDonors(mol) > 5,
                        Lipinski.NumHAcceptors(mol) > 10,
                        Descriptors.MolLogP(mol) > 5,
                    ]
                    if x
                ),
                "is_druglike": QED.qed(mol) > 0.5
                and sum(
                    1
                    for x in [
                        Descriptors.MolWt(mol) > 500,
                        Lipinski.NumHDonors(mol) > 5,
                        Lipinski.NumHAcceptors(mol) > 10,
                        Descriptors.MolLogP(mol) > 5,
                    ]
                    if x
                )
                <= 1,
            }

            return properties

        except Exception as e:
            logger.error(f"Error calculating ligand properties: {e}")
            return {"error": str(e)}
        
    def categorize_by_experimental_quality(self, metadata: Dict) -> str:
        """
        Categorize structures by experimental quality metrics.
        
        Args:
            metadata: Dictionary containing structure metadata
            
        Returns:
            Quality category as string
        """
        resolution = metadata.get("resolution")
        r_free = metadata.get("r_free")
        
        if resolution and r_free:
            if resolution < 1.5 and r_free < 0.2:
                return "high_quality"
            elif resolution < 2.5 and r_free < 0.25:
                return "good_quality"
            else:
                return "moderate_quality"
        return "unknown_quality"

    def enhance_structure_data(self, pdb_id: str, metadata: Dict) -> Dict:
        """
        Enhance structure data with additional categorization.

        Args:
            pdb_id: PDB ID of the structure
            metadata: Metadata dictionary for the structure

        Returns:
            Enhanced data dictionary
        """
        # Load structure data
        if self.structures_df is None:
            self.load_processed_data()

        # Get structure row
        structure_row = self.structures_df[self.structures_df["pdb_id"] == pdb_id]
        if structure_row.empty:
            logger.error(f"Structure {pdb_id} not found in processed data")
            return {}

        # Extract data
        structure_data = structure_row.iloc[0].to_dict()

        structure_data["title"] = metadata.get("title", "")
        # Add protein family categorization
        structure_data["protein_families"] = self.categorize_by_protein_family(metadata)

        # Add experimental quality categorization
        structure_data["experimental_quality"] = self.categorize_by_experimental_quality(metadata)

        if "binding_data" in metadata:
            binding_metrics = {}
            for entry in metadata["binding_data"]:
                ligand_id = entry.get("comp_id")
                metric_type = entry.get("type")
                value = entry.get("value")
                unit = entry.get("unit")
                
                if ligand_id not in binding_metrics:
                    binding_metrics[ligand_id] = {}
                    
                binding_metrics[ligand_id][metric_type] = {"value": value, "unit": unit}
            
            structure_data["binding_metrics"] = binding_metrics
        
        # Add related structures info if available
        if "related_structures" in metadata:
            structure_data["related_structures"] = metadata["related_structures"]
        
        # Add experimental conditions
        structure_data["experimental_conditions"] = {
            "method": metadata.get("experimental_method"),
            "temperature": metadata.get("temperature"),
            "resolution": metadata.get("resolution")
        }

        # Add binding site information
        # This requires parsing the structure again
        structure_file = Path(f"data/raw/{pdb_id}.pdb")
        if structure_file.exists():
            structure = self.pdb_parser.get_structure(pdb_id, structure_file)

            # Process each ligand
            ligands = (
                eval(structure_data["ligands"])
                if isinstance(structure_data["ligands"], str)
                else structure_data["ligands"]
            )
            enhanced_ligands = []

            for ligand in ligands:
                binding_site = self.extract_binding_site_info(structure, ligand)
                enhanced_ligand = {**ligand, "binding_site": binding_site}
                enhanced_ligands.append(enhanced_ligand)

            structure_data["enhanced_ligands"] = enhanced_ligands

        return structure_data

    def batch_enhance_structures(
        self, pdb_ids: List[str], metadata_dict: Dict
    ) -> pd.DataFrame:
        """
        Enhance multiple structures with additional categorization.

        Args:
            pdb_ids: List of PDB IDs to enhance
            metadata_dict: Dictionary mapping PDB IDs to metadata

        Returns:
            DataFrame with enhanced structure data
        """
        enhanced_data = []

        for pdb_id in pdb_ids:
            metadata = metadata_dict.get(pdb_id.upper(), {})
            enhanced = self.enhance_structure_data(pdb_id, metadata)
            enhanced_data.append(enhanced)

        # Create DataFrame and save
        enhanced_df = pd.DataFrame(enhanced_data)
        if not enhanced_df.empty:
            output_file = self.data_dir / "enhanced_structures.csv"
            enhanced_df.to_csv(output_file, index=False)
            logger.info(f"Saved enhanced data to {output_file}")

        return enhanced_df
