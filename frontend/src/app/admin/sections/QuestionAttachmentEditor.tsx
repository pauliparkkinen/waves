"use client";

import { useMemo, useState, useCallback } from 'react';
import type { AdminQuestion, AdminCollection, SectionQuestion } from '@/lib/api';
import QuestionForm from '../questions/QuestionForm';

type QuestionAttachmentEditorProps = {
  questions: AdminQuestion[];
  collections: AdminCollection[];
  sectionQuestions: SectionQuestion[];
  onChange: (updated: SectionQuestion[]) => void;
  userOrgId?: string;
  accessToken?: string;
  onQuestionCreated?: (questions: AdminQuestion[]) => void;
  readOnly?: boolean;
};

export default function QuestionAttachmentEditor({
  questions,
  collections,
  sectionQuestions,
  onChange,
  userOrgId,
  accessToken,
  onQuestionCreated,
  readOnly,
}: QuestionAttachmentEditorProps) {
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [questionFormError, setQuestionFormError] = useState<string | null>(null);

  const refetchQuestions = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await fetch('/api/admin/questions', {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`Failed to refetch questions (${res.status})`);
      const data = (await res.json()) as AdminQuestion[];
      if (onQuestionCreated) onQuestionCreated(data);
    } catch (err) {
      setQuestionFormError(err instanceof Error ? err.message : 'Failed to refetch questions');
    }
  }, [accessToken, onQuestionCreated]);

  const questionsBySymbol = useMemo(() => {
    const map = new Map<string, AdminQuestion[]>();
    for (const q of questions) {
      if (!map.has(q.question_symbol)) map.set(q.question_symbol, []);
      map.get(q.question_symbol)!.push(q);
    }
    for (const [, versions] of map) {
      versions.sort((a, b) => b.version - a.version);
    }
    return map;
  }, [questions]);

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
    const latestBySymbol = new Map<string, AdminQuestion>();
    for (const q of availableQuestions) {
      const existing = latestBySymbol.get(q.question_symbol);
      if (!existing || q.version > existing.version) {
        latestBySymbol.set(q.question_symbol, q);
      }
    }
    for (const q of latestBySymbol.values()) {
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

    const versions = questionsBySymbol.get(selectedAddSymbol) ?? [];
    const latestVersion = versions[0];
    const newQuestion: SectionQuestion = {
      question_symbol: selectedAddSymbol,
      version_number: latestVersion?.version ?? 1,
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

  function handleVersionChange(symbol: string, version: number) {
    onChange(
      sectionQuestions.map((sq) =>
        sq.question_symbol === symbol ? { ...sq, version_number: version } : sq,
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

      {sortedQuestions.map((sq, index) => {
        const versions = questionsBySymbol.get(sq.question_symbol) ?? [];
        return (
        <div key={sq.question_symbol} className="question-attachment-row">
          <span className="question-attachment-symbol">
            {sq.question_symbol}
          </span>
          {!readOnly && versions.length > 1 ? (
            <select
              className="question-version-select"
              value={String(sq.version_number)}
              onChange={(e) => handleVersionChange(sq.question_symbol, parseInt(e.target.value, 10))}
              aria-label={`Version for ${sq.question_symbol}`}
            >
              {versions.map((qv) => (
                <option key={qv.version} value={qv.version}>
                  v{qv.version}
                </option>
              ))}
            </select>
          ) : (
            <span className="question-version-text">v{sq.version_number}</span>
          )}
          {!readOnly && (
            <>
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
              <label className="question-attachment-required">
                <input
                  type="checkbox"
                  checked={sq.required}
                  onChange={() => handleRequiredToggle(sq.question_symbol)}
                />
                Required
              </label>
              <button
                type="button"
                className="btn-danger btn-small"
                onClick={() => handleRemove(sq.question_symbol)}
                aria-label={`Remove ${sq.question_symbol}`}
              >
                Remove
              </button>
            </>
          )}
        </div>
      );
      })}

      {!readOnly && availableQuestions.length > 0 && (
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
                      {q.question_symbol} (v{q.version})
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

      {!readOnly && (
        <div style={{ marginTop: '0.75rem' }}>
          <button
            type="button"
            className="btn-secondary btn-small"
            onClick={() => setShowQuestionForm(true)}
          >
            + New Question
          </button>
        </div>
      )}

      {questionFormError && (
        <div className="error-message" role="alert" style={{ marginTop: '0.5rem' }}>
          {questionFormError}
        </div>
      )}

      {showQuestionForm && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="question-form-heading"
          onClick={() => setShowQuestionForm(false)}
          onKeyDown={(e) => { if (e.key === 'Escape') setShowQuestionForm(false); }}
          tabIndex={-1}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '40rem' }}>
            <QuestionForm
              collections={collections}
              accessToken={accessToken ?? ''}
              userOrgId={userOrgId}
              onSave={() => {
                setShowQuestionForm(false);
                setQuestionFormError(null);
                refetchQuestions();
              }}
              onCancel={() => setShowQuestionForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
