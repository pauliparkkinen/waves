'use client';

import React, { createContext, useContext, useCallback, useMemo, useState, useEffect, useRef } from 'react';
import type {
  FormResponseGroup,
  FormDefinition,
  FormResponse,
  QuestionResponse,
  QuestionDefinition,
  SectionDefinition,
} from '@/lib/api/form-response';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
type ViewMode = 'fill' | 'review' | 'preview';

export type FormWithSections = {
  formSymbol: string;
  formTitle: string;
  sections: SectionWithQuestions[];
};

export type SectionWithQuestions = {
  sectionSymbol: string;
  sectionTitle: string;
  questions: QuestionDefinition[];
  isIncomplete: boolean;
};

export type FormViewState = {
  isLoading: boolean;
  error: string | null;
  formResponseGroup: FormResponseGroup;
  formDefinitions: FormDefinition[];
  formResponses: FormResponse[];
  questionResponses: Map<string, QuestionResponse>;
  currentFormIndex: number;
  currentSectionSymbol: string | null;
  completedSections: Set<string>;
  formOrder: FormWithSections[];
  saveStatus: SaveStatus;
  mode: ViewMode;
  locale: string;
};

export type FormViewActions = {
  onAnswer: (questionSymbol: string, value: string | number | boolean | string[]) => void;
  completeSection: () => void;
  openSection: (symbol: string) => void;
  reopenSection: (symbol: string) => void;
  reviewSection: (symbol: string) => void;
  setCurrentFormIndex: (index: number) => void;
  setSaveStatus: (status: SaveStatus) => void;
  setLocale: (locale: string) => void;
  setError: (error: string | null) => void;
  submitFormResponseGroup: () => Promise<void>;
};

type FormViewContextValue = FormViewState & FormViewActions;

const FormViewContext = createContext<FormViewContextValue | null>(null);

function computeFormOrder(
  formDefinitions: FormDefinition[],
  locale: string,
  sectionDefs: SectionDefinition[],
  questionDefs: QuestionDefinition[],
): FormWithSections[] {
  const sdMap = new Map(sectionDefs.map((s) => [s.section_symbol, s]));
  const qdMap = new Map(questionDefs.map((q) => [q.question_symbol, q]));

  return formDefinitions.map((fd) => ({
    formSymbol: fd.form_symbol,
    formTitle: fd.translations?.[locale] ?? fd.form_symbol,
    sections: (fd.form_sections ?? [])
      .slice()
      .sort((a, b) => a.order_number - b.order_number)
      .map((ref) => {
        const sd = sdMap.get(ref.section_symbol);
        const questions = (sd?.section_questions ?? [])
          .slice()
          .sort((a, b) => a.order_number - b.order_number)
          .map((qr) => qdMap.get(qr.question_symbol))
          .filter((q): q is QuestionDefinition => q != null);
        return {
          sectionSymbol: ref.section_symbol,
          sectionTitle: sd?.translations?.[locale] ?? ref.section_symbol,
          questions,
          isIncomplete: false,
        };
      }),
  }));
}

interface FormViewProviderProps {
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
  accessToken?: string;
  children: React.ReactNode;
}

