# Definition
Object used to group questions in a form. Sections are reusable in multiple forms.

# Parameters

- section_id - 
- section_questions - {"question_symbol", "version_number", "order_number", "required"}[]
- section_symbol - symbol for the section
- condition_formula_id  - id of "formula" used for calculating if the section is visible
- version - version of the section
- status - "draft" | "published"
- translations -- {"translation_symbol", "symbol"}[] -- References to "translation" objects 