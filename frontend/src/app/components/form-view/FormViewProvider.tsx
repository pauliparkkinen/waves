'use client';

import React, { createContext, useContext, useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { retryWithBackoff } from '@/lib/api/retry';
import { getFormViewStrings } from '@/lib/translations/form-view';
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
  failedSaves: Map<string, { questionSymbol: string; value: string | number | boolean | string[] }>;
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
  retryFailedSave: (questionSymbol: string) => Promise<void>;
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
    initialSectionSymbol?: string | null;
  };
  accessToken?: string;
  children: React.ReactNode;
  submitActionRef?: React.MutableRefObject<(() => Promise<void>) | null>;
  disablePersistence?: boolean;
}

export function FormViewProvider({ initialData, accessToken, children, submitActionRef, disablePersistence = false }: FormViewProviderProps) {
  const [isLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formResponseGroup] = useState(initialData.formResponseGroup);
  const [formDefinitions] = useState(initialData.formDefinitions);
  const [formResponses] = useState(initialData.formResponses);
  const [questionResponses, setQuestionResponses] = useState(initialData.questionResponses);
  const [currentFormIndex, setCurrentFormIndex] = useState(0);
  const [currentSectionSymbol, setCurrentSectionSymbol] = useState<string | null>(initialData.initialSectionSymbol ?? null);
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set());
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [mode] = useState(initialData.mode);
  const [locale, setLocale] = useState(initialData.locale);
  const [failedSaves, setFailedSaves] = useState<Map<string, { questionSymbol: string; value: string | number | boolean | string[] }>>(new Map());
  const debounceTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const questionDefinitionsRef = useRef(initialData.questionDefinitions);

  useEffect(() => {
    return () => {
      for (const timer of debounceTimersRef.current.values()) {
        clearTimeout(timer);
      }
      debounceTimersRef.current.clear();
    };
  }, []);

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

  const initialSectionSetRef = useRef(false);

  useEffect(() => {
    if (
      !initialSectionSetRef.current &&
      !currentSectionSymbol &&
      formOrder.length > 0 &&
      formOrder[0].sections.length > 0
    ) {
      setCurrentSectionSymbol(formOrder[0].sections[0].sectionSymbol);
      initialSectionSetRef.current = true;
    }
  }, [formOrder, currentSectionSymbol]);

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
        await retryWithBackoff(async () => {
          const res = await fetch(`/api/form-response/responses/${formResponseId}/questions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            },
            body: JSON.stringify(body),
          });
          if (!res.ok) throw new Error('Save failed');
        });
        setSaveStatus('saved');
        // Clear from failed saves if previously failed
        setFailedSaves((prev) => {
          const next = new Map(prev);
          next.delete(questionSymbol);
          return next;
        });
      } catch {
        setSaveStatus('error');
        // Store in failed saves for manual retry
        setFailedSaves((prev) => {
          const next = new Map(prev);
          next.set(questionSymbol, { questionSymbol, value });
          return next;
        });
      }
    },
    [formResponses, accessToken],
  );

  const retryFailedSave = useCallback(
    async (questionSymbol: string) => {
      const failed = failedSaves.get(questionSymbol);
      if (!failed) return;
      await saveAnswer(questionSymbol, failed.value);
    },
    [failedSaves, saveAnswer],
  );

  const onAnswer = useCallback(
    (questionSymbol: string, value: string | number | boolean | string[]) => {
      setQuestionResponses((prev) => {
        const next = new Map(prev);
        const existing = next.get(questionSymbol);
        const qDef = questionDefinitionsRef.current.find((q) => q.question_symbol === questionSymbol);
        if (!qDef) {
          console.warn(`Question definition not found for "${questionSymbol}", using default version 1`);
        }
        const question_version = existing?.question_version ?? qDef?.version ?? 1;
        next.set(questionSymbol, {
          ...(existing ?? {
            form_response_id: formResponses[0]?.form_response_id ?? '',
            collection_id: formResponses[0]?.collection_id ?? '',
            question_symbol: questionSymbol,
            question_version,
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

      if (disablePersistence) return;

      const existingTimer = debounceTimersRef.current.get(questionSymbol);
      if (existingTimer) clearTimeout(existingTimer);
      debounceTimersRef.current.set(
        questionSymbol,
        setTimeout(() => {
          debounceTimersRef.current.delete(questionSymbol);
          saveAnswer(questionSymbol, value);
        }, 500),
      );
    },
    [formResponses, saveAnswer, disablePersistence],
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

    if (failedSaves.size > 0) {
      const msg = getFormViewStrings(locale).errorMessages.failedSaveBeforeSubmit;
      setError(msg);
      throw new Error(msg);
    }

    setSaveStatus('saving');
    const res = await fetch(`/api/form-response/groups/${groupId}/submit`, {
      method: 'POST',
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      const fallbackMsg = getFormViewStrings(locale).errorMessages.submitFailed.replace('{status}', String(res.status));
      throw new Error(
        (data && typeof data === 'object' && 'error' in data
          ? (data as { error: string }).error
          : undefined) ?? fallbackMsg,
      );
    }
    setSaveStatus('saved');
  }, [formResponseGroup, accessToken, failedSaves, setError]);

  useEffect(() => {
    if (submitActionRef) {
      submitActionRef.current = submitFormResponseGroupAction;
    }
    return () => {
      if (submitActionRef) {
        submitActionRef.current = null;
      }
    };
  }, [submitActionRef, submitFormResponseGroupAction]);

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
      failedSaves,
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
      retryFailedSave,
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
      failedSaves,
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
      retryFailedSave,
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
