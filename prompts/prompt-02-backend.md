# Prompt 02 - Backend
```text
Build the backend for the stock chart demo.

Technology

Python
FastAPI
Pandas
PyArrow

The backend stores data in Parquet files.

Each stock has historical End-of-Day prices, and the backend should be able to serve data for multiple symbols from local Parquet files.

The backend must expose REST APIs.

API Endpoints

GET /symbols

Returns

[
    "AAPL",
    "AMD",
    "AMZN",
    ...
]

sorted alphabetically.

----------------------------------

GET /prices/{symbol}

Query parameter

period=

Supported values

1M
YTD
1Y
3Y

Returns

[
{
"date":"2025-01-02",
"open":184.2,
"high":187.5,
"low":182.7,
"close":186.9
}
]

----------------------------------

GET /moving-average/{symbol}

Query

period=
window=

Example

window=20

Returns

[
{
"date":"...",
"value":183.22
}
]

Moving average must be calculated on demand.

No values returned before enough history exists.

Implement:

Repository layer
Service layer
API layer

Use Pydantic models.

Use dependency injection.

Implement error handling.

Implement logging.

Use async endpoints.

The backend should cache loaded Parquet data to reduce disk access.
```