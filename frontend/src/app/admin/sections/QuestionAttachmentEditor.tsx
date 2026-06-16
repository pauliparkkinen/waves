"use client";

import { useMemo, useState } from 'react';
import type { AdminQuestion, AdminCollection, SectionQuestion } from '@/lib/api';
import InlineQuestionCreator from './InlineQuestionCreator';

type QuestionAttachmentEditorProps = {
  questions: AdminQuestion[];
  collections: AdminCollection[];
  sectionQuestions: SectionQuestion[];
  onChange: (updated: SectionQuestion[]) => void;
  userOrgId?: string;
  accessToken?: string;
  onQuestionCreated?: (question: AdminQuestion) => void;
};

export default function QuestionAttachmentEditor({
  questions,
  collections,
  sectionQuestions,
  onChange,
  userOrgId,
  accessToken,
  onQuestionCreated,
}: QuestionAttachmentEditorProps) {
  const [showQuestionCreator, setShowQuestionCreator] = useState(false);
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

  const [selectedAddSymbol, setSelectedAddSymbol] = useState('');

  const sortedCollections = useMemo(
    () =>
      [...collections].sort((a, b) =>
        a.collection_symbol.localeCompare(b.collection_symbol),
      ),
    [collections],
  );

  function handleAddButton() {
    if (!selectedAddSymbol) return;

    const maxOrder = sectionQuestions.reduce(
      (max, sq) => Math.max(max, sq.order_number),
      -1,
    );

    const selectedQuestion = questions.find(
      (q) => q.question_symbol === selectedAddSymbol,
    );
    const newQuestion: SectionQuestion = {
      question_symbol: selectedAddSymbol,
      version_number: selectedQuestion?.version ?? 1,
      order_number: maxOrder + 1,
      required: false,
    };

    onChange([...sectionQuestions, newQuestion]);
    setSelectedAddSymbol('');
  }

  function handleRemove(symbol: string) {
    onChange(sectionQuestions.filter((sq) => sq.question_symbol !== symbol));
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

  function handleMoveUp(sortedIndex: number) {
    if (sortedIndex <= 0) return;
    const current = sortedQuestions[sortedIndex];
    const above = sortedQuestions[sortedIndex - 1];

    const updated = sectionQuestions.map((sq) => {
      if (sq.question_symbol === current.question_symbol) {
        return { ...sq, order_number: sortedIndex - 1 };
      }
      if (sq.question_symbol === above.question_symbol) {
        return { ...above, order_number: sortedIndex };
      }
      return sq;
    });
    onChange(updated);
  }

  function handleMoveDown(sortedIndex: number) {
    if (sortedIndex >= sortedQuestions.length - 1) return;
    const current = sortedQuestions[sortedIndex];
    const below = sortedQuestions[sortedIndex + 1];

    const updated = sectionQuestions.map((sq) => {
      if (sq.question_symbol === current.question_symbol) {
        return { ...sq, order_number: sortedIndex + 1 };
      }
      if (sq.question_symbol === below.question_symbol) {
        return { ...below, order_number: sortedIndex };
      }
      return sq;
    });
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
              disabled={index === sortedQuestions.length - 1}
              onClick={() => handleMoveDown(index)}
              aria-label={`Move ${sq.question_symbol} down`}
            >
              ▼
            </button>
          </div>

          <div className="question-attachment-fields">
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
            value={selectedAddSymbol}
            onChange={(e) => setSelectedAddSymbol(e.target.value)}
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
            disabled={!selectedAddSymbol}
            onClick={handleAddButton}
          >
            Add
          </button>
        </div>
      )}

      <div style={{ marginTop: '0.75rem' }}>
        <button
          type="button"
          className="btn-secondary btn-small"
          onClick={() => setShowQuestionCreator(true)}
        >
          + New Question
        </button>
      </div>

      {showQuestionCreator && (
        <InlineQuestionCreator
          accessToken={accessToken ?? ''}
          collections={collections}
          userOrgId={userOrgId}
          onCreated={(newQuestion) => {
            if (onQuestionCreated) onQuestionCreated(newQuestion);
            setShowQuestionCreator(false);
          }}
          onCancel={() => setShowQuestionCreator(false)}
        />
      )}
    </div>
  );
}
