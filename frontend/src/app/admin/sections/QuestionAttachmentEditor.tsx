"use client";

import { useMemo } from 'react';
import type { AdminQuestion, AdminCollection, SectionQuestion } from '@/lib/api';

type QuestionAttachmentEditorProps = {
  questions: AdminQuestion[];
  collections: AdminCollection[];
  sectionQuestions: SectionQuestion[];
  onChange: (updated: SectionQuestion[]) => void;
};

export default function QuestionAttachmentEditor({
  questions,
  collections,
  sectionQuestions,
  onChange,
}: QuestionAttachmentEditorProps) {
  const attachedSymbols = useMemo(
    () => new Set(sectionQuestions.map((sq) => sq.question_symbol)),
    [sectionQuestions],
  );

  const availableQuestions = useMemo(
    () =>
      questions
        .filter((q) => !attachedSymbols.has(q.question_symbol))
        .sort((a, b) => a.question_symbol.localeCompare(b.question_symbol)),
    [questions, attachedSymbols],
  );

  const questionsByCollection = useMemo(() => {
    const map = new Map<string, AdminQuestion[]>();
    for (const q of availableQuestions) {
      const colId = q.collection_id;
      if (!map.has(colId)) map.set(colId, []);
      map.get(colId)!.push(q);
    }
    return map;
  }, [availableQuestions]);

  const sortedCollections = useMemo(
    () =>
      [...collections].sort((a, b) =>
        a.collection_symbol.localeCompare(b.collection_symbol),
      ),
    [collections],
  );

  function handleAdd(e: React.ChangeEvent<HTMLSelectElement>) {
    const selectedSymbol = e.target.value;
    if (!selectedSymbol) return;

    const maxOrder = sectionQuestions.reduce(
      (max, sq) => Math.max(max, sq.order_number),
      -1,
    );

    const selectedQuestion = questions.find(
      (q) => q.question_symbol === selectedSymbol,
    );
    const newQuestion: SectionQuestion = {
      question_symbol: selectedSymbol,
      version_number: selectedQuestion?.version ?? 1,
      order_number: maxOrder + 1,
      required: false,
    };

    onChange([...sectionQuestions, newQuestion]);
  }

  function handleRemove(symbol: string) {
    onChange(sectionQuestions.filter((sq) => sq.question_symbol !== symbol));
  }

  function handleOrderChange(symbol: string, value: string) {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 0) return;
    onChange(
      sectionQuestions.map((sq) =>
        sq.question_symbol === symbol ? { ...sq, order_number: num } : sq,
      ),
    );
  }

  function handleRequiredToggle(symbol: string) {
    onChange(
      sectionQuestions.map((sq) =>
        sq.question_symbol === symbol
          ? { ...sq, required: !sq.required }
          : sq,
      ),
    );
  }

  function handleMoveUp(index: number) {
    if (index <= 0) return;
    const updated = [...sectionQuestions];
    const temp = updated[index].order_number;
    updated[index] = {
      ...updated[index],
      order_number: updated[index - 1].order_number,
    };
    updated[index - 1] = {
      ...updated[index - 1],
      order_number: temp,
    };
    onChange(updated);
  }

  function handleMoveDown(index: number) {
    if (index >= sectionQuestions.length - 1) return;
    const updated = [...sectionQuestions];
    const temp = updated[index].order_number;
    updated[index] = {
      ...updated[index],
      order_number: updated[index + 1].order_number,
    };
    updated[index + 1] = {
      ...updated[index + 1],
      order_number: temp,
    };
    onChange(updated);
  }

  const sortedQuestions = [...sectionQuestions].sort(
    (a, b) => a.order_number - b.order_number,
  );

  return (
    <div className="question-attachment-editor">
      <div className="question-attachment-header">
        <span>Attached Questions</span>
        <span className="question-attachment-count">
          {sectionQuestions.length}
        </span>
      </div>

      {sectionQuestions.length === 0 && (
        <div className="question-attachment-empty">
          No questions attached yet.
        </div>
      )}

      {sortedQuestions.map((sq, index) => (
        <div key={sq.question_symbol} className="question-attachment-row">
          <div className="question-attachment-reorder">
            <button
              type="button"
              className="btn-secondary btn-small"
              disabled={index === 0}
              onClick={() => handleMoveUp(index)}
              aria-label={`Move ${sq.question_symbol} up`}
            >
              ▲
            </button>
            <button
              type="button"
              className="btn-secondary btn-small"
              disabled={index === sectionQuestions.length - 1}
              onClick={() => handleMoveDown(index)}
              aria-label={`Move ${sq.question_symbol} down`}
            >
              ▼
            </button>
          </div>

          <div className="question-attachment-fields">
            <input
              type="number"
              className="question-attachment-order"
              value={sq.order_number}
              min={0}
              onChange={(e) => handleOrderChange(sq.question_symbol, e.target.value)}
              aria-label={`Order for ${sq.question_symbol}`}
            />
            <span className="question-attachment-symbol">
              {sq.question_symbol}
            </span>
            <label className="question-attachment-required">
              <input
                type="checkbox"
                checked={sq.required}
                onChange={() => handleRequiredToggle(sq.question_symbol)}
              />
              Required
            </label>
          </div>

          <button
            type="button"
            className="btn-danger btn-small"
            onClick={() => handleRemove(sq.question_symbol)}
            aria-label={`Remove ${sq.question_symbol}`}
          >
            Remove
          </button>
        </div>
      ))}

      {availableQuestions.length > 0 && (
        <div className="question-attachment-add">
          <select
            defaultValue=""
            onChange={handleAdd}
            aria-label="Add question"
          >
            <option value="" disabled>
              -- Select a question --
            </option>
            {sortedCollections.map((col) => {
              const colQuestions = questionsByCollection.get(col.collection_id);
              if (!colQuestions || colQuestions.length === 0) return null;
              return (
                <optgroup key={col.collection_id} label={col.collection_symbol}>
                  {colQuestions.map((q) => (
                    <option key={q.question_id} value={q.question_symbol}>
                      {q.question_symbol}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
          <button
            type="button"
            className="btn-primary btn-small"
            disabled
            title="Select a question from the dropdown first"
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
}
