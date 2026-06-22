"use client";

import { useState, useEffect } from "react";
import type { AdminQuestion, AdminCollection, QuestionType, Formula, Translation, TranslationRef } from "@/lib/api";
import TranslationField from "../components/TranslationField";
import CollectionSelector from "../collections/CollectionSelector";
import QuestionTypeSpecificParams from "./QuestionTypeSpecificParams";
import InlineCollectionCreator from "./InlineCollectionCreator";
import FormulaEditorPopup from "../components/FormulaEditorPopup";

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
  noForm?: boolean;
};

export default function QuestionForm({
  question,
  collections,
  accessToken,
  userOrgId,
  onSave,
  onCancel,
  onCollectionCreated,
  noForm,
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
  const [valueType, setValueType] = useState<string | undefined>(
    question?.value_type,
  );
  const [localCollections, setLocalCollections] = useState(collections);
  const [formulasInCollection, setFormulasInCollection] = useState<Formula[]>([]);
  const [editingFormulaId, setEditingFormulaId] = useState<string | null>(null);
  const [showInlineCreator, setShowInlineCreator] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [allTranslations, setAllTranslations] = useState<Translation[]>([]);
  const [titleTranslation, setTitleTranslation] = useState<TranslationRef | null>(null);
  const [descriptionTranslation, setDescriptionTranslation] = useState<TranslationRef | null>(null);

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
        value_type: valueType,
        translations: [titleTranslation, descriptionTranslation].filter((t): t is TranslationRef => t !== null),
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

  async function refreshFormulas() {
    if (!collectionId) return;
    try {
      const res = await fetch(
        `/api/admin/formulas?collection_id=${encodeURIComponent(collectionId)}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (res.ok) {
        const data = (await res.json()) as Formula[];
        setFormulasInCollection(data);
      }
    } catch {
      /* silently ignore */
    }
  }

  useEffect(() => {
    if (!collectionId) return;
    fetch(`/api/admin/translations?collection_id=${encodeURIComponent(collectionId)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Translation[]) => setAllTranslations(data))
      .catch(() => setAllTranslations([]));
  }, [collectionId, accessToken]);

  useEffect(() => {
    refreshFormulas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionId, accessToken]);

  function handleCollectionCreated(created: AdminCollection) {
    setLocalCollections((prev) => [...prev, created]);
    setCollectionId(created.collection_id);
    setShowInlineCreator(false);
    onCollectionCreated?.(created);
  }

  function renderContent() {
    return (
      <>
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

      {collectionId && (
        <>
          <TranslationField
            label="Title"
            collectionId={collectionId}
            entitySymbol={symbol.trim() || question?.question_symbol || ''}
            accessToken={accessToken}
            value={titleTranslation ?? undefined}
            onChange={(ref) => setTitleTranslation(ref)}
            translations={allTranslations}
          />
          <TranslationField
            label="Description"
            collectionId={collectionId}
            entitySymbol={symbol.trim() || question?.question_symbol || ''}
            accessToken={accessToken}
            value={descriptionTranslation ?? undefined}
            onChange={(ref) => setDescriptionTranslation(ref)}
            translations={allTranslations}
          />
        </>
      )}

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
            valueType={valueType}
          />
          {fieldErrors.parameters && (
            <p className="inline-error" role="alert">
              {fieldErrors.parameters}
            </p>
          )}
        </div>
      )}

      {/* Section 4: Value Type (for formula usage) */}
      <div className="form-group">
        <label>Value Type</label>
        <p className="form-group-note">
          Set how this question's value is treated in formulas.
          Range questions are automatically treated as numbers.
        </p>
        <div className="formula-output-type-group">
          <label>
            <input
              type="radio"
              name="value-type"
              value=""
              checked={valueType === undefined}
              onChange={() => setValueType(undefined)}
            />
            Auto-detect
          </label>
          <label>
            <input
              type="radio"
              name="value-type"
              value="number"
              checked={valueType === 'number'}
              onChange={() => setValueType('number')}
            />
            Number
          </label>
          <label>
            <input
              type="radio"
              name="value-type"
              value="boolean"
              checked={valueType === 'boolean'}
              onChange={() => setValueType('boolean')}
            />
            Boolean
          </label>
          <label>
            <input
              type="radio"
              name="value-type"
              value="string"
              checked={valueType === 'string'}
              onChange={() => setValueType('string')}
            />
            String
          </label>
        </div>
      </div>

      {/* Section 5: Visibility Condition */}
      <div className="form-group">
        <label>Visibility Condition</label>
        <div className="collection-selector-row">
          <select
            className="collection-selector"
            value={conditionFormulaId ?? ""}
            onChange={(e) =>
              setConditionFormulaId(e.target.value || undefined)
            }
          >
            <option value="">-- None --</option>
            {formulasInCollection.map((f) => (
              <option key={f.formula_id} value={f.formula_id}>
                {f.symbol} ({f.output_type})
              </option>
            ))}
          </select>
          {conditionFormulaId && (
            <button
              type="button"
              className="btn-secondary btn-small"
              onClick={() => setEditingFormulaId(conditionFormulaId)}
            >
              Edit
            </button>
          )}
          {collectionId && (
            <button
              type="button"
              className="btn-secondary btn-small"
              onClick={() => setEditingFormulaId("__new__")}
            >
              + New Formula
            </button>
          )}
        </div>
        {editingFormulaId && (
          <FormulaEditorPopup
            formula={
              editingFormulaId === "__new__"
                ? undefined
                : formulasInCollection.find(
                    (f) => f.formula_id === editingFormulaId,
                  )
            }
            collectionId={collectionId ?? ""}
            accessToken={accessToken}
            onSave={(saved) => {
              setConditionFormulaId(saved.formula_id);
              setEditingFormulaId(null);
              refreshFormulas();
            }}
            onCancel={() => setEditingFormulaId(null)}
          />
        )}
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
        <button type={noForm ? "button" : "submit"} className="btn-primary" disabled={saving} onClick={noForm ? handleSubmit : undefined}>
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
      </>
    );
  }

  return noForm ? (
    <div className="collection-form">
      {renderContent()}
    </div>
  ) : (
    <form className="collection-form" onSubmit={handleSubmit} noValidate>
      {renderContent()}
    </form>
  );
}