export function FormViewProvider({ initialData, accessToken, children }: FormViewProviderProps) {
  const [isLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formResponseGroup] = useState(initialData.formResponseGroup);
  const [formDefinitions] = useState(initialData.formDefinitions);
  const [formResponses] = useState(initialData.formResponses);
  const [questionResponses, setQuestionResponses] = useState(initialData.questionResponses);
  const [currentFormIndex, setCurrentFormIndex] = useState(0);
  const [currentSectionSymbol, setCurrentSectionSymbol] = useState<string | null>(null);
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set());
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [mode] = useState(initialData.mode);
  const [locale, setLocale] = useState(initialData.locale);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const formOrder = useMemo(() => {
    const base = computeFormOrder(
      formDefinitions,
      locale,
      initialData.sectionDefinitions,
      initialData.questionDefinitions,
    );

    return base.map((form) => ({
      ...form,
      sections: form.sections.map((section) => ({
        ...section,
        isIncomplete:
          section.questions.length > 0 &&
          section.questions.some((q) => {
            const r = questionResponses.get(q.question_symbol);
            return (
              !r ||
              (r.response_value_text === undefined &&
                r.response_value_number === undefined &&
                r.response_value_boolean === undefined)
            );
          }),
      })),
    }));
  }, [
    formDefinitions,
    locale,
    initialData.sectionDefinitions,
    initialData.questionDefinitions,
    questionResponses,
  ]);

  useEffect(() => {
    if (!currentSectionSymbol && formOrder.length > 0 && formOrder[0].sections.length > 0) {
      setCurrentSectionSymbol(formOrder[0].sections[0].sectionSymbol);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const saveAnswer = useCallback(
    async (questionSymbol: string, value: string | number | boolean | string[]) => {
      const formResponseId = formResponses[0]?.form_response_id;
      if (!formResponseId) return;

      const body: Record<string, unknown> = { question_symbol: questionSymbol };
      if (typeof value === 'string') body.response_value_text = value;
      else if (typeof value === 'number') body.response_value_number = value;
      else if (typeof value === 'boolean') body.response_value_boolean = value;
      else if (Array.isArray(value)) body.response_value_text = JSON.stringify(value);

      setSaveStatus('saving');
      try {
        const res = await fetch(`/api/form-response/responses/${formResponseId}/questions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error('Save failed');
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch {
        setSaveStatus('error');
      }
    },
    [formResponses, accessToken],
  );

  const onAnswer = useCallback(
    (questionSymbol: string, value: string | number | boolean | string[]) => {
      setQuestionResponses((prev) => {
        const next = new Map(prev);
        const existing = next.get(questionSymbol);
        next.set(questionSymbol, {
          ...(existing ?? {
            form_response_id: formResponses[0]?.form_response_id ?? '',
            collection_id: formResponses[0]?.collection_id ?? '',
            question_symbol: questionSymbol,
            question_version: 1,
          }),
          response_value_text:
            typeof value === 'string'
              ? value
              : Array.isArray(value)
                ? JSON.stringify(value)
                : undefined,
          response_value_number: typeof value === 'number' ? value : undefined,
          response_value_boolean: typeof value === 'boolean' ? value : undefined,
        });
        return next;
      });

      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => saveAnswer(questionSymbol, value), 500);
    },
    [formResponses, saveAnswer],
  );

  const completeSection = useCallback(() => {
    setCompletedSections((prev) => {
      const next = new Set(prev);
      if (currentSectionSymbol) {
        next.add(currentSectionSymbol);
      }
      return next;
    });
    setCurrentSectionSymbol(null);
  }, [currentSectionSymbol]);

  const openSection = useCallback((symbol: string) => {
    setCurrentSectionSymbol(symbol);
  }, []);

  const reopenSection = useCallback((symbol: string) => {
    setCompletedSections((prev) => {
      const next = new Set(prev);
      next.delete(symbol);
      return next;
    });
    setCurrentSectionSymbol(symbol);
  }, []);

  const reviewSection = useCallback((symbol: string) => {
    setCurrentSectionSymbol(symbol);
  }, []);

  const submitFormResponseGroupAction = useCallback(async () => {
    const groupId = formResponseGroup.form_response_group_id;
    if (!groupId) return;

    setSaveStatus('saving');
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
      setSaveStatus('saved');
    } catch {
      setSaveStatus('error');
    }
  }, [formResponseGroup, accessToken]);

  const value = useMemo<FormViewContextValue>(
    () => ({
      isLoading,
      error,
      formResponseGroup,
      formDefinitions,
      formResponses,
      questionResponses,
      currentFormIndex,
      currentSectionSymbol,
      completedSections,
      formOrder,
      saveStatus,
      mode,
      locale,
      onAnswer,
      completeSection,
      openSection,
      reopenSection,
      reviewSection,
      setCurrentFormIndex,
      setSaveStatus,
      setLocale,
      setError,
      submitFormResponseGroup: submitFormResponseGroupAction,
    }),
    [
      isLoading,
      error,
      formResponseGroup,
      formDefinitions,
      formResponses,
      questionResponses,
      currentFormIndex,
      currentSectionSymbol,
      completedSections,
      formOrder,
      saveStatus,
      mode,
      locale,
      onAnswer,
      completeSection,
      openSection,
      reopenSection,
      reviewSection,
      setCurrentFormIndex,
      setSaveStatus,
      setLocale,
      setError,
      submitFormResponseGroupAction,
    ],
  );

  return <FormViewContext.Provider value={value}>{children}</FormViewContext.Provider>;
}

export function useFormView(): FormViewContextValue {
  const ctx = useContext(FormViewContext);
  if (!ctx) {
    throw new Error('useFormView must be used within a FormViewProvider');
  }
  return ctx;
}
