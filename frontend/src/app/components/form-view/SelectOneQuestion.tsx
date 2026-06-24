'use client';

import React, { useCallback } from 'react';
import type { QuestionDefinition, QuestionResponse } from '@/lib/api/form-response';
import { getFormViewStrings } from '@/lib/translations/form-view';

type Props = {
  question: QuestionDefinition;
  currentValue: QuestionResponse | undefined;
  onAnswer: (value: QuestionResponse) => void;
  locale: string;
  disabled: boolean;
  error?: string;
};

export function SelectOneQuestion({
  question,
  currentValue,
  onAnswer,
  locale,
  disabled,
  error,
}: Props) {
  const strings = getFormViewStrings(locale);
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
  const currentText = currentValue?.response_value_text ?? '';
  const legendText = question.translations?.[locale] ?? question.question_symbol;

  const handleChange = useCallback(
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

  if (options.length <= 5) {
    return (
      <fieldset disabled={disabled} aria-invalid={!!error}>
        <legend className="sr-only">{legendText}</legend>
        {options.map((option) => {
          const val = option.value ?? option.label;
          const checked = currentText === val;
          const id = `radio-${question.question_symbol}-${val}`;
          return (
            <div key={val}>
              <input
                type="radio"
                id={id}
                name={question.question_symbol}
                value={val}
                checked={checked}
                onChange={() => handleChange(val)}
                disabled={disabled}
              />
              <label htmlFor={id}>{option.label ?? val}</label>
            </div>
          );
        })}
      </fieldset>
    );
  }

  const selectId = `select-${question.question_symbol}`;
  return (
    <div>
      <label id={`${selectId}-label`} className="sr-only" htmlFor={selectId}>
        {legendText}
      </label>
      <select
        id={selectId}
        value={currentText}
        onChange={(e) => handleChange(e.target.value)}
        disabled={disabled}
        aria-labelledby={`${selectId}-label`}
        aria-invalid={!!error}
      >
        <option value="">{strings.general.selectPlaceholder}</option>
        {options.map((option) => {
          const val = option.value ?? option.label;
          return (
            <option key={val} value={val}>
              {option.label ?? val}
            </option>
          );
        })}
      </select>
    </div>
  );
}
