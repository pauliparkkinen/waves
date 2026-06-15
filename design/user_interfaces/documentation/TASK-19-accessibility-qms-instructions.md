# Task Instructions: UI Accessibility QMS Documentation (TASK-19)

## Unique ID
TASK-19

## Branch
TASK-19-ui-accessibility-docs

## Objective
Complete the QMS documentation for WCAG 2.2 accessibility compliance across all three user interfaces (admin, hcp, patient).

## Context
The `design/user_interfaces/about.md` has been updated with a WCAG 2.2 conformance requirement. Formal QMS documents (risks, threats, mitigations, test cases) are needed.

## Already Completed
- **FEAT-3** (User Interfaces) — Plan-ready
- **TASK-19** (this task) — Ready-to-review
- **REQ-13** (WCAG 2.2 Conformance) — Draft
- **REQ-14** (Accessible Keyboard Navigation) — Draft
- **REQ-15** (Non-Text Content Alternatives) — Draft
- **REQ-16** (Color and Contrast Accessibility) — Draft
- **REQ-17** (Focus Indication and Navigation) — Draft

## Work Remaining

### 1. Create Risk Documents
Create risks for accessibility failures. Examples:
- Visual impairment users cannot navigate the UI (link to FEAT-3)
- Keyboard-only users cannot complete forms (link to FEAT-3, REQ-14)
- Screen reader users get incorrect information (link to FEAT-3, REQ-15)
- Color-blind users miss critical information (link to FEAT-3, REQ-16)

### 2. Create Threat Documents
Create cybersecurity threats related to accessibility:
- Spoofing via fake focus indicators
- Information disclosure via accessibility APIs
- Elevation of privilege via assistive technology interfaces

### 3. Create Test Cases
Create test cases for each requirement:
- Automated: Lighthouse/axe-core accessibility audits
- Manual: Keyboard navigation testing
- Manual: Screen reader compatibility testing
- Manual: Color contrast verification

### 4. Create Mitigations
Link risk/threat mitigations to requirements as needed.

### 5. Review and Approve
- Transition all documents through their status flows to Approved
- Use `process-guards transition <ID> <status> --by <user> --approved-by <user>` for approvals

## Commands Reference
```bash
# Generate a risk
cd /home/pauli/process_guard_application
node dist/cli/index.js generate risk --dir /home/pauli/waves/documentation --title "..." --description "..." --non-interactive

# Generate a threat
node dist/cli/index.js generate threat --dir /home/pauli/waves/documentation --title "..." --description "..." --non-interactive

# Update linked features (default links to FEAT-1, change to FEAT-3)
node dist/cli/index.js update <ID> --dir /home/pauli/waves/documentation --by "user" --field linkedFeatures --remove "FEAT-1"
node dist/cli/index.js update <ID> --dir /home/pauli/waves/documentation --by "user" --field linkedFeatures --add "FEAT-3"

# Transition status
node dist/cli/index.js transition <ID> <status> --dir /home/pauli/waves/documentation --by "user" [--approved-by "user"]

# Validate
node dist/cli/index.js validate --dir /home/pauli/waves/documentation

# Show document
node dist/cli/index.js show <ID> --dir /home/pauli/waves/documentation
```

## Verification
1. `process-guards validate --dir /home/pauli/waves/documentation` passes with no errors
2. All required cross-references exist (features linked, risks/threats to features, mitigations to risks/threats)
3. All documents have appropriate statuses
