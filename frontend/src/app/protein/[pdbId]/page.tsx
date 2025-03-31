"use client";

import {
  Ligand,
  Protein,
  getProteinById,
  getIPFSHashByProteinId,
  IPFSResponse,
} from "@/services/api";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ProteinDetails() {
  const { pdbId } = useParams();
  const router = useRouter();
  const [protein, setProtein] = useState<Protein | null>(null);
  const [ligands, setLigands] = useState<Ligand[]>([]);
  const [ipfsHash, setIpfsHash] = useState<IPFSResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProteinDetails() {
      if (!pdbId) return;

      try {
        setLoading(true);
        const [proteinData, ipfsData] = await Promise.all([
          getProteinById(pdbId as string),
          getIPFSHashByProteinId(pdbId as string).catch(() => null),
        ]);

        setProtein(proteinData.protein);
        setLigands(proteinData.ligands);
        setIpfsHash(ipfsData || null);
        setError(null);
      } catch (err) {
        console.error("Error fetching protein details:", err);
        setError("Failed to load protein details. Please try again later.");
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
      <div className="min-h-screen w-full bg-slate-800 text-gray-100">
        <div className="max-w-7xl mx-auto p-8">
          <div className="bg-red-900 text-red-100 p-4 rounded-md mb-6">
            {error}
          </div>
          <button
            onClick={() => router.push("/")}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (!protein) {
    return (
      <div className="min-h-screen w-full bg-slate-900 text-gray-100">
        <div className="max-w-7xl mx-auto p-8">
          <div className="bg-slate-800 rounded-lg shadow-lg p-8 text-center">
            <p className="text-xl mb-4">Protein not found</p>
            <button
              onClick={() => router.push("/")}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition duration-200 inline-flex items-center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Back to Home
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
          <Link
            href="/"
            className="text-blue-400 hover:text-blue-300 flex items-center transition duration-200 group"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2 group-hover:transform group-hover:-translate-x-1 transition-transform"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Proteins List
          </Link>
        </div>

        <div className="bg-slate-800 rounded-xl shadow-xl border border-slate-700 overflow-hidden mb-8">
          <div className="h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>

          <div className="p-6 sm:p-8">
            <div className="flex flex-col md:flex-row md:items-start justify-between mb-8">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-100 flex items-center">
                  <span className="bg-slate-700 text-blue-300 px-4 py-1 rounded-md font-mono mr-3">
                    {protein.pdb_id}
                  </span>
                  <span
                    className={`inline-block px-3 py-1 text-sm font-semibold rounded-full border ${
                      protein.status === "active"
                        ? "bg-green-900/50 text-green-300 border-green-800"
                        : protein.status === "pending"
                        ? "bg-yellow-900/50 text-yellow-300 border-yellow-800"
                        : protein.status === "inactive"
                        ? "bg-gray-900/50 text-gray-300 border-gray-800"
                        : "bg-blue-900/50 text-blue-300 border-blue-800"
                    }`}
                  >
                    {protein.status ? protein.status.toUpperCase() : "UNKNOWN"}
                  </span>
                </h1>
                <p className="text-lg text-gray-300 mt-3 leading-relaxed">
                  {protein.title}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
              <div className="bg-slate-750 rounded-lg p-5 shadow-md border border-slate-700 md:col-span-2">
                <h2 className="text-xl font-semibold mb-4 text-gray-100 flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-2 text-blue-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Details
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-gray-300">
                  <div className="border-b border-slate-700 pb-2">
                    <p className="font-medium text-gray-400">Resolution</p>
                    <p className="font-semibold">{protein.resolution} Å</p>
                  </div>

                  <div className="border-b border-slate-700 pb-2">
                    <p className="font-medium text-gray-400">Experiment Type</p>
                    <p className="font-semibold">
                      {protein.experiment_type || "Unknown"}
                    </p>
                  </div>

                  <div className="border-b border-slate-700 pb-2">
                    <p className="font-medium text-gray-400">Temperature</p>
                    <p className="font-semibold">
                      {protein.temperature
                        ? `${protein.temperature} K`
                        : "Not specified"}
                    </p>
                  </div>

                  <div className="border-b border-slate-700 pb-2">
                    <p className="font-medium text-gray-400">Quality</p>
                    <p>
                      <span
                        className={`inline-block px-2 py-1 text-xs font-semibold rounded-md ${
                          protein.quality === "high_quality"
                            ? "bg-green-900/50 text-green-300 border border-green-800"
                            : protein.quality === "medium_quality"
                            ? "bg-yellow-900/50 text-yellow-300 border border-yellow-800"
                            : protein.quality === "low_quality"
                            ? "bg-red-900/50 text-red-300 border border-red-800"
                            : "bg-gray-900/50 text-gray-300 border border-gray-800"
                        }`}
                      >
                        {protein.quality
                          ? protein.quality.replace("_", " ").toUpperCase()
                          : "UNKNOWN"}
                      </span>
                    </p>
                  </div>

                  <div className="border-b border-slate-700 pb-2">
                    <p className="font-medium text-gray-400">IPFS Storage</p>
                    {ipfsHash ? (
                      <div className="flex items-center">
                        <span
                          className="bg-emerald-900/30 text-emerald-300 px-2 py-1 text-xs font-mono rounded border border-emerald-800 truncate"
                          title={ipfsHash.ipfs_hash}
                        >
                          {ipfsHash.ipfs_hash.substring(0, 7)}...
                          {ipfsHash.ipfs_hash.substring(ipfsHash.ipfs_hash.length - 7)}
                        </span>
                        <button
                          onClick={() =>
                            navigator.clipboard.writeText(ipfsHash.ipfs_hash)
                          }
                          className="ml-2 text-gray-400 hover:text-blue-400 transition-colors"
                          title="Copy IPFS hash"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                            />
                          </svg>
                        </button>
                        <a
                          href={`https://ipfs.io/ipfs/${ipfsHash.ipfs_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-gray-400 hover:text-blue-400 transition-colors"
                          title="View on IPFS"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                        </a>
                      </div>
                    ) : (
                      <p className="text-gray-500 italic text-sm">
                        Not available
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-slate-750 rounded-lg p-5 shadow-md border border-slate-700">
                <h2 className="text-xl font-semibold mb-4 text-gray-100 flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-2 text-purple-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                    />
                  </svg>
                  Categories
                </h2>
                {protein.categories?.length > 0 ? (
                  <div className="space-y-2">
                    {protein.categories.map((category) => (
                      <div
                        key={category.id}
                        className="bg-indigo-900/30 text-indigo-300 px-3 py-2 rounded-md text-sm border border-indigo-800 flex items-center"
                      >
                        <span className="w-2 h-2 bg-indigo-400 rounded-full mr-2"></span>
                        {category.name}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-gray-500 italic">
                      No categories assigned
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-750 rounded-lg p-5 shadow-md border border-slate-700 mb-8">
              <h2 className="text-xl font-semibold mb-4 text-gray-100 flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2 text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
                  />
                </svg>
                Chain Data
              </h2>

              <div className="overflow-x-auto rounded-lg border border-slate-700">
                <table className="min-w-full bg-slate-800">
                  <thead className="bg-slate-700">
                    <tr>
                      <th className="py-3 px-4 border-b border-slate-600 text-left text-gray-100 font-semibold">
                        Chain ID
                      </th>
                      <th className="py-3 px-4 border-b border-slate-600 text-left text-gray-100 font-semibold">
                        Length
                      </th>
                      <th className="py-3 px-4 border-b border-slate-600 text-left text-gray-100 font-semibold">
                        Residue Range
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(protein.chain_data || {}).map(
                      ([chainId, data]) => (
                        <tr
                          key={chainId}
                          className="border-b border-slate-700 hover:bg-slate-700 transition-colors"
                        >
                          <td className="py-3 px-4 font-medium text-blue-300">
                            {chainId}
                          </td>
                          <td className="py-3 px-4 text-gray-300">
                            {data.length || "N/A"}
                          </td>
                          <td className="py-3 px-4 text-gray-300 font-mono text-sm">
                            {data.residue_range || "N/A"}
                          </td>
                        </tr>
                      )
                    )}
                    {Object.keys(protein.chain_data || {}).length === 0 && (
                      <tr>
                        <td
                          colSpan={3}
                          className="py-4 text-center text-gray-500 italic"
                        >
                          No chain data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl shadow-xl border border-slate-700 overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-green-500 via-teal-500 to-blue-500"></div>

          <div className="p-6 sm:p-8">
            <h2 className="text-xl font-semibold mb-6 text-gray-100 flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2 text-yellow-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                />
              </svg>
              Associated Ligands
            </h2>

            {ligands.length === 0 ? (
              <div className="bg-slate-750 rounded-lg p-8 text-center border border-slate-700">
                <p className="text-gray-500 italic">
                  No ligands associated with this protein
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {ligands.map((ligand) => (
                  <Link
                    href={`/ligand/${ligand.id}`}
                    key={ligand.id}
                    className="block bg-slate-750 border border-slate-700 rounded-lg p-4 hover:bg-slate-700 transition-colors shadow-md hover:shadow-lg group"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-medium text-gray-100 text-lg group-hover:text-blue-300 transition-colors">
                        {ligand.residue_name || ligand.name}
                      </h3>
                      <span className="bg-blue-900/50 text-blue-300 text-xs px-2.5 py-1 rounded-full border border-blue-800">
                        Chain {ligand.chain_id}
                      </span>
                    </div>

                    <p className="text-sm text-gray-300 mb-4 flex items-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 mr-1 text-teal-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
                        />
                      </svg>
                      <span className="font-medium mr-1">Atoms:</span>{" "}
                      {ligand.num_atoms || "N/A"}
                    </p>

                    <div className="flex justify-between text-xs mt-4 pt-2 border-t border-slate-700">
                      <span className="text-gray-400 font-mono">
                        ID: {ligand.id}
                      </span>
                      <span className="text-blue-400 group-hover:text-blue-300 flex items-center">
                        View details
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 ml-1 group-hover:transform group-hover:translate-x-1 transition-transform"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M14 5l7 7m0 0l-7 7m7-7H3"
                          />
                        </svg>
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {(protein.created_at || protein.updated_at) && (
              <div className="mt-8 pt-4 border-t border-slate-700 flex justify-between text-xs text-gray-500">
                {protein.created_at && (
                  <p>
                    Created: {new Date(protein.created_at).toLocaleString()}
                  </p>
                )}
                {protein.updated_at && (
                  <p>
                    Last updated:{" "}
                    {new Date(protein.updated_at).toLocaleString()}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
