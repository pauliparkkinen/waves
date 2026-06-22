import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import OptionsEditor from '../OptionsEditor';
import QuestionTypeSpecificParams from '../QuestionTypeSpecificParams';
import QuestionForm from '../QuestionForm';
import QuestionList from '../QuestionList';
import InlineCollectionCreator from '../InlineCollectionCreator';
import type { AdminQuestion, AdminCollection, Translation } from '@/lib/api';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

// Mock global fetch
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

function mockGetOk(times = 1) {
  for (let i = 0; i < times; i++) {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]), text: () => Promise.resolve('') });
  }
}

beforeEach(() => {
  mockFetch.mockReset();
});

const mockCollections: AdminCollection[] = [
  { collection_id: 'col-1', collection_symbol: 'financial', collection_permissions: [] },
  { collection_id: 'col-2', collection_symbol: 'clinical', collection_permissions: [] },
];

const mockQuestion: AdminQuestion = {
  collection_id: 'col-1',
  question_id: 'q-1',
  question_symbol: 'annual_revenue',
  condition_formula_id: undefined,
  type: 'free-text',
  version: 1,
  parameters: {},
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  translations: [],
};

// ── OptionsEditor tests ──────────────────────────────────────────────────────

const optionsEditorBaseProps = {
  collectionId: 'col-1',
  entitySymbol: 'test-question',
  accessToken: 'test-token',
  translations: [] as Translation[],
};

describe('OptionsEditor', () => {
  describe('given no options', () => {
    it('when rendered, then shows empty state and Add Option button', () => {
      mockGetOk(1); // TranslationField fetch
      render(<OptionsEditor options={[]} onChange={vi.fn()} {...optionsEditorBaseProps} />);
      expect(screen.getByText("No options defined. Click 'Add Option' to add one.")).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Add Option/i })).toBeInTheDocument();
    });
  });

  describe('given empty options', () => {
    it('when Add Option is clicked, then calls onChange with a new option row', () => {
      const onChange = vi.fn();
      mockGetOk(1); // TranslationField fetch
      render(<OptionsEditor options={[]} onChange={onChange} {...optionsEditorBaseProps} />);
      fireEvent.click(screen.getByRole('button', { name: /Add Option/i }));
      const callArg = onChange.mock.calls[0][0] as unknown[];
      expect(callArg).toHaveLength(1);
      const option = callArg[0] as Record<string, unknown>;
      expect(option.label).toBe('');
      expect(option.value).toBe('');
      expect(option.order_index).toBe(0);
      expect(option.id).toBeDefined();
    });
  });

  describe('given an option with label and value', () => {
    it('when Remove is clicked, then calls onChange without that option', () => {
      const options = [
        { label: 'Yes', value: 'yes', order_index: 0 },
        { label: 'No', value: 'no', order_index: 1 },
      ];
      const onChange = vi.fn();
      mockGetOk(2); // TranslationField fetch for each option card
      render(<OptionsEditor options={options} onChange={onChange} {...optionsEditorBaseProps} />);
      const removeButtons = screen.getAllByRole('button', { name: /Remove option/i });
      fireEvent.click(removeButtons[0]);
      expect(onChange).toHaveBeenCalledWith([
        { label: 'No', value: 'no', order_index: 1 },
      ]);
    });
  });

  describe('given an option row', () => {
    it('when value is changed, then calls onChange with updated value', () => {
      const options = [{ label: 'Old', value: 'val', order_index: 0 }];
      const onChange = vi.fn();
      mockGetOk(1); // TranslationField fetch
      render(<OptionsEditor options={options} onChange={onChange} {...optionsEditorBaseProps} />);
      const valueInput = screen.getByLabelText('Option 1 value');
      fireEvent.change(valueInput, { target: { value: 'new_value' } });
      expect(onChange).toHaveBeenCalledWith([{ label: 'Old', value: 'new_value', order_index: 0 }]);
    });
  });

  describe('given multiple options', () => {
    it('when rendered, then shows correct 1-based order numbers', () => {
      const options = [
        { label: 'A', value: 'a', order_index: 0 },
        { label: 'B', value: 'b', order_index: 1 },
        { label: 'C', value: 'c', order_index: 2 },
      ];
      mockGetOk(3); // TranslationField fetch for each option card
      render(<OptionsEditor options={options} onChange={vi.fn()} {...optionsEditorBaseProps} />);
      const orderNumbers = screen.getAllByText(/^\d+$/).filter(
        (el) => el.classList.contains('option-order'),
      ).map((el) => el.textContent);
      expect(orderNumbers).toEqual(['1', '2', '3']);
    });
  });

  describe('given initial options', () => {
    it('when Add Option is clicked multiple times, then all rows are added correctly', () => {
      let options = [{ label: 'First', value: '1', order_index: 5 }];
      const onChange = vi.fn().mockImplementation((newOpts: typeof options) => {
        options = newOpts;
      });
      mockGetOk(1); // TranslationField fetch for initial render
      const { rerender } = render(<OptionsEditor options={options} onChange={onChange} {...optionsEditorBaseProps} />);

      fireEvent.click(screen.getAllByRole('button', { name: /Add Option/i })[0]);
      const call1 = onChange.mock.calls[0][0] as unknown[];
      expect(call1).toHaveLength(2);
      expect(call1[0]).toMatchObject({ label: 'First', value: '1', order_index: 5 });
      expect(call1[1]).toMatchObject({ label: '', value: '', order_index: 6 });

      mockGetOk(2); // TranslationField fetch for rerender
      rerender(<OptionsEditor options={options} onChange={onChange} {...optionsEditorBaseProps} />);
      onChange.mockClear();
      fireEvent.click(screen.getAllByRole('button', { name: /Add Option/i })[0]);
      const call2 = onChange.mock.calls[0][0] as unknown[];
      expect(call2).toHaveLength(3);
      expect(call2[2]).toMatchObject({ label: '', value: '', order_index: 7 });
    });
  });
});

