'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Ligand, getLigandById } from '@/services/api';

export default function LigandDetails() {
  const { id } = useParams();
  const router = useRouter();
  const [ligand, setLigand] = useState<Ligand | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLigandDetails() {
      if (!id) return;
      
      try {
        setLoading(true);
        const data = await getLigandById(Number(id));
        setLigand(data.ligand);
        setError(null);
      } catch (err) {
        console.error('Error fetching ligand details:', err);
        setError('Failed to load ligand details. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    
    fetchLigandDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-800">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen w-full bg-slate-800 text-gray-100">
        <div className="max-w-7xl mx-auto p-8">
          <div className="bg-red-900 text-red-100 p-4 rounded-md mb-6">
            {error}
          </div>
          <button 
            onClick={() => router.back()} 
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  if (!ligand) {
    return (
      <div className="min-h-screen w-full bg-slate-800 text-gray-100">
        <div className="max-w-7xl mx-auto p-8">
          <p>Ligand not found</p>
          <button 
            onClick={() => router.back()} 
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mt-4"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-800 text-gray-100">
      <div className="max-w-7xl mx-auto p-4 sm:p-8">
        <div className="mb-4">
          <button 
            onClick={() => router.back()} 
            className="text-blue-400 hover:text-blue-300 flex items-center"
          >
            ← Back
          </button>
        </div>

        <div className="bg-slate-700 rounded-lg shadow-sm border border-slate-600 p-6">
          <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-100">{ligand.name}</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-xl font-semibold mb-3 text-gray-100">Details</h2>
              <div className="space-y-4 text-gray-300">
                <div>
                  <p className="font-medium">Molecular Weight</p>
                  <p>{ligand.molecular_weight} g/mol</p>
                </div>
                
                <div>
                  <p className="font-medium">Created At</p>
                  <p>{new Date(ligand.created_at).toLocaleString()}</p>
                </div>
                
                <div>
                  <p className="font-medium">Last Updated</p>
                  <p>{new Date(ligand.updated_at).toLocaleString()}</p>
                </div>
              </div>
            </div>
            
            <div>
              <h2 className="text-xl font-semibold mb-3 text-gray-100">SMILES</h2>
              <div className="bg-slate-800 p-4 rounded border border-slate-600 font-mono text-sm break-all text-gray-300">
                {ligand.smiles}
              </div>
              
              {/* Potentially add a chemical structure visualization here */}
              <div className="mt-6">
                <p className="text-sm text-gray-400">
                  Note: For a 2D molecular structure visualization, consider 
                  integrating a chemical structure rendering library like RDKit.js or ChemDoodle.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
