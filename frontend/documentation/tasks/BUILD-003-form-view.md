# Build Instruction: Form View — Frontend (Navigation & Section Rendering)

**ID**: BUILD-003
**Feature**: FEAT-4 (Form View)
**Target**: Frontend form view for filling, reviewing, and previewing form response groups
**Authored**: 2026-06-23
**Prerequisites**: 
- Backend form-response module API must be operational (TASK-21, TASK-22)
- Form editor admin UI (BUILD-002) must be operational for form definition creation
- `frontend/src/lib/api/admin.ts` contains admin types; this spec adds form-response types and client

## Objective

Implement the core form view component for filling, reviewing, and previewing form response groups across all three UIs (patient, HCP, admin). Provides sequential section navigation with completion summaries, question renderers for all types, progress tracking, localization, and WCAG 2.2 compliance.

## Referenced Process_guard Documents

### Feature
| ID | Title |
|----|-------|
| FEAT-4 | Form View |

### Requirements
| ID | Title |
|----|-------|
| REQ-19 | Sequential Form Navigation |
| REQ-18 | Form Response Data Persistence |
| REQ-20 | Immediate Answer Synchronization |
| REQ-21 | Multi-Role Form Access and Delegation |
| REQ-22 | Form Submission and Immutability |
| REQ-13 | WCAG 2.2 Conformance |
| REQ-14 | Accessible Keyboard Navigation |
| REQ-15 | Non-Text Content Alternatives |
| REQ-16 | Color and Contrast Accessibility |
| REQ-17 | Focus Indication and Navigation |

### Design Documents
| Document | Description |
|----------|-------------|
| `design/user_interfaces/common/features/form_view.md` | Primary form view specification |
| `design/definitions/form_definition/form.md` | Form definition data model |
| `design/definitions/form_definition/section.md` | Section definition data model |
| `design/definitions/form_definition/question.md` | Question definition data model |
| `design/definitions/form_definition/translation.md` | Translation data model |
| `design/definitions/form_response/form_response_group.md` | Form response group data model |
| `design/definitions/form_response/form_response.md` | Form response data model |
| `design/definitions/form_response/question_response.md` | Question response data model |

## Key Design Decisions

- **Shared component library**: The form view is a common feature shared across all three UIs (patient, hcp, admin). Components are placed under `src/app/components/form-view/`.
- **Server components by default**: Components should be server components where possible. Client components (`"use client"`) are used only where interactivity is needed (question answering, navigation controls, save).
- **Plain CSS**: Continue with plain CSS in `globals.css` — no Tailwind, no CSS-in-JS.
- **API calls go server-side**: Form response data fetched via server-side API client (`lib/api/form-response.ts`). Client components call server proxy routes at `/api/form-response/*`.
- **Immediate persistence**: Each question answer is saved to the backend immediately upon completion (REQ-20). No manual save button.
- **Form definition data is loaded eagerly**: The full form definition (form + sections + questions + translations) is loaded once at the start, not per-section.
- **Localization through form definitions**: Translations come from the form definition's `translations` array. The active locale is determined from the user's session or a locale cookie.
- **Accessibility built-in**: All interactive elements must have visible focus indicators, correct ARIA roles/labels, and keyboard navigation. Color alone must not convey information.

## UI Architecture

### Routes

| Route | UI | Purpose |
|-------|----|---------|
| `/forms/[groupId]` | Patient, HCP | Fill mode — sequential section navigation |
| `/forms/[groupId]/review` | Patient, HCP | Review mode — read-only submitted answers |
| `/admin/preview/form/[formId]` | Admin | Preview mode — view form definition as filled form |
| `/admin/preview/section/[sectionId]` | Admin | Preview mode — view single section definition |
| `/admin/preview/question/[questionId]` | Admin | Preview mode — view single question definition |

### Component Tree

