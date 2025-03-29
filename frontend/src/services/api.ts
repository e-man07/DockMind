// API service for data fetching

const API_BASE_URL = 'http://localhost:8000'; // Adjust if your backend is hosted elsewhere

export interface ChainData {
  entity_type: string;
  residue_count: string;
  sequence: string;
  length: number;
  residues?: number[];
  secondary_structure?: string;
  // Add other chain-specific properties as needed
}

export interface Protein {
  id: number;
  pdb_id: string;
  title: string;
  description: string;
  chain_data: Record<string, ChainData>;
  resolution: number;
  deposition_date: string;
  categories: Category[];
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  description: string;
}

export interface Ligand {
  id: number;
  name: string;
  smiles: string;
  molecular_weight: number;
  created_at: string;
  updated_at: string;
}

export interface ProteinListResponse {
  total: number;
  offset: number;
  limit: number;
  proteins: Protein[];
}

export interface ProteinDetailResponse {
  protein: Protein;
  ligands: Ligand[];
}

export interface LigandResponse {
  ligand: Ligand;
}

export interface DatabaseStats {
  protein_count: number;
  ligand_count: number;
  category_count: number;
  last_updated: string;
}

// Fetch all proteins (with optional category filter)
export async function getProteins(category?: string): Promise<ProteinListResponse> {
  const url = category 
    ? `${API_BASE_URL}/proteins/?category=${encodeURIComponent(category)}` 
    : `${API_BASE_URL}/proteins/`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch proteins: ${response.statusText}`);
  }
  return response.json();
}

// Fetch protein details by PDB ID
export async function getProteinById(pdbId: string): Promise<ProteinDetailResponse> {
  const response = await fetch(`${API_BASE_URL}/proteins/${pdbId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch protein ${pdbId}: ${response.statusText}`);
  }
  return response.json();
}

// Fetch ligand details by ID
export async function getLigandById(ligandId: number): Promise<LigandResponse> {
  const response = await fetch(`${API_BASE_URL}/ligands/${ligandId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch ligand ${ligandId}: ${response.statusText}`);
  }
  return response.json();
}

// Fetch all categories
export async function getCategories(): Promise<Category[]> {
  const response = await fetch(`${API_BASE_URL}/categories/`);
  if (!response.ok) {
    throw new Error(`Failed to fetch categories: ${response.statusText}`);
  }
  return response.json();
}

// Fetch database statistics
export async function getDatabaseStats(): Promise<DatabaseStats> {
  const response = await fetch(`${API_BASE_URL}/stats`);
  if (!response.ok) {
    throw new Error(`Failed to fetch database stats: ${response.statusText}`);
  }
  return response.json();
}
