# Description

While editing a form or content collection, the administrator can create new formulas for visibility conditions, for calculating indicators (for instance scores) and urgencies from the form. The formula editor appears primarily as a popup so that the full context is visible for the users.

# Requirements

- Any formulas created with the editor are connected to the opened collection given as input
- Any formulas are generated a symbol and output type based on context given as input
    - If input type is given, it cannot be modified by the user
- The formula editor generates JSON AST for determining the conditions. However, the input shall be human readable. 
- The user can insert variables (question values or formula results) to the equation and connect them with supported operators.
    - The available variables are the variables of the current collection
- The if else statements are expressed with 'condition' ? 'when-condition-true' : 'otherwise' structure.
- The editor shall support logical operators (&&, ||), and common operators such as +, -, *, /.
- The editor shall give errors if the formula is malformed, or the ouput is conflicting with the input type
