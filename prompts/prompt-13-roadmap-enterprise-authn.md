# Prompt 13 – Enterprise Authentication

```text
You are a senior security architect.

Enhance the existing stock chart application by implementing user authentication.

Technology

Backend
- FastAPI
- JWT
- OAuth2 Password Flow
- Passlib with bcrypt

Frontend
- React
- TypeScript
- Zustand

Requirements

Implement user authentication.

Users can

- Login
- Logout
- Refresh access token

User information

username

password

role

enabled

Passwords must never be stored in plain text.

Hash passwords using bcrypt.

JWT access tokens expire after 30 minutes.

Refresh tokens expire after 7 days.

Frontend automatically refreshes expired access tokens.

Login screen should be displayed before the application loads.

Store only the access token in memory.

Store refresh token in an HttpOnly Secure cookie.

Implement logout.

Invalidate refresh tokens.

Use dependency injection throughout.

Provide complete source code.

Follow OWASP recommendations.
```
