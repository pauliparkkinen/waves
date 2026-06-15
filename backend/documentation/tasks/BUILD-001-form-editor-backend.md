# Build Instruction: Form Editor — Backend Admin Module

**ID**: BUILD-001
**Feature**: FEAT-2 (Form Editor)
**Target**: Backend admin module for form definitions
**Authored**: 2026-06-11
**Implement After**: All UI planning is complete

## Objective

Create the backend admin module (`modules/admin/`) that provides REST API endpoints for managing form definitions: collections, questions, sections, forms, formulas, and translations.

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
| REQ-10 | Backend Admin Module API |
| REQ-7 | Visibility Conditions |
| REQ-11 | Type-Specific Question Parameters |
| REQ-12 | Draft/Publish Workflow |

### Key Risks & Mitigations
- RISK-1 / RMITIG-1: Data integrity → backend validation + version control
- RISK-2 / RMITIG-2: Permission escalation → RBAC + org scoping
- RISK-3 / RMITIG-3: Formula errors → syntax validation + sandbox testing

### Tasks (implement in order)
1. TASK-2: Admin module scaffolding
2. TASK-8: Admin auth & permission middleware
3. TASK-3: Collection CRUD endpoints
4. TASK-4: Question CRUD endpoints
5. TASK-5: Section CRUD endpoints
6. TASK-6: Form CRUD endpoints with versioning
7. TASK-7: Formula CRUD and validation endpoints
8. TASK-9: Test mode sandbox endpoint

## Architecture Conventions

### Module Structure (copy from modules/test/)
```
modules/admin/
  index.ts                          — wire deps, export Hono router
  controllers/admin.controller.ts   — HTTP layer, receives service interface
  services/admin.service.ts         — business logic, export interface + impl
  repositories/admin.repository.ts  — data access, export interface + impl
  types/admin.types.ts              — types only
```

### API Prefix
All endpoints mounted at `/admin` via module-loader.

### Auth
- JWT middleware activated via `AUTH_JWKS_URI` env var
- Fallback to mock auth when `AUTH_JWKS_URI` is unset
- Middleware checks for `global_admin` or `organisation_admin` role
- Organisation scoping required for multi-tenant isolation

## Domain Data Model

### Collection
{
  collection_id: string,
  collection_permissions: { organisation_id, read, use, edit, owner }[]
}

### Question
{
  collection_id, question_id, question_symbol, condition_formula_id,
  type: "multiselect" | "select" | "radio" | "free-text" | "range",
  version, parameters: JSON, created_at, updated_at,
  translations: { translation_symbol, symbol }[]
}

### Section
{
  section_id, section_symbol, condition_formula_id, version,
  status: "draft" | "published",
  section_questions: { question_symbol, version_number, order_number, required }[],
  translations: { translation_symbol, symbol }[]
}

### Form
{
  collection_id, form_id, form_symbol, version,
  form_sections: { section_symbol, version_number, order_number }[],
  formulas: formula_reference[],
  status: "draft" | "published",
  form_organisations: { organisation_id, read, use, edit, owner }[],
  translations: { translation_symbol, symbol }[]
}

### Formula
{
  collection_id, formula_id, symbol, expression: JSON AST,
  output_type: "number" | "boolean",
  formula_references: { formula_reference_id, symbol, type, referenced_formula_id }[]
}

## Key Business Rules
1. Published forms/sections cannot be directly modified — editing creates a new version
2. Only published sections can be attached to a published form
3. Formula AST must be validated structurally on save
4. Formula output_type must be compatible with context (boolean for visibility conditions)
5. Collection permissions are checked independently from organisation roles
6. Deleting a collection must prevent deletion if it has active content
7. All admin data changes must be validated server-side independently of frontend
8. Test mode sandbox runs validation and formula evaluation on ephemeral data (POST /admin/forms/:id/test)

## Build Steps

### Step 1: Scaffold module
- Create `modules/admin/` directory with the standard structure
- Register module in `waves.config.json`
- Create database models/entities matching the data model above

### Step 2: Auth middleware
- Implement role-checking middleware that validates JWT claims
- Add organisation scope filtering
- Provide safe mock fallback for development

### Step 3-7: CRUD endpoints
For each entity (collection → question → section → form → formula):
1. Define types
2. Implement repository with data access
3. Implement service with business logic & validation
4. Implement controller with HTTP handling
5. Write tests (Given-When-Then format per testing.md)

### Step 8: Test mode sandbox
- Implement POST /admin/forms/:id/test
- Run formula evaluation engine on submitted test data
- Return results without persisting

## Verification
- Run `pnpm typecheck` — no type errors
- Run `pnpm test` — all tests pass
- Run `npx tsx run_converter.mts` — if applicable
- Manual: verify with curl that endpoints enforce auth correctly