// ── QuestionTypeSpecificParams tests ─────────────────────────────────────────

const tsParamsBaseProps = {
  collectionId: 'col-1',
  entitySymbol: 'test-question',
  accessToken: 'test-token',
  translations: [] as Translation[],
};

describe('QuestionTypeSpecificParams', () => {
  describe('given no type', () => {
    it('when rendered, then shows select a question type message', () => {
      render(
        <QuestionTypeSpecificParams
          type={'' as never}
          parameters={{}}
          onChange={vi.fn()}
          {...tsParamsBaseProps}
        />,
      );
      expect(screen.getByText('Select a question type to see its parameters.')).toBeInTheDocument();
    });
  });

  describe('given free-text type', () => {
    it('when rendered, then shows max_length, placeholder, and multiline fields', () => {
      render(
        <QuestionTypeSpecificParams
          type="free-text"
          parameters={{}}
          onChange={vi.fn()}
          {...tsParamsBaseProps}
        />,
      );
      expect(screen.getByLabelText('Max characters')).toBeInTheDocument();
      expect(screen.getByText('Placeholder')).toBeInTheDocument();
      expect(screen.getByLabelText('Multi-line text area')).toBeInTheDocument();
    });
  });

  describe('given range type', () => {
    it('when rendered, then shows min, max, step, and translation label fields', () => {
      render(
        <QuestionTypeSpecificParams
          type="range"
          parameters={{}}
          onChange={vi.fn()}
          {...tsParamsBaseProps}
        />,
      );
      expect(screen.getByLabelText('Min *')).toBeInTheDocument();
      expect(screen.getByLabelText('Max *')).toBeInTheDocument();
      expect(screen.getByLabelText('Step')).toBeInTheDocument();
      expect(screen.getByText('Minimum label')).toBeInTheDocument();
      expect(screen.getByText('Maximum label')).toBeInTheDocument();
    });
  });

  describe('given select type', () => {
    it('when rendered, then renders OptionsEditor', () => {
      render(
        <QuestionTypeSpecificParams
          type="select"
          parameters={{}}
          onChange={vi.fn()}
          {...tsParamsBaseProps}
        />,
      );
      expect(screen.getByText(/No options defined/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Add Option/i })).toBeInTheDocument();
    });
  });

  describe('given multi-select type', () => {
    it('when rendered, then renders OptionsEditor and min/max select fields', () => {
      render(
        <QuestionTypeSpecificParams
          type="multiselect"
          parameters={{}}
          onChange={vi.fn()}
          {...tsParamsBaseProps}
        />,
      );
      expect(screen.getByText(/No options defined/)).toBeInTheDocument();
      expect(screen.getByLabelText('Minimum selections')).toBeInTheDocument();
      expect(screen.getByLabelText('Maximum selections')).toBeInTheDocument();
    });
  });

  describe('given radio type', () => {
    it('when rendered, then renders OptionsEditor', () => {
      render(
        <QuestionTypeSpecificParams
          type="radio"
          parameters={{}}
          onChange={vi.fn()}
          {...tsParamsBaseProps}
        />,
      );
      expect(screen.getByText(/No options defined/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Add Option/i })).toBeInTheDocument();
    });
  });

  describe('given free-text type with parameters', () => {
    it('when max_length is changed, then calls onChange with merged parameters', () => {
      const onChange = vi.fn();
      render(
        <QuestionTypeSpecificParams
          type="free-text"
          parameters={{}}
          onChange={onChange}
          {...tsParamsBaseProps}
        />,
      );
      const maxLengthInput = screen.getByLabelText('Max characters');
      fireEvent.change(maxLengthInput, { target: { value: '200' } });
      expect(onChange).toHaveBeenCalledWith({ max_length: 200 });
    });
  });

  describe('given select type with undefined options', () => {
    it('when rendered, then initializes empty options array', () => {
      render(
        <QuestionTypeSpecificParams
          type="select"
          parameters={{}}
          onChange={vi.fn()}
          {...tsParamsBaseProps}
        />,
      );
      expect(screen.getByText(/No options defined/)).toBeInTheDocument();
    });
  });
});

