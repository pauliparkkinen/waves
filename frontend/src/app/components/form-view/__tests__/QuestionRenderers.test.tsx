import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MultiSelectQuestion } from '../MultiSelectQuestion';
import { SelectOneQuestion } from '../SelectOneQuestion';
import { FreeTextQuestion } from '../FreeTextQuestion';
import { RangeQuestion } from '../RangeQuestion';
import { QuestionRenderer } from '../QuestionRenderer';
import type { QuestionDefinition, QuestionResponse } from '@/lib/api/form-response';

function createQuestion(
  overrides: Partial<QuestionDefinition> = {},
): QuestionDefinition {
  return {
    question_symbol: 'test_q',
    version: 1,
    type: 'free-text',
    parameters: {},
    translations: { en: 'Test Question' },
    ...overrides,
  };
}

function createResponse(
  overrides: Partial<QuestionResponse> = {},
): QuestionResponse {
  return {
    form_response_id: 'fr-1',
    collection_id: 'col-1',
    question_symbol: 'test_q',
    question_version: 1,
    ...overrides,
  };
}

describe('MultiSelectQuestion', () => {
  const onAnswer = vi.fn();
  beforeEach(() => {
    onAnswer.mockReset();
  });

  describe('given options', () => {
    it('when rendered, then shows checkboxes for each option', () => {
      const question = createQuestion({
        type: 'multiselect',
        parameters: { options: ['Option A', 'Option B', 'Option C'] },
      });
      render(
        <MultiSelectQuestion
          question={question}
          currentValue={undefined}
          onAnswer={onAnswer}
          locale="en"
          disabled={false}
        />,
      );
      expect(screen.getByLabelText('Option A')).toBeInTheDocument();
      expect(screen.getByLabelText('Option B')).toBeInTheDocument();
      expect(screen.getByLabelText('Option C')).toBeInTheDocument();
    });

    it('when checkbox is clicked, then calls onAnswer with selected value', () => {
      const question = createQuestion({
        type: 'multiselect',
        parameters: { options: ['Option A', 'Option B'] },
      });
      render(
        <MultiSelectQuestion
          question={question}
          currentValue={undefined}
          onAnswer={onAnswer}
          locale="en"
          disabled={false}
        />,
      );
      fireEvent.click(screen.getByLabelText('Option A'));
      expect(onAnswer).toHaveBeenCalledWith(
        expect.objectContaining({
          question_symbol: 'test_q',
          response_value_text: '["Option A"]',
        }),
      );
    });

    it('when disabled, then checkboxes are disabled', () => {
      const question = createQuestion({
        type: 'multiselect',
        parameters: { options: ['Option A'] },
      });
      render(
        <MultiSelectQuestion
          question={question}
          currentValue={undefined}
          onAnswer={onAnswer}
          locale="en"
          disabled={true}
        />,
      );
      expect(screen.getByLabelText('Option A')).toBeDisabled();
    });
  });
});