```
FormViewPage (server — fetches form response group + form definitions)
└── FormViewProvider (client — React context for form state)
    ├── FormViewLayout (client — overall layout wrapper)
    │   ├── FormHeader (server) — form title, progress bar, locale selector
    │   ├── FormNavigation (client) — form/section selector tabs, next/previous
    │   ├── SectionRenderer (client — manages current section state)
    │   │   ├── SectionHeader (server) — section title, description, required indicator
    │   │   ├── QuestionList (client)
    │   │   │   ├── QuestionRenderer (client — dispatches to type-specific renderer)
    │   │   │   │   ├── MultiSelectQuestion (client) — checkbox group
    │   │   │   │   ├── SelectOneQuestion (client) — radio group or select dropdown
    │   │   │   │   ├── FreeTextQuestion (client) — text input/textarea
    │   │   │   │   └── RangeQuestion (client) — slider with numeric display
    │   │   │   └── QuestionError (server) — validation error display
    │   │   └── SectionControls (client) — "Complete Section" / "Close Section" buttons
    │   ├── SectionSummary (client) — shows completed answers, reopen capability
    │   │   └── SummaryItem (server) — individual answer display with "Edit" button
    │   ├── IncompleteIndicator (client) — visual cue for incomplete sections
    │   ├── ProgressTracker (server) — progress across forms/sections/questions
    │   ├── FormCompletion (client) — end-of-form summary with uncompleted links
    │   └── SubmissionDialog (client) — confirmation modal before submission
    └── SaveIndicator (client) — shows save status (saving/saved/error)
```

### Data Flow

```
Page Load:
  Server Component (FormViewPage)
    → auth() to get session + accessToken
    → formResponseApi.getFormResponseGroup(groupId, accessToken)
    → formResponseApi.getFormDefinitions(formSymbols, accessToken, locale)
    → Renders FormViewProvider with initial data
  
User Answers Question:
  Client Component (QuestionRenderer variant)
    → Calls onAnswer(questionSymbol, responseValue)
    → FormViewProvider updates local state
    → Debounced save: formResponseApi.saveQuestionResponse(formResponseId, data, accessToken)
    → SaveIndicator shows "saving..." → "saved"

User Completes Section:
  Client Component (SectionControls)
    → SectionRenderer marks section as completed in state
    → SectionSummary appears showing answers
    → Next section becomes available

User Reopens Section:
  Client Component (SectionSummary → "Edit" button)
    → SectionRenderer sets section as active again
    → Questions show previously saved answers
    → Previous sections' summaries remain visible

User Submits:
  Client Component (SubmissionDialog)
    → Validates all required questions answered
    → Shows confirmation with warning about immutability
    → formResponseApi.submitFormResponseGroup(groupId, accessToken)
    → Redirects to /forms/[groupId]/review
```

## Form State Management

A React context (`FormViewProvider`) manages the following state:

```typescript
type FormViewState = {
  // Loading states
  isLoading: boolean;
  error: string | null;
  
  // Data
  formResponseGroup: FormResponseGroup;
  formDefinitions: FormDefinition[];
  formResponses: FormResponse[];
  questionResponses: Map<string, QuestionResponse>; // questionSymbol → response
  
  // Navigation
  currentFormIndex: number;
  currentSectionSymbol: string | null; // null = showing summary
  completedSections: Set<string>; // sectionSymbols that have been completed
  formOrder: FormWithSections[]; // ordered list of forms with their sections
  
  // Saving
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  
  // Mode
  mode: 'fill' | 'review' | 'preview';
  
  // Locale
  locale: string;
};

type FormWithSections = {
  formSymbol: string;
  formTitle: string;
  sections: SectionWithQuestions[];
};

type SectionWithQuestions = {
  sectionSymbol: string;
  sectionTitle: string;
  questions: QuestionDefinition[];
  isIncomplete: boolean;
};
```

## Component Specifications

### FormViewProvider (Client Context)
- **File**: `src/app/components/form-view/FormViewProvider.tsx`
- **Purpose**: Provides form state to all child components. Manages navigation, saving, completion state.
- **Key logic**:
  - `currentSectionSymbol` — tracks which section is currently open (null = showing summary)
  - `completedSections` — tracks which sections have been completed
  - When a section is completed, its answers are summarized and the section is marked complete
  - Opening a new section closes the current one (shows its summary)
  - `saveStatus` reflects the debounced save state
  - Handles locale switching

