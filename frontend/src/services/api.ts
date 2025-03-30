// API service for data fetching

const API_BASE_URL = 'http://localhost:8000'; // Adjust if your backend is hosted elsewhere

export interface ChainData {
  residue_range: string;
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
  experiment_type: string;
  status: string;
  resolution: number;
  temperature: number;
  quality: string;
  categories: Category[];
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  description: string;
}

export interface residue {
  chain_id: string;
  residue_id: number;
  residue_name: string;
  distance: number;
}

export interface BindingSiteData {
  num_binding_residues: number;
  binding_residues: residue[];
  avg_distance: number;
  pocket_polarity: number;
}

export interface BindingMetricEntry {
  value: number;
  unit: string;
  provenance: string;
  reference_identity: number;
  link: string;
}

export interface BindingMetrics {
  [metricName: string]: BindingMetricEntry[];
}

export interface Ligand {
  binding_metrics: BindingMetrics | null;
  id: number;
  name?: string; 
  residue_name: string;
  chain_id: string;
  residue_id: string;
  num_atoms: number;
  center_x: number;
  center_y: number;
  center_z: number;
  binding_site_data: BindingSiteData | null;
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
