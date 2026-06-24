'use client';

import React, { useMemo } from 'react';
import { useFormView } from './FormViewProvider';
import { getFormViewStrings } from '@/lib/translations/form-view';

export default function FormHeader() {
  const { formOrder, currentFormIndex, locale, setLocale, formDefinitions, isLoading, error } =
    useFormView();
  const strings = getFormViewStrings(locale);

  const availableLocales = useMemo(() => {
    const locales = new Set<string>();
    for (const fd of formDefinitions) {
      if (fd.translations) {
        for (const key of Object.keys(fd.translations)) {
          locales.add(key);
        }
      }
    }
    return Array.from(locales);
  }, [formDefinitions]);

  if (isLoading) {
    return <div className="form-view__header">{strings.loading.loading}</div>;
  }

  if (error) {
    return (
      <div className="form-view__header">
        <div className="error-message" role="alert">
          {error}
        </div>
      </div>
    );
  }

  const currentForm = formOrder[currentFormIndex];
  if (!currentForm) {
    return null;
  }

  return (
    <div className="form-view__header" aria-live="polite">
      <h1>{currentForm.formTitle}</h1>
      {availableLocales.length > 1 && (
        <select
          value={locale}
          onChange={(e) => setLocale(e.target.value)}
          aria-label={strings.general.selectLanguage}
          className="form-view__locale-select"
        >
          {availableLocales.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
