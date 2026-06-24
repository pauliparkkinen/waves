# Build Instruction: Form View — Answer Persistence, Submission, and Role-Based UI

**ID**: BUILD-004
**Feature**: FEAT-4 (Form View)
**Target**: Frontend form view persistence, submission workflow, and role-specific UI modes
**Authored**: 2026-06-23
**Prerequisites**:
- TASK-23 (Form View Navigation and Section Rendering) — Approved, components exist in `frontend/src/app/components/form-view/`
- BUILD-003-form-view.md — Already implemented
- Backend form-response module API must be operational (TASK-21, TASK-22)

## Objective

Implement the answer persistence layer, submission workflow, and role-specific UI modes on top of the existing form view navigation components. This fills the gaps between the TASK-23 implementation and the full TASK-24 requirements.

## Gap Analysis — TASK-23 vs TASK-24

The TASK-23 implementation (Build-003) delivered a comprehensive form view with 16 components, API client, proxy routes, CSS, and tests. However, several items required by TASK-24 are not yet implemented:

| # | Item | Status in Codebase | Action Required |
|---|------|-------------------|-----------------|
| 1 | Immediate save with retry and exponential backoff | `saveAnswer()` in `FormViewProvider` has try/catch but no retry logic | Add `retryWithBackoff()` utility and use in `saveAnswer()` |
| 2 | Network error display with retry instruction | `SaveIndicator` shows error but retry button only resets status, doesn't re-attempt save | Wire retry button to re-invoke `saveAnswer()` |
| 3 | Save-and-resume: load definitions | `forms/[groupId]/page.tsx` passes empty arrays for form/section/question definitions | Load definitions via `getFormDefinitions()` like admin preview does |
| 4 | Save-and-resume: load existing answers | `questionResponses` is always empty Map | Load existing `question_responses` from backend |
| 5 | Save-and-resume: continue from first unanswered | Not implemented | Auto-navigate to first unanswered question on load |
| 6 | SubmissionDialog not wired | `SubmissionDialog.tsx` exists but is never imported | Wire dialog into `FormViewPageClient` between "Submit" click and actual API call |
| 7 | Review mode: read-only enforcement | `mode: 'review'` passed but components don't disable editing | Pass `disabled={mode === 'review'}` through to question renderers |
| 8 | Review mode: hide submit/edit in review | `SectionSummary` and `FormCompletion` show edit/submit buttons regardless of mode | Conditionally hide buttons in review mode |
| 9 | On-behalf-of filling (HCP patient selector) | Not implemented at all | Create patient selector component, identify HCP role from session |
| 10 | Dashboard placeholder | Dashboard only shows "coming soon" | Enhance with form response group listings |

---

## Phase 1 — Save with Retry and Exponential Backoff (REQ-20, RMITIG-4)

### 1.1 Create retry utility

**File**: `frontend/src/lib/api/retry.ts`

```typescript
/**
 * Retry utility with exponential backoff for API calls.
 * Used by form-response save operations to mitigate transient network failures.
 */

export type RetryOptions = {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
};

const defaultOptions: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
};

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options?: RetryOptions,
): Promise<T> {
  const { maxRetries, baseDelayMs, maxDelayMs } = { ...defaultOptions, ...options };
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
```

### 1.2 Modify SaveIndicator to support retry

**File**: `frontend/src/app/components/form-view/SaveIndicator.tsx`

Changes:
- Accept an `onRetry` callback prop
- When in `error` state, the retry button calls `onRetry` instead of just resetting status
- Show clearer error message with user instructions (e.g., "Network error. Your response has been saved locally and will be retried.")

### 1.3 Modify FormViewProvider saveAnswer with retry

**File**: `frontend/src/app/components/form-view/FormViewProvider.tsx`

Changes to `saveAnswer`:
- Wrap the fetch in `retryWithBackoff()`
- Implement a queue of failed saves that can be retried manually
- Track `pendingRetries: Set<string>` (question symbols with pending retries)
- Expose `retryFailedSave(questionSymbol)` action so SaveIndicator can trigger retry
- After all retries exhausted, set `saveStatus: 'error'` and store the failed question symbols

---

## Phase 2 — Save-and-Resume: Definition and Answer Loading

