'use client';

import React from 'react';
import { useFormView } from './FormViewProvider';
import { QuestionRenderer } from './QuestionRenderer';
import { SectionSummary } from './SectionSummary';
import type { QuestionResponse } from '@/lib/api/form-response';
import { formViewStrings } from '@/lib/translations/form-view';

export function SectionRenderer() {
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

  const isSaving = saveStatus === 'saving';

  if (!currentSectionSymbol) {
    const anyIncomplete = formOrder.some((f) =>
      f.sections.some((s) => s.isIncomplete),
    );
    return (
      <div className="form-view__content">
        {formOrder.map((form) => (
          <div key={form.formSymbol}>
            {form.sections.map((section) => (
              <SectionSummary
                key={section.sectionSymbol}
                section={section}
                isIncomplete={section.isIncomplete}
                onContinue={() => openSection(section.sectionSymbol)}
                autoFocus={form.sections.indexOf(section) === 0}
              />
            ))}
          </div>
        ))}
      </div>
    );
  }

  const currentSection = formOrder
    .flatMap((f) => f.sections)
    .find((s) => s.sectionSymbol === currentSectionSymbol);

  if (!currentSection) {
    return <p className="error-message">{formViewStrings.section.sectionNotFound}</p>;
  }

  const isCompleted = completedSections.has(currentSectionSymbol);
  const sectionTitle = currentSection.sectionTitle;

  const handleAnswer = (questionSymbol: string, value: QuestionResponse) => {
    const simpleValue: string | number | boolean | string[] =
      value.response_value_number !== undefined ? value.response_value_number :
      value.response_value_boolean !== undefined ? value.response_value_boolean :
      value.response_value_text !== undefined ? value.response_value_text :
      '';
    onAnswer(questionSymbol, simpleValue);
  };

  if (isCompleted) {
    return (
      <SectionSummary
        section={currentSection}
        isIncomplete={false}
        onContinue={() => openSection(currentSectionSymbol)}
        autoFocus={true}
      />
    );
  }

  return (
    <div
      className={`section ${currentSection.isIncomplete ? 'section--incomplete' : ''}`}
    >
      <div className="section__header">
        <h2 className="section__title">{sectionTitle}</h2>
      </div>
      <div className="section__questions">
        {currentSection.questions.map((question) => (
          <QuestionRenderer
            key={question.question_symbol}
            question={question}
            currentValue={questionResponses.get(question.question_symbol)}
            onAnswer={handleAnswer}
            locale={locale}
            disabled={isSaving}
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
          {formViewStrings.section.complete}
        </button>
      </div>
    </div>
  );
}
