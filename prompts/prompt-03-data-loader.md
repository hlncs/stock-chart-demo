# Prompt 04 - Repository Layer
```text
Create a Python utility that builds the local Parquet database.

The program should:

1. Download End-of-Day stock prices.

Use Yahoo Finance through yfinance.

Each record contains

Date
Open
High
Low
Close
Volume

Store each stock as

data/

AAPL.parquet
MSFT.parquet

etc.

Implement two modes.

Initial Load

Downloads the entire available history.

Append Mode

Downloads only missing dates after the most recent date stored.

Avoid duplicates.

Sort by date.

Overwrite the Parquet file safely.

Create one reusable StockLoader class.

Provide a CLI

python load_data.py --initial

python load_data.py --append

Support loading multiple symbols.

Example

python load_data.py --symbols AAPL MSFT NVDA

Use concurrent downloads.

Show progress bars.

Provide logging.

Implement retry logic.

Handle API failures gracefully.
```