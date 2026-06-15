"use client";

import { useState } from "react";
import type { SimulationInput, SimulatedObject } from "@/lib/api";

interface ConfigPanelProps {
  input: SimulationInput;
  onChange: (input: SimulationInput) => void;
  loading: boolean;
  onLoadingChange: (loading: boolean) => void;
  onError: (error: string | null) => void;
  onResults: (results: SimulatedObject[]) => void;
}

export function SimulationConfigPanel({
  input,
  onChange,
  loading,
  onLoadingChange,
  onError,
  onResults,
}: ConfigPanelProps) {
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  function updateShape(updates: Partial<SimulationInput["shape"]>) {
    onChange({
      ...input,
      shape: { ...input.shape, ...updates },
    });
  }

  function updatePosition(updates: Partial<SimulationInput["position"]>) {
    onChange({
      ...input,
      position: { ...input.position, ...updates },
    });
  }

  function validate(): boolean {
    const errs: string[] = [];
    if (input.shape.type === "circle" && input.shape.radius <= 0) {
      errs.push("Radius must be greater than 0");
    }
    if (!/^#[0-9A-Fa-f]{6}$/.test(input.color)) {
      errs.push("Color must be a valid hex code (e.g. #FF0000)");
    }
    if (!Number.isFinite(input.position.x)) errs.push("X must be a number");
    if (!Number.isFinite(input.position.y)) errs.push("Y must be a number");
    if (!Number.isFinite(input.position.angle)) errs.push("Angle must be a number");
    setValidationErrors(errs);
    return errs.length === 0;
  }

  async function handleSimulate() {
    onError(null);
    if (!validate()) return;

    onLoadingChange(true);
    try {
      const res = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error((data as { error?: string }).error ?? "Simulation failed");
      }
      onResults((data as { results: SimulatedObject[] }).results);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Simulation failed");
    } finally {
      onLoadingChange(false);
    }
  }

  const shape = input.shape.type === "circle" ? input.shape : null;
  const pos = input.position;

  return (
    <div className="card">
      <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>Configuration</h2>

      {/* Shape type */}
      <fieldset style={{ border: "none", padding: 0, marginBottom: "1rem" }}>
        <legend style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: "0.25rem" }}>
          Shape
        </legend>
        <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.25rem" }}>
          <input
            type="radio"
            name="shapeType"
            checked={input.shape.type === "circle"}
            onChange={() => onChange({ ...input, shape: { type: "circle", radius: 50 } })}
          />
          Circle
        </label>
        {shape && (
          <div style={{ marginTop: "0.5rem", marginLeft: "1.5rem" }}>
            <label style={{ fontSize: "0.8rem", color: "#374151" }}>
              Radius:
              <input
                type="number"
                min={1}
                max={500}
                value={shape.radius}
                onChange={(e) =>
                  updateShape({ radius: parseInt(e.target.value, 10) || 0 })
                }
                style={{
                  width: "80px",
                  marginLeft: "0.5rem",
                  padding: "0.25rem 0.5rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.25rem",
                }}
              />
            </label>
          </div>
        )}
      </fieldset>

      {/* Color */}
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ fontWeight: 600, fontSize: "0.85rem", display: "block", marginBottom: "0.25rem" }}>
          Color
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <input
            type="text"
            value={input.color}
            onChange={(e) => onChange({ ...input, color: e.target.value })}
            placeholder="#FF0000"
            maxLength={7}
            style={{
              width: "100px",
              padding: "0.25rem 0.5rem",
              border: "1px solid #d1d5db",
              borderRadius: "0.25rem",
              fontFamily: "monospace",
            }}
          />
          <span
            style={{
              display: "inline-block",
              width: 24,
              height: 24,
              borderRadius: "50%",
              background: /^#[0-9A-Fa-f]{6}$/.test(input.color)
                ? input.color
                : "#ccc",
              border: "1px solid #d1d5db",
            }}
            title="Color preview"
          />
        </div>
      </div>

      {/* Position */}
      <fieldset style={{ border: "none", padding: 0, marginBottom: "1rem" }}>
        <legend style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: "0.25rem" }}>
          Position
        </legend>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <label style={{ fontSize: "0.8rem", color: "#374151" }}>
            X:
            <input
              type="number"
              value={pos.x}
              onChange={(e) => updatePosition({ x: parseFloat(e.target.value) || 0 })}
              style={{
                width: "80px",
                marginLeft: "0.35rem",
                padding: "0.25rem 0.5rem",
                border: "1px solid #d1d5db",
                borderRadius: "0.25rem",
              }}
            />
          </label>
          <label style={{ fontSize: "0.8rem", color: "#374151" }}>
            Y:
            <input
              type="number"
              value={pos.y}
              onChange={(e) => updatePosition({ y: parseFloat(e.target.value) || 0 })}
              style={{
                width: "80px",
                marginLeft: "0.35rem",
                padding: "0.25rem 0.5rem",
                border: "1px solid #d1d5db",
                borderRadius: "0.25rem",
              }}
            />
          </label>
          <label style={{ fontSize: "0.8rem", color: "#374151" }}>
            Angle:
            <input
              type="number"
              min={0}
              max={360}
              value={pos.angle}
              onChange={(e) => updatePosition({ angle: parseFloat(e.target.value) || 0 })}
              style={{
                width: "80px",
                marginLeft: "0.35rem",
                padding: "0.25rem 0.5rem",
                border: "1px solid #d1d5db",
                borderRadius: "0.25rem",
              }}
            />
          </label>
        </div>
      </fieldset>

      {/* Rules (placeholder) */}
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ fontWeight: 600, fontSize: "0.85rem", display: "block", marginBottom: "0.25rem" }}>
          Rules
        </label>
        <p style={{ fontSize: "0.78rem", color: "#9ca3af", fontStyle: "italic" }}>
          Rules support coming in a future update. Simulation will run with default behavior.
        </p>
      </div>

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <div className="error-message" style={{ marginBottom: "0.75rem" }}>
          {validationErrors.map((e, i) => (
            <div key={i}>{e}</div>
          ))}
        </div>
      )}

      {/* Play button */}
      <button
        className="btn-primary"
        onClick={handleSimulate}
        disabled={loading}
        style={{ minWidth: "150px" }}
      >
        {loading ? (
          <span style={{ display: "flex", alignItems: "center", gap: "0.4rem", justifyContent: "center" }}>
            <span
              style={{
                display: "inline-block",
                width: 14,
                height: 14,
                border: "2px solid rgba(255,255,255,0.3)",
                borderTopColor: "#fff",
                borderRadius: "50%",
                animation: "spin 0.6s linear infinite",
              }}
            />
            Simulating...
          </span>
        ) : (
          "\u25B6 Simulate"
        )}
      </button>
    </div>
  );
}
