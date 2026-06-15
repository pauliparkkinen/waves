# Build Instruction: Form Editor — Frontend Admin UI

**ID**: BUILD-002
**Feature**: FEAT-2 (Form Editor)
**Target**: Frontend admin UI for form definitions
**Authored**: 2026-06-11
**Prerequisites**: Backend admin module API must be operational first

## Objective

Create the admin user interface embedded in the existing Next.js 15 app at the `/admin` route. Provides a unified view with three integrated editors (form, section, question) plus pop-up editors for formulas and translations.

## Referenced Process_guard Documents

### Requirements
| ID | Title |
|----|-------|
| REQ-1 | Question CRUD |
| REQ-2 | Section CRUD with Question Attachment |
| REQ-4 | Form CRUD with Section Attachment |
| REQ-6 | Collection Management with Permissions |
| REQ-3 | Formula Editor Popup |
| REQ-5 | Translation Editor Popup |
| REQ-8 | Drag-and-Drop Reordering |
| REQ-7 | Visibility Conditions |
| REQ-9 | Test Mode Form Filling |
| REQ-11 | Type-Specific Question Parameters |

### Tasks (implement in order)
1. TASK-10: Admin layout and routing
2. TASK-11: Collection management UI
3. TASK-12: Question editor component
4. TASK-13: Section editor component
5. TASK-14: Form editor component
6. TASK-15: Formula editor popup component
7. TASK-16: Translation editor popup component
8. TASK-17: Drag-and-drop reordering and test mode integration

## Key Design Decisions
- Admin is embedded in existing Next.js app at `/admin` route
- Architecture should allow future separation into standalone SPA
- Admin interface is English only (no i18n needed for admin UI itself)
- Plain CSS only (no Tailwind, no CSS-in-JS) — per existing frontend conventions
- API calls go server-side via lib/api.ts (uses BACKEND_URL env var)
- Auth: JWT token forwarded from session via existing auth flow

## UI Architecture

### Routing
/admin
  /admin/collections — manage collections
  /admin/forms       — form list + form editor (three-panel view)
  /admin/questions   — question editor
  /admin/sections    — section editor

The main Form Editor view at /admin/forms/:id should show three panels:
1. Form panel (left) — form properties, section list, reorder
2. Section panel (center) — selected section details, question list
3. Question panel (right) — selected question details, parameters

### Component Structure
AdminLayout (server)
  ├── AdminNav (client) — navigation tabs
  └── Page content (server + client islands)
       ├── CollectionManager
       ├── QuestionEditor
       │   ├── CommonParams
       │   ├── TypeSpecificParams
       │   ├── VisibilityConditionSelector → FormulaEditorPopup
       │   └── TranslationButton → TranslationEditorPopup
       ├── SectionEditor
       │   ├── QuestionAttachmentList (drag-reorder)
       │   ├── VisibilityConditionSelector
       │   ├── DraftPublishToggle
       │   └── TranslationButton
       ├── FormEditor
       │   ├── SectionAttachmentList (drag-reorder)
       │   ├── FormulaList → FormulaEditorPopup
       │   ├── DraftPublishToggle
       │   └── TestModeButton
       ├── FormulaEditorPopup (modal)
       └── TranslationEditorPopup (modal)

### Data Flow
Client Component → fetch from /api/admin/* (server-side route handler)
  → server-side calls backend /admin/* via lib/api.ts
  → returns data → renders component

## Key UI Requirements
1. Question type selection: common params visible first, type-specific appear on selection
2. Selection lists for questions/sections must be ordered by collection then alphabetically by symbol
3. Drag handles on sections and questions for reordering
4. Visibility condition: dropdown + adjacent button to open formula editor
5. Formula editor: popup with human-readable syntax, variable insertion, operator buttons
6. Translation editor: popup with locale selector and key/value editing
7. Draft/publish: toggle or save-as-draft and publish buttons
8. Test mode: button enabled when no validation errors; opens form in fillable test mode
9. Hide/show toggle for objects within collection

## Implementation Order

### Phase 1 — Foundation
- TASK-10: Create /admin layout, navigation, middleware protection
- TASK-11: Collection CRUD pages

### Phase 2 — Core Editors
- TASK-12: Question editor with type-specific params
- TASK-13: Section editor with question attachment
- TASK-14: Form editor with section attachment

### Phase 3 — Supporting Features
- TASK-15: Formula editor popup
- TASK-16: Translation editor popup
- TASK-17: Drag-and-drop + test mode integration

## Verification
- `pnpm build` — no build errors
- Navigate to /admin — protected by auth middleware
- CRUD operations on all entity types work end-to-end
- Formula editor opens as popup and saves valid AST
- Translation editor opens as popup and saves translations
- Drag-and-drop reordering persists correctly
- Test mode shows form with correct visibility conditions
