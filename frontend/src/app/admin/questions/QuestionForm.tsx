"use client";

import { useState } from "react";
import type { AdminQuestion, AdminCollection, QuestionType } from "@/lib/api";
import CollectionSelector from "../collections/CollectionSelector";
import QuestionTypeSpecificParams from "./QuestionTypeSpecificParams";
import InlineCollectionCreator from "./InlineCollectionCreator";

const QUESTION_TYPE_OPTIONS: { value: QuestionType; label: string }[] = [
  { value: "free-text", label: "Free-text" },
  { value: "range", label: "Range" },
  { value: "select", label: "Select" },
  { value: "multiselect", label: "Multi-select" },
  { value: "radio", label: "Radio" },
];

type QuestionFormProps = {
  question?: AdminQuestion;
  collections: AdminCollection[];
  accessToken: string;
  userOrgId?: string;
  onSave: () => void;
  onCancel: () => void;
  onCollectionCreated?: (collection: AdminCollection) => void;
};

export default function QuestionForm({
  question,
  collections,
  accessToken,
  userOrgId,
  onSave,
  onCancel,
  onCollectionCreated,
}: QuestionFormProps) {
  const isEdit = !!question;
  const [symbol, setSymbol] = useState(question?.question_symbol ?? "");
  const [collectionId, setCollectionId] = useState<string | undefined>(
    question?.collection_id,
  );
  const [type, setType] = useState<QuestionType | undefined>(question?.type);
  const [parameters, setParameters] = useState<Record<string, unknown>>(
    question?.parameters ?? {},
  );
  const [conditionFormulaId, setConditionFormulaId] = useState<
    string | undefined
  >(question?.condition_formula_id);
  const [localCollections, setLocalCollections] = useState(collections);
  const [showInlineCreator, setShowInlineCreator] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const errors: Record<string, string> = {};
    const trimmed = symbol.trim();
    if (!trimmed) {
      errors.symbol = "Question symbol is required";
    } else if (trimmed.length < 2) {
      errors.symbol = "Question symbol must be at least 2 characters";
    } else if (trimmed.length > 100) {
      errors.symbol = "Question symbol must be 100 characters or fewer";
    } else if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      errors.symbol =
        "Question symbol may only contain letters, numbers, and underscores";
    }

    if (!collectionId) {
      errors.collectionId = "Collection is required";
    }

    if (!type) {
      errors.type = "Question type is required";
    }

    if (type === "select" || type === "multiselect" || type === "radio") {
      const options = parameters.options as
        | { label: string; value: string; order_index: number }[]
        | undefined;
      if (!options || options.length < 2) {
        errors.parameters =
          "At least 2 options are required for this question type";
      }
    }

    if (type === "range") {
      const min = parameters.min as number | undefined;
      const max = parameters.max as number | undefined;
      if (
        min === undefined ||
        max === undefined ||
        typeof min !== "number" ||
        typeof max !== "number"
      ) {
        errors.parameters = "Min and max must be valid numbers";
      } else if (min >= max) {
        errors.parameters = "Min must be less than max";
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!validate()) return;

    setSaving(true);
    setError(null);

    try {
      const body: Record<string, unknown> = {
        question_symbol: symbol.trim(),
        collection_id: collectionId,
        type,
        version: question?.version ?? 1,
        parameters,
        condition_formula_id: conditionFormulaId,
        translations: question?.translations ?? [],
      };

      const url = isEdit
        ? `/api/admin/questions/${question.question_id}`
        : "/api/admin/questions";

      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed with status ${res.status}`);
      }

      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  }

  function handleTypeChange(newType: QuestionType) {
    setType(newType);
    setParameters({});
  }

  function handleCollectionCreated(created: AdminCollection) {
    setLocalCollections((prev) => [...prev, created]);
    setCollectionId(created.collection_id);
    setShowInlineCreator(false);
    onCollectionCreated?.(created);
  }

  return (
    <form className="collection-form" onSubmit={handleSubmit} noValidate>
      <h3>{isEdit ? "Edit Question" : "Create Question"}</h3>

      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}

      {/* Section 1: Common Parameters */}
      <div className="form-group">
        <label htmlFor="question-symbol">Question Symbol</label>
        <input
          id="question-symbol"
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          placeholder="e.g. annual_revenue"
          maxLength={100}
          pattern="[a-zA-Z0-9_]+"
          aria-invalid={!!fieldErrors.symbol}
          aria-describedby={fieldErrors.symbol ? "symbol-error" : undefined}
        />
        {fieldErrors.symbol && (
          <p className="inline-error" id="symbol-error" role="alert">
            {fieldErrors.symbol}
          </p>
        )}
      </div>

      <div className="form-group">
        <label>Collection</label>
        <div className="collection-selector-row">
          <CollectionSelector
            collections={localCollections}
            selectedId={collectionId}
            onChange={setCollectionId}
          />
          <button
            type="button"
            className="btn-secondary btn-small btn-new-collection"
            onClick={() => setShowInlineCreator(true)}
          >
            + New Collection
          </button>
        </div>
        {fieldErrors.collectionId && (
          <p className="inline-error" role="alert">
            {fieldErrors.collectionId}
          </p>
        )}
      </div>

      <div className="form-group">
        <button
          type="button"
          className="btn-secondary btn-small"
          disabled
          title="Coming soon"
        >
          Translations
        </button>
      </div>

      {/* Section 2: Type Selector */}
      <div className="form-group">
        <label>Question Type</label>
        <div className="question-type-selector">
          {QUESTION_TYPE_OPTIONS.map((opt) => (
            <label key={opt.value} className="question-type-option">
              <input
                type="radio"
                name="question-type"
                value={opt.value}
                checked={type === opt.value}
                onChange={() => handleTypeChange(opt.value)}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
        {fieldErrors.type && (
          <p className="inline-error" role="alert">
            {fieldErrors.type}
          </p>
        )}
      </div>

      {/* Section 3: Type-Specific Parameters */}
      {type && (
        <div className="form-group">
          <h4>Type Parameters</h4>
          <QuestionTypeSpecificParams
            type={type}
            parameters={parameters}
            onChange={setParameters}
          />
          {fieldErrors.parameters && (
            <p className="inline-error" role="alert">
              {fieldErrors.parameters}
            </p>
          )}
        </div>
      )}

      {/* Section 4: Visibility Condition */}
      <div className="form-group">
        <label htmlFor="condition-formula">Visibility Condition</label>
        <div className="collection-selector-row">
          <select
            id="condition-formula"
            className="collection-selector"
            value={conditionFormulaId ?? ""}
            onChange={(e) =>
              setConditionFormulaId(e.target.value || undefined)
            }
          >
            <option value="">-- None --</option>
            <option value="placeholder-1" disabled>
              Formula 1 (coming soon)
            </option>
            <option value="placeholder-2" disabled>
              Formula 2 (coming soon)
            </option>
          </select>
          <button
            type="button"
            className="btn-secondary btn-small"
            disabled
            title="Coming soon"
          >
            Edit Formula
          </button>
        </div>
      </div>

      {/* Section 5: Form Actions */}
      <div className="form-actions">
        <button
          type="button"
          className="btn-secondary"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Saving..." : isEdit ? "Update" : "Create"}
        </button>
      </div>

      {/* Inline Collection Creator Modal */}
      {showInlineCreator && (
        <InlineCollectionCreator
          accessToken={accessToken}
          userOrgId={userOrgId}
          onCreated={handleCollectionCreated}
          onCancel={() => setShowInlineCreator(false)}
        />
      )}
    </form>
  );
}
