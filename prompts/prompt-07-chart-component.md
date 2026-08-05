# Prompt 07 - Chart Component
```text
Create a reusable StockChart component using Recharts.

Render
  Closing price line
  Overlay zero or more SMA lines

Each SMA line
  Uses its selected color

Legend displays
  Price
  Enabled SMA lines (e.g. 20 SMA, 50 SMA, 150 SMA)

Tooltip (balloon) displays on hover
  Date
  Price (formatted as $xxx.xx)
  All enabled moving average values (formatted as $xxx.xx)
  Divider
  Volume at that date (formatted with K / M / B suffix, e.g. 67.88M)
    Omit volume row if value is zero or missing

Axes
  XAxis: dates
  YAxis (price): scale for closing price and SMA lines only
  YAxis (volume, hidden): separate axis so volume does not distort the price scale

IMPORTANT: volume values (millions) are orders of magnitude larger than price
values (hundreds). Always assign price lines to yAxisId="price" and the hidden
volume line to yAxisId="volume". Failure to do so collapses all price lines to
an invisible sliver at the bottom of the chart.

Responsive container.
Memoize expensive calculations.
Support datasets up to 20,000 rows.
```
