# Definition

Formula is a formula for calculating "formula_value" from one or multiple "formula_values" and/or other data (e.g., question responses or other measurements). For instance an "indication" such as score of a reported symptom, score calculated from physical activity, or measurement value reaching a threshold. The formula stored can also be for calculating an "urgency" value. Formula references can also refer to other formulas. 

# Properties
- collection_id -- id of the collection
- formula_id - id of the formula
- "formula_references" -- Items which have formula_id in them
- expression --- JSON AST
- output_type -- number | boolean
- symbol



