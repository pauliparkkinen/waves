'use client';

import React, { useState, useCallback, useMemo } from 'react';
import type { QuestionDefinition, QuestionResponse } from '@/lib/api/form-response';

type Props = {
  question: QuestionDefinition;
  currentValue: QuestionResponse | undefined;
  onAnswer: (value: QuestionResponse) => void;
  locale: string;
  disabled: boolean;
  error?: string;
};

export function RangeQuestion({
  question,
  currentValue,
  onAnswer,
  locale,
  disabled,
  error,
}: Props) {
  const params = question.parameters ?? {};
  const min = (params.min as number | undefined) ?? 0;
  const max = (params.max as number | undefined) ?? 100;
  const step = (params.step as number | undefined) ?? 1;
  const currentNumber = currentValue?.response_value_number;
  const [localValue, setLocalValue] = useState(currentNumber ?? min);
  const inputId = `range-${question.question_symbol}`;
  const valueId = `rangeval-${question.question_symbol}`;

  const save = useCallback(
    (value: number) => {
      onAnswer({
        form_response_id: currentValue?.form_response_id ?? '',
        collection_id: currentValue?.collection_id ?? '',
        question_symbol: question.question_symbol,
        question_version: question.version,
        response_value_text: undefined,
        response_value_number: value,
        response_value_boolean: undefined,
      });
    },
    [onAnswer, currentValue, question.question_symbol, question.version],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalValue(Number(e.target.value));
    },
    [],
  );

  const handleCommit = useCallback(() => {
    save(localValue);
  }, [localValue, save]);

  const handleKeyUp = useCallback(() => {
    save(localValue);
  }, [localValue, save]);

  // Position of the value indicator as a percentage of slider width
  const valuePercent = max !== min ? ((localValue - min) / (max - min)) * 97 + 1.5 : 0;

  return (
    <div className="range-question">
      <div className="range-question__slider-row">
        <span className="range-question__min">{min}</span>
        <div className="range-question__track">
          <input
            id={inputId}
            type="range"
            min={min}
            max={max}
            step={step}
            value={localValue}
            onChange={handleChange}
            onMouseUp={handleCommit}
            onTouchEnd={handleCommit}
            onBlur={handleCommit}
            onKeyUp={handleKeyUp}
            disabled={disabled}
            aria-valuenow={localValue}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-invalid={!!error}
            className="range-question__input"
          />
          <span
            id={valueId}
            className="range-question__value"
            style={{ left: `${valuePercent}%` }}
            aria-live="polite"
          >
            {localValue}
          </span>
        </div>
        <span className="range-question__max">{max}</span>
      </div>
    </div>
  );
}
