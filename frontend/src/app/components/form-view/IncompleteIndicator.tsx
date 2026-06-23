'use client';

import React from 'react';
import { getFormViewStrings } from '@/lib/translations/form-view';

type Props = {
  locale?: string;
};

export function IncompleteIndicator({ locale = 'en' }: Props) {
  return (
    <span className="incomplete-indicator">
      <span aria-hidden="true" className="incomplete-indicator__icon">&#9888;</span>
      <span className="sr-only">{getFormViewStrings(locale).section.incomplete}</span>
    </span>
  );
}
