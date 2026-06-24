'use client';

import React from 'react';
import { getFormViewStrings } from '@/lib/translations/form-view';

interface FormViewLayoutProps {
  children: React.ReactNode;
  navigation: React.ReactNode;
  header: React.ReactNode;
  progress: React.ReactNode;
}

export default function FormViewLayout({ children, navigation, header, progress }: FormViewLayoutProps) {
  const strings = getFormViewStrings();
  return (
    <div className="form-view">
      <header className="form-view__header" role="banner">
        {header}
      </header>
      {progress && <div className="form-view__progress">{progress}</div>}
      <nav className="form-view__navigation" aria-label={strings.navigation.navLabel}>
        {navigation}
      </nav>
      <main className="form-view__content" role="main">
        {children}
      </main>
    </div>
  );
}
