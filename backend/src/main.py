import argparse
import json
import time
from pathlib import Path

import pandas as pd

# Import Phase 2 components
from categorization import StructureCategorizer
from data_collection import PDBCollector
from data_processing import PDBProcessor
from database.service import DatabaseService
from docking import DockingManager
from loguru import logger


def setup_logger(log_file="logs/data_management.log"):
    """Set up the logger with file and console output."""
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)

    logger.add(log_file, rotation="500 MB", level="INFO")
    logger.info("Logger initialized")


def main():
    parser = argparse.ArgumentParser(description="PDB Data Management Pipeline")

    # Phase 1 arguments
    parser.add_argument("--download", action="store_true", help="Download PDB files")
    parser.add_argument(
        "--collect-metadata",
        action="store_true",
        help="Collect metadata while downloading PDB files",
    )
    parser.add_argument(
        "--process", action="store_true", help="Process downloaded PDB files"
    )
    parser.add_argument(
        "--resolution", type=float, default=2.5, help="Resolution cutoff for PDB search"
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=100,
        help="Limit the number of structures to download",
    )
    parser.add_argument(
        "--format",
        choices=["pdb", "cif"],
        default="pdb",
        help="File format to download",
    )

    # Phase 2 arguments
    parser.add_argument(
        "--categorize",
        action="store_true",
        help="Run enhanced categorization on processed structures",
    )
    parser.add_argument(
        "--init-db", action="store_true", help="Initialize the database schema"
    )
    parser.add_argument(
        "--init-dummy-db", action="store_true", help="Initialize the database schema"
    )
    parser.add_argument(
        "--import-db",
        action="store_true",
        help="Import processed and categorized data into the database",
    )
    parser.add_argument(
        "--csv-file",
        type=str,
        default="data/processed/enhanced_structures.csv",
        help="CSV file to import into database",
    )
    parser.add_argument(
        "--db-stats", action="store_true", help="Display database statistics"
    )

    parser.add_argument(
        "--metadata-file",
        type=str,
        help="Path to metadata JSON file for enhanced categorization",
    )
    parser.add_argument(
        "--pdb-ids", nargs="+", help="Specific PDB IDs to process (for categorization)"
    )

    args = parser.parse_args()

    # Setup logger
    setup_logger()

    if args.download:
        logger.info("Starting PDB download process")
        collector = PDBCollector(output_dir="data/raw")

        # Create search query
        query = collector.create_query_for_protein_ligand_complexes(
            resolution_cutoff=args.resolution, has_ligands=True
        )

        # Search for PDB IDs
        pdb_ids = collector.search_by_query(query)
        logger.info(f"Found {len(pdb_ids)} PDB entries matching criteria")

        # Limit number of downloads if specified
        if args.limit and args.limit < len(pdb_ids):
            pdb_ids = pdb_ids[: args.limit]
            logger.info(f"Limited to {args.limit} structures")

        # Download PDB files
        start_time = time.time()
        downloaded_files = collector.batch_download(
            pdb_ids, file_format=args.format, collect_metadata=args.collect_metadata
        )
        elapsed_time = time.time() - start_time

        logger.info(
            f"Downloaded {len(downloaded_files)} files in {elapsed_time:.2f} seconds"
        )

        # Save downloaded PDB IDs for later processing
        with open("data/downloaded_pdbs.json", "w") as f:
            json.dump({"pdb_ids": [path.stem for path in downloaded_files]}, f)

    if args.process:
        logger.info("Starting PDB processing")
        processor = PDBProcessor(processed_dir="data/processed")

        # Get list of files to process
        if Path("data/downloaded_pdbs.json").exists():
            with open("data/downloaded_pdbs.json", "r") as f:
                pdb_ids = json.load(f)["pdb_ids"]

            file_format = args.format
            file_paths = [
                Path(f"data/raw/{pdb_id}.{file_format}") for pdb_id in pdb_ids
            ]
        else:
            # Process all files in the raw directory
            file_paths = list(Path("data/raw").glob(f"*.{args.format}"))

        logger.info(f"Processing {len(file_paths)} PDB files")

        # Process PDB files
        start_time = time.time()
        results_df = processor.batch_process(file_paths)
        elapsed_time = time.time() - start_time

        logger.info(f"Processed {len(results_df)} files in {elapsed_time:.2f} seconds")
        logger.info(f"Found {results_df['num_ligands'].sum()} ligands in total")

    # Phase 2: Enhanced Categorization
    if args.categorize:
        logger.info("Starting enhanced structure categorization")
        categorizer = StructureCategorizer()

        # Load metadata if provided
        metadata_dict = {}
        metadata_file = (
            Path(args.metadata_file)
            if args.metadata_file
            else Path("data/processed/metadata.json")
        )
        if metadata_file.exists():
            with open(metadata_file, "r") as f:
                metadata_dict = json.load(f)
            logger.info(f"Loaded metadata for {len(metadata_dict)} structures")
        else:
            logger.warning(f"Metadata file not found: {metadata_file}")
            logger.warning(
                "Proceeding without metadata. Categorization will be limited."
            )

        # Load processed structures
        processed_df = categorizer.load_processed_data()
        if processed_df.empty:
            logger.error("No processed structures found. Run with --process first.")
            return

        # Determine which PDB IDs to process
        if args.pdb_ids:
            pdb_ids = args.pdb_ids
            logger.info(f"Categorizing specific PDB IDs: {pdb_ids}")
        else:
            pdb_ids = processed_df["pdb_id"].tolist()
            logger.info(f"Categorizing all {len(pdb_ids)} processed structures")

        # Run enhanced categorization
        start_time = time.time()
        enhanced_df = categorizer.batch_enhance_structures(pdb_ids, metadata_dict)
        elapsed_time = time.time() - start_time

        logger.info(
            f"Enhanced {len(enhanced_df)} structures in {elapsed_time:.2f} seconds"
        )

        # Print summary of categorization
        if not enhanced_df.empty and "protein_families" in enhanced_df.columns:
            family_counts = {}
            for _, row in enhanced_df.iterrows():
                families = row["protein_families"]
                if isinstance(families, str):
                    families = eval(families)
                for family in families:
                    family_counts[family] = family_counts.get(family, 0) + 1

            logger.info("Protein family distribution:")
            for family, count in family_counts.items():
                logger.info(f"  {family}: {count} structures")

    # Phase 2: Database Operations
    if args.init_db:
        logger.info("Initializing database schema")
        db_service = DatabaseService()
        db_service.create_tables()
        logger.info("Database schema initialized")

    if args.import_db:
        logger.info(f"Importing data from {args.csv_file} into database...")
        db_service = DatabaseService()
        success = db_service.import_enhanced_structures(args.csv_file)
        if success:
            logger.info("Data import completed successfully")
        else:
            logger.error("Data import failed")

    if args.db_stats:
        logger.info("Retrieving database statistics...")
        db_service = DatabaseService()
        stats = db_service.get_database_stats()
        for key, value in stats.items():
            logger.info(f"{key}: {value}")

    if not any(
        [args.download, args.process, args.categorize, args.init_db, args.import_db]
    ):
        parser.print_help()


if __name__ == "__main__":
    main()