### 2.1 Modify forms/[groupId]/page.tsx

**File**: `frontend/src/app/forms/[groupId]/page.tsx`

Currently passes empty arrays for definitions and empty Map for question responses. Change to:

1. Get the collection_id from the form response group (need to examine the backend response)
2. Extract form_symbols from form_responses
3. Call `getFormDefinitions(collectionId, formSymbols, accessToken)` to load form/section/question definitions
4. Load section definitions and question definitions using the admin API (like admin preview pages do)
5. Load existing question responses from the form response data
6. Determine first unanswered question for auto-navigation

The key challenge is that the current `FormResponseGroup` type only returns `FormResponseSummary[]` which doesn't include `question_responses`. The backend may need to be queried separately for each form response's question responses, or the `getFormResponseGroup` endpoint needs enhancement.

Since the `FormResponse` type includes `question_responses`, we need to either:
- a) Fetch each form response individually to get question responses, OR
- b) Have the backend return question responses with the group

For now, implement approach (a): after getting the group, fetch individual form responses if a `getFormResponse` endpoint exists, or if not, first create a new API function that fetches question responses for a form response.

**New API function in `form-response.ts`:**
```typescript
export async function getQuestionResponses(
  formResponseId: string,
  accessToken?: string
): Promise<QuestionResponse[]> {
  const res = await fetch(
    `${BACKEND_URL}/form-response/responses/${formResponseId}/questions`,
    { headers: authHeaders(accessToken), cache: "no-store" }
  );
  if (!res.ok) throw new Error(`Failed to fetch question responses for ${formResponseId}`);
  return res.json() as Promise<QuestionResponse[]>;
}
```

### 2.2 Add proxy route for GET question responses

**File**: `frontend/src/app/api/form-response/responses/[formResponseId]/questions/route.ts`

Currently only handles POST. Add GET handler to fetch existing question responses from backend.

### 2.3 Determine first unanswered question

In `forms/[groupId]/page.tsx`, after loading existing question responses:
1. Walk through all sections/questions in order
2. Find the first question that has no response
3. Pass this as `initialSectionSymbol` in the initial data
4. `FormViewProvider` uses this to set the initial `currentSectionSymbol`

### 2.4 Extend FormViewProvider initialData

Add optional `initialSectionSymbol: string | null` to the initial data. Use it in the `useEffect` that sets `currentSectionSymbol`.

---

## Phase 3 — Review Mode: Read-Only Enforcement (REQ-21)

### 3.1 Pass disabled based on mode

**File**: `frontend/src/app/components/form-view/FormViewPageClient.tsx`

```typescript
<FormViewProvider initialData={initialData} accessToken={accessToken}>
  <FormViewLayout ...>
    <SectionRenderer disabled={initialData.mode === 'review'} />
    ...
  </FormViewLayout>
</FormViewProvider>
```

### 3.2 SectionRenderer accepts disabled prop

**File**: `frontend/src/app/components/form-view/SectionRenderer.tsx`

Add `disabled` prop. When true:
- Pass `disabled={true}` to all `QuestionRenderer` instances
- Hide the "Complete Section" button
- In the summary view (when `currentSectionSymbol === null`), show sections with their questions but no edit buttons

### 3.3 SectionSummary hides edit in review

**File**: `frontend/src/app/components/form-view/SectionSummary.tsx`

Add `readOnly` prop. When true:
- Do not show the "Edit" button on each summary item
- Do not show the "Continue" button for incomplete sections

### 3.4 QuestionRenderer and individual renderers already accept disabled

The question renderers (`MultiSelectQuestion`, `SelectOneQuestion`, `FreeTextQuestion`, `RangeQuestion`) already accept a `disabled` prop and pass it to their input elements. No changes needed beyond passing the prop correctly.

---

## Phase 4 — Submission Workflow (REQ-22)

### 4.1 Wire SubmissionDialog into FormViewPageClient

**File**: `frontend/src/app/components/form-view/FormViewPageClient.tsx`

Current flow: `FormCompletion` "Submit" button → `handleSubmit` → API call

New flow: `FormCompletion` "Submit" button → open `SubmissionDialog` → user confirms → API call → redirect to review page

