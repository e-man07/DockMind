'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Category, 
  DatabaseStats, 
  Protein, 
  getCategories, 
  getDatabaseStats, 
  getProteins 
} from '@/services/api';

export default function Home() {
  const [proteins, setProteins] = useState<Protein[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // Fetch proteins (with optional category filter)
        const proteinsData = await getProteins(selectedCategory || undefined);
        setProteins(proteinsData.proteins);
        
        // Fetch categories
        const categoriesData = await getCategories();
        setCategories(categoriesData);
        
        // Fetch database stats
        const statsData = await getDatabaseStats();
        setStats(statsData);
        
        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [selectedCategory]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-900 to-slate-800 text-gray-100">
      <div className="max-w-7xl mx-auto p-4 sm:p-8 pb-20">
        <main className="flex flex-col gap-[32px] items-center w-full">
          <section className="w-full">
            <h1 className="text-3xl font-bold mb-8 text-center text-gray-100">Molecular Docking Data Management</h1>
            
            {error && (
              <div className="bg-red-900 text-red-100 p-4 rounded-md mb-6">
                {error}
              </div>
            )}
            
            {/* Database Stats */}
            {stats && (
              <div className="bg-slate-800 rounded-xl shadow-xl border border-slate-700 overflow-hidden mb-8">
                <div className="h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
                <div className="p-6">
                  <h2 className="text-xl font-semibold mb-4 text-gray-100 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Database Statistics
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-750 p-5 rounded-lg shadow-md border border-slate-700">
                      <p className="text-gray-400 mb-1">Total Proteins</p>
                      <p className="text-2xl font-bold text-blue-300">{stats.protein_count}</p>
                    </div>
                    <div className="bg-slate-750 p-5 rounded-lg shadow-md border border-slate-700">
                      <p className="text-gray-400 mb-1">Total Ligands</p>
                      <p className="text-2xl font-bold text-green-300">{stats.ligand_count}</p>
                    </div>
                    <div className="bg-slate-750 p-5 rounded-lg shadow-md border border-slate-700">
                      <p className="text-gray-400 mb-1">Categories</p>
                      <p className="text-2xl font-bold text-purple-300">{stats.category_count}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-4">Last updated: {new Date(stats.last_updated).toLocaleString()}</p>
                </div>
              </div>
            )}
            
            {/* Categories Filter */}
            <div className="bg-slate-800 rounded-xl shadow-xl border border-slate-700 overflow-hidden mb-8">
              <div className="h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-100 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  Protein Categories
                </h2>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`px-4 py-2 rounded-full text-sm ${!selectedCategory 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : 'bg-slate-700 hover:bg-slate-600 text-gray-200'} transition-colors duration-200`}
                  >
                    All
                  </button>
                  {categories.map(category => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.name)}
                      className={`px-4 py-2 rounded-full text-sm ${selectedCategory === category.name 
                        ? 'bg-blue-600 text-white shadow-md' 
                        : 'bg-slate-700 hover:bg-slate-600 text-gray-200'} transition-colors duration-200`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Proteins List */}
            <div className="bg-slate-800 rounded-xl shadow-xl border border-slate-700 overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-green-500 via-teal-500 to-blue-500"></div>
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-6 text-gray-100 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                  Proteins {selectedCategory ? `in ${selectedCategory}` : ''} 
                  {!loading && ` (${proteins.length})`}
                </h2>
                
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-400"></div>
                  </div>
                ) : proteins.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-gray-400 text-lg">No proteins found in this category.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {proteins.map(protein => (
                      <Link 
                        href={`/protein/${protein.pdb_id}`} 
                        key={protein.id} 
                        className="bg-slate-750 rounded-lg shadow-md border border-slate-700 hover:border-slate-600 transition-all duration-200 overflow-hidden group"
                      >
                        <div className="h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500 transform origin-left group-hover:scale-x-110 transition-transform duration-300"></div>
                        <div className="p-6">
                          <div className="flex justify-between items-start mb-3">
                            <h3 className="text-lg font-semibold text-gray-100 group-hover:text-blue-300 transition-colors duration-200">{protein.title}</h3>
                            <span 
                              className={`inline-block ml-2 px-2 py-1 text-xs font-semibold rounded-md ${
                                protein.status === 'active' ? 'bg-green-600/20 text-green-300 border border-green-800' :
                                protein.status === 'pending' ? 'bg-yellow-600/20 text-yellow-300 border border-yellow-800' :
                                protein.status === 'inactive' ? 'bg-gray-600/20 text-gray-300 border border-gray-700' :
                                'bg-blue-600/20 text-blue-300 border border-blue-800'
                              }`}
                            >
                              {protein.status ? protein.status.toUpperCase() : 'UNKNOWN'}
                            </span>
                          </div>
                          
                          <p className="text-sm text-blue-300 mb-2 font-mono">PDB ID: {protein.pdb_id}</p>
                          <p className="text-sm mb-4 line-clamp-2 text-gray-400">{protein.description || 'No description available'}</p>
                          
                          <div className="flex flex-wrap gap-2">
                            {protein.categories?.map(cat => (
                              <span key={cat.id} className="bg-indigo-900/40 text-indigo-300 text-xs px-2 py-1 rounded border border-indigo-800">
                                {cat.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        </main>
        
        <footer className="mt-16 flex gap-[24px] flex-wrap items-center justify-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} Molecular Docking Data Management</p>
        </footer>
      </div>
    </div>
  );
}
