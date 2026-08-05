# Prompt 08 - Moving Average Controls
```text
Create a MovingAverageToolbar component.

Contains
  20 SMA button
  50 SMA button
  Custom SMA button

Each button
  Acts like a toggle
  When active: button remains highlighted
  Color picker beside each button

Default colors
  20 SMA   → Blue
  50 SMA   → Green
  Custom   → Orange

Custom SMA
  When enabled: show numeric input for window size
  Label format: {window} SMA  (e.g. 150 SMA, not SMA 150)
    This must be consistent with the fixed labels "20 SMA" and "50 SMA"
  User enters window size (e.g. 75)
  Automatically request window=75 from backend
  Debounce user input — do not request backend on every keystroke

Use React hooks.
Component must be reusable.
```