Changes:
1. Add state for `isDialogOpen`, `isSubmitting`, `submitError`
2. `handleSubmit` now opens the dialog instead of calling API
3. `handleConfirmSubmit` is a new callback that calls the API
4. `handleSubmitSuccess` redirects to `/forms/[groupId]/review`
5. Render `SubmissionDialog` with the proper props

```typescript
const [isDialogOpen, setDialogOpen] = useState(false);
const [isSubmitting, setSubmitting] = useState(false);
const [submitError, setSubmitError] = useState<string | null>(null);

// Opens the confirmation dialog
const handleOpenDialog = useCallback(() => {
  setDialogOpen(true);
}, []);

// Called when user confirms in dialog
const handleConfirmSubmit = useCallback(async () => {
  setSubmitting(true);
  setSubmitError(null);
  try {
    const res = await fetch(`/api/form-response/groups/${groupId}/submit`, {
      method: 'POST',
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(/* ... */);
    }
    window.location.href = `/forms/${groupId}/review`;
  } catch (err) {
    setSubmitError(err instanceof Error ? err.message : 'Submit failed');
    setSubmitting(false);
  }
}, [groupId, accessToken]);
```

### 4.2 FormCompletion passes open dialog handler

**File**: `frontend/src/app/components/form-view/FormViewPageClient.tsx`

Pass `handleOpenDialog` instead of `handleSubmit` to `FormCompletion`.

Update `FormCompletion` prop type from `onSubmit: () => void` to `onSubmit: () => void` (same interface, just different behavior).

### 4.3 Add submitted state indicator

After successful submission, show a confirmation message. The redirect to `/forms/[groupId]/review` already handles this since the review page shows the read-only view.

---

## Phase 5 — On-Behalf-Of Filling (REQ-21)

### 5.1 Patient selector component

**File**: `frontend/src/app/components/form-view/PatientSelector.tsx`

A client component that:
- Shows a search input for finding patients
- Lists matching patients with name, DOB, and ID
- Allows selection of a patient to fill on behalf of
- Uses an API endpoint to search patients (backend endpoint TBD)
- Shows current selection: "Filling on behalf of: [Patient Name]"
- Is only rendered when the current user has HCP role

```typescript
type PatientSelectorProps = {
  onSelectPatient: (patientId: string) => void;
  selectedPatientId?: string;
  locale?: string;
};
```

### 5.2 Role detection

**File**: `frontend/src/app/forms/[groupId]/page.tsx`

Determine role from session. Auth.js session may contain role information. If not, add fallback:
- Read a `role` claim from the session
- If role is `hcp` or `admin`, show the patient selector
- If role is `patient` or unknown, show normal fill mode

### 5.3 HCP fill mode page

**File**: `frontend/src/app/forms/[groupId]/page.tsx` (or create `frontend/src/app/forms/[groupId]/fill/page.tsx`)

For HCP users:
1. First show the patient selector
2. After patient selected, show the form view
3. Set `filling_user_id` in the form response creation

Since the current form view doesn't support a two-step flow, implement as:
1. Server component checks role
2. If HCP and no `patientId` in URL params, redirect to a patient selection page
3. If patient selected, pass `patientId` to form view

Actually simpler: use a client-side state in `FormViewPageClient` that shows the patient selector first if in HCP mode and no patient selected yet.

---

## Phase 6 — Dashboard Enhancement

### 6.1 Dashboard page

**File**: `frontend/src/app/dashboard/page.tsx`

Currently a placeholder. Enhance to show:
- List of user's form response groups with status (draft/submitted)
- Links to continue filling draft forms
- Links to review submitted forms
- "Start new form" button linking to form selection

This requires a new API endpoint or using existing ones. Since the backend may not have a "list user's form response groups" endpoint yet, implement a basic version:
- If the auth session has a `userId`, call backend to list form response groups
- Display as a table with form name, status, started date, and action links

---

## Files to Create

1. `frontend/src/lib/api/retry.ts` — Retry with exponential backoff utility
2. `frontend/src/app/components/form-view/PatientSelector.tsx` — Patient selector for HCP fill mode

## Files to Modify