// ── QuestionForm tests ───────────────────────────────────────────────────────

describe('QuestionForm', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('given create mode', () => {
    it('when rendered, then shows "Create Question" heading', () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] }); // parent fetches translations once
      render(
        <QuestionForm
          collections={mockCollections}
          accessToken="test-token"
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      expect(screen.getByText('Create Question')).toBeInTheDocument();
    });
  });

  describe('given edit mode with a question', () => {
    it('when rendered, then shows "Edit Question" heading and pre-fills data', () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] }); // parent fetches translations once
      render(
        <QuestionForm
          question={mockQuestion}
          collections={mockCollections}
          accessToken="test-token"
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      expect(screen.getByText('Edit Question')).toBeInTheDocument();
      const symbolInput = screen.getByLabelText('Question Symbol') as HTMLInputElement;
      expect(symbolInput.value).toBe('annual_revenue');
    });
  });

  describe('given empty form', () => {
    it('when submitted, then shows validation errors for required fields', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] }); // parent fetches translations once
      render(
        <QuestionForm
          collections={mockCollections}
          accessToken="test-token"
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      fireEvent.click(screen.getByRole('button', { name: 'Create' }));
      expect(await screen.findByText('Question symbol is required')).toBeInTheDocument();
      expect(await screen.findByText('Collection is required')).toBeInTheDocument();
      expect(await screen.findByText('Question type is required')).toBeInTheDocument();
    });
  });

  describe('given a short symbol', () => {
    it('when submitted, then shows symbol length validation error', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] }); // parent fetches translations once
      render(
        <QuestionForm
          collections={mockCollections}
          accessToken="test-token"
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      const symbolInput = screen.getByLabelText('Question Symbol');
      fireEvent.change(symbolInput, { target: { value: 'a' } });
      fireEvent.click(screen.getByRole('button', { name: 'Create' }));
      expect(await screen.findByText('Question symbol must be at least 2 characters')).toBeInTheDocument();
    });
  });

  describe('given an invalid symbol', () => {
    it('when submitted, then shows symbol pattern validation error', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] }); // parent fetches translations once
      render(
        <QuestionForm
          collections={mockCollections}
          accessToken="test-token"
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      const symbolInput = screen.getByLabelText('Question Symbol');
      fireEvent.change(symbolInput, { target: { value: 'hello world' } });
      fireEvent.click(screen.getByRole('button', { name: 'Create' }));
      expect(
        await screen.findByText('Question symbol may only contain letters, numbers, and underscores'),
      ).toBeInTheDocument();
    });
  });

  describe('given type radio buttons', () => {
    it('when a radio is clicked, then that type is selected', () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] }); // parent fetches translations once
      render(
        <QuestionForm
          collections={mockCollections}
          accessToken="test-token"
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      const radio = screen.getByLabelText('Free-text') as HTMLInputElement;
      fireEvent.click(radio);
      expect(radio.checked).toBe(true);
    });
  });

  describe('given form with symbol and type but no collection', () => {
    it('when submitted, then shows collection required error', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] }); // parent fetches translations once
      render(
        <QuestionForm
          collections={mockCollections}
          accessToken="test-token"
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      fireEvent.change(screen.getByLabelText('Question Symbol'), { target: { value: 'test_symbol' } });
      fireEvent.click(screen.getByLabelText('Free-text'));
      fireEvent.click(screen.getByRole('button', { name: 'Create' }));
      expect(await screen.findByText('Collection is required')).toBeInTheDocument();
    });
  });

  describe('given valid create form', () => {
    it('when submitted, then calls POST /api/admin/questions with correct body', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] }); // parent fetches translations once
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] }); // refreshFormulas
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockQuestion),
        text: () => Promise.resolve(''),
      });

      render(
        <QuestionForm
          collections={mockCollections}
          accessToken="test-token"
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      fireEvent.change(screen.getByLabelText('Question Symbol'), { target: { value: 'test_symbol' } });
      fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'col-1' } });
      fireEvent.click(screen.getByLabelText('Free-text'));
      fireEvent.click(screen.getByRole('button', { name: 'Create' }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/admin/questions',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
            body: expect.stringContaining('test_symbol'),
          }),
        );
      });
    });
  });

  describe('given valid edit form', () => {
    it('when submitted, then calls PUT /api/admin/questions/:id with correct body', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] }); // parent fetches translations once
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] }); // refreshFormulas
      const editQuestion: AdminQuestion = {
        ...mockQuestion,
        question_id: 'q-1',
        question_symbol: 'original_symbol',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(editQuestion),
        text: () => Promise.resolve(''),
      });

      render(
        <QuestionForm
          question={editQuestion}
          collections={mockCollections}
          accessToken="test-token"
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      fireEvent.change(screen.getByLabelText('Question Symbol'), { target: { value: 'updated_symbol' } });
      fireEvent.click(screen.getByRole('button', { name: 'Update' }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/admin/questions/q-1',
          expect.objectContaining({
            method: 'PUT',
            body: expect.stringContaining('updated_symbol'),
          }),
        );
      });
    });
  });

  describe('given create form with type selected', () => {
    it('when type is selected, then type-specific params section appears', () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] }); // parent fetches translations once
      render(
        <QuestionForm
          collections={mockCollections}
          accessToken="test-token"
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      expect(screen.queryByText('Type Parameters')).not.toBeInTheDocument();
      fireEvent.click(screen.getByLabelText('Free-text'));
      expect(screen.getByText('Type Parameters')).toBeInTheDocument();
    });
  });

  describe('given create form', () => {
    it('when + New Collection is clicked, then shows InlineCollectionCreator modal', () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] }); // parent fetches translations once
      render(
        <QuestionForm
          collections={mockCollections}
          accessToken="test-token"
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      fireEvent.click(screen.getByRole('button', { name: /\+ New Collection/i }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Create Collection')).toBeInTheDocument();
    });
  });

  describe('given create form with valid data', () => {
    it('when Cancel is clicked, then calls onCancel', () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] }); // parent fetches translations once
      const onCancel = vi.fn();
      render(
        <QuestionForm
          collections={mockCollections}
          accessToken="test-token"
          onSave={vi.fn()}
          onCancel={onCancel}
        />,
      );
      fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('given valid form with API error', () => {
    it('when submitted, then shows error banner', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] }); // parent fetches translations once
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] }); // refreshFormulas
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Validation failed'),
      });

      render(
        <QuestionForm
          collections={mockCollections}
          accessToken="test-token"
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      fireEvent.change(screen.getByLabelText('Question Symbol'), { target: { value: 'test_symbol' } });
      fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'col-1' } });
      fireEvent.click(screen.getByLabelText('Free-text'));
      fireEvent.click(screen.getByRole('button', { name: 'Create' }));

      expect(await screen.findByText('Validation failed')).toBeInTheDocument();
    });
  });

  describe('given valid form with network error', () => {
    it('when submitted, then shows generic error message', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] }); // parent fetches translations once
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] }); // refreshFormulas
      mockFetch.mockRejectedValueOnce(new TypeError('Network error'));

      render(
        <QuestionForm
          collections={mockCollections}
          accessToken="test-token"
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />,
      );

      fireEvent.change(screen.getByLabelText('Question Symbol'), { target: { value: 'test_symbol' } });
      fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'col-1' } });
      fireEvent.click(screen.getByLabelText('Free-text'));
      const createBtn = screen.getByRole('button', { name: 'Create' });
      fireEvent.click(createBtn);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    }, 5000);
  });
});

