# Form Editor — Planning Summary

> Generated: 2026-06-11
> Feature: FEAT-2 (Form Editor)
> Status: Draft — Planning Complete

## Overview

The Form Editor enables administrator users to create and edit forms, sections, questions, and collections in a unified view. It provides three integrated sub-editors (form, section, question) plus pop-up editors for formulas and translations. It supports drag-and-drop reordering, draft/publish workflow, visibility conditions, and test-mode form filling.

## Architecture Context

- **Frontend**: Embedded in existing Next.js 15 app at `/admin` route (with room for future separation)
- **Backend**: New `modules/admin/` module following the established module system pattern
- **Auth**: Requires `global_admin` or `organisation_admin` role; uses JWT middleware
- **Admin interface language**: English only

## Domain Model (from design/definitions/)

### Collection
- Groups content objects (forms, formulas, questions, sections)
- Has level permissions: read, use, edit, owner per organisation
- All content belongs to a collection

### Question
- Types: multi-select, select-one, free-text, range
- Has symbol, version, type-specific JSON parameters, condition_formula_id
- Reusable across multiple forms
- Has translations and visibility conditions

### Section
- Groups questions within a form
- Has section_questions array (question_symbol, version_number, order_number, required)
- Has condition_formula_id for visibility, status (draft/published)
- Reusable across multiple forms
- Has translations

### Form
- Top-level form definition
- Has form_sections array (section_symbol, version_number, order_number)
- Has formulas for indicators/urgencies
- Has status (draft/published), version management, permissions
- Has translations

### Formula
- JSON AST expression with output_type (number | boolean)
- References other formulas or activities
- Used for visibility conditions, scoring, urgency calculation
- Stored in collection context

### Translation
- Key + locale_code per collection
- Has version and status (draft/published)

## Documentation Structure (process_guard)

### Feature
| ID | Title |
|----|-------|
| FEAT-2 | Form Editor |

### Requirements (12)
| ID | Title | Priority Area |
|----|-------|---------------|
| REQ-1 | Question CRUD | Core editor |
| REQ-2 | Section CRUD with Question Attachment | Core editor |
| REQ-4 | Form CRUD with Section Attachment | Core editor |
| REQ-6 | Collection Management with Permissions | Foundation |
| REQ-3 | Formula Editor Popup | Supporting editor |
| REQ-5 | Translation Editor Popup | Supporting editor |
| REQ-8 | Drag-and-Drop Reordering | UX |
| REQ-12 | Draft/Publish Workflow | Workflow |
| REQ-7 | Visibility Conditions | Logic |
| REQ-9 | Test Mode Form Filling | QA |
| REQ-10 | Backend Admin Module API | Backend |
| REQ-11 | Type-Specific Question Parameters | Core editor |

### Tasks (16)

**Backend — Admin Module (TASK-2 through TASK-9):**
1. TASK-2: Admin Module Scaffolding (module structure, DB schemas)
2. TASK-3: Collection CRUD Endpoints
3. TASK-4: Question CRUD Endpoints
4. TASK-5: Section CRUD Endpoints
5. TASK-6: Form CRUD Endpoints with Versioning
6. TASK-7: Formula CRUD and Validation Endpoints
7. TASK-8: Admin Auth and Permission Middleware
8. TASK-9: Test Mode Sandbox Endpoint

**Frontend — Admin UI (TASK-10 through TASK-17):**
1. TASK-10: Admin Layout and Routing (/admin)
2. TASK-11: Collection Management UI
3. TASK-12: Question Editor Component
4. TASK-13: Section Editor Component
5. TASK-14: Form Editor Component
6. TASK-15: Formula Editor Popup Component
7. TASK-16: Translation Editor Popup Component
8. TASK-17: Drag-and-Drop Reordering and Test Mode

### Risks (3)
| ID | Title | Severity | P(before) | P(after) |
|----|-------|----------|-----------|----------|
| RISK-1 | Data Integrity: Incorrect Form Definitions | 3 (Severe) | 3 | 1 |
| RISK-2 | Permission Escalation: Unauthorized Access | 4 (Catastrophic) | 2 | 1 |
| RISK-3 | Formula Evaluation: Incorrect Clinical Scoring | 3 (Severe) | 3 | 2 |

### Threats (3 — STRIDE)
| ID | Title | Classification |
|----|-------|---------------|
| THREAT-1 | Form Definition Manipulation | Tampering |
| THREAT-2 | Form Structure Leakage | Information Disclosure |
| THREAT-3 | Admin API Access | Elevation of Privilege |

### Mitigations (6)
| ID | Links To | Title |
|----|----------|-------|
| RMITIG-1 | RISK-1 | Backend Validation and Version Control |
| RMITIG-2 | RISK-2 | Role-Based Access Control with Organisation Scoping |
| RMITIG-3 | RISK-3 | Formula Syntax Validation and Sandbox Testing |
| TMITIG-1 | THREAT-1 | HTTPS Enforcement and Payload Integrity |
| TMITIG-2 | THREAT-2 | Organisation-Isolated Data Access and Rate Limiting |
| TMITIG-3 | THREAT-3 | JWT Auth Middleware with Role Validation |

## Implementation Order (Recommended)

### Phase 1 — Foundation (Backend)
1. TASK-2: Admin module scaffolding
2. TASK-8: Auth and permission middleware
3. TASK-3: Collection CRUD endpoints

### Phase 2 — Core Backend
4. TASK-4: Question CRUD endpoints
5. TASK-5: Section CRUD endpoints
6. TASK-6: Form CRUD endpoints with versioning
7. TASK-7: Formula CRUD endpoints

### Phase 3 — Frontend Foundation
8. TASK-10: Admin layout and routing
9. TASK-11: Collection management UI

### Phase 4 — Core Frontend
10. TASK-12: Question editor component
11. TASK-13: Section editor component
12. TASK-14: Form editor component

### Phase 5 — Supporting Features
13. TASK-15: Formula editor popup
14. TASK-16: Translation editor popup
15. TASK-17: Drag-and-drop and test mode

### Phase 6 — Test & Sandbox
16. TASK-9: Test mode sandbox endpoint (done along backend work)
