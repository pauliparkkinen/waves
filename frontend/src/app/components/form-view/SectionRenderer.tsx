'use client';

import React from 'react';
import { useFormView } from './FormViewProvider';
import { QuestionRenderer } from './QuestionRenderer';
import { SectionSummary } from './SectionSummary';
import type { QuestionResponse } from '@/lib/api/form-response';
import { getFormViewStrings } from '@/lib/translations/form-view';

type SectionRendererProps = {
  disabled?: boolean;
};

/**
 * Renders all sections simultaneously.
 * - The active section (currentSectionSymbol) is shown with interactive
 *   questions when it has not been completed.
 * - All other sections are shown as SectionSummary previews.
 * - Completed sections are also shown as summaries.
 */
export function SectionRenderer({ disabled = false }: SectionRendererProps) {
  const {
    formOrder,
    currentSectionSymbol,
    completedSections,
    questionResponses,
    onAnswer,
    completeSection,
    openSection,
    locale,
    saveStatus,
  } = useFormView();
  const strings = getFormViewStrings(locale);

  const isSaving = saveStatus === 'saving';
  const isDisabled = disabled || isSaving;

  const allSections = formOrder.flatMap((f) => f.sections);

  if (allSections.length === 0) {
    return <p className="error-message">{strings.section.sectionNotFound}</p>;
  }

  const handleAnswer = (questionSymbol: string, value: QuestionResponse) => {
    const simpleValue: string | number | boolean | string[] =
      value.response_value_number !== undefined ? value.response_value_number :
      value.response_value_boolean !== undefined ? value.response_value_boolean :
      value.response_value_text !== undefined ? value.response_value_text :
      '';
    onAnswer(questionSymbol, simpleValue);
  };

  return (
    <div className="section-renderer">
      {allSections.map((section) => {
        const isActive = section.sectionSymbol === currentSectionSymbol;
        const isCompleted = completedSections.has(section.sectionSymbol);

        // Hide sections that are neither active nor completed
        if (!isActive && !isCompleted) return null;

        if (isActive && !isCompleted && !disabled) {
          // Active section — show questions interactively
          return (
            <div
              key={section.sectionSymbol}
              className={`section ${section.isIncomplete ? 'section--incomplete' : ''}`}
            >
              <div className="section__header">
                <h2 className="section__title">{section.sectionTitle}</h2>
              </div>
              <div className="section__questions">
                {section.questions.map((question) => (
                  <QuestionRenderer
                    key={question.question_symbol}
                    question={question}
                    currentValue={questionResponses.get(question.question_symbol)}
                    onAnswer={handleAnswer}
                    locale={locale}
                    disabled={isDisabled}
                  />
                ))}
              </div>
              <div className="section__controls">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={completeSection}
                  disabled={isSaving}
                >
                  {strings.section.complete}
                </button>
              </div>
            </div>
          );
        }

        // Completed section (or active section in read-only mode) — show summary
        return (
          <SectionSummary
            key={section.sectionSymbol}
            section={section}
            isIncomplete={false}
            onContinue={() => openSection(section.sectionSymbol)}
            readOnly={disabled}
          />
        );
      })}
    </div>
  );
}