### FormNavigation
- **File**: `src/app/components/form-view/FormNavigation.tsx`
- **Purpose**: Sequential section navigation. Shows form/section list with next/previous controls.
- **Accessibility**: 
  - All controls operable via keyboard (Tab, Enter, Space, Arrow keys)
  - ARIA role="tablist" for section list
  - aria-current="step" for current section
  - aria-label on navigation buttons
  - Visible focus indicators on all interactive elements
- **States**:
  - **Active section**: Highlighted, full content visible
  - **Completed section**: Shows checkmark, clickable to reopen, summary visible when not active
  - **Incomplete section**: Shows warning icon, clickable to continue
  - **Upcoming section**: Dimmed/greyed, not clickable until previous completed
  - **Disabled**: All navigation disabled during save

### QuestionRenderer (Dispatcher)
- **File**: `src/app/components/form-view/QuestionRenderer.tsx`
- **Purpose**: Dispatches to the correct question type renderer based on question definition.
- **Logic**: Reads `question.type` and renders the appropriate component. Each renderer receives `question`, `currentValue`, `onAnswer`, `locale`, `disabled` props.
- **Accessibility**: 
  - Each question wrapped in `<fieldset>` with `<legend>` for the question text
  - aria-describedby for help text
  - Error messages linked via aria-describedby
  - Required questions indicated with aria-required="true"

### Question Type Renderers

#### MultiSelectQuestion
- **File**: `src/app/components/form-view/MultiSelectQuestion.tsx`
- **Type**: multiselect
- **UI**: Checkbox group with option labels
- **Renders from**: `question.parameters.options` array
- **Saves on**: Each checkbox change (immediate)
- **Accessibility**: 
  - Fieldset with legend
  - Each checkbox has accessible label
  - aria-checked state
  - Keyboard: Space to toggle

#### SelectOneQuestion
- **File**: `src/app/components/form-view/SelectOneQuestion.tsx`
- **Type**: select, radio
- **UI**: Radio group (3+ options) or select dropdown (>5 options). Use radio for ≤5 options per WCAG best practices.
- **Saves on**: Selection change (immediate)
- **Accessibility**:
  - Fieldset with legend for radio group
  - aria-labelledby on select
  - Keyboard: Arrow keys for radio group

#### FreeTextQuestion
- **File**: `src/app/components/form-view/FreeTextQuestion.tsx`
- **Type**: free-text
- **UI**: Textarea for multi-line, input for single-line (determined by `question.parameters.multiline`)
- **Saves on**: Debounced (300ms after typing stops) or on blur
- **Accessibility**:
  - Label associated via htmlFor/id
  - aria-describedby for character count if maxLength set
  - aria-invalid for validation errors

#### RangeQuestion
- **File**: `src/app/components/form-view/RangeQuestion.tsx`
- **Type**: range
- **UI**: Horizontal slider with min/max labels, current value display
- **Saves on**: Mouse up / touch end / blur (not on every slider movement)
- **Accessibility**:
  - Native `<input type="range">` with aria-valuemin, aria-valuemax, aria-valuenow
  - Visible numeric display alongside slider
  - Keyboard: Arrow keys to adjust

### SectionSummary
- **File**: `src/app/components/form-view/SectionSummary.tsx`
- **Purpose**: Shows a summary of completed section answers with ability to reopen for editing.
- **UI**: 
  - Section title
  - List of questions with answers displayed (read-only format)
  - "Edit" button for each question or entire section
  - If incomplete: warning banner with "Continue" button
- **States**:
  - **Complete**: All required questions answered. Green checkmark. "Edit" buttons visible.
  - **Incomplete**: Some required questions unanswered. Warning icon. "Continue" button prominent.
  - **Empty section**: No questions. Neutral display.
- **Accessibility**:
  - aria-live="polite" region for completion status
  - Focus moves to summary when section is completed/closed