describe('SelectOneQuestion', () => {
  const onAnswer = vi.fn();
  beforeEach(() => {
    onAnswer.mockReset();
  });

  describe('given options (<= 5)', () => {
    it('when rendered, then shows radio buttons', () => {
      const question = createQuestion({
        type: 'radio',
        parameters: { options: ['Yes', 'No'] },
      });
      render(
        <SelectOneQuestion
          question={question}
          currentValue={undefined}
          onAnswer={onAnswer}
          locale="en"
          disabled={false}
        />,
      );
      expect(screen.getByLabelText('Yes')).toBeInTheDocument();
      expect(screen.getByLabelText('No')).toBeInTheDocument();
    });

    it('when radio is clicked, then calls onAnswer with selected value', () => {
      const question = createQuestion({
        type: 'radio',
        parameters: { options: ['Yes', 'No'] },
      });
      render(
        <SelectOneQuestion
          question={question}
          currentValue={undefined}
          onAnswer={onAnswer}
          locale="en"
          disabled={false}
        />,
      );
      fireEvent.click(screen.getByLabelText('Yes'));
      expect(onAnswer).toHaveBeenCalledWith(
        expect.objectContaining({
          question_symbol: 'test_q',
          response_value_text: 'Yes',
        }),
      );
    });

    it('when disabled, then radio buttons are disabled', () => {
      const question = createQuestion({
        type: 'radio',
        parameters: { options: ['Yes', 'No'] },
      });
      render(
        <SelectOneQuestion
          question={question}
          currentValue={undefined}
          onAnswer={onAnswer}
          locale="en"
          disabled={true}
        />,
      );
      expect(screen.getByLabelText('Yes')).toBeDisabled();
    });
  });

  describe('given options (> 5)', () => {
    it('when rendered, then shows a select dropdown', () => {
      const question = createQuestion({
        type: 'select',
        parameters: { options: ['A', 'B', 'C', 'D', 'E', 'F'] },
      });
      render(
        <SelectOneQuestion
          question={question}
          currentValue={undefined}
          onAnswer={onAnswer}
          locale="en"
          disabled={false}
        />,
      );
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('when selection is changed, then calls onAnswer', () => {
      const question = createQuestion({
        type: 'select',
        parameters: { options: ['A', 'B', 'C', 'D', 'E', 'F'] },
      });
      render(
        <SelectOneQuestion
          question={question}
          currentValue={undefined}
          onAnswer={onAnswer}
          locale="en"
          disabled={false}
        />,
      );
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'B' } });
      expect(onAnswer).toHaveBeenCalledWith(
        expect.objectContaining({
          question_symbol: 'test_q',
          response_value_text: 'B',
        }),
      );
    });

    it('when disabled, then select is disabled', () => {
      const question = createQuestion({
        type: 'select',
        parameters: { options: ['A', 'B', 'C', 'D', 'E', 'F'] },
      });
      render(
        <SelectOneQuestion
          question={question}
          currentValue={undefined}
          onAnswer={onAnswer}
          locale="en"
          disabled={true}
        />,
      );
      expect(screen.getByRole('combobox')).toBeDisabled();
    });
  });
});

describe('FreeTextQuestion', () => {
  const onAnswer = vi.fn();
  beforeEach(() => {
    onAnswer.mockReset();
    vi.useFakeTimers();
  });

  describe('given default config', () => {
    it('when rendered, then shows a text input', () => {
      const question = createQuestion({ type: 'free-text' });
      render(
        <FreeTextQuestion
          question={question}
          currentValue={undefined}
          onAnswer={onAnswer}
          locale="en"
          disabled={false}
        />,
      );
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });
  });

  describe('given multiline config', () => {
    it('when rendered, then shows a textarea', () => {
      const question = createQuestion({
        type: 'free-text',
        parameters: { multiline: true },
      });
      render(
        <FreeTextQuestion
          question={question}
          currentValue={undefined}
          onAnswer={onAnswer}
          locale="en"
          disabled={false}
        />,
      );
      const textbox = screen.getByRole('textbox');
      expect(textbox.tagName).toBe('TEXTAREA');
    });
  });

  describe('given user input', () => {
    it('when typing, then calls onAnswer after debounce', async () => {
      const question = createQuestion({ type: 'free-text' });
      render(
        <FreeTextQuestion
          question={question}
          currentValue={undefined}
          onAnswer={onAnswer}
          locale="en"
          disabled={false}
        />,
      );
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'Hello' } });
      await act(async () => { vi.advanceTimersByTime(300); });
      expect(onAnswer).toHaveBeenCalledWith(
        expect.objectContaining({
          question_symbol: 'test_q',
          response_value_text: 'Hello',
        }),
      );
    });
  });

  describe('given disabled prop', () => {
    it('when rendered, then input is disabled', () => {
      const question = createQuestion({ type: 'free-text' });
      render(
        <FreeTextQuestion
          question={question}
          currentValue={undefined}
          onAnswer={onAnswer}
          locale="en"
          disabled={true}
        />,
      );
      expect(screen.getByRole('textbox')).toBeDisabled();
    });
  });
});

