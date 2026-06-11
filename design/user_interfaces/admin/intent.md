# Purpose
Purpose of the admin interface is to enable the company admins and customer organisation admins to change the behavior of the product. The admin user interface contains initially the form editor.

# Design choices
- The admin interface will be only in english.

# User rights
The user needs to have global_admin or organisation_admin role to access the admin interface.

# Backend
The user interface uses the 'admin' backend module to store the data. The backend shall validate all the data independently.