### ProgressTracker
- **File**: `src/app/components/form-view/ProgressTracker.tsx`
- **Purpose**: Shows progress across multiple forms in a form response group.
- **UI**: 
  - Form names listed in order
  - Current form highlighted
  - Section progress within current form (e.g., "Section 3 of 5")
  - Question progress within current section (e.g., "Question 4 of 12")
  - Overall progress percentage bar
- **Accessibility**:
  - aria-valuenow, aria-valuemin, aria-valuemax on progress bar
  - role="progressbar"
  - Screen reader announces current position

### SaveIndicator
- **File**: `src/app/components/form-view/SaveIndicator.tsx`
- **Purpose**: Shows the save status of the current answer.
- **UI**: Small indicator (e.g., "Saving...", "Saved", "Error saving")
- **States**:
  - **idle**: Hidden
  - **saving**: Show spinner + "Saving..."
  - **saved**: Show "Saved" (auto-hide after 2s)
  - **error**: Show "Error saving" + retry button
- **Accessibility**: aria-live="polite"

### IncompleteIndicator
- **File**: `src/app/components/form-view/IncompleteIndicator.tsx`
- **Purpose**: Visual cue for incomplete sections in navigation.
- **UI**: Warning icon/badge next to incomplete section names
- **Accessibility**: aria-label="Incomplete section"

### FormCompletion
- **File**: `src/app/components/form-view/FormCompletion.tsx`
- **Purpose**: End-of-form screen showing overall completion status.
- **UI**: 
  - Summary of all sections (complete/incomplete)
  - Links to incomplete sections
  - "Submit" button if all required sections complete
- **States**:
  - **All complete**: Green checkmark, submit button enabled
  - **Some incomplete**: Warning, links to incomplete sections, disabled submit
- **Accessibility**:
  - aria-live="polite" for completion status
  - Focus lands on h1 at top of summary

### SubmissionDialog
- **File**: `src/app/components/form-view/SubmissionDialog.tsx`
- **Purpose**: Modal dialog for final submission confirmation.
- **UI**: 
  - "Are you sure you want to submit?" message
  - "I have reviewed my answers" checkbox (REQ-22)
  - Warning: "Answers cannot be modified after submission"
  - "Submit" and "Cancel" buttons
- **States**:
  - **Open**: Modal visible, backdrop
  - **Confirming**: Submit button disabled until checkbox checked
  - **Submitting**: Loading state
  - **Error**: Error message with retry
- **Accessibility**:
  - role="dialog", aria-modal="true"
  - Focus trap inside modal
  - Escape key to close
  - Focus returns to trigger button on close

## Types — New API Client Module

Create `frontend/src/lib/api/form-response.ts`:

```typescript
/**
 * Form Response API client — mirrors backend modules/form-response/ endpoints.
 * Server-side only. Client components use /api/form-response/* proxy routes.
 */

import { BACKEND_URL, authHeaders } from "./client";

// ── Types ────────────────────────────────────────────────────────────────────

export type FormResponseStatus = "draft" | "submitted";

export type FormResponseGroup = {
  form_response_group_id: string;
  form_responses: FormResponseSummary[];
};

export type FormResponseSummary = {
  form_response_id: string;
  form_symbol: string;
  form_version: number;
  status: FormResponseStatus;
  started_timestamp: string;
  submitted_timestamp?: string;
};

export type FormResponse = {
  form_response_id: string;
  form_response_group_id: string;
  collection_id: string;
  form_symbol: string;
  form_version: number;
  user_id: string;
  filling_user_id: string;
  status: FormResponseStatus;
  started_timestamp: string;
  submitted_timestamp?: string;
  question_responses: QuestionResponse[];
};

export type QuestionResponse = {
  question_response_id?: string;
  form_response_id: string;
  collection_id: string;
  question_symbol: string;
  question_version: number;
  response_value_text?: string;
  response_value_number?: number;
  response_value_boolean?: boolean;
};

// ── Form Definition Types (loaded alongside form response) ──────────────────

export type FormDefinition = {
  collection_id: string;
  form_symbol: string;
  version: number;
  form_sections: FormSectionRef[];
  status: "draft" | "published";
  translations: Record<string, string>; // locale → title
};

export type FormSectionRef = {
  section_symbol: string;
  version_number: number;
  order_number: number;
};

export type SectionDefinition = {
  section_symbol: string;
  version: number;
  section_questions: SectionQuestionRef[];
  condition_formula_id?: string;
  status: "draft" | "published";
  translations: Record<string, string>; // locale → title
};

export type SectionQuestionRef = {
  question_symbol: string;
  version_number: number;
  order_number: number;
  required: boolean;
};

export type QuestionDefinition = {
  question_symbol: string;
  version: number;
  type: "multiselect" | "select" | "radio" | "free-text" | "range";
  parameters: Record<string, unknown>;
  condition_formula_id?: string;
  translations: Record<string, string>; // locale → title/text
};

// ── API Functions ────────────────────────────────────────────────────────────

export async function getFormResponseGroup(
  groupId: string,
  accessToken?: string
): Promise<FormResponseGroup> {
  const res = await fetch(`${BACKEND_URL}/form-response/groups/${groupId}`, {
    headers: authHeaders(accessToken),
    cache: "no-store",
  });
  if (!res.ok)
    throw new Error(`Backend /form-response/groups/${groupId} returned ${res.status}`);
  return res.json() as Promise<FormResponseGroup>;
}

export async function getFormDefinitions(
  collectionId: string,
  formSymbols: string[],
  accessToken?: string
): Promise<FormDefinition[]> {
  const params = new URLSearchParams();
  formSymbols.forEach((s) => params.append("symbol", s));
  const res = await fetch(
    `${BACKEND_URL}/admin/forms/definitions?collection_id=${collectionId}&${params}`,
    { headers: authHeaders(accessToken), cache: "no-store" }
  );
  if (!res.ok)
    throw new Error(`Backend /admin/forms/definitions returned ${res.status}`);
  return res.json() as Promise<FormDefinition[]>;
}

export async function saveQuestionResponse(
  formResponseId: string,
  data: Omit<QuestionResponse, "question_response_id" | "form_response_id">,
  accessToken?: string
): Promise<QuestionResponse> {
  const res = await fetch(
    `${BACKEND_URL}/form-response/responses/${formResponseId}/questions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders(accessToken) },
      body: JSON.stringify(data),
      cache: "no-store",
    }
  );
  if (!res.ok)
    throw new Error(
      `Backend POST /form-response/responses/${formResponseId}/questions returned ${res.status}`
    );
  return res.json() as Promise<QuestionResponse>;
}

export async function submitFormResponseGroup(
  groupId: string,
  accessToken?: string
): Promise<void> {
  const res = await fetch(
    `${BACKEND_URL}/form-response/groups/${groupId}/submit`,
    {
      method: "POST",
      headers: authHeaders(accessToken),
      cache: "no-store",
    }
  );
  if (!res.ok)
    throw new Error(
      `Backend POST /form-response/groups/${groupId}/submit returned ${res.status}`
    );
}
```

## Route Handlers — Proxy API Routes

Create Next.js proxy API routes under `src/app/api/form-response/` to forward requests from client components to the backend (avoiding CORS):

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/form-response/groups/[groupId]` | GET | Fetch form response group data |
| `/api/form-response/responses/[formResponseId]/questions` | POST | Save question response |
| `/api/form-response/groups/[groupId]/submit` | POST | Submit form response group |

Each route handler follows the pattern in `src/app/api/admin/forms/route.ts`:
1. Get session via `auth()`
2. Extract `accessToken` from session
3. Forward request to backend with auth headers
4. Return response

## Accessibility Checklist (WCAG 2.2)

All components must conform to:

| Criterion | Requirement | Implementation |
|-----------|-------------|----------------|
| 1.1.1 (A) | Non-text content has text alternatives | Icons have aria-label, decorative icons have aria-hidden="true" |
| 1.4.1 (A) | Color not used as only means of conveying info | Incomplete sections use icon + text, not just color |
| 1.4.3 (AA) | Contrast minimum (4.5:1 text, 3:1 large text) | All text meets contrast ratios; verify with color contrast checker |
| 1.4.11 (AA) | Non-text contrast (3:1 for UI components) | Borders, focus indicators, icons meet contrast requirements |
| 2.1.1 (A) | Keyboard operable | All interactive elements reachable and operable via keyboard |
| 2.4.3 (A) | Focus order preserves meaning | Tab order follows visual order (section nav → questions → controls) |
| 2.4.7 (AA) | Focus visible | Custom focus ring on all focusable elements (2px solid, high contrast) |
| 2.4.5 (AA) | Multiple ways to navigate | Section navigation list + next/previous buttons |
| 3.3.2 (A) | Labels or instructions | All inputs have associated labels, required fields marked |
| 4.1.2 (A) | Name, Role, Value | All custom controls have correct ARIA roles |
| 4.1.3 (AA) | Status messages | aria-live regions for save status, section completion, errors |

## Files to Create

### New files (in order of creation):

1. `frontend/src/lib/api/form-response.ts` — API client types and functions
2. `frontend/src/app/api/form-response/groups/[groupId]/route.ts` — GET proxy
3. `frontend/src/app/api/form-response/responses/[formResponseId]/questions/route.ts` — POST proxy
4. `frontend/src/app/api/form-response/groups/[groupId]/submit/route.ts` — POST proxy
5. `frontend/src/app/components/form-view/FormViewProvider.tsx` — Context provider
6. `frontend/src/app/components/form-view/FormViewLayout.tsx` — Layout wrapper
7. `frontend/src/app/components/form-view/FormHeader.tsx` — Form header
8. `frontend/src/app/components/form-view/FormNavigation.tsx` — Section navigation
9. `frontend/src/app/components/form-view/SectionRenderer.tsx` — Section renderer
10. `frontend/src/app/components/form-view/QuestionRenderer.tsx` — Question dispatcher
11. `frontend/src/app/components/form-view/MultiSelectQuestion.tsx` — Multi-select renderer
12. `frontend/src/app/components/form-view/SelectOneQuestion.tsx` — Select-one renderer
13. `frontend/src/app/components/form-view/FreeTextQuestion.tsx` — Free-text renderer
14. `frontend/src/app/components/form-view/RangeQuestion.tsx` — Range slider renderer
15. `frontend/src/app/components/form-view/SectionSummary.tsx` — Section summary
16. `frontend/src/app/components/form-view/ProgressTracker.tsx` — Progress display
17. `frontend/src/app/components/form-view/SaveIndicator.tsx` — Save status indicator
18. `frontend/src/app/components/form-view/IncompleteIndicator.tsx` — Incomplete indicator
19. `frontend/src/app/components/form-view/FormCompletion.tsx` — End-of-form screen
20. `frontend/src/app/components/form-view/SubmissionDialog.tsx` — Submit confirmation modal
21. `frontend/src/app/forms/[groupId]/page.tsx` — Fill mode page
22. `frontend/src/app/forms/[groupId]/review/page.tsx` — Review mode page
23. `frontend/src/app/admin/preview/form/[formId]/page.tsx` — Admin preview page
24. `frontend/src/app/admin/preview/section/[sectionId]/page.tsx` — Section preview page
25. `frontend/src/app/admin/preview/question/[questionId]/page.tsx` — Question preview page
26. `frontend/src/lib/translations/form-view.ts` — Localization keys for form view UI strings (not form definition translations)

### Modified files:

1. `frontend/src/lib/api/index.ts` — Re-export new form-response types and functions
2. `frontend/src/app/globals.css` — Add CSS classes for form view components (`.form-view-*`, `.section-*`, `.question-*`, `.summary-*`, `.progress-*`)
3. `frontend/src/middleware.ts` — Add `/forms/:path*` to protected routes

## CSS Classes (to add to globals.css)

