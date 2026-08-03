# Prompt 01 - Overall Architecture

```text
You are a senior full-stack software architect.

Build a complete stock chart demo application with a frontend and backend.

Requirements

Frontend
- Node.js based application.
- Use React + TypeScript.
- Use Vite.
- Use Material UI.
- Use Recharts for the line charts.
- Responsive layout.

Backend
- Python 3.12
- FastAPI
- Pandas
- PyArrow
- Uvicorn

Database
- Local Parquet files.
- No SQL database.

Architecture

frontend/
backend/

Backend serves REST APIs.

Frontend communicates only through REST.

Backend loads Parquet data using Pandas.

Application structure must be modular with separation of:

- API
- Services
- Data access
- Models
- Utilities

Frontend structure should separate:

- Pages
- Components
- Hooks
- Services
- Models
- Utilities

Use TypeScript interfaces throughout.

The project must be runnable using:

Frontend

npm install
npm run dev

Backend

python -m venv .venv

pip install -r requirements.txt

uvicorn app.main:app --reload

Produce complete folder structure first before writing code.
```