
## Example 1 – Start a New Project


```text
You are a senior full-stack software engineer.

You are helping build a production-quality demo application.

Technology stack

Frontend
- React
- TypeScript
- Vite
- Material UI
- Recharts

Backend
- Python 3.12
- FastAPI
- Pandas
- PyArrow

Database
- Local Parquet files

Architecture requirements

- Clean Architecture
- SOLID principles
- Repository pattern
- Service layer
- Dependency Injection
- Modular code
- Strong typing
- Logging
- Unit tests

Coding standards

- Small reusable components
- Clear comments only where necessary
- Type hints everywhere
- Follow PEP8
- No duplicated code
- Avoid global state unless justified

When implementing a feature

1. Explain the approach.
2. Generate the code.
3. Generate unit tests.
4. Update README if required.
5. List all files created or modified.

Do not rewrite unrelated files.
Wait for my next task after completing each feature.
```

This establishes the "rules of engagement" for the project.

---

## Example 2 – Generate the Backend

```text
Task:

Implement the FastAPI backend.

Requirements

- REST API
- Repository layer
- Service layer
- Data models
- Dependency injection
- Read stock prices from Parquet
- Cache loaded DataFrames
- Implement endpoints

GET /symbols

GET /prices/{symbol}

GET /moving-average/{symbol}

Generate

- Folder structure
- requirements.txt
- Complete source code
- Unit tests

Only modify backend files.
```

---

## Example 3 – Generate the Frontend

```text
Task:

Implement the React frontend.

Requirements

Left panel

- Stock symbols
- Alphabetically sorted
- Scrollable

Right panel

- Toolbar
- Price chart
- SMA controls

Toolbar

Periods

- 1 Month
- YTD
- 1 Year
- 3 Year

Moving averages

- 20 SMA
- 50 SMA
- Custom SMA

Each moving average

- Toggle on/off
- Select line colour
- Multiple can be enabled simultaneously

Generate

- Components
- Zustand store
- API client
- Hooks
- Types
- Unit tests

Only modify frontend files.
```

---

## Example 4 – Add Authentication

Once the core application works:

```text
Implement authentication.

Requirements

Backend

- JWT
- Refresh Tokens
- bcrypt
- OAuth2 Password Flow

Frontend

- Login page
- Protected routes
- Automatic token refresh
- Logout

Generate only the files that need changing.

Do not rewrite existing working code.
```

---

## Example 5 – Fix a Bug

Suppose the chart isn't updating correctly:

```text
The application has the following bug.

Problem

When selecting another stock symbol, the price chart updates but the moving averages still show the previous symbol.

Expected behaviour

Changing the ticker should

- reload prices
- reload all enabled moving averages
- preserve selected colours
- preserve enabled state

Find the cause.

Explain it.

Modify only the necessary files.

Show the diff.
```

This targeted approach is much more effective than asking for a broad rewrite.

---

## Example 6 – Refactor Existing Code

```text
Review the repository layer.

Goals

- Remove duplicated code
- Improve readability
- Improve performance
- Follow SOLID
- Keep public API unchanged

Explain every change.

Generate only modified files.
```

---

## Example 7 – Generate Tests

```text
Write comprehensive unit tests.

Coverage target

90%

Test

- Repository
- Services
- Moving average calculations
- Authentication
- Authorization
- Error handling

Use pytest.

Do not modify production code unless required.
```

---

## Example 8 – Ask for a Code Review

This is one of the highest-value uses of an AI coding agent.

```text
Perform a senior engineer code review.

Review

- Architecture
- Maintainability
- Naming
- Performance
- Security
- Testability

Do not rewrite the project.

Produce a report with

Critical

High

Medium

Low

Include concrete recommendations.
```

---

## Example 9 – Generate Documentation

```text
Generate documentation.

Include

README

Architecture diagram

Folder structure

API documentation

Authentication flow

Moving average calculations

Deployment guide

Troubleshooting

Use Markdown.
```

---

## Example 10 – Add a New Feature

```text
Implement Bollinger Bands.

Requirements

- 20-day moving average
- Upper band
- Lower band
- Configurable standard deviations

Frontend

- Toggle button
- Colour picker

Backend

- New API endpoint

Generate

Code

Tests

Documentation

Only modify affected files.
```

## A workflow that scales well

For a project of this size, an iterative workflow tends to produce the best results:

1. Create the project skeleton.
2. Generate the backend.
3. Generate the data loader.
4. Generate the frontend layout.
5. Connect the frontend to the backend.
6. Add chart functionality.
7. Add moving averages.
8. Add authentication.
9. Add authorization.
10. Add mTLS.
11. Add tests.
12. Optimize performance.
13. Perform a security review.
14. Generate deployment artifacts.
15. Conduct a final code review.

This sequence allows the AI to build on a stable foundation and makes it easier to validate each stage before moving on.

## Tips for working with Claude Code

Claude Code works especially well when you:

* Give it a clear, bounded task (one feature or one subsystem at a time).
* Ask it to modify only the files that are necessary.
* Require it to explain its implementation approach before writing code.
* Request tests alongside the implementation.
* Ask for a summary of files changed after each task.
* Use version control so you can review and revert changes if needed.

That iterative, review-driven approach generally yields more maintainable results than requesting an entire application in one prompt.
