# Prompt 14 – Role-Based Authorization (RBAC)

```text
Extend the existing authentication system.

Implement Role-Based Access Control.

Roles

Viewer

Analyst

Administrator

Permissions

Viewer

Read stock prices

Read moving averages

Analyst

Everything Viewer can do

Export CSV

Administrator

Everything

Manage users

Delete cached data

Reload market database

Implement authorization middleware.

Every API endpoint should declare required permissions.

Unauthorized users receive

HTTP 403

Frontend hides controls that users are not authorized to access.

Generate unit tests.

Generate integration tests.
```
