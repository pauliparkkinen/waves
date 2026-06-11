# Definition

A definition of a question. The question can be of multiple types: multi-select, select-one, free-text, range. Questions are reusable in multiple forms.

# Parameters
- collection_id -- id of the collection the form belongs to
- question_id -- A unique id 
- question_symbol -- symbol of the question - needs not be unique,  if the version numbers are different
- condition_formula_id  -- id of "formula" used for calculating if the question is asked
- type -- The type of the question for instance multiselect |  select | radio | free-text | range
- version -- the version of the question
- parameters -- JSON question type specific config
- created_at -- Timestamp of creation
- updated_at -- Timestamp of updating
- translations -- {"translation_symbol", "symbol"}[] -- References to "translation" objects 