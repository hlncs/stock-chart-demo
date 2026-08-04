# Stock Chart Demo

## Overview
This project contains a full-stack stock chart demo with a FastAPI backend and a React + TypeScript frontend.

## Backend
- Python 3.12+
- FastAPI
- Pandas / PyArrow
- Local Parquet data storage

## Frontend
- React + TypeScript
- Vite
- Material UI
- Recharts
- Zustand

## Setup
### Backend
```bash
cd backend
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Architecture
- Backend exposes REST endpoints for symbols, prices, and moving averages.
- Frontend consumes the API and renders a responsive chart UI.
- Data is sourced from local Parquet files.
