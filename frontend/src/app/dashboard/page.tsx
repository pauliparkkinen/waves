"use client";

import { useState } from "react";
import type { SimulationInput, SimulatedObject } from "@/lib/api";
import { SimulationConfigPanel } from "./components/SimulationConfigPanel";
import { SvgViewer } from "./components/SvgViewer";

/** Default simulation parameters */
const DEFAULT_INPUT: SimulationInput = {
  shape: { type: "circle", radius: 50 },
  color: "#2563eb",
  position: { x: 100, y: 100, angle: 0 },
  rules: [],
};

export default function DashboardPage() {
  const [input, setInput] = useState<SimulationInput>(DEFAULT_INPUT);
  const [results, setResults] = useState<SimulatedObject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <h1>Waves</h1>
      <p style={{ color: "#6b7280", marginBottom: "1.5rem" }}>
        Markov-chain simulation visualizer
      </p>

      <SimulationConfigPanel
        input={input}
        onChange={setInput}
        loading={loading}
        onLoadingChange={setLoading}
        onError={setError}
        onResults={setResults}
      />

      {error && (
        <div className="error-message" style={{ marginTop: "1rem" }}>
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="card" style={{ marginTop: "1.5rem", padding: "0.75rem" }}>
          <p style={{ fontSize: "0.8rem", color: "#6b7280", marginBottom: "0.5rem" }}>
            {results.length} object{results.length !== 1 ? "s" : ""} rendered
          </p>
          <SvgViewer objects={results} />
        </div>
      )}

      {results.length === 0 && !loading && !error && (
        <div
          className="card"
          style={{ marginTop: "1.5rem", textAlign: "center", padding: "3rem" }}
        >
          <p style={{ color: "#6b7280" }}>
            Configure parameters and click <strong>Simulate</strong> to see the result.
          </p>
        </div>
      )}
    </>
  );
}
