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
      <div className="min-h-screen w-full bg-slate-900 text-gray-100">
        <div className="max-w-7xl mx-auto p-8">
          <div className="bg-slate-800 rounded-lg shadow-lg p-8 text-center">
            <p className="text-xl mb-4">Ligand not found</p>
            <button 
              onClick={() => router.back()} 
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition duration-200 inline-flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-900 to-slate-800 text-gray-100">
      <div className="max-w-7xl mx-auto p-4 sm:p-8">
        <div className="mb-6">
          <button 
            onClick={() => router.back()} 
            className="text-blue-400 hover:text-blue-300 flex items-center transition duration-200 group"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 group-hover:transform group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Ligands
          </button>
        </div>

        <div className="bg-slate-800 rounded-xl shadow-xl border border-slate-700 overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
          
          <div className="p-6 sm:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-100 flex items-center">
                <span className="mr-3">{ligand.residue_name}</span>
                <span className="bg-slate-700 text-blue-300 text-lg px-3 py-1 rounded-md font-mono">#{ligand.id}</span>
              </h1>
              
              <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
                <span className="bg-indigo-900/50 text-indigo-300 text-xs font-medium px-3 py-1 rounded-full border border-indigo-800">
                  Chain: {ligand.chain_id}
                </span>
                <span className="bg-purple-900/50 text-purple-300 text-xs font-medium px-3 py-1 rounded-full border border-purple-800">
                  Atoms: {ligand.num_atoms}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="bg-slate-750 rounded-lg p-5 shadow-md border border-slate-700">
                <h2 className="text-xl font-semibold mb-4 text-gray-100 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Ligand Information
                </h2>
                <div className="space-y-4 text-gray-300">
                  <div className="flex justify-between border-b border-slate-700 pb-2">
                    <p className="font-medium text-gray-400">Residue Name</p>
                    <p className="font-semibold">{ligand.residue_name}</p>
                  </div>
                  
                  <div className="flex justify-between border-b border-slate-700 pb-2">
                    <p className="font-medium text-gray-400">Chain ID</p>
                    <p className="font-semibold">{ligand.chain_id}</p>
                  </div>
                  
                  <div className="flex justify-between border-b border-slate-700 pb-2">
                    <p className="font-medium text-gray-400">Residue ID</p>
                    <p className="font-mono text-sm">{ligand.residue_id}</p>
                  </div>
                  
                  <div className="flex justify-between">
                    <p className="font-medium text-gray-400">Number of Atoms</p>
                    <p className="font-semibold">{ligand.num_atoms}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-slate-750 rounded-lg p-5 shadow-md border border-slate-700">
                <h2 className="text-xl font-semibold mb-4 text-gray-100 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Coordinates
                </h2>
                <div className="space-y-4 text-gray-300">
                  <div className="grid grid-cols-3 gap-4 bg-slate-800 p-4 rounded-lg">
                    <div className="text-center">
                      <p className="font-medium text-gray-400 mb-1">X</p>
                      <p className="font-mono text-blue-300">{ligand.center_x.toFixed(4)}</p>
                    </div>
                    
                    <div className="text-center">
                      <p className="font-medium text-gray-400 mb-1">Y</p>
                      <p className="font-mono text-green-300">{ligand.center_y.toFixed(4)}</p>
                    </div>
                    
                    <div className="text-center">
                      <p className="font-medium text-gray-400 mb-1">Z</p>
                      <p className="font-mono text-purple-300">{ligand.center_z.toFixed(4)}</p>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-4 bg-slate-800 rounded-lg">
                    <p className="text-sm text-gray-400 mb-2">3D Position Coordinates</p>
                    <div className="h-32 bg-gradient-to-br from-slate-900 to-slate-800 rounded flex items-center justify-center">
                      <p className="text-gray-500 text-sm">3D visualization placeholder</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-slate-750 rounded-lg p-5 shadow-md border border-slate-700">
                <h2 className="text-xl font-semibold mb-4 text-gray-100 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                  Molecular Properties
                </h2>
                <div className="space-y-2.5 text-gray-300">
                  <div className="flex justify-between items-center">
                    <p className="font-medium text-gray-400">Molecular Weight</p>
                    <p className={`font-mono ${ligand.molecular_weight ? 'text-teal-300' : 'text-gray-500'}`}>
                      {ligand.molecular_weight ? `${ligand.molecular_weight} g/mol` : 'N/A'}
                    </p>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <p className="font-medium text-gray-400">LogP</p>
                    <p className={`font-mono ${ligand.logp !== null ? 'text-teal-300' : 'text-gray-500'}`}>
                      {ligand.logp !== null ? ligand.logp : 'N/A'}
                    </p>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <p className="font-medium text-gray-400">H-Bond Donors</p>
                    <p className={`font-mono ${ligand.h_donors !== null ? 'text-teal-300' : 'text-gray-500'}`}>
                      {ligand.h_donors !== null ? ligand.h_donors : 'N/A'}
                    </p>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <p className="font-medium text-gray-400">H-Bond Acceptors</p>
                    <p className={`font-mono ${ligand.h_acceptors !== null ? 'text-teal-300' : 'text-gray-500'}`}>
                      {ligand.h_acceptors !== null ? ligand.h_acceptors : 'N/A'}
                    </p>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <p className="font-medium text-gray-400">Rotatable Bonds</p>
                    <p className={`font-mono ${ligand.rotatable_bonds !== null ? 'text-teal-300' : 'text-gray-500'}`}>
                      {ligand.rotatable_bonds !== null ? ligand.rotatable_bonds : 'N/A'}
                    </p>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <p className="font-medium text-gray-400">TPSA</p>
                    <p className={`font-mono ${ligand.tpsa !== null ? 'text-teal-300' : 'text-gray-500'}`}>
                      {ligand.tpsa !== null ? ligand.tpsa : 'N/A'}
                    </p>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <p className="font-medium text-gray-400">QED</p>
                    <p className={`font-mono ${ligand.qed !== null ? 'text-teal-300' : 'text-gray-500'}`}>
                      {ligand.qed !== null ? ligand.qed : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4 text-gray-100 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                Chemical Identifiers
              </h2>
              
              <div className="grid grid-cols-1 gap-6">
                {ligand.smiles ? (
                  <div className="bg-slate-750 rounded-lg p-5 shadow-md border border-slate-700">
                    <p className="font-medium text-gray-300 mb-2 flex items-center">
                      <span className="bg-yellow-900/50 text-yellow-300 text-xs font-medium mr-2 px-2.5 py-0.5 rounded-full">SMILES</span>
                    </p>
                    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 font-mono text-sm break-all text-gray-300 overflow-x-auto">
                      {ligand.smiles}
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-750 rounded-lg p-5 shadow-md border border-slate-700">
                    <p className="font-medium text-gray-300 mb-2 flex items-center">
                      <span className="bg-yellow-900/50 text-yellow-300 text-xs font-medium mr-2 px-2.5 py-0.5 rounded-full">SMILES</span>
                    </p>
                    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 text-gray-500 italic">
                      No SMILES data available
                    </div>
                  </div>
                )}
                
                {ligand.inchi ? (
                  <div className="bg-slate-750 rounded-lg p-5 shadow-md border border-slate-700">
                    <p className="font-medium text-gray-300 mb-2 flex items-center">
                      <span className="bg-green-900/50 text-green-300 text-xs font-medium mr-2 px-2.5 py-0.5 rounded-full">InChI</span>
                    </p>
                    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 font-mono text-sm break-all text-gray-300 overflow-x-auto">
                      {ligand.inchi}
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-750 rounded-lg p-5 shadow-md border border-slate-700">
                    <p className="font-medium text-gray-300 mb-2 flex items-center">
                      <span className="bg-green-900/50 text-green-300 text-xs font-medium mr-2 px-2.5 py-0.5 rounded-full">InChI</span>
                    </p>
                    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 text-gray-500 italic">
                      No InChI data available
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {(ligand.created_at || ligand.updated_at) && (
              <div className="mt-8 pt-4 border-t border-slate-700 flex justify-between text-xs text-gray-500">
                {ligand.created_at && (
                  <p>Created: {new Date(ligand.created_at).toLocaleString()}</p>
                )}
                {ligand.updated_at && (
                  <p>Last updated: {new Date(ligand.updated_at).toLocaleString()}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
