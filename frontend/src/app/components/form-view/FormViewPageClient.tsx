'use client';

import React, { useCallback } from 'react';
import type {
  FormResponseGroup,
  FormDefinition,
  FormResponse,
  QuestionResponse,
  SectionDefinition,
  QuestionDefinition,
} from '@/lib/api/form-response';
import { FormViewProvider } from './FormViewProvider';
import FormViewLayout from './FormViewLayout';
import FormHeader from './FormHeader';
import ProgressTracker from './ProgressTracker';
import FormNavigation from './FormNavigation';
import { SectionRenderer } from './SectionRenderer';
import { FormCompletion } from './FormCompletion';

type ViewMode = 'fill' | 'review' | 'preview';

interface FormViewPageClientProps {
  initialData: {
    formResponseGroup: FormResponseGroup;
    formDefinitions: FormDefinition[];
    formResponses: FormResponse[];
    questionResponses: Map<string, QuestionResponse>;
    sectionDefinitions: SectionDefinition[];
    questionDefinitions: QuestionDefinition[];
    mode: ViewMode;
    locale: string;
  };
  onSubmit?: () => void;
  accessToken?: string;
}

export default function FormViewPageClient({
  initialData,
  onSubmit,
  accessToken,
}: FormViewPageClientProps) {
  const handleSubmit = useCallback(async () => {
    const groupId = initialData.formResponseGroup.form_response_group_id;
    if (!groupId) return;

    try {
      const res = await fetch(`/api/form-response/groups/${groupId}/submit`, {
        method: 'POST',
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(
          (data && typeof data === 'object' && 'error' in data
            ? (data as { error: string }).error
            : undefined) ?? `Submit failed (${res.status})`,
        );
      }
    } catch (err) {
      console.error('Submit failed', err);
    }

    onSubmit?.();
  }, [initialData.formResponseGroup.form_response_group_id, accessToken, onSubmit]);

  return (
    <FormViewProvider initialData={initialData} accessToken={accessToken}>
      <FormViewLayout
        header={<FormHeader />}
        progress={<ProgressTracker />}
        navigation={<FormNavigation />}
      >
        <SectionRenderer />
        <FormCompletion onSubmit={handleSubmit} />
      </FormViewLayout>
    </FormViewProvider>
  );
}