1. `frontend/src/app/components/form-view/FormViewProvider.tsx` — Retry logic, initial section symbol, pending retries tracking
2. `frontend/src/app/components/form-view/SaveIndicator.tsx` — Retry callback, better error messaging
3. `frontend/src/app/components/form-view/FormViewPageClient.tsx` — Wire SubmissionDialog, disabled prop, review mode
4. `frontend/src/app/components/form-view/FormCompletion.tsx` — Conditionally hide submit in review mode
5. `frontend/src/app/components/form-view/SectionRenderer.tsx` — Accept disabled prop, hide buttons in review
6. `frontend/src/app/components/form-view/SectionSummary.tsx` — readOnly prop, hide edit buttons
7. `frontend/src/app/forms/[groupId]/page.tsx` — Load definitions and existing answers
8. `frontend/src/app/forms/[groupId]/review/page.tsx` — Ensure review mode loads definitions too
9. `frontend/src/app/api/form-response/responses/[formResponseId]/questions/route.ts` — Add GET handler
10. `frontend/src/lib/api/form-response.ts` — Add `getQuestionResponses` function
11. `frontend/src/lib/translations/form-view.ts` — Add new UI strings
12. `frontend/src/app/dashboard/page.tsx` — Enhanced dashboard with form listings
13. `frontend/src/app/globals.css` — Add any needed CSS classes for new components

## Files That Need No Changes (Already Handle Correctly)

- Individual question renderers (`MultiSelectQuestion`, `SelectOneQuestion`, `FreeTextQuestion`, `RangeQuestion`) — already accept `disabled` prop
- `QuestionRenderer` — already passes `disabled` through
- `FormNavigation` — works correctly, no changes needed
- `ProgressTracker` — works correctly, no changes needed
- `FormHeader` — works correctly, no changes needed
- `FormViewLayout` — works correctly, no changes needed
- `IncompleteIndicator` — works correctly, no changes needed
- `SubmissionDialog` — already complete, just needs to be wired

## Testing Requirements

1. **Retry logic unit tests** in `frontend/src/lib/api/__tests__/retry.test.ts`:
   - Retries on failure
   - Exponential backoff delays increase
   - Succeeds after N retries
   - Throws after exhausting retries
   - Passes through on success

2. **Integration tests** for submission flow:
   - Clicking submit opens confirmation dialog
   - Dialog cannot confirm without reviewing checkbox
   - Confirming submit calls the API
   - Successful submit redirects to review

3. **Review mode tests**:
   - All question inputs are disabled
   - Section edit buttons are hidden
   - Submit button is hidden
   - "Complete Section" button is hidden

4. **Save-and-resume tests**:
   - Loads existing question responses
   - Navigates to first unanswered question

## Implementation Order

### Phase 1 — Foundation (Retry Utility)
1. Create `frontend/src/lib/api/retry.ts`
2. Modify `FormViewProvider.tsx` to use retry in `saveAnswer`
3. Modify `SaveIndicator.tsx` with retry callback

### Phase 2 — Save-and-Resume (Definition Loading)
4. Add `getQuestionResponses` to `lib/api/form-response.ts`
5. Add GET handler to proxy route
6. Modify `forms/[groupId]/page.tsx` to load definitions and existing answers
7. Modify `forms/[groupId]/review/page.tsx` to load definitions too
8. Add `initialSectionSymbol` support to `FormViewProvider`

### Phase 3 — Review Mode
9. Add `disabled` prop to `SectionRenderer`
10. Add `readOnly` prop to `SectionSummary`
11. Modify `FormViewPageClient` to pass mode-based disabled

### Phase 4 — Submission
12. Wire `SubmissionDialog` into `FormViewPageClient`

### Phase 5 — Dashboard
13. Enhance dashboard page

### Phase 6 — On-Behalf-Of Filling
14. Create `PatientSelector` component
15. Integrate into form view for HCP users

## Verification

- `pnpm build` — no build errors
- Navigate to `/forms/[groupId]` — form loads with definitions and existing answers
- Save with network interruption — retries with backoff, shows error if all retries fail
- Retry button re-attempts save
- Close and reopen form — continues from first unanswered question
- Review mode — all inputs disabled, no edit/submit buttons
- Submission shows confirmation dialog
- After submission, redirects to review page
- HCP users see patient selector
- Dashboard shows form list
