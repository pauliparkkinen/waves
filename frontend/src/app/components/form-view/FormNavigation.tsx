'use client';

import React, { useCallback } from 'react';
import { useFormView } from './FormViewProvider';
import { getFormViewStrings } from '@/lib/translations/form-view';

export default function FormNavigation() {
  const {
    formOrder,
    currentFormIndex,
    currentSectionSymbol,
    completedSections,
    saveStatus,
    openSection,
    reviewSection,
    locale,
  } = useFormView();
  const strings = getFormViewStrings(locale);

  const currentForm = formOrder[currentFormIndex];
  if (!currentForm || currentForm.sections.length === 0) {
    return null;
  }

  const sections = currentForm.sections;
  const currentIndex = sections.findIndex((s) => s.sectionSymbol === currentSectionSymbol);
  const isSaving = saveStatus === 'saving';

  const isSectionAccessible = useCallback(
    (index: number): boolean => {
      if (completedSections.has(sections[index].sectionSymbol)) return true;
      if (sections[index].sectionSymbol === currentSectionSymbol) return true;
      for (let i = 0; i < index; i++) {
        if (!completedSections.has(sections[i].sectionSymbol)) {
          return false;
        }
      }
      return true;
    },
    [completedSections, currentSectionSymbol, sections],
  );

  const handleSectionClick = useCallback(
    (symbol: string) => {
      if (completedSections.has(symbol)) {
        reviewSection(symbol);
      } else {
        openSection(symbol);
      }
    },
    [completedSections, reviewSection, openSection],
  );

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      const prevSymbol = sections[currentIndex - 1].sectionSymbol;
      if (completedSections.has(prevSymbol)) {
        reviewSection(prevSymbol);
      } else {
        openSection(prevSymbol);
      }
    }
  }, [currentIndex, sections, completedSections, reviewSection, openSection]);

  const handleNext = useCallback(() => {
    if (currentIndex < sections.length - 1) {
      const nextSymbol = sections[currentIndex + 1].sectionSymbol;
      if (completedSections.has(nextSymbol)) {
        reviewSection(nextSymbol);
      } else {
        openSection(nextSymbol);
      }
    }
  }, [currentIndex, sections, completedSections, reviewSection, openSection]);

  const isFirst = currentIndex <= 0;
  const isLast = currentIndex >= sections.length - 1;

  return (
    <div className="form-view__section-nav">
      <div className="form-view__section-tabs">
        {sections.map((section, idx) => {
          const isActive = section.sectionSymbol === currentSectionSymbol;
          const isCompleted = completedSections.has(section.sectionSymbol);
          const accessible = isSectionAccessible(idx);
          let itemClass = 'form-view__section-item';
          if (isActive) itemClass += ' form-view__section-item--active';
          if (isCompleted) itemClass += ' form-view__section-item--completed';
          if (section.isIncomplete && !isActive && !isCompleted && accessible) {
            itemClass += ' form-view__section-item--incomplete';
          }
          if (!accessible && !isCompleted) itemClass += ' form-view__section-item--upcoming';

          return (
            <button
              key={section.sectionSymbol}
              className={itemClass}
              onClick={() => handleSectionClick(section.sectionSymbol)}
              disabled={!accessible && !isCompleted}
              aria-current={isActive ? 'true' : undefined}
              aria-label={`${section.sectionTitle}${isCompleted ? ` (${strings.section.completedAriaLabel})` : ''}`}
            >
              <span>{section.sectionTitle}</span>
            </button>
          );
        })}
      </div>

      <div className="form-view__nav-buttons">
        <button
          onClick={handlePrevious}
          disabled={isFirst || isSaving}
          aria-label={strings.navigation.previousSectionLabel}
          className="btn-secondary"
        >
          {strings.navigation.previous}
        </button>
        <button
          onClick={handleNext}
          disabled={isLast || isSaving || !isSectionAccessible(currentIndex + 1)}
          aria-label={strings.navigation.nextSectionLabel}
          className="btn-primary"
        >
          {strings.navigation.next}
        </button>
      </div>
    </div>
  );
}