// ── QuestionList tests ───────────────────────────────────────────────────────

const mockQuestions: AdminQuestion[] = [
  {
    collection_id: 'col-1',
    question_id: 'q-1',
    question_symbol: 'revenue',
    condition_formula_id: undefined,
    type: 'free-text',
    version: 1,
    parameters: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    translations: [],
  },
  {
    collection_id: 'col-2',
    question_id: 'q-2',
    question_symbol: 'diagnosis',
    condition_formula_id: undefined,
    type: 'select',
    version: 2,
    parameters: {},
    created_at: '2026-01-02T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
    translations: [],
  },
];

describe('QuestionList', () => {
  describe('given questions with data', () => {
    it('when rendered, then shows table with question data', () => {
      render(
        <QuestionList
          initialQuestions={mockQuestions}
          collections={mockCollections}
          accessToken="test-token"
        />,
      );
      expect(screen.getByText('Questions')).toBeInTheDocument();
      expect(screen.getByText('revenue')).toBeInTheDocument();
      expect(screen.getByText('diagnosis')).toBeInTheDocument();
      expect(screen.getByText('free-text')).toBeInTheDocument();
      expect(screen.getByText('select')).toBeInTheDocument();
      // 'financial' and 'clinical' appear in both filter dropdown and table data
      const clinicalElements = screen.getAllByText('clinical');
      expect(clinicalElements.length).toBeGreaterThanOrEqual(1);
      const financialElements = screen.getAllByText('financial');
      expect(financialElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('given questions with data', () => {
    it('when rendered, then shows Create Question button', () => {
      render(
        <QuestionList
          initialQuestions={mockQuestions}
          collections={mockCollections}
          accessToken="test-token"
        />,
      );
      expect(
        screen.getByRole('button', { name: /Create Question/i }),
      ).toBeInTheDocument();
    });
  });

  describe('given empty questions array', () => {
    it('when rendered, then shows "No questions yet" message', () => {
      render(
        <QuestionList
          initialQuestions={[]}
          collections={mockCollections}
          accessToken="test-token"
        />,
      );
      expect(
        screen.getByText(/No questions yet/),
      ).toBeInTheDocument();
    });
  });

  describe('given questions and collections', () => {
    it('when rendered, then shows collection filter selector', () => {
      render(
        <QuestionList
          initialQuestions={mockQuestions}
          collections={mockCollections}
          accessToken="test-token"
        />,
      );
      expect(screen.getByLabelText('Filter by collection')).toBeInTheDocument();
      const options = screen.getAllByRole('option');
      const optionTexts = options.map((o) => o.textContent);
      expect(optionTexts).toContain('financial');
      expect(optionTexts).toContain('clinical');
    });
  });

  describe('given questions with data', () => {
    it('when Edit is clicked on a row, then renders QuestionForm for that question', () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] }); // parent fetches translations once
      render(
        <QuestionList
          initialQuestions={mockQuestions}
          collections={mockCollections}
          accessToken="test-token"
        />,
      );
      const editButton = screen.getByRole('button', { name: /Edit revenue/i });
      fireEvent.click(editButton);
      expect(screen.getByText('Edit Question')).toBeInTheDocument();
    });
  });

  describe('given questions with data', () => {
    it('when Delete is clicked, then shows confirmation modal', () => {
      render(
        <QuestionList
          initialQuestions={mockQuestions}
          collections={mockCollections}
          accessToken="test-token"
        />,
      );
      const deleteButton = screen.getByRole('button', { name: /Delete revenue/i });
      fireEvent.click(deleteButton);
      expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
      expect(screen.getByText(/Are you sure/)).toBeInTheDocument();
    });

    it('when Delete is clicked then Cancel in modal, then modal is dismissed', () => {
      render(
        <QuestionList
          initialQuestions={mockQuestions}
          collections={mockCollections}
          accessToken="test-token"
        />,
      );
      const deleteButton = screen.getByRole('button', { name: /Delete revenue/i });
      fireEvent.click(deleteButton);

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelButton);
      expect(screen.queryByText('Confirm Delete')).not.toBeInTheDocument();
    });

    it('when Delete is clicked then confirmed, then calls DELETE API and refreshes', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      render(
        <QuestionList
          initialQuestions={mockQuestions}
          collections={mockCollections}
          accessToken="test-token"
        />,
      );

      const deleteButton = screen.getByRole('button', { name: /Delete revenue/i });
      fireEvent.click(deleteButton);

      const confirmButton = screen.getByRole('dialog').querySelector('.btn-danger');
      expect(confirmButton).not.toBeNull();
      fireEvent.click(confirmButton!);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/admin/questions/q-1',
          expect.objectContaining({ method: 'DELETE' }),
        );
      });
    });
  });
});

