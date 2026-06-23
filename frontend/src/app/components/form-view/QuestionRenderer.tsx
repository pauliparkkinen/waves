'use client';

import React from 'react';
import type { QuestionDefinition, QuestionResponse } from '@/lib/api/form-response';
import { MultiSelectQuestion } from './MultiSelectQuestion';
import { SelectOneQuestion } from './SelectOneQuestion';
import { FreeTextQuestion } from './FreeTextQuestion';
import { RangeQuestion } from './RangeQuestion';

export type QuestionRendererProps = {
  question: QuestionDefinition;
  currentValue: QuestionResponse | undefined;
  onAnswer: (questionSymbol: string, value: QuestionResponse) => void;
  locale: string;
  disabled: boolean;
};

export function QuestionRenderer({
  question,
  currentValue,
  onAnswer,
  locale,
  disabled,
}: QuestionRendererProps) {
  const questionText = question.translations?.[locale] ?? question.question_symbol;
  const helpText = (question.parameters?.help_text as string | undefined)
    ?? (question.translations?.[`${locale}_help`] as string | undefined);
  const helpId = helpText ? `help-${question.question_symbol}` : undefined;
  const required = (question.parameters?.required as boolean | undefined) ?? false;
  const error = (question.parameters?.error as string | undefined) ?? undefined;
  const errorId = error ? `error-${question.question_symbol}` : undefined;

  const describedBy = [helpId, errorId].filter(Boolean).join(' ');

  const handleAnswer = (value: QuestionResponse) => {
    onAnswer(question.question_symbol, value);
  };

  const renderQuestion = () => {
    switch (question.type) {
      case 'multiselect':
        return (
          <MultiSelectQuestion
            question={question}
            currentValue={currentValue}
            onAnswer={handleAnswer}
            locale={locale}
            disabled={disabled}
            error={error}
          />
        );
      case 'select':
      case 'radio':
        return (
          <SelectOneQuestion
            question={question}
            currentValue={currentValue}
            onAnswer={handleAnswer}
            locale={locale}
            disabled={disabled}
            error={error}
          />
        );
      case 'free-text':
        return (
          <FreeTextQuestion
            question={question}
            currentValue={currentValue}
            onAnswer={handleAnswer}
            locale={locale}
            disabled={disabled}
            error={error}
          />
        );
      case 'range':
        return (
          <RangeQuestion
            question={question}
            currentValue={currentValue}
            onAnswer={handleAnswer}
            locale={locale}
            disabled={disabled}
            error={error}
          />
        );
      default:
        return <p className="question__error">Unsupported question type: {question.type}</p>;
    }
  };

  return (
    <fieldset
      className="question"
      aria-describedby={describedBy || undefined}
      aria-required={required ? 'true' : undefined}
    >
      <legend className="question__label">
        {questionText}
        {required && <span className="question__required" />}
      </legend>
      {helpText && (
        <p id={helpId} className="question__help">
          {helpText}
        </p>
      )}
      {renderQuestion()}
      {error && (
        <p id={errorId} className="question__error" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}
