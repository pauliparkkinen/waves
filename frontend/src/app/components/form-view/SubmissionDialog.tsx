'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getFormViewStrings } from '@/lib/translations/form-view';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  error: string | null;
  locale?: string;
};

export function SubmissionDialog({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  error,
  locale = 'en',
}: Props) {
  const strings = getFormViewStrings(locale);
  const [reviewed, setReviewed] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement;
      setReviewed(false);
      requestAnimationFrame(() => {
        dialogRef.current?.focus();
      });
    } else {
      triggerRef.current?.focus();
    }
  }, [isOpen]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab') {
        const dialog = dialogRef.current;
        if (!dialog) return;
        const focusable = dialog.querySelectorAll<HTMLElement>(
          'button, input[type="checkbox"], [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    },
    [onClose],
  );

  const handleSubmit = useCallback(() => {
    onSubmit();
  }, [onSubmit]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="submission-dialog-title"
        ref={dialogRef}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <h3 id="submission-dialog-title">{strings.submission.title}</h3>

        <p className="question__help">{strings.submission.warning}</p>

        <div>
          <input
            type="checkbox"
            id="submission-reviewed"
            checked={reviewed}
            onChange={(e) => setReviewed(e.target.checked)}
            disabled={isSubmitting}
          />
          <label htmlFor="submission-reviewed">
            {strings.submission.reviewed}
          </label>
        </div>

        {error && (
          <p className="error-message" role="alert">
            {strings.submission.error}
          </p>
        )}

        <div className="modal-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            {strings.submission.cancel}
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSubmit}
            disabled={!reviewed || isSubmitting}
          >
            {isSubmitting ? strings.submission.submitting : strings.submission.submit}
          </button>
        </div>
      </div>
    </div>
  );
}
