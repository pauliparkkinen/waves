# Definition
A form definition. A new version of a form needs to be created if an published form is modified.

# Parameters
- collection_id -- id of the collection the form belongs to
- form_id -- id of the form.
- form_symbol -- symbol of the "form"
- version -- version number of the "form"
- form_sections - {"section_symbol", "version_number", "order_number"}[]
- formulas -- "formula" objects related to form for calculating "indicators" and "urgencies" from the answers.
- status -- "draft" | "published"
- form_organisations -- {"organisation_id", "read", "use", "edit", "owner"}  -- rights to the form
- translations -- {"translation_symbol", "symbol"}[] -- References to "translation" objects 