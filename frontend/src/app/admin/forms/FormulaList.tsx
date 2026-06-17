"use client";

import { useEffect, useState, useCallback } from 'react';
import type { Formula } from '@/lib/api';
import { astToHumanReadable } from '@/lib/formula/astConverter';
import FormulaEditorPopup from '../components/FormulaEditorPopup';

type FormulaListProps = {
  formulaIds: string[];
  collectionId: string;
  accessToken: string;
  readOnly?: boolean;
  onChange: (formulaIds: string[]) => void;
};

export default function FormulaList({
  formulaIds,
  collectionId,
  accessToken,
  readOnly,
  onChange,
}: FormulaListProps) {
  const [allFormulas, setAllFormulas] = useState<Formula[]>([]);
  const [showPopup, setShowPopup] = useState(false);
  const [editingFormula, setEditingFormula] = useState<Formula | undefined>(
    undefined,
  );
  const [fetchError, setFetchError] = useState<string | null>(null);

  const formulas = allFormulas.filter((f) =>
    formulaIds.includes(f.formula_id),
  );

  const fetchFormulas = useCallback(async () => {
    if (!collectionId) return;
    try {
      const res = await fetch(
        `/api/admin/formulas?collection_id=${encodeURIComponent(collectionId)}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!res.ok)
        throw new Error(`Failed to fetch formulas (${res.status})`);
      const data = (await res.json()) as Formula[];
      setAllFormulas(data);
      setFetchError(null);
    } catch (err) {
      setFetchError(
        err instanceof Error ? err.message : 'Failed to fetch formulas',
      );
    }
  }, [collectionId, accessToken]);

  useEffect(() => {
    fetchFormulas();
  }, [fetchFormulas]);

  function handleNewFormula() {
    setEditingFormula(undefined);
    setShowPopup(true);
  }

  function handleEditFormula(f: Formula) {
    setEditingFormula(f);
    setShowPopup(true);
  }

  function handleRemoveFormula(id: string) {
    onChange(formulaIds.filter((fid) => fid !== id));
  }

  function handlePopupSave(saved: Formula) {
    setShowPopup(false);
    setEditingFormula(undefined);
    setAllFormulas((prev) => {
      const idx = prev.findIndex((f) => f.formula_id === saved.formula_id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = saved;
        return updated;
      }
      return [...prev, saved];
    });
    if (!formulaIds.includes(saved.formula_id)) {
      onChange([...formulaIds, saved.formula_id]);
    }
    fetchFormulas();
  }

  function handlePopupCancel() {
    setShowPopup(false);
    setEditingFormula(undefined);
  }

  return (
    <div>
      <div className="formula-list-header">
        <h4>Formulas ({formulas.length})</h4>
        {!readOnly && (
          <button
            type="button"
            className="btn-secondary btn-small"
            onClick={handleNewFormula}
          >
            + New Formula
          </button>
        )}
      </div>

      {fetchError && (
        <div className="error-message" role="alert" style={{ marginBottom: '0.5rem' }}>
          {fetchError}
        </div>
      )}

      {formulas.length === 0 && !fetchError && (
        <div className="formula-empty-state">
          No formulas defined for this form.
        </div>
      )}

      {formulas.map((f) => (
        <div key={f.formula_id} className="formula-list-item">
          <span className="formula-list-item-symbol">{f.symbol}</span>
          <span className="badge" style={{ marginRight: '0.5rem' }}>
            {f.output_type}
          </span>
          <span className="formula-list-item-expression">
            {astToHumanReadable(f.expression)}
          </span>
          {!readOnly && (
            <div className="formula-list-item-actions">
              <button
                type="button"
                className="btn-secondary btn-small"
                onClick={() => handleEditFormula(f)}
              >
                Edit
              </button>
              <button
                type="button"
                className="btn-danger btn-small"
                onClick={() => handleRemoveFormula(f.formula_id)}
              >
                Remove
              </button>
            </div>
          )}
        </div>
      ))}

      {showPopup && (
        <FormulaEditorPopup
          formula={editingFormula}
          collectionId={collectionId}
          accessToken={accessToken}
          onSave={handlePopupSave}
          onCancel={handlePopupCancel}
        />
      )}
    </div>
  );
}
