import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FormNavigation from '../FormNavigation';
import { FormViewProvider, type FormWithSections } from '../FormViewProvider';
import type {
  FormResponseGroup,
  FormDefinition,
  FormResponse,
  QuestionResponse,
  SectionDefinition,
  QuestionDefinition,
} from '@/lib/api/form-response';

function createMockData(): {
  formResponseGroup: FormResponseGroup;
  formDefinitions: FormDefinition[];
  formResponses: FormResponse[];
  questionResponses: Map<string, QuestionResponse>;
  sectionDefinitions: SectionDefinition[];
  questionDefinitions: QuestionDefinition[];
} {
  return {
    formResponseGroup: {
      form_response_group_id: 'group-1',
      form_responses: [],
    },
    formDefinitions: [
      {
        collection_id: 'col-1',
        form_symbol: 'form_a',
        version: 1,
        form_sections: [
          { section_symbol: 'section_1', version_number: 1, order_number: 0 },
          { section_symbol: 'section_2', version_number: 1, order_number: 1 },
          { section_symbol: 'section_3', version_number: 1, order_number: 2 },
        ],
        status: 'published',
        translations: { en: 'Test Form' },
      },
    ],
    formResponses: [],
    questionResponses: new Map(),
    sectionDefinitions: [
      {
        section_symbol: 'section_1',
        version: 1,
        section_questions: [
          { question_symbol: 'q1', version_number: 1, order_number: 0, required: false },
        ],
        status: 'published',
        translations: { en: 'Personal Info' },
      },
      {
        section_symbol: 'section_2',
        version: 1,
        section_questions: [
          { question_symbol: 'q2', version_number: 1, order_number: 0, required: false },
        ],
        status: 'published',
        translations: { en: 'Medical History' },
      },
      {
        section_symbol: 'section_3',
        version: 1,
        section_questions: [
          { question_symbol: 'q3', version_number: 1, order_number: 0, required: false },
        ],
        status: 'published',
        translations: { en: 'Additional Info' },
      },
    ],
    questionDefinitions: [
      {
        question_symbol: 'q1',
        version: 1,
        type: 'free-text',
        parameters: {},
        translations: { en: 'What is your name?' },
      },
      {
        question_symbol: 'q2',
        version: 1,
        type: 'free-text',
        parameters: {},
        translations: { en: 'Any medical conditions?' },
      },
      {
        question_symbol: 'q3',
        version: 1,
        type: 'free-text',
        parameters: {},
        translations: { en: 'Anything else?' },
      },
    ],
  };
}

function renderWithProvider(
  component: React.ReactNode,
  overrides?: Partial<{
    mode: 'fill' | 'review' | 'preview';
  }>,
) {
  const data = createMockData();
  return render(
    <FormViewProvider
      initialData={{
        ...data,
        mode: overrides?.mode ?? 'fill',
        locale: 'en',
      }}
    >
      {component}
    </FormViewProvider>,
  );
}

describe('FormNavigation', () => {
  describe('given three sections', () => {
    it('when rendered, then shows all section buttons', () => {
      renderWithProvider(<FormNavigation />);
      expect(screen.getByText('Personal Info')).toBeInTheDocument();
      expect(screen.getByText('Medical History')).toBeInTheDocument();
      expect(screen.getByText('Additional Info')).toBeInTheDocument();
    });

    it('when rendered, then shows Next and Previous buttons', () => {
      renderWithProvider(<FormNavigation />);
      expect(screen.getByLabelText('Next section')).toBeInTheDocument();
      expect(screen.getByLabelText('Previous section')).toBeInTheDocument();
    });
  });

  describe('given first section active', () => {
    it('when rendered, then Previous button is disabled', () => {
      renderWithProvider(<FormNavigation />);
      expect(screen.getByLabelText('Previous section')).toBeDisabled();
    });

    it('when rendered, then Next button is disabled for locked section', () => {
      renderWithProvider(<FormNavigation />);
      // The next section is not accessible (locked) so Next should be disabled
      expect(screen.getByLabelText('Next section')).toBeDisabled();
    });
  });

  describe('given incomplete sections', () => {
    it('when rendered, then upcoming sections are disabled', () => {
      renderWithProvider(<FormNavigation />);
      // Find the button by role and check its disabled attribute
      const buttons = screen.getAllByRole('button', { name: 'Additional Info' });
      expect(buttons.length).toBeGreaterThanOrEqual(1);
      // The Additional Info section button should be disabled
      expect(buttons[0]).toBeDisabled();
    });
  });

  describe('given section buttons', () => {
    it('renders all section buttons', () => {
      renderWithProvider(<FormNavigation />);
      expect(screen.getByText('Personal Info')).toBeInTheDocument();
      expect(screen.getByText('Medical History')).toBeInTheDocument();
      expect(screen.getByText('Additional Info')).toBeInTheDocument();
    });
  });
});
