# Purpose

The form view is intended to fill one or multiple forms and for reviewing the form answers in same format as done by the user. Effectively, the view is intended to handle a form response group (design/definitions/form_response/form_response_group.md).  In addition, the view shall be used for previewing form, section, or question definitions in the form editor. When filling a form a form response (design/definitions/form_response/form_response.md) is created for each of the forms in the form response group. 

# Requirements
1. When using the form view, the forms and sections are appearing one by one in the defined order.
2. The forms and sections are separated clearly from each other.
3. After a section has been completed, a summary of the section answers is being shown at the place of the section. 
4. Only one section can be open at once. Once another section is opened, the currently opened is closed and the summary is shown.
5. The user can reopen a completed section for further editing while filling the form.
6. If an incomplete section is closed, it is clearly indicated that the section is incomplete.
7. The view is localized. Majority of the localizations shall come through form definitions.
8. A form response group can be closed at any stage and reopened for completion later. The form filling shall continue from the first unanswered question.
9. All question responses shall be saved immediately upon completion of the answering action to the backend. This ensures that the form completion can continue where left off.
10. A form response group can be filled by another user on behalf of a patient user.
11. A form filling instance can be opened for review by the patient user, the person that filled the form, or by an hcp that has the rights to do so. In the review mode, the answers can't be modified.
12. Once all sections and all (visible and required) questions of all sections have been filled, the form can be submitted with a question. The user shall be confirm that they have reviewed the answers. In addition, they will be warned that the form answers can no longer be modified after submission.
13. In the end of the form, it is clearly indicated if there are uncompleted sections. Links to the uncompleted sections shall be provided for easy access.
14. The view shall be accessible and WCAG 2.2 compliant.

# Architecture

## Data Model
The form view operates on form response data stored in the backend:
- **Form Response Group**: Groups multiple forms filled together. Contains a `form_response_group_id`.
- **Form Response**: A single form's response within a group. Contains references to form definition (symbol, version), user, filler user, status (Draft/Submitted), and timestamps.
- **Question Response**: Individual answer to a question. Contains the response value (text, number, or boolean) and references to the question definition (symbol, version).
- **Formula Value**: Computed output of a formula evaluated from question responses and other formula values.

All response data is versioned against the form definitions at time of filling to maintain referential integrity.

## Backend Module
The form view requires a dedicated backend module (proposed: `modules/form-response/`) with:
- CRUD operations for form response groups, form responses, and question responses
- Formula computation service for calculating formula values from responses
- Status management (Draft → Submitted with immutability enforcement)
- Role-based access control for filling, delegation, and review modes
- Audit logging for all response modifications and access

## Frontend Components
The frontend form view component requires:
- Sequential section navigation (one section at a time, next/previous controls)
- Question renderers for each type (multi-select, select-one, free-text, range)
- Section summary component showing completed answers
- Immediate save logic (per-action persistence to backend)
- Review mode (read-only rendering of all sections)
- Submission flow with confirmation dialog
- Incomplete section indicators with navigation links
- Progress tracking across multiple forms in a group

## Access Modes
1. **Fill Mode**: Active form filling with answer input enabled. Sections appear sequentially.
2. **Review Mode**: Read-only view of submitted responses. No modifications allowed.
3. **Preview Mode**: Used by administrators in the form editor to preview form definitions before publishing.

## Roles
- **Patient**: Fills own forms, reviews own submitted forms
- **HCP**: Fills forms on behalf of patients, reviews patient forms (with authorization)
- **Delegate**: Another user authorized to fill on behalf of a patient
- **Administrator**: Previews form definitions in editor (no access to patient responses)

## Related Documents

### QMS Documents
- Feature: `FEAT-4` — Form View
- Requirements: `REQ-18` through `REQ-22`
- Risks: `RISK-4` (Data Loss), `RISK-5` (Unauthorized Access)
- Threats: `THREAT-5` (Tampering), `THREAT-6` (Information Disclosure)
- Risk Mitigations: `RMITIG-4`, `RMITIG-5`
- Threat Mitigations: `TMITIG-5`, `TMITIG-6`

### Design Definitions
- `design/definitions/form_response/form_response_group.md`
- `design/definitions/form_response/form_response.md`
- `design/definitions/form_response/question_response.md`
- `design/definitions/form_response/formula_value.md`
- `design/definitions/form_definition/form.md`
- `design/definitions/form_definition/section.md`
- `design/definitions/form_definition/question.md`
- `design/definitions/form_definition/formula.md`
- `design/definitions/form_definition/collection.md`

### Related Features
- `design/user_interfaces/admin/features/form_editor.md` — Admin creates form definitions that form_view renders
- `design/user_interfaces/admin/features/formula_editor.md` — Formula definitions for visibility/scores
