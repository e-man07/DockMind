'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Ligand, Protein, getProteinById } from '@/services/api';

export default function ProteinDetails() {
  const { pdbId } = useParams();
  const router = useRouter();
  const [protein, setProtein] = useState<Protein | null>(null);
  const [ligands, setLigands] = useState<Ligand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProteinDetails() {
      if (!pdbId) return;
      
      try {
        setLoading(true);
        const data = await getProteinById(pdbId as string);
        setProtein(data.protein);
        setLigands(data.ligands);
        setError(null);
      } catch (err) {
        console.error('Error fetching protein details:', err);
        setError('Failed to load protein details. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    
    fetchProteinDetails();
  }, [pdbId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-800">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-8 bg-slate-800 text-gray-100">
        <div className="bg-red-900 text-red-100 p-4 rounded-md mb-6">
          {error}
        </div>
        <button 
          onClick={() => router.push('/')} 
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Back to Home
        </button>
      </div>
    );
  }

  if (!protein) {
    return (
      <div className="container mx-auto p-8 bg-slate-800 text-gray-100">
        <p>Protein not found</p>
        <button 
          onClick={() => router.push('/')} 
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mt-4"
        >
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-800 text-gray-100">
      <div className="max-w-7xl mx-auto p-4 sm:p-8">
        <div className="mb-4">
          <Link 
            href="/"
            className="text-blue-400 hover:text-blue-300 flex items-center"
          >
            ← Back to Proteins List
          </Link>
        </div>

        <div className="bg-slate-700 rounded-lg shadow-sm border border-slate-600 p-6 mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-gray-100">{protein.title}</h1>
          <p className="text-gray-300 mb-6">PDB ID: {protein.pdb_id}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h2 className="text-xl font-semibold mb-3 text-gray-100">Details</h2>
              <div className="space-y-2 text-gray-300">
                <p><span className="font-medium">Resolution:</span> {protein.resolution} Å</p>
                <p><span className="font-medium">Deposition Date:</span> {new Date(protein.deposition_date).toLocaleDateString()}</p>
                <p><span className="font-medium">Description:</span> {protein.description || 'No description available'}</p>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-3 text-gray-100">Categories</h2>
              <div className="flex flex-wrap gap-2">
                {protein.categories?.map(category => (
                  <span 
                    key={category.id} 
                    className="bg-blue-900 text-blue-100 px-3 py-1 rounded-full text-sm"
                  >
                    {category.name}
                  </span>
                ))}
                {(!protein.categories || protein.categories.length === 0) && (
                  <p className="text-gray-400">No categories assigned</p>
                )}
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-3 text-gray-100">Chain Data</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-slate-600 border border-slate-500">
                <thead className="bg-slate-700">
                  <tr>
                    <th className="py-2 px-4 border-b border-slate-500 text-left text-gray-100">Chain ID</th>
                    <th className="py-2 px-4 border-b border-slate-500 text-left text-gray-100">Residues</th>
                    <th className="py-2 px-4 border-b border-slate-500 text-left text-gray-100">Entity Type</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(protein.chain_data || {}).map(([chainId, data]) => (
                    <tr key={chainId} className="border-b border-slate-500 hover:bg-slate-500">
                      <td className="py-2 px-4 font-medium text-gray-100">{chainId}</td>
                      <td className="py-2 px-4 text-gray-300">{data.residue_count || 'N/A'}</td>
                      <td className="py-2 px-4 text-gray-300">{data.entity_type || 'N/A'}</td>
                    </tr>
                  ))}
                  {Object.keys(protein.chain_data || {}).length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-4 text-center text-gray-400">No chain data available</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="bg-slate-700 rounded-lg shadow-sm border border-slate-600 p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-100">Associated Ligands</h2>
          {ligands.length === 0 ? (
            <p className="text-gray-400">No ligands associated with this protein</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {ligands.map(ligand => (
                <Link 
                  href={`/ligand/${ligand.id}`} 
                  key={ligand.id} 
                  className="block p-4 border border-slate-500 rounded bg-slate-600 hover:bg-slate-500 transition-colors"
                >
                  <h3 className="font-medium text-gray-100">{ligand.name}</h3>
                  <p className="text-sm text-gray-300 mt-1">Molecular weight: {ligand.molecular_weight}</p>
                  <p className="text-xs text-gray-400 mt-2 overflow-hidden text-ellipsis">{ligand.smiles}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
