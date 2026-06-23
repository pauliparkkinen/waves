'use client';

import React, { useCallback } from 'react';
import { useFormView } from './FormViewProvider';
import { getFormViewStrings } from '@/lib/translations/form-view';

interface FormNavigationProps {
  onNavigate?: (sectionSymbol: string) => void;
}

export default function FormNavigation({ onNavigate }: FormNavigationProps) {
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
      onNavigate?.(symbol);
    },
    [completedSections, openSection, reviewSection, onNavigate],
  );

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      const prev = sections[currentIndex - 1];
      handleSectionClick(prev.sectionSymbol);
    }
  }, [currentIndex, sections, handleSectionClick]);

  const handleNext = useCallback(() => {
    if (currentIndex >= 0 && currentIndex < sections.length - 1) {
      const next = sections[currentIndex + 1];
      if (isSectionAccessible(currentIndex + 1)) {
        handleSectionClick(next.sectionSymbol);
      }
    }
  }, [currentIndex, sections, isSectionAccessible, handleSectionClick]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      if (e.key === 'Home') { e.preventDefault(); handleSectionClick(sections[0].sectionSymbol); }
      else if (e.key === 'End') { e.preventDefault(); handleSectionClick(sections[sections.length - 1].sectionSymbol); }
      else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        if (index < sections.length - 1 && isSectionAccessible(index + 1)) {
          handleSectionClick(sections[index + 1].sectionSymbol);
        }
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        if (index > 0) {
          handleSectionClick(sections[index - 1].sectionSymbol);
        }
      }
    },
    [sections, isSectionAccessible, handleSectionClick],
  );

  const isFirst = currentIndex <= 0;
  const isLast = currentIndex >= sections.length - 1;

  return (
    <nav className="form-view__section-nav" aria-label={strings.navigation.navLabel}>
      {sections.map((section, index) => {
        const isActive = section.sectionSymbol === currentSectionSymbol;
        const isCompleted = completedSections.has(section.sectionSymbol);
        const isAccessible = isSectionAccessible(index);

        let statusLabel: string;
        let icon: string;
        let itemClass = 'form-view__section-item';

        if (isActive) {
          statusLabel = strings.navigation.currentSectionLabel;
          icon = '';
          itemClass += ' form-view__section-item--active';
        } else if (isCompleted) {
          statusLabel = strings.navigation.completedSectionLabel;
          icon = '\u2713';
          itemClass += ' form-view__section-item--completed';
        } else if (isAccessible) {
          statusLabel = strings.navigation.incompleteSectionLabel;
          icon = '\u26A0';
          itemClass += ' form-view__section-item--incomplete';
        } else {
          statusLabel = strings.navigation.upcomingSectionLabel;
          icon = '';
          itemClass += ' form-view__section-item--upcoming';
        }

        const disabled = !isAccessible || isSaving;
        const showWarning = !isActive && !isCompleted && isAccessible;

        return (
          <button
            key={section.sectionSymbol}
            aria-current={isActive ? 'step' : undefined}
            aria-label={`${statusLabel}: ${section.sectionTitle}`}
            className={itemClass}
            disabled={disabled}
            onClick={() => handleSectionClick(section.sectionSymbol)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            tabIndex={disabled ? -1 : 0}
          >
            {isCompleted && (
              <span aria-hidden="true" className="form-view__section-icon-completed">
                {icon}
              </span>
            )}
            {showWarning && !isActive && (
              <span aria-label={strings.section.warningAriaLabel} className="form-view__section-icon-warning">
                {icon}
              </span>
            )}
            <span>{section.sectionTitle}</span>
            {section.isIncomplete && !isActive && !isCompleted && isAccessible && (
              <span className="form-view__incomplete-badge" aria-label={strings.section.incompleteAriaLabel}>
                {'\u26A0'}
              </span>
            )}
          </button>
        );
      })}

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
    </nav>
  );
}
