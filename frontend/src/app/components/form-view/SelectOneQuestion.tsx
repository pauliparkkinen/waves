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

export function SelectOneQuestion({
  question,
  currentValue,
  onAnswer,
  locale,
  disabled,
  error,
}: Props) {
  const options = (question.parameters?.options as string[] | undefined) ?? [];
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
          const checked = currentText === option;
          const id = `radio-${question.question_symbol}-${option}`;
          return (
            <div key={option}>
              <input
                type="radio"
                id={id}
                name={question.question_symbol}
                value={option}
                checked={checked}
                onChange={() => handleChange(option)}
                disabled={disabled}
              />
              <label htmlFor={id}>{option}</label>
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
        <option value="">--</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
