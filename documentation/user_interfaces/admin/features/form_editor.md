# Description

The administrator users are able to create and edit forms. In the same view there are three different editors: Form editor, section editor and question editor. 

# Requirements

- User can see all the defined questions, sections and questions in the view.
- User can define new questions and edit existing questions
   - Before selecting of the type of the question, only the common parameters are visible.
   - The type specific properties become visible once the type selection is made
   - User can select visibility condition from the selection list for the section
   - Next to the selection list for visibility condition there is a button to creating new visibility condition (using "formula_editor").
- User can define new sections and edit sections
   - User can attach existing questions to a section 
      - When attaching questions the selection list is ordered by collections and the alphabetically by the symbol of the question
   - User can define title and description for the section
   - User can save new sections as draft
   - User can publish draft sections
   - User can reorder the sections by dragging from the dragging icon
   - User can select visibility condition from the selection list for the section
   - Next to the selection list for visibility condition there is a button to creating new visibility condition (using "formula_editor"). 
- User can define new forms or edit existing ones.
   - User can attach new sections to a form
      - When attaching questions the selection list is ordered by collections and the alphabetically by the symbol of the section
   - User can reorder sections by dragging from the dragging item
   - User can save form as draft
   - User can publish form
- User can define new collections
   - User can define permissions to the collection
- User can select which collection the defined content belongs to
- User can edit/create new the translations in a pop-up editor "translation_editor" in all the relevant spots
- User can edit/create formulas in a pop-up editor "formula_editor" in all relevant spots.
- The user interface enables viewing and editing multiple objects (sections, questions, forms) at once.
- User can hide or show any objects in the collection.
- If there are no validation errors with the form, user can open the form for filling in test mode (no actual backend)