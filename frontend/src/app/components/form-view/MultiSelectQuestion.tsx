'use client';

import React, { useCallback } from 'react';
import type { QuestionDefinition, QuestionResponse } from '@/lib/api/form-response';

type Props = {
  question: QuestionDefinition;
  currentValue: QuestionResponse | undefined;
  onAnswer: (value: QuestionResponse) => void;
  locale: string;
  disabled: boolean;
  error?: string;
};

export function MultiSelectQuestion({
  question,
  currentValue,
  onAnswer,
  locale,
  disabled,
  error,
}: Props) {
  const rawOptions = (question.parameters?.options as unknown) ?? [];
  // Options can be string[] or { label: string; value: string }[]
  const normalized: { label: string; value: string }[] = [];
  if (Array.isArray(rawOptions)) {
    for (const item of rawOptions) {
      if (typeof item === 'string') {
        normalized.push({ label: item, value: item });
      } else if (item && typeof item === 'object') {
        normalized.push({
          label: (item as { label?: string; value?: string }).label ?? String((item as { value?: string }).value ?? ''),
          value: (item as { value?: string }).value ?? String((item as { label?: string }).label ?? ''),
        });
      }
    }
  }
  const options = normalized;

  const selectedValues = (() => {
    if (!currentValue) return [];
    const text = currentValue.response_value_text;
    if (!text) return [];
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed as string[];
    } catch {
      return [];
    }
    return [];
  })();

  const handleToggle = useCallback(
    (option: string) => {
      const next = selectedValues.includes(option)
        ? selectedValues.filter((v: string) => v !== option)
        : [...selectedValues, option];
      onAnswer({
        form_response_id: currentValue?.form_response_id ?? '',
        collection_id: currentValue?.collection_id ?? '',
        question_symbol: question.question_symbol,
        question_version: question.version,
        response_value_text: JSON.stringify(next),
        response_value_number: undefined,
        response_value_boolean: undefined,
      });
    },
    [selectedValues, onAnswer, currentValue, question.question_symbol, question.version],
  );

  const legendText = question.translations?.[locale] ?? question.question_symbol;

  return (
    <fieldset disabled={disabled} aria-invalid={!!error}>
      <legend className="sr-only">{legendText}</legend>
      {options.map((option) => {
        const val = option.value ?? option.label;
        const checked = selectedValues.includes(val);
        const id = `multi-${question.question_symbol}-${val}`;
        return (
          <div key={val}>
            <input
              type="checkbox"
              id={id}
              checked={checked}
              onChange={() => handleToggle(val)}
              aria-checked={checked}
              disabled={disabled}
            />
            <label htmlFor={id}>{option.label ?? val}</label>
          </div>
        );
      })}
    </fieldset>
  );
}
