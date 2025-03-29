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
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)] bg-slate-800 text-gray-100">
      <main className="flex flex-col gap-[32px] row-start-2 items-center w-full max-w-6xl">
        <section className="w-full">
          <h1 className="text-3xl font-bold mb-6 text-center text-gray-100">Molecular Docking Data Management</h1>
          
          {error && (
            <div className="bg-red-900 text-red-100 p-4 rounded-md mb-6">
              {error}
            </div>
          )}
          
          {/* Database Stats */}
          {stats && (
            <div className="bg-slate-700 rounded-lg p-6 mb-8 shadow-sm">
              <h2 className="text-xl font-semibold mb-4 text-gray-100">Database Statistics</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-600 p-4 rounded-md shadow-sm border border-slate-500">
                  <p className="text-gray-300">Total Proteins</p>
                  <p className="text-2xl font-bold text-gray-100">{stats.protein_count}</p>
                </div>
                <div className="bg-slate-600 p-4 rounded-md shadow-sm border border-slate-500">
                  <p className="text-gray-300">Total Ligands</p>
                  <p className="text-2xl font-bold text-gray-100">{stats.ligand_count}</p>
                </div>
                <div className="bg-slate-600 p-4 rounded-md shadow-sm border border-slate-500">
                  <p className="text-gray-300">Categories</p>
                  <p className="text-2xl font-bold text-gray-100">{stats.category_count}</p>
                </div>
              </div>
              <p className="text-sm text-gray-300 mt-4">Last updated: {new Date(stats.last_updated).toLocaleString()}</p>
            </div>
          )}
          
          {/* Categories Filter */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-100">Protein Categories</h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2 rounded-full text-sm ${!selectedCategory 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-slate-600 hover:bg-slate-500 text-gray-100'}`}
              >
                All
              </button>
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.name)}
                  className={`px-4 py-2 rounded-full text-sm ${selectedCategory === category.name 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-slate-600 hover:bg-slate-500 text-gray-100'}`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
          
          {/* Proteins List */}
          <h2 className="text-xl font-semibold mb-4 text-gray-100">
            Proteins {selectedCategory ? `in ${selectedCategory}` : ''} 
            {!loading && ` (${proteins.length})`}
          </h2>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-400"></div>
            </div>
          ) : proteins.length === 0 ? (
            <p className="text-gray-300 py-8 text-center">No proteins found.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {proteins.map(protein => (
                <Link 
                  href={`/protein/${protein.pdb_id}`} 
                  key={protein.id} 
                  className="bg-slate-700 p-6 rounded-lg shadow-sm border border-slate-600 hover:shadow-md transition-shadow"
                >
                  <h3 className="text-lg font-semibold mb-2 text-gray-100">{protein.title}</h3>
                  <p className="text-sm text-gray-300 mb-2">PDB ID: {protein.pdb_id}</p>
                  <p className="text-sm mb-4 line-clamp-2 text-gray-300">{protein.description || 'No description available'}</p>
                  <div className="flex flex-wrap gap-2">
                    {protein.categories?.map(cat => (
                      <span key={cat.id} className="bg-blue-900 text-blue-100 text-xs px-2 py-1 rounded">
                        {cat.name}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
      
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center text-sm text-gray-300">
        <p>&copy; {new Date().getFullYear()} Molecular Docking Data Management</p>
      </footer>
    </div>
  );
}