// ── InlineCollectionCreator tests ────────────────────────────────────────────

describe('InlineCollectionCreator', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('given initial render', () => {
    it('when rendered, then shows modal with symbol input', () => {
      render(
        <InlineCollectionCreator
          accessToken="test-token"
          onCreated={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByLabelText('Collection Symbol')).toBeInTheDocument();
      expect(screen.getByText('Create Collection')).toBeInTheDocument();
    });
  });

  describe('given empty symbol', () => {
    it('when Create is clicked, then shows required validation error', async () => {
      render(
        <InlineCollectionCreator
          accessToken="test-token"
          onCreated={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      fireEvent.click(screen.getByRole('button', { name: 'Create' }));
      expect(await screen.findByText('Collection symbol is required')).toBeInTheDocument();
    });
  });

  describe('given short symbol', () => {
    it('when Create is clicked, then shows length validation error', async () => {
      render(
        <InlineCollectionCreator
          accessToken="test-token"
          onCreated={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      const input = screen.getByLabelText('Collection Symbol');
      fireEvent.change(input, { target: { value: 'a' } });
      fireEvent.click(screen.getByRole('button', { name: 'Create' }));
      expect(
        await screen.findByText('Collection symbol must be at least 2 characters'),
      ).toBeInTheDocument();
    });
  });

  describe('given symbol with special characters', () => {
    it('when Create is clicked, then shows pattern validation error', async () => {
      render(
        <InlineCollectionCreator
          accessToken="test-token"
          onCreated={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      const input = screen.getByLabelText('Collection Symbol');
      fireEvent.change(input, { target: { value: 'hello world' } });
      fireEvent.click(screen.getByRole('button', { name: 'Create' }));
      expect(
        await screen.findByText(
          'Collection symbol may only contain letters, numbers, and underscores',
        ),
      ).toBeInTheDocument();
    });
  });

  describe('given valid symbol', () => {
    it('when submitted, then calls POST /api/admin/collections and onCreated', async () => {
      const createdCollection: AdminCollection = {
        collection_id: 'col-new',
        collection_symbol: 'valid_symbol',
        collection_permissions: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createdCollection),
        text: () => Promise.resolve(''),
      });

      const onCreated = vi.fn();
      render(
        <InlineCollectionCreator
          accessToken="test-token"
          userOrgId="org-1"
          onCreated={onCreated}
          onCancel={vi.fn()}
        />,
      );

      const input = screen.getByLabelText('Collection Symbol');
      fireEvent.change(input, { target: { value: 'valid_symbol' } });
      fireEvent.click(screen.getByRole('button', { name: 'Create' }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/admin/collections',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
            body: expect.stringContaining('valid_symbol'),
          }),
        );
      });
      expect(onCreated).toHaveBeenCalledWith(createdCollection);
    });
  });

  describe('given modal open', () => {
    it('when Cancel is clicked, then calls onCancel', () => {
      const onCancel = vi.fn();
      render(
        <InlineCollectionCreator
          accessToken="test-token"
          onCreated={vi.fn()}
          onCancel={onCancel}
        />,
      );
      fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
      expect(onCancel).toHaveBeenCalled();
    });
  });
});
