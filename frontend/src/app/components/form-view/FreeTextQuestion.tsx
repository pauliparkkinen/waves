'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { QuestionDefinition, QuestionResponse } from '@/lib/api/form-response';

type Props = {
  question: QuestionDefinition;
  currentValue: QuestionResponse | undefined;
  onAnswer: (value: QuestionResponse) => void;
  locale: string;
  disabled: boolean;
  error?: string;
};

export function FreeTextQuestion({
  question,
  currentValue,
  onAnswer,
  locale,
  disabled,
  error,
}: Props) {
  const multiline = (question.parameters?.multiline as boolean | undefined) ?? false;
  const maxLength = (question.parameters?.max_length as number | undefined) ?? undefined;
  const currentText = currentValue?.response_value_text ?? '';
  const [draft, setDraft] = useState(currentText);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputId = `text-${question.question_symbol}`;
  const charCountId = maxLength ? `charcount-${question.question_symbol}` : undefined;

  useEffect(() => {
    setDraft(currentText);
  }, [currentText]);

  const save = useCallback(
    (value: string) => {
      onAnswer({
        form_response_id: currentValue?.form_response_id ?? '',
        collection_id: currentValue?.collection_id ?? '',
        question_symbol: question.question_symbol,
        question_version: question.version,
        response_value_text: value,
        response_value_number: undefined,
        response_value_boolean: undefined,
      });
    },
    [onAnswer, currentValue, question.question_symbol, question.version],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = e.target.value;
      if (maxLength !== undefined && value.length > maxLength) return;
      setDraft(value);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => save(value), 300);
    },
    [maxLength, save],
  );

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      save(e.target.value);
    },
    [save],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const describedBy = charCountId || undefined;
  const labelText = question.translations?.[locale] ?? question.question_symbol;

  return (
    <div>
      <label htmlFor={inputId}>{labelText}</label>
      {multiline ? (
        <textarea
          id={inputId}
          value={draft}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          maxLength={maxLength}
          aria-describedby={describedBy}
          aria-invalid={!!error}
        />
      ) : (
        <input
          id={inputId}
          type="text"
          value={draft}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          maxLength={maxLength}
          aria-describedby={describedBy}
          aria-invalid={!!error}
        />
      )}
      {maxLength !== undefined && (
        <span id={charCountId} className="question__help">
          {draft.length}/{maxLength}
        </span>
      )}
    </div>
  );
}
