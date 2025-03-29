# Roadmap

### Phase 1 (Completed)

- Data collection from PDB
- Initial structure processing

### Phase 2  (Almost Done)

- Enhance data categorization
- Add more advanced property calculations
- Design database schema

### Phase 3

- Develop result parsers
- Implement Solana blockchain storage

### Phase 4

- Build user interface
- Deploy search and retrieval system
- Add visualization capabilities

## Installation

1. Clone the repository:

   ```bash
   git clone {repository_url}
   cd {repository_name}/backend
   ```

2. Create and activate a virtual environment:

   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Usage

As of now the pipeline is run through a command-line interface with various options:

### Data Collection

Download protein structures from PDB:

```bash
python src/main.py --download --resolution 2.5 --limit 10 --format pdb
```

Options:

- `--resolution`: Maximum resolution cutoff (default: 2.5Å) (not necessary option)
- `--limit`: Maximum number of structures to download
- `--format`: File format to download ('pdb' or 'cif') (not necessary option)

### Data Processing

Process downloaded PDB files:

```bash
python src/main.py --process
```

This extracts protein chains, ligands, and other structural information. Creates a csv file in `data/processed/` directory.

### Structure Categorization

Enhance processed structures with additional categorization:

```bash
python backend/src/main.py --categorize --metadata-file path/to/metadata.json
```

Options:

- `--metadata-file`: Path to JSON file containing additional metadata
- `--pdb-ids`: Specific PDB IDs to process (e.g., `--pdb-ids 1us0 4lbs 3bcj`)

### Database Operations

Initialize the database:

```bash
python backend/src/main.py --init-db
```

Import processed data into the database:

```bash
python backend/src/main.py --import-db
```

### Complete Pipeline Example

Run the complete pipeline:

```bash
python backend/src/main.py --download --process --categorize --init-db --import-db --resolution 2.5 --limit 50
```

## Data Organization

The project organizes data as follows:

- `data/raw/`: Downloaded PDB files
- `data/processed/`: Processed and categorized data
- `logs/`: Application logs

## Database Schema

The database stores the following entities:

- Proteins: Basic protein information
- Ligands: Ligand properties and binding site information
- Protein Categories: Classification of proteins
- Data Integrity Records: Hashes for data integrity verification

## Development

### Project Structure

```
backend/
├── requirements.txt
├── src/
│   ├── main.py
│   ├── data_collection/
│   ├── data_processing/
│   ├── categorization/
│   ├── database/
```
