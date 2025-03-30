"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Ligand, getLigandById } from "@/services/api";
import Script from "next/script";

// Define the 3Dmol global interface with a specific type
declare global {
  interface Window {
    $3Dmol: {
      createViewer: (
        element: HTMLElement,
        options: Record<string, unknown>
      ) => {
        addSphere: (options: Record<string, unknown>) => void;
        addLabel: (text: string, options: Record<string, unknown>) => void;
        zoomTo: () => void;
        render: () => void;
      };
    };
  }
}

export default function LigandDetails() {
  const { id } = useParams();
  const router = useRouter();
  const [ligand, setLigand] = useState<Ligand | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const viewerRef = useRef(null);
  const [activeTab, setActiveTab] = useState<"summary" | "residues" | "3d">(
    "summary"
  );

  useEffect(() => {
    async function fetchLigandDetails() {
      if (!id) return;

      try {
        setLoading(true);
        const data = await getLigandById(Number(id));
        setLigand(data.ligand);
        setError(null);
      } catch (err) {
        console.error("Error fetching ligand details:", err);
        setError("Failed to load ligand details. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    fetchLigandDetails();
  }, [id]);

  useEffect(() => {
    // Initialize 3Dmol viewer when data is loaded and component is mounted
    if (ligand?.binding_site_data && viewerRef.current && activeTab === "3d") {
      // Load 3Dmol viewer after ensuring the script is loaded
      const initViewer = () => {
        if (typeof window.$3Dmol !== "undefined") {
          const viewer = window.$3Dmol.createViewer(
            viewerRef.current as unknown as HTMLElement,
            {
              backgroundColor: "black",
              antialias: true,
            }
          );

          // This is a placeholder for actual molecular data
          // In a real implementation, you would fetch PDB data based on the ligand information
          viewer.addSphere({
            center: {
              x: ligand.center_x,
              y: ligand.center_y,
              z: ligand.center_z,
            },
            radius: 1.0,
            color: "red",
          });

          // Add spheres for each binding residue
          if (ligand.binding_site_data?.binding_residues) {
            ligand.binding_site_data.binding_residues.forEach(
              (residue, index) => {
                // Use different colors based on amino acid type
                const colors: Record<string, string> = {
                  TRP: "purple",
                  VAL: "green",
                  TYR: "cyan",
                  CYS: "yellow",
                  HIS: "orange",
                  THR: "pink",
                  PHE: "blue",
                  ALA: "white",
                  LEU: "lime",
                };

                // Simulate positions around the ligand for visualization
                // In a real implementation, you would use actual 3D coordinates
                const angle =
                  index *
                  ((2 * Math.PI) /
                    (ligand.binding_site_data?.binding_residues?.length || 1));
                const radius = residue.distance;
                const x = ligand.center_x + radius * Math.cos(angle);
                const y = ligand.center_y + radius * Math.sin(angle);
                const z = ligand.center_z + (Math.random() - 0.5) * 2;

                viewer.addSphere({
                  center: { x: x, y: y, z: z },
                  radius: 0.5,
                  color: colors[residue.residue_name] || "gray",
                });

                // Add labels for some residues (not all to avoid clutter)
                if (index % 10 === 0) {
                  viewer.addLabel(
                    `${residue.residue_name}${residue.residue_id}`,
                    {
                      position: { x: x, y: y, z: z },
                      backgroundColor: "rgba(0,0,0,0.5)",
                      fontColor: "white",
                      fontSize: 12,
                    }
                  );
                }
              }
            );
          }

          viewer.zoomTo();
          viewer.render();
        }
      };

      if (typeof window.$3Dmol !== "undefined") {
        initViewer();
      } else {
        // Wait for script to load
        window.addEventListener("3DmolLoaded", initViewer);
      }

      return () => {
        window.removeEventListener("3DmolLoaded", initViewer);
      };
    }
  }, [ligand, activeTab]);

  // Function to calculate amino acid distribution
  const getResidueDistribution = () => {
    if (!ligand?.binding_site_data?.binding_residues)
      return {} as Record<string, number>;

    return ligand.binding_site_data.binding_residues.reduce<
      Record<string, number>
    >((acc, residue) => {
      acc[residue.residue_name] = (acc[residue.residue_name] || 0) + 1;
      return acc;
    }, {});
  };

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
        <div className="mb-6 flex justify-between items-center">
          <button
            onClick={() => router.back()}
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
            Back to Ligands
          </button>

          {/* Summary badges */}
          <div className="hidden md:flex space-x-3">
            <span className="bg-indigo-900/50 text-indigo-300 text-xs font-medium px-3 py-1 rounded-full border border-indigo-800">
              Chain: {ligand.chain_id}
            </span>
            <span className="bg-purple-900/50 text-purple-300 text-xs font-medium px-3 py-1 rounded-full border border-purple-800">
              Atoms: {ligand.num_atoms}
            </span>
            <span className="bg-cyan-900/50 text-cyan-300 text-xs font-medium px-3 py-1 rounded-full border border-cyan-800">
              Binding Residues:{" "}
              {ligand.binding_site_data?.num_binding_residues || 0}
            </span>
          </div>
        </div>

        {/* Main content container */}
        <div className="flex flex-col space-y-6">
          {/* Header Card */}
          <div className="bg-slate-800 rounded-xl shadow-xl border border-slate-700 overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
            <div className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-100 flex items-center">
                  <span className="mr-3">{ligand.residue_name}</span>
                  <span className="bg-slate-700 text-blue-300 text-lg px-3 py-1 rounded-md font-mono">
                    #{ligand.id}
                  </span>
                </h1>

                <div className="md:hidden flex flex-wrap gap-2 mt-4">
                  <span className="bg-indigo-900/50 text-indigo-300 text-xs font-medium px-3 py-1 rounded-full border border-indigo-800">
                    Chain: {ligand.chain_id}
                  </span>
                  <span className="bg-purple-900/50 text-purple-300 text-xs font-medium px-3 py-1 rounded-full border border-purple-800">
                    Atoms: {ligand.num_atoms}
                  </span>
                </div>
              </div>

              {/* Quick summary stats - positioned beneath the title */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 bg-slate-750 p-4 rounded-lg border border-slate-700">
                <div className="space-y-1">
                  <p className="text-xs text-gray-400">Residue Name</p>
                  <p className="font-semibold">{ligand.residue_name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-400">Chain ID</p>
                  <p className="font-semibold">{ligand.chain_id}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-400">Residue ID</p>
                  <p className="font-mono text-sm">{ligand.residue_id}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-400">Number of Atoms</p>
                  <p className="font-semibold">{ligand.num_atoms}</p>
                </div>
              </div>

              {/* Coordinates grid */}
              <div className="mt-4 bg-slate-750 p-4 rounded-lg border border-slate-700">
                <div className="flex items-center mb-3">
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
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span className="text-lg font-medium">
                    Center Coordinates
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 bg-slate-800 p-4 rounded-lg">
                  <div className="text-center">
                    <p className="font-medium text-gray-400 mb-1">X</p>
                    <p className="font-mono text-blue-300">
                      {ligand.center_x.toFixed(4)}
                    </p>
                  </div>

                  <div className="text-center">
                    <p className="font-medium text-gray-400 mb-1">Y</p>
                    <p className="font-mono text-green-300">
                      {ligand.center_y.toFixed(4)}
                    </p>
                  </div>

                  <div className="text-center">
                    <p className="font-medium text-gray-400 mb-1">Z</p>
                    <p className="font-mono text-purple-300">
                      {ligand.center_z.toFixed(4)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Binding Site Analysis Card - Show this first as it has the most relevant data */}
          {ligand.binding_site_data ? (
            <div className="bg-slate-800 rounded-xl shadow-xl border border-slate-700 overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500"></div>
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-100 flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-2 text-cyan-400"
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
                  Binding Site Analysis
                </h2>

                {/* Tabs for different views */}
                <div className="flex border-b border-slate-600 mb-6">
                  <button
                    className={`px-4 py-2 font-medium ${
                      activeTab === "summary"
                        ? "text-blue-400 border-b-2 border-blue-400"
                        : "text-gray-400 hover:text-gray-300"
                    }`}
                    onClick={() => setActiveTab("summary")}
                  >
                    Summary
                  </button>
                  <button
                    className={`px-4 py-2 font-medium ${
                      activeTab === "residues"
                        ? "text-blue-400 border-b-2 border-blue-400"
                        : "text-gray-400 hover:text-gray-300"
                    }`}
                    onClick={() => setActiveTab("residues")}
                  >
                    Residues
                  </button>
                  <button
                    className={`px-4 py-2 font-medium ${
                      activeTab === "3d"
                        ? "text-blue-400 border-b-2 border-blue-400"
                        : "text-gray-400 hover:text-gray-300"
                    }`}
                    onClick={() => setActiveTab("3d")}
                  >
                    3D View
                  </button>
                </div>

                {/* Summary Tab - Restructured for better flow */}
                {activeTab === "summary" && (
                  <div className="grid grid-cols-1 gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Key metrics - Now just a row of cards on all screen sizes */}
                      <div className="bg-slate-750 p-5 rounded-lg border border-slate-700 flex flex-col">
                        <span className="text-sm text-gray-400">
                          Binding Residues
                        </span>
                        <span className="text-2xl font-bold text-blue-400 mt-1">
                          {ligand.binding_site_data.num_binding_residues}
                        </span>
                      </div>

                      <div className="bg-slate-750 p-5 rounded-lg border border-slate-700 flex flex-col">
                        <span className="text-sm text-gray-400">
                          Average Distance
                        </span>
                        <span className="text-2xl font-bold text-green-400 mt-1">
                          {ligand.binding_site_data.avg_distance.toFixed(2)} Å
                        </span>
                      </div>

                      <div className="bg-slate-750 p-5 rounded-lg border border-slate-700 flex flex-col">
                        <span className="text-sm text-gray-400">
                          Pocket Polarity
                        </span>
                        <span className="text-2xl font-bold text-purple-400 mt-1">
                          {ligand.binding_site_data.pocket_polarity.toFixed(3)}
                        </span>
                      </div>
                    </div>

                    {/* Residue Distribution - Expanded to full width */}
                    <div className="bg-slate-750 p-5 rounded-lg border border-slate-700">
                      <h3 className="text-lg font-medium text-gray-200 mb-4">
                        Residue Distribution
                      </h3>

                      {/* Chart container */}
                      <div className="space-y-3 mt-2">
                        {Object.entries(getResidueDistribution())
                          .sort((a, b) => b[1] - a[1]) // Sort by count descending
                          .map(([residue, count]) => {
                            const percentage =
                              (Number(count) /
                                (ligand.binding_site_data
                                  ?.num_binding_residues || 1)) *
                              100;
                            const barColor =
                              residue === "TRP"
                                ? "#8B5CF6"
                                : residue === "TYR"
                                ? "#06B6D4"
                                : residue === "PHE"
                                ? "#3B82F6"
                                : residue === "CYS"
                                ? "#FBBF24"
                                : residue === "HIS"
                                ? "#F97316"
                                : residue === "VAL"
                                ? "#10B981"
                                : residue === "THR"
                                ? "#EC4899"
                                : residue === "ALA"
                                ? "#F9FAFB"
                                : residue === "LEU"
                                ? "#84CC16"
                                : "#6B7280";

                            return (
                              <div key={residue} className="flex items-center">
                                {/* Residue label */}
                                <div className="w-16 mr-2">
                                  <span
                                    className="font-mono font-medium"
                                    style={{ color: barColor }}
                                  >
                                    {residue}
                                  </span>
                                </div>

                                {/* Bar container */}
                                <div className="flex-1 h-8 bg-slate-700 rounded overflow-hidden">
                                  <div
                                    className="h-full rounded flex items-center px-3 text-xs font-semibold"
                                    style={{
                                      width: `${Math.max(percentage, 3)}%`,
                                      backgroundColor: barColor,
                                    }}
                                  >
                                    {percentage > 10 &&
                                      `${count} (${percentage.toFixed(1)}%)`}
                                  </div>
                                </div>

                                {/* Count and percentage - only show for small bars */}
                                {percentage <= 10 && (
                                  <div className="w-20 ml-2 text-right">
                                    <span className="text-xs text-gray-300">
                                      {count} ({percentage.toFixed(1)}%)
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>

                      {/* Legend */}
                      <div className="mt-4 text-xs text-gray-400 flex items-center justify-between border-t border-slate-700 pt-3">
                        <span>
                          Showing {Object.keys(getResidueDistribution()).length}{" "}
                          residue types
                        </span>
                        <span>
                          {ligand.binding_site_data.num_binding_residues} total
                          residues
                        </span>
                      </div>
                    </div>

                    {/* Distance Distribution */}
                    <div className="bg-slate-750 p-5 rounded-lg border border-slate-700">
                      <h3 className="text-lg font-medium text-gray-200 mb-4">
                        Distance Distribution
                      </h3>
                      <div className="h-12 bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 rounded-lg relative">
                        <div className="absolute top-full left-0 mt-1 text-xs text-gray-400">
                          2.5 Å
                        </div>
                        <div className="absolute top-full left-1/4 mt-1 text-xs text-gray-400">
                          3.5 Å
                        </div>
                        <div className="absolute top-full left-1/2 mt-1 text-xs text-gray-400">
                          4.0 Å
                        </div>
                        <div className="absolute top-full left-3/4 mt-1 text-xs text-gray-400">
                          4.5 Å
                        </div>
                        <div className="absolute top-full right-0 mt-1 text-xs text-gray-400">
                          5.0 Å
                        </div>

                        {/* Average distance marker */}
                        <div
                          className="absolute top-0 bottom-0 w-1 bg-white"
                          style={{
                            left: `${
                              ((ligand.binding_site_data.avg_distance - 2.5) /
                                2.5) *
                              100
                            }%`,
                            boxShadow: "0 0 8px rgba(255, 255, 255, 0.8)",
                          }}
                        ></div>
                        <div
                          className="absolute top-full w-auto text-center text-xs font-bold text-white bg-slate-700 px-1 rounded"
                          style={{
                            left: `${
                              ((ligand.binding_site_data.avg_distance - 2.5) /
                                2.5) *
                              100
                            }%`,
                            transform: "translateX(-50%)",
                            marginTop: "18px",
                          }}
                        >
                          Avg:{" "}
                          {ligand.binding_site_data.avg_distance.toFixed(2)} Å
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Residues Tab */}
                {activeTab === "residues" && (
                  <div className="bg-slate-750 p-4 rounded-lg border border-slate-700 overflow-auto max-h-96">
                    <div className="flex justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-200">
                        Binding Residues
                      </h3>
                      <span className="text-sm text-gray-400">
                        Showing{" "}
                        {ligand.binding_site_data.binding_residues.length}{" "}
                        residues
                      </span>
                    </div>
                    <table className="min-w-full divide-y divide-slate-700">
                      <thead className="bg-slate-800">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Chain
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Residue ID
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Residue Name
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Distance (Å)
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-slate-700/30 divide-y divide-slate-700">
                        {ligand.binding_site_data.binding_residues.map(
                          (residue, idx) => (
                            <tr key={idx} className="hover:bg-slate-700">
                              <td className="px-4 py-2 whitespace-nowrap text-sm">
                                {residue.chain_id}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm">
                                {residue.residue_id}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm">
                                <span
                                  className="inline-block px-2 py-1 rounded text-xs font-medium"
                                  style={{
                                    backgroundColor:
                                      residue.residue_name === "TRP"
                                        ? "rgba(139, 92, 246, 0.2)"
                                        : residue.residue_name === "TYR"
                                        ? "rgba(6, 182, 212, 0.2)"
                                        : residue.residue_name === "PHE"
                                        ? "rgba(59, 130, 246, 0.2)"
                                        : residue.residue_name === "CYS"
                                        ? "rgba(251, 191, 36, 0.2)"
                                        : residue.residue_name === "HIS"
                                        ? "rgba(249, 115, 22, 0.2)"
                                        : residue.residue_name === "VAL"
                                        ? "rgba(16, 185, 129, 0.2)"
                                        : residue.residue_name === "THR"
                                        ? "rgba(236, 72, 153, 0.2)"
                                        : residue.residue_name === "ALA"
                                        ? "rgba(249, 250, 251, 0.2)"
                                        : residue.residue_name === "LEU"
                                        ? "rgba(132, 204, 22, 0.2)"
                                        : "rgba(107, 114, 128, 0.2)",
                                    color:
                                      residue.residue_name === "TRP"
                                        ? "rgb(139, 92, 246)"
                                        : residue.residue_name === "TYR"
                                        ? "rgb(6, 182, 212)"
                                        : residue.residue_name === "PHE"
                                        ? "rgb(59, 130, 246)"
                                        : residue.residue_name === "CYS"
                                        ? "rgb(251, 191, 36)"
                                        : residue.residue_name === "HIS"
                                        ? "rgb(249, 115, 22)"
                                        : residue.residue_name === "VAL"
                                        ? "rgb(16, 185, 129)"
                                        : residue.residue_name === "THR"
                                        ? "rgb(236, 72, 153)"
                                        : residue.residue_name === "ALA"
                                        ? "rgb(249, 250, 251)"
                                        : residue.residue_name === "LEU"
                                        ? "rgb(132, 204, 22)"
                                        : "rgb(107, 114, 128)",
                                  }}
                                >
                                  {residue.residue_name}
                                </span>
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm font-mono">
                                {residue.distance < 4.0 ? (
                                  <span className="text-green-400">
                                    {residue.distance.toFixed(2)}
                                  </span>
                                ) : residue.distance < 4.5 ? (
                                  <span className="text-yellow-400">
                                    {residue.distance.toFixed(2)}
                                  </span>
                                ) : (
                                  <span className="text-red-400">
                                    {residue.distance.toFixed(2)}
                                  </span>
                                )}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* 3D View Tab */}
                {activeTab === "3d" && (
                  <div className="bg-slate-750 p-4 rounded-lg border border-slate-700">
                    <div className="mb-4 flex justify-between items-center">
                      <h3 className="text-lg font-medium text-gray-200">
                        3D Binding Site Visualization
                      </h3>
                      <span className="text-sm text-gray-400">
                        Showing {ligand.binding_site_data.num_binding_residues}{" "}
                        residues
                      </span>
                    </div>

                    {/* 3Dmol.js viewer container */}
                    <div
                      ref={viewerRef}
                      className="w-full h-96 border border-slate-700 rounded-lg bg-black"
                      style={{ position: "relative" }}
                    >
                      <div className="absolute inset-0 flex items-center justify-center">
                        <p className="text-gray-500">Loading 3D viewer...</p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {[
                        "TRP",
                        "TYR",
                        "PHE",
                        "CYS",
                        "HIS",
                        "VAL",
                        "THR",
                        "ALA",
                        "LEU",
                      ].map((residue) => {
                        const count = getResidueDistribution()[residue] || 0;
                        if (count === 0) return null;

                        return (
                          <div
                            key={residue}
                            className="flex items-center justify-between px-3 py-2 rounded"
                            style={{
                              backgroundColor:
                                residue === "TRP"
                                  ? "rgba(139, 92, 246, 0.2)"
                                  : residue === "TYR"
                                  ? "rgba(6, 182, 212, 0.2)"
                                  : residue === "PHE"
                                  ? "rgba(59, 130, 246, 0.2)"
                                  : residue === "CYS"
                                  ? "rgba(251, 191, 36, 0.2)"
                                  : residue === "HIS"
                                  ? "rgba(249, 115, 22, 0.2)"
                                  : residue === "VAL"
                                  ? "rgba(16, 185, 129, 0.2)"
                                  : residue === "THR"
                                  ? "rgba(236, 72, 153, 0.2)"
                                  : residue === "ALA"
                                  ? "rgba(249, 250, 251, 0.2)"
                                  : residue === "LEU"
                                  ? "rgba(132, 204, 22, 0.2)"
                                  : "rgba(107, 114, 128, 0.2)",
                            }}
                          >
                            <span className="font-medium">{residue}</span>
                            <span className="text-xs bg-slate-800 px-2 py-1 rounded">
                              {count}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-800 rounded-lg p-5 text-center">
              <p className="text-gray-400">
                No binding site analysis available for this ligand.
              </p>
            </div>
          )}

          {/* Binding Metrics Card - Now last since it's supplementary data */}
          {ligand.binding_metrics ? (
            <div className="bg-slate-800 rounded-xl shadow-xl border border-slate-700 overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500"></div>

              <div className="p-6">
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
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                  Binding Metrics
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Delta G */}
                  {ligand.binding_metrics["&Delta;G"] &&
                    ligand.binding_metrics["&Delta;G"].length > 0 && (
                      <div className="bg-slate-750 p-4 rounded-lg border border-slate-700">
                        <h3 className="text-lg font-medium text-blue-300 mb-3 flex items-center">
                          <span className="text-xl mr-2">ΔG</span>
                          <span className="text-sm text-gray-400">
                            (Gibbs free energy)
                          </span>
                        </h3>
                        <div className="space-y-3">
                          {ligand.binding_metrics["&Delta;G"].map(
                            (metric, idx) => (
                              <div
                                key={`dg-${idx}`}
                                className="bg-slate-700/50 p-3 rounded border border-slate-600"
                              >
                                <div className="flex justify-between items-center mb-1">
                                  <span className="font-mono text-lg text-blue-300">
                                    {metric.value.toFixed(2)}
                                  </span>
                                  <span className="text-xs bg-blue-900/30 text-blue-300 px-2 py-1 rounded">
                                    {metric.unit}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-400 flex justify-between">
                                  <span>Source: {metric.provenance}</span>
                                  {metric.link && (
                                    <a
                                      href={metric.link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-400 hover:underline"
                                    >
                                      View
                                    </a>
                                  )}
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                  {/* Delta H */}
                  {ligand.binding_metrics["&Delta;H"] &&
                    ligand.binding_metrics["&Delta;H"].length > 0 && (
                      <div className="bg-slate-750 p-4 rounded-lg border border-slate-700">
                        <h3 className="text-lg font-medium text-green-300 mb-3 flex items-center">
                          <span className="text-xl mr-2">ΔH</span>
                          <span className="text-sm text-gray-400">
                            (Enthalpy)
                          </span>
                        </h3>
                        <div className="space-y-3">
                          {ligand.binding_metrics["&Delta;H"].map(
                            (metric, idx) => (
                              <div
                                key={`dh-${idx}`}
                                className="bg-slate-700/50 p-3 rounded border border-slate-600"
                              >
                                <div className="flex justify-between items-center mb-1">
                                  <span className="font-mono text-lg text-green-300">
                                    {metric.value.toFixed(2)}
                                  </span>
                                  <span className="text-xs bg-green-900/30 text-green-300 px-2 py-1 rounded">
                                    {metric.unit}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-400 flex justify-between">
                                  <span>Source: {metric.provenance}</span>
                                  {metric.link && (
                                    <a
                                      href={metric.link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-green-400 hover:underline"
                                    >
                                      View
                                    </a>
                                  )}
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                  {/* -TΔS */}
                  {ligand.binding_metrics["-T&Delta;S"] &&
                    ligand.binding_metrics["-T&Delta;S"].length > 0 && (
                      <div className="bg-slate-750 p-4 rounded-lg border border-slate-700">
                        <h3 className="text-lg font-medium text-purple-300 mb-3 flex items-center">
                          <span className="text-xl mr-2">-TΔS</span>
                          <span className="text-sm text-gray-400">
                            (Entropy)
                          </span>
                        </h3>
                        <div className="space-y-3">
                          {ligand.binding_metrics["-T&Delta;S"].map(
                            (metric, idx) => (
                              <div
                                key={`tds-${idx}`}
                                className="bg-slate-700/50 p-3 rounded border border-slate-600"
                              >
                                <div className="flex justify-between items-center mb-1">
                                  <span className="font-mono text-lg text-purple-300">
                                    {metric.value.toFixed(2)}
                                  </span>
                                  <span className="text-xs bg-purple-900/30 text-purple-300 px-2 py-1 rounded">
                                    {metric.unit}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-400 flex justify-between">
                                  <span>Source: {metric.provenance}</span>
                                  {metric.link && (
                                    <a
                                      href={metric.link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-purple-400 hover:underline"
                                    >
                                      View
                                    </a>
                                  )}
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                  {/* IC50 */}
                  {ligand.binding_metrics["IC50"] &&
                    ligand.binding_metrics["IC50"].length > 0 && (
                      <div className="bg-slate-750 p-4 rounded-lg border border-slate-700">
                        <h3 className="text-lg font-medium text-orange-300 mb-3 flex items-center">
                          <span className="text-xl mr-2">IC50</span>
                          <span className="text-sm text-gray-400">
                            (Inhibitory concentration)
                          </span>
                        </h3>
                        <div className="space-y-3">
                          {ligand.binding_metrics["IC50"].map((metric, idx) => (
                            <div
                              key={`ic50-${idx}`}
                              className="bg-slate-700/50 p-3 rounded border border-slate-600"
                            >
                              <div className="flex justify-between items-center mb-1">
                                <span className="font-mono text-lg text-orange-300">
                                  {metric.value.toFixed(1)}
                                </span>
                                <span className="text-xs bg-orange-900/30 text-orange-300 px-2 py-1 rounded">
                                  {metric.unit}
                                </span>
                              </div>
                              <div className="text-xs text-gray-400 flex justify-between">
                                <span>Source: {metric.provenance}</span>
                                {metric.link && (
                                  <a
                                    href={metric.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-orange-400 hover:underline"
                                  >
                                    View
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-800 rounded-xl shadow-xl border border-slate-700 overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500"></div>

              <div className="p-6">
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
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                  Binding Metrics
                </h2>
                <p className="text-gray-400">
                  No binding metrics data available for this ligand.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/3Dmol/2.0.1/3Dmol-min.js"
        onLoad={() => {
          window.dispatchEvent(new Event("3DmolLoaded"));
        }}
      />
    </div>
  );
}