```css
/* Form View */
.form-view { }
.form-view__header { }
.form-view__progress { }
.form-view__navigation { }
.form-view__content { }

/* Section */
.section { border: 1px solid #e0e0e0; border-radius: 8px; padding: 1.5rem; margin-bottom: 1rem; }
.section__header { margin-bottom: 1rem; }
.section__title { font-size: 1.25rem; font-weight: 600; }
.section__questions { }
.section__controls { margin-top: 1.5rem; display: flex; gap: 0.5rem; justify-content: flex-end; }
.section--incomplete { border-color: #f59e0b; }
.section--completed { border-color: #10b981; }

/* Question */
.question { margin-bottom: 1.5rem; }
.question__label { font-weight: 500; margin-bottom: 0.5rem; display: block; }
.question__required::after { content: " *"; color: #ef4444; }
.question__help { font-size: 0.875rem; color: #6b7280; }
.question__error { color: #ef4444; font-size: 0.875rem; }

/* Summary */
.summary { background: #f9fafb; border-radius: 8px; padding: 1rem; }
.summary__item { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; }
.summary__answer { color: #374151; }
.summary__edit { color: #3b82f6; cursor: pointer; }

/* Progress */
.progress-bar { height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden; }
.progress-bar__fill { height: 100%; background: #3b82f6; transition: width 0.3s; }

/* Save indicator */
.save-indicator { font-size: 0.75rem; color: #6b7280; display: flex; align-items: center; gap: 0.25rem; }
.save-indicator--saving { color: #f59e0b; }
.save-indicator--saved { color: #10b981; }
.save-indicator--error { color: #ef4444; }
```

## Testing Requirements

1. **Unit tests** for each question renderer:
   - Renders correct UI for given question type
   - Calls onAnswer with correct value on interaction
   - Handles disabled state
   - Displays validation errors

2. **Integration tests** for SectionRenderer:
   - Section completion marks as complete
   - Summary shows after completion
   - Reopen restores answers
   - Incomplete indicator shows when required questions unanswered

3. **Integration tests** for FormNavigation:
   - Clicking next/previous switches section
   - Cannot navigate to incomplete section without completing current
   - Completed sections show in navigation

4. **Accessibility tests**:
   - All interactive elements focusable via keyboard
   - Correct ARIA roles and labels
   - aria-live regions announce state changes

5. **File**: `frontend/src/app/components/form-view/__tests__/`

## Implementation Order

### Phase 1 — Foundation
1. Create `lib/api/form-response.ts` with types and API client functions
2. Update `lib/api/index.ts` to re-export new module
3. Create proxy API route handlers
4. Update `middleware.ts` to protect `/forms/:path*`
5. Add CSS classes to `globals.css`

### Phase 2 — State and Navigation
6. Create `FormViewProvider.tsx` — context with all state management
7. Create `FormViewLayout.tsx` — layout wrapper
8. Create `FormHeader.tsx` — form header with progress
9. Create `FormNavigation.tsx` — section navigation with next/previous
10. Create `ProgressTracker.tsx` — progress bar

### Phase 3 — Question Renderers
11. Create `QuestionRenderer.tsx` — dispatcher component
12. Create `MultiSelectQuestion.tsx` — checkbox group
13. Create `SelectOneQuestion.tsx` — radio/select
14. Create `FreeTextQuestion.tsx` — text input
15. Create `RangeQuestion.tsx` — slider

### Phase 4 — Section and Summary
16. Create `SectionRenderer.tsx` — section container
17. Create `SectionSummary.tsx` — completed answers summary
18. Create `IncompleteIndicator.tsx` — incomplete warning

### Phase 5 — Completion and Submission
19. Create `SaveIndicator.tsx` — save status display
20. Create `FormCompletion.tsx` — end-of-form screen
21. Create `SubmissionDialog.tsx` — confirmation modal

### Phase 6 — Pages and Integration
22. Create `/forms/[groupId]/page.tsx` — fill mode
23. Create `/forms/[groupId]/review/page.tsx` — review mode
24. Create admin preview pages

## Verification

- `pnpm build` — no build errors
- Navigate to `/forms/[groupId]` — form loads with first section visible
- Next/Previous navigation switches sections correctly
- Answering a question auto-saves to backend
- Completing a section shows summary
- Reopening a section allows editing
- Incomplete sections show warning when closed
- Progress bar updates correctly
- Submission shows confirmation dialog
- After submission, answers are locked in review mode
- WCAG 2.2 compliance verified with axe-core or similar tool
- All tests pass