describe('RangeQuestion', () => {
  const onAnswer = vi.fn();
  beforeEach(() => {
    onAnswer.mockReset();
  });

  describe('given default config', () => {
    it('when rendered, then shows a range slider', () => {
      const question = createQuestion({ type: 'range' });
      render(
        <RangeQuestion
          question={question}
          currentValue={undefined}
          onAnswer={onAnswer}
          locale="en"
          disabled={false}
        />,
      );
      expect(screen.getByRole('slider')).toBeInTheDocument();
    });
  });

  describe('given user interaction', () => {
    it('when slider is changed and committed, then calls onAnswer', () => {
      const question = createQuestion({ type: 'range', parameters: { min: 0, max: 10 } });
      render(
        <RangeQuestion
          question={question}
          currentValue={undefined}
          onAnswer={onAnswer}
          locale="en"
          disabled={false}
        />,
      );
      const slider = screen.getByRole('slider') as HTMLInputElement;
      fireEvent.change(slider, { target: { value: '7' } });
      fireEvent.mouseUp(slider);
      expect(onAnswer).toHaveBeenCalledWith(
        expect.objectContaining({
          question_symbol: 'test_q',
          response_value_number: 7,
        }),
      );
    });
  });

  describe('given disabled prop', () => {
    it('when rendered, then slider is disabled', () => {
      const question = createQuestion({ type: 'range' });
      render(
        <RangeQuestion
          question={question}
          currentValue={undefined}
          onAnswer={onAnswer}
          locale="en"
          disabled={true}
        />,
      );
      expect(screen.getByRole('slider')).toBeDisabled();
    });
  });
});

describe('QuestionRenderer', () => {
  const onAnswer = vi.fn();
  beforeEach(() => {
    onAnswer.mockReset();
  });

  describe('given a question with help text', () => {
    it('when rendered, then shows help text', () => {
      const question = createQuestion({
        type: 'free-text',
        parameters: { help_text: 'Enter your name' },
      });
      render(
        <QuestionRenderer
          question={question}
          currentValue={undefined}
          onAnswer={onAnswer}
          locale="en"
          disabled={false}
        />,
      );
      expect(screen.getByText('Enter your name')).toBeInTheDocument();
    });
  });

  describe('given a question with an error', () => {
    it('when rendered, then shows error message with alert role', () => {
      const question = createQuestion({
        type: 'free-text',
        parameters: { error: 'This field is required' },
      });
      render(
        <QuestionRenderer
          question={question}
          currentValue={undefined}
          onAnswer={onAnswer}
          locale="en"
          disabled={false}
        />,
      );
      const error = screen.getByText('This field is required');
      expect(error).toBeInTheDocument();
      expect(error).toHaveAttribute('role', 'alert');
    });
  });

  describe('given a question with existing value', () => {
    it('when rendered, then passes currentValue to the question component', () => {
      const question = createQuestion({ type: 'free-text' });
      const currentValue = createResponse({ response_value_text: 'Existing' });
      render(
        <QuestionRenderer
          question={question}
          currentValue={currentValue}
          onAnswer={onAnswer}
          locale="en"
          disabled={false}
        />,
      );
      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.value).toBe('Existing');
    });
  });

  describe('given an unsupported question type', () => {
    it('when rendered, then shows error message', () => {
      const question = createQuestion({
        type: 'unsupported' as QuestionDefinition['type'],
      });
      render(
        <QuestionRenderer
          question={question}
          currentValue={undefined}
          onAnswer={onAnswer}
          locale="en"
          disabled={false}
        />,
      );
      expect(screen.getByText('Unsupported question type: unsupported')).toBeInTheDocument();
    });
  });
});
